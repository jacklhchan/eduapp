# Backend Prototype

這個資料夾保存 FastAPI / Python backend。它已部署到 Google Cloud Run，並由同一個 service serve React static frontend。

Cloud service：

- URL：`https://edupass-ai-594335170533.asia-east2.run.app/`
- Service：`edupass-ai`
- Project：`gen-lang-client-0228668877`
- Region：`asia-east2`

目前 endpoints：

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/parent`
- `GET /api/privacy`
- `PATCH /api/privacy/consent`
- `GET /api/audit-log`
- `GET /api/children`
- `POST /api/children`
- `PATCH /api/children/{child_id}`
- `DELETE /api/children/{child_id}`
- `POST /api/ocr-review`
- `POST /api/generate-quiz`
- `POST /api/portfolio/export`
- `GET /api/portfolio/exports/{export_id}/download`

GCP provider：

- Google Cloud Vision：image OCR evidence extraction
- Vertex AI Gemini `gemini-3.5-flash`：PDF OCR extraction、multimodal OCR review、quiz generation
- Firestore：parent / child / document / portfolio export records
- Cloud Storage：uploaded homework and generated PDF files

OCR review pipeline：

- image upload：Cloud Vision `document_text_detection` 先抽 raw text evidence。
- PDF upload：Gemini document extraction 先抽 text evidence。
- review：Gemini `gemini-3.5-flash` multimodal second pass 同時看原始檔案與 OCR text，並回傳 structured `OcrReviewResult`。
- schema：review result 保存 `page_count`、`topics`、每題的 `page_number` / `topic_ids`，支援多頁或 mixed upload。
- fallback：multimodal review 失敗時自動改用 text-only Gemini review；API response / document record 會保存 `ocr_provider`、`review_mode`、`review_model`、`review_fallback_used`。
- override：`EDUPASS_OCR_REVIEW_MODE=text_only` 可強制使用 text-only review。

已加入：

- signed cookie demo auth
- prototype signup with hashed PIN storage
- first-login parent / child onboarding support
- parent consent, retention preference, audit log, and child data deletion foundation
- per-child persistence
- AI provider output validator
- Pydantic schema tests
- server-side PDF export with bundled Noto Sans TC font
