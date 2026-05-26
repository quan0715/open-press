import { describe, expect, it } from "vitest";
import {
  clampReaderPageIndex,
  formatReaderPageNumber,
  normalizeReaderPageCount,
} from "../src/openpress/reader/readerStateModel";

describe("clampReaderPageIndex", () => {
  it("clamps within [0, pageCount-1]", () => {
    expect(clampReaderPageIndex(0, 5)).toBe(0);
    expect(clampReaderPageIndex(4, 5)).toBe(4);
    expect(clampReaderPageIndex(7, 5)).toBe(4);
    expect(clampReaderPageIndex(-3, 5)).toBe(0);
  });

  it("returns 0 when pageCount is 0 or negative", () => {
    expect(clampReaderPageIndex(3, 0)).toBe(0);
    expect(clampReaderPageIndex(3, -10)).toBe(0);
  });

  it("returns 0 for non-finite inputs", () => {
    expect(clampReaderPageIndex(Number.NaN, 5)).toBe(0);
    expect(clampReaderPageIndex(Number.POSITIVE_INFINITY, 5)).toBe(0);
    expect(clampReaderPageIndex(Number.NEGATIVE_INFINITY, 5)).toBe(0);
  });

  it("truncates fractional indices toward zero", () => {
    expect(clampReaderPageIndex(2.9, 5)).toBe(2);
    expect(clampReaderPageIndex(-0.5, 5)).toBe(0);
  });
});

describe("formatReaderPageNumber", () => {
  it("pads single-digit numbers to two digits", () => {
    expect(formatReaderPageNumber(1)).toBe("01");
    expect(formatReaderPageNumber(9)).toBe("09");
  });

  it("does not pad multi-digit numbers", () => {
    expect(formatReaderPageNumber(10)).toBe("10");
    expect(formatReaderPageNumber(123)).toBe("123");
  });

  it("treats values < 1 as 1", () => {
    expect(formatReaderPageNumber(0)).toBe("01");
    expect(formatReaderPageNumber(-5)).toBe("01");
  });

  it("truncates fractional values", () => {
    expect(formatReaderPageNumber(3.9)).toBe("03");
  });
});

describe("normalizeReaderPageCount", () => {
  it("returns positive integers unchanged", () => {
    expect(normalizeReaderPageCount(7)).toBe(7);
  });

  it("returns 0 for negative or non-finite inputs", () => {
    expect(normalizeReaderPageCount(-3)).toBe(0);
    expect(normalizeReaderPageCount(Number.NaN)).toBe(0);
    expect(normalizeReaderPageCount(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("truncates fractional counts", () => {
    expect(normalizeReaderPageCount(4.8)).toBe(4);
  });
});
