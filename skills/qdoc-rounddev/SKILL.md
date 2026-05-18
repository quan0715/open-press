---
name: qdoc-rounddev
description: Use when opening or managing QDoc's local review loop, RoundDev/run dev, dev server, in-app browser preview, user review sessions, Document/Design/Project workspace navigation, or visual feedback before export/deploy.
---

# QDoc RoundDev

RoundDev is the default user feedback loop for QDoc work: start the local dev server, open the QDoc workbench, review with the user, edit source files, then validate and refresh.

Use this skill when the user asks to open QDoc, run dev, show the document, review the current draft, inspect Design or Project workspace, or prepare for a deploy review.

## Workflow

1. Export once if public data may be stale:

```bash
npm run qdoc:export
```

2. Run the local workbench:

```bash
npm run dev
```

3. Use the actual URL printed by Vite/QDoc. If `5173` is occupied, use the fallback port that the command reports.
4. Open the URL in the in-app browser with `?dev=1`.
5. Keep the browser visible when the user wants to review together.
6. Treat the workbench as the shared review surface:
   - **Document**: current public-facing document.
   - **Design System**: style rules and visual specimens.
   - **Project**: source inventory, components, media, and data.
7. After source changes, run:

```bash
npm run qdoc:export
npm run qdoc:validate
```

The dev server may hot-reload, but validation is still required before saying the document is ready.

## User Interaction Pattern

When the user is reviewing visually, keep updates short and concrete:

- what changed;
- where to look in the workbench;
- what still needs user judgment;
- what verification has run.

Do not ask the user to inspect generated files. Direct them to the Document, Design System, or Project workspace.

Useful user-facing prompts:

```txt
請使用 qdoc-rounddev skill 打開本機 workbench，讓我檢查 Document、Design System 和 Project。
```

```txt
請使用 qdoc-rounddev skill 重新整理預覽，確認我剛剛提出的內容修改已經出現在文件裡。
```

RoundDev is not approval by itself. If the user wants to publish, switch to `qdoc-deploy`.

## Boundaries

- Do not edit `public/qdoc/`, `dist-react/`, or `.deploy/` by hand.
- Do not treat a visual preview as deploy approval.
- Do not publish from RoundDev without switching to the `qdoc-deploy` workflow.
- If the page is blank or stale, check export status, dev server output, and browser console before changing document content.
- If deploy config is missing, surface it in Project/Deploy status and route setup to `qdoc-deploy`.

## Future UI Contract

RoundDev should become the default frontend entry point for human-Agent collaboration.

The UI should provide buttons that map to existing workflows:

- open local workbench;
- export and validate;
- generate PDF;
- start deploy setup;
- deploy only after explicit confirmation.

These buttons should surface status and call the same CLI-backed workflows. They should not create separate hidden behavior.
