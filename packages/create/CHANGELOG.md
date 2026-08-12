# @open-press/create

## 3.1.3

### Patch Changes

- 6867af4: Consolidate local serving on Vite for both development and preview. Export, inspection, deployment status, and built-site preview now share the same endpoint implementation with HTTP-based startup readiness, while document export runs in an isolated process so long-running development sessions remain stable.

## 3.1.2

## 3.1.1

### Patch Changes

- 98f13b5: Move workspace configuration and Appearance into versioned `openpress/settings.json`, add safe legacy migration and local persistence, and keep long figure/table directory titles compact with accessible overflow tooltips.
- eacab81: Align skill installation, lockfile refresh, and agent links with the current
  skills tool while retaining Node.js 20 support. Install seven explicit default
  workflow skills, add the opt-in explanatory visuals workflow, and safely
  untrack retired OpenPress skills without deleting local files.

## 3.1.0

## 3.0.3

## 3.0.2

## 3.0.1

## 3.0.0

## 2.0.5

## 2.0.4

### Patch Changes

- 4fcd954: Clean the workspace object authoring API around frame keys, labels, theme tokens, and slide template scaffolds.

## 2.0.3

## 2.0.2

## 2.0.1

### Patch Changes

- e8e1bbf: Fix `SlideProtocol` import path in scaffolded `slide.tsx` (`../../layouts/` instead of `../layouts/`)

## 2.0.0

### Major Changes

- Release the workspace bootstrapper as part of OpenPress 2.0. New workspaces depend on the matching `@open-press/core` and `@open-press/cli` versions, so the package-owned runtime, Tailwind setup, and slide protocol guidance stay aligned.
