# AI Learning Passport App Blueprint

最後更新：2026-06-01

## 產品定位

這個 app 的第一市場是香港家長，採手機優先設計。產品定位為「家長主導的 AI Learning Passport」：由幼稚園面試作品集，到小學／中學學習弱點追蹤與個人化練習。

第一版 prototype 先聚焦兩條共用同一個 `Child Profile` 的主線，並以 HKEDB K1-S6 curriculum catalogue 作為後續全科擴展的 mapping backbone：

| 模組 | 目標用戶 | 核心價值 |
| --- | --- | --- |
| Portfolio Builder | 幼稚園／升小面試家長 | 整理孩子特質、相片、作品、活動、語言能力、社交及自理能力，生成可編輯 Portfolio 草稿 |
| AI Learning Coach | 小一至小三家長及學生 | 上載功課／測驗，追蹤數學弱點，按錯因生成練習題 |

## MVP 範圍

第一個可行 MVP 建議做「幼稚園 Portfolio Builder + 小學數學 Learning Coach」。

### 必做

| 功能 | Prototype 做法 |
| --- | --- |
| 家長帳戶與孩子 profile | 先用 mock profile，展示多孩子切換及年級資料 |
| 幼稚園 Portfolio | 展示 3 種模板、section 草稿、家長可編輯文字、PDF export 入口 |
| 功課／測驗上載 | 展示手機拍照／PDF 上載後的 OCR review flow |
| OCR + 人手確認 | 題目、topic、錯因、信心度都需要家長確認 |
| 學習弱點分析 | 以 topic mastery、常錯類型、近期趨勢顯示 |
| 個人化練習題 | 根據弱點生成 5 題練習，附答案與解釋 |
| 家長 Dashboard | 顯示本週摘要、強弱項、建議練習和資料信任狀態 |
| 私隱控制 | 顯示資料用途、AI draft、刪除與 opt-in 狀態 |

### 暫不做

| 暫不做 | 原因 |
| --- | --- |
| 所有科目自動批改 | OCR、手寫辨識、作文批改與評分標準都太複雜；先建立 HKEDB 全科 catalogue，再逐科接評分策略 |
| 中學全科自動診斷 | 課程與題型差異大，不適合 MVP 一次處理；目前先在 Coach 顯示綁定 child grade 的官方科目地圖與來源 |
| 上載試卷直接建立共享題庫 | 有版權、私隱及同意風險 |
| 社交公開分享 Portfolio | 兒童私隱風險高 |
| 保證入學或保證進步 | 法律與品牌風險高 |

## Prototype 技術路線

本地 prototype 先採 `React + Vite + TypeScript`，原因是可以快速在 Mac 上跑出手機優先互動介面，之後仍可演進到 React Native + Expo 或 Next.js。

| Layer | Prototype | V1 方向 |
| --- | --- | --- |
| App UI | React + Vite + TypeScript | React Native + Expo |
| Web/Admin | 同一套 React prototype 先驗證 flow | Next.js |
| AI Backend | 暫用 mock data | FastAPI + Python AI pipeline |
| Data | 前端 mock state | PostgreSQL + pgvector |
| Files | 靜態 mock upload review | Object storage + signed URL |
| PDF | Prototype 只保留 export action | HTML-to-PDF 或 React PDF |

## 核心使用流程

```text
建立 Child Profile
        ↓
選擇 Portfolio 或 Learning Coach
        ↓
Portfolio: 填寫孩子特質、活動、作品、家長觀察
Learning: 上載功課／測驗，OCR 後由家長確認
        ↓
AI 只輸出 draft / suggestion
        ↓
家長確認、修改、保存
        ↓
更新 Portfolio 草稿或 Learning Profile
        ↓
生成 PDF / 今日練習 / 家長 dashboard
```

## 資料模型草案

| Entity | 內容 |
| --- | --- |
| `User` | 家長帳戶、登入方式、付款狀態 |
| `ChildProfile` | 孩子姓名／暱稱、出生年份、年級、語言、學校類型 |
| `PortfolioProject` | Portfolio 模板、草稿內容、相片、PDF export 記錄 |
| `EvidenceDocument` | 上載功課／測驗／考試原檔、OCR 結果、科目、日期 |
| `QuestionItem` | 文件抽取題目或 AI 生成練習題 |
| `AnswerAttempt` | 學生答案、正誤、分數、用時 |
| `CurriculumNode` | 年級、科目、topic、sub-topic、learning objective |
| `MistakeTag` | 概念錯、計算錯、審題錯、單位錯、粗心 |
| `MasteryScore` | 每個 topic 的掌握度、信心值、趨勢 |
| `GeneratedQuiz` | AI 生成練習、答案、解釋與生成依據 |
| `ConsentLog` | 家長同意事項、版本、時間、用途 |

## AI 原則

AI 不應只是 chatbot，而應服務於長期 learning profile。

| AI 模組 | 功能 |
| --- | --- |
| OCR / Document Understanding | 從相片、PDF、手寫功課抽取題目、答案、分數 |
| Curriculum Mapping | 將題目對應到年級、科目、topic、skill；科目框架來自 `docs/hkedb-k12-syllabus-reference.md`，Coach learning map 只顯示當前 child grade 的相關內容 |
| Mistake Diagnosis | 判斷常錯原因，例如分數概念、單位換算、審題 |
| Question Generation | 針對弱點生成原創題 |
| Explanation & Feedback | 用家長和學生易明方式解釋錯因與解法 |

所有 AI 文字預設為 `draft`，必須讓家長逐段確認。所有 AI 結論都要顯示依據，例如「最近 5 題分數比較錯了 3 題」。

## 私隱與信任設計

本產品處理兒童姓名、相片、功課、測驗分數和學習弱點，因此 prototype 已把信任狀態放在主要 dashboard。

必須內建：

- 清楚家長同意，將 Portfolio、學習分析、AI 出題、產品改善分開處理。
- 最少資料收集，MVP 不收身份證、住址等高敏資料。
- 小學生以下由家長管理，不建立獨立兒童帳戶。
- 原始文件可刪除，並可設定保留期。
- 預設不使用兒童個人資料訓練模型。
- 傳送到 AI provider 前盡量移除姓名、學校、電話等 PII。
- 不做公開排名，不把孩子與其他孩子公開比較。

## Roadmap

| Phase | 目標 |
| --- | --- |
| Phase 0 Prototype | 訪問香港家長、收集匿名樣本、建立 HKEDB K1-S6 全科 subject catalogue、落地 P1-P3 數學 OCR flow |
| Phase 1 MVP | Parent onboarding、Portfolio Builder、Upload review、P1-P3 數學、官方課程地圖、Weakness Dashboard、AI Practice Generator |
| Phase 2 V1 | P1-P6 數學、小學科學 / 小學人文 transition tags、錯題簿、spaced repetition、家長月報、付款 |
| Phase 3 V1.5 | 英文科初版、中文科初版、iPad 優化、補習老師授權連結 |
| Phase 4 V2 | S1-S3 數學 / 科學 / PSHE roadmap、Web portal、Tutor dashboard、題目品質 workflow |

## Prototype 驗收目標

- 在 Mac 上用 `npm run dev` 開啟本機 prototype。
- 第一屏不是 landing page，而是可操作的家長 dashboard。
- 能在四個主要 view 間切換：Overview、Portfolio、Upload Review、Practice。
- `STATUS.md` 持續記錄已完成、驗證方式與下一步。
