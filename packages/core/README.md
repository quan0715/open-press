# @open-press/core

Framework runtime, CLI engine, and page primitives for [open-press](https://github.com/quan0715/open-press) — an AI-first fixed-layout document workspace.

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
  BasePage,
  BaseCoverPage,
  BaseTocPage,
  BaseBackCoverPage,
  BaseFigure,
  BaseCallout,
} from "@open-press/core";
```

The CLI bin (`open-press`) supports dev / build / preview / validate / pdf / deploy / export commands. It requires a workspace with `openpress.config.mjs` and the surrounding framework files (which the scaffolder installs).

## License

MIT — see [LICENSE](https://github.com/quan0715/open-press/blob/main/LICENSE).
