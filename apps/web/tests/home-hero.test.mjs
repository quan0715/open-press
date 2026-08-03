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
  assert.match(hero, /data-prompt-tab="you"/);
  assert.match(hero, /data-prompt-tab="agent"/);
  assert.match(hero, /data-copy-prompt=\{agentPrompt\}/);
  assert.match(home, /promptForYou: "開始使用"/);
  assert.match(home, /promptForAgent: "交給 Agent"/);
  assert.match(home, /promptAgentReady: "Agent 提示詞已準備好"/);
  assert.match(hero, /data-copy-icon/);
  assert.match(hero, /data-copy-check/);
  assert.match(hero, /lang === "zh-tw" && "basis-full"/);
  assert.match(hero, /text-\[clamp\(1\.08rem,1\.32vw,1\.28rem\)\]/);
  assert.match(hero, /<div class="mt-14 max-w-\[48rem\]" data-hero-prompt>/);
  assert.doesNotMatch(hero, />\{t\.promptCopy\}<\/button>/);
  assert.doesNotMatch(hero, />\{t\.promptCopyAgent\}<\/button>/);
  assert.doesNotMatch(hero, /openpress-hero-art\.png/);
  assert.doesNotMatch(hero, /heroStartBtn|heroDocsBtn|aria-label="Primary actions"/);
  assert.doesNotMatch(hero, /<span class="block">\{t\.heroTitleStart\}<\/span>/);
  assert.equal((home.match(/data-copy-command=/g) ?? []).length, 1);
  assert.match(home, /<section[^>]*id="start"/);
});

test("homepage narrative positions OpenPress as an agent publication framework", async () => {
  const home = await fs.readFile(
    path.join(WEB_ROOT, "src/components/home/HomeRefresh.astro"),
    "utf8",
  );

  assert.match(home, /專為 Agent 設計的/);
  assert.match(home, /內容框架/);
  assert.match(home, /A content framework for/);
  assert.match(home, /コンテンツフレームワーク/);
  assert.match(home, /Press 與 Docs/);
  assert.match(home, /Press and Docs/);
  assert.match(home, /PressとDocs/);
  assert.match(home, /共享框架/);
  assert.match(home, /Shared framework/);
  assert.match(home, /共有フレームワーク/);
});

test("homepage uses the clean sans type system", async () => {
  const styles = await fs.readFile(
    path.join(WEB_ROOT, "src/styles/global.css"),
    "utf8",
  );

  assert.match(styles, /--op-font-display: "IBM Plex Sans"/);
  assert.doesNotMatch(styles, /Playfair Display|Newsreader/);
});
