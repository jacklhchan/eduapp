from __future__ import annotations

from app.main import clamp_question_count, normalize_practice_plan


def test_clamp_question_count_defaults_and_limits() -> None:
    assert clamp_question_count(None) == 5
    assert clamp_question_count("0") == 1
    assert clamp_question_count("8") == 8
    assert clamp_question_count(99) == 20


def test_normalize_practice_plan_sanitizes_and_matches_requested_total() -> None:
    plan = normalize_practice_plan(
        [
            {
                "topic_id": "s3-math-number",
                "title": "Number",
                "title_zh": "數",
                "strand": "number",
                "question_count": 4,
            },
            {
                "topic_id": "s3-math-measure",
                "title": "Measure",
                "title_zh": "量度",
                "strand": "measure",
                "question_count": 3,
            },
            {"topic_id": "skip-empty", "question_count": 0},
        ],
        fallback_total=5,
    )

    assert [item["topic_id"] for item in plan] == ["s3-math-number", "s3-math-measure"]
    assert sum(item["question_count"] for item in plan) == 5
    assert plan[0]["question_count"] == 4
    assert plan[1]["question_count"] == 1
