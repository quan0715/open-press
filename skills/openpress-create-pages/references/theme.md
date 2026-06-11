# Theme & Page Components

## Paths to Write or Update

```txt
press/design.md
press/<slug>/theme/tokens.css
press/<slug>/theme/fonts.css
press/<slug>/components/
```

## Theme Rules

- Keep page geometry on `<Press page>`, not CSS.
- Treat the framework `page-contract.css` as read-only; customize the shell with CSS variables and page components.
- Use `press/design.md` as the shared user/agent design source.
- Put new theme tokens and font loading under `press/<slug>/theme/`; do not create `press/shared/` unless the user explicitly wants a shared multi-Press asset pool.
- Keep PDF-safe fixed-layout CSS: no uncontrolled overflow, no local-only font dependency for public/PDF output.
- Use components as reading aids: definitions, figures, tables, KPI surfaces, callouts, and reusable page shells.
- Put cover, back-cover, TOC, and other page-specific surfaces in React components with Tailwind classes by default.
- Keep MDX prose styling in React/Tailwind page components or prose presets; do not create shared `base/*.css`.
- Do not create `press/shared/theme/page-surfaces/`, `press/shared/theme/shell/`, or `press/shared/theme/patterns/`; active work should use React/Tailwind instead.
- Avoid interactive UI patterns inside formal documents.
- For multi-Press workspaces, keep shared Tailwind `@theme` entries variable-backed and generic. Put artifact-specific values under a Press-scoped wrapper or page component so slides, pages, and social formats do not pollute each other.

## Theme Inputs to Gather

- Primary ink color
- Accent color
- Body font
- Display font
- Optional reference aesthetic
