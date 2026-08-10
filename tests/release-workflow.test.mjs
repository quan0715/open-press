import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function read(path) {
  return readFileSync(new URL(path, `file://${root}/`), "utf8");
}

test("CI treats dev as the integration branch and gates pull requests to main", () => {
  const workflow = read(".github/workflows/ci.yml");

  assert.match(workflow, /push:\s*\n\s*branches:\s*\[main, dev\]/);
  assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\[main, dev\]/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /github\.base_ref == 'main'/);
  assert.match(workflow, /release\/\*/);
  assert.match(workflow, /git merge-base --is-ancestor "\$release_parent" origin\/dev/);
  assert.match(workflow, /git merge-base --is-ancestor origin\/main "\$release_parent"/);
  assert.match(workflow, /git diff --name-only HEAD\^ HEAD/);
  assert.match(workflow, /git show "HEAD\^:\$\{path\}"/);
  assert.match(workflow, /validate_manifest packages\/core\/package\.json/);
  assert.match(workflow, /del\(\.version\)/);
  assert.match(workflow, /npm view "@open-press\/core@\$\{version\}"/);
});

test("Changesets compares feature work against dev", () => {
  const config = JSON.parse(read(".changeset/config.json"));

  assert.equal(config.baseBranch, "dev");
});

test("prepare-release versions dev on a temporary release branch and opens a main PR", () => {
  const workflow = read(".github/workflows/prepare-release.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /ref:\s*dev/);
  assert.match(workflow, /pnpm changeset version/);
  assert.match(workflow, /release\/\$\{VERSION\}/);
  assert.match(workflow, /gh pr create[\s\S]*--base main/);
  assert.match(workflow, /gh workflow run ci\.yml[\s\S]*--ref "release\/\$\{VERSION\}"/);
  assert.match(workflow, /git ls-remote[\s\S]*"release\/\$\{VERSION\}"/);
  assert.match(
    workflow,
    /gh pr list[\s\S]*--head "release\/\$\{VERSION\}"/,
  );
});

test("main publishes pre-versioned packages without opening a Changesets version PR", () => {
  const workflow = read(".github/workflows/release.yml");

  assert.match(workflow, /branches:\s*\n\s*-\s*main/);
  assert.match(workflow, /pnpm changeset publish/);
  assert.doesNotMatch(workflow, /changesets\/action/);
});

test("CI can be dispatched for an automation-created release branch", () => {
  const workflow = read(".github/workflows/ci.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
});

test("a successful publish opens a main-to-dev synchronization PR", () => {
  const workflow = read(".github/workflows/release.yml");

  assert.match(workflow, /gh pr create[\s\S]*--base dev[\s\S]*--head main/);
  assert.match(workflow, /gh pr list[\s\S]*--head main/);
});

test("repository policy tests are part of the root test command", () => {
  const pkg = JSON.parse(read("package.json"));

  assert.equal(pkg.scripts["test:repo"], "node --test tests/*.test.mjs");
  assert.match(pkg.scripts.test, /pnpm run test:repo/);
});
