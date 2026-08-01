import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.hidden = false;
    this.tabIndex = -1;
    this.focused = false;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  focus() {
    this.focused = true;
  }

  emit(type, init = {}) {
    let prevented = false;
    this.listeners.get(type)?.({
      key: init.key,
      preventDefault() {
        prevented = true;
      },
    });
    return prevented;
  }
}

function productWorkbenchFixture() {
  const tabs = [new FakeElement(), new FakeElement()];
  const panels = [new FakeElement(), new FakeElement()];
  const workbench = {
    querySelectorAll(selector) {
      if (selector === "[data-product-tab]") return tabs;
      if (selector === "[data-product-panel]") return panels;
      return [];
    },
  };
  const root = {
    querySelectorAll(selector) {
      return selector === "[data-product-workbench]" ? [workbench] : [];
    },
  };

  return { panels, root, tabs };
}

function readVp8Dimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "VP8 ");
  assert.deepEqual([...buffer.subarray(23, 26)], [0x9d, 0x01, 0x2a]);

  return {
    width: buffer.readUInt16LE(26) & 0x3fff,
    height: buffer.readUInt16LE(28) & 0x3fff,
  };
}

test("product tabs wrap arrow navigation and support Home and End", async () => {
  const { nextProductTabIndex } = await import(
    "../src/components/home/productWorkbenchTabs.mjs"
  );

  assert.equal(nextProductTabIndex(0, "ArrowRight", 2), 1);
  assert.equal(nextProductTabIndex(1, "ArrowRight", 2), 0);
  assert.equal(nextProductTabIndex(0, "ArrowLeft", 2), 1);
  assert.equal(nextProductTabIndex(1, "Home", 2), 0);
  assert.equal(nextProductTabIndex(0, "End", 2), 1);
  assert.equal(nextProductTabIndex(0, "Enter", 2), null);
  assert.equal(nextProductTabIndex(0, "ArrowRight", 0), null);
});

test("product tabs update selection, panels, focus, and wrapped keyboard navigation", async () => {
  const { initProductWorkbenchTabs } = await import(
    "../src/components/home/productWorkbenchTabs.mjs"
  );
  const { panels, root, tabs } = productWorkbenchFixture();

  initProductWorkbenchTabs(root);
  tabs[1].emit("click");

  assert.equal(tabs[0].getAttribute("aria-selected"), "false");
  assert.equal(tabs[0].tabIndex, -1);
  assert.equal(panels[0].hidden, true);
  assert.equal(tabs[1].getAttribute("aria-selected"), "true");
  assert.equal(tabs[1].tabIndex, 0);
  assert.equal(panels[1].hidden, false);

  assert.equal(tabs[1].emit("keydown", { key: "ArrowRight" }), true);
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");
  assert.equal(tabs[0].focused, true);
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[1].hidden, true);

  assert.equal(tabs[0].emit("keydown", { key: "End" }), true);
  assert.equal(tabs[1].getAttribute("aria-selected"), "true");
  assert.equal(tabs[1].focused, true);

  assert.equal(tabs[1].emit("keydown", { key: "Home" }), true);
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");

  assert.equal(tabs[1].emit("keydown", { key: "Enter" }), true);
  assert.equal(tabs[1].getAttribute("aria-selected"), "true");

  assert.equal(tabs[0].emit("keydown", { key: " " }), true);
  assert.equal(tabs[0].getAttribute("aria-selected"), "true");
});

test("homepage includes the localized product showcase before Press Tree", async () => {
  const component = await fs.readFile(
    path.join(WEB_ROOT, "src/components/home/ProductWorkbenchSection.astro"),
    "utf8",
  );
  const home = await fs.readFile(
    path.join(WEB_ROOT, "src/components/home/HomeRefresh.astro"),
    "utf8",
  );

  assert.match(component, /"zh-tw"/);
  assert.match(component, /\ben:/);
  assert.match(component, /\bja:/);
  assert.equal((component.match(/role="tab"/g) ?? []).length, 2);
  assert.equal((component.match(/role="tabpanel"/g) ?? []).length, 2);
  assert.match(component, /workbench-document-editor\.webp/);
  assert.match(component, /workbench-agent-proposal\.webp/);
  assert.equal((component.match(/width="1600"/g) ?? []).length, 2);
  assert.equal((component.match(/height="1000"/g) ?? []).length, 2);
  assert.equal((component.match(/href="\/product\/workbench-/g) ?? []).length, 2);
  assert.ok(home.indexOf("<ProductWorkbenchSection") > home.indexOf('id="flow"'));
  assert.ok(
    home.indexOf("<ProductWorkbenchSection") <
      home.indexOf('aria-labelledby="tree-title"'),
  );

  for (const filename of [
    "workbench-document-editor.webp",
    "workbench-agent-proposal.webp",
  ]) {
    const asset = await fs.readFile(path.join(WEB_ROOT, "public/product", filename));
    assert.deepEqual(readVp8Dimensions(asset), { width: 1600, height: 1000 });
  }
});
