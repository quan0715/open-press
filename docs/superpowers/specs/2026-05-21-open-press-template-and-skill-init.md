# Open-Press Workspace Init via Template + SKILL — v1 Spec

> **Naming note**:本 spec 採用新品牌名 **open-press**(取代既有 `openpress` 標識)。
> - GitHub repo: `quan0715/open-press`
> - CLI bin: `openpress`(`openpress dev` / `openpress build` 等)
> - SKILL: `openpress-init` / `openpress-upgrade`
>
> 既有 codebase 內 `openpress` 字眼(`engine/cli.mjs` bin、`AGENTS.md` 措辭、SKILL 檔名等)在 framework restructure migration 階段一次 rename(屬獨立 task,非本 spec 範圍)。

**Status**: Draft for review
**Supersedes**: openpress-era React architecture notes and the previous `@openpress/core` npm-package direction. This spec is the active framework distribution model.

**Goal**: User 開新 workspace 時,AI 跑 SKILL → 從 framework template repo(`quan0715/open-press`)複製出自包 workspace。Framework code 在 user repo 內可見、但有清楚 boundary,user 不該動。升級也由 AI 跑 SKILL 完成。

---

## 1. 為什麼放棄 npm package 路線

原本草稿(已 supersede)是把 engine + runtime 抽成 `@openpress/core` npm 套件。理由:

- ✅ `npm update` 一行升級
- ✅ 非 AI user 也能 `npx init`
- ❌ Framework code 變黑盒,user 無法 read source
- ❌ 想客製要 fork upstream,roundtrip 慢
- ❌ Packaging + publish + CI gate 約 3-4 週工程
- ❌ 跟 open-press「AI-first collaborative authoring」哲學矛盾(假裝 user 是傳統 dev、AI 是輔助)

open-press 已預設 **AI 永遠在 loop**(`AGENTS.md` / `document/memory/` / `/apply-comments` / Inspector 全部 assume AI 在場)。Init 跟升級也走 AI 路徑才同調:

| 操作 | npm 模型 | Template + SKILL 模型 |
|---|---|---|
| 新 workspace | `npx @openpress/core init` | AI 跑 `openpress-init` SKILL |
| 升級 framework | `npm update @openpress/core` | AI 跑 `openpress-upgrade` SKILL |
| 客製 framework 行為 | fork `@openpress/core` + 發新版 | `vite.config.ts` alias shadowing |
| Debug framework bug | 進 `node_modules/` 翻 source | `core/` 在 workspace 內,直接讀 |

Template 模式省掉整段 npm infrastructure(~3 週),代價是 user 真要客製 framework 時走 alias shadowing 而非 fork PR(其實是優點 — fork merge 衝突地獄沒了)。

---

## 2. Workspace 三層責任

```
my-doc/
  core/                         ← framework code(AI 不動、user 不動、升級整批換掉)
    engine/                       MDX compile / pagination / export
    runtime/                      reader runtime + inspector + hooks
    primitives/                   BaseX(BasePage / BaseCoverPage / ... / BaseFigure)
    styles/                       reader chrome CSS + KaTeX 字型
    cli.mjs                       CLI entry(openpress dev / build / validate)
    vite-preset.ts                Vite plugin chain
    tsconfig.base.json            TS base config(user tsconfig extends 它)
    VERSION                       template commit SHA + 日期,upgrade SKILL 比對用
  src/                          ← user 自訂程式碼(可選;客製 framework 行為時才用)
    my-inspector.ts               例:用 vite alias 接管 core/runtime/inspector.ts
  document/                     ← user 文件內容(完全擁有)
    index.tsx                     config + shell JSX exports(Cover / Toc / BackCover)
    chapters/<NN-slug>/           per-chapter folder
    components/                   全域 React components
    theme/                        Tailwind tokens + base CSS
    memory/                       AI context(USER / PROJECT / FEEDBACK / REFERENCES)
    media/                        全域媒體資產
  package.json                  ← user 擁有;scripts 指向 core/cli.mjs;dependencies 不含 @openpress/*
  tsconfig.json                 ← user 擁有;extends "./core/tsconfig.base.json"
  vite.config.ts                ← user 擁有;import preset from "./core/vite-preset.ts"
  AGENTS.md                     ← user 擁有;workspace 規則,含 framework boundary 描述
  .gitignore                    ← user 擁有
```

**三層責任**:
- **`core/`** — framework,upgrade overwrites;user 改了 → 升級會丟,需先搬到 `src/` + alias
- **`src/` + 根目錄 configs** — user 客製空間,upgrade 不動
- **`document/`** — user 文件內容,upgrade 完全不動

---

## 3. Framework boundary 規約

寫進 workspace root `AGENTS.md`:

```markdown
## Framework boundary

`core/` 是 framework 程式碼,在這個 workspace 內視為 read-only。

**規則**:
- AI 不修改 `core/` 內任何檔案。任何「改 framework」需求,先警告 user 並取得 explicit 許可
- `openpress upgrade` SKILL 會 overwrite 整個 `core/`,本機改動會丟失
- 真要客製 framework 行為 → 走 escape hatch(見下)

**Escape hatch**(真要客製 framework 時):

1. **不要**直接編輯 `core/runtime/inspector.ts` 之類的 framework 檔
2. 改成:
   - `src/my-inspector.ts` 寫客製版本(可以 import + 包裝原 framework export)
   - `vite.config.ts` 加 alias 接管:
     ```ts
     resolve: { alias: { './core/runtime/inspector': './src/my-inspector.ts' } }
     ```
3. Framework 升級時 `core/` 整批換新,但 user 的 `src/my-inspector.ts` 跟 alias 不動 → 客製化保留
```

**Boundary 規則一律寫在 root AGENTS.md**,`core/` 內不放第二份(因為各家 AI 工具對子目錄 AGENTS.md 支援度不一)。Root AGENTS.md 必須寫得夠死,讓 AI 一讀完就確立 `core/` 邊界,任何進入 `core/` 的操作都觸發 explicit 跨界檢查。

---

## 4. `openpress-init` SKILL

放在 framework repo 內:`skills/openpress-init/SKILL.md`。User 對 AI 說「幫我建一個 open-press workspace」→ AI 讀此 SKILL → 走流程。

### 4.1 SKILL 內容(虛擬碼)

```markdown
---
name: openpress-init
description: Scaffold a new open-press workspace from the framework template
---

# Init a new open-press workspace

## Step 1: 解析 user 需求

問 user:
- workspace 名稱(資料夾名)
- 文件標題、副標題、作者
- 要用哪個 starter pack(預設 editorial-monograph)

## Step 2: Fetch framework template

從 `quan0715/open-press` repo(GitHub)抓最新版:
- `core/` 整個資料夾
- `skills/<starter-pack>/starter/` 內的 `document/` template

## Step 3: 寫進 target 資料夾

target/
  core/                          ← 整批複製
  document/                      ← 從 starter pack 複製 + placeholder 替換
    index.tsx                      {{TITLE}} → user 給的標題等
    chapters/01-sample/...
    theme/
    memory/                        空殼,提示 user 之後填
  package.json                   ← 從 template 寫入,加 scripts
  tsconfig.json                  ← 從 template,extends ./core/tsconfig.base.json
  vite.config.ts                 ← 從 template,import preset
  AGENTS.md                      ← 從 template,含 framework boundary 段落
  .gitignore                     ← node_modules / dist / public/openpress / .DS_Store

## Step 4: 不跑 npm install

讓 user 自己 `npm install`。印 next steps:
  cd my-doc
  npm install
  node core/cli.mjs dev          # 或 package.json script: `npm run dev`

## Step 5: 報告

- 已 scaffold 哪些檔
- Framework version(讀 core/VERSION)
- Starter pack version
- 下一步建議
```

### 4.2 為何不寫成 CLI(`openpress init`)

- `openpress init` 必須先有 `openpress` 命令 → 必須先 install framework → 雞生蛋
- AI 跑 SKILL 沒這問題 — 直接從 framework repo 抓檔
- 一般 user 第一次接觸 open-press 是「跟 AI 講想做書」,不是「裝個 CLI」

> 仍會在 framework 內保留 `core/cli.mjs init` 命令給已有 workspace 的 user 用(例如想 scaffold 第二本書時,從現有 workspace 跑)。但**主要分發路徑是 SKILL**。

---

## 5. `openpress-upgrade` SKILL

`skills/openpress-upgrade/SKILL.md`。User 對 AI 說「升級 open-press framework」→ AI 跑此 SKILL。

### 5.1 流程

```markdown
# Upgrade open-press framework

## Step 1: Read 現有 version

讀 workspace `core/VERSION` → 知道目前 framework commit SHA。

## Step 2: Fetch upstream latest

從 `quan0715/open-press` repo 抓最新 commit。

## Step 3: Diff

比較 user `core/` vs upstream:
- 預期所有檔案完全一致(user 沒動過)
- 若發現 user 改了 → list 改動的檔,警告 user

## Step 4: 處理 user 改動(若有)

若 user 動過 `core/` 內任何檔:
- 列出改動清單
- 解釋為什麼這違反 framework boundary
- 建議搬到 `src/` + vite alias(escape hatch)
- 取得 user 確認後再升級(否則 abort)

## Step 5: Overwrite core/

`rm -rf core/ && cp -r <upstream>/core/ core/`

## Step 6: 跑驗證

- `node core/cli.mjs validate` — user 的 document/ 在新 framework 下還能 compile?
- 若 validate 失敗 → 列出 breaking changes,建議遷移步驟

## Step 7: 更新 VERSION

把 `core/VERSION` 寫成新的 commit SHA + 日期。

## Step 8: 回報

- 升級前後版本
- Changelog 摘要(從 upstream 抓)
- Validate 結果
- 若有 escape-hatch alias 受影響(framework export 改名),警告 user
```

### 5.2 衝突情境的處理

| 情境 | 處理 |
|---|---|
| User 沒動 `core/` | 直接 overwrite,清爽 |
| User 動了 `core/` | 警告 + 列 diff + 強制 user 先搬到 `src/` + alias 才能升級 |
| Upstream 移除某個 export(breaking) | 升級後 validate fail → 列出受影響的 user 檔 + 遷移建議 |
| Upstream 改 BaseX prop 名 | 同上,但較常見可以提供 codemod hint |

---

## 6. Vite preset / TypeScript preset

跟原 spec 一致,但**ship 方式是 `core/`** 而非 npm:

User `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import openpress from './core/vite-preset.ts';

export default defineConfig({
  plugins: [openpress()],
});
```

User `tsconfig.json`:

```json
{
  "extends": "./core/tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

`@/` 嚴格 = workspace root。常用路徑:
- `@/core/...` → framework
- `@/document/components/...` / `@/document/chapters/...` → user 內容
- 不做 `@/components` 之類 sugar — 顯式路徑讓 import 來源一目了然

Preset 行為跟原 npm spec 完全相同(MDX loader / inspector / pagination 等),只是 import path 從 `@openpress/core/vite` 變 `./core/vite-preset.ts`。

---

## 7. Dependencies(workspace `package.json`)

```json
{
  "name": "my-doc",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node core/cli.mjs dev",
    "build": "node core/cli.mjs build",
    "preview": "node core/cli.mjs preview",
    "validate": "node core/cli.mjs validate"
  },
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
  "devDependencies": {
    "typescript": "^6",
    "@types/node": "^25",
    "@types/react": "^19",
    "@types/react-dom": "^19"
  }
}
```

Differences from npm spec:
- **沒有 `@openpress/core` dep** — framework 是 `./core/` 資料夾
- User `package.json` 列所有 transitive deps(MDX / React / Vite 等),因為 `core/` 直接 import 它們,沒有 npm package 抽象擋著
- Template 一律寫死的 version,init SKILL 不變動,upgrade SKILL 才會跟著 framework 走

---

## 8. Versioning(沒 semver,用 git SHA + date)

- Framework repo 用 git tag(`v1.0.0` / `v1.1.0`)+ commit SHA
- `core/VERSION` 檔內容:`v1.0.0 (sha:abc1234, 2026-05-21)`
- Upgrade SKILL 讀 VERSION → 比對 upstream → 報告版本差
- 沒 `^1.0.0` constraint 概念,因為 user 直接持有 framework code
- Breaking change → upstream tag major bump + 升級 SKILL 警告

> 用 git tag 不用 npm semver 是因為「沒人 install,沒人需要 resolver」。Tag 純粹是 changelog anchor。

---

## 9. Framework repo 維護方

Framework repo `quan0715/open-press` **本身就是一份 open-press dogfood workspace**(open-slide 模式)。沒有「framework repo」跟「example repo」的分離 —— 同一個 repo 既是 framework 規範來源,也是維護者自己寫的 dogfood 書。

```
quan0715/open-press/
  core/                             ← framework code(規範版,user init 時複製)
    engine/
    runtime/
    primitives/
    styles/
    tests/                          ← framework tests(隨 core/ 一起 ship 到 user)
    cli.mjs
    vite-preset.ts
    tsconfig.base.json
    VERSION
  document/                         ← dogfood 內容(就是 data-structures-note 這本書)
    index.tsx
    chapters/
    components/
    theme/
    memory/
    media/
  skills/
    openpress-init/SKILL.md
    openpress-upgrade/SKILL.md
    openpress-apply-comments/SKILL.md
    editorial-monograph/            ← starter pack(含空白 document/ template)
      starter/
        document/                   ← 新 user init 時複製的模板
    <其他 starter packs>/
  docs/superpowers/specs/           ← spec / 規畫文件
  package.json
  tsconfig.json                     ← repo root tsconfig,extends ./core/tsconfig.base.json
  vite.config.ts                    ← repo root vite,import ./core/vite-preset
  AGENTS.md                         ← workspace 規則(framework boundary、commit prefix 規約等)
  CHANGELOG.md
```

**兩個 `document/` 各司其職**:
- Root `document/` — framework 維護者自己寫的 dogfood 書(現在的 data-structures-note)
- `skills/<pack>/starter/document/` — 空白模板,新 user init 時複製

**Self-host loop(零 friction)**:
- 改 `core/` → root `document/` 立即吃到效果(同一個 workspace,沒 symlink / sync 問題)
- 改 root `document/` → 純更新 dogfood 內容,framework 不動
- 改 `skills/<pack>/starter/document/` → 影響新 user init 拿到的初始檔

**Git commit 慣例**(避免 framework 跟 dogfood 變動混亂):
- `[core] ...` — framework 程式碼變動
- `[doc] ...` — dogfood 內容變動
- `[skill] ...` — starter pack / SKILL 變動
- `[spec] ...` — docs/superpowers/ 變動

---

## 10. 從現狀遷移到 template 模式

從現在的 framework repo(`engine/` + `src/openpress/` + `document/` 全混在 root)切到 §9 結構:

```bash
# 1. 建立 core/ 並把 framework code 搬進去
mkdir -p core/{engine,runtime,primitives,styles,tests}
mv engine/* core/engine/                     # MDX compile / pagination / export
mv src/openpress/core/* core/primitives/          # BaseX(從 src/openpress/core/ 移過來)
mv src/openpress/*.{ts,tsx} core/runtime/         # reader runtime / inspector / hooks
mv src/styles/openpress/* core/styles/
mv tests/* core/tests/                       # framework tests(後續會做收斂)

# 2. 抽 vite preset / tsconfig base
# 從現有 vite.config.ts extract → core/vite-preset.ts
# 從現有 tsconfig.json extract → core/tsconfig.base.json
# repo root vite.config.ts / tsconfig.json 改成 thin wrapper

# 3. document/ 不動(已在 root,就是 dogfood)

# 4. skills/ 重整
mv skills/openpress-* skills/openpress-*         # rename
# starter pack 結構整理(若還有舊 layout 殘留)

# 5. Rename openpress → openpress
# - CLI bin: engine/cli.mjs → core/cli.mjs;package.json bin name: openpress → openpress
# - AGENTS.md 全文 rename "open-press" → "open-press"
# - SKILL 內文 / CLI usage 字眼

# 6. 寫 openpress-init + openpress-upgrade SKILLs
# 7. 跑 root document/ 確認 framework boundary 後仍 work
# 8. Git tag v1.0.0
```

預估 **1-1.5 週**(對比原 npm spec 的 3-4 週,省掉 publish + CI gate 整段;加 brand rename 工序)。

---

## 11. 跟原架構 spec 的對齊

原架構 spec(2026-05-20)寫的某些段落要在本 spec 通過後跟著更新:

| 原架構 spec 位置 | 需要改的內容 |
|---|---|
| §2 三層架構,Layer 1 描述 `@openpress/core(npm dependency)` | 改成 `core/(workspace 內 framework folder)` |
| §3.1 `document/index.tsx` 範例的 `import { ... } from '@openpress/core'` | 改成 `import { ... } from './core/primitives'` 或保留 `@openpress/core` 當 tsconfig alias(指向 `./core/`) |
| §8 Style pack 描述「不是 npm dep」 | 已對 — 但要補充 starter pack 也是 framework repo 內的 `skills/<pack>/`,init SKILL 從那抓 |
| Appendix B item 1 `engine-core-package-extraction.md` | 改 `framework-template-and-init-skill-extraction.md`(對應本 spec) |
| Decisions table 內「Style pack 是 scaffold-only,不是 npm dep」 | 已對,不用改 |
| Decisions table 內 framework 分發機制 | 新增一條:「Template + SKILL 模式,framework 在 user workspace 內以 `core/` 資料夾形式存在」 |

**這份 spec 通過 → 架構 spec 跟一次更新(換掉 `@openpress/core` 用詞跟相關小段)**。

---

## 12. Open questions

1. ~~`core/` 內 import 路徑用 alias 還是相對路徑?~~ **已決議:Workspace root alias(B)**
   - `@/` 嚴格對應 workspace root,沒 baseUrl trick / 沒額外 sugar
   - 用法:
     ```ts
     import { BasePage } from '@/core/primitives';       // framework
     import { Cover } from '@/document/components';      // user 全域 component
     import data from '@/document/chapters/04-linked-list/data.json';  // user 內容資料
     ```
   - 設定:
     ```json
     // tsconfig.json
     { "compilerOptions": { "paths": { "@/*": ["./*"] } } }
     ```
     ```ts
     // vite preset 內部
     resolve: { alias: { '@/': fileURLToPath(new URL('./', import.meta.url)) } }
     ```
   - **架構 spec §3 的 `@/components` 縮寫要跟著更新成 `@/document/components`**(顯式寫出來)

2. ~~`core/AGENTS.md` 對所有 AI 都生效嗎?~~ **已決議:Root-only(B)**
   - **只信 root `AGENTS.md`**,`core/` 內不放第二份
   - 理由:子目錄 AGENTS.md 各家 AI 工具支援度不一(Cursor / Codex / Aider 多半 root-only),雙寫只是給 Claude Code 看,其他工具看不到等於沒寫
   - Root AGENTS.md 必須明確列出 `core/` boundary,規則寫得**夠死**讓 AI 一讀就知道

3. ~~Framework 維護者怎麼 publish 新版?~~ **已決議**
   - **Tag**:SemVer(`v1.2.3`),major bump = breaking change
   - **Changelog**:Keep-a-Changelog 格式 `CHANGELOG.md`,但有膨脹控制:
     - Root `CHANGELOG.md` 只保留**最新 10 個版本**(約 6 個月節奏)
     - 老版本歸檔到 `docs/changelog/v0.x.md` / `v1.x.md`(major series 一份)
     - 每個版本條目硬限制:每個 section(Added / Changed / Removed / Fixed)最多 3 個 bullet,每個 bullet 一行 ≤ 100 字符,詳情走 PR link 不重述
   - **Breaking change**:major bump + changelog 內 `### Breaking changes` 段落 + 獨立 `docs/migration/v2-from-v1.md`(限 major bump 才寫)
   - `openpress-upgrade` SKILL 解析流程:
     1. 讀 `core/VERSION` 知道現版
     2. Fetch upstream tags 看最新版
     3. CHANGELOG.md 含現版區段 → inline 抓差;不含(現版太舊) → fetch `docs/changelog/vN.x.md` 對應檔
     4. Major bump 再讀 `docs/migration/vN-from-v(N-1).md`

4. ~~Starter pack 也用 `core/` 同等的「不能改」邊界嗎?~~ **已決議:不(A)**
   - Starter pack 是 init 時**一次性複製**,之後 `document/*` 內容全是 user 擁有的
   - `openpress-upgrade` 升 framework 時**完全不動** `document/` / `src/` / `package.json`(只動 `core/`)
   - User 想看新版 starter pack 長怎樣 → 重新 `openpress init` 到別處比較,而非 in-place 合併
   - **例外:framework 維護者**身份不同 — 在 framework repo 內維護 starter pack 時,需要跟 `examples/data-structures-note/document/` 保持對齊(因為要 dogfood 驗證 starter pack 出來的結果),這是維護者責任不是 user 責任

5. **`core/` 內測試怎麼處理?**
   - Framework repo 的 tests 不複製到 user — 它們是 framework 維護者的測試
   - User workspace 沒有 framework 測試;但 user 跑 `openpress validate` 等於跑「我的 document 在這份 framework 下能不能 compile」
   - 確認:user workspace **不**會有 `tests/framework-react-*.test.mjs` 之類

6. ~~Examples / dogfood 在 framework repo 內的 `core/` 是 symlink 還是 copy?~~ **整題消滅(已採 open-slide 模式)**
   - Framework repo 本身就是 dogfood workspace,**沒有 `examples/`、沒有兩份 `core/`**,自然沒 symlink / copy 取捨
   - 改 `core/` 後 root `document/` 立即吃到效果(同一個 workspace)

7. ~~Framework repo 名~~ **已決議:`quan0715/open-press`**
   - Repo name: `open-press`,個人 namespace 下
   - Brand: `open-press` 取代 `openpress`(全 codebase rename 屬 migration task)
   - CLI bin: `openpress`(不帶 hyphen,跟 `eslint` 等慣例)
   - SKILL: `openpress-init` / `openpress-upgrade` / `openpress-apply-comments`

8. **若 user 真的修了 `core/` 然後想 push 回 framework upstream?**(本來的 Q7,挪後)
   - 流程:fork `quan0715/open-press` → 把客製改動套進 `core/` → PR
   - 這是 framework 貢獻流程,不是 user workspace 日常流程
   - User-facing 文檔需要寫清楚兩種角色差別

---

## 13. Decisions

| Decision | Choice | Confidence |
|---|---|---|
| Framework 分發 | Template + SKILL(無 npm publish) | High |
| Framework 在 workspace 內位置 | `core/` 資料夾(workspace root 同級) | High |
| Framework boundary 強制 | Root `AGENTS.md` 規約(only — 不放 `core/AGENTS.md`,避免子目錄支援度差異)| High |
| Framework 升級 | `openpress-upgrade` SKILL,overwrite `core/` | High |
| User 客製 framework 行為 | `src/` + vite alias shadowing,**不** fork `core/` | High |
| Framework 版本標示 | Git tag + `core/VERSION` 檔(SHA + date) | High |
| Init 主要分發路徑 | AI 跑 `openpress-init` SKILL | High |
| `openpress init` CLI 命令 | 保留(給已有 workspace 的 user 用),非主要路徑 | Medium |
| User package.json deps | 列出所有 transitive(MDX / React / Vite 等) | High |
| Playwright | `optionalDependencies`(同原 spec) | High |
| Starter pack | Framework repo 內 `skills/<pack>/`,init SKILL 從那抓 + placeholder 替換 | High |
| Framework repo 結構 | repo 本身就是 dogfood workspace(open-slide 模式),沒 `examples/`,root `document/` = dogfood | High |
| Versioning | Git tag + changelog,沒 npm semver | High |
| Framework repo 名 | `quan0715/open-press` | High |
| Brand name | `open-press`(取代既有 `openpress`),CLI bin `openpress`,SKILL 命名 `openpress-*` | High |

---

## 14. Appendix A: User workspace 範例(完整 tree)

```
my-doc/
  .git/
  .gitignore
  AGENTS.md                                    ← workspace 規則
  README.md                                    ← user 自己寫
  package.json
  tsconfig.json
  vite.config.ts
  package-lock.json
  node_modules/                                ← gitignored

  core/                                        ← framework(read-only,boundary 由 root AGENTS.md 強制)
    VERSION
    cli.mjs
    vite-preset.ts
    tsconfig.base.json
    engine/
      react/
      pagination/
      validation/
    runtime/
      readerRuntime.ts
      inspector.ts
      publicPage.tsx
      ...
    primitives/
      BasePage.tsx
      BaseCoverPage.tsx
      ...
    styles/
      reader-runtime.css
      base.css
    fonts/
      katex/*.woff2

  src/                                         ← user 客製空間(可選,空也行)
    (e.g.) my-inspector.ts                     ← 用 alias 接管 framework 行為

  document/                                    ← user 文件內容
    index.tsx                                  ← config + Cover / Toc / BackCover exports
    design.md
    chapters/
      04-linked-list/
        chapter.tsx
        content/
          01-list-and-node.mdx
        components/
        media/
        styles/
    components/
      Page.tsx
      Cover.tsx
      Toc.tsx
      BackCover.tsx
    theme/
      tokens.css
      base/
      fonts/
    memory/
      USER.md
      PROJECT.md
      FEEDBACK.md
      REFERENCES.md
      references/
    media/

  public/                                      ← Vite static assets(gitignored 後半)
    openpress/                                      ← build output
```

---

## 15. Appendix B: 下一份 spec 要寫的內容

當這份 v1 通過 + 開工:

1. **`framework-repo-restructure.md`** — 現有 repo 怎麼 `git mv` 重整成 framework repo + examples/ + skills/(對應 §10 的搬遷腳本完整化)
2. **`openpress-init-skill-detail.md`** — `openpress-init` SKILL 完整內容,含 placeholder 列表、starter pack 選擇 UI、錯誤處理
3. **`openpress-upgrade-skill-detail.md`** — `openpress-upgrade` SKILL 完整內容,含 diff 演算法、breaking change 偵測、escape-hatch 衝突處理
4. **`vite-preset-internals.md`** — `core/vite-preset.ts` 所有 plugin chain 細部
5. **`starter-pack-contract.md`** — Starter pack 該有的檔、placeholder 命名規約、跟 framework version 的相容性宣告
