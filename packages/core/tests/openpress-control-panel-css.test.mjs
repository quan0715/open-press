import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("control panel separates sections with gap instead of a project divider", async () => {
  const css = await fs.readFile(new URL("../src/styles/openpress/workbench-panels.css", import.meta.url), "utf8");

  assert.doesNotMatch(
    css,
    /\.openpress-control-panel\s+\.openpress-project-panel\s*{[^}]*border-top/s,
  );
});

test("panel headings reset document typography pseudo elements", async () => {
  const css = await fs.readFile(new URL("../src/styles/openpress/workbench-panels.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.openpress-panel-title::before\s*{[^}]*content:\s*none/s,
  );
});

test("right control panel keeps child panels intrinsic height while owning scroll", async () => {
  const css = await fs.readFile(new URL("../src/styles/openpress/workbench-panels.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.openpress-control-panel\s*{[^}]*display:\s*grid;[^}]*grid-auto-rows:\s*max-content;[^}]*overflow:\s*auto;/s,
  );
});
