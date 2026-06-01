from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any

from fastapi import Cookie, HTTPException


SESSION_COOKIE = "edupass_session"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14
PIN_HASH_ITERATIONS = 120_000


def get_session_secret() -> str:
    return os.getenv("SESSION_SECRET") or "local-dev-edupass-session-secret"


def session_cookie_secure() -> bool:
    configured = os.getenv("SESSION_COOKIE_SECURE")
    if configured is not None:
        return configured.strip().lower() not in {"0", "false", "no"}
    return bool(os.getenv("K_SERVICE"))


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _unb64(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def sign_session(parent_id: str) -> str:
    payload: dict[str, Any] = {
        "parent_id": parent_id,
        "exp": int(time.time()) + SESSION_MAX_AGE_SECONDS,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_token = _b64(payload_bytes)
    signature = hmac.new(get_session_secret().encode("utf-8"), payload_token.encode("ascii"), hashlib.sha256)
    return f"{payload_token}.{_b64(signature.digest())}"


def verify_session(token: str | None) -> str:
    if not token or "." not in token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload_token, signature_token = token.split(".", 1)
    expected = hmac.new(get_session_secret().encode("utf-8"), payload_token.encode("ascii"), hashlib.sha256).digest()
    try:
        supplied = _unb64(signature_token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid session") from exc
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Invalid session")
    try:
        payload = json.loads(_unb64(payload_token).decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid session") from exc
    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=401, detail="Session expired")
    parent_id = str(payload.get("parent_id") or "")
    if not parent_id:
        raise HTTPException(status_code=401, detail="Invalid session")
    return parent_id


def require_parent_id(edupass_session: str | None = Cookie(default=None, alias=SESSION_COOKIE)) -> str:
    return verify_session(edupass_session)


def hash_pin(pin: str, salt: bytes | None = None) -> str:
    if salt is None:
        salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        pin.encode("utf-8"),
        salt,
        PIN_HASH_ITERATIONS,
    )
    return f"pbkdf2_sha256${PIN_HASH_ITERATIONS}${_b64(salt)}${_b64(digest)}"


def verify_pin(pin: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    try:
        algorithm, iterations, salt_token, digest_token = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = _unb64(salt_token)
        expected = _unb64(digest_token)
        supplied = hashlib.pbkdf2_hmac(
            "sha256",
            pin.encode("utf-8"),
            salt,
            int(iterations),
        )
    except Exception:
        return False
    return hmac.compare_digest(expected, supplied)
