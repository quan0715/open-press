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
  assert.match(hero, /leading-\[1\.08\]/);
  assert.match(hero, /leading-\[1\.72\]/);
  assert.match(hero, /<div class="col-start-1 col-span-11 mt-20 max-w-\[56rem\] border-t border-hairline pt-8/);
  assert.doesNotMatch(hero, />\{t\.promptCopy\}<\/button>/);
  assert.doesNotMatch(hero, />\{t\.promptCopyAgent\}<\/button>/);
  assert.doesNotMatch(hero, /openpress-hero-art\.png/);
  assert.doesNotMatch(hero, /heroStartBtn|heroDocsBtn|aria-label="Primary actions"/);
  assert.doesNotMatch(hero, /<span class="block">\{t\.heroTitleStart\}<\/span>/);
  assert.equal((home.match(/data-copy-command=/g) ?? []).length, 1);
  assert.match(home, /data-home-demo/);
  assert.match(home, /const dogfoodDemoUrl = "https:\/\/open-press-story\.pages\.dev"/);
  assert.match(home, /src=\{dogfoodDemoUrl\}/);
  assert.match(home, /title="OpenPress dogfood user story book demo"/);
  assert.doesNotMatch(home, /demoEyebrow:/);
  assert.doesNotMatch(home, /demoTitle:/);
  assert.doesNotMatch(home, /demoDesc:/);
  assert.doesNotMatch(home, /demoLink:/);
  assert.match(home, /data-home-composer/);
  assert.match(home, /composerTitle: "與任何 Agent 協作"/);
  assert.match(home, /\{ id: "gpt", label: "GPT", icon: "\/provider-icons\/openai\.svg" \}/);
  assert.match(home, /\{ id: "claude", label: "Claude", icon: "\/provider-icons\/claude\.svg" \}/);
  assert.match(home, /\{ id: "gemini", label: "Gemini", icon: "\/provider-icons\/gemini\.svg" \}/);
  assert.match(home, /\{ id: "cursor", label: "Cursor", icon: "\/provider-icons\/cursor\.svg" \}/);
  assert.match(home, /\{ id: "copilot", label: "Copilot", icon: "\/provider-icons\/copilot\.svg" \}/);
  assert.match(home, /aria-label="Available AI providers"/);
  assert.doesNotMatch(home, /data-provider-dialog|data-provider-trigger|data-provider-option/);
  assert.match(home, /h-14 w-14 shrink-0 items-center justify-center rounded-\[0\.8rem\] p-0/);
  assert.match(home, /h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white p-0/);
  assert.doesNotMatch(home, /aria-label="Search"/);
  assert.match(home, /閱讀我的實驗數據幫我撰寫我的研究論文/);
  assert.match(home, /撰寫資料結構的課程筆記/);
  assert.match(home, /跟我一起討論並撰寫我的新創產品計劃書/);
  assert.match(home, /data-composer-text/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /pt-\[clamp\(4\.5rem,8vh,7rem\)\]/);
  assert.match(home, /col-start-1 col-span-11/);
  assert.match(home, /<section[^>]*id="start"/);
  assert.match(home, /data-cover-gallery/);
  assert.match(home, /data-cover-track/);
  assert.match(home, /data-cover-prev/);
  assert.match(home, /data-cover-next/);
  assert.match(home, /論文/);
  assert.match(home, /風險報告書/);
  assert.match(home, /新創計劃書/);
  assert.match(home, /學科筆記/);
  assert.match(home, /寫書/);
  assert.match(home, /galleryTitle: "OpenPress，讓每一種想法都有出版的形狀。"/);
  assert.match(home, /一個工作區，多種出版形式/);
  assert.match(home, /成果不只停在草稿/);
  assert.doesNotMatch(home, /同一份內容，長成不同的作品/);
  assert.doesNotMatch(home, /OpenPress \/ \{String\(index \+ 1\)/);
  assert.match(home, /item\.id === "paper"/);
  assert.match(home, /item\.id === "notes"/);
  assert.doesNotMatch(home, /startTitle: "Docs 存文件/);
});

test("homepage narrative positions OpenPress as an agent publication framework", async () => {
  const home = await fs.readFile(
    path.join(WEB_ROOT, "src/components/home/HomeRefresh.astro"),
    "utf8",
  );

  assert.match(home, /專為 Agent 設計的/);
  assert.match(home, /內容框架/);
  assert.match(home, /A content framework built for/);
  assert.match(home, /A content framework built for agents/);
  assert.match(home, /コンテンツフレームワーク/);
  assert.match(home, /一個工作區，多種出版形式/);
  assert.match(home, /One workspace\. Many forms\./);
  assert.match(home, /一つのワークスペース、多様な出版形式/);
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
  assert.match(styles, /--op-text-base: 1\.125rem/);
  assert.match(styles, /--op-content-page: 80rem/);
  assert.match(styles, /--op-ink-surface: #171513/);
  assert.match(styles, /--op-accent: #C69A57/);
  assert.match(styles, /--op-accent-hover: #A47738/);
  assert.match(styles, /:root\[data-theme="dark"\][\s\S]*--op-accent: #C69A57/);
  assert.match(styles, /:root\[data-theme="dark"\][\s\S]*--op-accent-hover: #E4C486/);
  assert.match(styles, /--op-paper: #171513/);
  assert.doesNotMatch(styles, /Playfair Display|Newsreader/);
});
