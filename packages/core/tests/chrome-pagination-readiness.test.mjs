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
  stableMs: 10,
  ...overrides,
});

test("resolvePrintReadyTiming returns defaults when env is unset", () => {
  const timing = resolvePrintReadyTiming({});
  assert.equal(timing.totalTimeoutMs, PRINT_READY_DEFAULTS.totalTimeoutMs);
  assert.equal(timing.idleTimeoutMs, PRINT_READY_DEFAULTS.idleTimeoutMs);
  assert.equal(timing.stableMs, PRINT_READY_DEFAULTS.stableMs);
  assert.equal(timing.pollIntervalMs, PRINT_READY_DEFAULTS.pollIntervalMs);
});

test("resolvePrintReadyTiming honors positive env overrides", () => {
  const timing = resolvePrintReadyTiming({
    OPENPRESS_PRINT_READY_TIMEOUT_MS: "120000",
    OPENPRESS_PRINT_READY_IDLE_MS: "45000",
    OPENPRESS_PRINT_READY_STABLE_MS: "750",
  });
  assert.equal(timing.totalTimeoutMs, 120_000);
  assert.equal(timing.idleTimeoutMs, 45_000);
  assert.equal(timing.stableMs, 750);
});

test("resolvePrintReadyTiming ignores non-positive env values", () => {
  const timing = resolvePrintReadyTiming({
    OPENPRESS_PRINT_READY_TIMEOUT_MS: "0",
    OPENPRESS_PRINT_READY_IDLE_MS: "abc",
    OPENPRESS_PRINT_READY_STABLE_MS: "-5",
  });
  assert.equal(timing.totalTimeoutMs, PRINT_READY_DEFAULTS.totalTimeoutMs);
  assert.equal(timing.idleTimeoutMs, PRINT_READY_DEFAULTS.idleTimeoutMs);
  assert.equal(timing.stableMs, PRINT_READY_DEFAULTS.stableMs);
});

test("waitForPrintReady returns once the pagination snapshot stays stable", async () => {
  const stable = { pageCount: 107, overflowingPages: 0, overflowingPageNumbers: [] };
  const client = mockClient([
    { pageCount: 0, overflowingPages: 0, overflowingPageNumbers: [] },
    { pageCount: 12, overflowingPages: 3, overflowingPageNumbers: [4, 9, 11] },
    { pageCount: 105, overflowingPages: 2, overflowingPageNumbers: [4, 11] },
    stable,
    stable,
    stable,
    stable,
  ]);
  const result = await waitForPrintReady(client, fastTiming());
  assert.equal(result.pageCount, 107);
  assert.deepEqual(result.overflowingPageNumbers, []);
});

test("waitForPrintReady declares ready even when some pages overflow (overflow no longer blocks)", async () => {
  const stable = { pageCount: 120, overflowingPages: 2, overflowingPageNumbers: [42, 88] };
  const client = mockClient([
    { pageCount: 60, overflowingPages: 1, overflowingPageNumbers: [42] },
    { pageCount: 120, overflowingPages: 2, overflowingPageNumbers: [42, 88] },
    stable,
    stable,
    stable,
  ]);
  const result = await waitForPrintReady(client, fastTiming());
  assert.equal(result.pageCount, 120);
  assert.deepEqual(result.overflowingPageNumbers, [42, 88]);
});

test("waitForPrintReady resets the idle window whenever the signature advances", async () => {
  const sequence = [];
  for (let i = 1; i <= 80; i++) {
    sequence.push({ pageCount: i, overflowingPages: 1, overflowingPageNumbers: [1] });
  }
  const stable = { pageCount: 80, overflowingPages: 0, overflowingPageNumbers: [] };
  for (let i = 0; i < 5; i += 1) sequence.push(stable);
  const client = mockClient(sequence);
  const result = await waitForPrintReady(client, fastTiming({ idleTimeoutMs: 80, pollIntervalMs: 5, stableMs: 10, totalTimeoutMs: 5000 }));
  assert.equal(result.pageCount, 80);
});

test("waitForPrintReady throws an idle-timeout error citing the last observed snapshot", async () => {
  // pageCount=0 keeps the loop from declaring stability; identical signature triggers the idle path.
  const sequence = Array.from({ length: 200 }, () => ({ pageCount: 0, overflowingPages: 0, overflowingPageNumbers: [] }));
  const client = mockClient(sequence);
  await assert.rejects(
    waitForPrintReady(client, fastTiming({ idleTimeoutMs: 60, pollIntervalMs: 5, stableMs: 5000, totalTimeoutMs: 5000 })),
    (error) => {
      assert.match(error.message, /No progress for/);
      assert.match(error.message, /observed 0 page\(s\)/);
      assert.match(error.message, /OPENPRESS_PRINT_READY_IDLE_MS/);
      return true;
    },
  );
});

test("waitForPrintReady throws a total-cap error when progress keeps coming but stability never accrues", async () => {
  const sequence = [];
  for (let i = 1; i <= 500; i++) {
    sequence.push({ pageCount: i, overflowingPages: 1, overflowingPageNumbers: [1] });
  }
  const client = mockClient(sequence);
  await assert.rejects(
    waitForPrintReady(client, fastTiming({ totalTimeoutMs: 80, idleTimeoutMs: 200, pollIntervalMs: 5, stableMs: 5000 })),
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
