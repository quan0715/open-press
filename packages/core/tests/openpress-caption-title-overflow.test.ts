import { describe, expect, it } from "vitest";
import { isClampedTextOverflowing } from "../src/openpress/reader/ReaderNavigationPanel";

describe("caption directory title overflow", () => {
  it("detects vertical overflow from a two-line clamp", () => {
    expect(isClampedTextOverflowing({
      clientHeight: 36,
      scrollHeight: 72,
      clientWidth: 180,
      scrollWidth: 180,
    })).toBe(true);
  });

  it("detects horizontal overflow and ignores fitting text", () => {
    expect(isClampedTextOverflowing({
      clientHeight: 36,
      scrollHeight: 36,
      clientWidth: 180,
      scrollWidth: 220,
    })).toBe(true);
    expect(isClampedTextOverflowing({
      clientHeight: 36,
      scrollHeight: 36,
      clientWidth: 180,
      scrollWidth: 180,
    })).toBe(false);
  });

  it("uses an unclamped measurement when browser scroll metrics are clipped", () => {
    expect(isClampedTextOverflowing({
      clientHeight: 36,
      scrollHeight: 36,
      clientWidth: 180,
      scrollWidth: 180,
      unclampedHeight: 72,
    })).toBe(true);
  });
});
