# iPhone QA Checklist

最後更新：2026-06-01 14:34 HKT

Cloud URL：`https://edupass-ai-594335170533.asia-east2.run.app/`

Demo login：

- Email：`parent@example.com`
- PIN：`246810`

## Install

- Safari 開 Cloud URL。
- Share > Add to Home Screen。
- 主畫面名稱使用 `EduPass AI`。
- 從主畫面開啟後確認沒有 Safari address bar 阻擋主要操作。

## Auth And Onboarding

- Demo login 成功，Home 預設 Matthew。
- New parent signup 成功，第一次登入會進入 onboarding。
- Onboarding 可建立 parent display name 與第一個 child profile。
- Logout 後重新 login 可回到同一 parent / child data。

## Navigation

- Bottom tab 在 Home / Portfolio / Upload / Coach / Profile 之間切換時維持同一套五個 tab。
- Home / Portfolio label 不被 active pill 遮擋。
- iPhone 鍵盤打開時，sheet input 不被底部安全區遮住。

## Profile And Privacy

- Profile > Data & Privacy 可打開 Stitch-sourced Data Privacy Center。
- Consent switches 可切換並保存。
- Retention 可在 90 days / 180 days / 1 year / Until deleted 之間切換。
- Child data summary 顯示 documents / portfolio PDF counts。
- Audit activity 會顯示 privacy update / export / deletion。
- Delete child data 需要輸入 child name；只剩一個 child 時必須被阻擋。

## Upload And AI

- Upload 可選 image / PDF。
- Preview fullscreen 可開合。
- 未授權 upload storage / AI processing consent 時，API 應回覆 consent required。
- 授權後 OCR review 可產生 extracted questions。

## Coach

- Coach 課程地圖跟 selected child grade 對齊。
- Start Practice 會進入 AI analyzing animation。
- Generated daily practice 顯示 5 題。
- 必須查看所有答案後才可完成練習。

## Portfolio

- Generate PDF 會產生 server-side PDF。
- 未授權 Portfolio export consent 時，API 應回覆 consent required。
- 授權後 PDF download 可在 iPhone 上預覽或分享。

## Visual QA

- 390px / iPhone SE 寬度沒有水平 overflow。
- Cards / buttons / bottom safe area 沒有文字重疊。
- Material Symbols icons 字型正確，不顯示成文字。
- Data Privacy shield pulse、save sweep、danger confirmation motion 不造成 layout shift。
