---
name: openpress-create-slide
description: Use when the user wants to create, draft, scaffold, edit, reorder, add, or revise an OpenPress slide deck or presentation; author or revise slide layouts and UI primitives; convert data-prop layouts to slot-frame JSX; or reference a specific slide, template, opener, or column page. This skill owns slide Press creation, slide editing, layout and template authoring, DeckSlide/layout/ui source structure, slot boundary decisions, Tailwind semantic slide styling, deck narrative, slide density, assets, motion discipline, and verification.
---

# OpenPress Create Slide

`openpress-create-slide` owns artifact creation. The `openpress` skill owns CLI lifecycle: build, render, PDF, image, deploy, doctor, upgrade, migrate.

## Boundary

| Owner | Scope |
| --- | --- |
| `openpress-create-slide` | Create, add, edit, or revise slide decks: structure, Tailwind semantic styling, layouts, UI primitives, assets, narrative. |
| `openpress-create-pages` | Page-based documents. |
| `openpress` | CLI lifecycle. |
| `openpress-deploy` | Public deploy after explicit user confirmation. |
| `openpress-apply-comments` | Pending `@openpress-comment` markers. |

---

## Creation Workflow

Every slide deck follows four repeating phases. This is the main axis of all work.

```
PROPOSE → REFINE → DOCUMENT → ALIGN
```

### PROPOSE

Generate content and visual composition from intake. Start producing — do not ask the user to write YAML first. Present the first version as something to redirect, not a final answer.

- New deck: scaffold `press.tsx` as an ordered `<Slide id />` index, then create each `slides/<id>/slide.tsx` with `export const meta` and a layout stub.
- New slide: use `open-press slide add <id>` so the folder and index marker stay consistent, then edit `slides/<id>/slide.tsx`.
- Choose `ui/` primitives based on content type; do not force the user to specify them.
- If the user provides a reference image, read it and generate a YAML description before writing JSX — the image is the source of truth for that slide.

**Authoring constraints during PROPOSE:**

- Fixed 1920 × 1080 canvas. Think in absolute pixels for type, spacing, image slots.
- 100–160 px content padding unless deliberately full-bleed.
- Keep body text large enough for projection. Do vertical budget math before writing dense slides.
- Never use scrollable slide content.
- One coherent visual direction across the deck.
- Prefer explicit repeated JSX over `array.map` when inspector editability matters.
- Prefer `slides/<id>/slide.tsx > LayoutSlide > inline content` over hidden data arrays or empty proxy components.
- Prefer protocol compound components (`TitleSlide.Title`, `TwoColumnSlide.Left`, etc.) and `op-*` semantic classes over raw Tailwind utility soup. Import protocol layouts from `@open-press/core/slides`.
- Do not create slide-local CSS files by default. Use the shared Tailwind slide style layer and add reusable `op-*` classes only when a pattern repeats.
- Use `lucide-react` for icons by default. Hand-draw SVG only for structural diagrams or flow arrows that no library covers.
- Static decks are valid. Use motion sparingly with one transition family.

### REFINE

Iterate until layout and content are aligned.

- Take feedback on composition, density, hierarchy, or wording.
- Edit JSX directly. Do not regenerate the whole file for small changes.
- Keep semantic `id` values stable during reorder — do not renumber.

Use `open-press search` to locate content within the deck before editing:

```bash
# 找哪張 slide 提到某個關鍵字，回傳 page id + 行號
open-press search . "<query>" --json

# 含 components / theme / design.md 一起搜
open-press search . "<query>" --scope all --json
```

**Editing an existing slide deck:**

- **Reorder**: use `open-press slide reorder ...`; keep semantic `id` stable.
- **Insert**: choose a new semantic `id`, use `open-press slide add <id>`.
- **Hide/show**: use `open-press slide skip <id>` and `open-press slide unskip <id>`.
- **Edit content**: edit `slides/<id>/slide.tsx` directly, update `export const meta` if intent changed.
- **Migrate data-prop layout**: replace `items={[...]}` with explicit JSX children before further edits.
- **Add a layout**: only when a pattern is reused across multiple slides.
- **Add a `ui/*` primitive**: only when a content block is reused across multiple layouts.

### DOCUMENT

After the user confirms a slide or a batch, read the current JSX and update `export const meta` in each confirmed `slides/<id>/slide.tsx`. Write it from observation, not prediction.

```ts
export const meta = {
  layout: "title-slide",
  description: "一句話描述這張的構圖與視覺主軸",
  keypoints: ["要傳達的訊息或視覺規則"],
  visuals: ["asset-filename"],
} satisfies SlideMeta
```

Speaker notes live in `export const notes` in the same `slide.tsx`; they are workbench-only and never rendered in the slide frame.

### ALIGN

Read the `meta` and `notes` back to the user and ask: **「這樣描述對嗎？」**

If corrected, update `meta` / `notes` in `slide.tsx` first, then update JSX to match if needed.

---

## Slide Metadata

Lives in `press/<slug>/slides/<id>/slide.tsx`. `SlideMeta` is strict; workspace-specific fields require an explicit extension type.

```ts
import type { SlideMeta } from "@open-press/core"

export const meta = {
  layout: "<layout-name>",
  description: "<一句話說明這張在做什麼>",
  keypoints: ["<要傳達的訊息>"],
  visuals: ["<asset-filename>"],
} satisfies SlideMeta
```

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `layout` | 建議 | 版型家族名，對應 `layouts/` |
| `description` | 建議 | 一句話說明用途 |
| `keypoints` | 建議 | 要傳達的訊息，Agent 決定排版 |
| `visuals` | 選填 | 已存在的素材檔名 |

Do not write `objectId`, `data-op-id`, or label proxies for engine identity. The engine injects build-local locators.

---

## Setup

**1. Environment check:**

```bash
node -v && npm -v && npx -v
```

Node ≥ 20 required. If missing or outdated, stop and ask the user to install Node.js LTS.

**2. Detect workspace branch:**

```bash
find press -mindepth 2 -maxdepth 2 -name press.tsx -print -quit 2>/dev/null | grep -q . && echo EXISTING || echo FRESH
```

**3a. Fresh workspace:**

```bash
npm create @open-press <target> -- --type slides --title "<title>"
```

Use `.` only when the user explicitly wants the current directory. The create package rejects non-empty targets — do not use a force flag.

**3b. Existing workspace:**

Read `press/*/press.tsx` to identify existing slugs, geometries, `componentsDir`, and `mediaDir`. Run `open-press create <slug> --type slides --title "<title>"`, then edit the generated `press/<slug>/` source. Do not touch sibling Press folders unless the user asks.

For dogfood or disposable verification, use a temporary slug like `slide-dogfood` and remove it after.

---

## Intake

Gather before entering PROPOSE:

- Topic and audience
- Title
- Page count: 3–5 / 6–10 / 11–20 / custom
- Text density: minimal / light / standard / dense
- Motion: static / subtle / rich
- Visual direction: three topic-specific options unless user supplied brand/theme
- Tailwind style direction: background, text, accent, muted, display font, body font, brand mark
- Assets: screenshots, logos, product images, team photos, charts
- Target slug (for multi-Press workspaces)
- Reference images — read and generate YAML from observation before writing JSX

Default page geometry: `slide-16-9`. Ask before using custom geometry.

---

## Verify

Draft marker scan before build:

```bash
# 確認沒有未完成標記殘留
open-press search . "[TODO:" --scope all --json
open-press search . "[DRAFT:" --scope all --json
```

```bash
npm run build
```

When image/PDF export matters:

```bash
npm run openpress:image
npm run openpress:pdf
```

After build passes, run the **DOCUMENT** phase for slides confirmed in this session:

1. Read current JSX for each confirmed slide.
2. Update `export const meta` and `export const notes` in the same `slides/<id>/slide.tsx`.
3. Present metadata to the user: **「這樣描述對嗎？」**
4. If corrected, update `meta` / `notes` first, then JSX.

Report: Press slug, title, geometry, files written, assets needed, verification result, metadata entries written.

---

## When to Read References

- **Press Tree & folder layout**: read `references/press-tree.md` — canonical folder structure, Press Tree TSX example, path resolution rules.
- **Layouts, UI primitives, slots**: read `references/layout-contract.md` — DeckSlide contract, PageFolio variants, layout list, UI primitive list, boundary tables.
- **Tailwind styling contract**: read `references/css-colocate.md` — semantic `op-*` classes, allowed utilities, and the no-new-CSS default.
- **Typography role system**: read `references/typography-roles.md` — the 9 semantic role classes, base CSS, inline extension rules, layout override rules. Read this before writing any text styles.
- **Icon libraries**: read `references/icons.md` — recommended packages, size and weight guidelines for slides.

---

## Do Not

- Do not ask the user to write YAML before seeing any slides.
- Do not put component names, CSS class names, or verbatim copy into `export const meta`.
- Do not write `objectId`, `data-op-id`, or label proxies for engine identity.
- Do not generate one empty component per slide when inline layout composition is clearer.
- Do not use `npm create @open-press` or `open-press create` as an upgrade or migration tool.
- Do not edit generated output.
- Do not publish.
- Do not install dependencies for slide authoring.
- Do not hand-draw SVG for icons available in `lucide-react` or `@phosphor-icons/react`.
