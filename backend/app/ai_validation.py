from __future__ import annotations

import json
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError


ModelT = TypeVar("ModelT", bound=BaseModel)


class AIOutputValidationError(ValueError):
    pass


def extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").strip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end >= start:
        cleaned = cleaned[start : end + 1]

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AIOutputValidationError(f"AI output is not valid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise AIOutputValidationError("AI output JSON must be an object")
    return data


def validate_ai_json(text: str, model: type[ModelT]) -> ModelT:
    data = extract_json_object(text)
    try:
        return model.model_validate(data)
    except ValidationError as exc:
        raise AIOutputValidationError(str(exc)) from exc
