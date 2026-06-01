# Next Phase Implementation Notes

最後更新：2026-06-01 14:59 HKT

## 已落地範圍

- 前端 mock data 已移到 `src/data/seed.ts`。
- Profile tab 變成可編輯的 child profile onboarding 表單。
- Upload tab 支援本機 image / PDF 檔案選擇與 preview 狀態。
- Portfolio tab 加入 export prototype，可產生可下載的 HTML 草稿，之後可接 HTML-to-PDF。
- Backend 已從 schema spike 推進到 FastAPI prototype：
  - `/api/health`
  - `/api/ocr-review`
  - `/api/generate-quiz`
- GCP backend 已部署到 Cloud Run：`https://edupass-ai-594335170533.asia-east2.run.app/`
- OCR / LLM provider 已改用 GCP：
  - Google Cloud Vision：image OCR evidence extraction
  - Vertex AI Gemini：PDF OCR extraction、multimodal OCR review、quiz generation
  - OCR review 採 hybrid pipeline：先抽 raw OCR text，再用 Gemini multimodal 同時看原始 upload + OCR text；multimodal 失敗時 fallback 到 text-only review。
- 已加入 iPhone 友善的 web app manifest / icon / mobile metadata。
- 已加入 demo auth：
  - `POST /api/auth/login`
  - `POST /api/auth/signup`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
  - `PATCH /api/parent`
  - signed `edupass_session` cookie
- 已加入 first-login onboarding，可建立 parent display name 與第一個 child profile。
- 已加入 parent consent / privacy foundation：
  - `GET /api/privacy`
  - `PATCH /api/privacy/consent`
  - `GET /api/audit-log`
  - `DELETE /api/children/{child_id}`
  - OCR review / quiz generation / Portfolio PDF export 會檢查對應 consent flag。
  - Profile `Data & Privacy` sheet 依 Stitch Data Privacy Center screen `c1523b2bbe15450f9473922e40e7e3e8` 接線。
- 已加入 Firestore / Cloud Storage persistence：
  - parent / children records
  - uploaded OCR documents
  - generated Portfolio PDF export records
- 已加入 per-child default ordering，登入後預設 Matthew。
- 已加入 `POST /api/children`，Profile `Add Child` 可建立 child record；Profile edit 使用 `PATCH /api/children/{child_id}`。
- 已補齊主要 prototype button actions：
  - Home start practice / recent upload expand
  - Upload fullscreen preview / mistake delete / reason select
  - Coach analyzing animation / generated daily practice / completion screen
  - Profile edit child / add child / settings sheets
  - stable five-tab bottom navigation across all tabs
- Portfolio export 已從 HTML draft 改成 server-side PDF：
  - `POST /api/portfolio/export`
  - `GET /api/portfolio/exports/{export_id}/download`
  - PDF 使用打包的 Noto Sans TC 字型，Cloud Run 也可正確渲染繁中。
- 已新增 tests：
  - Pydantic schema coercion
  - AI provider JSON output validator
  - Hybrid OCR prompt / output parser validator
  - Practice plan question allocation validator
  - PDF export smoke / text extraction

## API 接線方向

前端已開始由 auth / persistence API 取代純 frontend state：

- `POST /api/auth/login`
- `POST /api/auth/signup`
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

## 仍需注意

- 目前 auth 是 prototype demo PIN，不是正式 Firebase Auth / Identity Platform。
- Cloud Run service 仍是 `--allow-unauthenticated`，真正保護在 app-level cookie；production 要再加正式身份與 consent flow。
- Upload 已可送到 GCP hybrid OCR endpoint，但仍需要真實功課相片 QA，尤其是手寫、陰影、旋轉、中文題目。
- PDF 目前是 server-side generated layout，不是完整學校 submission template；下一階段可加封面圖、作品相片與家長確認欄位。
