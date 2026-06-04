/**
 * tests/press-lint.test.mjs
 *
 * Checks press/<slug>/ folders against OpenPress authoring conventions.
 * Scope: pages and slides. social and shared are excluded.
 *
 * Run: node --test tests/press-lint.test.mjs
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PRESS_DIR = fileURLToPath(new URL("../press/", import.meta.url));

// Not Press-type folders.
const EXCLUDED = new Set(["social", "shared"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pressFolders() {
  return readdirSync(PRESS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !EXCLUDED.has(d.name) && !d.name.startsWith("."))
    .map(d => d.name);
}

function readEntry(folder) {
  const newPath = join(PRESS_DIR, folder, "press.tsx");
  const legacyPath = join(PRESS_DIR, folder, "index.tsx");
  if (existsSync(newPath)) return { file: "press.tsx", src: readFileSync(newPath, "utf8"), legacy: false };
  if (existsSync(legacyPath)) return { file: "index.tsx", src: readFileSync(legacyPath, "utf8"), legacy: true };
  return null;
}

function detectType(src) {
  if (/type=["']slides["']/.test(src)) return "slides";
  return "pages";
}

// Recursively collect all .tsx files under a directory.
function collectTsx(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectTsx(full));
    else if (entry.name.endsWith(".tsx")) results.push(full);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Checks per folder
// ---------------------------------------------------------------------------

for (const folder of pressFolders()) {
  const entry = readEntry(folder);

  test(`press/${folder}: entry file exists`, () => {
    assert.ok(entry, `No press.tsx or index.tsx found in press/${folder}/`);
  });

  if (!entry) continue;

  const { file, src, legacy } = entry;
  const type = detectType(src);

  // --- Convention ---

  test(
    `press/${folder}: uses press.tsx (new convention)`,
    legacy ? { todo: "migrate index.tsx → press.tsx" } : {},
    () => {
      assert.equal(file, "press.tsx", `press/${folder}/${file} — rename to press.tsx`);
    },
  );

  // --- Structure ---

  test(`press/${folder}: has export default function`, () => {
    assert.match(src, /export default function\s+\w/, "Missing export default function");
  });

  test(`press/${folder}: <Press> has slug`, () => {
    assert.match(src, /slug=["'][\w-]+["']/, "Missing slug prop on <Press>");
  });

  test(`press/${folder}: <Press> has title`, () => {
    assert.match(src, /title=["'][^"']+["']/, "Missing title prop on <Press>");
  });

  // --- Cross-cutting ---

  test(`press/${folder}: does not import Workspace`, () => {
    assert.doesNotMatch(
      src,
      /import\s*\{[^}]*\bWorkspace\b[^}]*\}\s*from\s*["']@open-press\/core["']/,
      "Workspace must not be imported in per-press files — it belongs in the root entry or is built by the engine",
    );
  });

  // ---------------------------------------------------------------------------
  // Pages
  // ---------------------------------------------------------------------------

  if (type === "pages") {
    test(`press/${folder} (pages): registers an MDX source`, () => {
      assert.match(src, /mdxSource\s*\(/, "Pages press must register a source via mdxSource()");
    });
  }

  // ---------------------------------------------------------------------------
  // Slides
  // ---------------------------------------------------------------------------

  if (type === "slides") {
    test(`press/${folder} (slides): no order-based slide IDs`, () => {
      assert.doesNotMatch(
        src,
        /(?:\bid\b|frameKey)=["'](?:slide|page)-\d+["']/,
        "Slide IDs must be semantic (e.g. 'cover', 'agenda'), not order-based (e.g. 'slide-01', 'page-03')",
      );
    });

    test(`press/${folder} (slides): no pageNumber or totalPages props`, () => {
      assert.doesNotMatch(src, /\bpageNumber\s*=/, "Use <PageFolio> instead of pageNumber=");
      assert.doesNotMatch(src, /\btotalPages\s*=/, "Use <PageFolio> instead of totalPages=");
    });

    // Scan all TSX files for h1-h4 / p with direct text (not wrapped in <Text objectId>).
    // These elements lose inline-edit capability if not rendered through Text.
    const RAW_TEXT = /<(?:h[1-4]|p)\b[^>]*>\s*[^\s<{]/;
    const rawTextFiles = collectTsx(join(PRESS_DIR, folder))
      .filter(f => RAW_TEXT.test(readFileSync(f, "utf8")))
      .map(f => relative(PRESS_DIR, f));

    test(
      `press/${folder} (slides): heading/paragraph text uses <Text> for inline editing`,
      rawTextFiles.length > 0 ? { todo: `wrap direct text in <Text objectId="..."> — ${rawTextFiles.join(", ")}` } : {},
      () => {
        assert.equal(
          rawTextFiles.length,
          0,
          `Found heading/paragraph text not using <Text>:\n  ${rawTextFiles.join("\n  ")}`,
        );
      },
    );

    // DeckSlide.tsx: verify PageFolio is used (only when the file exists)
    const deckSlidePath = join(PRESS_DIR, folder, "components", "DeckSlide.tsx");
    if (existsSync(deckSlidePath)) {
      const deckSrc = readFileSync(deckSlidePath, "utf8");
      test(`press/${folder}/components/DeckSlide.tsx: uses PageFolio`, () => {
        assert.match(deckSrc, /PageFolio/, "DeckSlide must use PageFolio for slide numbering");
      });
    }
  }
}
