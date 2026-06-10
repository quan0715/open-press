# @open-press/core

Package-owned runtime, render engine, and Press Tree primitives for [open-press](https://github.com/quan0715/open-press) — an AI-first fixed-layout document workspace.

Most users do **not** install this package directly. Instead, scaffold a workspace with the CLI:

```bash
npm create @open-press my-deck -- --type slides
```

The scaffolded workspace depends on this package; it does not vendor a copy of the runtime. Starter files are supplied by skills or by project-specific `press/` source files. OpenPress 2.0 includes the Tailwind v4 integration and semantic slide styling layer used by protocol layouts.

## Direct use

If you want the runtime primitives in an existing project:

```bash
npm install @open-press/core
```

```tsx
import {
  Press,
  Frame,
  MdxArea,
  BaseFigure,
  BaseCallout,
} from "@open-press/core";

import { mdxSource } from "@open-press/core/mdx";
import { Sections, Toc } from "@open-press/core/manuscript";
```

Each `press/<slug>/press.tsx` default-exports a component that renders one `<Press>`. `Frame` marks fixed-layout pages, `MdxArea` receives measured MDX blocks, and `mdxSource()` declares which MDX files participate in the render pipeline.

For the maintenance contract around Press Tree, page geometry presets, and the
allocation pipeline, see [`docs/press-tree.md`](https://github.com/quan0715/open-press/blob/main/docs/press-tree.md).

The public CLI bin lives in `@open-press/cli` and delegates runtime commands to this package:

```bash
npm install @open-press/core @open-press/cli
npx open-press dev .
npx open-press render .
npx open-press pdf .
```

`@open-press/core` owns the internal browser shell (`index.html`), Vite config, React app runtime, render pipeline, and static server. A workspace owns `press/`, `package.json`, media, components, and theme files.

## License

MIT — see [LICENSE](https://github.com/quan0715/open-press/blob/main/LICENSE).
