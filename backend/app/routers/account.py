from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response

from ..auth import (
    SESSION_COOKIE,
    SESSION_MAX_AGE_SECONDS,
    hash_pin,
    require_parent_id,
    session_cookie_secure,
    sign_session,
    verify_pin,
)
from ..persistence import DEMO_PARENT_ID, persistence
from ..schemas import (
    AuthResponse,
    AuditEvent,
    ChildCreateRequest,
    ChildDataSummary,
    ChildDeleteRequest,
    ChildDeleteResponse,
    ChildProfile,
    ChildUpdateRequest,
    LoginRequest,
    ParentProfile,
    ParentUpdateRequest,
    PrivacyCenterResponse,
    PrivacySettings,
    PrivacyUpdateRequest,
    SignupRequest,
)

PRODUCTION_RUNTIME = bool(os.getenv("K_SERVICE")) or os.getenv("EDUPASS_ENV", "").strip().lower() == "production"
DEMO_PARENT_EMAIL = os.getenv("EDUPASS_DEMO_EMAIL", "parent@example.com").lower()
DEMO_PARENT_PIN = os.getenv("EDUPASS_DEMO_PIN", "246810")
DEMO_LOGIN_ENABLED = os.getenv("EDUPASS_ENABLE_DEMO_LOGIN", "1" if not PRODUCTION_RUNTIME else "0").lower() in {"1", "true", "yes"}

account_router = APIRouter()


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


@account_router.post("/api/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response) -> AuthResponse:
    email = payload.email.strip().lower()
    if DEMO_LOGIN_ENABLED and email == DEMO_PARENT_EMAIL and payload.pin == DEMO_PARENT_PIN:
        parent = persistence.ensure_demo_data(email)
        set_session_cookie(response, DEMO_PARENT_ID)
        return AuthResponse(parent=ParentProfile.model_validate(parent))

    parent = persistence.get_parent_by_email(email)
    if not parent or not verify_pin(payload.pin, parent.get("pin_hash")):
        raise HTTPException(status_code=401, detail="Invalid email or PIN")
    set_session_cookie(response, str(parent["id"]))
    return AuthResponse(parent=ParentProfile.model_validate(parent))


@account_router.post("/api/auth/signup", response_model=AuthResponse)
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


@account_router.post("/api/auth/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@account_router.get("/api/auth/me", response_model=AuthResponse)
def auth_me(parent_id: str = Depends(require_parent_id)) -> AuthResponse:
    parent = persistence.get_parent_with_children(parent_id)
    if not parent:
        if DEMO_LOGIN_ENABLED and parent_id == DEMO_PARENT_ID:
            parent = persistence.ensure_demo_data(DEMO_PARENT_EMAIL)
        else:
            raise HTTPException(status_code=404, detail="Parent profile not found")
    return AuthResponse(parent=ParentProfile.model_validate(parent))


@account_router.patch("/api/parent", response_model=ParentProfile)
def update_parent(payload: ParentUpdateRequest, parent_id: str = Depends(require_parent_id)) -> ParentProfile:
    parent = persistence.patch_parent(parent_id, payload.model_dump(mode="json", exclude_unset=True))
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return ParentProfile.model_validate(parent)


@account_router.get("/api/privacy", response_model=PrivacyCenterResponse)
def privacy_center(parent_id: str = Depends(require_parent_id)) -> PrivacyCenterResponse:
    return build_privacy_center_response(parent_id)


@account_router.patch("/api/privacy/consent", response_model=PrivacyCenterResponse)
def update_privacy_settings(
    payload: PrivacyUpdateRequest,
    parent_id: str = Depends(require_parent_id),
) -> PrivacyCenterResponse:
    parent = persistence.update_privacy_settings(parent_id, payload.model_dump(mode="json", exclude_unset=True))
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return build_privacy_center_response(parent_id)


@account_router.get("/api/audit-log", response_model=list[AuditEvent])
def audit_log(parent_id: str = Depends(require_parent_id)) -> list[AuditEvent]:
    return [AuditEvent.model_validate(item) for item in persistence.list_audit_events(parent_id)]


@account_router.get("/api/children")
def list_children(parent_id: str = Depends(require_parent_id)) -> dict[str, Any]:
    parent = persistence.get_parent_with_children(parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return {"ok": True, "children": parent.get("children", [])}


@account_router.post("/api/children", response_model=ChildProfile)
async def create_child(payload: ChildCreateRequest, parent_id: str = Depends(require_parent_id)) -> ChildProfile:
    child = persistence.create_child(parent_id, payload.model_dump(mode="json"))
    return ChildProfile.model_validate(child)


@account_router.patch("/api/children/{child_id}", response_model=ChildProfile)
async def update_child(child_id: str, payload: ChildUpdateRequest, parent_id: str = Depends(require_parent_id)) -> ChildProfile:
    child = persistence.patch_child(parent_id, child_id, payload.model_dump(mode="json", exclude_unset=True))
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return ChildProfile.model_validate(child)


@account_router.delete("/api/children/{child_id}", response_model=ChildDeleteResponse)
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
