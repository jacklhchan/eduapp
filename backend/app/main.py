from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.cloud import vision
from google.genai import types
from pydantic import BaseModel

from .ai_validation import extract_json_object, validate_ai_json
from .auth import (
    SESSION_COOKIE,
    SESSION_MAX_AGE_SECONDS,
    hash_pin,
    require_parent_id,
    session_cookie_secure,
    sign_session,
    verify_pin,
)
from .curriculum_catalog import find_subject_for_grade, get_curriculum_catalog, subject_names_for_grade
from .pdf_export import build_portfolio_pdf
from .persistence import DEMO_CHILD_ID, DEMO_PARENT_ID, now_iso, persistence
from .schemas import (
    AuthResponse,
    AuditEvent,
    ChildDataSummary,
    ChildCreateRequest,
    ChildDeleteRequest,
    ChildDeleteResponse,
    ChildProfile,
    DocumentRecord,
    GeneratedQuiz,
    LoginRequest,
    OcrReviewResult,
    ParentUpdateRequest,
    ParentProfile,
    PrivacyCenterResponse,
    PrivacySettings,
    PrivacyUpdateRequest,
    PortfolioExportRecord,
    PortfolioExportRequest,
    SignupRequest,
)


PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT") or ""
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "global")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
STATIC_DIR = Path(os.getenv("STATIC_DIR", "/app/static"))
DEMO_PARENT_EMAIL = os.getenv("EDUPASS_DEMO_EMAIL", "parent@example.com").lower()
DEMO_PARENT_PIN = os.getenv("EDUPASS_DEMO_PIN", "246810")
OCR_REVIEW_MODE = os.getenv("EDUPASS_OCR_REVIEW_MODE", "multimodal")
LOCAL_PRACTICE_FALLBACK = os.getenv("EDUPASS_LOCAL_PRACTICE_FALLBACK", "1").lower() not in {"0", "false", "no"}

app = FastAPI(title="EduPass AI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    ok: bool
    project_id: str
    vertex_location: str
    gemini_model: str
    vision_configured: bool
    static_dir_exists: bool


def get_genai_client() -> genai.Client:
    if not PROJECT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLOUD_PROJECT is not configured")
    return genai.Client(vertexai=True, project=PROJECT_ID, location=VERTEX_LOCATION)


def run_vision_ocr(content: bytes) -> str:
    client = vision.ImageAnnotatorClient()
    response = client.document_text_detection(image=vision.Image(content=content))
    if response.error.message:
        raise RuntimeError(response.error.message)
    return response.full_text_annotation.text or ""


def run_gemini_document_ocr(content: bytes, mime_type: str) -> str:
    client = get_genai_client()
    prompt = (
        "Extract the visible text from this Hong Kong student homework or test. "
        "Return only the extracted text. Preserve Traditional Chinese and math symbols."
    )
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(data=content, mime_type=mime_type),
            prompt,
        ],
    )
    return response.text or ""


def upload_file_kind(mime_type: str) -> str:
    return "pdf" if mime_type == "application/pdf" else "image"


def upload_ocr_provider(file_kind: str) -> str:
    return "vertex_gemini_document_extraction" if file_kind == "pdf" else "cloud_vision_document_text_detection"


def normalize_ocr_uploads(
    file: UploadFile | None,
    files: list[UploadFile] | None,
) -> list[UploadFile]:
    uploads: list[UploadFile] = []
    if files:
        uploads.extend(files)
    if file and file not in uploads:
        uploads.insert(0, file)
    return uploads


def summarize_file_kind(upload_pages: list[dict[str, Any]]) -> str:
    file_kinds = {str(page["file_kind"]) for page in upload_pages}
    if len(file_kinds) == 1:
        return next(iter(file_kinds))
    return "mixed"


def summarize_ocr_provider(upload_pages: list[dict[str, Any]]) -> str:
    providers = [str(page["ocr_provider"]) for page in upload_pages]
    unique_providers = sorted(set(providers))
    if len(unique_providers) == 1:
        return unique_providers[0]
    return f"mixed: {', '.join(unique_providers)}"


def build_combined_ocr_text(upload_pages: list[dict[str, Any]]) -> str:
    sections = []
    for page in upload_pages:
        sections.append(
            "\n".join(
                [
                    f"[Page {page['page_number']}: {page['filename']}]",
                    str(page["extracted_text"]).strip(),
                ]
            ).strip()
        )
    return "\n\n".join(section for section in sections if section)


def build_ocr_review_prompt(
    extracted_text: str,
    child_profile_id: str,
    grade: str,
    file_kind: str,
    page_count_hint: int = 1,
) -> str:
    allowed_subjects = subject_names_for_grade(grade) or ["Mathematics"]
    return f"""
You are a multimodal OCR review assistant for a Hong Kong parent-led learning app.
Return JSON only. Align subject and topic labels with the HKEDB curriculum catalogue.

Schema:
{{
  "document_id": "string",
  "child_profile_id": "string",
  "file_kind": "image|pdf|mixed",
  "subject": "Mathematics",
  "grade": "P3",
  "page_count": 2,
  "topics": [
    {{
      "id": "t1",
      "subject": "Mathematics",
      "topic": "Fractions",
      "strand": "Number",
      "curriculum_node_id": "hk-p3-math-fractions-compare",
      "confidence": 0.75,
      "page_numbers": [1, 2]
    }}
  ],
  "extracted_questions": [
    {{
      "id": "q1",
      "question_text": "string",
      "detected_answer": "string or null",
      "score": 1,
      "max_score": 1,
      "confidence": 0.75,
      "page_number": 1,
      "topic": "Fractions",
      "topic_ids": ["t1"],
      "curriculum_node_id": "hk-p3-math-fractions-compare",
      "mistake_tags": ["concept"]
    }}
  ],
  "requires_parent_confirmation": true,
  "pii_redacted_before_ai": true
}}

Rules:
- Subject must be one of these HKEDB-aligned subjects for grade "{grade}": {allowed_subjects}.
- Use grade "{grade}".
- The upload may contain multiple pages or multiple uploaded page images. The current upload has at least {page_count_hint} uploaded page/file part(s); for PDFs, count physical pages when visible.
- Do not invent student personal data.
- If you can see the original upload, use the visual layout to separate printed questions, student answers, marks, teacher corrections, diagrams, and tables.
- Use the OCR text below as evidence, but if it conflicts with the visible upload, prefer the visual evidence and set confidence lower.
- If handwriting, blur, rotation, cropping, or teacher markings make the result uncertain, set requires_parent_confirmation true.
- Detect every distinct topic / strand covered by the homework or test. Do not collapse the review into one topic when multiple topics are visible.
- Link each extracted question to its page_number and topic_ids. page_number starts at 1 and follows the order shown in the upload or OCR page markers.
- mistake_tags must only contain these enum values: concept, calculation, reading, unit_conversion, careless.
- If the text is sparse, create at most 3 review items from plausible math signals and set confidence below 0.65.

child_profile_id: {child_profile_id}
file_kind: {file_kind}
extracted_text:
{extracted_text[:5000]}
"""


def parse_ocr_review_response(
    response_text: str,
    child_profile_id: str,
    file_kind: str,
    page_count_hint: int = 1,
) -> OcrReviewResult:
    data = extract_json_object(response_text or "{}")
    data["document_id"] = data.get("document_id") or f"doc-{uuid.uuid4().hex[:10]}"
    data["child_profile_id"] = child_profile_id
    data["file_kind"] = file_kind
    try:
        page_count = int(data.get("page_count") or page_count_hint)
    except (TypeError, ValueError):
        page_count = page_count_hint
    data["page_count"] = max(1, page_count, page_count_hint)
    if isinstance(data.get("topics"), list):
        normalized_topics = []
        for index, topic in enumerate(data["topics"], start=1):
            if isinstance(topic, str):
                topic = {"topic": topic}
            if isinstance(topic, dict):
                topic["id"] = topic.get("id") or f"t{index}"
                topic["subject"] = topic.get("subject") or data.get("subject") or "Mathematics"
                topic["confidence"] = topic.get("confidence") if topic.get("confidence") is not None else 0.5
                normalized_topics.append(topic)
        data["topics"] = normalized_topics
    data["requires_parent_confirmation"] = True
    data["pii_redacted_before_ai"] = True
    return OcrReviewResult.model_validate(data)


def build_review_with_gemini(
    extracted_text: str,
    child_profile_id: str,
    grade: str,
    file_kind: str,
    page_count_hint: int = 1,
) -> OcrReviewResult:
    client = get_genai_client()
    prompt = build_ocr_review_prompt(extracted_text, child_profile_id, grade, file_kind, page_count_hint)
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    return parse_ocr_review_response(response.text or "{}", child_profile_id, file_kind, page_count_hint)


def build_multimodal_review_with_gemini(
    upload_pages: list[dict[str, Any]],
    extracted_text: str,
    child_profile_id: str,
    grade: str,
    file_kind: str,
    page_count_hint: int = 1,
) -> OcrReviewResult:
    client = get_genai_client()
    prompt = build_ocr_review_prompt(extracted_text, child_profile_id, grade, file_kind, page_count_hint)
    prompt += (
        "\nYou are receiving the original upload page files plus the OCR text. "
        "Use both. Keep the output strictly inside the JSON schema."
    )
    parts = []
    for page in upload_pages:
        review_mime_type = str(page["mime_type"])
        if page["file_kind"] == "image" and not review_mime_type.startswith("image/"):
            review_mime_type = "image/jpeg"
        parts.append(types.Part.from_bytes(data=page["content"], mime_type=review_mime_type))
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[*parts, prompt],
    )
    return parse_ocr_review_response(response.text or "{}", child_profile_id, file_kind, page_count_hint)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        project_id=PROJECT_ID,
        vertex_location=VERTEX_LOCATION,
        gemini_model=GEMINI_MODEL,
        vision_configured=True,
        static_dir_exists=STATIC_DIR.exists(),
    )


@app.get("/api/curriculum/catalog")
def curriculum_catalog() -> dict[str, Any]:
    return get_curriculum_catalog()


def set_session_cookie(response: Response, parent_id: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=sign_session(parent_id),
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=session_cookie_secure(),
        path="/",
    )


@app.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response) -> AuthResponse:
    email = payload.email.strip().lower()
    if email == DEMO_PARENT_EMAIL and payload.pin == DEMO_PARENT_PIN:
        parent = persistence.ensure_demo_data(email)
        set_session_cookie(response, DEMO_PARENT_ID)
        return AuthResponse(parent=ParentProfile.model_validate(parent))

    parent = persistence.get_parent_by_email(email)
    if not parent or not verify_pin(payload.pin, parent.get("pin_hash")):
        raise HTTPException(status_code=401, detail="Invalid email or PIN")
    set_session_cookie(response, str(parent["id"]))
    return AuthResponse(parent=ParentProfile.model_validate(parent))


@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(payload: SignupRequest, response: Response) -> AuthResponse:
    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if email == DEMO_PARENT_EMAIL or persistence.get_parent_by_email(email):
        raise HTTPException(status_code=409, detail="Email already registered")

    parent = persistence.create_parent(
        email=email,
        display_name=payload.display_name,
        pin_hash=hash_pin(payload.pin),
    )
    set_session_cookie(response, str(parent["id"]))
    return AuthResponse(parent=ParentProfile.model_validate(parent))


@app.post("/api/auth/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/api/auth/me", response_model=AuthResponse)
def auth_me(parent_id: str = Depends(require_parent_id)) -> AuthResponse:
    parent = persistence.get_parent_with_children(parent_id)
    if not parent:
        if parent_id == DEMO_PARENT_ID:
            parent = persistence.ensure_demo_data(DEMO_PARENT_EMAIL)
        else:
            raise HTTPException(status_code=404, detail="Parent profile not found")
    return AuthResponse(parent=ParentProfile.model_validate(parent))


@app.patch("/api/parent", response_model=ParentProfile)
def update_parent(payload: ParentUpdateRequest, parent_id: str = Depends(require_parent_id)) -> ParentProfile:
    parent = persistence.patch_parent(parent_id, payload.model_dump(mode="json", exclude_unset=True))
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return ParentProfile.model_validate(parent)


def build_privacy_center_response(parent_id: str) -> PrivacyCenterResponse:
    parent = persistence.get_parent_with_children(parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    parent_profile = ParentProfile.model_validate(parent)
    return PrivacyCenterResponse(
        parent=parent_profile,
        privacy_settings=PrivacySettings.model_validate(parent_profile.privacy_settings),
        children=[ChildDataSummary.model_validate(item) for item in persistence.list_child_data_summaries(parent_id)],
        audit_events=[AuditEvent.model_validate(item) for item in persistence.list_audit_events(parent_id)],
    )


def require_privacy_consent(parent_id: str, consent_key: str, action: str) -> None:
    parent = persistence.get_parent_with_children(parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    settings = PrivacySettings.model_validate(parent.get("privacy_settings") or {})
    if not getattr(settings, consent_key):
        raise HTTPException(status_code=403, detail=f"Parent consent required for {action}")


@app.get("/api/privacy", response_model=PrivacyCenterResponse)
def privacy_center(parent_id: str = Depends(require_parent_id)) -> PrivacyCenterResponse:
    return build_privacy_center_response(parent_id)


@app.patch("/api/privacy/consent", response_model=PrivacyCenterResponse)
def update_privacy_settings(
    payload: PrivacyUpdateRequest,
    parent_id: str = Depends(require_parent_id),
) -> PrivacyCenterResponse:
    parent = persistence.update_privacy_settings(parent_id, payload.model_dump(mode="json", exclude_unset=True))
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return build_privacy_center_response(parent_id)


@app.get("/api/audit-log", response_model=list[AuditEvent])
def audit_log(parent_id: str = Depends(require_parent_id)) -> list[AuditEvent]:
    return [AuditEvent.model_validate(item) for item in persistence.list_audit_events(parent_id)]


@app.get("/api/children")
def list_children(parent_id: str = Depends(require_parent_id)) -> dict[str, Any]:
    parent = persistence.get_parent_with_children(parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return {"ok": True, "children": parent.get("children", [])}


@app.post("/api/children", response_model=ChildProfile)
async def create_child(payload: ChildCreateRequest, parent_id: str = Depends(require_parent_id)) -> ChildProfile:
    child = persistence.create_child(parent_id, payload.model_dump(mode="json"))
    return ChildProfile.model_validate(child)


@app.patch("/api/children/{child_id}", response_model=ChildProfile)
async def update_child(child_id: str, payload: dict[str, Any], parent_id: str = Depends(require_parent_id)) -> ChildProfile:
    child = persistence.patch_child(parent_id, child_id, payload)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return ChildProfile.model_validate(child)


@app.delete("/api/children/{child_id}", response_model=ChildDeleteResponse)
async def delete_child(
    child_id: str,
    payload: ChildDeleteRequest,
    parent_id: str = Depends(require_parent_id),
) -> ChildDeleteResponse:
    try:
        result = persistence.delete_child_data(
            parent_id,
            child_id,
            confirmation_name=payload.confirmation_name,
            delete_storage=payload.delete_storage,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 409 if "only child" in detail else 400
        if detail == "Child not found":
            status_code = 404
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return ChildDeleteResponse(
        parent=ParentProfile.model_validate(result["parent"]),
        deleted_child_id=result["deleted_child_id"],
        deleted_documents=result["deleted_documents"],
        deleted_portfolio_exports=result["deleted_portfolio_exports"],
        deleted_storage_objects=result["deleted_storage_objects"],
    )


@app.post("/api/ocr-review")
async def ocr_review(
    file: UploadFile | None = File(default=None),
    files: list[UploadFile] | None = File(default=None),
    child_id: str = Form(DEMO_CHILD_ID),
    child_profile_id: str = Form(DEMO_CHILD_ID),
    grade: str = Form("P3"),
    parent_id: str = Depends(require_parent_id),
) -> dict[str, Any]:
    require_privacy_consent(parent_id, "upload_storage_consent", "homework upload storage")
    require_privacy_consent(parent_id, "ai_processing_consent", "AI homework review")
    uploads = normalize_ocr_uploads(file, files)
    if not uploads:
        raise HTTPException(status_code=400, detail="At least one uploaded page or PDF is required")
    if len(uploads) > 12:
        raise HTTPException(status_code=400, detail="Upload up to 12 page files at a time")

    upload_pages: list[dict[str, Any]] = []
    document_id = f"doc-{uuid.uuid4().hex[:10]}"
    for page_number, upload in enumerate(uploads, start=1):
        content = await upload.read()
        filename = upload.filename or f"{document_id}-page-{page_number}.upload"
        if not content:
            raise HTTPException(status_code=400, detail=f"Uploaded file is empty: {filename}")

        mime_type = upload.content_type or "application/octet-stream"
        page_file_kind = upload_file_kind(mime_type)
        page_ocr_provider = upload_ocr_provider(page_file_kind)

        try:
            extracted_text = (
                run_gemini_document_ocr(content, mime_type)
                if page_file_kind == "pdf"
                else run_vision_ocr(content)
            )
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"GCP OCR failed on page {page_number} ({filename}): {exc}",
            ) from exc

        upload_pages.append(
            {
                "page_number": page_number,
                "filename": filename,
                "mime_type": mime_type,
                "file_kind": page_file_kind,
                "ocr_provider": page_ocr_provider,
                "content": content,
                "extracted_text": extracted_text,
            }
        )

    page_count_hint = len(upload_pages)
    extracted_text = build_combined_ocr_text(upload_pages)
    file_kind = summarize_file_kind(upload_pages)
    ocr_provider = summarize_ocr_provider(upload_pages)
    filenames = [str(page["filename"]) for page in upload_pages]
    filename = filenames[0] if len(filenames) == 1 else f"{len(filenames)} pages - {filenames[0]}"
    mime_type = str(upload_pages[0]["mime_type"]) if len(upload_pages) == 1 else "multipart/mixed"
    review_mode = "multimodal_llm" if OCR_REVIEW_MODE != "text_only" else "text_only_llm"
    review_fallback_used = False
    review_fallback_error = None

    try:
        if review_mode == "multimodal_llm":
            try:
                review = build_multimodal_review_with_gemini(
                    upload_pages,
                    extracted_text,
                    child_profile_id or child_id,
                    grade,
                    file_kind,
                    page_count_hint,
                )
            except Exception as multimodal_exc:
                review_fallback_used = True
                review_fallback_error = str(multimodal_exc)
                review_mode = "text_only_llm"
                review = build_review_with_gemini(
                    extracted_text,
                    child_profile_id or child_id,
                    grade,
                    file_kind,
                    page_count_hint,
                )
        else:
            review = build_review_with_gemini(
                extracted_text,
                child_profile_id or child_id,
                grade,
                file_kind,
                page_count_hint,
            )
    except Exception as exc:
        detail = f"Vertex AI review generation failed: {exc}"
        if review_fallback_error:
            detail = f"{detail}; multimodal fallback reason: {review_fallback_error}"
        raise HTTPException(status_code=502, detail=detail) from exc

    storage_uris = []
    for page in upload_pages:
        storage_uri = persistence.upload_bytes(
            f"parents/{parent_id}/children/{child_id}/documents/{document_id}-page-{page['page_number']}-{page['filename']}",
            page["content"],
            page["mime_type"],
        )
        if storage_uri:
            storage_uris.append(storage_uri)

    document = DocumentRecord(
        id=document_id,
        parent_id=parent_id,
        child_id=child_id,
        filename=filename,
        filenames=filenames,
        mime_type=mime_type,
        file_kind=file_kind,
        page_count=review.page_count,
        storage_uri=storage_uris[0] if storage_uris else None,
        storage_uris=storage_uris,
        ocr_provider=ocr_provider,
        review_mode=review_mode,
        review_model=GEMINI_MODEL,
        review_fallback_used=review_fallback_used,
        ocr_text_preview=extracted_text[:800],
        review=review,
        created_at=now_iso(),
    )
    persistence.save_document(document.model_dump(mode="json"))

    return {
        "ok": True,
        "filename": filename,
        "filenames": filenames,
        "mime_type": mime_type,
        "file_kind": file_kind,
        "page_count": review.page_count,
        "uploaded_page_count": page_count_hint,
        "ocr_provider": ocr_provider,
        "review_mode": review_mode,
        "review_model": GEMINI_MODEL,
        "review_fallback_used": review_fallback_used,
        "ocr_text_preview": extracted_text[:800],
        "review": review.model_dump(mode="json"),
        "document": document.model_dump(mode="json"),
    }


@app.post("/api/generate-quiz")
async def generate_quiz(
    payload: dict[str, Any],
    parent_id: str = Depends(require_parent_id),
) -> dict[str, Any]:
    require_privacy_consent(parent_id, "ai_processing_consent", "AI practice generation")
    child_profile_id = str(payload.get("child_profile_id", "prototype-child"))
    weak_topic = str(payload.get("weak_topic", "Fractions"))
    grade = str(payload.get("grade", "P3"))
    requested_subject = str(payload.get("subject", "Mathematics"))
    question_count = clamp_question_count(payload.get("question_count", 5))
    practice_plan = normalize_practice_plan(payload.get("practice_plan"), question_count)
    curriculum_subject = find_subject_for_grade(grade, requested_subject) or find_subject_for_grade(grade, "Mathematics")
    subject = curriculum_subject["name"] if curriculum_subject else "Mathematics"
    curriculum_subject_id = curriculum_subject["id"] if curriculum_subject else "mathematics"
    curriculum_kla = curriculum_subject["kla_name"] if curriculum_subject else "Mathematics Education"
    curriculum_strands = curriculum_subject["strands"] if curriculum_subject else ["number", "measure", "shape and space"]
    curriculum_sources = curriculum_subject["source_ids"] if curriculum_subject else ["edb-kla-overview-2526"]
    plan_prompt = json.dumps(practice_plan, ensure_ascii=False, indent=2) if practice_plan else "[]"
    prompt = f"""
Return JSON only for this Pydantic schema:
{{
  "child_profile_id": "{child_profile_id}",
  "source_document_ids": [],
  "items": [
    {{
      "id": "quiz-1",
      "grade": "{grade}",
      "subject": "{subject}",
      "topic": "{weak_topic}",
      "skill": "HKEDB-aligned skill for this topic",
      "difficulty": 2,
      "question_text": "string",
      "answer": "string",
      "marking_scheme": "string",
      "explanation": "Traditional Chinese explanation for parent/student",
      "target_mistake": "concept",
      "estimated_time_seconds": 90,
      "generated_from_curriculum_node_id": "hk-{grade.lower()}-{curriculum_subject_id}-practice",
      "copied_from_uploaded_question": false
    }}
  ],
  "parent_visible_rationale": "string"
}}
HKEDB curriculum context:
- subject: {subject}
- KLA: {curriculum_kla}
- strands: {curriculum_strands}
- official source ids: {curriculum_sources}
- requested total question count: {question_count}
- practice plan by topic / area:
{plan_prompt}

Generate exactly {question_count} original Hong Kong learning check items or practice questions. Do not copy uploaded questions.
If a practice plan is provided, distribute the items exactly according to each plan row's question_count.
Every item must target the requested topic/area plan for grade "{grade}" and subject "{subject}". If no plan is provided, target "{weak_topic}".
Use each item's topic field to identify the relevant plan topic / area.
Use Traditional Chinese explanations for the parent/student even when the subject is English.
target_mistake must be exactly one of: concept, calculation, reading, unit_conversion, careless.
"""
    try:
        client = get_genai_client()
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        quiz = validate_ai_json(response.text or "{}", GeneratedQuiz)
    except HTTPException as exc:
        if not LOCAL_PRACTICE_FALLBACK:
            raise
        quiz = build_local_practice_quiz(
            child_profile_id,
            grade,
            subject,
            curriculum_subject_id,
            weak_topic,
            question_count,
            practice_plan,
            f"Vertex AI unavailable: {exc.detail}",
        )
    except Exception as exc:
        if not LOCAL_PRACTICE_FALLBACK:
            raise HTTPException(status_code=502, detail=f"Vertex AI quiz generation failed: {exc}") from exc
        quiz = build_local_practice_quiz(
            child_profile_id,
            grade,
            subject,
            curriculum_subject_id,
            weak_topic,
            question_count,
            practice_plan,
            f"Vertex AI fallback: {exc}",
        )
    return {"ok": True, "parent_id": parent_id, "quiz": quiz.model_dump(mode="json")}


def clamp_question_count(value: Any) -> int:
    try:
        count = int(value)
    except (TypeError, ValueError):
        count = 5
    return max(1, min(count, 20))


def build_local_practice_quiz(
    child_profile_id: str,
    grade: str,
    subject: str,
    subject_id: str,
    weak_topic: str,
    question_count: int,
    practice_plan: list[dict[str, Any]],
    fallback_reason: str,
) -> GeneratedQuiz:
    plan = practice_plan or [
        {
            "topic_id": f"{grade.lower()}-{subject_id}-practice",
            "title": weak_topic,
            "title_zh": weak_topic,
            "strand": "practice",
            "question_count": question_count,
        }
    ]
    items: list[dict[str, Any]] = []

    for plan_item in plan:
        topic_label = str(plan_item.get("title_zh") or plan_item.get("title") or weak_topic)
        strand = str(plan_item.get("strand") or "practice")
        topic_id = str(plan_item.get("topic_id") or f"{grade.lower()}-{subject_id}-{slug_for_id(strand)}")
        for index in range(int(plan_item["question_count"])):
            item_number = len(items) + 1
            items.append(
                {
                    "id": f"local-{slug_for_id(topic_id)}-{index + 1}",
                    "grade": grade,
                    "subject": subject,
                    "topic": topic_label,
                    "skill": f"{subject} · {strand}",
                    "difficulty": 2 if item_number <= 6 else 3,
                    "question_text": build_local_question_text(topic_label, strand, item_number),
                    "answer": build_local_answer(topic_label, strand),
                    "marking_scheme": "2 分：列出相關概念或步驟；1 分：答案方向正確但解釋不足；0 分：未能回應題目要求。",
                    "explanation": f"這題用來檢查 {grade} {subject} 在「{topic_label}」的核心理解；提交後可把錯因標記到學習地圖。",
                    "target_mistake": "concept",
                    "estimated_time_seconds": 90,
                    "generated_from_curriculum_node_id": f"hk-{grade.lower()}-{subject_id}-{slug_for_id(strand)}",
                    "copied_from_uploaded_question": False,
                }
            )

    while len(items) < question_count:
        item_number = len(items) + 1
        items.append(
            {
                "id": f"local-{subject_id}-practice-{item_number}",
                "grade": grade,
                "subject": subject,
                "topic": weak_topic,
                "skill": f"{subject} · practice",
                "difficulty": 2,
                "question_text": build_local_question_text(weak_topic, "practice", item_number),
                "answer": build_local_answer(weak_topic, "practice"),
                "marking_scheme": "2 分：回應完整並有清楚理據；1 分：方向正確但欠完整；0 分：未能回應題目要求。",
                "explanation": f"這題補足 requested question count，用來檢查 {grade} {subject} 的當前弱項。",
                "target_mistake": "concept",
                "estimated_time_seconds": 90,
                "generated_from_curriculum_node_id": f"hk-{grade.lower()}-{subject_id}-practice",
                "copied_from_uploaded_question": False,
            }
        )

    return GeneratedQuiz.model_validate(
        {
            "child_profile_id": child_profile_id,
            "source_document_ids": [],
            "items": items[:question_count],
            "parent_visible_rationale": (
                "Local curriculum draft generated from the selected HKEDB topic / area allocation "
                f"because {fallback_reason}. Replace with Gemini output when GCP is configured."
            ),
        }
    )


def build_local_question_text(topic_label: str, strand: str, item_number: int) -> str:
    if any(marker in strand.lower() for marker in ("number", "measure", "algebra", "data", "shape")):
        return (
            f"【{topic_label}】第 {item_number} 題：請設計一個生活情境例子，列出已知資料、所需步驟，"
            "並寫出完整答案或解釋。"
        )
    return f"【{topic_label}】第 {item_number} 題：請用 3 至 5 句回答，並引用一個課堂或生活例子支持你的答案。"


def build_local_answer(topic_label: str, strand: str) -> str:
    if any(marker in strand.lower() for marker in ("number", "measure", "algebra", "data", "shape")):
        return f"參考答案應包含：清楚列式或圖表、合理運算步驟、以及與「{topic_label}」相關的答句。"
    return f"參考答案應包含：直接回應問題、使用「{topic_label}」相關概念、並以例子或證據支持。"


def slug_for_id(value: str) -> str:
    slug = "".join(char.lower() if char.isalnum() else "-" for char in value).strip("-")
    return slug or "practice"


def normalize_practice_plan(value: Any, fallback_total: int) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    plan: list[dict[str, Any]] = []
    remaining = 20
    for item in value:
        if not isinstance(item, dict):
            continue
        try:
            count = int(item.get("question_count", 0))
        except (TypeError, ValueError):
            count = 0
        count = max(0, min(count, remaining))
        if count <= 0:
            continue
        remaining -= count
        plan.append(
            {
                "topic_id": str(item.get("topic_id", ""))[:120],
                "title": str(item.get("title", ""))[:160],
                "title_zh": str(item.get("title_zh", ""))[:160],
                "strand": str(item.get("strand", ""))[:120],
                "question_count": count,
            }
        )
        if remaining <= 0:
            break

    if not plan:
        return []

    total = sum(item["question_count"] for item in plan)
    if total <= fallback_total:
        return plan

    overflow = total - fallback_total
    for item in reversed(plan):
        removable = min(overflow, item["question_count"] - 1)
        if removable <= 0:
            continue
        item["question_count"] -= removable
        overflow -= removable
        if overflow <= 0:
            break
    return [item for item in plan if item["question_count"] > 0]


@app.post("/api/portfolio/export", response_model=PortfolioExportRecord)
async def export_portfolio(
    payload: PortfolioExportRequest,
    parent_id: str = Depends(require_parent_id),
) -> PortfolioExportRecord:
    require_privacy_consent(parent_id, "portfolio_export_consent", "Portfolio PDF export")
    parent = persistence.get_parent_with_children(parent_id)
    child_data = next((child for child in parent.get("children", []) if child.get("id") == payload.child_id), None)
    if not child_data:
        raise HTTPException(status_code=404, detail="Child not found")

    child = ChildProfile.model_validate(child_data)
    pdf_bytes = build_portfolio_pdf(child, payload.sections)
    export_id = f"export-{uuid.uuid4().hex[:10]}"
    filename = f"{child.name.lower()}-learning-passport.pdf"
    storage_uri = persistence.upload_bytes(
        f"parents/{parent_id}/children/{child.id}/portfolio/{export_id}.pdf",
        pdf_bytes,
        "application/pdf",
    )
    record = PortfolioExportRecord(
        id=export_id,
        parent_id=parent_id,
        child_id=child.id,
        filename=filename,
        storage_uri=storage_uri,
        download_url=f"/api/portfolio/exports/{export_id}/download",
        created_at=now_iso(),
    )
    persistence.save_portfolio_export(record.model_dump(mode="json"))
    persistence.record_audit_event(
        parent_id,
        "portfolio_exported",
        child_id=child.id,
        details={"export_id": export_id, "filename": filename},
    )
    return record


@app.get("/api/portfolio/exports/{export_id}/download")
def download_portfolio_export(
    export_id: str,
    parent_id: str = Depends(require_parent_id),
) -> Response:
    record = persistence.get_portfolio_export(parent_id, export_id)
    if not record:
        raise HTTPException(status_code=404, detail="Portfolio export not found")
    storage_uri = record.get("storage_uri")
    if not storage_uri:
        raise HTTPException(status_code=404, detail="Portfolio export has no file")
    pdf_bytes = persistence.read_bytes(storage_uri)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=\"{record.get('filename', 'portfolio.pdf')}\""},
    )


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def serve_frontend(path: str) -> FileResponse:
    candidate = STATIC_DIR / path
    if path and candidate.exists() and candidate.is_file():
        return FileResponse(candidate)
    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Frontend build not found")
