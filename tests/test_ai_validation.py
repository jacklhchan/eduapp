from __future__ import annotations

import pytest

from app.main import build_ocr_review_prompt, parse_ocr_review_response, sanitize_generated_quiz, sanitize_math_text
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
            "options": ["1/5", "2/5", "3/5", "4/5"],
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
    assert quiz.items[0].options == ["1/5", "2/5", "3/5", "4/5"]


def test_sanitize_math_text_removes_latex_for_mobile_quiz() -> None:
    text = sanitize_math_text(r"小明吃了 $\frac{1}{4}$，且 $\triangle \times \square = 40$")
    assert text == "小明吃了 1/4，且 △ × □ = 40"
    assert "\\" not in text
    assert "$" not in text


def test_sanitize_generated_quiz_keeps_answer_in_plain_options() -> None:
    quiz = GeneratedQuiz.model_validate(
        {
            "child_profile_id": "child-matthew",
            "source_document_ids": [],
            "items": [{
                "id": "q1",
                "grade": "P3",
                "subject": "Mathematics",
                "topic": r"數學：代數",
                "skill": "symbols",
                "difficulty": 2,
                "question_text": r"如果 $\triangle + \triangle = 16$，$\square$ 是多少？",
                "options": [r"$\frac{1}{4}$", r"$\square$", "8", "16"],
                "answer": r"$\square$",
                "marking_scheme": r"不用寫 $\frac{1}{4}$。",
                "explanation": r"先求 $\triangle$。",
                "target_mistake": "concept",
                "estimated_time_seconds": 90,
                "generated_from_curriculum_node_id": "hk-p3-math-symbols",
                "copied_from_uploaded_question": False,
            }],
            "parent_visible_rationale": r"Generated from $\triangle$ symbols.",
        }
    )
    sanitized = sanitize_generated_quiz(quiz)
    item = sanitized.items[0]
    assert item.question_text == "如果 △ + △ = 16，□ 是多少？"
    assert item.answer == "□"
    assert item.answer in item.options
    assert all("\\" not in value and "$" not in value for value in [item.question_text, item.answer, *item.options])


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


def test_multimodal_ocr_prompt_uses_visual_and_ocr_evidence() -> None:
    prompt = build_ocr_review_prompt(
        extracted_text="1/2 + 1/4 = 2/6",
        child_profile_id="child-matthew",
        grade="P3",
        file_kind="image",
        page_count_hint=2,
    )
    assert "original upload" in prompt
    assert "OCR text" in prompt
    assert "multiple pages" in prompt
    assert "topics" in prompt
    assert "topic_ids" in prompt
    assert "requires_parent_confirmation true" in prompt
    assert "P3" in prompt


def test_parse_ocr_review_response_enforces_parent_confirmation() -> None:
    review = parse_ocr_review_response(
        """
        {
          "subject": "Mathematics",
          "grade": "P3",
          "extracted_questions": [{
            "id": "q1",
            "question_text": "1/2 + 1/4 = ?",
            "confidence": 0.61,
            "mistake_tags": ["concept"]
          }],
          "requires_parent_confirmation": false,
          "pii_redacted_before_ai": false
        }
        """,
        child_profile_id="child-matthew",
        file_kind="image",
    )
    assert review.child_profile_id == "child-matthew"
    assert review.file_kind == "image"
    assert review.requires_parent_confirmation is True
    assert review.pii_redacted_before_ai is True


def test_parse_ocr_review_response_accepts_multiple_pages_and_topics() -> None:
    review = parse_ocr_review_response(
        """
        {
          "subject": "Mathematics",
          "grade": "P3",
          "page_count": 2,
          "topics": [
            {
              "id": "fractions",
              "subject": "Mathematics",
              "topic": "Fractions",
              "strand": "Number",
              "confidence": 0.82,
              "page_numbers": [1]
            },
            {
              "id": "geometry",
              "subject": "Mathematics",
              "topic": "Geometry",
              "strand": "Shape and Space",
              "confidence": 0.76,
              "page_numbers": [2]
            }
          ],
          "extracted_questions": [
            {
              "id": "q1",
              "question_text": "Compare 1/2 and 3/4.",
              "confidence": 0.82,
              "page_number": 1,
              "topic": "Fractions",
              "topic_ids": ["fractions"],
              "mistake_tags": ["concept"]
            },
            {
              "id": "q2",
              "question_text": "Find the perimeter of the rectangle.",
              "confidence": 0.76,
              "page_number": 2,
              "topic": "Geometry",
              "topic_ids": ["geometry"],
              "mistake_tags": ["unit_conversion"]
            }
          ]
        }
        """,
        child_profile_id="child-matthew",
        file_kind="image",
        page_count_hint=2,
    )
    assert review.page_count == 2
    assert [topic.topic for topic in review.topics] == ["Fractions", "Geometry"]
    assert review.extracted_questions[1].page_number == 2
    assert review.extracted_questions[1].topic_ids == ["geometry"]
