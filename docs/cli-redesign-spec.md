# Spec: OpenPress CLI Scaffolding Redesign (`create` Bootstrapper + Local `create`)

## 1. Context & Problem

Currently, the `open-press init <target> --type <pages|slides>` command carries a heavy dual-responsibility:
1. **Workspace Environment Setup**: Generates `package.json`, `.gitignore`, and triggers network-bound tasks (`npm install`, `git init`, agent skill syncing).
2. **First Press Generation**: Generates the underlying file tree for the document (`press.tsx`, components, themes).

**The UX Friction**: A user's mental model centers around creating a document ("I want to write a slide deck"). The workspace is merely the underlying engine. The bundled `init` approach works wonderfully for from-scratch initialization, but fails dramatically when a user attempts to add a *second* document to an existing workspace (resulting in a "target directory not empty" error).

## 2. Proposed Architecture

Aligning with modern Node.js ecosystem conventions (e.g., `create-next-app`, `create-vite`), we will decompose this behavior into two separate tools:

1. **The Global Bootstrapper**: `@open-press/create` (invoked via `npm create @open-press`)
2. **The Local Expander**: `open-press create` (invoked via `npx open-press create`)

---

### 2.1 The Global Bootstrapper (`@open-press/create`)

This is a standalone, lightweight, globally accessible bootstrapper. It leverages npm's built-in `create` alias.

* **Invocation**: `npm create @open-press <target> -- --type slides`
* **Role**: Zero-to-One Project Setup.
* **Package Contents**:
  * `package.json` (Name: `@open-press/create`, Bin: `./dist/index.js`).
  * Minimal dependencies (`prompts` for interactive setups).
  * No core rendering engine logic.
* **Core Responsibilities**:
  1. **Workspace Files**: Writes `package.json` with `@open-press/core` and `@open-press/cli` as dependencies, and writes `.gitignore`.
  2. **First Press Scaffold**: Generates the initial press file tree under `<target>/press/<target-name>/` using the slides template (see Section 3).
  3. **Network Tasks**: Automatically runs `npm install`.
  4. **Agent Skill Sync**: Executes `npx -y skills@latest add quan0715/open-press` to initialize the `.agents/skills` repository. This installs the 5 core OpenPress skills: `openpress`, `openpress-create-slide`, `openpress-create-pages`, `openpress-apply-comments`, and `openpress-deploy`. Run `open-press skills:sync` at any time to refresh them.
  5. **Git Setup**: Runs `git init` and the initial commit.

> **Interactive mode**: If `--type` is omitted, the command prompts the user to select a type. When `--type` is provided, that prompt is skipped and execution proceeds immediately — suitable for scripts and CI.

---

### 2.2 The Local Expander (`open-press create`)

This is a sub-command added to the existing `@open-press/cli` package, meant to be run *inside* an already initialized OpenPress workspace.

* **Invocation**: `npx open-press create <name> --type slides`
* **Role**: One-to-N Entity Expansion.
* **Package Context**: Shipped within `@open-press/cli`.
* **Core Responsibilities**:
  1. **Safety Check**: Verify the current working directory is a valid OpenPress workspace by checking for a `package.json` that lists `@open-press/core` as a dependency. Exit with a clear error if not found.
  2. **Press Scaffold**: Generate the new independent file tree strictly within `press/<name>/` (`press.tsx`, `slides/`, `themes/`).
  3. **Millisecond Execution**: Completely bypasses all network-bound tasks. It does *not* modify `package.json`, does *not* run `npm install`, and does *not* re-sync Agent Skills (since the workspace already has `.agents/skills` populated from the creation step).

> **Interactive mode**: If `--type` is omitted, the command prompts the user to select a type. When `--type` is provided, that prompt is skipped and execution proceeds immediately — suitable for scripts and CI.

## 3. Scaffold Templates

### 3.1 `--type slides` (supported in v1)

Directory tree produced under `press/<name>/`:

```
press/<name>/
  slides/
    intro/
      slide.tsx
  themes/
    default.css
  press.tsx
```

**`press.tsx`** — ordered index, hand-authored:

```tsx
import { Press, Slide } from "@open-press/core";

export default function Deck() {
  return (
    <Press>
      <Slide id="intro" />
    </Press>
  );
}
```

**`slides/intro/slide.tsx`** — stub slide:

```tsx
import type { SlideMeta } from "@open-press/core";

export const meta = {
  layout: "default",
  description: "Intro slide",
} satisfies SlideMeta;

export default function Slide() {
  return <div>Start here.</div>;
}
```

**`themes/default.css`** — empty theme placeholder:

```css
/* press/<name> theme */
```

> Full folder-per-slide conventions (meta fields, layout contract, validation rules) are defined in `docs/superpowers/specs/2026-06-09-slides-folder-architecture.md`.

### 3.2 `--type pages` (deferred)

Not supported in v1. Selecting `pages` should exit with a clear "not yet supported" error.

---

## 4. Implementation Plan

1. **Create the `@open-press/create` package**
   * Initialize a new package at `packages/create`.
   * Extract the scaffolding logic from `packages/cli/src/init.ts` into this new package.
   * Add interactive `prompts` to guide users who run the command without arguments.
   * Publish as `@open-press/create`.

2. **Refactor `@open-press/cli`**
   * Delete `init.ts` from the CLI (no deprecation shim needed).
   * Add `packages/cli/src/create.ts` implementing the new `create` command.
   * Expose `create` in the CLI's help menu and entry point.

3. **Update Official Documentation**
   * Update the "Getting Started" guide in `docs/` and the dogfood workspace to replace `open-press init` with `npm create @open-press`.
   * Document the new `open-press create` command for expanding an existing workspace.
