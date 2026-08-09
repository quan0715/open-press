# Document Example Gallery And Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six document examples, restore the homepage cover gallery, and replace the current Showcase with a clean reader-first view dominated by generated pages.

**Architecture:** Four new root dogfood Presses provide complete fictional sample documents. A canonical localized Showcase registry supplies both the homepage gallery and a shared Astro Showcase component; curated page captures in `apps/web/public/showcase/examples/` are the primary website evidence, with public reader links optional.

**Tech Stack:** OpenPress React renderer, TSX, Astro 5, Tailwind CSS, TypeScript, Playwright, Node test runner.

## Global Constraints

- Keep the public positioning focused on documents; do not restore slide, social-card, or video promotion.
- New people, organizations, research, and financial data are fictional and visibly marked `Sample` or `Demo Data`.
- Do not publish the new examples to a public URL without separate confirmation.
- Homepage Gallery uses native horizontal scrolling and buttons; it never captures vertical wheel input or locks page scrolling.
- Generated pages, not explanatory copy or embedded iframes, dominate the Showcase.
- Preserve existing user changes and do not edit generated framework directories such as `public/openpress/`, `dist-react/`, or `.openpress/`.

---

### Task 1: Create Four Complete Dogfood Documents

**Files:**
- Create: `press/resume/press.tsx`
- Create: `press/school-report/press.tsx`
- Create: `press/financial-report/data.mjs`
- Create: `press/financial-report/press.tsx`
- Create: `press/thesis/press.tsx`
- Create: `tests/financial-report-data.test.mjs`
- Read: `skills/openpress-create-pages/references/press-tree.md`
- Read: `skills/openpress-create-pages/references/theme.md`

**Interfaces:**
- Produces: four `<Press page="a4">` exports with slugs `resume`, `school-report`, `financial-report`, and `thesis`.
- Produces: `financialReportData` from `press/financial-report/data.mjs` with `revenue`, `costOfRevenue`, `operatingExpenses`, `assets`, `liabilities`, `equity`, and `cashFlow` values.
- Consumes: `Frame`, `Press`, and `defineDocumentTheme` from `@open-press/core`.

- [ ] **Step 1: Add a failing financial-data reconciliation test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { financialReportData } from "../press/financial-report/data.mjs";

test("Northstar Goods demo statements reconcile", () => {
  const data = financialReportData;
  assert.equal(data.revenue - data.costOfRevenue, data.grossProfit);
  assert.equal(data.grossProfit - data.operatingExpenses, data.operatingIncome);
  assert.equal(data.assets, data.liabilities + data.equity);
  assert.equal(data.cashFlow.openingCash + data.cashFlow.netChange, data.cashFlow.closingCash);
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `node --test tests/financial-report-data.test.mjs`

Expected: FAIL because `press/financial-report/data.mjs` does not exist.

- [ ] **Step 3: Implement the deterministic financial dataset**

Use whole `NT$ thousands` values and export all derived totals explicitly. The minimum relationships are:

```js
export const financialReportData = {
  currency: "NT$ thousands",
  revenue: 24800,
  costOfRevenue: 10900,
  grossProfit: 13900,
  operatingExpenses: 9700,
  operatingIncome: 4200,
  assets: 18300,
  liabilities: 6300,
  equity: 12000,
  cashFlow: { openingCash: 3100, netChange: 1700, closingCash: 4800 },
};
```

- [ ] **Step 4: Implement four distinct A4 Presses**

Each `press.tsx` exports a default function and uses explicit `Frame` children so the requested page counts are deterministic:

```tsx
export default function ResumePress() {
  return (
    <Press slug="resume" title="Mina Chen — Product Engineer" page="a4" theme={resumeTheme}>
      <ResumeOverviewPage />
      <ResumeSelectedWorkPage />
    </Press>
  );
}
```

Required content:

- resume: two pages covering summary, skills, three fictional roles, selected work, education, and `FICTIONAL SAMPLE` label;
- school report: five pages covering cover, question/method, sample observations and chart, discussion, and references, all marked sample data;
- financial report: eight pages covering cover, highlights, operations, balance sheet, cash flow, segment table, notes, and closing page;
- thesis: ten pages covering title, abstract, contents, introduction, literature context, methodology, results, discussion, conclusion, and references.

- [ ] **Step 5: Run document validation**

Run:

```bash
npm run openpress:typecheck
npm run build:doc
node --test tests/financial-report-data.test.mjs
rg -n '\[(TODO|DRAFT|FIX):' press/resume press/school-report press/financial-report press/thesis
```

Expected: typecheck/build/test PASS; `rg` returns no matches.

- [ ] **Step 6: Commit the document sources and reconciliation test**

```bash
git add -f press/resume press/school-report press/financial-report press/thesis
git add tests/financial-report-data.test.mjs
git commit -m "[doc] add document showcase examples"
```

---

### Task 2: Capture Curated Generated Pages

**Files:**
- Modify: `apps/web/scripts/capture-showcase-covers.mjs`
- Create: `apps/web/public/showcase/examples/resume/*.png`
- Create: `apps/web/public/showcase/examples/school-report/*.png`
- Create: `apps/web/public/showcase/examples/financial-report/*.png`
- Create: `apps/web/public/showcase/examples/thesis/*.png`
- Create: `apps/web/public/showcase/examples/user-story-book/*.png`
- Create: `apps/web/public/showcase/examples/data-structure-notes/*.png`

**Interfaces:**
- Consumes: local workspace reader URLs and existing public reader URLs.
- Produces: `cover.png` and two or three representative `page-XX.png` images for every Showcase slug.

- [ ] **Step 1: Generalize the capture target type**

Use records with explicit page selectors and filenames:

```js
{
  slug: "resume",
  url: "http://127.0.0.1:5173/resume/preview#page-01",
  pages: [
    { selector: "#page-01", output: "cover.png" },
    { selector: "#page-02", output: "page-02.png" },
  ],
}
```

The script writes each screenshot to
`public/showcase/examples/<slug>/<output>` after `document.fonts.ready`.

- [ ] **Step 2: Start the workspace reader and capture all targets**

Run `npm run dev:workspace`, then in another shell run
`pnpm --filter web showcase:covers`.

Expected: six asset folders, each with a cover and representative page images.

- [ ] **Step 3: Inspect the captures**

Use the image viewer on every cover and at least one interior page per new
document. Reject captures with clipped text, browser chrome, loading UI, or
private paths.

- [ ] **Step 4: Commit the capture script and curated evidence**

```bash
git add apps/web/scripts/capture-showcase-covers.mjs apps/web/public/showcase/examples
git commit -m "[core] add generated document showcase assets"
```

---

### Task 3: Build One Canonical Showcase Registry

**Files:**
- Modify: `apps/web/src/data/showcases.ts`
- Modify: `apps/web/src/components/home/HomeRefresh.astro`

**Interfaces:**
- Produces: `ShowcaseItem` with `slug`, `title`, `description`, `audience`, `documentType`, `sourceMaterial`, `prompt`, `cover`, `pages`, `pageCount`, `proof`, and optional `href`.
- Produces: `getShowcases(lang: string): ShowcaseItem[]` for both homepage and Showcase.

- [ ] **Step 1: Extend the typed registry**

```ts
export type ShowcaseItem = {
  slug: string;
  title: string;
  description: string;
  audience: string;
  documentType: string;
  sourceMaterial: string;
  prompt: string;
  cover: string;
  pages: string[];
  pageCount: number;
  proof: "real" | "demo";
  href?: string;
};

export const getShowcases = (lang: string) =>
  showcases[lang as keyof typeof showcases] ?? showcases["zh-tw"];
```

- [ ] **Step 2: Add all six localized records**

Use the same slug order across Traditional Chinese, English, and Japanese.
Existing projects use `proof: "real"`; the four fictional examples use
`proof: "demo"`. Every record points to its curated asset folder.

- [ ] **Step 3: Replace homepage-local gallery data**

Import `getShowcases`, map its records into the gallery, and remove the
duplicated `galleryItems` object. Homepage links are
`/${lang}/showcase#${item.slug}`.

- [ ] **Step 4: Verify types**

Run: `pnpm --filter web typecheck`

Expected: 0 errors.

---

### Task 4: Restore The Homepage Horizontal Gallery

**Files:**
- Modify: `apps/web/src/components/home/HomeRefresh.astro`

**Interfaces:**
- Consumes: `activeGalleryItems` from `getShowcases(lang)`.
- Produces: `data-cover-track`, `data-cover-prev`, and `data-cover-next` controls with native horizontal scrolling.

- [ ] **Step 1: Restore portrait cover cards and the horizontal track**

Each card is an anchor, not a non-interactive article:

```astro
<a href={`/${lang}/showcase#${item.slug}`} class="w-[clamp(15rem,20vw,20rem)] flex-none snap-start">
  <img src={item.cover} alt={`${item.title} cover`} class="aspect-[210/297] w-full object-cover" />
  <h3>{item.documentType}</h3>
  <p>{item.description}</p>
</a>
```

- [ ] **Step 2: Add button-assisted native scrolling**

```js
const track = document.querySelector("[data-cover-track]");
const move = (direction) => {
  if (!(track instanceof HTMLElement)) return;
  const card = track.firstElementChild;
  const width = card instanceof HTMLElement ? card.offsetWidth + 24 : 320;
  track.scrollBy({ left: direction * width, behavior: "smooth" });
};
```

Do not add `wheel` listeners, HTML scroll-lock attributes, or section-jump
logic.

- [ ] **Step 3: Verify homepage interaction**

At 1280 × 900 and 375 × 812, confirm six cards are reachable, buttons move the
track, vertical scrolling is uninterrupted, and the page has no horizontal
overflow.

- [ ] **Step 4: Commit the registry and gallery**

```bash
git add apps/web/src/data/showcases.ts apps/web/src/components/home/HomeRefresh.astro
git commit -m "[core] restore real document gallery"
```

---

### Task 5: Replace Showcase With A Shared Reader-First Component

**Files:**
- Create: `apps/web/src/components/showcase/ShowcaseReader.astro`
- Modify: `apps/web/src/pages/zh-tw/showcase.astro`
- Modify: `apps/web/src/pages/en/showcase.astro`
- Modify: `apps/web/src/pages/ja/showcase.astro`

**Interfaces:**
- Consumes: `lang: "zh-tw" | "en" | "ja"` and localized `ShowcaseItem[]`.
- Produces: hash-addressable example switcher, generated-page stage, optional live reader action, and collapsed `About this example` disclosure.

- [ ] **Step 1: Create the shared component**

The first viewport contains only a compact heading, one-sentence description,
the six-item switcher, one metadata line, and the beginning of the active
generated output. The selected example stage renders all `item.pages`:

```astro
<div data-showcase-panel={item.slug} hidden={index !== 0}>
  <header>
    <p>{item.documentType} · {item.pageCount} pages · {proofLabel}</p>
    <h2>{item.title}</h2>
  </header>
  <div class="grid gap-8">
    {item.pages.map((src, pageIndex) => (
      <img src={src} alt={`${item.title}, generated page ${pageIndex + 1}`} loading={pageIndex === 0 ? "eager" : "lazy"} />
    ))}
  </div>
  <details>
    <summary>{t.about}</summary>
    <dl>...</dl>
  </details>
</div>
```

Remove the default iframe and always-visible audience/source/prompt blocks.

- [ ] **Step 2: Implement hash selection**

On load and `hashchange`, validate the slug, update `hidden`,
`aria-selected`, and `aria-current`, and preserve the first item as fallback.
Clicking a switcher item updates the hash without forcing focus into the stage.

- [ ] **Step 3: Reduce locale routes to wrappers**

Each route retains `Layout`, `LandingNav`, `LandingFooter`, and localized page
metadata. It imports `ShowcaseReader`, passes its locale and cases, and removes
all duplicated Showcase layout and runtime scripts.

- [ ] **Step 4: Verify keyboard and direct-link behavior**

Confirm Tab reaches every switcher item, Enter selects it, direct URLs such as
`/zh-tw/showcase#thesis` show the thesis, and `About this example` opens with
keyboard controls.

- [ ] **Step 5: Commit the Showcase rewrite**

```bash
git add apps/web/src/components/showcase/ShowcaseReader.astro apps/web/src/pages/*/showcase.astro
git commit -m "[core] make showcase reader first"
```

---

### Task 6: Complete Cross-Surface Verification

**Files:**
- Modify only files required to fix failures found by these checks.

**Interfaces:**
- Consumes: all deliverables from Tasks 1–5.
- Produces: fresh build, typecheck, test, link, and visual evidence.

- [ ] **Step 1: Run all structural checks sequentially**

```bash
npm run openpress:typecheck
npm run build:doc
node --test tests/financial-report-data.test.mjs
pnpm run typecheck
pnpm test
pnpm --filter web typecheck
pnpm --filter web build
git diff --check
```

Expected: all commands exit 0; existing non-blocking hints may be reported
separately. Run these commands sequentially because Astro build and typecheck
share `.astro` cache files.

- [ ] **Step 2: Run browser assertions against the local website**

At 1280 × 900 and 375 × 812 assert:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
document.querySelectorAll("[data-showcase-switch]").length === 6
document.querySelectorAll("[data-cover-slide]").length === 6
```

Click the resume, school report, financial report, and thesis links; verify the
URL hash and active panel match.

- [ ] **Step 3: Capture and inspect final screenshots**

Capture full-page homepage and Showcase screenshots at both viewport sizes.
Confirm the homepage regains the cover-wall impact and the Showcase first
screen is dominated by generated pages rather than explanatory copy.

- [ ] **Step 4: Confirm scope and repository state**

Run `git status --short`, confirm the removed video remains absent, and list
any pre-existing untracked assets separately. Do not deploy.
