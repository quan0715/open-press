import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("homepage hero owns the single skill install control without hero artwork", async () => {
  const home = await fs.readFile(
    path.join(WEB_ROOT, "src/components/home/HomeRefresh.astro"),
    "utf8",
  );
  const hero = home.match(/<section[^>]*data-home-hero[\s\S]*?<\/section>/)?.[0];

  assert.ok(hero, "the homepage must expose its manifesto hero");
  assert.match(hero, /data-copy-command=\{openPressSkillCommand\}/);
  assert.doesNotMatch(hero, /openpress-hero-art\.png/);
  assert.equal((home.match(/data-copy-command=/g) ?? []).length, 1);
  assert.match(home, /<section[^>]*id="start"/);
});
