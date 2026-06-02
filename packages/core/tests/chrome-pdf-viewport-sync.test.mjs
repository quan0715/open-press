import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PRINT_VIEWPORT,
  pageDimensionsPxToPaperInches,
  syncViewportToPageGeometry,
} from "../engine/output/chrome-pdf.mjs";

function mockClient(probeSequence) {
  const calls = [];
  return {
    calls,
    async send(method, params) {
      calls.push({ method, params });
      if (method === "Runtime.evaluate") {
        const next = probeSequence.shift();
        if (next === undefined) return { result: { value: null } };
        return { result: { value: next } };
      }
      if (method === "Emulation.setDeviceMetricsOverride") return {};
      return {};
    },
  };
}

test("syncViewportToPageGeometry leaves viewport untouched when the page fits", async () => {
  const client = mockClient([{ width: 1080, height: 1500 }]);
  const { viewport, pageDimensionsPx } = await syncViewportToPageGeometry(client, { ...DEFAULT_PRINT_VIEWPORT });
  assert.equal(viewport.width, DEFAULT_PRINT_VIEWPORT.width);
  assert.equal(viewport.height, DEFAULT_PRINT_VIEWPORT.height);
  assert.deepEqual(pageDimensionsPx, { width: 1080, height: 1500 });
  const resizeCalls = client.calls.filter((c) => c.method === "Emulation.setDeviceMetricsOverride");
  assert.equal(resizeCalls.length, 0);
});

test("syncViewportToPageGeometry widens the viewport when the page is wider than current viewport (slide bug)", async () => {
  const client = mockClient([{ width: 1920, height: 1080 }]);
  const { viewport, pageDimensionsPx } = await syncViewportToPageGeometry(client, { ...DEFAULT_PRINT_VIEWPORT });
  assert.equal(viewport.width, 1920);
  assert.equal(viewport.height, DEFAULT_PRINT_VIEWPORT.height);
  assert.deepEqual(pageDimensionsPx, { width: 1920, height: 1080 });
  const resizeCalls = client.calls.filter((c) => c.method === "Emulation.setDeviceMetricsOverride");
  assert.equal(resizeCalls.length, 1);
  assert.equal(resizeCalls[0].params.width, 1920);
});

test("syncViewportToPageGeometry rounds up sub-pixel page dimensions", async () => {
  const client = mockClient([{ width: 1920.3, height: 1080.7 }]);
  const { viewport } = await syncViewportToPageGeometry(client, { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
  assert.equal(viewport.width, 1921);
  assert.equal(viewport.height, 1081);
});

test("syncViewportToPageGeometry retries while the probe returns null, then resizes once dimensions appear", async () => {
  const client = mockClient([null, null, { width: 1600, height: 900 }]);
  const { viewport, pageDimensionsPx } = await syncViewportToPageGeometry(client, { ...DEFAULT_PRINT_VIEWPORT }, { pollIntervalMs: 5, timeoutMs: 1000 });
  assert.equal(viewport.width, 1600);
  assert.deepEqual(pageDimensionsPx, { width: 1600, height: 900 });
  const evalCalls = client.calls.filter((c) => c.method === "Runtime.evaluate");
  assert.equal(evalCalls.length, 3);
});

test("syncViewportToPageGeometry gives up after the timeout, returns the original viewport, and reports no measurement", async () => {
  const client = mockClient(Array.from({ length: 200 }, () => null));
  const original = { ...DEFAULT_PRINT_VIEWPORT };
  const { viewport, pageDimensionsPx } = await syncViewportToPageGeometry(client, original, { pollIntervalMs: 5, timeoutMs: 30 });
  assert.equal(viewport.width, original.width);
  assert.equal(viewport.height, original.height);
  assert.equal(pageDimensionsPx, null);
  const resizeCalls = client.calls.filter((c) => c.method === "Emulation.setDeviceMetricsOverride");
  assert.equal(resizeCalls.length, 0);
});

test("pageDimensionsPxToPaperInches converts CSS px to inches at 96dpi for printToPDF", () => {
  // Wider-than-tall (slide / landscape): short side becomes paperWidth,
  // long side becomes paperHeight, landscape flag set so Chrome rotates
  // the rendered page instead of normalizing the MediaBox to portrait.
  assert.deepEqual(pageDimensionsPxToPaperInches({ width: 1920, height: 1080 }), {
    paperWidth: 1080 / 96,
    paperHeight: 1920 / 96,
    landscape: true,
  });
  // Taller-than-wide (A4 portrait): dims pass through as-is, landscape false.
  assert.deepEqual(pageDimensionsPxToPaperInches({ width: 1240, height: 1754 }), {
    paperWidth: 1240 / 96,
    paperHeight: 1754 / 96,
    landscape: false,
  });
});

test("pageDimensionsPxToPaperInches returns null for missing or invalid dims so the A4 fallback applies", () => {
  assert.equal(pageDimensionsPxToPaperInches(null), null);
  assert.equal(pageDimensionsPxToPaperInches({ width: 0, height: 100 }), null);
  assert.equal(pageDimensionsPxToPaperInches({ width: 100, height: -1 }), null);
  assert.equal(pageDimensionsPxToPaperInches({ width: Number.NaN, height: 100 }), null);
});
