# Document Example Gallery And Showcase Design

**Date:** 2026-08-09

**Status:** Approved for implementation

**Target:** OpenPress multilingual landing site and tracked dogfood examples

## Objective

Turn the website examples into direct product evidence. Restore the homepage's
horizontal cover gallery, expand it to six document examples, and replace the
current information-heavy Showcase with a quiet, reader-first presentation in
which generated pages are the dominant content.

The change must preserve the documents-first product position. It does not
restore slide, social-card, or video messaging.

## Example Set

The gallery and Showcase contain the same six examples in the same order:

1. **OpenPress User Story Book** — the existing 28-page product guide.
2. **Data Structures Course Notes** — the existing 158-page teaching guide.
3. **Product Engineer Resume** — a two-page fictional resume.
4. **Dog Ownership: Confidence & Companionship** — a five-page fictional
   school report.
5. **Northstar Goods Annual Financial Report** — an eight-page fictional
   company report with internally consistent statements.
6. **Urban Heat and Street Shade** — a roughly ten-page classical degree
   thesis example with abstract, contents, chapters, figures, tables, and
   references.

The four new examples use fictional people, organizations, research, and
numbers. Every new example visibly carries a `Sample` or `Demo Data` label.
They are complete demonstrations rather than blank templates. The thesis is a
filled example of the template so visitors can judge the resulting pages.

## Content And Data Rules

Each example has one clear visual register and enough authored content to test
real pagination:

- the resume is compact, typographic, and recruiter-readable;
- the school report is approachable and student-facing, with a simple chart
  and a short references section;
- the financial report is restrained and numerical, with a statement of
  operations, balance sheet, cash-flow summary, and notes;
- the thesis follows a conservative academic hierarchy with front matter,
  numbered chapters, figure/table captions, citations, and references.

The financial example uses one small deterministic dataset. Totals must
reconcile across its summary and statements. The report must not imply real
performance, advice, or an investable company. The school report and thesis
must describe their observations as fictional sample data, not real research.
No unsupported legal, financial, employment, or academic claim may appear.

## Homepage Gallery

Restore the original horizontal cover-gallery composition: portrait covers,
compact labels, sequence numbers, captions, and previous/next controls. Use six
real example covers instead of conceptual placeholders.

Each cover is a link to the matching Showcase anchor. The gallery uses native
horizontal scrolling with snap points and button-assisted movement. It must
not capture vertical wheel input, lock document scrolling, or automatically
jump to another section. This retains the original visual impact without
reintroducing the intrusive scroll behavior.

The gallery heading remains concise and evidence-led. It should say that the
examples are generated documents, not explain the whole OpenPress workflow.

## Reader-First Showcase

Replace the current oversized hero, two-column case study, and always-visible
metadata with three quiet layers:

1. **Compact introduction** — one short heading and one sentence.
2. **Example switcher** — a horizontally scrollable strip of six cover
   thumbnails with title, document type, page count, and sample status.
3. **Generated output stage** — the selected example's pages occupy the visual
   center and most of the viewport.

The selected output starts with a large cover or opening-page view followed by
representative generated pages. The presentation should feel like looking at
the artifact, not reading a marketing case study. On wide screens, page images
use a clean neutral stage and generous margins. On small screens they become
full-width with no horizontal page overflow.

Only a single metadata line remains visible above the stage: document type,
page count, and `Real project` or `Demo data`. Prompt, audience, and source
material move into a collapsed native disclosure titled `About this example`.
Existing public-reader links remain available as a restrained secondary action
when a live reader URL exists. Generated page images are the primary evidence;
the embedded iframe is removed from the default presentation.

Selecting an example updates the visible stage and the URL hash. Direct hash
navigation selects the corresponding example on load. The server-rendered
fallback shows the first example, and all example detail remains reachable
without relying on hover.

## Data Model And Components

Extend the existing Showcase data model so each localized item provides:

- stable slug;
- localized title and short description;
- document type;
- page count;
- proof status (`real` or `demo`);
- cover asset;
- representative generated page assets;
- optional public-reader URL;
- collapsed prompt, audience, and source summary.

Create a focused Showcase component shared by the three locale routes. Locale
route files should provide page metadata and render the component rather than
duplicating its layout. Keep the homepage gallery and Showcase driven by the
same canonical example records so order, covers, titles, and links cannot
drift.

The new OpenPress source examples live under separate root dogfood Press slugs:

- `press/resume/`
- `press/school-report/`
- `press/financial-report/`
- `press/thesis/`

Each Press owns its source, components, theme, and data. Curated cover and page
previews used by the marketing site live under
`apps/web/public/showcase/examples/<slug>/`. They are derived from freshly
rendered OpenPress output but treated as intentional website evidence, not as
an editable substitute for the Press source.

## Visual Direction

The Showcase is clean, concise, and sharp:

- warm neutral page background and existing OpenPress typography;
- no giant stacked display headline;
- no decorative gradients, browser mockups, floating cards, or ornamental
  copy blocks;
- one accent color used only for selection and status;
- thin rules instead of boxed metadata panels;
- document pages remain visually faithful to their own themes;
- spacing creates hierarchy while keeping the first selected output visible
  near the initial viewport.

The example documents must not all look like the website. Their distinct
typography, grid, density, and use of color are part of the product proof.

## Localization

Localize navigation labels, example titles where appropriate, short
descriptions, metadata labels, disclosure headings, and accessible text for
Traditional Chinese, English, and Japanese. The generated sample documents may
remain in the language most natural to the artifact; their surrounding UI
still follows the selected website locale.

## Accessibility And Interaction

- The example switcher uses links or buttons with clear selected state and
  visible keyboard focus.
- Arrow controls have localized accessible names.
- The active example is communicated with `aria-current` or equivalent state.
- Page images have descriptive alt text and declared dimensions.
- Native disclosure is keyboard accessible without custom scripting.
- Hash changes do not unexpectedly move keyboard focus.
- Motion is minimal and disabled under `prefers-reduced-motion`.

## Validation

Implementation is complete when:

- all six homepage covers represent complete examples and open the matching
  Showcase state;
- the four new Press sources render without unresolved `TODO`, `DRAFT`, or
  `FIX` markers;
- sample and demo status is visible and unambiguous;
- the financial report's equations reconcile from the source dataset;
- representative pages show no clipped text, overlap, or unintended overflow;
- direct URL hashes select the correct example;
- switcher behavior works by mouse and keyboard;
- 1280 px and 375 px checks show no horizontal page overflow;
- all three locale routes display correct localized UI;
- `pnpm --filter web typecheck`, `pnpm --filter web build`, framework
  typecheck/tests, and the OpenPress dogfood build pass;
- final desktop and mobile screenshots confirm that generated output, not
  explanatory copy, is the dominant visual content.

## Out Of Scope

- restoring slide, social-card, or video promotion;
- publishing the new examples to public URLs without separate confirmation;
- presenting fictional data as real research or business performance;
- adding filtering, search, likes, analytics, or a CMS to the Showcase;
- rebuilding the OpenPress reader runtime solely for the marketing page.
