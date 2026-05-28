# @open-press/core

Framework runtime, CLI engine, and Press Tree primitives for [open-press](https://github.com/quan0715/open-press) — an AI-first fixed-layout document workspace.

Most users do **not** install this package directly. Instead, scaffold a workspace with the CLI:

```bash
npx @open-press/cli init my-doc --pack editorial-monograph
```

The scaffolded workspace contains a snapshot of this package.

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

`document/index.tsx` default-exports a `<Press>` tree. `Frame` marks fixed-layout pages, `MdxArea` receives measured MDX blocks, and `mdxSource()` declares which MDX files participate in the render pipeline.

For the maintenance contract around Press Tree, page geometry presets, and the
allocation pipeline, see [`docs/press-tree.md`](https://github.com/quan0715/open-press/blob/main/docs/press-tree.md).

The CLI bin (`open-press`) supports dev / build / preview / validate / pdf / deploy / export commands. It requires a workspace with `openpress.config.mjs` and the surrounding framework files (which the scaffolder installs).

## License

MIT — see [LICENSE](https://github.com/quan0715/open-press/blob/main/LICENSE).
