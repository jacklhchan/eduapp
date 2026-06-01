from __future__ import annotations

import pytest

from app.ai_validation import AIOutputValidationError, extract_json_object, validate_ai_json
from app.schemas import GeneratedQuiz, MistakeType, OcrReviewResult


def test_extract_json_object_from_markdown_fence() -> None:
    data = extract_json_object('```json\n{"ok": true, "value": 3}\n```')
    assert data == {"ok": True, "value": 3}


def test_validate_generated_quiz_coerces_mistake_text() -> None:
    quiz = validate_ai_json(
        """
        {
          "child_profile_id": "child-matthew",
          "source_document_ids": [],
          "items": [{
            "id": "q1",
            "grade": "P3",
            "subject": "Mathematics",
            "topic": "Fractions",
            "skill": "Compare fractions with same denominator",
            "difficulty": 2,
            "question_text": "1/5 or 3/5, which is larger?",
            "answer": "3/5",
            "marking_scheme": "1 mark",
            "explanation": "Compare the numerator.",
            "target_mistake": "計算錯誤或運算錯誤",
            "estimated_time_seconds": 90,
            "generated_from_curriculum_node_id": "hk-p3-math-fractions-compare",
            "copied_from_uploaded_question": false
          }],
          "parent_visible_rationale": "Targets fraction comparison."
        }
        """,
        GeneratedQuiz,
    )
    assert quiz.items[0].target_mistake is MistakeType.calculation


def test_validate_ocr_review_normalizes_string_tags() -> None:
    review = OcrReviewResult.model_validate(
        {
            "document_id": "doc-test",
            "child_profile_id": "child-matthew",
            "file_kind": "image",
            "subject": "Mathematics",
            "grade": "P3",
            "extracted_questions": [
                {
                    "id": "q1",
                    "question_text": "Compare 2/7 and 5/7.",
                    "confidence": 0.72,
                    "mistake_tags": "看漏題意",
                }
            ],
        }
    )
    assert review.extracted_questions[0].mistake_tags == [MistakeType.reading]


def test_invalid_ai_json_raises_clear_error() -> None:
    with pytest.raises(AIOutputValidationError):
        extract_json_object("not-json")
