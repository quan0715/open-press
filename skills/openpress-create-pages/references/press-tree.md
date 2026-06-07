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
press/<slug>/theme/                  ← artifact-local theme overrides
press/shared/theme/                  ← shared baseline across Press folders
press/shared/theme/tokens.css
press/shared/theme/fonts.css
press/shared/theme/base/page-contract.css
press/shared/theme/base/typography.css
press/shared/theme/base/print.css
press/shared/theme/page-surfaces/
press/shared/theme/shell/
press/design.md                      ← shared user/agent design source
```

Use per-Press folders for multi-Press workspaces. Use `press/shared/theme/` only when multiple Press folders share a baseline.

## Component & Media Path Resolution

- Default lookup: folder-local `./components` and `./media`, plus `press/shared/*`
- Custom path: set `<Press componentsDir>` or `<Press mediaDir>` to a string or string array
- Paths starting with `./` resolve relative to the owning Press folder
- Bare paths resolve relative to `press/`
