from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class Subject(str, Enum):
    applied_learning = "Applied Learning"
    arts_and_creativity = "Arts and Creativity"
    biology = "Biology"
    business_accounting_financial_studies = "Business, Accounting and Financial Studies"
    chemistry = "Chemistry"
    chinese_history = "Chinese History"
    chinese_language = "Chinese Language"
    chinese_literature = "Chinese Literature"
    citizenship_and_social_development = "Citizenship and Social Development"
    citizenship_economics_and_society = "Citizenship, Economics and Society"
    design_and_applied_technology = "Design and Applied Technology"
    early_childhood_mathematics = "Early Childhood Mathematics"
    economics = "Economics"
    english_language = "English Language"
    ethics_and_religious_studies = "Ethics and Religious Studies"
    general_studies = "General Studies"
    geography = "Geography"
    health_management_and_social_care = "Health Management and Social Care"
    history = "History"
    information_and_communication_technology = "Information and Communication Technology"
    language = "Language"
    literature_in_english = "Literature in English"
    mathematics = "Mathematics"
    music = "Music"
    nature_and_living = "Nature and Living"
    other_languages = "Other Languages"
    physical_education = "Physical Education"
    physical_fitness_and_health = "Physical Fitness and Health"
    physics = "Physics"
    primary_humanities = "Primary Humanities"
    primary_science = "Primary Science"
    putonghua = "Putonghua"
    religious_education = "Religious Education"
    science = "Science"
    self_and_society = "Self and Society"
    technology_and_living = "Technology and Living"
    technology_education = "Technology Education"
    tourism_and_hospitality_studies = "Tourism and Hospitality Studies"
    visual_arts = "Visual Arts"
    chinese = "Chinese"
    english = "English"


class MistakeType(str, Enum):
    concept = "concept"
    calculation = "calculation"
    reading = "reading"
    unit_conversion = "unit_conversion"
    careless = "careless"


def coerce_mistake_type(value: Any) -> MistakeType:
    if isinstance(value, MistakeType):
        return value
    raw = str(value).strip().lower()
    if raw in MistakeType._value2member_map_:
        return MistakeType(raw)

    concept_markers = ("concept", "概念", "分數", "大小", "比較")
    calculation_markers = ("calculation", "calculate", "計算", "運算", "加", "減", "乘", "除")
    reading_markers = ("reading", "理解", "題意", "文字", "讀")
    unit_markers = ("unit", "conversion", "單位", "換算", "厘米", "cm", "米")
    careless_markers = ("careless", "粗心", "抄錯", "漏", "忘記")

    if any(marker in raw for marker in unit_markers):
        return MistakeType.unit_conversion
    if any(marker in raw for marker in reading_markers):
        return MistakeType.reading
    if any(marker in raw for marker in careless_markers):
        return MistakeType.careless
    if any(marker in raw for marker in calculation_markers):
        return MistakeType.calculation
    if any(marker in raw for marker in concept_markers):
        return MistakeType.concept
    return MistakeType.concept


class CurriculumNode(BaseModel):
    id: str = Field(..., examples=["hk-p3-math-fractions-compare"])
    grade: str = Field(..., examples=["P3"])
    subject: Subject
    topic: str = Field(..., examples=["Fractions"])
    skill: str = Field(..., examples=["Compare fractions with same denominator"])
    source: str = Field(..., examples=["EDB curriculum mapping draft"])


class ChildProfile(BaseModel):
    id: str
    name: str
    avatar_url: str | None = None
    grade: str
    passport: str = "Learning Passport"
    focus: str = "小學數學 + 升小 Portfolio"
    language: str = "繁中 / English"
    school_type: str = "香港主流小學"


class ChildCreateRequest(BaseModel):
    name: str
    grade: str = "P1"
    passport: str = "Learning Passport"
    focus: str = "小學數學 + Portfolio"
    language: str = "繁中 / English"
    school_type: str = "香港主流小學"
    avatar_url: str | None = None


class PrivacySettings(BaseModel):
    ai_processing_consent: bool = False
    upload_storage_consent: bool = False
    portfolio_export_consent: bool = False
    product_updates_consent: bool = False
    retention_days: int = Field(default=365, ge=30, le=3650)
    consent_version: str = "prototype-2026-06-01"
    consent_updated_at: str | None = None


class PrivacyUpdateRequest(BaseModel):
    ai_processing_consent: bool | None = None
    upload_storage_consent: bool | None = None
    portfolio_export_consent: bool | None = None
    product_updates_consent: bool | None = None
    retention_days: int | None = Field(default=None, ge=30, le=3650)


class ChildDeleteRequest(BaseModel):
    confirmation_name: str
    delete_storage: bool = True


class ChildDataSummary(BaseModel):
    child_id: str
    child_name: str
    grade: str
    document_count: int = 0
    portfolio_export_count: int = 0


class AuditEvent(BaseModel):
    id: str
    parent_id: str
    event_type: str
    child_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class ParentUpdateRequest(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    onboarding_complete: bool | None = None


class ParentProfile(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: str | None = None
    onboarding_complete: bool = False
    privacy_settings: PrivacySettings = Field(default_factory=PrivacySettings)
    children: list[ChildProfile] = Field(default_factory=list)


class LoginRequest(BaseModel):
    email: str
    pin: str


class SignupRequest(BaseModel):
    email: str
    pin: str = Field(..., min_length=4, max_length=32)
    display_name: str


class AuthResponse(BaseModel):
    ok: bool = True
    parent: ParentProfile


class PrivacyCenterResponse(BaseModel):
    ok: bool = True
    parent: ParentProfile
    privacy_settings: PrivacySettings
    children: list[ChildDataSummary]
    audit_events: list[AuditEvent] = Field(default_factory=list)


class ChildDeleteResponse(BaseModel):
    ok: bool = True
    parent: ParentProfile
    deleted_child_id: str
    deleted_documents: int = 0
    deleted_portfolio_exports: int = 0
    deleted_storage_objects: int = 0


class ExtractedQuestion(BaseModel):
    id: str
    question_text: str
    detected_answer: str | None = None
    score: int | None = Field(default=None, ge=0)
    max_score: int | None = Field(default=None, ge=1)
    confidence: float = Field(..., ge=0, le=1)
    curriculum_node_id: str | None = None
    mistake_tags: list[MistakeType] = Field(default_factory=list)

    @field_validator("mistake_tags", mode="before")
    @classmethod
    def normalize_mistake_tags(cls, value: Any) -> list[MistakeType]:
        if value is None:
            return []
        if isinstance(value, str):
            value = [value]
        return [coerce_mistake_type(item) for item in value]


class OcrReviewResult(BaseModel):
    document_id: str
    child_profile_id: str
    file_kind: Literal["image", "pdf"]
    subject: Subject
    grade: str
    extracted_questions: list[ExtractedQuestion]
    requires_parent_confirmation: bool = True
    pii_redacted_before_ai: bool = True


class DocumentRecord(BaseModel):
    id: str
    parent_id: str
    child_id: str
    filename: str
    mime_type: str
    file_kind: Literal["image", "pdf"]
    storage_uri: str | None = None
    ocr_text_preview: str = ""
    review: OcrReviewResult
    created_at: str


class GeneratedQuizItem(BaseModel):
    id: str
    grade: str
    subject: Subject
    topic: str
    skill: str
    difficulty: int = Field(..., ge=1, le=5)
    question_text: str
    answer: str
    marking_scheme: str
    explanation: str
    target_mistake: MistakeType
    estimated_time_seconds: int = Field(..., ge=30, le=600)
    generated_from_curriculum_node_id: str
    copied_from_uploaded_question: bool = False

    @field_validator("target_mistake", mode="before")
    @classmethod
    def normalize_target_mistake(cls, value: Any) -> MistakeType:
        return coerce_mistake_type(value)


class GeneratedQuiz(BaseModel):
    child_profile_id: str
    source_document_ids: list[str] = Field(default_factory=list)
    items: list[GeneratedQuizItem]
    parent_visible_rationale: str


class PortfolioSection(BaseModel):
    title: str
    status: str
    body: str


class PortfolioExportRequest(BaseModel):
    child_id: str = "child-matthew"
    sections: list[PortfolioSection] = Field(default_factory=list)


class PortfolioExportRecord(BaseModel):
    id: str
    parent_id: str
    child_id: str
    filename: str
    storage_uri: str | None = None
    download_url: str
    created_at: str
