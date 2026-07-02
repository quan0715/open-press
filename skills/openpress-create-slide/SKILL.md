---
name: openpress-create-slide
description: Use when the user wants to create, draft, scaffold, edit, reorder, add, or revise an OpenPress slide deck or presentation from topic selection through outline, narrative, visual style, production, and tuning; create or revise slide-style templates; use the slide CLI to add/remove/reorder/skip template-backed slides; define slide theme tokens; convert data-prop layouts to frame/object JSX; or reference a specific slide, template, opener, or column page. This skill owns stable slide delivery workflow, slide Press creation, slide editing, slide-style template authoring, core Object API composition, theme token setup, Tailwind semantic slide styling, deck narrative, slide density, assets, motion discipline, and verification.
---

# OpenPress Create Slide

`openpress-create-slide` owns artifact creation. The `openpress` skill owns CLI lifecycle: build, render, PDF, image, deploy, doctor, upgrade.

## Boundary

| Owner | Scope |
| --- | --- |
| `openpress-create-slide` | Create, add, edit, or revise slide decks: structure, template registry, theme tokens/CSS, Tailwind semantic styling, UI primitives, assets, narrative. |
| `openpress-create-pages` | Page-based documents. |
| `openpress` | CLI lifecycle. |
| `openpress-deploy` | Public deploy after explicit user confirmation. |
| `openpress-apply-comments` | Pending `@openpress-comment` markers. |

---

## Delivery Workflow

Every deck follows four delivery phases. Do not jump straight to JSX unless the user asks for a narrow code edit.

```
TOPIC → STORY → STYLE → PRODUCE
```

### 1. TOPIC

Lock the presentation intent.

Output a short working brief, then proceed with reasonable assumptions unless a missing answer would materially change the deck.

| Decision | What to capture |
| --- | --- |
| Topic | What the deck is about |
| Audience | Who must understand or decide |
| Objective | Inform, sell, align, teach, report, or persuade |
| Core promise | The one sentence the deck must make believable |
| Constraints | page count, deadline, assets, brand, export target |

Do not ask the user to write YAML before seeing anything. If details are missing, state assumptions and keep moving.

### 2. STORY

Create the content outline and narrative arc before designing individual slides.

Output a slide plan table:

| Field | Purpose |
| --- | --- |
| `id` | Stable semantic slide id |
| `kind` | cover, context, problem, insight, proof, agenda, comparison, close, etc. |
| `message` | The one thing this slide says |
| `evidence` | Source, asset, metric, quote, or placeholder needed |
| `template` | Registered template to use or template to create |

Narrative rules:

- Start with audience context, not decorative cover copy.
- Give each slide one job. Split slides when a message needs two unrelated visual hierarchies.
- Keep the deck coherent: every slide should support the core promise.
- Mark missing evidence explicitly; do not invent material business numbers, legal claims, or public commitments.
- Prefer fewer, stronger slides over dense slide dumps.

### 3. STYLE

Design the visual system before bulk production.

Output:

- Visual direction: one chosen direction with a short rationale.
- Theme tokens: colors, fonts, typography roles, and whether they belong in `slide-style/theme/default.css`, active `theme/default.css`, or both.
- Template registry plan: templates to create or reuse, with each template's intended slide roles.
- One or two representative slides when visual approval matters.

Style rules:

- Use `@open-press/core/theme` for portable color/font/typography tokens when a deck style should move across workspaces.
- Keep layout in `box` and `Frame layout`; keep typography and color in theme CSS.
- Build templates from `Slide`, nested `Frame`, `Text`, `Line`, `MediaObject`, `Media`, and `MediaCaption`.
- Make the style inspectable and reusable before generating many slides.

### 4. PRODUCE

Create the deck, add slides from templates, tune the result, then verify.

- New deck: scaffold `press.tsx` as an ordered marker-only `<Slide id />` index, create or select a `slide-style/` template registry, create theme tokens/CSS, then create each `slides/<id>/slide.tsx` from a registered template with `export const meta`.
- New slide: use `open-press slide add <id> --press <slug> --template <name>` when a registered template fits, or omit `--template` to use the manifest default. Then edit `slides/<id>/slide.tsx` directly.
- New template: create `press/<slug>/slide-style/templates/<template>/slide.tsx`, register it in `press/<slug>/slide-style/manifest.json`, and verify it renders in the Workbench template browser before relying on it for new slides.
- New theme: define color/font/typography tokens using `@open-press/core/theme` when the deck needs a portable style package; emit or mirror the variables in `press/<slug>/slide-style/theme/default.css`, and keep the active deck CSS in `press/<slug>/theme/default.css`.
- Choose `ui/` primitives based on content type; do not force the user to specify them.
- If the user provides a reference image, read it and generate a brief visual inventory before writing JSX — the image is the source of truth for that slide.

Production loop:

```
create template/theme → add slides with CLI → edit copied slide source → build/preview → visual tune → document metadata
```

**Authoring constraints during PRODUCE:**

- Fixed 1920 × 1080 canvas. Think in absolute pixels for type, spacing, image slots.
- 100–160 px content padding unless deliberately full-bleed.
- Keep body text large enough for projection. Do vertical budget math before writing dense slides.
- Never use scrollable slide content.
- One coherent visual direction across the deck.
- Prefer explicit repeated JSX over `array.map` when inspector editability matters.
- Prefer `slides/<id>/slide.tsx` copied from a registered template, then edited as explicit inline content, over hidden data arrays or empty proxy components.
- Prefer copied template slides built from `Slide`, nested `Frame` layout props, `Text`, `Line`, `MediaObject`, `Media`, and `MediaCaption` over shared protocol layout components or generic HTML layout wrappers. `Slide` accepts `layout` directly, and nested `Frame` regions can replace most wrapper elements under the slide.
- Use stable `label` on `Text`, `Line`, and `MediaObject` in templates and copied slide source. Use `frameKey` for `Frame` identity. Do not hand-write generated locator values.
- Do not create or depend on protocol layout files. When layout source is touched, move it into template-owned `Slide` / nested `Frame` / `Text` composition.
- Do not create slide-local CSS files by default. Use `slide-style/theme/default.css` for portable style packages and `theme/default.css` for the active Press theme. Add reusable `op-*` classes only when a pattern repeats.
- Use `lucide-react` for icons by default. Hand-draw SVG only for structural diagrams or flow arrows that no library covers.
- Static decks are valid. Use motion sparingly with one transition family.

### Tuning

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
- **Insert**: choose a new semantic `id`, use `open-press slide add <id> --press <slug> --template <name>` when a registered template fits.
- **Hide/show**: use `open-press slide skip <id>` and `open-press slide unskip <id>`.
- **Edit content**: edit `slides/<id>/slide.tsx` directly, update `export const meta` if intent changed.
- **Convert data-prop layout**: replace `items={[...]}` with explicit JSX children before further edits.
- **Add a template**: when a visual pattern should be reusable or portable across slide packages. Register it in `slide-style/manifest.json` before using it with the CLI.
- **Add a layout/component**: only when a pattern is reused across multiple templates or slides and cannot be expressed cleanly with `Frame` regions.
- **Add a `ui/*` primitive**: only when a content block is reused across multiple templates or slides.

### Documentation Gate

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

### Alignment Gate

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
| `layout` | 建議 | 版型家族名，對應 template name 或 family |
| `description` | 建議 | 一句話說明用途 |
| `keypoints` | 建議 | 要傳達的訊息，Agent 決定排版 |
| `visuals` | 選填 | 已存在的素材檔名 |

Use stable `label` for editable object primitives (`Text`, `Line`, `MediaObject`) when authoring templates or copied slide source. Do not write generated locator values.

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

Read `press/*/press.tsx` to identify existing slugs, geometries, `componentsDir`, `mediaDir`, `theme/`, and any `slide-style/manifest.json`. Run `open-press create <slug> --type slides --title "<title>"`, then edit the generated `press/<slug>/` source. Do not touch sibling Press folders unless the user asks.

For dogfood or disposable verification, use a temporary slug like `slide-dogfood` and remove it after.

### Create/Core Alignment Check

Before changing release docs, create templates, or slide authoring rules, confirm `@open-press/create` and `open-press create` still match the current core slides architecture:

- Both `packages/create/src/slides-template.ts` and `packages/cli/src/slides-template.ts` scaffold the same structure: `press/<slug>/press.tsx`, `slide-style/manifest.json`, registered `slide-style/templates/*/slide.tsx`, `slide-style/theme/default.css`, `slides/intro/slide.tsx`, and active `theme/default.css`.
- The scaffold must not create `themes/`; core discovers per-Press theme files from `press/<slug>/theme/**`.
- `press.tsx` must be marker-only: `<Press type="slides" page="slide-16-9">` with self-closing `<Slide id />` children and no slide content, CSS imports, data arrays, or layout components.
- The generated slide file must import core primitives directly from `@open-press/core`, export literal `meta satisfies SlideMeta`, export `notes`, and default-export a slide component built from `Slide`, nested `Frame`, and content primitives.
- Template slide `Text`, `Line`, and `MediaObject` regions must hand-author stable local `label` values. They must not hand-author generated locator values.
- After any template change, run `pnpm --filter @open-press/create test` and `pnpm --filter @open-press/cli test`; these tests must cover the file tree and a generated workspace build.

## Template Registry Contract

Portable slide style lives under `press/<slug>/slide-style/`.

```txt
press/<slug>/slide-style/
  manifest.json
  templates/
    cover/slide.tsx
    agenda/slide.tsx
  theme/default.css
```

`manifest.json` is the source of truth for what the CLI and Workbench can add:

```json
{
  "id": "source-deck-style",
  "name": "Source Deck Style",
  "defaultTemplate": "cover",
  "templates": {
    "cover": {
      "source": "templates/cover/slide.tsx",
      "description": "Date, large serif title, and red rule"
    },
    "agenda": {
      "source": "templates/agenda/slide.tsx",
      "description": "Two-column agenda with divider"
    }
  }
}
```

Template files are complete slides. Use `__SLIDE_ID__` and `__SLIDE_COMPONENT__` placeholders when authoring reusable template source:

```tsx
import { Frame, Line, Slide, Text, type SlideMeta } from "@open-press/core";

export const meta = {
  layout: "cover",
  description: "Date, large serif title, and red rule",
} satisfies SlideMeta;

export default function __SLIDE_COMPONENT__() {
  return (
    <Slide id="__SLIDE_ID__" className="op-source-deck-slide op-template-cover">
      <Frame frameKey="canvas" chrome={false}>
        <Text as="p" label="date" box={{ x: 100, y: 80 }} className="op-source-deck-date">
          26 JUNE 2024
        </Text>
        <Text as="h1" label="title" box={{ x: 100, y: 360, w: 1155 }} className="op-source-deck-title">
          A line is length without breadth.
        </Text>
        <Line label="red-rule" box={{ x: 100, y: 774, w: 270, h: 4 }} className="op-source-deck-red-rule" />
      </Frame>
    </Slide>
  );
}
```

Then create slides through the CLI:

```bash
open-press slide add intro --press slide --template cover
open-press slide add agenda --press slide --template agenda
open-press slide add appendix --press slide       # uses manifest defaultTemplate when present
```

## Theme Contract

When a deck needs a portable visual system, define a theme token graph before generating many templates.

```ts
import { defineTheme, themeToCssText } from "@open-press/core/theme";

export const deckTheme = defineTheme({
  name: "Source Deck",
  colors: {
    bg: "#f8f2e6",
    ink: "#111217",
    accent: { value: "#d7332f", label: "Red rule" },
    muted: "#8a8881",
  },
  fonts: {
    serif: "Georgia, 'Times New Roman', serif",
    sans: "Inter, system-ui, sans-serif",
  },
  typography: {
    title: { font: "serif", size: 124, lineHeight: 1.02, weight: 400, color: "ink" },
    body: { font: "sans", size: 40, lineHeight: 1.35, color: "ink" },
    meta: { font: "sans", size: 24, lineHeight: 1.2, weight: 700, color: "muted" },
  },
});

export const deckThemeCss = themeToCssText(deckTheme, ".op-source-deck-slide");
```

Theme rules:

- `slide-style/theme/default.css` belongs to the portable template package.
- `theme/default.css` is the active Press theme used by the deck.
- Keep typography and colors in theme tokens/CSS. Keep layout in `box` and `Frame layout`.
- Do not redefine font sizes or colors inside every template unless a source deck requires an intentional exception.
- Add optional `theme-colors` or `theme-typography` templates only when the user needs visual QA slides for the package.

---

## Intake

Gather only what the current phase needs. Do not block production on optional details.

| Phase | Intake |
| --- | --- |
| TOPIC | topic, audience, objective, title, page count, target slug |
| STORY | key messages, source material, required evidence, desired call to action |
| STYLE | brand/reference images, visual register, density, motion level, export target |
| PRODUCE | assets, existing press path, template names, verification expectations |

Defaults:

- Geometry: `slide-16-9`.
- Page count: 6–10 for a new narrative deck unless the user says otherwise.
- Text density: light to standard.
- Motion: static or subtle.
- Visual direction: choose one coherent direction; offer alternatives only when the user asks for exploration.
- Theme direction: define colors, fonts, and typography scale before creating many templates; make it portable through `slide-style/theme/default.css` when the deck style may be reused.
- Reference images: read them and generate a brief visual inventory before writing JSX.

Ask before using custom geometry.

---

## Verify

Before claiming a deck is deliverable, check all four phases produced artifacts:

- TOPIC: working brief exists or assumptions were stated.
- STORY: slide plan has stable ids, slide roles, messages, evidence needs, and templates.
- STYLE: theme tokens/CSS and template registry match the chosen direction.
- PRODUCE: slide source exists, build passes, and visual issues were inspected when preview/image/PDF matters.

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

After build passes, run the **Documentation Gate** for slides confirmed in this session:

1. Read current JSX for each confirmed slide.
2. Update `export const meta` and `export const notes` in the same `slides/<id>/slide.tsx`.
3. Present metadata to the user: **「這樣描述對嗎？」**
4. If corrected, update `meta` / `notes` first, then JSX.

Report: working brief, slide plan, chosen style, Press slug, title, geometry, templates/theme touched, files written, assets still needed, verification result, and metadata entries written.

---

## When to Read References

- **Press Tree & folder layout**: read `references/press-tree.md` — canonical folder structure, Press Tree TSX example, path resolution rules.
- **Templates, layout, UI primitives, slots**: read `references/layout-contract.md` — template registry, core Object API primitives, layout props, UI primitive list, boundary tables.
- **Tailwind/theme styling contract**: read `references/css-colocate.md` — semantic `op-*` classes, theme API/CSS split, allowed utilities, and the no slide-local CSS default.
- **Typography role system**: read `references/typography-roles.md` — theme-backed semantic role classes, base CSS, inline extension rules, and layout override rules. Read this before writing any text styles.
- **Icon libraries**: read `references/icons.md` — recommended packages, size and weight guidelines for slides.

---

## Do Not

- Do not ask the user to write YAML before seeing any slides.
- Do not put component names, CSS class names, or verbatim copy into `export const meta`.
- Do not omit stable `label` from `Text`, `Line`, or `MediaObject` in reusable templates.
- Do not write generated locators.
- Do not generate one empty component per slide when inline layout composition is clearer.
- Do not use `npm create @open-press` or `open-press create` as an upgrade tool.
- Do not edit generated output.
- Do not publish.
- Do not install dependencies for slide authoring.
- Do not hand-draw SVG for icons available in `lucide-react` or `@phosphor-icons/react`.
