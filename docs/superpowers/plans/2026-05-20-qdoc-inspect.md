# open-press Inspect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first CLI version of `qdoc inspect` plus machine-readable issue reports for `validate`, with overflow detection reported as warnings.

**Architecture:** `validate` and `inspect` share a small issue-report formatter. `inspect` performs source-level checks directly and uses the existing static-server + Chrome DevTools path to measure rendered print pages. Overflow is detected and located, not auto-fixed.

**Tech Stack:** Node ESM CLI, existing open-press engine modules, Chrome DevTools protocol, `node:test`.

---

### Task 1: Report Contract Tests

**Files:**
- Modify: `tests/framework-cli.test.mjs`
- Create: `tests/framework-inspection.test.mjs`

- [x] Add a failing CLI test that `validate --json` emits `{ kind, ok, checked, issues }`.
- [x] Add a failing CLI test that `inspect --dry-run` exists and shows render/static-server/Chrome inspection steps.
- [x] Add a failing unit test that overflow measurements become page-level warning issues with source metadata.
- [x] Run `node --test tests/framework-cli.test.mjs tests/framework-inspection.test.mjs` and confirm the failures are for missing `--json`, missing `inspect`, and missing inspection module.

### Task 2: Shared Issue Report

**Files:**
- Create: `engine/issue-report.mjs`
- Modify: `engine/validation.mjs`
- Modify: `engine/commands/validate.mjs`
- Modify: `engine/commands/_shared.mjs`

- [x] Add `createIssueReport()`, `formatIssueReport()`, and `exitCodeForIssueReport()`.
- [x] Keep the existing human-readable validation output stable.
- [x] Add `--json` parsing and make `validate --json` print machine-readable reports.
- [x] Run the focused tests and confirm the JSON validation test passes.

### Task 3: Inspect Command Skeleton

**Files:**
- Create: `engine/inspection.mjs`
- Create: `engine/commands/inspect.mjs`
- Modify: `engine/cli.mjs`

- [x] Add `inspect` to the CLI command map and help text.
- [x] Implement `inspect --dry-run` without launching Chrome.
- [x] Add source checks for empty Markdown, unused media, and component usage summary.
- [x] Run focused tests and confirm the dry-run test passes.

### Task 4: Overflow Measurement

**Files:**
- Modify: `engine/chrome-pdf.mjs`
- Modify: `engine/commands/_shared.mjs`
- Modify: `engine/inspection.mjs`

- [x] Export a reusable Chrome URL evaluation helper.
- [x] Export static-server startup for reuse by inspect.
- [x] Add print-view inspection that waits for pagination, fonts, and images, then measures page-body, page-frame, table, image, pre, and component overflow.
- [x] Map measurements to warning issues with page number, source file/path, suspect selector, and overflow pixels.
- [x] Run focused tests and `node engine/cli.mjs inspect tests/fixtures/e2e-reader --no-build --json` after rendering the fixture.

### Task 5: Verification

**Files:**
- No planned code changes.

- [x] Run `npm run test:node`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run test:react`.
- [x] Run `npm run test:e2e:reader` if Playwright browser remains installed.
