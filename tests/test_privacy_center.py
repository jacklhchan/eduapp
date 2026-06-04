from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.persistence import persistence


def test_privacy_consent_and_child_data_delete(monkeypatch) -> None:
    monkeypatch.setenv("EDUPASS_STORAGE_BACKEND", "memory")
    client = TestClient(app)
    email = f"privacy-{uuid.uuid4().hex[:8]}@example.com"

    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "pin": "246810", "display_name": "Privacy Parent"},
    )
    assert signup.status_code == 200

    child_one = client.post(
        "/api/children",
        json={"name": "Avery", "grade": "P3", "focus": "小學數學"},
    )
    assert child_one.status_code == 200
    child_one_id = child_one.json()["id"]

    child_two = client.post(
        "/api/children",
        json={"name": "Blake", "grade": "K2", "focus": "Portfolio"},
    )
    assert child_two.status_code == 200

    blocked_quiz = client.post(
        "/api/generate-quiz",
        json={"child_profile_id": child_one_id, "grade": "P3", "subject": "Mathematics"},
    )
    assert blocked_quiz.status_code == 403

    blocked_export = client.post("/api/portfolio/export", json={"child_id": child_one_id})
    assert blocked_export.status_code == 403

    persistence.save_document(
        {
            "id": "doc-privacy-test",
            "parent_id": signup.json()["parent"]["id"],
            "child_id": child_one_id,
            "storage_uri": None,
        }
    )
    persistence.save_portfolio_export(
        {
            "id": "export-privacy-test",
            "parent_id": signup.json()["parent"]["id"],
            "child_id": child_one_id,
            "storage_uri": None,
        }
    )

    consent = client.patch(
        "/api/privacy/consent",
        json={
            "ai_processing_consent": True,
            "upload_storage_consent": True,
            "portfolio_export_consent": True,
            "retention_days": 180,
        },
    )
    assert consent.status_code == 200
    privacy = consent.json()["privacy_settings"]
    assert privacy["ai_processing_consent"] is True
    assert privacy["retention_days"] == 180

    center = client.get("/api/privacy")
    assert center.status_code == 200
    avery_summary = next(item for item in center.json()["children"] if item["child_id"] == child_one_id)
    assert avery_summary["document_count"] == 1
    assert avery_summary["portfolio_export_count"] == 1

    wrong_name = client.request(
        "DELETE",
        f"/api/children/{child_one_id}",
        json={"confirmation_name": "Not Avery"},
    )
    assert wrong_name.status_code == 400

    deleted = client.request(
        "DELETE",
        f"/api/children/{child_one_id}",
        json={"confirmation_name": "Avery"},
    )
    assert deleted.status_code == 200
    assert deleted.json()["deleted_documents"] == 1
    assert deleted.json()["deleted_portfolio_exports"] == 1
    assert [child["name"] for child in deleted.json()["parent"]["children"]] == ["Blake"]

    audit = client.get("/api/audit-log")
    assert audit.status_code == 200
    event_types = {event["event_type"] for event in audit.json()}
    assert {"privacy_settings_updated", "child_data_deleted"}.issubset(event_types)


def test_delete_only_child_is_blocked(monkeypatch) -> None:
    monkeypatch.setenv("EDUPASS_STORAGE_BACKEND", "memory")
    client = TestClient(app)
    email = f"only-child-{uuid.uuid4().hex[:8]}@example.com"

    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "pin": "246810", "display_name": "Only Child Parent"},
    )
    assert signup.status_code == 200
    child = client.post("/api/children", json={"name": "Solo", "grade": "P1"})
    assert child.status_code == 200

    blocked = client.request(
        "DELETE",
        f"/api/children/{child.json()['id']}",
        json={"confirmation_name": "Solo"},
    )
    assert blocked.status_code == 409
