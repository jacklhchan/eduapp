from __future__ import annotations

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


def build_review_with_gemini(
    extracted_text: str,
    child_profile_id: str,
    grade: str,
    file_kind: str,
) -> OcrReviewResult:
    client = get_genai_client()
    allowed_subjects = subject_names_for_grade(grade) or ["Mathematics"]
    prompt = f"""
You are an OCR review assistant for a Hong Kong parent-led learning app.
Use the extracted homework text to return JSON only. Align subject and topic labels with the HKEDB curriculum catalogue.

Schema:
{{
  "document_id": "string",
  "child_profile_id": "string",
  "file_kind": "image|pdf",
  "subject": "Mathematics",
  "grade": "P3",
  "extracted_questions": [
    {{
      "id": "q1",
      "question_text": "string",
      "detected_answer": "string or null",
      "score": 1,
      "max_score": 1,
      "confidence": 0.75,
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
- Do not invent student personal data.
- mistake_tags must only contain these enum values: concept, calculation, reading, unit_conversion, careless.
- If the text is sparse, create at most 3 review items from plausible math signals and set confidence below 0.65.

child_profile_id: {child_profile_id}
file_kind: {file_kind}
extracted_text:
{extracted_text[:5000]}
"""
    response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    data = extract_json_object(response.text or "{}")
    data["document_id"] = data.get("document_id") or f"doc-{uuid.uuid4().hex[:10]}"
    data["child_profile_id"] = child_profile_id
    data["file_kind"] = file_kind
    data["requires_parent_confirmation"] = True
    data["pii_redacted_before_ai"] = True
    return OcrReviewResult.model_validate(data)


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
    file: UploadFile = File(...),
    child_id: str = Form(DEMO_CHILD_ID),
    child_profile_id: str = Form(DEMO_CHILD_ID),
    grade: str = Form("P3"),
    parent_id: str = Depends(require_parent_id),
) -> dict[str, Any]:
    require_privacy_consent(parent_id, "upload_storage_consent", "homework upload storage")
    require_privacy_consent(parent_id, "ai_processing_consent", "AI homework review")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    mime_type = file.content_type or "application/octet-stream"
    file_kind = "pdf" if mime_type == "application/pdf" else "image"
    document_id = f"doc-{uuid.uuid4().hex[:10]}"
    filename = file.filename or f"{document_id}.upload"

    try:
        extracted_text = (
            run_gemini_document_ocr(content, mime_type)
            if file_kind == "pdf"
            else run_vision_ocr(content)
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"GCP OCR failed: {exc}") from exc

    try:
        review = build_review_with_gemini(extracted_text, child_profile_id or child_id, grade, file_kind)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Vertex AI review generation failed: {exc}") from exc

    storage_uri = persistence.upload_bytes(
        f"parents/{parent_id}/children/{child_id}/documents/{document_id}-{filename}",
        content,
        mime_type,
    )
    document = DocumentRecord(
        id=document_id,
        parent_id=parent_id,
        child_id=child_id,
        filename=filename,
        mime_type=mime_type,
        file_kind=file_kind,
        storage_uri=storage_uri,
        ocr_text_preview=extracted_text[:800],
        review=review,
        created_at=now_iso(),
    )
    persistence.save_document(document.model_dump(mode="json"))

    return {
        "ok": True,
        "filename": filename,
        "mime_type": mime_type,
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
    client = get_genai_client()
    child_profile_id = str(payload.get("child_profile_id", "prototype-child"))
    weak_topic = str(payload.get("weak_topic", "Fractions"))
    grade = str(payload.get("grade", "P3"))
    requested_subject = str(payload.get("subject", "Mathematics"))
    curriculum_subject = find_subject_for_grade(grade, requested_subject) or find_subject_for_grade(grade, "Mathematics")
    subject = curriculum_subject["name"] if curriculum_subject else "Mathematics"
    curriculum_subject_id = curriculum_subject["id"] if curriculum_subject else "mathematics"
    curriculum_kla = curriculum_subject["kla_name"] if curriculum_subject else "Mathematics Education"
    curriculum_strands = curriculum_subject["strands"] if curriculum_subject else ["number", "measure", "shape and space"]
    curriculum_sources = curriculum_subject["source_ids"] if curriculum_subject else ["edb-kla-overview-2526"]
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

Generate 5 original Hong Kong learning check items or practice questions. Do not copy uploaded questions.
Every item must target "{weak_topic}" for grade "{grade}" and subject "{subject}".
Use Traditional Chinese explanations for the parent/student even when the subject is English.
target_mistake must be exactly one of: concept, calculation, reading, unit_conversion, careless.
"""
    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        quiz = validate_ai_json(response.text or "{}", GeneratedQuiz)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Vertex AI quiz generation failed: {exc}") from exc
    return {"ok": True, "parent_id": parent_id, "quiz": quiz.model_dump(mode="json")}


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
