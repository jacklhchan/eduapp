from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


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


class PortfolioDraftSection(BaseModel):
    id: str
    status: str
    body: str
    evidence: list[str] = Field(default_factory=list)
    updated_at: str | None = None


class ChildProfile(BaseModel):
    id: str
    name: str
    avatar_url: str | None = None
    grade: str
    passport: str = ""
    focus: str = ""
    language: str = ""
    school_type: str = ""
    portfolio_sections: list[PortfolioDraftSection] = Field(default_factory=list)


class ChildCreateRequest(BaseModel):
    name: str
    grade: str = "P1"
    passport: str = ""
    focus: str = ""
    language: str = ""
    school_type: str = ""
    avatar_url: str | None = None
    portfolio_sections: list[PortfolioDraftSection] = Field(default_factory=list)


class ChildUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=80)
    grade: str | None = Field(default=None, min_length=1, max_length=16)
    passport: str | None = Field(default=None, max_length=120)
    focus: str | None = Field(default=None, max_length=500)
    language: str | None = Field(default=None, max_length=120)
    school_type: str | None = Field(default=None, max_length=160)
    avatar_url: str | None = Field(default=None, max_length=1000)
    portfolio_sections: list[PortfolioDraftSection] | None = None

    @field_validator("name", "grade", "passport", "focus", "language", "school_type", "avatar_url")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()


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
    practice_count: int = 0
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
    is_correct: bool | None = None
    score: int | None = Field(default=None, ge=0)
    max_score: int | None = Field(default=None, ge=1)
    confidence: float = Field(..., ge=0, le=1)
    page_number: int | None = Field(default=None, ge=1)
    topic: str | None = None
    topic_ids: list[str] = Field(default_factory=list)
    curriculum_node_id: str | None = None
    mistake_tags: list[MistakeType] = Field(default_factory=list)

    @field_validator("topic_ids", mode="before")
    @classmethod
    def normalize_topic_ids(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    @field_validator("mistake_tags", mode="before")
    @classmethod
    def normalize_mistake_tags(cls, value: Any) -> list[MistakeType]:
        if value is None:
            return []
        if isinstance(value, str):
            value = [value]
        return [coerce_mistake_type(item) for item in value]


class DetectedTopic(BaseModel):
    id: str
    subject: Subject
    topic: str
    strand: str | None = None
    curriculum_node_id: str | None = None
    confidence: float = Field(..., ge=0, le=1)
    page_numbers: list[int] = Field(default_factory=list)

    @field_validator("page_numbers", mode="before")
    @classmethod
    def normalize_page_numbers(cls, value: Any) -> list[int]:
        if value is None:
            return []
        if isinstance(value, int | str):
            value = [value]
        if not isinstance(value, list):
            return []
        page_numbers: list[int] = []
        for item in value:
            try:
                page_number = int(item)
            except (TypeError, ValueError):
                continue
            if page_number > 0:
                page_numbers.append(page_number)
        return page_numbers


class OcrReviewResult(BaseModel):
    document_id: str
    child_profile_id: str
    file_kind: Literal["image", "pdf", "mixed"]
    subject: Subject
    grade: str
    page_count: int = Field(default=1, ge=1)
    topics: list[DetectedTopic] = Field(default_factory=list)
    extracted_questions: list[ExtractedQuestion]
    requires_parent_confirmation: bool = True
    pii_redacted_before_ai: bool = True

    @model_validator(mode="after")
    def populate_topics_from_questions(self) -> "OcrReviewResult":
        if self.topics:
            return self

        topics: dict[str, DetectedTopic] = {}
        for question in self.extracted_questions:
            label = (question.topic or question.curriculum_node_id or "").strip()
            if not label:
                continue
            topic_id = question.topic_ids[0] if question.topic_ids else f"t{len(topics) + 1}"
            topic = topics.get(topic_id)
            if topic is None:
                topic = DetectedTopic(
                    id=topic_id,
                    subject=self.subject,
                    topic=label,
                    curriculum_node_id=question.curriculum_node_id,
                    confidence=question.confidence,
                    page_numbers=[],
                )
                topics[topic_id] = topic
            topic.confidence = max(topic.confidence, question.confidence)
            if question.page_number and question.page_number not in topic.page_numbers:
                topic.page_numbers.append(question.page_number)

        self.topics = list(topics.values())
        return self


class DocumentRecord(BaseModel):
    id: str
    parent_id: str
    child_id: str
    filename: str
    filenames: list[str] = Field(default_factory=list)
    mime_type: str
    file_kind: Literal["image", "pdf", "mixed"]
    page_count: int = Field(default=1, ge=1)
    storage_uri: str | None = None
    storage_uris: list[str] = Field(default_factory=list)
    ocr_provider: str = "unknown"
    review_mode: str = "text_only_llm"
    review_model: str = "unknown"
    review_fallback_used: bool = False
    ocr_text_preview: str = ""
    review: OcrReviewResult
    parent_confirmed_at: str | None = None
    parent_corrections: list[dict[str, Any]] = Field(default_factory=list)
    created_at: str


class GeneratedQuizItem(BaseModel):
    id: str
    grade: str
    subject: Subject
    topic: str
    skill: str
    difficulty: int = Field(..., ge=1, le=5)
    question_text: str
    options: list[str] = Field(default_factory=list)
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


class PracticeAnswerSubmission(BaseModel):
    question_id: str
    topic: str
    subject: Subject = Subject.mathematics
    question_text: str = ""
    submitted_answer: str = ""
    expected_answer: str = ""
    target_mistake: MistakeType = MistakeType.concept
    is_correct: bool | None = None

    @field_validator("target_mistake", mode="before")
    @classmethod
    def normalize_mistake(cls, value: Any) -> MistakeType:
        return coerce_mistake_type(value)


class PracticeAttemptRequest(BaseModel):
    child_id: str = "child-matthew"
    grade: str = "P3"
    subject: Subject = Subject.mathematics
    source_document_ids: list[str] = Field(default_factory=list)
    answers: list[PracticeAnswerSubmission]


class PracticeTopicResult(BaseModel):
    topic: str
    subject: Subject
    attempted: int = 0
    correct: int = 0
    incorrect: int = 0
    mistake_tags: list[MistakeType] = Field(default_factory=list)


class PracticeAttemptRecord(BaseModel):
    id: str
    parent_id: str
    child_id: str
    grade: str
    subject: Subject
    source_document_ids: list[str] = Field(default_factory=list)
    total_count: int
    correct_count: int
    topic_results: list[PracticeTopicResult] = Field(default_factory=list)
    answers: list[PracticeAnswerSubmission] = Field(default_factory=list)
    created_at: str


class LearningTopicSummary(BaseModel):
    topic: str
    subject: str
    evidence_count: int = 0
    practice_count: int = 0
    correct_count: int = 0
    incorrect_count: int = 0
    mastery: int = Field(default=50, ge=0, le=100)
    trend: Literal["improving", "steady", "needs_attention"] = "steady"
    last_seen_at: str | None = None


class SubjectProgressSummary(BaseModel):
    subject: str
    evidence_count: int = 0
    practice_count: int = 0
    correct_count: int = 0
    incorrect_count: int = 0
    mastery: int = Field(default=0, ge=0, le=100)
    last_seen_at: str | None = None


class LearningProgressResponse(BaseModel):
    ok: bool = True
    child: ChildProfile
    report_month: str
    document_count: int = 0
    practice_count: int = 0
    overall_mastery: int = Field(default=0, ge=0, le=100)
    trend_points: list[int] = Field(default_factory=list)
    weak_topics: list[LearningTopicSummary] = Field(default_factory=list)
    improved_topics: list[LearningTopicSummary] = Field(default_factory=list)
    all_topics: list[LearningTopicSummary] = Field(default_factory=list)
    subject_scores: list[SubjectProgressSummary] = Field(default_factory=list)
    recent_activity: list[dict[str, Any]] = Field(default_factory=list)


class MistakeNotebookItem(BaseModel):
    id: str
    child_id: str
    source_type: Literal["ocr_review", "practice_attempt"]
    source_id: str
    subject: str
    topic: str
    mistake_tag: MistakeType
    question_text: str = ""
    submitted_answer: str = ""
    expected_answer: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)
    mastery: int = Field(default=0, ge=0, le=100)
    last_seen_at: str | None = None
    recommendation: str


class MistakeNotebookResponse(BaseModel):
    ok: bool = True
    child: ChildProfile
    items: list[MistakeNotebookItem] = Field(default_factory=list)


class WeeklyParentBriefingResponse(BaseModel):
    ok: bool = True
    child: ChildProfile
    report_month: str
    week_start: str
    week_end: str
    headline: str
    summary: str
    wins: list[str] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)
    generated_at: str


class ShareLearningReportRequest(BaseModel):
    child_id: str = "child-matthew"
    report_month: str | None = None
    teacher_name: str | None = None
    include_upload_evidence: bool = False
    expires_in_days: int = Field(default=30, ge=1, le=180)
    scope: Literal["summary_only", "summary_with_evidence"] = "summary_only"


class ShareLearningReportRecord(BaseModel):
    id: str
    parent_id: str
    child_id: str
    token: str
    report_month: str
    teacher_name: str | None = None
    share_url: str
    include_upload_evidence: bool = False
    scope: Literal["summary_only", "summary_with_evidence"] = "summary_only"
    created_at: str
    expires_at: str | None = None
    revoked_at: str | None = None
    revoked_by_parent_id: str | None = None


class TeacherLearningReportResponse(BaseModel):
    ok: bool = True
    share: ShareLearningReportRecord
    child: ChildProfile
    progress: LearningProgressResponse


class OcrReviewConfirmRequest(BaseModel):
    extracted_questions: list[ExtractedQuestion] = Field(default_factory=list)
    parent_notes: str | None = Field(default=None, max_length=1000)


class OcrReviewInboxItem(BaseModel):
    id: str
    filename: str
    created_at: str
    page_count: int = 1
    review_mode: str = "unknown"
    parent_confirmed_at: str | None = None
    review: dict[str, Any] = Field(default_factory=dict)


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
