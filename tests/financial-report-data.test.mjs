import test from "node:test";
import assert from "node:assert/strict";

import { financialReportData } from "../press/financial-report/data.mjs";

test("Northstar Goods demo statements reconcile", () => {
  const data = financialReportData;

  assert.equal(data.revenue - data.costOfRevenue, 13_900);
  assert.equal(data.grossProfit, 13_900);
  assert.equal(data.grossProfit - data.operatingExpenses, 4_200);
  assert.equal(data.operatingIncome, 4_200);
  assert.equal(data.assets, 18_300);
  assert.equal(data.liabilities + data.equity, 18_300);
  assert.equal(data.cashFlow.openingCash + data.cashFlow.netChange, 4_800);
  assert.equal(data.cashFlow.closingCash, 4_800);
});
