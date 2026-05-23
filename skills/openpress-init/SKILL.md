---
name: openpress-init
description: Use when the user wants to start a new open-press project, set up a fresh document workspace, pick a style pack for a new document, bootstrap a new proposal/whitepaper/teaching-note/spec/book, or run the first-time initialization conversation before any content is written.
---

# open-press Init

This skill owns the **conversation that happens before `openpress init` runs**. Its job is to gather the minimum context needed to pick the right style pack and fill the right metadata, then hand off to downstream skills.

It does not own writing, design, hierarchy, or deploy decisions — those belong to their specialist skills and only come into play after init completes.

## When To Enter

Activate when the user says any of:

- "新開一個 open-press 專案 / 文件"
- "start a new open-press doc / project"
- "我想寫一份 [提案 / 白皮書 / 論文 / 講義 / spec / 報告 / 書]"
- "幫我起手"
- Any request that implies an empty target directory and no chosen pack yet.

Do **not** activate when the workspace already has `document/` populated. In that case route to the appropriate domain skill instead.

## Required Intake Questions

Ask these before running `init`. Batch them; do not ask one at a time.

| Question | Used to decide |
| --- | --- |
| 文件類型（提案 / 白皮書 / 論文 / 教學講義 / 工作筆記 / brief / spec / 書 / 其他） | Style pack recommendation, hierarchy expectation |
| 目標讀者（內部團隊 / 客戶 / 學生 / 學術 / 公眾） | Tone register, portable skill triggers |
| 主要語言（繁體中文 / English / 雙語） | Whether `chinese-ai-writing-polish` will load downstream |
| 規模（單頁 brief / 多章長文 / 完整書 / 系列課程） | Style pack fit, chapter scaffold |
| Metadata: `title` / `subtitle` / `organization` / `author` | Written directly into `openpress.config.mjs` and the `document/index.tsx` Press tree |

If the user already supplied any of these in the request, do not re-ask — only ask the gaps.

## Optional Questions (Ask Only When Relevant)

- 是否需要 PDF 輸出（默認需要，僅在使用者明確只要 web 時跳過 PDF preflight）
- 是否預定公開部署（會引入 `openpress-deploy` 後續流程）
- 目標完成日期（影響後續工作節奏建議，不影響 init 本身）

## Style Pack Recommendation

Map answers to pack choice:

| 文件類型 + 規模 | 建議 pack |
| --- | --- |
| 提案書 / 白皮書 / 論文 / spec / 規格 / 多章長文 | `editorial-monograph` |
| 工作筆記 / brief / 研究摘要 / 教學講義 / 內部備忘 / 單頁到中等長度 | `claude-document` |
| 兩者邊界模糊時 | 給使用者兩個選項，附簡短差異描述（hairline vs warm paper），讓使用者選 |

當未來有更多 pack 時，更新這張表並同步 `openpress-style-pack-contributor`。

## Workflow

1. Read the user's opening message; extract any answers already given.
2. Ask only the **missing** intake questions in one batch.
3. Confirm style pack choice with one sentence of rationale (e.g. 「多章長白皮書 → 建議 `editorial-monograph`，hairline 風格適合長段閱讀」).
4. Run init:
   ```bash
   npx @open-press/cli init <target> --pack <pack>
   ```
   Use `.` for current directory; `--force` if the directory is not empty.
5. Fill metadata: edit `openpress.config.mjs` (title/subtitle/organization/author) and the corresponding copy in `document/index.tsx` Press-tree components.
6. Run `npm run openpress:validate` (inside the new workspace) to confirm it's healthy.
7. Hand off:
   - Tell the user what to edit next (`document/chapters/`, `document/index.tsx`, `document/theme/tokens.css`).
   - Name which downstream skill will pick up next requests: writing & structure → `openpress-writing`, design → `openpress-design`, deploy → `openpress-deploy`.
   - If 語言 is 繁體中文, mention that `chinese-ai-writing-polish` will load automatically during writing.
   - If 文件類型 is 教學講義, mention that `teaching-notes-writing` will load.

## Boundaries

- `openpress` owns CLI command surface, source/generated boundary, and the framework upgrade flow. This skill asks the questions; `openpress` runs the commands.
- `openpress-style-pack-contributor` owns designing new packs. This skill only consumes existing packs.
- `openpress-writing` / `openpress-design` take over after init completes.

## Do Not

- Do not run `init` before metadata is gathered. An empty workspace with `[TODO]` placeholders in cover is a worse starting state than a 30-second intake conversation.
- Do not pick a style pack for the user when the answer is ambiguous; offer the two candidates.
- Do not start writing content during init. Hand off cleanly.
