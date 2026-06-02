import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PRINT_VIEWPORT, syncViewportToPageGeometry } from "../engine/output/chrome-pdf.mjs";

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
  const next = await syncViewportToPageGeometry(client, { ...DEFAULT_PRINT_VIEWPORT });
  assert.equal(next.width, DEFAULT_PRINT_VIEWPORT.width);
  assert.equal(next.height, DEFAULT_PRINT_VIEWPORT.height);
  const resizeCalls = client.calls.filter((c) => c.method === "Emulation.setDeviceMetricsOverride");
  assert.equal(resizeCalls.length, 0);
});

test("syncViewportToPageGeometry widens the viewport when the page is wider than current viewport (slide bug)", async () => {
  const client = mockClient([{ width: 1920, height: 1080 }]);
  const next = await syncViewportToPageGeometry(client, { ...DEFAULT_PRINT_VIEWPORT });
  assert.equal(next.width, 1920);
  assert.equal(next.height, DEFAULT_PRINT_VIEWPORT.height); // height was already larger; keep it
  const resizeCalls = client.calls.filter((c) => c.method === "Emulation.setDeviceMetricsOverride");
  assert.equal(resizeCalls.length, 1);
  assert.equal(resizeCalls[0].params.width, 1920);
});

test("syncViewportToPageGeometry rounds up sub-pixel page dimensions", async () => {
  const client = mockClient([{ width: 1920.3, height: 1080.7 }]);
  const next = await syncViewportToPageGeometry(client, { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
  assert.equal(next.width, 1921);
  assert.equal(next.height, 1081);
});

test("syncViewportToPageGeometry retries while the probe returns null, then resizes once dimensions appear", async () => {
  const client = mockClient([null, null, { width: 1600, height: 900 }]);
  const next = await syncViewportToPageGeometry(client, { ...DEFAULT_PRINT_VIEWPORT }, { pollIntervalMs: 5, timeoutMs: 1000 });
  assert.equal(next.width, 1600);
  const evalCalls = client.calls.filter((c) => c.method === "Runtime.evaluate");
  assert.equal(evalCalls.length, 3);
});

test("syncViewportToPageGeometry gives up after the timeout and returns the original viewport", async () => {
  const client = mockClient(Array.from({ length: 200 }, () => null));
  const original = { ...DEFAULT_PRINT_VIEWPORT };
  const next = await syncViewportToPageGeometry(client, original, { pollIntervalMs: 5, timeoutMs: 30 });
  assert.equal(next.width, original.width);
  assert.equal(next.height, original.height);
  const resizeCalls = client.calls.filter((c) => c.method === "Emulation.setDeviceMetricsOverride");
  assert.equal(resizeCalls.length, 0);
});
