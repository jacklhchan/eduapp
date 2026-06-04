# EduPass Refactor Plan

最後更新：2026-06-04 HKT

## Scope and Guardrails

本輪 refactor 的目標是降低 prototype 技術債，同時保持現有產品行為、API contract、route path、auth/session 行為與主要 UI/UX 不變。所有拆分以搬移現有程式碼為優先，不在同一個 diff 內混入重新設計或業務邏輯改寫。

Hard guardrails:

- Frontend route/view ids 保持 `home`、`portfolio`、`upload`、`coach`、`profile`。
- Backend `/api/...` path、response shape、cookie 名稱 `edupass_session` 與登入/session 行為保持不變。
- Stitch screen map 仍是 missing/unclear UI source of truth，不在 refactor 中重新設計畫面。
- 現有 backend tests 保留；每個 phase 至少跑 `npm run build` 和 `python -m pytest tests -q`。
- 新增 frontend tests 後，`npm test` 必須可在 CI/local headless 環境執行。

## Completed in This Refactor

- Frontend API access moved to `src/api/client.ts` and `src/api/endpoints.ts`; direct `fetch` calls in `App.tsx` were replaced without changing endpoint paths or payload contracts.
- Shared frontend config/copy/types moved to `src/config/`, `src/i18n/`, `src/types/`, and learning display helpers moved to `src/domain/learningDisplay.ts`.
- Vitest + React Testing Library were added with API, config, copy, App smoke, shared component, view, and hook tests.
- Top-level views now live under `src/components/views/`; shared UI primitives and profile sheet pieces live under `src/components/shared/`.
- `src/App.tsx` now focuses on app wiring and cross-view flows; it was reduced from the original monolith to about 1400 lines.
- `useToast` and `useLearningWorkspace` now own toast lifecycle and learning workspace refresh/share state.
- `src/styles.css` now imports split CSS files under `src/styles/`, preserving selector names and cascade order.
- Backend account/privacy/children routes moved to `backend/app/routers/account.py`; OCR prompt/parse helpers moved to `backend/app/services/ocr_review.py`.
- Validation after the refactor: `npm run build`, `npm test`, and `.venv312/bin/python -m pytest tests -q` pass.

## Current Entry Points

Frontend:

- `src/main.tsx`：React root entry，載入 `App` 與全域 `src/styles.css`。
- `src/App.tsx`：目前是 app wiring layer，保留 session、upload/OCR、portfolio export、practice flow 與 view selection glue。
- `src/styles.css`：全域 CSS entry；實際樣式按原 cascade 拆到 `src/styles/` 子檔。
- `src/data/curriculum.ts`：HKEDB curriculum catalogue types、stage/subject data 與 grade/subject helper。
- `src/data/courseContent.ts`：course topic seeds、syllabus workspace id 與 fallback topic generation helper。
- `src/data/seed.ts`：舊 prototype seed types/data；目前主要 app 已改以 backend parent/child/session data 為主，這個檔案可在後續另行確認是否仍被引用。

Backend:

- `backend/app/main.py`：FastAPI app creation、CORS/static serving、health/curriculum/OCR/practice/learning/report/portfolio routes、AI provider calls、local quiz fallback、learning aggregation 與 teacher report HTML。
- `backend/app/routers/account.py`：auth、parent、privacy、audit log、children routes，以及 `require_privacy_consent` helper。
- `backend/app/services/ocr_review.py`：OCR review prompt builder、AI JSON parsing and marking normalization helper。
- `backend/app/schemas.py`：Pydantic request/response/domain schema source of truth。
- `backend/app/auth.py`：signed session cookie、PIN hash/verify、`require_parent_id` dependency。
- `backend/app/persistence.py`：memory/Firestore/Cloud Storage persistence abstraction、demo parent/child/document seed、audit/document/practice/export/share CRUD。
- `backend/app/ai_validation.py`：AI JSON extraction/validation helpers。
- `backend/app/pdf_export.py`：server-side portfolio PDF generation。
- `backend/app/curriculum_catalog.py`：backend curriculum catalogue and `/api/curriculum/catalog` data source.

Tests:

- `tests/conftest.py` adds `backend/` to `sys.path`.
- Backend coverage currently includes auth/profile onboarding, privacy consent/delete, upload hardening, AI validation, practice plan helpers, learning report/share/revoke, curriculum catalogue, and PDF export.

## Major Frontend State Groups in App.tsx

Auth/session:

- `authState`, `authMode`, `parent`, `loginEmail`, `loginPin`, `signupDisplayName`, `authError`.
- Session load uses `GET /api/auth/me`; login/signup/logout call `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`.

Current child/profile:

- `selectedChildId`, derived `currentChild`, profile sheet state, parent/child update handlers, add/delete child, onboarding completion.
- Child preference uses `preferredChildId(parent)` and keeps demo-first ordering assumptions.

UI language:

- `uiLanguage`, `uiLanguageStorageKey`, `uiCopy`, `navItems`, `uiLanguageOptions`, document `lang`, localStorage persistence and language toast.

Upload/OCR review:

- `selectedFiles`, `uploadPreviewItems`, `activePreviewIndex`, `ocrState`, `ocrResult`, `reviewConfirmState`, `ocrDeleteId`, `lightboxSrc`.
- Handles upload previews, OCR review creation, inbox opening, parent confirmation, deletion, confirmed history and original file preview URLs.

Practice:

- `practiceState`, `practiceQuiz`, `practiceError`, `lastPracticeOptions`.
- Keeps consent gate before quiz generation and saves practice attempts after completion.

Learning progress workspace:

- `learningProgress`, `progressState`, `ocrInbox`, `ocrInboxState`, `mistakeNotebook`, `weeklyBriefing`, `shareReport`, `shareReports`, `shareState`.
- `refreshP0Workspace` fans out OCR inbox, mistake notebook, weekly briefing, and teacher share links.

Portfolio:

- `exportState`, `exportError`, `portfolioDrafts`, `portfolioSaveTimers`.
- Derives `currentPortfolioSections`, autosaves section updates to child profile, and exports server-side PDF.

Shared UI:

- `toast`, `inputRef`, bottom nav active state and modal/lightbox state.

## Current API Calls in App.tsx

Auth/profile:

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `PATCH /api/parent`
- `POST /api/children`
- `PATCH /api/children/{child_id}`
- `DELETE /api/children/{child_id}`

Privacy:

- `GET /api/privacy`
- `PATCH /api/privacy/consent`

OCR review:

- `POST /api/ocr-review`
- `GET /api/ocr-review/inbox?child_id=...&include_confirmed=true`
- `GET /api/ocr-review/{document_id}/files/{page_number}` is consumed through preview URLs from backend records.
- `PATCH /api/ocr-review/{document_id}/confirm`
- `DELETE /api/ocr-review/{document_id}`

Practice/progress:

- `POST /api/generate-quiz`
- `POST /api/practice-attempts`
- `GET /api/learning/progress?child_id=...`
- `GET /api/mistake-notebook?child_id=...`
- `GET /api/weekly-briefing?child_id=...`

Reports/portfolio:

- `POST /api/reports/share`
- `GET /api/reports/share?child_id=...`
- `DELETE /api/reports/share/{share_id}`
- `POST /api/portfolio/export`
- `GET /api/portfolio/exports/{export_id}/download` via returned `download_url`.

## Current Screens and Top-Level Components

Top-level views already live inside `App.tsx`:

- `LoadingView`
- `LoginView`
- `OnboardingView`
- `HomeView`
- `PortfolioView`
- `UploadView`
- `CoachView`
- `ProfileView`

Headers/app shell:

- `MainHeader`
- `UploadHeader`
- `SettingsHeader`
- `BottomNav`

Shared/low-state components:

- `Icon`
- `RecentThumb`
- `StatusChip`
- `FormDisplay`
- `MistakeCard`
- `WeeklyBriefingPanel`
- `BriefingColumn`
- `OcrReviewInboxPanel`
- `MistakeNotebookPanel`
- `AcademicSubjectProgressPanel`
- `LearningReportPanel`
- `TopicReportRow`
- `PracticeAnalyzingView`
- `DailyPracticeView`
- `PracticeCompleteView`
- `CurriculumMapSection`
- `CourseContentSection`
- `QuestionStepper`
- `Metric`
- `CurriculumSubjectCard`
- `Mastery`
- `HistoryCard`
- `ChildCard`
- `PreviewLightbox`
- `ProfileSheetModal`
- `ParentProfileForm`
- `ChildProfileForm`
- `LanguageSettingsPanel`
- `SettingPanel`
- `PrivacyCenterPanel`
- `ConsentSwitch`

## Backend Route Groups to Split Later

Proposed router boundaries, preserving every path:

- `routers/auth.py`: `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/auth/me`, plus session cookie helper.
- `routers/children.py`: `/api/parent`, `/api/children`, `/api/children/{child_id}`.
- `routers/privacy.py`: `/api/privacy`, `/api/privacy/consent`, `/api/audit-log`.
- `routers/ocr_review.py`: `/api/ocr-review`, inbox, file preview, confirm, delete.
- `routers/practice.py`: `/api/generate-quiz`, `/api/practice-attempts`.
- `routers/learning.py`: `/api/learning/progress`, `/api/mistake-notebook`, `/api/weekly-briefing`.
- `routers/reports.py`: `/api/reports/share`, `/api/reports/share/{share_id}`, `/api/reports/share/{token}`, `/teacher-report/{token}`.
- `routers/portfolio.py`: `/api/portfolio/export`, `/api/portfolio/exports/{export_id}/download`.

Prompt/service boundaries:

- `prompts/ocr_review.py`: `build_ocr_review_prompt`.
- `prompts/quiz_generation.py`: quiz generation prompt construction.
- `services/ocr_review_service.py`: upload validation, OCR extraction, review generation, file previews, confirm/delete.
- `services/practice_service.py`: quiz generation, local fallback, practice plan normalization, answer sanitization.
- `services/learning_service.py`: progress aggregation, mistake notebook and weekly briefing.
- `services/report_service.py`: teacher share report records, public report response, HTML rendering.
- `services/portfolio_service.py`: portfolio export creation/download helpers.

## Phase Notes

Phase 1 should start with the safest frontend extractions:

- Move domain/API/UI types from `App.tsx` to `src/types/index.ts`.
- Move `uiCopy`, `navItems`, `uiLanguageOptions`, language storage key and simple language helpers to `src/i18n/uiCopy.ts`.
- Move `images` to `src/config/assets.ts`.
- Introduce `src/api/client.ts` and `src/api/endpoints.ts`, then replace direct `fetch` calls without changing endpoint paths or payloads.

Phase 2 should add Vitest + React Testing Library and test the newly isolated API/i18n/assets modules before splitting component state.

Phase 3-5 should avoid business logic rewrites. Extract shared components first, then views, then hooks/providers only after prop boundaries are visible.

Phase 6 should keep `styles.css` importing split CSS while migrating component styles gradually; no Tailwind/styled-components migration.

Phase 7 should move backend routes/services in small groups and keep the existing tests as the contract harness.
