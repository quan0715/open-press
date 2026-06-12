# Theme & Page Components

## Paths to Write or Update

```txt
press/design.md
press/<slug>/theme/tokens.css
press/<slug>/theme/fonts.css
press/<slug>/theme/fonts/
press/<slug>/theme/prose.css
press/<slug>/components/
```

## Theme Rules

- Keep page geometry on `<Press page>`, not CSS.
- Treat the framework `page-contract.css` as read-only; customize the shell with CSS variables and page components.
- Use `press/design.md` as the shared user/agent design source.
- Put new theme tokens, self-hosted font loading, and pagination-sensitive prose rules under `press/<slug>/theme/`; do not create `press/shared/` unless the user explicitly wants a shared multi-Press asset pool.
- Keep PDF-safe fixed-layout CSS: no uncontrolled overflow, no local-only font dependency for public/PDF output.
- Use components as reading aids: definitions, figures, tables, KPI surfaces, callouts, and reusable page shells.
- Put cover, back-cover, TOC, and other page-specific surfaces in React components with Tailwind classes by default.
- Keep MDX prose styling in local page components or `press/<slug>/theme/prose.css`; do not create shared `base/*.css`.
- Do not use remote Google Fonts `@import` or other network font CSS in final Press themes. Use `@font-face` with files in `press/<slug>/theme/fonts/`, or explicitly choose system fonts.
- Define font roles in `tokens.css`: `body`, `serif`, `mono`, and optional `display`. Use the role tokens from page components and prose CSS instead of repeating raw family stacks.
- For mixed Chinese/English documents, self-host a Latin brand font when needed, then list local Traditional Chinese fallback fonts. Bundle licensed CJK subsets only when the project requires identical Chinese glyphs across machines.
- Use Press-scoped tokens, then bridge them into framework/runtime variables:

```css
:root {
  --report-font-body: "Report Sans Latin", "PingFang TC", "Noto Sans TC", sans-serif;
  --report-font-serif: "Noto Serif TC", "Songti TC", "Source Han Serif TC", serif;
  --report-font-mono: "SFMono-Regular", "Menlo", monospace;
  --report-font-display: var(--report-font-serif);

  --openpress-font-body: var(--report-font-body);
  --openpress-font-serif: var(--report-font-serif);
  --openpress-font-mono: var(--report-font-mono);
  --openpress-font-display: var(--report-font-display);
}
```
- Do not create `press/shared/theme/page-surfaces/`, `press/shared/theme/shell/`, or `press/shared/theme/patterns/`; active work should use React/Tailwind instead.
- Avoid interactive UI patterns inside formal documents.
- For multi-Press workspaces, keep shared Tailwind `@theme` entries variable-backed and generic. Put artifact-specific values under a Press-scoped wrapper or page component so slides, pages, and social formats do not pollute each other.

## Theme Inputs to Gather

- Primary ink color
- Accent color
- Font plan:
  - `body` —正文、表格、caption、註解
  - `serif` —書名、章節標題、正式敘事
  - `mono` —code、路徑、資料欄位
  - `display` —封面大標，可選
- Chinese/English font configuration: self-hosted Latin face, system CJK fallback, or licensed self-hosted CJK subset
- Optional reference aesthetic

## Self-hosted Font Pattern

Prefer `.woff2` files in the Press theme:

```txt
press/<slug>/theme/
  fonts.css
  tokens.css
  prose.css
  fonts/
    report-sans-latin-400.woff2
    report-sans-latin-600.woff2
```

```css
@font-face {
  font-family: "Report Sans Latin";
  src: url("/openpress/fonts/report-sans-latin-400.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

OpenPress copies `press/<slug>/theme/fonts/` to `/openpress/fonts/` during
export. In multi-Press workspaces, give font files unique names so Presses do
not accidentally overwrite each other's files in the shared public font folder.

`tokens.css` should hold stable design values, not selector rules. Good token
subjects: palette, font roles, type scale, line-height, spacing scale,
chart/status colors, and page geometry fallbacks. Put element-specific behavior
such as table cell padding, figure max-height, or code block wrapping in
`prose.css` or component CSS.
