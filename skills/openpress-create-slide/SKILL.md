---
name: openpress-create-slide
description: Use when the user wants to create, draft, scaffold, edit, reorder, add, or revise an OpenPress slide deck or presentation; author or revise slide layouts and UI primitives; convert data-prop layouts to slot-frame JSX; or reference a specific slide, template, opener, or column page. This skill owns slide Press creation, slide editing, layout and template authoring, DeckSlide/layout/ui source structure, slot boundary decisions, first-pass slide theme, deck narrative, slide density, assets, motion discipline, and verification.
---

# OpenPress Create Slide

`openpress-create-slide` owns artifact creation. The `openpress` skill owns CLI lifecycle: build, render, PDF, image, deploy, doctor, upgrade, migrate.

## Boundary

| Owner | Scope |
| --- | --- |
| `openpress-create-slide` | Create, add, edit, or revise slide decks: structure, theme, layouts, UI primitives, assets, narrative. |
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

- New deck: scaffold Press Tree and generate all layout files in one pass.
- New slide: pick a layout, compose content inline, apply theme conventions.
- Choose `ui/` primitives based on content type; do not force the user to specify them.
- If the user provides a reference image, read it and generate a YAML description before writing JSX — the image is the source of truth for that slide.

**Authoring constraints during PROPOSE:**

- Fixed 1920 × 1080 canvas. Think in absolute pixels for type, spacing, image slots.
- 100–160 px content padding unless deliberately full-bleed.
- Keep body text large enough for projection. Do vertical budget math before writing dense slides.
- Never use scrollable slide content.
- One coherent visual direction across the deck.
- Prefer explicit repeated JSX over `array.map` when inspector editability matters.
- Prefer `Press > LayoutSlide > inline content` over one empty component per slide.
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

**Editing an existing slide deck — check `deck.yml` first:**

- **Reorder**: move JSX blocks, keep `id` stable, update YAML order.
- **Insert**: choose a new semantic `id`, add YAML entry after confirming in REFINE.
- **Edit content**: edit JSX directly, update YAML `keypoints` or `description` if intent changed.
- **Migrate data-prop layout**: replace `items={[...]}` with explicit JSX children before further edits.
- **Add a layout**: only when a pattern is reused across multiple slides.
- **Add a `ui/*` primitive**: only when a content block is reused across multiple layouts.

### DOCUMENT

After the user confirms a slide or a batch, read the current JSX and generate a Deck Blueprint YAML entry that describes what is actually there.

The YAML is not a spec to compile — it is a record of consensus. Write it from observation, not prediction.

```yaml
- id: <slide-id>
  layout: <layout-name>
  status: <定稿 | 草稿 | 新增草稿>
  description: <一句話描述這張的構圖與視覺主軸>
  composition:                       # 有全出血背景或明確空間分割時才填
    background: <asset-filename>
    overlay: <遮罩位置與透明度描述>  # 有遮罩時才填
    # <其他構圖備注>
  zones:                             # 分區位置明確時才填
    top_left: <這個區域放什麼>
    center_left:
      title: <主標描述>
      subtitle: <副標描述>
    bottom_left: <這個區域放什麼>
  keypoints:
    - <要傳達的訊息或視覺規則>
  visuals:
    - <asset-filename>
  speaker_notes: <講者說什麼，不上投影片>
  # <設計備注或版型提示>
```

`composition` and `zones` are optional — use only when spatial layout matters. For simpler slides, `description` and `keypoints` are enough.

### ALIGN

Read the YAML back to the user and ask: **「這樣描述對嗎？」**

If confirmed, the YAML becomes the reference for all future edits. If corrected, update `deck.yml` first, then update JSX to match.

---

## Deck Blueprint YAML

Lives at `press/<slug>/deck.yml`. Not consumed by the engine — it is the shared language between user and agent.

```yaml
slug: <deck-slug>
title: <Deck Title>
theme: <視覺方向描述，例如：明亮簡潔、深色科技、溫暖手感>

intake:
  - <參考文件或素材描述>

slides:
  - id: <slide-id>
    layout: <layout-name>
    status: <定稿 | 草稿 | 新增草稿>
    description: <一句話說明這張在做什麼>
    composition:                      # 有全出血背景或空間分割時才用
      background: <asset-filename>
      overlay: <遮罩位置與透明度描述>
    zones:                            # 分區位置明確時才用
      top_left: <這個區域放什麼>
      center_left:
        title: <主標描述>
        subtitle: <副標描述>
    keypoints:
      - <要傳達的訊息或視覺規則>
    visuals:
      - <asset-filename>
    speaker_notes: <講者說什麼，不上投影片>
    # <設計備注>
```

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `id` | 是 | 對應 JSX `<Slide id>` |
| `layout` | 是 | 版型家族名，對應 `layouts/` |
| `status` | 建議 | `定稿` / `草稿` / `新增草稿` |
| `description` | 建議 | 一句話說明用途 |
| `keypoints` | 建議 | 要傳達的訊息，Agent 決定排版 |
| `visuals` | 選填 | 已存在的素材檔名 |
| `composition` | 選填 | 有全出血背景或明確空間分割時 |
| `zones` | 選填 | 分區位置需要明確時 |
| `speaker_notes` | 選填 | 講者備注 |

Do not put component names, CSS class names, or verbatim copy into `deck.yml`.

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
npx @open-press/cli init <target> --type slides --title "<title>"
```

Use `.` only when the user explicitly wants the current directory. CLI rejects non-empty targets — do not use a force flag.

**3b. Existing workspace:**

Read `press/*/press.tsx` to identify existing slugs, geometries, `componentsDir`, and `mediaDir`. Create a new `press/<slug>/` folder. Do not touch sibling Press folders unless the user asks.

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
- Theme: background, text, accent, muted, display font, body font, brand mark
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
2. Generate YAML entries, write to `press/<slug>/deck.yml`.
3. Present YAML to the user: **「這樣描述對嗎？」**
4. If corrected, update `deck.yml` first, then JSX.

Report: Press slug, title, geometry, files written, assets needed, verification result, `deck.yml` entries written.

---

## When to Read References

- **Press Tree & folder layout**: read `references/press-tree.md` — canonical folder structure, Press Tree TSX example, path resolution rules.
- **Layouts, UI primitives, slots**: read `references/layout-contract.md` — DeckSlide contract, PageFolio variants, layout list, UI primitive list, boundary tables.
- **CSS co-location & token contract**: read `references/css-colocate.md` — file responsibility split, import pattern, token vocabulary contract.
- **Typography role system**: read `references/typography-roles.md` — the 9 semantic role classes, base CSS, inline extension rules, layout override rules. Read this before writing any text styles.
- **Icon libraries**: read `references/icons.md` — recommended packages, size and weight guidelines for slides.

---

## Do Not

- Do not ask the user to write YAML before seeing any slides.
- Do not put component names, CSS class names, or verbatim copy into `deck.yml`.
- Do not generate one empty component per slide when inline layout composition is clearer.
- Do not use `npx @open-press/cli init` as an upgrade or migration tool.
- Do not edit generated output.
- Do not publish.
- Do not install dependencies for slide authoring.
- Do not hand-draw SVG for icons available in `lucide-react` or `@phosphor-icons/react`.
