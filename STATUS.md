# Status

最後更新：2026-06-01 14:40 HKT

## 目前目標

建立 AI Learning Passport app prototype，先用 Stitch-aligned mobile UI 跑通，再部署到 GCP 供 iPhone 實機測試。這一階段重點是：auth / storage / per-child persistence、Pydantic + AI output validator tests、server-side Portfolio PDF export。

## Cloud

- iPhone / browser 測試入口：`https://edupass-ai-594335170533.asia-east2.run.app/`
- Cloud Run service：`edupass-ai`
- GCP project：`gen-lang-client-0228668877`
- Project number：`594335170533`
- Region：`asia-east2`
- Current revision：`edupass-ai-00012-r2g`
- Service account：`594335170533-compute@developer.gserviceaccount.com`
- Storage bucket：`gs://edupass-ai-594335170533-prototype-storage`
- Firestore database：`(default)` in `asia-east2`

## GitHub

- Repository：`https://github.com/jacklhchan/eduapp`
- Working branch：`codex/edupass-prototype`
- Draft PR：`https://github.com/jacklhchan/eduapp/pull/1`
- Latest pushed commit：以 `codex/edupass-prototype` branch head 為準。

## Demo Login

- Email：`parent@example.com`
- PIN：`246810`

## Backend Providers

- Image OCR：Google Cloud Vision `document_text_detection`
- PDF extraction / OCR review / quiz generation：Vertex AI Gemini `gemini-3.5-flash`
- Persistence：Firestore
- File storage：Cloud Storage
- Server-side PDF：ReportLab with bundled Noto Sans TC font

## 已完成

- 建立 React + Vite + TypeScript mobile prototype。
- 透過 Google Stitch MCP 拉取 `EduPass AI` project，並以 Stitch 產出的 Home / Portfolio / Upload / Coach / Profile HTML + screenshots 作 UI source of truth。
- 對齊 Stitch mobile UI：
  - fixed top app bar
  - 5-tab bottom navigation
  - Material Symbols
  - Stitch image assets
  - 12px cards
  - Trust Blue / Growth Green visual tokens
- 修正底部 navigation active pill，避免 Home / Portfolio label 被遮住。
- 建立 FastAPI backend，Cloud Run 同時 serve React static build 和 API。
- 切換 LLM model 至 Vertex AI Gemini `gemini-3.5-flash`。
- 加入 demo auth：
  - signed `edupass_session` cookie
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- 加入 prototype signup / first-login onboarding：
  - `POST /api/auth/signup`
  - prototype PIN hash storage，不存 plain PIN
  - first login 會要求建立 parent display name 與第一個 child profile
  - `PATCH /api/parent` 可更新 parent display name / onboarding state
- 加入 per-child persistence：
  - Firestore parent / child records
  - Matthew / Chloe demo children
  - deterministic child ordering，登入後預設 Matthew
  - `GET /api/children`
  - `POST /api/children`
  - `PATCH /api/children/{child_id}`
  - `DELETE /api/children/{child_id}`
- 加入 parent consent / privacy foundation：
  - `GET /api/privacy`
  - `PATCH /api/privacy/consent`
  - `GET /api/audit-log`
  - `DELETE /api/children/{child_id}` 會刪除 child profile、documents、portfolio export records 與可選 storage objects。
  - OCR review / quiz generation / Portfolio PDF export 會檢查對應 consent flag。
  - audit log 會記錄 privacy update、Portfolio export、child data deletion。
- 補上 prototype UI button actions：
  - bottom tab 全 app 固定同一套 `Home / Portfolio / Upload / Coach / Profile`，Profile 不再切換成舊版 tab。
  - Home `開始練習` 接到 Coach quiz generation；`查看全部` 可展開最近上載記錄。
  - top app bar child switch 可在 Matthew / Chloe 之間切換。
  - Upload preview fullscreen、錯題刪除、reason select 都有前端狀態反應。
  - Coach 加入 Stitch-style `AI 分析中`、`每日 5 分鐘特訓`、`練習完成` flow，完成前需查看所有答案。
  - Profile `Add Child` 接 `POST /api/children`，`Edit Profile` 接 `PATCH /api/children/{child_id}`，settings rows 改為 bottom sheet panels。
- 加入 OCR document persistence：
  - upload file 存入 Cloud Storage
  - OCR review result 存入 Firestore
  - `POST /api/ocr-review`
- 加入 server-side Portfolio PDF export：
  - `POST /api/portfolio/export`
  - `GET /api/portfolio/exports/{export_id}/download`
  - PDF record 存 Firestore
  - PDF bytes 存 Cloud Storage
  - 打包 Noto Sans TC TTF，Cloud Run PDF 可正確渲染繁中
- 加入 AI provider output validator：
  - JSON object extraction
  - Pydantic model validation
  - enum / mistake tag normalization
- 加入 tests：
  - `tests/test_ai_validation.py`
  - `tests/test_pdf_export.py`
- 加入 iPhone-friendly PWA metadata / manifest / icon，可用 Safari Add to Home Screen。
- HKEDB curriculum / syllabus mapping 已開始落地：
  - `docs/hkedb-k12-syllabus-reference.md` 保存 K1-S6 全科科目框架、官方 EDB source URL、過渡備註與 app mapping。
  - `docs/syllabus/` 由 `scripts/generate_syllabus_docs.py` 生成 15 個年級、204 個 per-year / per-subject Markdown reference files；每份 subject MD 包含 EDB-derived 課程宗旨、學習內容摘要、年級重點、evidence mapping 與官方來源。
  - `src/data/curriculum.ts` 提供 K1-K3、P1-P6、S1-S3、S4-S6 stage / KLA / subject catalogue，並提供 grade-specific helpers。
  - `backend/app/curriculum_catalog.py` 提供後端 catalogue 與 `GET /api/curriculum/catalog`。
  - Coach tab 加入 `HKEDB 課程地圖`，現在會綁定目前 child profile grade；例如 child 是 S3 時只顯示 S3 相關科目，再於該年級內按 KLA 篩選。
  - `backend/app/schemas.py` 的 `Subject` enum 已擴展到 HKEDB K1-S6 主要科目。
  - OCR review prompt 會按 child grade 限定 HKEDB-aligned subject list；quiz generation prompt 會帶入 subject / KLA / strands / source ids。
  - 已修正 Stitch MCP API key 設定，並成功用 `generate_screen_from_text` 生成 curriculum source screen `d1423b25c1f5425d80c697265ecacb27`（`HKEDB 課程地圖 (P1-P6)`）。
  - 已用 Stitch MCP `get_screen` 讀取 `d1423b25c1f5425d80c697265ecacb27`，確認 source screen 可直接作後續 UI 對齊來源。
  - 已用 Stitch MCP `edit_screens` 生成 profile-bound S3 learning map source screen `fe9f34c1c45a4089a8c980dfc16a6c7b`（`Matthew S3 課程地圖 (S3 Curriculum Map)`）。
  - 已用 Stitch MCP `generate_screen_from_text` 生成 Data Privacy Center source screen `c1523b2bbe15450f9473922e40e7e3e8`（`數據隱私中心 (Data Privacy Center)`），React `Data & Privacy` sheet 按此 screen 的 hero shield pulse、consent switches、retention segments、child data summary、audit list、danger zone 與 save sweep 接線。
  - Frontend 已開始建立 course content / learning topic layer，source workspace id 記錄為 `019e81ae-60ab-7fb1-b131-9f60588a450a`，目前有 K2 / P3 / P4 / S1 / S3 topic seeds；若某年級/科目未有手寫 seed，會由 EDB subject strands 產生同 grade / same subject topic skeleton。
- 新增 `docs/iphone-qa-checklist.md`，覆蓋 Safari Add to Home Screen、auth/onboarding、navigation、privacy、upload/AI、Coach、Portfolio、visual QA。

## 已驗證

- Frontend：
  - `npm run build` 通過。
  - In-app browser 可開 Cloud URL。
  - Login screen 可登入 demo account。
  - Home screen 預設 Matthew。
  - Portfolio screen 可按 `Generate`。
  - Portfolio export 後顯示 `PDF export ready`。
  - Browser verification 已覆蓋 Profile / Upload / Coach button actions。
  - Bottom tab 在 Profile / Upload / Coach / 練習完成頁都維持同一套五個 tab。
  - Coach flow 已驗證可從 `Start Practice` 經 `AI 分析中` 到 5 題練習、查看所有答案，再進入 `練習完成`。
  - 本機 in-app browser smoke：把 demo child grade 改為 `S3` 後，Coach 課程地圖顯示 `Official EDB aligned · S3`、`14 個當前年級科目`，包含 `公民、經濟與社會`，不包含 `公民與社會發展`、`應用學習`、`小學科學`；無 horizontal overflow。
  - 本機 Playwright smoke：Coach course content 已跟上方 selected subject 同步；S3 `中國語文` 顯示 `S3 中國語文 Learning Topics`，切到 `數學` 後顯示 `S3 數學 Learning Topics`，topic rail 由 EDB strands 補出 5 個數學 topics：數、量度、圖形與空間、數據處理、代數與函數銜接；transition notice 與 course stats icons 的 computed font 均為 `Material Symbols Outlined`。
  - 本機 in-app browser smoke：`http://localhost:8000/` signup 成功，first-login onboarding 可建立 parent + P3 child profile，Home 顯示新 child，Coach 顯示 `P3 Learning Topics`、`分數概念建構`、`兩步應用題審題`，Profile 可打開 parent / child edit 表單。
- Backend local：
  - `.venv312/bin/python -m pytest tests -q`：13 passed，1 warning（ReportLab dependency deprecation warning）。
  - `.venv312/bin/python -m py_compile backend/app/main.py backend/app/schemas.py backend/app/persistence.py backend/app/curriculum_catalog.py scripts/generate_syllabus_docs.py` 通過。
  - `find docs/syllabus -type f | wc -l`：204 files。
  - 本機 PDF render 已檢查，繁中沒有缺字。
- Cloud Run：
  - Revision `edupass-ai-00012-r2g` serving 100% traffic。
  - `GET /api/health` 回傳 `gemini_model: gemini-3.5-flash`。
  - `POST /api/auth/login` 成功，children order 為 `child-matthew`, `child-chloe`。
  - `GET /api/auth/me` 成功。
  - `GET /api/privacy` authenticated call 成功，回傳 demo privacy settings、Matthew/Chloe child data counts。
  - `POST /api/portfolio/export` 成功，回傳 GCS-backed PDF record。
  - `GET /api/portfolio/exports/{id}/download` 回傳 `application/pdf`。
  - 下載雲端 PDF 後用 `pypdf` 驗證文字包含 `封面設計`、`學習態度`、`應用題審題`。
  - 下載雲端 PDF 後用 `pypdfium2` render PNG，繁中正常顯示。
  - `POST /api/generate-quiz` authenticated call 成功，Gemini 3.5 Flash 產生 5 題 P3 fractions 題目。
  - `POST /api/ocr-review` authenticated upload 成功，Vision OCR + Gemini review 回傳 1 個 extracted question，document file 寫入 GCS。
  - GCS 已看到 portfolio PDFs 和 OCR uploaded document。

## 下一步

- 在 iPhone Safari 開啟 Cloud URL，使用 Share > Add to Home Screen 建立主畫面入口。
- 用真實功課 / 測驗相片做 OCR review QA，特別是手寫、陰影、旋轉與中文題目。
- 將 prototype PIN auth / signup 升級為正式 Firebase Auth / Identity Platform。
- 將 parent consent、data retention、delete child data flow 從 prototype foundation 強化為正式 policy / retention job。
- Portfolio PDF 下一步加入封面照片、作品相片、家長確認欄位與 school-ready template。
- 擴充 `src/data/courseContent.ts` topic seeds，逐步由 `docs/syllabus/` 生成 per-grade / per-subject lessons。
