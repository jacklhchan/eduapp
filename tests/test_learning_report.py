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
    assert body["document_count"] == 1
    assert body["practice_count"] == 1
    assert body["weak_topics"][0]["topic"] == "Fractions"
    assert body["trend_points"] == [50]

    shared = client.post(
        "/api/reports/share",
        json={"child_id": child_id, "teacher_name": "Ms Chan"},
    )
    assert shared.status_code == 200
    token = shared.json()["share"]["token"]
    assert shared.json()["share"]["share_url"] == f"/teacher-report/{token}"

    public_report = client.get(f"/api/reports/share/{token}")
    assert public_report.status_code == 200
    assert public_report.json()["child"]["name"] == "Avery"
    assert public_report.json()["progress"]["weak_topics"][0]["topic"] == "Fractions"

    teacher_page = client.get(f"/teacher-report/{token}")
    assert teacher_page.status_code == 200
    assert "Avery" in teacher_page.text
    assert "分數" in teacher_page.text


def test_academic_subject_tracking_includes_non_math_and_excludes_non_academic(monkeypatch) -> None:
    monkeypatch.setenv("EDUPASS_STORAGE_BACKEND", "memory")
    client = TestClient(app)
    email = f"roadmap-{uuid.uuid4().hex[:8]}@example.com"

    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "pin": "246810", "display_name": "Roadmap Parent"},
    )
    assert signup.status_code == 200
    child = client.post("/api/children", json={"name": "Avery", "grade": "P3"})
    assert child.status_code == 200
    consent = client.patch("/api/privacy/consent", json={"ai_processing_consent": True})
    assert consent.status_code == 200

    chinese_attempt = client.post(
        "/api/practice-attempts",
        json={
            "child_id": child.json()["id"],
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
            "child_id": child.json()["id"],
            "grade": "P3",
            "subject": "Visual Arts",
            "answers": [{"question_id": "q1", "topic": "Drawing", "subject": "Visual Arts"}],
        },
    )
    assert blocked.status_code == 400
    assert "Only academic subject scores" in blocked.json()["detail"]

    progress = client.get(f"/api/learning/progress?child_id={child.json()['id']}")
    assert progress.status_code == 200
    subject_scores = {item["subject"]: item for item in progress.json()["subject_scores"]}
    assert subject_scores["Chinese Language"]["mastery"] == 100
    assert "Visual Arts" not in subject_scores
