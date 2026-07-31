# Optional Explanatory Visuals Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire OpenPress-owned Chinese writing polish, make the seven workflow skills the explicit default bundle, and add an opt-in explanatory-visuals skill with safe lockfile-backed installation.

**Architecture:** Keep provider choice and visual judgment in `openpress-explanatory-visuals`; keep OpenPress core limited to deterministic skill installation, lock migration, agent-link verification, and existing media/render primitives. The default installer names seven skills explicitly, while tracked optional OpenPress skills join later sync plans.

**Tech Stack:** Node.js 20 ESM, TypeScript, Node test runner, pnpm monorepo, Vercel Labs `skills@1.5.18`, Markdown agent skills.

## Global Constraints

- Ship in Draft PR #87 targeting `dev`; do not merge to `main`.
- Keep the release changeset at patch level for 3.1.1 as explicitly requested.
- Never delete an existing workspace's retired skill directories automatically.
- Retire `chinese-ai-writing-polish` and `openpress-diagram-drawing` only when their normalized source is `quan0715/open-press`.
- Image Gen always requires explicit user approval; SVG creation does not.
- Do not add an image provider SDK or credentials to framework code.
- Do not add `skills:list`, `skills:remove`, or unrelated CLI management commands.

---

### Task 1: Explicit Framework Bundle and Retired Lock Migration

**Files:**
- Modify: `packages/core/tests/skills-sync.test.mjs`
- Modify: `packages/core/engine/runtime/skills-tool.mjs`
- Modify: `packages/core/engine/commands/skills-sync.mjs`

**Interfaces:**
- Produces: `DEFAULT_FRAMEWORK_SKILL_NAMES`, `OPTIONAL_FRAMEWORK_SKILLS`, `pruneRetiredFrameworkSkills(root, lock, { apply })`, and a sync plan containing seven defaults plus tracked official optionals.
- Consumes: existing v1 lock parsing, source normalization, atomic filesystem operations, and post-sync inspection.

- [ ] **Step 1: Write failing default-bundle and tracked-optional tests**

```js
test("skills:sync installs seven default skills and tracked official optionals", async () => {
  await writeLock(root, {
    openpress: frameworkEntry("openpress"),
    "openpress-explanatory-visuals": frameworkEntry("openpress-explanatory-visuals"),
  });
  const result = runCli(root, ["skills:sync", root, "--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--skill openpress openpress-apply-comments openpress-collaborate openpress-create-pages openpress-create-slide openpress-deploy openpress-upgrade openpress-explanatory-visuals/);
  assert.doesNotMatch(result.stdout, /--skill '\*'/);
});
```

- [ ] **Step 2: Write failing retirement tests**

```js
test("skills:sync untracks retired OpenPress Chinese skill without deleting local files", async () => {
  await writeLock(root, {
    "chinese-ai-writing-polish": frameworkEntry("chinese-ai-writing-polish"),
    openpress: frameworkEntry("openpress"),
  });
  await writeInstalledSkill(root, "chinese-ai-writing-polish");
  const result = runCli(root, ["skills:sync", root], fakeNpxEnv(root));
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const lock = JSON.parse(await fs.readFile(path.join(root, "skills-lock.json"), "utf8"));
  assert.equal(lock.skills["chinese-ai-writing-polish"], undefined);
  assert.equal(await exists(path.join(root, ".agents/skills/chinese-ai-writing-polish/SKILL.md")), true);
});

test("skills:sync preserves a same-named skill owned by another source", async () => {
  await writeLock(root, {
    "chinese-ai-writing-polish": externalEntry("acme/language-skills"),
  });
  const result = runCli(root, ["skills:sync", root, "--dry-run"]);
  assert.match(result.stdout, /acme\/language-skills --skill chinese-ai-writing-polish/);
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `node --test packages/core/tests/skills-sync.test.mjs`

Expected: FAIL because sync still emits `--skill '*'`, has no retirement rewrite, and treats all framework-source entries identically.

- [ ] **Step 4: Implement minimal bundle planning and retirement migration**

```js
export const DEFAULT_FRAMEWORK_SKILL_NAMES = Object.freeze([
  "openpress",
  "openpress-apply-comments",
  "openpress-collaborate",
  "openpress-create-pages",
  "openpress-create-slide",
  "openpress-deploy",
  "openpress-upgrade",
]);

export const OPTIONAL_FRAMEWORK_SKILLS = Object.freeze({
  "explanatory-visuals": "openpress-explanatory-visuals",
});

const RETIRED_FRAMEWORK_SKILLS = new Set([
  "chinese-ai-writing-polish",
  "openpress-diagram-drawing",
]);
```

Build the first add step from the seven defaults plus non-retired framework
skills present in the lock. Implement `pruneRetiredFrameworkSkills` with
`skills-lock.json.tmp` plus `rename`, preserving unrelated lock fields and
leaving `.agents` and `.claude` untouched. Dry-run filters retired entries but
does not write.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test packages/core/tests/skills-sync.test.mjs`

Commit:

```bash
git add packages/core/engine/runtime/skills-tool.mjs packages/core/engine/commands/skills-sync.mjs packages/core/tests/skills-sync.test.mjs
git commit -m "[core] make framework skills explicit and retire polish"
```

### Task 2: Opt-In Explanatory Visuals Install Command

**Files:**
- Create: `packages/core/engine/commands/skills-add.mjs`
- Modify: `packages/core/engine/cli.mjs`
- Modify: `packages/core/engine/runtime/skills-tool.mjs`
- Modify: `packages/core/tests/skills-sync.test.mjs`

**Interfaces:**
- Consumes: `OPTIONAL_FRAMEWORK_SKILLS`, `createAddStep`, `runCommand`, `inspectProjectSkills`.
- Produces: `open-press skills add explanatory-visuals [path] [--dry-run]` and the core `skills:add` equivalent with non-zero unknown-alias and incomplete-install behavior.

- [ ] **Step 1: Write failing command tests**

```js
test("skills:add installs and verifies explanatory visuals", async () => {
  const result = runCli(root, ["skills:add", "explanatory-visuals", root], env);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.deepEqual(readCalls(), [[
    "--yes", "skills@1.5.18", "add", "quan0715/open-press",
    "--skill", "openpress-explanatory-visuals",
    "--agent", "universal", "claude-code", "--yes",
  ]]);
});

test("skills:add rejects unknown aliases", async () => {
  const result = runCli(root, ["skills:add", "unknown", root]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Supported: explanatory-visuals/);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test packages/core/tests/skills-sync.test.mjs`

Expected: FAIL with `Unknown command: skills:add`.

- [ ] **Step 3: Implement command normalization and handler**

```js
if (commandName === "skills:add") normalizeSkillsAddOptions(options);

function normalizeSkillsAddOptions(options) {
  options.skillAlias = options.positional?.[0];
  options.path = options.positional?.[1] ?? ".";
}
```

The handler resolves only `explanatory-visuals`, executes one pinned add step,
then requires the skill in both `skillsTracked` and the canonical/link
inspection result. `--dry-run` prints the exact command without mutation.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test packages/core/tests/skills-sync.test.mjs`

Commit:

```bash
git add packages/core/engine/cli.mjs packages/core/engine/commands/skills-add.mjs packages/core/engine/runtime/skills-tool.mjs packages/core/tests/skills-sync.test.mjs
git commit -m "[core] add optional explanatory visuals installer"
```

### Task 3: Scaffold the Seven-Skill Default

**Files:**
- Modify: `packages/create/tests/create.test.mjs`
- Modify: `packages/create/src/index.ts`

**Interfaces:**
- Consumes: the same literal seven-skill public contract as core.
- Produces: non-interactive scaffolding that never installs optional repository skills.

- [ ] **Step 1: Change the scaffolder test to expect seven explicit names**

```js
assert.deepEqual(calls[0], [
  "--yes", "skills@1.5.18", "add", "quan0715/open-press", "--skill",
  "openpress", "openpress-apply-comments", "openpress-collaborate",
  "openpress-create-pages", "openpress-create-slide", "openpress-deploy",
  "openpress-upgrade", "--agent", "universal", "claude-code", "--yes",
]);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm --filter @open-press/create build && node --test packages/create/tests/create.test.mjs`

Expected: FAIL because the scaffolder still emits `--skill '*'`.

- [ ] **Step 3: Replace the wildcard with a typed constant**

```ts
const FRAMEWORK_SKILL_NAMES = [
  "openpress",
  "openpress-apply-comments",
  "openpress-collaborate",
  "openpress-create-pages",
  "openpress-create-slide",
  "openpress-deploy",
  "openpress-upgrade",
] as const;
```

Spread the names after `--skill` and before `--agent`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm --filter @open-press/create build && node --test packages/create/tests/create.test.mjs`

Commit:

```bash
git add packages/create/src/index.ts packages/create/tests/create.test.mjs
git commit -m "[core] scaffold the seven-skill default bundle"
```

### Task 4: Replace Legacy Skills and Update Routing

**Files:**
- Delete: `skills/chinese-ai-writing-polish/SKILL.md`
- Rename: `skills/openpress-diagram-drawing/` to `skills/openpress-explanatory-visuals/`
- Modify: `skills/openpress-explanatory-visuals/SKILL.md`
- Modify: `skills/openpress-explanatory-visuals/references/diagram-patterns.md`
- Modify: `skills/openpress/SKILL.md`
- Modify: `skills/openpress-create-pages/SKILL.md`
- Modify: `skills/openpress-apply-comments/SKILL.md`

**Interfaces:**
- Consumes: existing `MediaFigure`, `MediaObject`, `Media`, `MediaCaption`, caption numbering, and workspace source boundaries.
- Produces: an opt-in procedural contract for explanatory SVG and approval-gated Image Gen.

- [ ] **Step 1: Rename/delete the skill directories**

```bash
git mv skills/openpress-diagram-drawing skills/openpress-explanatory-visuals
git rm skills/chinese-ai-writing-polish/SKILL.md
```

- [ ] **Step 2: Rewrite the new skill contract**

The frontmatter name is `openpress-explanatory-visuals`. The workflow contains
the exact decision order from the design, React SVG destination,
`press/<slug>/media/figures/<name>.png`, Image Gen approval gate, no generated
text rule, accessibility/caption requirements, provider-neutral fallback, and
build/visual review gate.

- [ ] **Step 3: Update routing and ownership references**

`openpress` routes explanatory visual work only when the optional skill is
installed. `openpress-create-pages` no longer requires the Chinese writing
skill. `openpress-apply-comments` uses the new skill name for visual semantics.

- [ ] **Step 4: Audit active legacy references**

Run:

```bash
rg -n "chinese-ai-writing-polish|openpress-diagram-drawing" README.md docs packages skills
```

Expected: only intentional migration-history mentions remain.

- [ ] **Step 5: Commit**

```bash
git add skills
git commit -m "[skill] replace diagram drawing with explanatory visuals"
```

### Task 5: Documentation, Migration, Release Metadata, and Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/skills.md`
- Modify: `docs/starter-skill-authoring.md`
- Modify: `docs/migrations/3.1.1.md`
- Modify: `packages/cli/README.md`
- Modify: `skills/openpress-upgrade/SKILL.md`
- Modify: `.changeset/quiet-skills-links.md`
- Modify: PR #87 metadata

**Interfaces:**
- Consumes: all completed behavior and test evidence.
- Produces: accurate user-facing install/migration guidance and a verified Draft PR.

- [ ] **Step 1: Update public documentation and migration guidance**

Document the seven defaults, optional install command, retired-skill lock
migration, untouched local directories, explanatory-visual boundaries, and
3.1.1 patch behavior. Remove claims that sync installs every repository skill.

- [ ] **Step 2: Update the existing patch changeset**

Keep all three packages at `patch` and describe explicit defaults, optional
visual installation, safe retirement, v1 lock refresh, and agent links.

- [ ] **Step 3: Run focused and full verification**

```bash
node --test packages/core/tests/skills-sync.test.mjs
pnpm --filter @open-press/create build
node --test packages/create/tests/create.test.mjs
pnpm run typecheck
pnpm test
pnpm build
npx --yes node@20 --test packages/core/tests/skills-sync.test.mjs
pnpm changeset status
git diff --check
```

Run one real temporary-workspace install with `skills@1.5.18`; confirm all
seven defaults, then install `explanatory-visuals` and confirm the v1 lock plus
canonical/Claude links.

- [ ] **Step 4: Review GitHub issue scope**

Re-query open issues. Keep #64 open because screenshot parity is unrelated.
Close no issue unless its complete acceptance criteria match the verified diff.

- [ ] **Step 5: Commit, push, and update Draft PR #87**

```bash
git add README.md docs packages/cli/README.md skills/openpress-upgrade/SKILL.md .changeset/quiet-skills-links.md
git commit -m "[doc] document optional explanatory visuals"
git push
```

Update the PR summary, skill inventory, verification commands, 3.1.1 changeset,
and #86 rebase dependency. Keep it Draft.
