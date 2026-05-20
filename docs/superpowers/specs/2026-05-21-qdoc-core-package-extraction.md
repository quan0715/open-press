# `@qdoc/core` Package Extraction — v1 Spec

**Status**: Draft for review
**Predecessor**: `2026-05-20-qdoc-react-architecture-design.md`(整體架構)
**Goal**: 讓 user 能跑 `npx @qdoc/core init my-doc`,得到自包工作目錄,並完整使用 dev / build / inspector / apply-comments 全套流程
**Out of scope**: 重寫 engine 或 reader runtime — 它們已就位,本份 spec 只處理「怎麼把 monorepo 切出去當 npm 套件」

---

## 1. 為什麼動

現在所有 framework code(engine/ + src/qdoc/ + skills/ + tests/)跟 dogfood document(document/)共住一個 repo。Self-host 開發很方便,但 user 沒辦法獨立用:

- `bin: { qdoc: engine/cli.mjs }` 只在 framework repo 跑得起來;clone 別人是不能 `npm i qdoc` 的(`"private": true`,而且 engine 內部用 monorepo 相對路徑)
- `vite.config.ts` 在 framework root,referenced 用 `path.resolve(__dirname, "src/qdoc/core/index.tsx")` 等絕對路徑
- Starter 只有 `document/` + `qdoc.config.mjs`,user `init` 完去自己的目錄會發現沒 `package.json` / `vite.config` / `tsconfig`
- `qdoc init` 印 next steps 是 `node engine/cli.mjs validate`,user `cd` 進去後找不到此檔
- Reader runtime CSS / KaTeX 字型 / @qdoc/core React primitives 都是 framework-relative 路徑,沒被當成「可被外部 import 的資產」對待

目標 UX:

```bash
$ npx @qdoc/core init my-doc
✓ Scaffolded my-doc/ from style pack "editorial-monograph"
✓ Wrote package.json with @qdoc/core@^1
✓ Wrote vite.config.ts, tsconfig.json, AGENTS.md
  Run:
    cd my-doc
    npm install
    npx qdoc dev

$ cd my-doc && npm install && npx qdoc dev
✓ http://localhost:5173 — QDoc reader live
```

---

## 2. 命名

`@qdoc/core` — 對應現有架構 spec 全文一致用詞,且 `bin: { qdoc }` 命令名跟 scope 名分離(避免「qdoc 已被 npm 註冊」風險)。

需要做:
- 申請 npm `@qdoc` org
- 預先 reserve `@qdoc/core`、`@qdoc/cli`(別名 alias)、`@qdoc/editorial-monograph`(starter pack)

---

## 3. Repo layout(切完之後)

**Monorepo 結構**(framework 維護者視角):

```
qdoc-monorepo/                    ← 取代現有 framework repo
  packages/
    core/                         ← @qdoc/core npm package
      src/
        cli/                      ← 從 engine/ 搬,加 bin entry
          index.mjs               ← bin 進入點(原 engine/cli.mjs)
          commands/               ← 原 engine/commands/
        engine/                   ← 原 engine/ 各模組
        react/                    ← 原 engine/react/ + src/qdoc/core/
        runtime/                  ← 原 src/qdoc/ reader runtime
        styles/                   ← 原 src/styles/qdoc/
        vite/                     ← Vite preset(新增,§7)
        tsconfig/                 ← TS preset(新增,§8)
      dist/                       ← build output(npm 上傳的)
      package.json
      tsconfig.json
      README.md
    editorial-monograph/          ← @qdoc/editorial-monograph(starter pack)
      starter/                    ← 等同現在的 skills/editorial-monograph/starter/
        package.json.tmpl
        tsconfig.json.tmpl
        vite.config.ts.tmpl
        AGENTS.md
        document/                 ← 範例 workspace
      SKILL.md
      package.json
  examples/
    data-structures-note/         ← 從現在的 repo root 改名搬進來(dogfood)
      package.json                ← 用 @qdoc/core via npm workspace
      tsconfig.json
      vite.config.ts
      document/
  tests/                          ← framework-level 跨 package 整合測試
  package.json                    ← npm workspace root
  turbo.json / nx.json            ← 視需要;v1 用純 npm workspaces 即可
```

**為什麼 monorepo 而非 multi-repo**:
- Self-host(`examples/data-structures-note/`)直接吃 `packages/core/` 本地版本,改 framework 立即看到效果
- 跨 package 共用 lint / typecheck / test
- One-PR-fix-everything,不用同步多 repo

---

## 4. `@qdoc/core` 對外 exports map

`package.json` 內:

```json
{
  "name": "@qdoc/core",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "qdoc": "./dist/cli/index.mjs"
  },
  "exports": {
    ".": {
      "types": "./dist/runtime/index.d.ts",
      "import": "./dist/runtime/index.js"
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "import": "./dist/react/index.js"
    },
    "./vite": {
      "types": "./dist/vite/index.d.ts",
      "import": "./dist/vite/index.js"
    },
    "./tsconfig.json": "./tsconfig/base.json",
    "./styles/*.css": "./dist/styles/*.css",
    "./fonts/*": "./dist/fonts/*"
  },
  "files": ["dist", "tsconfig"],
  "engines": { "node": ">=20" }
}
```

| Export | 內容 |
|---|---|
| `@qdoc/core` | TS 型別(`QDocManifest` 等)+ BaseX primitives(`BasePage`、`BaseFigure` 等) |
| `@qdoc/core/react` | React runtime hooks(`useQDocReaderRuntime` 等),user 自訂 reader 才會用 |
| `@qdoc/core/vite` | Vite preset(§7) |
| `@qdoc/core/tsconfig.json` | TS extends base(§8) |
| `@qdoc/core/styles/*.css` | reader chrome + base CSS |
| `@qdoc/core/fonts/*` | KaTeX 字型等 ship 資產 |

---

## 5. CLI bin entry

```
node_modules/.bin/qdoc          ← 由 @qdoc/core 提供
```

實作上:`packages/core/src/cli/index.mjs` 的 shebang `#!/usr/bin/env node` + `package.json` 的 `"bin": { "qdoc": "./dist/cli/index.mjs" }`。

子命令保留現有名稱:
- `qdoc init <target>` — scaffold 新 workspace(§6)
- `qdoc dev` — Vite dev server
- `qdoc build` — Puppeteer pagination + 靜態輸出
- `qdoc validate` — 分層 validation(架構 spec §9)
- `qdoc preview` — serve build output
- `qdoc inspect` — debug 工具
- `qdoc migrate` — 舊架構升級(留著直到所有舊 user 升完)

---

## 6. `qdoc init` 新行為

### 6.1 流程

```
$ npx @qdoc/core init my-doc
$ npx @qdoc/core init my-doc --pack editorial-monograph
$ npx @qdoc/core init my-doc --pack editorial-monograph@1.2
```

1. **解析 pack 來源**:
   - `--pack <name>` 預設從 npm 抓 `@qdoc/<name>`
   - `--pack ./local-pack` 從本地路徑(framework 開發 / 私有 pack)
   - 沒指定 → 列出可用 pack 讓 user 選(`@qdoc/editorial-monograph` 為預設 official)
2. **建 target 資料夾**(已存在且非空就 abort,除非 `--force`)
3. **複製 starter** → 模板檔(`.tmpl`)做 placeholder 替換:`{{TITLE}}`、`{{ORGANIZATION}}`、`{{QDOC_CORE_VERSION}}` 等
4. **寫入** workspace root 五件套:
   - `package.json`(deps: `@qdoc/core`)
   - `tsconfig.json`(extends `@qdoc/core/tsconfig.json`)
   - `vite.config.ts`(import preset)
   - `AGENTS.md`
   - `.gitignore`(node_modules / dist / public/qdoc 等)
5. **不**自動跑 `npm install`(讓 user 自己決定,印出 next steps)

### 6.2 Next steps 訊息

```
✓ Created my-doc/ from @qdoc/editorial-monograph@1.0
✓ Next steps:
    cd my-doc
    npm install
    npx qdoc dev        # http://localhost:5173

  其他命令:
    npx qdoc validate   # 確認語法 / metadata / asset 完整
    npx qdoc build      # Puppeteer 預分頁 + 寫盤
    npx qdoc preview    # serve build 輸出
```

---

## 7. Vite preset

User workspace `vite.config.ts`(由 init 寫入):

```ts
import { defineConfig } from 'vite';
import qdoc from '@qdoc/core/vite';

export default defineConfig({
  plugins: [qdoc()],
});
```

`@qdoc/core/vite` 預設啟用:
- `@vitejs/plugin-react`(MDX 路徑也由它處理)
- MDX file loader(`.mdx` → React component via `compileQDocMdx`)
- Alias:`@workspace/* → ./*`、`@/components → ./document/components`
- Dev-only:`data-qdoc-loc` source-location plugin(inspector §10)+ `/__qdoc/comment` endpoint
- Build-only:server-side render entry,Puppeteer pagination 用的 measurement CSS
- Tailwind v4 plugin(已包含 `@qdoc/core` 預設 preset)

User 想加 plugin / 改 alias / 自訂 React fast-refresh 等,直接在 `vite.config.ts` 內加就好,preset 不擋。

Advanced 開關:

```ts
qdoc({
  pagination: { enabled: true, pageSafeHeightPx: 930 },
  inspector: false,           // 預設 true(dev only)
  tailwind: { preset: false },// 不要 ship 預設 preset
})
```

---

## 8. TypeScript preset

`@qdoc/core/tsconfig.json`(base):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "lib": ["ES2022", "DOM"],
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "paths": {
      "@qdoc/core": ["./node_modules/@qdoc/core/dist/runtime"],
      "@qdoc/core/*": ["./node_modules/@qdoc/core/dist/*"]
    }
  },
  "include": ["document/**/*", "*.config.ts"]
}
```

User workspace 的 `tsconfig.json`:

```json
{
  "extends": "@qdoc/core/tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/components": ["./document/components"],
      "@workspace/*": ["./*"]
    }
  }
}
```

User 可自己加 paths / strict 調整。

---

## 9. Path alias 統一

| Alias | 解析 | 由誰提供 |
|---|---|---|
| `@qdoc/core` | npm package | Vite + TS 自動 |
| `@qdoc/core/react` / `/vite` / `/styles/*.css` | npm subpaths | Vite + TS 自動 |
| `@/components` | `./document/components` | `@qdoc/core/vite` preset + user tsconfig |
| `@workspace/*` | `./*`(workspace root) | `@qdoc/core/vite` preset + user tsconfig |

**沒有** 隱晦 alias —— 寫進 user 自己的 tsconfig.json + vite.config.ts 內,user 一眼看得到。

---

## 10. Dependency 切分

`@qdoc/core` 的 `package.json`:

```json
{
  "dependencies": {
    "@mdx-js/mdx": "^3",
    "@mdx-js/react": "^3",
    "react": "^19",
    "react-dom": "^19",
    "remark-gfm": "^4",
    "remark-math": "^6",
    "rehype-katex": "^7",
    "katex": "^0.16",
    "lucide-react": "^1",
    "vite": "^8",
    "@vitejs/plugin-react": "^6",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4"
  },
  "optionalDependencies": {
    "playwright": "^1.60"
  },
  "peerDependencies": {
    "typescript": ">=6"
  }
}
```

| 類別 | 內容 | 理由 |
|---|---|---|
| `dependencies` | MDX / React / Vite / Tailwind | core 跑必備,user 完全不需要直接 install |
| `optionalDependencies` | Playwright | ~280MB Chromium。Dev mode(無 Puppeteer pagination)不需要,只 build 才用。Install 不擋,缺時 `qdoc build` 給友善錯誤訊息 |
| `peerDependencies` | TypeScript | user 自己 install(典型情境)— 避免 lock 版本 |

User workspace 的 `package.json`(init 寫入的):

```json
{
  "name": "my-doc",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "qdoc dev",
    "build": "qdoc build",
    "preview": "qdoc preview",
    "validate": "qdoc validate"
  },
  "dependencies": {
    "@qdoc/core": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^6"
  }
}
```

**唯一一個 framework dep**。`react`、`vite` 等都是 transitive,user 不直接寫。

---

## 11. System CSS / 字型 ship 機制

Architecture spec §4.7 規定兩層 CSS 隔離。具體 ship 方式:

**Reader chrome / system CSS** — 由 `@qdoc/core/vite` preset **自動 inject**:

```ts
// preset 內部
import readerCss from '@qdoc/core/styles/reader-runtime.css?url';
import baseCss from '@qdoc/core/styles/base.css?url';
// ...vite plugin 在 entry HTML 自動加 <link rel="stylesheet" href={readerCss}>
```

User **不寫** import,preset 確保 reader chrome CSS 永遠載入。

**KaTeX 字型** — 同樣由 preset 處理:`@qdoc/core/fonts/katex/*.woff2` 由 Vite static asset pipeline 自動複製到 build output,user 看不到。

**User 自己的 design system CSS** — `document/theme/*.css` 由 user `document/index.tsx` 或 `chapters/<slug>/styles/` import,跟現在 dogfood 一致,preset 不干預。

---

## 12. Local dev(framework 維護者怎麼開發)

`examples/data-structures-note/package.json`:

```json
{
  "dependencies": {
    "@qdoc/core": "workspace:*"
  }
}
```

npm workspace 自動把 `examples/data-structures-note/node_modules/@qdoc/core` symlink 到 `packages/core/dist/`。

Framework dev loop:

```bash
$ cd qdoc-monorepo
$ npm install                              # 設定 workspace 連結
$ cd packages/core && npm run dev          # watch + rebuild dist/
$ cd ../../examples/data-structures-note
$ npm run dev                              # 用本地 @qdoc/core
```

修 `packages/core/src/**` → `tsc --watch` 重編到 `dist/` → example 立即看到變動。

---

## 13. Publish flow

每個 package 各自 `npm version + npm publish`:

```bash
$ cd packages/core
$ npm version patch                  # bump version
$ npm publish --access public
```

v1 不用 changesets / lerna,純手動。等版本變多再上工具。

CI:

- PR 合進 main → 自動 `npm pack` 驗證 tarball 正確
- Tag `v1.x.x` → GitHub Actions 跑 publish

---

## 14. E2E smoke test

`tests/e2e/init-flow.test.mjs`(新增):

```js
test("npx @qdoc/core init → npm install → qdoc dev 啟動到看到 reader", async () => {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "qdoc-init-e2e-"));
  try {
    // 1. init
    const initRes = spawnSync("node", [CLI, "init", "my-doc"], { cwd: tempDir });
    assert.equal(initRes.status, 0);

    const workspace = path.join(tempDir, "my-doc");

    // 2. install(用 npm pack 出來的 tarball,模擬 user 體驗)
    spawnSync("npm", ["install", "--no-audit", "--no-fund"], { cwd: workspace });

    // 3. 跑 dev 起來,curl 看 reader 載入
    const devProc = spawn("npx", ["qdoc", "dev"], { cwd: workspace });
    await waitForPort(5173);
    const html = await fetch("http://localhost:5173").then((r) => r.text());
    assert.match(html, /<div id="root"|QDoc/);
    devProc.kill();

    // 4. 跑 validate / build
    assert.equal(spawnSync("npx", ["qdoc", "validate"], { cwd: workspace }).status, 0);
    assert.equal(spawnSync("npx", ["qdoc", "build"], { cwd: workspace }).status, 0);
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
});
```

CI 跑這個 test == 過 gate == v1 可 ship。

---

## 15. Migration from current monorepo

從現在 framework repo 切到上述 monorepo,大致順序:

1. **拆 packages 目錄**:`git mv engine/ packages/core/src/cli+engine`、`git mv src/qdoc/ packages/core/src/runtime+react`、`git mv src/styles/ packages/core/src/styles`、`git mv skills/editorial-monograph/ packages/editorial-monograph/`、`git mv 剩下 examples/data-structures-note/`
2. **修 import 路徑**:大量 `path/from/engine` → `@qdoc/core/...`(可寫 codemod 或一次手動)
3. **加 package.json 各份**:packages/core、packages/editorial-monograph、examples/data-structures-note、monorepo root
4. **加 tsconfig 各份**:base 在 packages/core/tsconfig/base.json
5. **加 vite preset**:packages/core/src/vite/index.ts(extract 現有 vite.config.ts 行為)
6. **跑 monorepo install + 確認 dogfood 仍能跑**
7. **加 e2e smoke test**:`tests/e2e/init-flow.test.mjs`
8. **預先 publish @qdoc/core@0.x rc 版本**,跑一次外部 `npx @qdoc/core init` 確認
9. **正式 v1 publish**

預估 **3-4 週**(架構 spec §12.3 已估)。

---

## 16. Open questions

1. **monorepo 工具用什麼?**
   - 純 npm workspaces 簡單但 cache 弱。要不要 turbo / nx?v1 建議純 npm,等慢再上工具
2. **Tailwind v4 preset 怎麼擺?**
   - 是 `@qdoc/core` 一個 sub-export(`@qdoc/core/tailwind`)還是 vite preset 內部自動?目前 vite preset 內 auto-load,user 不寫;但有些 user 想自己控,要不要對外 export?
3. **Inspector 在 prod build 完全 strip 還是 dev-only opt-in?**
   - 架構 spec §10.7 已決議「build 自動 strip」,實作上 vite preset 內 `apply: 'serve'` 即達成。但 `qdoc preview` 是 build output,要不要 inspector?目前傾向不要
4. **`qdoc init` 是不是用 GitHub template repo 取代 starter pack 概念?**
   - 簡化 distribution:user 可以 `gh repo create --template @qdoc/editorial-monograph`。但這跟 npm 流程脫鉤,放棄 placeholder 替換能力。v1 維持 npm + scaffold,GitHub template 留 v1.1
5. **versioning 策略**
   - `@qdoc/core` 跟 `@qdoc/<starter-pack>` 各自獨立?還是一起 lockstep?建議獨立,但 starter pack 的 peer constraint 要鎖 `@qdoc/core ^1`,避免不相容
6. **舊 monorepo 怎麼處理?**
   - 直接 rename 在原 repo 重整?還是新開 `qdoc-monorepo` repo?牽涉 git history。建議原 repo `git mv` 重整,history 保留

---

## 17. Decisions

| Decision | Choice | Confidence |
|---|---|---|
| Package 名 | `@qdoc/core` | High |
| Repo 結構 | npm workspaces monorepo,`packages/` + `examples/` | High |
| CLI 命令名 | `qdoc`(透過 `bin` 提供) | High |
| Starter 分發 | npm package `@qdoc/<pack-name>`,init 從 npm 抓 | High |
| User workspace deps | 只一條:`@qdoc/core` | High |
| Vite preset | `@qdoc/core/vite`,user `vite.config.ts` 內 `qdoc()` 一行啟用 | High |
| TypeScript preset | `@qdoc/core/tsconfig.json`,user `extends` | High |
| Reader chrome CSS | 由 Vite preset 自動 inject,user 不 import | High |
| Playwright 依賴 | `optionalDependencies`,缺時 `qdoc build` 給友善錯誤 | High |
| TypeScript 處理 | `peerDependencies`(user install) | Medium(看 v1 反饋) |
| Tailwind v4 整合 | 內建在 vite preset,可 `qdoc({ tailwind: { preset: false } })` 關掉 | High |
| E2E gate | `tests/e2e/init-flow.test.mjs`,CI 必跑 | High |
| Monorepo 工具 | 純 npm workspaces(v1) | High |
| Publish 方式 | 手動 `npm version + publish`(v1) | Medium |

---

## 18. Appendix A: Before / After file mapping

| Before(現在 repo) | After(`@qdoc/core` 內) |
|---|---|
| `engine/cli.mjs` | `packages/core/src/cli/index.mjs` |
| `engine/commands/*` | `packages/core/src/cli/commands/*` |
| `engine/react/*` | `packages/core/src/engine/react/*` |
| `engine/*.mjs`(其他) | `packages/core/src/engine/*` |
| `src/qdoc/core/*` | `packages/core/src/react/*`(對外 `@qdoc/core`) |
| `src/qdoc/*.ts(x)`(reader runtime) | `packages/core/src/runtime/*`(對外 `@qdoc/core/react`) |
| `src/styles/qdoc/*.css` | `packages/core/src/styles/*.css`(對外 `@qdoc/core/styles/*.css`) |
| `vite.config.ts`(framework root) | extract 邏輯 → `packages/core/src/vite/index.ts`;dogfood 的 vite.config.ts 變 1 行 |
| `tsconfig.json`(framework root) | extract base → `packages/core/tsconfig/base.json`;dogfood extends 它 |
| `skills/editorial-monograph/*` | `packages/editorial-monograph/*` |
| `document/`(dogfood) | `examples/data-structures-note/document/`(不變內容) |
| `qdoc.config.mjs` | 隨 `document/index.tsx`(架構 spec §3.1)— 不再單獨檔 |
| `tests/*` | `tests/`(framework integration)+ `packages/core/src/**/*.test.{ts,mjs}`(unit) |

---

## 19. Appendix B: 下一份 spec 要寫的內容

當這份 v1 通過 + 開工:

1. **`vite-preset-internals.md`** — `@qdoc/core/vite` 的所有 plugin chain 細部設計
2. **`starter-pack-spec.md`** — starter pack(`@qdoc/editorial-monograph`)的 placeholder 替換、檔案結構、版本相容約束
3. **`e2e-smoke-test-design.md`** — `tests/e2e/init-flow.test.mjs` 完整 fixture 設計 + CI 整合
4. **`publish-and-versioning.md`** — npm publish 流程、版本相容、deprecation policy
