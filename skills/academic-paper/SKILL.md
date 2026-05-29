---
name: academic-paper
description: Use when starting or adapting an A4 single-column OpenPress academic / research paper starter for conference drafts, journal preprints, course papers, technical reports, or thesis-style chapters with abstract, numbered sections, figures, tables, and a references list.
---

# Academic Paper

A document style for **research-style writing**: serif title, abstract block, numbered sections (I, II, III), italic sub-section headings (A, B, C), numbered figures and tables, and `[N]` numeric references. Inspired by IEEE conference layout but **single-column** and screen-reader-friendly — designed for the *drafting / preprint / iteration* phase, not for IEEEtran-submittable output.

This is a **starter-bearing skill**: it ships SKILL rules plus a runnable `starter/` workspace (React/MDX entry, theme, design doc, sample chapters). Use `openpress` to initialize the OpenPress runtime workspace; this skill owns the academic starter files and design rules.

## Visual signature

- **Type**: serif (Source Serif 4 / Noto Serif TC) throughout. Title in large display weight; body in 10.5pt-ish reading size.
- **Sections**: Roman numerals + small caps for top-level (`I. INTRODUCTION`); italic sentence-case for sub-sections (`A. Maintaining the Integrity…`); run-in italics for sub-sub-sections (`a) Positioning Figures and Tables:`).
- **Abstract**: bold inline label `**Abstract**—`, italic body, full-width band before the body starts.
- **Index Terms**: bold inline label `**Index Terms**—`, italic body, immediately under abstract.
- **References**: `[1]`, `[2]` numeric style with hanging indent.
- **Figures / Tables**: auto-numbered, captions placed below figures / above tables, narrow hairline borders.
- **Layout**: A4 single-column. A two-column paper needs a dedicated page/frame component; this starter does not promise publisher-final IEEE/ACM layout.

## Suitable for

- Research paper drafts (pre-LaTeX-formatting stage)
- Conference paper iteration (before converting to IEEEtran for submission)
- Journal preprints / arXiv-style drafts
- Course term papers, lab reports, technical notes
- Thesis chapters (per-chapter or full thesis with extended structure)

## Not suitable for

- **Final IEEE / ACM conference submission** — those need LaTeX with the publisher's class file. Use this starter for the drafting + agent-collaboration phase; export to LaTeX manually at submission time.
- Marketing or design-led documents — the typographic rhythm is meant for scholarly prose, not promotional copy.
- Slide decks or one-pagers.

## How to apply (套用到新工作區)

When the user says "use academic-paper" or "start a research paper", run:

```bash
npx @open-press/cli init <target>
cd <target>
rm -rf document
cp -R <this-skill>/starter/press press
```

`<this-skill>` means the installed skill directory or this repo's
`skills/academic-paper` directory. OpenPress does not fetch this starter for you;
the agent reads the skill and copies or adapts the files.

Then:

1. Fill `title` / `subtitle` (running subtitle of the paper) / `organization` (department, institution) / `author` on the `<Press>` props inside `press/index.tsx`, and in the cover JSX. Merge `starter/package.openpress.json` into the workspace `package.json`'s `"openpress"` field for deploy / pdf settings.
2. The starter ships with a sample structure derived from the IEEE conference template (`Introduction`, `Methods` / `Ease of Use`, `Results` / `Prepare Your Paper`, `Acknowledgment`, `References`). Replace each chapter with your own content.
3. Edit `press/design.md` for project-specific conventions (e.g. preferred citation style, abbreviation rules).
4. Run `npm run build` after edits to validate + render.

## Do / Don't

**Do**:

- Number every figure and table; reference them in prose by `Fig. N` / `Table N`.
- Cite references with `[N]`; collect bibliography in the References chapter using consistent style.
- Keep equations on their own line with a right-aligned `(1)` style number; use `<TableCaption>` before tables.
- Define abbreviations on first use — even after using them in the abstract.

**Don't**:

- Use abbreviations in the title or main headings unless they're truly unavoidable.
- Put footnotes in the abstract or in the references list.
- Use `Eq. (1)` or `equation (1)` for parenthetical reference — just `(1)`. Use `Equation (1)` only at the start of a sentence.
- Number every paragraph as if it were a section. H4 is for distinct techniques or sub-procedures, not for rhythm.

## Deep design rules

Detailed typography scale, spacing, numbering rules, and CSS layer responsibilities live in `starter/press/design.md` — once the starter is copied into a workspace, that file becomes the project-level design contract for both users and agents.
