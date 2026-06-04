from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.persistence import persistence


def test_practice_attempt_updates_progress_and_share_report(monkeypatch) -> None:
    monkeypatch.setenv("EDUPASS_STORAGE_BACKEND", "memory")
    client = TestClient(app)
    email = f"report-{uuid.uuid4().hex[:8]}@example.com"

    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "pin": "246810", "display_name": "Report Parent"},
    )
    assert signup.status_code == 200
    parent_id = signup.json()["parent"]["id"]

    child = client.post("/api/children", json={"name": "Avery", "grade": "P3"})
    assert child.status_code == 200
    child_id = child.json()["id"]

    consent = client.patch(
        "/api/privacy/consent",
        json={
            "ai_processing_consent": True,
            "upload_storage_consent": True,
            "portfolio_export_consent": True,
        },
    )
    assert consent.status_code == 200

    persistence.save_document(
        {
            "id": "doc-learning-report",
            "parent_id": parent_id,
            "child_id": child_id,
            "filename": "fractions-quiz.pdf",
            "created_at": "2026-06-01T08:00:00+00:00",
            "review": {
                "subject": "Mathematics",
                "topics": [{"topic": "Fractions", "subject": "Mathematics", "confidence": 0.9}],
                "extracted_questions": [
                    {"topic": "Fractions", "score": 0, "max_score": 1},
                    {"topic": "Time", "score": 1, "max_score": 1},
                ],
            },
        }
    )
    persistence.save_document(
        {
            "id": "doc-correct-arithmetic",
            "parent_id": parent_id,
            "child_id": child_id,
            "filename": "correct-p1-arithmetic.jpg",
            "created_at": "2026-06-02T08:00:00+00:00",
            "review": {
                "subject": "Mathematics",
                "topics": [{"topic": "Addition and Subtraction within 100", "subject": "Mathematics", "confidence": 0.95}],
                "extracted_questions": [
                    {
                        "topic": "Addition and Subtraction within 100",
                        "question_text": "可樂和檸檬茶共要多少元？（可樂: 10元, 檸檬茶: 20元）",
                        "detected_answer": "10 + 20 = 30 可樂和檸檬茶共要30元",
                        "is_correct": True,
                        "score": 1,
                        "max_score": 1,
                        "mistake_tags": ["concept"],
                    }
                ],
            },
        }
    )

    attempt = client.post(
        "/api/practice-attempts",
        json={
            "child_id": child_id,
            "grade": "P3",
            "subject": "Mathematics",
            "answers": [
                {
                    "question_id": "q1",
                    "topic": "Fractions",
                    "subject": "Mathematics",
                    "submitted_answer": "1/2",
                    "expected_answer": "1/2",
                    "is_correct": True,
                    "target_mistake": "concept",
                },
                {
                    "question_id": "q2",
                    "topic": "Fractions",
                    "subject": "Mathematics",
                    "submitted_answer": "wrong",
                    "expected_answer": "3/4",
                    "is_correct": False,
                    "target_mistake": "calculation",
                },
            ],
        },
    )
    assert attempt.status_code == 200
    assert attempt.json()["total_count"] == 2
    assert attempt.json()["correct_count"] == 1

    progress = client.get(f"/api/learning/progress?child_id={child_id}")
    assert progress.status_code == 200
    body = progress.json()
    assert body["document_count"] == 2
    assert body["practice_count"] == 1
    assert body["weak_topics"][0]["topic"] == "Fractions"
    assert body["trend_points"] == [50]

    shared = client.post(
        "/api/reports/share",
        json={"child_id": child_id, "teacher_name": "Ms Chan", "expires_in_days": 7},
    )
    assert shared.status_code == 200
    share_id = shared.json()["share"]["id"]
    token = shared.json()["share"]["token"]
    assert shared.json()["share"]["share_url"] == f"/teacher-report/{token}"
    assert shared.json()["share"]["scope"] == "summary_only"

    public_report = client.get(f"/api/reports/share/{token}")
    assert public_report.status_code == 200
    assert public_report.json()["child"]["name"] == "Avery"
    assert public_report.json()["progress"]["weak_topics"][0]["topic"] == "Fractions"

    teacher_page = client.get(f"/teacher-report/{token}")
    assert teacher_page.status_code == 200
    assert "Avery" in teacher_page.text
    assert "分數" in teacher_page.text

    shares = client.get(f"/api/reports/share?child_id={child_id}")
    assert shares.status_code == 200
    assert shares.json()[0]["id"] == share_id
    assert shares.json()[0]["revoked_at"] is None

    revoked = client.delete(f"/api/reports/share/{share_id}")
    assert revoked.status_code == 200
    assert revoked.json()["revoked_at"]

    revoked_public_report = client.get(f"/api/reports/share/{token}")
    assert revoked_public_report.status_code == 410

    notebook = client.get(f"/api/mistake-notebook?child_id={child_id}")
    assert notebook.status_code == 200
    assert notebook.json()["items"]
    assert notebook.json()["items"][0]["topic"] == "Fractions"
    assert "Addition and Subtraction within 100" not in {item["topic"] for item in notebook.json()["items"]}

    briefing = client.get(f"/api/weekly-briefing?child_id={child_id}")
    assert briefing.status_code == 200
    assert "Avery" in briefing.json()["headline"]
    assert briefing.json()["next_actions"]


def test_mvp_progress_hides_non_math_and_excludes_non_academic(monkeypatch) -> None:
    monkeypatch.setenv("EDUPASS_STORAGE_BACKEND", "memory")
    client = TestClient(app)
    email = f"roadmap-{uuid.uuid4().hex[:8]}@example.com"

    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "pin": "246810", "display_name": "Roadmap Parent"},
    )
    assert signup.status_code == 200
    parent_id = signup.json()["parent"]["id"]
    child = client.post("/api/children", json={"name": "Avery", "grade": "P3"})
    assert child.status_code == 200
    child_id = child.json()["id"]
    consent = client.patch("/api/privacy/consent", json={"ai_processing_consent": True})
    assert consent.status_code == 200
    uploaded_png = b"\x89PNG\r\n\x1a\nedupass-test-image"
    storage_uri = persistence.upload_bytes(
        f"parents/{parent_id}/children/{child_id}/documents/doc-mvp-math-inbox-page-1-math-homework.png",
        uploaded_png,
        "image/png",
    )

    persistence.save_document(
        {
            "id": "doc-mvp-math-inbox",
            "parent_id": parent_id,
            "child_id": child_id,
            "filename": "math-homework.pdf",
            "filenames": ["math-homework.png"],
            "mime_type": "image/png",
            "mime_types": ["image/png"],
            "file_kind": "image",
            "page_count": 1,
            "storage_uri": storage_uri,
            "storage_uris": [storage_uri],
            "created_at": "2026-06-01T08:00:00+00:00",
            "review": {
                "subject": "Mathematics",
                "requires_parent_confirmation": True,
                "topics": [{"topic": "Fractions", "subject": "Mathematics", "confidence": 0.9}],
                "extracted_questions": [{"topic": "Fractions", "score": 0, "max_score": 1}],
            },
        }
    )
    persistence.save_document(
        {
            "id": "doc-roadmap-chinese-inbox",
            "parent_id": parent_id,
            "child_id": child_id,
            "filename": "chinese-reading.pdf",
            "created_at": "2026-06-01T09:00:00+00:00",
            "review": {
                "subject": "Chinese Language",
                "requires_parent_confirmation": True,
                "topics": [{"topic": "Reading", "subject": "Chinese Language", "confidence": 0.9}],
                "extracted_questions": [{"topic": "Reading", "score": 0, "max_score": 1}],
            },
        }
    )

    chinese_attempt = client.post(
        "/api/practice-attempts",
        json={
            "child_id": child_id,
            "grade": "P3",
            "subject": "Chinese Language",
            "answers": [
                {
                    "question_id": "q1",
                    "topic": "Reading",
                    "subject": "Chinese Language",
                    "submitted_answer": "中心思想",
                    "expected_answer": "中心思想",
                    "is_correct": True,
                }
            ],
        },
    )
    assert chinese_attempt.status_code == 200
    assert chinese_attempt.json()["correct_count"] == 1

    blocked = client.post(
        "/api/practice-attempts",
        json={
            "child_id": child_id,
            "grade": "P3",
            "subject": "Visual Arts",
            "answers": [{"question_id": "q1", "topic": "Drawing", "subject": "Visual Arts"}],
        },
    )
    assert blocked.status_code == 400
    assert "Only academic subject scores" in blocked.json()["detail"]

    progress = client.get(f"/api/learning/progress?child_id={child_id}")
    assert progress.status_code == 200
    subject_scores = {item["subject"]: item for item in progress.json()["subject_scores"]}
    assert "Chinese Language" not in subject_scores
    assert "Visual Arts" not in subject_scores
    assert [topic["subject"] for topic in progress.json()["all_topics"]] == ["Mathematics"]

    inbox = client.get(f"/api/ocr-review/inbox?child_id={child_id}")
    assert inbox.status_code == 200
    assert [item["filename"] for item in inbox.json()] == ["math-homework.pdf"]
    preview = inbox.json()[0]["file_previews"][0]
    assert preview["filename"] == "math-homework.png"
    assert preview["mime_type"] == "image/png"
    assert preview["file_kind"] == "image"
    assert preview["preview_url"] == "/api/ocr-review/doc-mvp-math-inbox/files/1"

    original_file = client.get(preview["preview_url"])
    assert original_file.status_code == 200
    assert original_file.headers["content-type"] == "image/png"
    assert original_file.content == uploaded_png

    deleted = client.delete("/api/ocr-review/doc-mvp-math-inbox")
    assert deleted.status_code == 200
    assert deleted.json()["deleted_document_id"] == "doc-mvp-math-inbox"
    assert deleted.json()["deleted_storage_objects"] == 1

    inbox_after_delete = client.get(f"/api/ocr-review/inbox?child_id={child_id}&include_confirmed=true")
    assert inbox_after_delete.status_code == 200
    assert inbox_after_delete.json() == []

    deleted_file = client.get(preview["preview_url"])
    assert deleted_file.status_code == 404

    missing_delete = client.delete("/api/ocr-review/doc-mvp-math-inbox")
    assert missing_delete.status_code == 404

    audit = client.get("/api/audit-log")
    assert audit.status_code == 200
    assert any(event["event_type"] == "ocr_review_deleted" for event in audit.json())
