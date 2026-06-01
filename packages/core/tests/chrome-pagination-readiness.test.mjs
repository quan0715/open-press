import test from "node:test";
import assert from "node:assert/strict";
import {
  PRINT_READY_DEFAULTS,
  resolvePrintReadyTiming,
  waitForPrintReady,
} from "../engine/output/chrome-pdf.mjs";
import {
  INSPECTION_READY_DEFAULTS,
  resolveInspectionReadyTiming,
  waitForInspectionReady,
} from "../engine/runtime/inspection.mjs";

function mockClient(sequence) {
  const calls = [];
  return {
    calls,
    async send(method, params) {
      calls.push({ method, params });
      const step = sequence.shift();
      if (!step) return { result: { value: undefined } };
      if (typeof step === "function") return await step({ method, params });
      return { result: { value: step } };
    },
  };
}

const fastTiming = (overrides = {}) => ({
  totalTimeoutMs: 500,
  idleTimeoutMs: 200,
  pollIntervalMs: 5,
  ...overrides,
});

test("resolvePrintReadyTiming returns defaults when env is unset", () => {
  const timing = resolvePrintReadyTiming({});
  assert.equal(timing.totalTimeoutMs, PRINT_READY_DEFAULTS.totalTimeoutMs);
  assert.equal(timing.idleTimeoutMs, PRINT_READY_DEFAULTS.idleTimeoutMs);
  assert.equal(timing.pollIntervalMs, PRINT_READY_DEFAULTS.pollIntervalMs);
});

test("resolvePrintReadyTiming honors positive env overrides", () => {
  const timing = resolvePrintReadyTiming({
    OPENPRESS_PRINT_READY_TIMEOUT_MS: "120000",
    OPENPRESS_PRINT_READY_IDLE_MS: "45000",
  });
  assert.equal(timing.totalTimeoutMs, 120_000);
  assert.equal(timing.idleTimeoutMs, 45_000);
});

test("resolvePrintReadyTiming ignores non-positive env values", () => {
  const timing = resolvePrintReadyTiming({
    OPENPRESS_PRINT_READY_TIMEOUT_MS: "0",
    OPENPRESS_PRINT_READY_IDLE_MS: "abc",
  });
  assert.equal(timing.totalTimeoutMs, PRINT_READY_DEFAULTS.totalTimeoutMs);
  assert.equal(timing.idleTimeoutMs, PRINT_READY_DEFAULTS.idleTimeoutMs);
});

test("waitForPrintReady returns page count once the readiness probe reports ready", async () => {
  const client = mockClient([
    { ready: false, pageCount: 0, overflowingPages: null },
    { ready: false, pageCount: 12, overflowingPages: 3 },
    { ready: false, pageCount: 105, overflowingPages: 2 },
    { ready: true, pageCount: 107, overflowingPages: 0 },
  ]);
  const count = await waitForPrintReady(client, fastTiming());
  assert.equal(count, 107);
});

test("waitForPrintReady resets the idle window whenever the signature advances", async () => {
  // Each step keeps the idle window alive by changing pageCount; total polls > idle/poll budget.
  const sequence = [];
  for (let i = 1; i <= 80; i++) {
    sequence.push({ ready: false, pageCount: i, overflowingPages: 1 });
  }
  sequence.push({ ready: true, pageCount: 80, overflowingPages: 0 });
  const client = mockClient(sequence);
  const count = await waitForPrintReady(client, fastTiming({ idleTimeoutMs: 80, pollIntervalMs: 5, totalTimeoutMs: 5000 }));
  assert.equal(count, 80);
});

test("waitForPrintReady throws an idle-timeout error citing the last observed snapshot", async () => {
  const sequence = Array.from({ length: 200 }, () => ({ ready: false, pageCount: 42, overflowingPages: 3 }));
  const client = mockClient(sequence);
  await assert.rejects(
    waitForPrintReady(client, fastTiming({ idleTimeoutMs: 60, pollIntervalMs: 5, totalTimeoutMs: 5000 })),
    (error) => {
      assert.match(error.message, /No progress for/);
      assert.match(error.message, /observed 42 page\(s\), 3 overflowing/);
      assert.match(error.message, /OPENPRESS_PRINT_READY_IDLE_MS/);
      return true;
    },
  );
});

test("waitForPrintReady throws a total-cap error when progress keeps coming but never reaches ready", async () => {
  const sequence = [];
  for (let i = 1; i <= 500; i++) {
    sequence.push({ ready: false, pageCount: i, overflowingPages: 1 });
  }
  const client = mockClient(sequence);
  await assert.rejects(
    waitForPrintReady(client, fastTiming({ totalTimeoutMs: 80, idleTimeoutMs: 80, pollIntervalMs: 5 })),
    (error) => {
      assert.match(error.message, /Total \d+s exceeded/);
      assert.match(error.message, /OPENPRESS_PRINT_READY_TIMEOUT_MS/);
      return true;
    },
  );
});

test("resolveInspectionReadyTiming honors env overrides", () => {
  const fromEnv = resolveInspectionReadyTiming({
    OPENPRESS_INSPECTION_TIMEOUT_MS: "90000",
    OPENPRESS_INSPECTION_IDLE_MS: "20000",
  });
  assert.equal(fromEnv.totalTimeoutMs, 90_000);
  assert.equal(fromEnv.idleTimeoutMs, 20_000);
  const defaults = resolveInspectionReadyTiming({});
  assert.equal(defaults.totalTimeoutMs, INSPECTION_READY_DEFAULTS.totalTimeoutMs);
  assert.equal(defaults.idleTimeoutMs, INSPECTION_READY_DEFAULTS.idleTimeoutMs);
});

test("waitForInspectionReady returns the measurements array once probe yields one", async () => {
  const measurements = [{ pageNumber: 1, title: "Cover", overflows: [] }];
  const client = mockClient([
    { pending: true, pageCount: 0 },
    { pending: true, pageCount: 4 },
    measurements,
  ]);
  const result = await waitForInspectionReady(client, fastTiming());
  assert.deepEqual(result, measurements);
});

test("waitForInspectionReady throws an idle-timeout when pageCount is stuck", async () => {
  const sequence = Array.from({ length: 200 }, () => ({ pending: true, pageCount: 9 }));
  const client = mockClient(sequence);
  await assert.rejects(
    waitForInspectionReady(client, fastTiming({ idleTimeoutMs: 60, pollIntervalMs: 5, totalTimeoutMs: 5000 })),
    (error) => {
      assert.match(error.message, /No progress for/);
      assert.match(error.message, /observed 9 page\(s\)/);
      assert.match(error.message, /OPENPRESS_INSPECTION_IDLE_MS/);
      return true;
    },
  );
});
