# Theme & Page Components

## Paths to Write or Update

```txt
press/design.md
press/shared/theme/tokens.css
press/shared/theme/fonts.css
press/shared/theme/base/page-contract.css
press/shared/theme/base/typography.css
press/shared/theme/base/print.css
press/<slug>/components/
```

## Theme Rules

- Keep page geometry on `<Press page>`, not CSS.
- Use `press/design.md` as the shared user/agent design source.
- Keep PDF-safe fixed-layout CSS: no uncontrolled overflow, no local-only font dependency for public/PDF output.
- Use components as reading aids: definitions, figures, tables, KPI surfaces, callouts, and reusable page shells.
- Put cover, back-cover, TOC, and other page-specific surfaces in React components with Tailwind classes by default.
- Treat `press/shared/theme/page-surfaces/`, `press/shared/theme/shell/`, and `press/shared/theme/patterns/` as legacy compatibility only. Do not create them for new work unless an existing document already depends on those selectors.
- Avoid interactive UI patterns inside formal documents.

## Theme Inputs to Gather

- Primary ink color
- Accent color
- Body font
- Display font
- Optional reference aesthetic
