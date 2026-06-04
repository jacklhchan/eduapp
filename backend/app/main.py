from __future__ import annotations

import json
import mimetypes
import os
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from html import escape
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.cloud import vision
from google.genai import types
from pydantic import BaseModel

from .ai_validation import validate_ai_json
from .auth import require_parent_id
from .curriculum_catalog import find_subject_for_grade, get_curriculum_catalog
from .pdf_export import build_portfolio_pdf
from .persistence import DEMO_CHILD_ID, DEMO_PARENT_ID, now_iso, persistence
from .routers.account import account_router, require_privacy_consent
from .services.ocr_review import build_ocr_review_prompt, parse_ocr_review_response
from .schemas import (
    ChildProfile,
    DocumentRecord,
    GeneratedQuiz,
    MistakeNotebookItem,
    MistakeNotebookResponse,
    OcrReviewConfirmRequest,
    OcrReviewDeleteResponse,
    OcrReviewFilePreview,
    OcrReviewInboxItem,
    OcrReviewResult,
    ParentProfile,
    PracticeAttemptRecord,
    PracticeAttemptRequest,
    PracticeTopicResult,
    PortfolioExportRecord,
    PortfolioExportRequest,
    ShareLearningReportRecord,
    ShareLearningReportRequest,
    TeacherLearningReportResponse,
    WeeklyParentBriefingResponse,
    LearningProgressResponse,
    SubjectProgressSummary,
    LearningTopicSummary,
)


PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT") or ""
VERTEX_LOCATION = os.getenv("VERTEX_LOCATION", "global")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
STATIC_DIR = Path(os.getenv("STATIC_DIR", "/app/static"))
DEMO_PARENT_EMAIL = os.getenv("EDUPASS_DEMO_EMAIL", "parent@example.com").lower()
DEMO_PARENT_PIN = os.getenv("EDUPASS_DEMO_PIN", "246810")
OCR_REVIEW_MODE = os.getenv("EDUPASS_OCR_REVIEW_MODE", "multimodal")
LOCAL_PRACTICE_FALLBACK = os.getenv("EDUPASS_LOCAL_PRACTICE_FALLBACK", "1").lower() not in {"0", "false", "no"}
ACTIVE_LEARNING_SUBJECT = "Mathematics"
PRODUCTION_RUNTIME = bool(os.getenv("K_SERVICE")) or os.getenv("EDUPASS_ENV", "").strip().lower() == "production"
DEMO_LOGIN_ENABLED = os.getenv("EDUPASS_ENABLE_DEMO_LOGIN", "1" if not PRODUCTION_RUNTIME else "0").lower() in {"1", "true", "yes"}
MAX_UPLOAD_FILES = int(os.getenv("EDUPASS_MAX_UPLOAD_FILES", "12"))
MAX_UPLOAD_BYTES = int(os.getenv("EDUPASS_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
MAX_TOTAL_UPLOAD_BYTES = int(os.getenv("EDUPASS_MAX_TOTAL_UPLOAD_BYTES", str(24 * 1024 * 1024)))
MAX_PDF_PAGES = int(os.getenv("EDUPASS_MAX_PDF_PAGES", "12"))
OCR_RATE_LIMIT_PER_MINUTE = int(os.getenv("EDUPASS_OCR_RATE_LIMIT_PER_MINUTE", "12"))
NON_ACADEMIC_PROGRESS_SUBJECTS = {
    "arts and creativity",
    "music",
    "pe",
    "physical education",
    "physical fitness and health",
    "sport",
    "sports",
    "va",
    "visual arts",
}
ALLOWED_UPLOAD_MIME_TYPES = {
    "application/pdf",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/jpeg",
    "image/png",
    "image/webp",
}


def configured_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS")
    if configured:
        origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
        if "*" in origins and PRODUCTION_RUNTIME:
            raise RuntimeError("CORS_ALLOW_ORIGINS cannot contain '*' in production")
        return origins
    if PRODUCTION_RUNTIME:
        return []
    return [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ]

app = FastAPI(title="EduPass AI Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(account_router)

_rate_limit_events: dict[str, list[float]] = {}


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


def sanitize_upload_filename(filename: str) -> str:
    base = Path(filename or "upload").name.strip()
    base = re.sub(r"[^A-Za-z0-9._-]+", "-", base)
    base = base.strip(".-")[:96]
    return base or "upload"


def sniff_upload_mime(content: bytes, declared_mime_type: str) -> str:
    if content.startswith(b"%PDF-"):
        return "application/pdf"
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
        return "image/gif"
    if len(content) > 12 and content[8:12] == b"WEBP":
        return "image/webp"
    if len(content) > 12 and content[4:8] == b"ftyp" and content[8:12] in {b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"}:
        return "image/heic"
    return "application/octet-stream"


def estimate_pdf_page_count(content: bytes) -> int:
    if not content.startswith(b"%PDF-"):
        return 0
    return max(1, len(re.findall(rb"/Type\s*/Page\b", content)))


def validate_upload_content(filename: str, declared_mime_type: str, content: bytes) -> tuple[str, int]:
    if not content:
        raise HTTPException(status_code=400, detail=f"Uploaded file is empty: {filename}")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Uploaded file is too large: {filename}")

    mime_type = sniff_upload_mime(content, declared_mime_type or "application/octet-stream")
    if mime_type not in ALLOWED_UPLOAD_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported upload type: {filename}")
    if mime_type == "application/pdf":
        page_count = estimate_pdf_page_count(content)
        if page_count > MAX_PDF_PAGES:
            raise HTTPException(status_code=413, detail=f"PDF has too many pages: {filename}")
        return mime_type, max(1, page_count)
    return mime_type, 1


def check_rate_limit(parent_id: str, action: str, limit: int = OCR_RATE_LIMIT_PER_MINUTE) -> None:
    now = time.monotonic()
    key = f"{action}:{parent_id}"
    recent = [stamp for stamp in _rate_limit_events.get(key, []) if now - stamp < 60]
    if len(recent) >= limit:
        _rate_limit_events[key] = recent
        raise HTTPException(status_code=429, detail="Too many requests; please wait before trying again")
    recent.append(now)
    _rate_limit_events[key] = recent


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


def mime_type_for_document_file(document: dict[str, Any], index: int, filename: str) -> str:
    mime_types = document.get("mime_types") if isinstance(document.get("mime_types"), list) else []
    if index < len(mime_types) and mime_types[index]:
        return str(mime_types[index])
    document_mime_type = str(document.get("mime_type") or "")
    if document_mime_type and document_mime_type != "multipart/mixed":
        return document_mime_type
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def preview_file_kind(mime_type: str) -> str:
    if mime_type == "application/pdf":
        return "pdf"
    if mime_type.startswith("image/"):
        return "image"
    return "file"


def ocr_file_previews(document: dict[str, Any]) -> list[OcrReviewFilePreview]:
    storage_uris = document.get("storage_uris") if isinstance(document.get("storage_uris"), list) else []
    if not storage_uris and document.get("storage_uri"):
        storage_uris = [document["storage_uri"]]
    filenames = document.get("filenames") if isinstance(document.get("filenames"), list) else []
    fallback_filename = str(document.get("filename") or "uploaded-homework")
    document_id = str(document.get("id") or "")
    previews: list[OcrReviewFilePreview] = []
    for index, storage_uri in enumerate(storage_uris):
        if not storage_uri:
            continue
        filename = str(filenames[index]) if index < len(filenames) and filenames[index] else fallback_filename
        mime_type = mime_type_for_document_file(document, index, filename)
        previews.append(
            OcrReviewFilePreview(
                page_number=index + 1,
                filename=filename,
                mime_type=mime_type,
                file_kind=preview_file_kind(mime_type),
                preview_url=f"/api/ocr-review/{document_id}/files/{index + 1}",
            )
        )
    return previews


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
    check_rate_limit(parent_id, "ocr_review")
    uploads = normalize_ocr_uploads(file, files)
    if not uploads:
        raise HTTPException(status_code=400, detail="At least one uploaded page or PDF is required")
    if len(uploads) > MAX_UPLOAD_FILES:
        raise HTTPException(status_code=400, detail=f"Upload up to {MAX_UPLOAD_FILES} page files at a time")

    upload_pages: list[dict[str, Any]] = []
    document_id = f"doc-{uuid.uuid4().hex[:10]}"
    total_upload_bytes = 0
    for page_number, upload in enumerate(uploads, start=1):
        content = await upload.read()
        filename = sanitize_upload_filename(upload.filename or f"{document_id}-page-{page_number}.upload")
        total_upload_bytes += len(content)
        if total_upload_bytes > MAX_TOTAL_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Total upload size is too large")

        mime_type, estimated_pages = validate_upload_content(
            filename,
            upload.content_type or "application/octet-stream",
            content,
        )
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
                "estimated_pages": estimated_pages,
                "content": content,
                "extracted_text": extracted_text,
            }
        )

    page_count_hint = max(1, sum(int(page.get("estimated_pages") or 1) for page in upload_pages))
    extracted_text = build_combined_ocr_text(upload_pages)
    file_kind = summarize_file_kind(upload_pages)
    ocr_provider = summarize_ocr_provider(upload_pages)
    filenames = [str(page["filename"]) for page in upload_pages]
    mime_types = [str(page["mime_type"]) for page in upload_pages]
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
    if review.page_count > MAX_PDF_PAGES:
        raise HTTPException(status_code=413, detail=f"Upload has too many pages after review: {review.page_count}")

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
        mime_types=mime_types,
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
    document_payload = document.model_dump(mode="json")
    document_payload["file_previews"] = [preview.model_dump(mode="json") for preview in ocr_file_previews(document_payload)]

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
        "file_previews": document_payload["file_previews"],
        "document": document_payload,
    }


@app.get("/api/ocr-review/inbox", response_model=list[OcrReviewInboxItem])
def ocr_review_inbox(
    child_id: str = DEMO_CHILD_ID,
    include_confirmed: bool = False,
    parent_id: str = Depends(require_parent_id),
) -> list[OcrReviewInboxItem]:
    documents = persistence.list_documents(parent_id, child_id)
    items: list[OcrReviewInboxItem] = []
    for document in documents:
        if not include_confirmed and document.get("parent_confirmed_at"):
            continue
        review = dict(document.get("review") or {})
        review_subject = enum_text(review.get("subject") or ACTIVE_LEARNING_SUBJECT)
        if not is_mvp_progress_subject(review_subject):
            continue
        if not review.get("requires_parent_confirmation", True) and not include_confirmed:
            continue
        items.append(
            OcrReviewInboxItem(
                id=str(document.get("id")),
                filename=str(document.get("filename") or "Uploaded homework"),
                created_at=str(document.get("created_at") or ""),
                page_count=int(document.get("page_count") or review.get("page_count") or 1),
                review_mode=str(document.get("review_mode") or "unknown"),
                parent_confirmed_at=document.get("parent_confirmed_at"),
                file_previews=ocr_file_previews(document),
                review=review,
            )
        )
    return items[:12]


@app.get("/api/ocr-review/{document_id}/files/{page_number}")
def get_ocr_review_file(
    document_id: str,
    page_number: int,
    parent_id: str = Depends(require_parent_id),
) -> Response:
    document = persistence.get_document(parent_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="OCR review document not found")
    storage_uris = document.get("storage_uris") if isinstance(document.get("storage_uris"), list) else []
    if not storage_uris and document.get("storage_uri"):
        storage_uris = [document["storage_uri"]]
    if page_number < 1 or page_number > len(storage_uris):
        raise HTTPException(status_code=404, detail="Uploaded file page not found")
    storage_uri = str(storage_uris[page_number - 1])
    filenames = document.get("filenames") if isinstance(document.get("filenames"), list) else []
    fallback_filename = str(document.get("filename") or f"ocr-page-{page_number}")
    filename = str(filenames[page_number - 1]) if page_number - 1 < len(filenames) and filenames[page_number - 1] else fallback_filename
    mime_type = mime_type_for_document_file(document, page_number - 1, filename)
    try:
        content = persistence.read_bytes(storage_uri)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Uploaded file is not available") from exc
    safe_filename = sanitize_upload_filename(filename)
    return Response(
        content=content,
        media_type=mime_type,
        headers={
            "Cache-Control": "private, max-age=300",
            "Content-Disposition": f'inline; filename="{safe_filename}"',
        },
    )


@app.patch("/api/ocr-review/{document_id}/confirm")
def confirm_ocr_review(
    document_id: str,
    payload: OcrReviewConfirmRequest,
    parent_id: str = Depends(require_parent_id),
) -> dict[str, Any]:
    document = persistence.get_document(parent_id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="OCR review document not found")
    review = dict(document.get("review") or {})
    corrections = [question.model_dump(mode="json") for question in payload.extracted_questions]
    if corrections:
        review["extracted_questions"] = corrections
    review["requires_parent_confirmation"] = False
    confirmed_at = now_iso()
    updated = persistence.update_document(
        parent_id,
        document_id,
        {
            "review": review,
            "parent_confirmed_at": confirmed_at,
            "parent_corrections": corrections,
        },
    )
    if not updated:
        raise HTTPException(status_code=404, detail="OCR review document not found")
    persistence.record_audit_event(
        parent_id,
        "ocr_review_confirmed",
        child_id=str(document.get("child_id") or ""),
        details={
            "document_id": document_id,
            "question_count": len(corrections),
            "parent_notes": payload.parent_notes,
        },
    )
    return {"ok": True, "document": updated, "parent_confirmed_at": confirmed_at}


@app.delete("/api/ocr-review/{document_id}", response_model=OcrReviewDeleteResponse)
def delete_ocr_review(
    document_id: str,
    parent_id: str = Depends(require_parent_id),
) -> OcrReviewDeleteResponse:
    result = persistence.delete_document(parent_id, document_id, delete_storage=True)
    if not result:
        raise HTTPException(status_code=404, detail="OCR review document not found")
    return OcrReviewDeleteResponse(
        deleted_document_id=result["deleted_document_id"],
        deleted_storage_objects=result["deleted_storage_objects"],
    )


@app.post("/api/generate-quiz")
async def generate_quiz(
    payload: dict[str, Any],
    parent_id: str = Depends(require_parent_id),
) -> dict[str, Any]:
    require_privacy_consent(parent_id, "ai_processing_consent", "AI practice generation")
    child_profile_id = str(payload.get("child_profile_id", "prototype-child"))
    weak_topic = str(payload.get("weak_topic", "Fractions"))
    grade = str(payload.get("grade", "P3"))
    requested_subject = ACTIVE_LEARNING_SUBJECT
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
      "options": ["A", "B", "C", "D"],
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

Generate exactly {question_count} original Hong Kong multiple-choice learning check items or practice questions. Do not copy uploaded questions.
If a practice plan is provided, distribute the items exactly according to each plan row's question_count.
Every item must target the requested topic/area plan for grade "{grade}" and subject "{subject}". If no plan is provided, target "{weak_topic}".
Use each item's topic field to identify the relevant plan topic / area.
Each item must include exactly 4 options. The answer must exactly match one of the option strings.
Use Traditional Chinese explanations for the parent/student even when the subject is English.
target_mistake must be exactly one of: concept, calculation, reading, unit_conversion, careless.
All question_text, options, answer, marking_scheme, and explanation values must be display-ready plain text.
Do not use LaTeX, Markdown math, dollar signs, backslashes, \\frac, \\triangle, or \\square.
Write math in mobile-readable text such as 1/4, 3/8, △, □, ×, ÷, or Traditional Chinese words.
"""
    try:
        client = get_genai_client()
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        quiz = sanitize_generated_quiz(validate_ai_json(response.text or "{}", GeneratedQuiz))
    except HTTPException as exc:
        if not LOCAL_PRACTICE_FALLBACK:
            raise
        quiz = sanitize_generated_quiz(build_local_practice_quiz(
            child_profile_id,
            grade,
            subject,
            curriculum_subject_id,
            weak_topic,
            question_count,
            practice_plan,
            f"Vertex AI unavailable: {exc.detail}",
        ))
    except Exception as exc:
        if not LOCAL_PRACTICE_FALLBACK:
            raise HTTPException(status_code=502, detail=f"Vertex AI quiz generation failed: {exc}") from exc
        quiz = sanitize_generated_quiz(build_local_practice_quiz(
            child_profile_id,
            grade,
            subject,
            curriculum_subject_id,
            weak_topic,
            question_count,
            practice_plan,
            f"Vertex AI fallback: {exc}",
        ))
    return {"ok": True, "parent_id": parent_id, "quiz": quiz.model_dump(mode="json")}


def sanitize_math_text(value: Any) -> str:
    text = str(value or "")
    replacements = {
        "\\triangle": "△",
        "\\square": "□",
        "\\times": "×",
        "\\div": "÷",
        "\\cdot": "×",
        "\\pm": "±",
        "\\leq": "≤",
        "\\geq": "≥",
        "\\neq": "≠",
        "\\left": "",
        "\\right": "",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    text = re.sub(r"\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}", r"\1/\2", text)
    text = re.sub(r"\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}", r"\1/\2", text)
    text = re.sub(r"\\tfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}", r"\1/\2", text)
    text = text.replace("$", "")
    text = text.replace("\\(", "").replace("\\)", "").replace("\\[", "").replace("\\]", "")
    text = re.sub(r"\\([A-Za-z]+)", r"\1", text)
    text = text.replace("\\", "")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def sanitize_generated_quiz(quiz: GeneratedQuiz) -> GeneratedQuiz:
    data = quiz.model_dump(mode="json")
    for item in data["items"]:
        for key in ("topic", "skill", "question_text", "answer", "marking_scheme", "explanation"):
            item[key] = sanitize_math_text(item.get(key, ""))
        options: list[str] = []
        for option in item.get("options", []):
            clean_option = sanitize_math_text(option)
            if clean_option and clean_option not in options:
                options.append(clean_option)
        answer = item["answer"]
        if answer and answer not in options:
            options = [answer, *options]
        item["options"] = options[:4]
    data["parent_visible_rationale"] = sanitize_math_text(data.get("parent_visible_rationale", ""))
    return GeneratedQuiz.model_validate(data)


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
                    "options": build_local_options(topic_label, strand, item_number),
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
                "options": build_local_options(weak_topic, "practice", item_number),
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
            f"【{topic_label}】第 {item_number} 題：小明完成一題數學題後得到 24。"
            "以下哪一個檢查方法最能幫助他確認答案合理？"
        )
    return f"【{topic_label}】第 {item_number} 題：以下哪一個做法最能幫助你檢查這類題目的答案？"


def build_local_options(topic_label: str, strand: str, item_number: int) -> list[str]:
    if any(marker in strand.lower() for marker in ("number", "measure", "algebra", "data", "shape", "practice")):
        return [
            "重讀題目，圈出已知資料和要求，並用相反運算或估算檢查答案",
            "只看最後答案是否像整數",
            "把題目中的所有數字直接相加",
            "不用檢查單位，只要有算式即可",
        ]
    return [
        f"直接回應問題，並用一個與「{topic_label}」相關的例子支持",
        "只抄題目中的第一句",
        "只寫一個關鍵詞，不作解釋",
        "避開題目要求，改寫自己的感想",
    ]


def build_local_answer(topic_label: str, strand: str) -> str:
    if any(marker in strand.lower() for marker in ("number", "measure", "algebra", "data", "shape")):
        return "重讀題目，圈出已知資料和要求，並用相反運算或估算檢查答案"
    return f"直接回應問題，並用一個與「{topic_label}」相關的例子支持"


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


def normalize_month(value: str | None = None) -> str:
    if value:
        return value[:7]
    return datetime.now(timezone.utc).strftime("%Y-%m")


def answer_is_correct(submitted: str, expected: str) -> bool:
    clean_submitted = " ".join(submitted.strip().lower().split())
    clean_expected = " ".join(expected.strip().lower().split())
    if not clean_submitted or not clean_expected:
        return False
    return clean_submitted == clean_expected or clean_expected in clean_submitted


def topic_key(subject: str, topic: str) -> str:
    return f"{subject.strip().lower()}::{topic.strip().lower()}"


def enum_text(value: Any) -> str:
    return str(getattr(value, "value", value))


def normalize_subject_key(value: Any) -> str:
    return " ".join(enum_text(value).replace("_", " ").replace("-", " ").strip().lower().split())


def is_academic_progress_subject(value: Any) -> bool:
    subject = normalize_subject_key(value)
    return bool(subject) and subject not in NON_ACADEMIC_PROGRESS_SUBJECTS


def is_active_learning_subject(value: Any) -> bool:
    subject = normalize_subject_key(value)
    active_subjects = {
        normalize_subject_key(ACTIVE_LEARNING_SUBJECT),
        normalize_subject_key("Early Childhood Mathematics"),
    }
    return subject in active_subjects


def is_mvp_progress_subject(value: Any) -> bool:
    return is_academic_progress_subject(value) and is_active_learning_subject(value)


def summarize_practice_topics(payload: PracticeAttemptRequest) -> list[PracticeTopicResult]:
    topics: dict[str, dict[str, Any]] = {}
    for answer in payload.answers:
        subject = enum_text(answer.subject or payload.subject)
        topic = answer.topic.strip() or "General practice"
        key = topic_key(subject, topic)
        is_correct = answer.is_correct
        if is_correct is None:
            is_correct = answer_is_correct(answer.submitted_answer, answer.expected_answer)
        summary = topics.setdefault(
            key,
            {
                "topic": topic,
                "subject": subject,
                "attempted": 0,
                "correct": 0,
                "incorrect": 0,
                "mistake_tags": [],
            },
        )
        summary["attempted"] += 1
        if is_correct:
            summary["correct"] += 1
        else:
            summary["incorrect"] += 1
            summary["mistake_tags"].append(answer.target_mistake)
    return [PracticeTopicResult.model_validate(value) for value in topics.values()]


@app.post("/api/practice-attempts", response_model=PracticeAttemptRecord)
def save_practice_attempt(
    payload: PracticeAttemptRequest,
    parent_id: str = Depends(require_parent_id),
) -> PracticeAttemptRecord:
    require_privacy_consent(parent_id, "ai_processing_consent", "practice result tracking")
    if not is_academic_progress_subject(payload.subject):
        raise HTTPException(status_code=400, detail="Only academic subject scores can be tracked; PE, sport, music and Visual Arts stay as portfolio evidence.")
    parent = persistence.get_parent_with_children(parent_id)
    child = next((item for item in parent.get("children", []) if item.get("id") == payload.child_id), None)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if not payload.answers:
        raise HTTPException(status_code=400, detail="At least one submitted answer is required")

    normalized_answers = []
    correct_count = 0
    for answer in payload.answers:
        is_correct = answer.is_correct
        if is_correct is None:
            is_correct = answer_is_correct(answer.submitted_answer, answer.expected_answer)
        correct_count += 1 if is_correct else 0
        normalized_answers.append(answer.model_copy(update={"is_correct": is_correct}))

    record = PracticeAttemptRecord(
        id=f"practice-{uuid.uuid4().hex[:10]}",
        parent_id=parent_id,
        child_id=payload.child_id,
        grade=payload.grade,
        subject=payload.subject,
        source_document_ids=payload.source_document_ids,
        total_count=len(normalized_answers),
        correct_count=correct_count,
        topic_results=summarize_practice_topics(payload.model_copy(update={"answers": normalized_answers})),
        answers=normalized_answers,
        created_at=now_iso(),
    )
    persistence.save_practice_attempt(record.model_dump(mode="json"))
    persistence.record_audit_event(
        parent_id,
        "practice_attempt_saved",
        child_id=payload.child_id,
        details={"practice_id": record.id, "total_count": record.total_count, "correct_count": record.correct_count},
    )
    return record


def build_learning_progress(parent_id: str, child_id: str, report_month: str | None = None) -> LearningProgressResponse:
    parent = persistence.get_parent_with_children(parent_id)
    child_data = next((item for item in parent.get("children", []) if item.get("id") == child_id), None)
    if not child_data:
        raise HTTPException(status_code=404, detail="Child not found")

    month = normalize_month(report_month)
    documents = persistence.list_documents(parent_id, child_id)
    attempts = persistence.list_practice_attempts(parent_id, child_id)
    topic_stats: dict[str, dict[str, Any]] = {}
    recent_activity: list[dict[str, Any]] = []
    trend_points: list[int] = []
    visible_document_count = 0
    visible_practice_count = 0

    for document in documents:
        review = document.get("review") or {}
        review_subject = enum_text(review.get("subject") or ACTIVE_LEARNING_SUBJECT)
        if not is_mvp_progress_subject(review_subject):
            continue
        visible_document_count += 1
        created_at = str(document.get("created_at") or "")
        recent_activity.append(
            {
                "type": "upload_review",
                "title": document.get("filename") or "Uploaded homework",
                "created_at": created_at,
                "count": len(review.get("extracted_questions") or []),
            }
        )
        for topic in review.get("topics") or []:
            subject = str(topic.get("subject") or review_subject)
            if not is_mvp_progress_subject(subject):
                continue
            label = str(topic.get("topic") or "Uncategorised")
            key = topic_key(subject, label)
            stats = topic_stats.setdefault(
                key,
                {
                    "topic": label,
                    "subject": subject,
                    "evidence_count": 0,
                    "practice_count": 0,
                    "correct_count": 0,
                    "incorrect_count": 0,
                    "last_seen_at": created_at,
                },
            )
            stats["evidence_count"] += 1
            stats["last_seen_at"] = max(str(stats.get("last_seen_at") or ""), created_at)
        for question in review.get("extracted_questions") or []:
            label = str(question.get("topic") or "Uncategorised")
            subject = str(question.get("subject") or review_subject)
            if not is_mvp_progress_subject(subject):
                continue
            key = topic_key(subject, label)
            stats = topic_stats.setdefault(
                key,
                {
                    "topic": label,
                    "subject": subject,
                    "evidence_count": 0,
                    "practice_count": 0,
                    "correct_count": 0,
                    "incorrect_count": 0,
                    "last_seen_at": created_at,
                },
            )
            stats["evidence_count"] += 1
            if question.get("is_correct") is True:
                stats["correct_count"] += 1
            elif question.get("is_correct") is False:
                stats["incorrect_count"] += 1
            elif question.get("score") is not None and question.get("max_score"):
                if int(question.get("score") or 0) >= int(question.get("max_score") or 1):
                    stats["correct_count"] += 1
                else:
                    stats["incorrect_count"] += 1

    for attempt in attempts:
        attempt_subject = enum_text(attempt.get("subject") or ACTIVE_LEARNING_SUBJECT)
        if not is_mvp_progress_subject(attempt_subject):
            continue
        visible_practice_count += 1
        created_at = str(attempt.get("created_at") or "")
        total_count = max(int(attempt.get("total_count") or 0), 1)
        correct_count = int(attempt.get("correct_count") or 0)
        trend_points.append(round(correct_count / total_count * 100))
        recent_activity.append(
            {
                "type": "practice_attempt",
                "title": str(attempt.get("subject") or "Practice"),
                "created_at": created_at,
                "score": round(correct_count / total_count * 100),
                "count": total_count,
            }
        )
        for topic_result in attempt.get("topic_results") or []:
            subject = str(topic_result.get("subject") or attempt_subject)
            if not is_mvp_progress_subject(subject):
                continue
            label = str(topic_result.get("topic") or "General practice")
            key = topic_key(subject, label)
            stats = topic_stats.setdefault(
                key,
                {
                    "topic": label,
                    "subject": subject,
                    "evidence_count": 0,
                    "practice_count": 0,
                    "correct_count": 0,
                    "incorrect_count": 0,
                    "last_seen_at": created_at,
                },
            )
            stats["practice_count"] += int(topic_result.get("attempted") or 0)
            stats["correct_count"] += int(topic_result.get("correct") or 0)
            stats["incorrect_count"] += int(topic_result.get("incorrect") or 0)
            stats["last_seen_at"] = max(str(stats.get("last_seen_at") or ""), created_at)

    summaries: list[LearningTopicSummary] = []
    for stats in topic_stats.values():
        assessed = int(stats["correct_count"]) + int(stats["incorrect_count"])
        if assessed:
            mastery = round(int(stats["correct_count"]) / assessed * 100)
        else:
            mastery = 58 if int(stats["evidence_count"]) else 50
        trend = "improving" if mastery >= 75 else "needs_attention" if mastery < 60 else "steady"
        summaries.append(
            LearningTopicSummary(
                topic=str(stats["topic"]),
                subject=str(stats["subject"]),
                evidence_count=int(stats["evidence_count"]),
                practice_count=int(stats["practice_count"]),
                correct_count=int(stats["correct_count"]),
                incorrect_count=int(stats["incorrect_count"]),
                mastery=mastery,
                trend=trend,
                last_seen_at=str(stats.get("last_seen_at") or "") or None,
            )
        )

    summaries.sort(key=lambda item: (item.mastery, -item.evidence_count, item.topic))
    weak_topics = summaries[:3]
    improved_topics = sorted(
        [item for item in summaries if item.trend == "improving"],
        key=lambda item: item.mastery,
        reverse=True,
    )[:3]
    subject_buckets: dict[str, dict[str, Any]] = {}
    for item in summaries:
        bucket = subject_buckets.setdefault(
            item.subject,
            {
                "subject": item.subject,
                "evidence_count": 0,
                "practice_count": 0,
                "correct_count": 0,
                "incorrect_count": 0,
                "mastery_total": 0,
                "topic_count": 0,
                "last_seen_at": "",
            },
        )
        bucket["evidence_count"] += item.evidence_count
        bucket["practice_count"] += item.practice_count
        bucket["correct_count"] += item.correct_count
        bucket["incorrect_count"] += item.incorrect_count
        bucket["mastery_total"] += item.mastery
        bucket["topic_count"] += 1
        if item.last_seen_at:
            bucket["last_seen_at"] = max(str(bucket.get("last_seen_at") or ""), item.last_seen_at)
    subject_scores = [
        SubjectProgressSummary(
            subject=str(bucket["subject"]),
            evidence_count=int(bucket["evidence_count"]),
            practice_count=int(bucket["practice_count"]),
            correct_count=int(bucket["correct_count"]),
            incorrect_count=int(bucket["incorrect_count"]),
            mastery=round(int(bucket["mastery_total"]) / max(int(bucket["topic_count"]), 1)),
            last_seen_at=str(bucket.get("last_seen_at") or "") or None,
        )
        for bucket in subject_buckets.values()
    ]
    subject_scores.sort(key=lambda item: (item.mastery, item.subject))
    overall_mastery = round(sum(item.mastery for item in summaries) / len(summaries)) if summaries else 0
    if not trend_points and overall_mastery:
        trend_points = [max(0, overall_mastery - 12), max(0, overall_mastery - 5), overall_mastery]
    recent_activity.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)

    return LearningProgressResponse(
        child=ChildProfile.model_validate(child_data),
        report_month=month,
        document_count=visible_document_count,
        practice_count=visible_practice_count,
        overall_mastery=overall_mastery,
        trend_points=trend_points[-8:],
        weak_topics=weak_topics,
        improved_topics=improved_topics,
        all_topics=summaries,
        subject_scores=subject_scores,
        recent_activity=recent_activity[:8],
    )


def first_mistake_tag(tags: Any, fallback: str = "concept") -> str:
    if isinstance(tags, list) and tags:
        return str(tags[0])
    if isinstance(tags, str) and tags:
        return tags
    return fallback


def mistake_recommendation(topic: str, mistake_tag: str) -> str:
    labels = {
        "calculation": "先做一步反向檢查，再完成同類短題。",
        "careless": "圈出關鍵數字與單位，提交前用 30 秒覆核。",
        "concept": "重溫核心概念，再做 3 題由淺入深練習。",
        "reading": "先用自己的話重述題目要求，再列式。",
        "unit_conversion": "把單位換算表寫在草稿位，再代入計算。",
    }
    return f"{topic}：{labels.get(mistake_tag, labels['concept'])}"


def build_mistake_notebook(parent_id: str, child_id: str) -> MistakeNotebookResponse:
    progress = build_learning_progress(parent_id, child_id)
    mastery_by_topic = {
        topic_key(item.subject, item.topic): item.mastery
        for item in progress.all_topics
    }
    items: list[MistakeNotebookItem] = []

    for document in persistence.list_documents(parent_id, child_id):
        review = document.get("review") or {}
        review_subject = enum_text(review.get("subject") or ACTIVE_LEARNING_SUBJECT)
        if not is_mvp_progress_subject(review_subject):
            continue
        created_at = str(document.get("created_at") or "")
        for index, question in enumerate(review.get("extracted_questions") or [], start=1):
            subject = str(question.get("subject") or review_subject)
            topic = str(question.get("topic") or "Uncategorised")
            if not is_mvp_progress_subject(subject):
                continue
            confidence = question.get("confidence")
            score = question.get("score")
            max_score = question.get("max_score")
            tags = question.get("mistake_tags") or []
            if question.get("is_correct") is True:
                continue
            low_score = score is not None and max_score and int(score or 0) < int(max_score or 1)
            if score is not None and max_score and int(score or 0) >= int(max_score or 1):
                continue
            if not (tags or low_score or question.get("is_correct") is False):
                continue
            mistake_tag = first_mistake_tag(tags, "calculation" if low_score else "concept")
            mastery = mastery_by_topic.get(topic_key(subject, topic), 0)
            items.append(
                MistakeNotebookItem(
                    id=f"ocr-{document.get('id')}-{index}",
                    child_id=child_id,
                    source_type="ocr_review",
                    source_id=str(document.get("id")),
                    subject=subject,
                    topic=topic,
                    mistake_tag=mistake_tag,
                    question_text=str(question.get("question_text") or ""),
                    submitted_answer=str(question.get("detected_answer") or ""),
                    expected_answer="",
                    confidence=float(confidence) if confidence is not None else None,
                    mastery=mastery,
                    last_seen_at=created_at,
                    recommendation=mistake_recommendation(topic, mistake_tag),
                )
            )

    for attempt in persistence.list_practice_attempts(parent_id, child_id):
        attempt_subject = enum_text(attempt.get("subject") or ACTIVE_LEARNING_SUBJECT)
        if not is_mvp_progress_subject(attempt_subject):
            continue
        created_at = str(attempt.get("created_at") or "")
        for index, answer in enumerate(attempt.get("answers") or [], start=1):
            is_correct = answer.get("is_correct")
            if is_correct is True:
                continue
            subject = str(answer.get("subject") or attempt_subject)
            topic = str(answer.get("topic") or "General practice")
            if not is_mvp_progress_subject(subject):
                continue
            mistake_tag = first_mistake_tag(answer.get("target_mistake"), "concept")
            mastery = mastery_by_topic.get(topic_key(subject, topic), 0)
            items.append(
                MistakeNotebookItem(
                    id=f"practice-{attempt.get('id')}-{index}",
                    child_id=child_id,
                    source_type="practice_attempt",
                    source_id=str(attempt.get("id")),
                    subject=subject,
                    topic=topic,
                    mistake_tag=mistake_tag,
                    question_text=str(answer.get("question_text") or ""),
                    submitted_answer=str(answer.get("submitted_answer") or ""),
                    expected_answer=str(answer.get("expected_answer") or ""),
                    mastery=mastery,
                    last_seen_at=created_at,
                    recommendation=mistake_recommendation(topic, mistake_tag),
                )
            )

    items.sort(key=lambda item: item.last_seen_at or "", reverse=True)
    return MistakeNotebookResponse(child=progress.child, items=items[:30])


def build_weekly_parent_briefing(parent_id: str, child_id: str) -> WeeklyParentBriefingResponse:
    progress = build_learning_progress(parent_id, child_id)
    notebook = build_mistake_notebook(parent_id, child_id)
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    weak_topics = progress.weak_topics[:3]
    improved_topics = progress.improved_topics[:2]
    wins = [
        f"{report_label(topic.topic)} 掌握度達 {topic.mastery}%"
        for topic in improved_topics
    ] or [
        f"已累積 {progress.document_count} 份學習證據",
        f"已保存 {progress.practice_count} 次練習紀錄",
    ]
    focus_areas = [
        f"{report_label(topic.topic)}：{topic.mastery}% 掌握度"
        for topic in weak_topics
    ] or ["繼續上載已批改功課，以建立第一批弱項基線"]
    next_actions = [
        item.recommendation
        for item in notebook.items[:3]
    ] or [
        "上載一份最近已批改功課",
        "完成一次 5 分鐘針對練習",
        "確認 OCR 待確認清單內的題目",
    ]
    headline = f"{progress.child.name} 本週整體掌握度 {progress.overall_mastery}%"
    summary = (
        f"本週已整理 {progress.document_count} 份上載和 {progress.practice_count} 次練習；"
        f"錯題簿目前有 {len(notebook.items)} 個需要跟進的項目。"
    )
    return WeeklyParentBriefingResponse(
        child=progress.child,
        report_month=progress.report_month,
        week_start=week_start.isoformat(),
        week_end=week_end.isoformat(),
        headline=headline,
        summary=summary,
        wins=wins[:3],
        focus_areas=focus_areas[:3],
        next_actions=next_actions[:4],
        generated_at=now_iso(),
    )


@app.get("/api/learning/progress", response_model=LearningProgressResponse)
def learning_progress(
    child_id: str = DEMO_CHILD_ID,
    report_month: str | None = None,
    parent_id: str = Depends(require_parent_id),
) -> LearningProgressResponse:
    return build_learning_progress(parent_id, child_id, report_month)


@app.get("/api/mistake-notebook", response_model=MistakeNotebookResponse)
def mistake_notebook(
    child_id: str = DEMO_CHILD_ID,
    parent_id: str = Depends(require_parent_id),
) -> MistakeNotebookResponse:
    return build_mistake_notebook(parent_id, child_id)


@app.get("/api/weekly-briefing", response_model=WeeklyParentBriefingResponse)
def weekly_parent_briefing(
    child_id: str = DEMO_CHILD_ID,
    parent_id: str = Depends(require_parent_id),
) -> WeeklyParentBriefingResponse:
    return build_weekly_parent_briefing(parent_id, child_id)


@app.post("/api/reports/share", response_model=TeacherLearningReportResponse)
def share_learning_report(
    payload: ShareLearningReportRequest,
    parent_id: str = Depends(require_parent_id),
) -> TeacherLearningReportResponse:
    require_privacy_consent(parent_id, "portfolio_export_consent", "learning report share")
    progress = build_learning_progress(parent_id, payload.child_id, payload.report_month)
    token = uuid.uuid4().hex
    share_id = f"share-{uuid.uuid4().hex[:10]}"
    share = ShareLearningReportRecord(
        id=share_id,
        parent_id=parent_id,
        child_id=payload.child_id,
        token=token,
        report_month=progress.report_month,
        teacher_name=payload.teacher_name,
        share_url=f"/teacher-report/{token}",
        include_upload_evidence=payload.include_upload_evidence and payload.scope == "summary_with_evidence",
        scope=payload.scope,
        created_at=now_iso(),
        expires_at=(datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days)).isoformat(),
    )
    persistence.save_shared_report(share.model_dump(mode="json"))
    persistence.record_audit_event(
        parent_id,
        "learning_report_shared",
        child_id=payload.child_id,
        details={"share_id": share.id, "report_month": share.report_month},
    )
    return TeacherLearningReportResponse(share=share, child=progress.child, progress=progress)


@app.get("/api/reports/share", response_model=list[ShareLearningReportRecord])
def list_learning_report_shares(
    child_id: str = DEMO_CHILD_ID,
    parent_id: str = Depends(require_parent_id),
) -> list[ShareLearningReportRecord]:
    shares = [
        ShareLearningReportRecord.model_validate(record)
        for record in persistence.list_shared_reports(parent_id, child_id)
    ]
    return shares[:20]


@app.delete("/api/reports/share/{share_id}", response_model=ShareLearningReportRecord)
def revoke_learning_report_share(
    share_id: str,
    parent_id: str = Depends(require_parent_id),
) -> ShareLearningReportRecord:
    share = persistence.revoke_shared_report(parent_id, share_id)
    if not share:
        raise HTTPException(status_code=404, detail="Shared report not found")
    persistence.record_audit_event(
        parent_id,
        "learning_report_share_revoked",
        child_id=str(share.get("child_id") or ""),
        details={"share_id": share_id},
    )
    return ShareLearningReportRecord.model_validate(share)


def assert_share_accessible(share: ShareLearningReportRecord) -> None:
    if share.revoked_at:
        raise HTTPException(status_code=410, detail="Shared report has been revoked")
    if share.expires_at:
        try:
            expires_at = datetime.fromisoformat(share.expires_at)
        except ValueError:
            expires_at = None
        if expires_at and expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Shared report has expired")


@app.get("/api/reports/share/{token}", response_model=TeacherLearningReportResponse)
def teacher_learning_report(token: str) -> TeacherLearningReportResponse:
    share_data = persistence.get_shared_report_by_token(token)
    if not share_data:
        raise HTTPException(status_code=404, detail="Shared report not found")
    share = ShareLearningReportRecord.model_validate(share_data)
    assert_share_accessible(share)
    progress = build_learning_progress(share.parent_id, share.child_id, share.report_month)
    return TeacherLearningReportResponse(share=share, child=progress.child, progress=progress)


REPORT_LABELS = {
    "Chinese Language": "中國語文",
    "Community facilities": "社區設施",
    "Early Childhood Mathematics": "幼兒數學",
    "English Language": "英國語文",
    "Expressing feelings": "情緒表達",
    "Fractions": "分數",
    "General Studies": "常識",
    "Inference": "閱讀推論",
    "Language": "語文",
    "Mathematics": "數學",
    "Number sense": "數感",
    "Patterns": "規律",
    "Reading comprehension": "閱讀理解",
    "Self and Society": "個人與群體",
    "Self-care routines": "自理常規",
    "Sentence grammar": "句子文法",
    "Story retelling": "故事重述",
    "Taking turns": "輪候與分享",
    "Two-step word problems": "兩步應用題",
    "Vocabulary in context": "語境詞彙",
}


def report_label(value: str) -> str:
    return REPORT_LABELS.get(value, value)


def render_teacher_report_html(report: TeacherLearningReportResponse) -> str:
    progress = report.progress
    weak_rows = "".join(
        f"<li><strong>{escape(report_label(topic.topic))}</strong><span>{escape(report_label(topic.subject))} · 掌握度 {topic.mastery}% · "
        f"證據 {topic.evidence_count} · 練習 {topic.practice_count}</span></li>"
        for topic in progress.weak_topics
    ) or "<li><strong>暫未有弱項主題</strong><span>需要更多 OCR 檢視或練習紀錄。</span></li>"
    improved_rows = "".join(
        f"<li><strong>{escape(report_label(topic.topic))}</strong><span>{escape(report_label(topic.subject))} · 掌握度 {topic.mastery}%</span></li>"
        for topic in progress.improved_topics
    ) or "<li><strong>歷史紀錄暫時不足</strong><span>重複練習後會顯示改善趨勢。</span></li>"
    trend_bars = "".join(
        f"<span style='height:{max(12, min(96, point))}%'></span>"
        for point in (progress.trend_points or [progress.overall_mastery])
    )
    teacher = escape(report.share.teacher_name or "老師")
    child_name = escape(report.child.name)
    evidence_scope = (
        "此連結包含學習摘要及家長允許的證據摘要，不提供原始上載檔案下載。"
        if report.share.include_upload_evidence
        else "此連結只包含學習摘要，不會公開原始上載檔案。"
    )
    expires_text = escape(report.share.expires_at[:10] if report.share.expires_at else "未設定")
    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{child_name} 學習報告</title>
  <style>
    :root {{ color-scheme: light; --blue:#003d9b; --green:#006e28; --bg:#f7f9fc; --line:#c3c6d6; --text:#191c1e; --muted:#434654; }}
    body {{ margin:0; background:var(--bg); color:var(--text); font-family:Inter, "Noto Sans TC", system-ui, sans-serif; }}
    main {{ max-width:720px; margin:0 auto; padding:20px 16px 32px; }}
    header, section {{ margin-bottom:14px; padding:16px; border:1px solid rgba(195,198,214,.72); border-radius:14px; background:#fff; box-shadow:0 4px 14px rgba(0,61,155,.08); }}
    span.label {{ color:var(--blue); font-size:12px; font-weight:800; }}
    h1, h2 {{ margin:.25rem 0; line-height:1.22; }}
    p {{ color:var(--muted); line-height:1.55; }}
    .metrics {{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }}
    .metric {{ padding:10px; border-radius:10px; background:#dae2ff; color:var(--blue); text-align:center; font-weight:800; }}
    .metric small {{ display:block; color:#434654; font-weight:600; }}
    .trend {{ display:flex; align-items:end; gap:8px; height:92px; padding:10px; border-radius:12px; background:#f2f4f7; }}
    .trend span {{ flex:1; border-radius:999px 999px 4px 4px; background:linear-gradient(180deg,var(--green),#0052cc); animation:draw .48s ease both; transform-origin:bottom; }}
    ul {{ display:grid; gap:8px; padding:0; list-style:none; }}
    li {{ display:flex; justify-content:space-between; gap:12px; padding:10px; border-radius:10px; background:#f7f9fc; }}
    li strong, li span {{ display:block; }}
    li span {{ color:var(--muted); font-size:12px; }}
    @keyframes draw {{ from {{ transform:scaleY(.08); }} to {{ transform:scaleY(1); }} }}
  </style>
</head>
<body>
  <main>
    <header>
      <span class="label">EduPass AI · 教師檢視</span>
      <h1>{child_name} · {escape(progress.report_month)} 學習報告</h1>
      <p>分享對象：{teacher}。{escape(evidence_scope)} 有效期至：{expires_text}。</p>
    </header>
    <section class="metrics">
      <div class="metric">{progress.overall_mastery}%<small>掌握度</small></div>
      <div class="metric">{progress.document_count}<small>上載</small></div>
      <div class="metric">{progress.practice_count}<small>練習</small></div>
    </section>
    <section><h2>進度曲線</h2><div class="trend">{trend_bars}</div></section>
    <section><h2>主要弱項</h2><ul>{weak_rows}</ul></section>
    <section><h2>已改善主題</h2><ul>{improved_rows}</ul></section>
  </main>
</body>
</html>"""


@app.get("/teacher-report/{token}", response_class=HTMLResponse)
def teacher_learning_report_page(token: str) -> HTMLResponse:
    report = teacher_learning_report(token)
    return HTMLResponse(render_teacher_report_html(report))


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
