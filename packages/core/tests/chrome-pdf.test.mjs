import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PRINT_VIEWPORT, preparePdfPage } from "../engine/output/chrome-pdf.mjs";

test("preparePdfPage pins a wide print viewport before enabling print media", async () => {
  const calls = [];
  const client = {
    async send(method, params) {
      calls.push({ method, params });
      return {};
    },
  };

  await preparePdfPage(client);

  assert.deepEqual(calls, [
    { method: "Page.enable", params: undefined },
    { method: "Runtime.enable", params: undefined },
    { method: "Emulation.setDeviceMetricsOverride", params: DEFAULT_PRINT_VIEWPORT },
    { method: "Emulation.setEmulatedMedia", params: { media: "print" } },
  ]);
});

