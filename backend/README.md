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
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/children`
- `POST /api/children`
- `PATCH /api/children/{child_id}`
- `POST /api/ocr-review`
- `POST /api/generate-quiz`
- `POST /api/portfolio/export`
- `GET /api/portfolio/exports/{export_id}/download`

GCP provider：

- Google Cloud Vision：image OCR
- Vertex AI Gemini `gemini-3.5-flash`：PDF OCR extraction、review generation、quiz generation
- Firestore：parent / child / document / portfolio export records
- Cloud Storage：uploaded homework and generated PDF files

已加入：

- signed cookie demo auth
- per-child persistence
- AI provider output validator
- Pydantic schema tests
- server-side PDF export with bundled Noto Sans TC font
