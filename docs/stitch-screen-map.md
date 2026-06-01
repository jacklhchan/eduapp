# Google Stitch Screen Map

最後更新：2026-06-01 16:15 HKT

Source project：`projects/10595017015370179580` (`EduPass AI`)

## Rule

- Missing or unclear UI screens must be referenced from this existing Google Stitch project first.
- If no suitable existing Stitch screen is available, use Google Stitch MCP to generate the missing screen in this project before implementing UI.
- Do not hand-design missing screens directly in React without either an existing Stitch source screen or a newly generated Stitch source screen.

## Learning Passport References

| App area | Stage | Stitch source screen |
| --- | --- | --- |
| Preschool / K1-K3 whole-child portfolio | K1-K3 | `幼稚園面試作品集 (Portfolio)` / `c668edf51aab4f23b519d162a61423a0` |
| Cover page editor | K1-S6 | `封面設計 (Cover Page Editor)` / `0c0ba1b3b81949daa5aeccdc46c3be50` |
| About me editor | K1-K3 | `關於我 (About Me Editor)` / `c8d7247b721a43f29df0914efb1882fd` |
| Self-care input | K1-K3 | `自理能力 (Self-care Input)` / `08c11a94635c46bcb9f547469edc271b` |
| Academic learning attitude | P1-S6 | `學習態度 (AI Review)` / `a8ea15686913425181f7a1ac5148475f` |
| Academic progress dashboard | P1-S6 | `家長主導學習儀表板 (Progress Dashboard)` / `2cf4c58dda9a400181ac6d8b56c19aea` |
| Profile edit entry | K1-S6 | `個人檔案與設定 (Profile & Settings)` / `2cacdc9e576e44a5b968bfd7c3c9e66b` |

## Current Implementation Mapping

- K1-K3 Learning Passport uses a whole-child structure: cover, about me, language and communication, self-care and independence, social and emotional, creativity and physical development.
- P1-S6 Learning Passport uses an academic structure: cover, learner profile, learning attitude, academic progress, achievements and activities.
- Both stages reuse the same React editor mechanics, autosave, evidence chips, and PDF export pipeline, but their content model and evidence suggestions are stage-specific.
