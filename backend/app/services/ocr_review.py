from __future__ import annotations

import re
import uuid
from typing import Any

from ..ai_validation import extract_json_object
from ..curriculum_catalog import subject_names_for_grade
from ..schemas import OcrReviewResult

ACTIVE_LEARNING_SUBJECT = "Mathematics"

def build_ocr_review_prompt(
    extracted_text: str,
    child_profile_id: str,
    grade: str,
    file_kind: str,
    page_count_hint: int = 1,
) -> str:
    allowed_subjects = subject_names_for_grade(grade) or ["Mathematics"]
    active_subjects = [ACTIVE_LEARNING_SUBJECT] if ACTIVE_LEARNING_SUBJECT in allowed_subjects else allowed_subjects
    return f"""
You are a multimodal OCR review assistant for a Hong Kong parent-led learning app.
Return JSON only. Align subject and topic labels with the HKEDB curriculum catalogue.

Schema:
{{
  "document_id": "string",
  "child_profile_id": "string",
  "file_kind": "image|pdf|mixed",
  "subject": "Mathematics",
  "grade": "P3",
  "page_count": 2,
  "topics": [
    {{
      "id": "t1",
      "subject": "Mathematics",
      "topic": "Fractions",
      "strand": "Number",
      "curriculum_node_id": "hk-p3-math-fractions-compare",
      "confidence": 0.75,
      "page_numbers": [1, 2]
    }}
  ],
  "extracted_questions": [
    {{
      "id": "q1",
      "question_text": "string",
      "detected_answer": "string or null",
      "is_correct": true,
      "score": 1,
      "max_score": 1,
      "confidence": 0.75,
      "page_number": 1,
      "topic": "Fractions",
      "topic_ids": ["t1"],
      "curriculum_node_id": "hk-p3-math-fractions-compare",
      "mistake_tags": []
    }}
  ],
  "requires_parent_confirmation": true,
  "pii_redacted_before_ai": false
}}

Rules:
- The active MVP review subject is Mathematics. Other subjects are roadmap catalogue context only.
- Subject must be one of these active subjects for grade "{grade}": {active_subjects}.
- Use grade "{grade}".
- The upload may contain multiple pages or multiple uploaded page images. The current upload has at least {page_count_hint} uploaded page/file part(s); for PDFs, count physical pages when visible.
- Do not invent student personal data.
- If you can see the original upload, use the visual layout to separate printed questions, student answers, marks, teacher corrections, diagrams, and tables.
- Use the OCR text below as evidence, but if it conflicts with the visible upload, prefer the visual evidence and set confidence lower.
- If handwriting, blur, rotation, cropping, or teacher markings make the result uncertain, set requires_parent_confirmation true.
- Detect every distinct topic / strand covered by the homework or test. Do not collapse the review into one topic when multiple topics are visible.
- Link each extracted question to its page_number and topic_ids. page_number starts at 1 and follows the order shown in the upload or OCR page markers.
- mistake_tags must only contain these enum values: concept, calculation, reading, unit_conversion, careless.
- If the student's answer is correct, set is_correct true, set score equal to max_score when marks are visible, and return mistake_tags as an empty list.
- Only return a mistake tag when there is visible evidence that the submitted answer, working, unit, or reasoning is wrong.
- If the text is sparse, create at most 3 review items from plausible math signals and set confidence below 0.65.

child_profile_id: {child_profile_id}
file_kind: {file_kind}
extracted_text:
{extracted_text[:5000]}
"""


def parse_ocr_review_response(
    response_text: str,
    child_profile_id: str,
    file_kind: str,
    page_count_hint: int = 1,
) -> OcrReviewResult:
    data = extract_json_object(response_text or "{}")
    data["document_id"] = data.get("document_id") or f"doc-{uuid.uuid4().hex[:10]}"
    data["child_profile_id"] = child_profile_id
    data["file_kind"] = file_kind
    try:
        page_count = int(data.get("page_count") or page_count_hint)
    except (TypeError, ValueError):
        page_count = page_count_hint
    data["page_count"] = max(1, page_count, page_count_hint)
    if isinstance(data.get("topics"), list):
        normalized_topics = []
        for index, topic in enumerate(data["topics"], start=1):
            if isinstance(topic, str):
                topic = {"topic": topic}
            if isinstance(topic, dict):
                topic["id"] = topic.get("id") or f"t{index}"
                topic["subject"] = topic.get("subject") or data.get("subject") or "Mathematics"
                topic["confidence"] = topic.get("confidence") if topic.get("confidence") is not None else 0.5
                normalized_topics.append(topic)
        data["topics"] = normalized_topics
    if isinstance(data.get("extracted_questions"), list):
        data["extracted_questions"] = [
            normalize_extracted_question_marking(question)
            if isinstance(question, dict)
            else question
            for question in data["extracted_questions"]
        ]
    data["requires_parent_confirmation"] = True
    data["pii_redacted_before_ai"] = False
    return OcrReviewResult.model_validate(data)


def normalize_extracted_question_marking(question: dict[str, Any]) -> dict[str, Any]:
    clean = dict(question)
    is_correct = clean.get("is_correct")
    score = clean.get("score")
    max_score = clean.get("max_score")

    if answer_looks_correct(str(clean.get("question_text") or ""), str(clean.get("detected_answer") or "")):
        is_correct = True
    elif score is not None and max_score:
        try:
            is_correct = int(score) >= int(max_score)
        except (TypeError, ValueError):
            pass

    if is_correct is True:
        clean["is_correct"] = True
        clean["mistake_tags"] = []
        if clean.get("max_score") is None:
            clean["max_score"] = 1
        if clean.get("score") is None:
            clean["score"] = clean["max_score"]
    elif is_correct is False:
        clean["is_correct"] = False
        if not clean.get("mistake_tags"):
            clean["mistake_tags"] = ["concept"]
    return clean


def answer_looks_correct(question_text: str, detected_answer: str) -> bool:
    expected = infer_expected_arithmetic_answer(question_text)
    if expected is None:
        return False
    return detected_answer_contains_value(detected_answer, expected)


def infer_expected_arithmetic_answer(question_text: str) -> int | None:
    text = str(question_text or "")
    numbers = [int(value) for value in re.findall(r"\d+", text)]
    if len(numbers) < 2:
        return None
    operands = numbers[-2:]
    add_markers = ("共", "一共", "合共", "總共", "共有", "共要", "共售", "共需", "加起")
    subtract_markers = ("比", "貴", "便宜", "多多少", "少多少", "相差", "差多少")
    if any(marker in text for marker in subtract_markers):
        return abs(operands[1] - operands[0])
    if any(marker in text for marker in add_markers):
        return operands[0] + operands[1]
    return None


def detected_answer_contains_value(detected_answer: str, expected: int) -> bool:
    text = str(detected_answer or "")
    if not text.strip():
        return False
    for left, op, right, result in re.findall(r"(\d+)\s*([+\-＋－])\s*(\d+)\s*=?\s*(\d+)", text):
        left_value = int(left)
        right_value = int(right)
        result_value = int(result)
        calculated = left_value + right_value if op in {"+", "＋"} else left_value - right_value
        if calculated == expected and result_value == expected:
            return True
    return any(int(value) == expected for value in re.findall(r"\d+", text))
