# Press Tree & Folder Contract

## Pages Press Tree Default Shape

```tsx
import { Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";

export default function ReportPress() {
  return (
    <Press
      slug="report"
      title="Report Title"
      type="pages"
      page="a4"
      sources={[
        mdxSource({ id: "report", preset: "section-folders", root: "report/chapters" }),
      ]}
    >
      <Cover />
      <Toc source="report" maxLevel={2} />
      <Sections source="report" />
      <BackCover />
    </Press>
  );
}
```

## Recommended Folder Layout

```txt
press/<slug>/press.tsx               ← canonical entry
press/<slug>/chapters/               ← MDX source root
press/<slug>/components/             ← page components (Cover, BackCover, etc.)
press/<slug>/theme/                  ← artifact-local tokens and font loading
press/<slug>/theme/tokens.css
press/<slug>/theme/fonts.css
press/design.md                      ← shared user/agent design source
```

Use per-Press folders for multi-Press workspaces. Create `press/shared/` only when multiple Press folders intentionally share assets, facts, or components.
The framework supplies the generic `page-contract.css`, print route reset, and default MDX prose surface; workspace themes adjust shell behavior through tokens and React/Tailwind component classes. Do not add shared `base/*.css`.
New page-specific surfaces should live in React components with Tailwind classes. Do not add shared `page-surfaces/`, `shell/`, or `patterns/` CSS.

## Component & Media Path Resolution

- Default authoring: pass folder-local `./components` and `./media` on `<Press>`
- Custom path: set `<Press componentsDir>` or `<Press mediaDir>` to a string or string array
- Paths starting with `./` resolve relative to the owning Press folder
- Bare paths resolve relative to `press/`
