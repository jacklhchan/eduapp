from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app


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

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    profile = me.json()["parent"]
    assert profile["onboarding_complete"] is True
    assert profile["children"][0]["grade"] == "P3"

    login_client = TestClient(app)
    login = login_client.post("/api/auth/login", json={"email": email, "pin": "135790"})
    assert login.status_code == 200
    assert login.json()["parent"]["id"] == parent["id"]
