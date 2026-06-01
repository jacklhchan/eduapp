# AI Learning Passport Prototype

香港家長手機優先的教育 app prototype，聚焦兩個 MVP 模組：

- 幼稚園／升小 `Portfolio Builder`
- 小學數學 `AI Learning Coach`

## Local Run

```bash
npm install
npm run dev
```

預設本機網址：`http://127.0.0.1:5173/`

## Cloud Prototype

已部署到 Google Cloud Run：

`https://edupass-ai-594335170533.asia-east2.run.app/`

Backend 使用：

- Google Cloud Vision：image OCR
- Vertex AI Gemini `gemini-3.5-flash`：PDF text extraction / OCR review / quiz generation
- Firestore：demo parent / per-child profile / OCR document / Portfolio export records
- Cloud Storage：uploaded homework files and generated Portfolio PDFs
- Cloud Run：FastAPI backend + React static frontend

Demo login：

- Email：`parent@example.com`
- PIN：`246810`

UI alignment：

- Google Stitch project：`EduPass AI`
- Source screens：Dashboard、Portfolio、Refined Recognition、Math Coach、Profile & Settings、animated practice screens、HKEDB 課程地圖 (`d1423b25c1f5425d80c697265ecacb27`)
- React prototype now follows Stitch-generated HTML structure, Material Symbols, image assets, spacing tokens, top app bars, and bottom navigation patterns.
- The active prototype now wires core buttons for child switching, upload review, practice generation, profile editing, child creation, settings sheets, and stable five-tab navigation.

### iPhone Test

1. 在 iPhone Safari 開啟 Cloud URL。
2. 按 Share。
3. 選 Add to Home Screen。
4. 名稱可用 `EduPass AI`。

## Project Files

- `docs/app-blueprint.md`：產品與技術設計 Markdown
- `docs/hkedb-k12-syllabus-reference.md`：HKEDB K1-S6 全科 curriculum / syllabus reference
- `docs/syllabus/`：按年級及科目拆分的 syllabus Markdown reference，含 EDB-derived 課程內容摘要與 evidence mapping
- `docs/next-phase-implementation.md`：下一階段 prototype 接線筆記
- `STATUS.md`：目前實作狀態、驗證與下一步
- `src/`：React + Vite prototype
- `src/data/seed.ts`：前端 seed fixture 與資料型別
- `src/data/curriculum.ts`：前端 HKEDB curriculum catalogue 與 child-grade learning map helpers
- `backend/app/main.py`：FastAPI app、GCP OCR / Gemini endpoints、frontend static serving
- `backend/app/curriculum_catalog.py`：後端 HKEDB curriculum catalogue 與 API source-of-truth
- `backend/app/auth.py`：signed session cookie auth
- `backend/app/persistence.py`：Firestore / Cloud Storage persistence adapter
- `backend/app/pdf_export.py`：server-side Portfolio PDF export
- `backend/app/schemas.py`：Pydantic schema
- `backend/app/ai_validation.py`：AI JSON extraction and output validation helpers
- `tests/`：Pydantic schema / AI output validator / PDF export tests
