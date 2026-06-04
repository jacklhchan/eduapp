# Status

最後更新：2026-06-04 00:13 HKT

## 目前目標

建立 AI Learning Passport app prototype，先用 Stitch-aligned mobile UI 跑通，再部署到 GCP 供 iPhone 實機測試。這一階段重點是：auth / storage / per-child persistence、Pydantic + AI output validator tests、server-side Portfolio PDF export。

## 本次 P0 Todo

- [x] OCR Review Inbox：家長可查看待確認 OCR review、修正題目文字 / 學生答案 / 錯因，並以 `PATCH /api/ocr-review/{document_id}/confirm` 寫回確認狀態與 audit log。
- [x] Mistake Notebook 錯題簿：`GET /api/mistake-notebook` 會從 OCR review 低分 / 低信心題目及練習答錯項目自動聚合錯因、掌握度與下一步建議。
- [x] Weekly Parent Briefing：`GET /api/weekly-briefing` 會根據 progress + 錯題簿生成每週亮點、焦點與下步建議，前端已加入學科進度工作台。
- [x] Share Link 管理頁：家長可設定分享對象、有效期、summary / evidence scope，並在前端管理與撤回既有教師連結。
- [x] P0 hardening：CORS production default 改為 explicit allowlist、production `SESSION_SECRET` fail-fast、production demo login 預設關閉、child update 改成 typed Pydantic schema、OCR upload 加 size / total size / MIME sniffing / filename sanitization / PDF page limit / rate limit、teacher share token 加 expiry / revoke / scope 與 410 revoked/expired 防線。
- [x] Mathematics MVP scope：Progress、OCR inbox、Mistake Notebook、Learning Report 與 course surface 先只顯示 Mathematics / Early Childhood Mathematics，其他科目資料仍可保存但不在 MVP UI 露出。
- [x] OCR review history：取消前端 confirmation 只顯示 6 題的限制，`Progress -> OCR 記錄 -> 查看` 可回看過往已確認 OCR result；review 畫面會顯示原始上載相片 / PDF 原檔入口；已確認資料以唯讀方式顯示，待確認資料仍可修正後再 confirm。
- [x] OCR data deletion：`DELETE /api/ocr-review/{document_id}` 可刪除單筆 OCR document、原始上載 storage objects 並寫入 audit log；前端 `Progress -> OCR 記錄` 與已打開 review 畫面均有刪除入口與確認提示。

## Cloud

- iPhone / browser 測試入口：`https://edupass-ai-594335170533.asia-east2.run.app/`
- Cloud Run service：`edupass-ai`
- GCP project：`gen-lang-client-0228668877`
- Project number：`594335170533`
- Region：`asia-east2`
- Last verified revision：`edupass-ai-00038-nnl`
- Service account：`594335170533-compute@developer.gserviceaccount.com`
- Storage bucket：`gs://edupass-ai-594335170533-prototype-storage`
- Firestore database：`(default)` in `asia-east2`

## Latest Verification

- 2026-06-04 09:47 HKT：Cloud Run `edupass-ai-00038-nnl` 已部署並 serving 100% traffic；production API smoke 確認 `GET /api/health` OK、demo login OK、`GET /api/ocr-review/inbox?include_confirmed=true` 回傳 8 份 Mathematics OCR 記錄、authenticated `DELETE /api/ocr-review/doc-smoke-missing` 回 404；production 390px browser smoke 確認 `Progress -> OCR 記錄` 顯示刪除 icon、confirm dialog 可開啟並取消、`scrollWidth === clientWidth === 390`、overflowCount 0。
- 2026-06-04 09:43 HKT：本機 memory backend smoke 確認 `DELETE /api/ocr-review/{document_id}` 會移除 OCR 記錄、原始上載 storage object、錯題簿關聯項目與 progress 上載數；390px Playwright smoke 確認 OCR 記錄列刪除 icon 固定 44px、無 horizontal overflow。
- 2026-06-04 00:16 HKT：Cloud Run `edupass-ai-00037-zdc` 已部署並 serving 100% traffic；production API smoke 確認 `12 pages - mosmps-001.jpeg` 回傳 `file_previews`，`/api/ocr-review/doc-80f3a89988/files/1` 以 authenticated cookie 取回 `image/jpeg` 200；production browser smoke 確認 `Progress -> OCR 記錄 -> 查看` 顯示原圖 `mosmps-001.jpeg`、12 張縮圖、P12 縮圖、12 題 review 與唯讀判定欄。
- 2026-06-04 00:13 HKT：Cloud Run `edupass-ai-00037-zdc` 已部署並 serving 100% traffic；`GET /api/health` OK；390px mobile Progress smoke 再確認 `scrollWidth === clientWidth === 390`、overflowCount 0、header `P3 • 數學進度`、英文 topic hit 全 false。
- 2026-06-04 00:06 HKT：Cloud Run `edupass-ai-00036-6vw` 已部署並 serving 100% traffic；`GET /api/health` OK；390px mobile Progress smoke 確認 header 顯示 `Matthew / P3 • 數學進度`、分享連結管理不再橫向溢出（`scrollWidth === clientWidth === 390` / overflowCount 0），weekly briefing / mistake notebook / improved topics 不再顯示 `Addition and Subtraction`、`Fractions：`、`Two-step word problems` 或 `N pages -`。
- 2026-06-04 00:02 HKT：Cloud Run `edupass-ai-00034-mkw` 已部署並 serving 100% traffic；`GET /api/health` OK，demo login OK；`GET /api/ocr-review/inbox?include_confirmed=true` 只回 Mathematics；production browser smoke 確認 `Progress -> OCR 記錄 -> 查看` 可打開 `12 pages - mosmps-001.jpeg`，12 題全部顯示，已確認結果為唯讀。
- 2026-06-03 23:50 HKT：Cloud Run `edupass-ai-00032-q99` 已部署並 serving 100% traffic；`GET /api/health` OK，demo login + `GET /api/auth/me` OK。
- 2026-06-03：390px mobile smoke 確認 Home / Settings button names 不再混入 Material Symbols ligature，Settings 已有語言切換；local fresh-child flow 確認 Home / Portfolio 不再帶 demo data。

## GitHub

- Repository：`https://github.com/jacklhchan/eduapp`
- Working branch：`codex/edupass-prototype`
- Draft PR：`https://github.com/jacklhchan/eduapp/pull/1`
- Latest pushed commit：以 `codex/edupass-prototype` branch head 為準。

## Demo Login

- Email：`parent@example.com`
- PIN：`246810`

## Backend Providers

- Image OCR evidence：Google Cloud Vision `document_text_detection`
- PDF extraction / multimodal OCR review / quiz generation：Vertex AI Gemini `gemini-3.5-flash`
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
  - bottom tab 全 app 固定同一套 `Home / Portfolio / Upload / Progress / Profile`，Profile 不再切換成舊版 tab。
  - Home `查看進度` 接到 Progress tab；`查看全部` 可展開最近上載記錄。
  - top app bar child switch 可在 Matthew / Chloe 之間切換。
  - Upload preview fullscreen、錯題刪除、reason select 都有前端狀態反應。
  - Quiz generation / daily practice UI 目前先從 tab 隱藏，Progress tab 專注各科成績與 evidence tracking。
  - Profile `Add Child` 接 `POST /api/children`，`Edit Profile` 接 `PATCH /api/children/{child_id}`，settings rows 改為 bottom sheet panels。
- Learning Passport / Portfolio functions 已補成可操作工作台：
  - per-child portfolio draft sections：`Cover Page`、`About Me`、`Learning Attitude`、`Self-care`、`Artworks & Activities`。
  - section cards 可選取並帶 selection transition，editor panel 以 slide-in motion 顯示。
  - 家長可切換 section status：`Completed` / `AI Ready` / `Drafting`。
  - 家長可直接編輯 school-ready draft textarea，亦可確認採用 AI draft。
  - evidence chips 支援新增 / 移除，並有 upload evidence 與 image preview lightbox 入口。
  - overview progress 會按 status + evidence completion 即時計算。
  - `Generate PDF` 會使用目前前端已確認的 section draft + evidence，而不是舊 hard-coded content。
  - 已改用使用者現有 Google Stitch source project `projects/10595017015370179580`（`EduPass AI`），並透過 Stitch MCP 確認 Learning Passport 相關 source screens：`封面設計 (Cover Page Editor)` `0c0ba1b3b81949daa5aeccdc46c3be50`、`關於我 (About Me Editor)` `c8d7247b721a43f29df0914efb1882fd`、`學習態度 (AI Review)` `a8ea15686913425181f7a1ac5148475f`、`自理能力 (Self-care Input)` `08c11a94635c46bcb9f547469edc271b`、`幼稚園面試作品集 (Portfolio)` `c668edf51aab4f23b519d162a61423a0`、`個人檔案與設定 (Profile & Settings)` `2cacdc9e576e44a5b968bfd7c3c9e66b`。
  - 補上 `docs/stitch-screen-map.md`：未來 missing / unclear screen 必須先 reference 使用者現有 Stitch project；如沒有合適既有 screen，需用 Google Stitch MCP 在該 project 生成 missing screen，不能直接在 React 手寫假 source。
  - Learning Passport 依 grade stage 分流：K1-K3 reference `幼稚園面試作品集 (Portfolio)`，使用 whole-child / personal development sections；P1-S6 reference `家長主導學習儀表板 (Progress Dashboard)` 與 `學習態度 (AI Review)`，使用 academic progress / evidence sections。
  - Learning Passport overview 現在提供 `Edit info` 入口，可直接編輯 child name / grade / passport / focus 等 profile info；section draft / status / evidence 會 autosave 到 child profile 的 `portfolio_sections`，再由 Firestore / memory backend rehydrate。
  - Portfolio editor 現在會出現在對應 section card 下方；desktop two-column layout 也會跨欄顯示，不再掉到所有 cards 後面。
  - Fresh child（例如 Jackson）新增時不再自動寫入 demo passport / focus / language / school type；Learning Passport sections 保持空白 draft，只有 Matthew / Chloe demo profile 保留示例內容。
  - Matthew / Chloe demo profile 已補充較完整 mock data：profile focus、Portfolio section drafts / evidence、OCR document records、subject attempts；Progress / Portfolio / Privacy counts 都會從同一批 seed records rehydrate。
  - Home tab 已改成 profile / stage aware：K1-K3 顯示成長摘要、幼兒 Portfolio、AI 成長觀察與生活 evidence；P1-S6 顯示 academic learning summary、Progress CTA、學科進度與功課 evidence。
  - Home tab 已按 Stitch `家長主導學習儀表板 (Progress Dashboard)` / `projects/10595017015370179580/screens/2cf4c58dda9a400181ac6d8b56c19aea` 重構 first screen：mastery ring、progress breakdown、daily goals、recommended practice、Portfolio / Coach cards 與最近上載；K1-K3 仍改寫成 whole-child development，不套學科分數語氣。
  - 修正 AI draft `確認採用` button 內 `task_alt` icon 名稱漏成文字的 CSS 問題，action button icon 會強制用 Material Symbols font。
- 加入 OCR document persistence：
  - upload file 存入 Cloud Storage
  - OCR review result 存入 Firestore
  - `POST /api/ocr-review`
  - `DELETE /api/ocr-review/{document_id}` 可刪除單筆 OCR review、GCS 原始上載檔與進度 / 錯題簿關聯證據。
- 加入 Hybrid OCR review pipeline：
  - image 先用 Cloud Vision `document_text_detection` 建立 OCR evidence。
  - PDF 先用 Gemini document extraction 建立 text evidence。
  - review second pass 使用 Gemini `gemini-3.5-flash` multimodal 同時看原始 upload + OCR text。
  - review schema 保存 `page_count`、`topics`、每題的 `page_number` / `topic_ids`，可支援多頁或 mixed upload。
  - multimodal 失敗時自動 fallback 到 text-only Gemini review。
  - API response / document record 保存 `ocr_provider`、`review_mode`、`review_model`、`review_fallback_used`。
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
  - Progress tab 加入 `HKEDB 課程地圖`，現在會綁定目前 child profile grade；例如 child 是 P3 時顯示 P3 academic subjects，並排除 PE / VA / Music 等非成績追蹤科目。
  - `backend/app/schemas.py` 的 `Subject` enum 已擴展到 HKEDB K1-S6 主要科目。
  - OCR review prompt 會按 child grade 限定 HKEDB-aligned subject list；quiz generation prompt 會帶入 subject / KLA / strands / source ids。
  - 已修正 Stitch MCP API key 設定，並成功用 `generate_screen_from_text` 生成 curriculum source screen `d1423b25c1f5425d80c697265ecacb27`（`HKEDB 課程地圖 (P1-P6)`）。
  - 已用 Stitch MCP `get_screen` 讀取 `d1423b25c1f5425d80c697265ecacb27`，確認 source screen 可直接作後續 UI 對齊來源。
  - 已用 Stitch MCP `edit_screens` 生成 profile-bound S3 learning map source screen `fe9f34c1c45a4089a8c980dfc16a6c7b`（`Matthew S3 課程地圖 (S3 Curriculum Map)`）。
  - 已用 Stitch MCP `generate_screen_from_text` 生成 Data Privacy Center source screen `c1523b2bbe15450f9473922e40e7e3e8`（`數據隱私中心 (Data Privacy Center)`），React `Data & Privacy` sheet 按此 screen 的 hero shield pulse、consent switches、retention segments、child data summary、audit list、danger zone 與 save sweep 接線。
  - Frontend 已開始建立 course content / learning topic layer，source workspace id 記錄為 `019e81ae-60ab-7fb1-b131-9f60588a450a`，目前有 K2 / P3 / P4 / S1 / S3 topic seeds；若某年級/科目未有手寫 seed，會由 EDB subject strands 產生同 grade / same subject topic skeleton。
- Practice generation backend 已支援 per topic / area 題數分配，但前端出題入口目前先隱藏：
  - Course content topic rail 和 detail card 均有題數 stepper。
  - `POST /api/generate-quiz` 接收 `question_count` 與 `practice_plan`，prompt 會要求 Gemini 按每個 topic / area 的 `question_count` 分配題目。
  - Practice screen 改為 multiple choice；每題選擇答案後即時自動批改，提交後顯示參考答案、解釋與 marking scheme，所有題目提交後才可完成練習。
  - Coach UI 已收斂為 Mathematics-only：不再顯示其他科目 / KLA filter / roadmap 科目卡；首頁最近上載示例亦改為數學相關。
  - Quiz generation 加入 plain-text math sanitizer；會把 `$\\frac{1}{4}$`、`$\\triangle$`、`$\\square$` 等 LaTeX / Markdown math 清洗為 `1/4`、`△`、`□`，前端顯示層也有同樣防線。
  - Fresh parent 若未開啟 AI processing consent，practice API 仍會擋下 tracking / generation；前端目前不顯示生成 quiz 入口。
  - Fresh child 的 Learning Passport 不再預填 demo evidence / completed sections；只有 Matthew / Chloe demo profile 保留示例內容。
- 補上原 StudyLens 缺口中除 payment 以外的核心閉環：
  - `POST /api/practice-attempts` 保存每次練習答案、topic、正誤與錯因到 Firestore / memory backend。
  - `POST /api/generate-quiz` prompt / local fallback 要求每題 4 個 options，`answer` 必須對應其中一個 option，方便手機上快速作答。
  - `GET /api/learning/progress` 從 OCR document + subject attempts 聚合 weak topics、improved topics、overall mastery、subject_scores、trend points 與 recent activity。
  - Progress tab 加入 Stitch `學術發展儀表板 (Academic Development)` / `Animated Progress Dashboard` reference：顯示各 academic subject score rows、上載數、attempts、topics、Top 3 weak topics、已改善 topics。
  - `POST /api/reports/share` 建立老師分享 token；`GET /teacher-report/{token}` 提供無需登入的補習老師月度學習報告頁，預設不公開原始 upload。
  - HKEDB subject enum / catalogue 保留中文、英文及 K1-S6 科目作 roadmap mapping；progress / score tracking 已放寬到 academic subjects，PE / sport / VA / Music 保留作 portfolio evidence，不作 score rows。
  - 仍沿用 React + Vite、FastAPI、Firestore、Cloud Storage、Cloud Run 架構；未加入 payment。
- 新增 `docs/iphone-qa-checklist.md`，覆蓋 Safari Add to Home Screen、auth/onboarding、navigation、privacy、upload/AI、Coach、Portfolio、visual QA。

## 已驗證

- Frontend：
  - `npm run build` 通過。
  - 本機 Playwright smoke：Learning Passport 可選 section、採用 AI draft、加入 evidence、上載作品入口切到 Upload、相片 preview lightbox 可開合、Generate PDF 下載成功；下載 PDF 文字包含新採用 `Learning Attitude` draft 與 evidence。
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
  - `.venv312/bin/python -m pytest tests -q`：25 passed，1 warning（ReportLab dependency deprecation warning）。
  - `.venv312/bin/python -m py_compile backend/app/main.py backend/app/schemas.py backend/app/persistence.py backend/app/curriculum_catalog.py scripts/generate_syllabus_docs.py` 通過。
  - `find docs/syllabus -type f | wc -l`：204 files。
  - 本機 PDF render 已檢查，繁中沒有缺字。
- Cloud Run：
  - Last verified revision `edupass-ai-00025-j8n` serving 100% traffic。
  - `GET /api/health` 回傳 `gemini_model: gemini-3.5-flash`。
  - `POST /api/auth/login` 成功，children order 為 `child-matthew`, `child-chloe`。
  - `GET /api/auth/me` 成功。
  - `GET /api/privacy` authenticated call 成功，回傳 demo privacy settings、Matthew/Chloe child data counts。
  - Cloud smoke：`POST /api/portfolio/export` 使用 Learning Passport editor-style section body 成功，下載 PDF 後以 `pypdf` 驗證包含 `Learning Passport`、`latest revision`、`作品相片`。
  - `POST /api/portfolio/export` 成功，回傳 GCS-backed PDF record。
  - `GET /api/portfolio/exports/{id}/download` 回傳 `application/pdf`。
  - 下載雲端 PDF 後用 `pypdf` 驗證文字包含 `封面設計`、`學習態度`、`應用題審題`。
  - 下載雲端 PDF 後用 `pypdfium2` render PNG，繁中正常顯示。
  - `POST /api/generate-quiz` authenticated call 成功，Gemini 3.5 Flash 產生 5 題 P3 fractions 題目。
  - `POST /api/generate-quiz` authenticated call with `practice_plan` 成功；S3 Mathematics 測試要求 3 題，分配為 Number 2 題、Algebra 1 題，Gemini 回傳 3 題且 topics 為 `Number, Number, Algebra`（已在 revision `edupass-ai-00018-qwn` 重驗）。
  - Cloud headless Chrome smoke：Coach course planner 顯示 per-topic allocation rows / steppers，Generate 後進入 `互動練習`，6 題均有作答 textarea；提交第一題後出現 answer panel，完成按鈕在未全部提交前保持 disabled；無 horizontal overflow。
  - Cloud headless Chrome smoke：Coach 課程地圖不再顯示 `官方來源` / EDB source links；topic rail 不再顯示題數 stepper，題數分配只保留在 `Practice setup`，無 horizontal overflow。
  - `POST /api/ocr-review` authenticated upload 成功，Vision OCR + Gemini review 回傳 1 個 extracted question，document file 寫入 GCS。
  - `POST /api/ocr-review` PDF smoke 成功，回傳 `ocr_provider: vertex_gemini_document_extraction`、`review_mode: multimodal_llm`、`review_model: gemini-3.5-flash`、`review_fallback_used: false`、`page_count: 1`、topic `Fractions`。
  - GCS 已看到 portfolio PDFs 和 OCR uploaded document。
  - Cloud Run revision `edupass-ai-00020-9v9` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00022-bp6` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00023-9qp` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00024-kx2` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00025-j8n` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00026-l2b` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00027-xkn` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00028-zjq` 已部署並 serving 100% traffic。
  - Cloud smoke：`GET /api/health` 回傳 `ok: true`、`gemini_model: gemini-3.5-flash`；demo login `parent@example.com` 成功；`GET /api/auth/me` 成功；React static HTML 回傳 root 與 2 個 asset refs。
  - Cloud smoke：`POST /api/generate-quiz` 產生 2 題 Mathematics multiple-choice 題目，每題 4 個 options，且 answer 均在 options 內。
  - Cloud smoke：`POST /api/practice-attempts` 保存 2 題練習結果，`correct_count: 2`。
  - Cloud smoke：`GET /api/learning/progress` 回傳 Matthew learning progress，`practice_count >= 1`。
  - Cloud smoke：`POST /api/reports/share` 建立 `/teacher-report/{token}`；該 teacher report HTML 回傳 200 並包含 Matthew / Fractions / Teacher View。
  - Cloud smoke：`POST /api/generate-quiz` 產生 3 題 Mathematics multiple-choice 題目，每題 4 個 options、answer 均在 options 內；display fields（question/options/answer/explanation/marking scheme）不含 `\` 或 `$`。
  - Cloud smoke：fresh parent Jack + child Jackson 在 consent 前 `POST /api/generate-quiz` 回 403 `Parent consent required for AI practice generation`；`PATCH /api/privacy/consent` 開啟 `ai_processing_consent` 後同一 child 生成 2 題 Mathematics multiple-choice 題目成功，且無 raw LaTeX display text。
  - Cloud Playwright smoke：390px mobile Coach 頁 `coachHeroCount: 0`，只保留 `Generate 6 questions` 作出題入口，無 duplicate `開始練習`；`scrollWidth === clientWidth`；Progress Report DOM 帶 `data-stitch-source="projects/7550425496525656523/screens/1fb93eb80a3b493a96781f530ba50099"`。
  - Cloud Playwright smoke：390px mobile Home 頁顯示 Stitch Progress Dashboard-style `Learning Progress`、`Daily Goals`、`78%` mastery；`scrollWidth === clientWidth`；Home DOM 帶 `data-stitch-source="projects/10595017015370179580/screens/2cf4c58dda9a400181ac6d8b56c19aea"`。
  - Cloud smoke（revision `edupass-ai-00027-xkn`）：`GET /api/health` 200 / `ok: true`；demo login 成功；Matthew 有 5 個 portfolio sections、Chloe 有 6 個 portfolio sections。
  - Cloud smoke（revision `edupass-ai-00027-xkn`）：Matthew `GET /api/learning/progress` 回傳 subject_scores（Mathematics、Chinese Language、English Language、General Studies）；Chloe 回傳 subject_scores（Language、Self and Society、Early Childhood Mathematics）。
  - Cloud smoke（revision `edupass-ai-00028-zjq`）：`GET /api/health` 200 / `ok: true`；demo login 成功；Matthew / Chloe portfolio sections 與 subject_scores 均正常 rehydrate。
  - Cloud Run revision `edupass-ai-00029-8v4` 已部署並 serving 100% traffic。
  - Cloud smoke（revision `edupass-ai-00029-8v4`）：`GET /api/health` 200 / `ok: true`；demo login 成功；Matthew focus 已更新為繁中；`GET /api/learning/progress` 正常回傳；`POST /api/reports/share` 產生教師連結，teacher report HTML 包含 `教師檢視` / `分數` / `掌握度`，且不再包含 `Teacher View` / `Mastery` / `Top weak topics`。
  - Cloud Playwright smoke（revision `edupass-ai-00029-8v4`）：390px mobile Home / Portfolio / Progress / Profile 抽查，`Home` / `Portfolio` / `Upload` / `Progress` / `Profile` / `Daily Goals` / `Academic Progress` / `Progress Report` / `Evidence bank` / `Completed` / `Drafting` / `Generate PDF` / `Settings` / `Data & Privacy` 等舊英文 UI label 均未再出現；`scrollWidth === clientWidth`。
  - Cloud Run revision `edupass-ai-00030-f8z` 已部署並 serving 100% traffic。
  - Cloud smoke（revision `edupass-ai-00030-f8z`）：`GET /api/health` 200 / `ok: true`；demo login 成功；`GET /api/auth/me` 回傳 parent@example.com 與 2 個 children；`GET /api/learning/progress` 回傳 document_count 9 與 4 個 subject_scores；`GET /api/ocr-review/inbox` 回傳 9 份待確認；`GET /api/mistake-notebook` 回傳 15 個 items；`GET /api/weekly-briefing` 回傳 headline 與 3 個 next_actions；`GET /api/reports/share` 回傳 2 條分享紀錄。
  - Cloud Run revision `edupass-ai-00031-jcs` 已部署並 serving 100% traffic。
  - Cloud smoke（revision `edupass-ai-00031-jcs`）：`GET /api/health` 200 / `ok: true`；demo login 成功；`GET /api/weekly-briefing` 回傳 headline；`GET /api/mistake-notebook` 正常回傳 items。
  - Cloud Run revision `edupass-ai-00032-q99` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00033-5hf` 已部署並 serving 100% traffic。
  - Cloud Run revision `edupass-ai-00034-mkw` 已部署並 serving 100% traffic；OCR review history / 12-page readonly review smoke 通過。
  - Cloud Run revision `edupass-ai-00035-5xc` 已部署並 serving 100% traffic；390px mobile Progress layout / share-link overflow smoke 通過。
  - Cloud Run revision `edupass-ai-00036-6vw` 已部署並 serving 100% traffic；390px mobile Progress 中英夾雜與 share-link overflow smoke 通過。
  - Cloud Run revision `edupass-ai-00037-zdc` 已部署並 serving 100% traffic；GitHub head `00841d8` build/test 後部署，390px mobile Progress smoke、OCR 原相片 preview smoke 通過。
  - Cloud Run revision `edupass-ai-00038-nnl` 已部署並 serving 100% traffic；OCR data deletion API、390px Progress delete action、authenticated DELETE 404 smoke 通過。
- 本次本機驗證：
  - `npm run build` 通過。
  - `.venv312/bin/python -m py_compile backend/app/main.py backend/app/schemas.py backend/app/persistence.py backend/app/auth.py` 通過。
  - `.venv312/bin/python -m pytest tests -q`：25 passed，1 warning（ReportLab dependency deprecation warning）。
  - 本機 API test：fresh child Jackson 只帶 `name` / `grade` 建立時，`passport` / `focus` / `language` / `school_type` / `portfolio_sections` 均保持空白。
  - 本機 API test：`POST /api/practice-attempts` 接受 `Chinese Language` subject score tracking；`Visual Arts` 回 400，且不出現在 `subject_scores`。
  - 本機 API test：demo parent rehydrate 後，Matthew 有 4 份 document / 4 次 subject attempts，Chloe 有 3 份 document / 3 次 subject attempts，且兩人都有 portfolio section mock drafts。
  - 本機 Playwright smoke：390px mobile Progress tab 顯示 `Progress` bottom label、`學科進度`、`Academic Progress`，無 `Generate questions` / `開始練習`。
  - 本機 Playwright smoke：P3 Progress tab 顯示 5 個 academic subject rows（中國語文、普通話、英國語文、數學、常識），VA / PE / Music 不出現在 subject rows；`scrollWidth === clientWidth`。
  - 本機 Playwright smoke：Chloe K2 Progress tab 顯示語文、幼兒數學、大自然與生活、個人與群體；體能與健康 / 藝術與創意不出現在 score rows。
  - 本機 Playwright screenshot：Progress subject score row 的 `pending` Material Symbols icon 已修正，不再顯示成文字。
  - 本機 Playwright smoke：Portfolio section editor 會出現在所選 card 下方，Academic Progress card 後面立即接 editor。
  - App 語言已對齊繁體中文：bottom nav、首頁、Portfolio editor、Upload review、Progress、Profile settings、Privacy sheet、teacher report HTML、Portfolio PDF labels 均已清走主要英文 UI label；英文只保留於品牌 / 技術名詞 / 課程來源必要位置。
  - 本機 Playwright smoke：390px mobile Home / Portfolio / Progress / Profile 抽查，`Home` / `Portfolio` / `Upload` / `Progress` / `Profile` / `Daily Goals` / `Academic Progress` / `Progress Report` / `Evidence bank` / `Completed` / `Drafting` / `Generate PDF` / `Settings` / `Data & Privacy` 等舊英文 UI label 均未再出現；`scrollWidth === clientWidth`。
- 本次 P0 implementation：
  - Backend 新增 `ChildUpdateRequest`、`OcrReviewConfirmRequest`、`OcrReviewInboxItem`、`MistakeNotebookResponse`、`WeeklyParentBriefingResponse` 與 share link lifecycle fields。
  - 新增 `GET /api/ocr-review/inbox`、`PATCH /api/ocr-review/{document_id}/confirm`、`DELETE /api/ocr-review/{document_id}`、`GET /api/mistake-notebook`、`GET /api/weekly-briefing`、`GET /api/reports/share`、`DELETE /api/reports/share/{share_id}`。
  - Teacher report public read 現在會拒絕 revoked / expired token，回 410。
  - OCR review `pii_redacted_before_ai` 改為 `false`，避免把原始 multimodal upload 誤描述成已去識別化。
  - Frontend Upload tab 已加入 editable OCR Review Inbox；Progress / Coach 工作台已加入 Weekly Briefing、OCR Review Inbox、Mistake Notebook、Share Link Manager。
  - Tests 已補 child update schema、share list/revoke、mistake notebook、weekly briefing、upload hardening。
  - 修正 OCR correctness：`ExtractedQuestion` 新增 `is_correct`；OCR prompt 要求正確答案回傳空 `mistake_tags`；backend 對 P1 加減應用題做簡單算式 sanity check（例如 `89 - 15 = 74`），若學生答案正確會清空錯因並設為滿分；前端 OCR 確認欄預設顯示「正確 / 無錯因」，不再把未知或正確題預設成「概念」。
  - Mathematics MVP 已收斂：非數學科目從 Progress、OCR inbox、Mistake Notebook、Learning Report 與 course UI 暫時隱藏。
  - OCR review history 已補上：Progress 的 `OCR 記錄` 可載入待確認與已確認 document；已確認 document 會回到 Upload review 畫面作唯讀查看；確認畫面不再只 render 前 6 題，並會顯示原始上載相片或 PDF 原檔入口。

## 下一步

- 在 iPhone Safari 開啟 Cloud URL，使用 Share > Add to Home Screen 建立主畫面入口。
- 用真實功課 / 測驗相片做 OCR review QA，特別是手寫、陰影、旋轉與中文題目。
- 將 prototype PIN auth / signup 升級為正式 Firebase Auth / Identity Platform。
- 將 parent consent、data retention、delete child data flow 從 prototype foundation 強化為正式 policy / retention job。
- Portfolio PDF 下一步加入封面照片、作品相片、家長確認欄位與 school-ready template。
- 擴充 `src/data/courseContent.ts` topic seeds，逐步由 `docs/syllabus/` 生成 per-grade / per-subject lessons。
- P1 refactor：把 `src/App.tsx` 與 `backend/app/main.py` 按 OCR / practice / privacy / reports 拆模組，降低下一輪 beta hardening 的 review 成本。
