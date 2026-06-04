from __future__ import annotations

from app.curriculum_catalog import get_curriculum_catalog, subjects_for_grade


def test_curriculum_catalog_covers_hk_school_stages() -> None:
    catalog = get_curriculum_catalog()
    stage_ids = {stage["id"] for stage in catalog["stages"]}
    assert {"kg", "p1-p6", "s1-s3", "s4-s6"}.issubset(stage_ids)
    assert catalog["school_year"] == "2025/26"


def test_primary_transition_subjects_are_recorded() -> None:
    p1_subjects = {subject["id"]: subject for subject in subjects_for_grade("P1")}
    p4_subjects = {subject["id"]: subject for subject in subjects_for_grade("P4")}
    assert "primary-science" in p1_subjects
    assert "primary-humanities" in p4_subjects
    assert "2025/26" in p1_subjects["primary-science"]["status"]


def test_secondary_subject_updates_are_recorded() -> None:
    s1_subjects = {subject["id"] for subject in subjects_for_grade("S1")}
    s4_subjects = {subject["id"] for subject in subjects_for_grade("S4")}
    assert "citizenship-economics-society" in s1_subjects
    assert "citizenship-social-development" in s4_subjects
    assert "applied-learning" in s4_subjects
    assert "other-languages" in s4_subjects


def test_grade_specific_catalog_excludes_other_year_subjects() -> None:
    s3_subjects = {subject["id"] for subject in subjects_for_grade("S3")}
    assert "citizenship-economics-society" in s3_subjects
    assert "science" in s3_subjects
    assert "citizenship-social-development" not in s3_subjects
    assert "applied-learning" not in s3_subjects
    assert "primary-science" not in s3_subjects
