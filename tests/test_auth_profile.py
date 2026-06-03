from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.auth import SESSION_COOKIE, sign_session
from app.main import app
from app.persistence import DEMO_PARENT_ID, persistence


def test_signup_login_and_first_child_onboarding(monkeypatch) -> None:
    monkeypatch.setenv("EDUPASS_STORAGE_BACKEND", "memory")
    client = TestClient(app)
    email = f"parent-{uuid.uuid4().hex[:8]}@example.com"

    signup = client.post(
        "/api/auth/signup",
        json={"email": email, "pin": "135790", "display_name": "Ms Chan"},
    )
    assert signup.status_code == 200
    parent = signup.json()["parent"]
    assert parent["email"] == email
    assert parent["onboarding_complete"] is False
    assert parent["children"] == []

    updated_parent = client.patch("/api/parent", json={"display_name": "Chan Family"})
    assert updated_parent.status_code == 200
    assert updated_parent.json()["display_name"] == "Chan Family"

    child = client.post(
        "/api/children",
        json={
            "name": "Avery",
            "grade": "P3",
            "passport": "Learning Passport",
            "focus": "小學數學",
            "language": "繁中 / English",
            "school_type": "香港主流小學",
        },
    )
    assert child.status_code == 200
    assert child.json()["name"] == "Avery"
    child_id = child.json()["id"]

    blank_child = client.post("/api/children", json={"name": "Jackson", "grade": "P3"})
    assert blank_child.status_code == 200
    assert blank_child.json()["name"] == "Jackson"
    assert blank_child.json()["passport"] == ""
    assert blank_child.json()["focus"] == ""
    assert blank_child.json()["language"] == ""
    assert blank_child.json()["school_type"] == ""
    assert blank_child.json()["portfolio_sections"] == []

    passport_update = client.patch(
        f"/api/children/{child_id}",
        json={
            "passport": "SPCC Interview Portfolio",
            "focus": "升小 Portfolio + 自理能力",
            "portfolio_sections": [
                {
                    "id": "about",
                    "status": "Completed",
                    "body": "Avery enjoys explaining ideas and sharing family routines.",
                    "evidence": ["家長觀察", "活動相片"],
                    "updated_at": "1 Jun",
                }
            ],
        },
    )
    assert passport_update.status_code == 200
    assert passport_update.json()["passport"] == "SPCC Interview Portfolio"
    assert passport_update.json()["portfolio_sections"][0]["id"] == "about"

    blocked_update = client.patch(
        f"/api/children/{child_id}",
        json={"sort_order": 1, "name": "Should Not Patch Hidden Fields"},
    )
    assert blocked_update.status_code == 422

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    profile = me.json()["parent"]
    assert profile["onboarding_complete"] is True
    assert profile["children"][0]["grade"] == "P3"
    assert profile["children"][0]["focus"] == "升小 Portfolio + 自理能力"
    assert profile["children"][0]["portfolio_sections"][0]["body"].startswith("Avery enjoys")

    login_client = TestClient(app)
    login = login_client.post("/api/auth/login", json={"email": email, "pin": "135790"})
    assert login.status_code == 200
    assert login.json()["parent"]["id"] == parent["id"]


def test_demo_session_rehydrates_memory_parent(monkeypatch) -> None:
    monkeypatch.setenv("EDUPASS_STORAGE_BACKEND", "memory")
    persistence._memory["parents"].pop(DEMO_PARENT_ID, None)
    persistence._memory["children"] = {
        key: value for key, value in persistence._memory["children"].items() if value.get("parent_id") != DEMO_PARENT_ID
    }

    client = TestClient(app)
    client.cookies.set(SESSION_COOKIE, sign_session(DEMO_PARENT_ID))

    response = client.get("/api/auth/me")
    assert response.status_code == 200
    parent = response.json()["parent"]
    assert parent["id"] == DEMO_PARENT_ID
    assert parent["children"][0]["id"] == "child-matthew"
    assert parent["children"][0]["portfolio_sections"][0]["status"] == "Completed"
    assert parent["children"][1]["id"] == "child-chloe"
    assert parent["children"][1]["portfolio_sections"][0]["body"].startswith("Chloe")
    assert len(persistence.list_documents(DEMO_PARENT_ID, "child-matthew")) >= 4
    assert len(persistence.list_practice_attempts(DEMO_PARENT_ID, "child-matthew")) >= 4
    assert len(persistence.list_documents(DEMO_PARENT_ID, "child-chloe")) >= 3
    assert len(persistence.list_practice_attempts(DEMO_PARENT_ID, "child-chloe")) >= 3
