import { expect, test } from "vitest";
import {
  chapterLabel,
  formatNumber,
  sectionLabel,
  sectionLabelOf,
  toAlpha,
  toCjk,
  toCjkEarthlyBranch,
  toCjkFormal,
  toCjkHeavenlyStem,
  toPadded,
  toRoman,
} from "../src/openpress/numbering/index";

const assert = {
  equal: (actual: unknown, expected: unknown) => expect(actual).toBe(expected),
};

test("toCjk handles single digits, teens, and tens", () => {
  assert.equal(toCjk(0), "〇");
  assert.equal(toCjk(1), "一");
  assert.equal(toCjk(9), "九");
  assert.equal(toCjk(10), "十");
  assert.equal(toCjk(11), "十一");
  assert.equal(toCjk(15), "十五");
  assert.equal(toCjk(20), "二十");
  assert.equal(toCjk(23), "二十三");
  assert.equal(toCjk(99), "九十九");
});

test("toCjk handles hundreds, thousands, and 萬 grouping", () => {
  assert.equal(toCjk(100), "一百");
  assert.equal(toCjk(108), "一百零八");
  assert.equal(toCjk(120), "一百二十");
  assert.equal(toCjk(999), "九百九十九");
  assert.equal(toCjk(1000), "一千");
  assert.equal(toCjk(2024), "二千零二十四");
  assert.equal(toCjk(10000), "一萬");
  assert.equal(toCjk(10005), "一萬零五");
});

test("toCjkFormal renders capital variants", () => {
  assert.equal(toCjkFormal(1), "壹");
  assert.equal(toCjkFormal(7), "柒");
  assert.equal(toCjkFormal(10), "壹拾");
  assert.equal(toCjkFormal(100), "壹佰");
});

test("toCjkHeavenlyStem cycles 10", () => {
  assert.equal(toCjkHeavenlyStem(1), "甲");
  assert.equal(toCjkHeavenlyStem(10), "癸");
  assert.equal(toCjkHeavenlyStem(11), "甲");
  assert.equal(toCjkHeavenlyStem(20), "癸");
});

test("toCjkEarthlyBranch cycles 12", () => {
  assert.equal(toCjkEarthlyBranch(1), "子");
  assert.equal(toCjkEarthlyBranch(12), "亥");
  assert.equal(toCjkEarthlyBranch(13), "子");
});

test("toRoman", () => {
  assert.equal(toRoman(1), "I");
  assert.equal(toRoman(4), "IV");
  assert.equal(toRoman(9), "IX");
  assert.equal(toRoman(40), "XL");
  assert.equal(toRoman(2024), "MMXXIV");
  assert.equal(toRoman(3, { upper: false }), "iii");
  assert.equal(toRoman(2024, { upper: false }), "mmxxiv");
});

test("toAlpha follows spreadsheet column convention", () => {
  assert.equal(toAlpha(1), "a");
  assert.equal(toAlpha(26), "z");
  assert.equal(toAlpha(27), "aa");
  assert.equal(toAlpha(28), "ab");
  assert.equal(toAlpha(52), "az");
  assert.equal(toAlpha(53), "ba");
  assert.equal(toAlpha(703), "aaa");
  assert.equal(toAlpha(1, { upper: true }), "A");
  assert.equal(toAlpha(27, { upper: true }), "AA");
});

test("toPadded with custom width", () => {
  assert.equal(toPadded(1), "01");
  assert.equal(toPadded(9), "09");
  assert.equal(toPadded(10), "10");
  assert.equal(toPadded(1, { width: 3 }), "001");
  assert.equal(toPadded(123), "123");
});

test("chapterLabel composes default 第N章", () => {
  assert.equal(chapterLabel(1), "第一章");
  assert.equal(chapterLabel(2), "第二章");
  assert.equal(chapterLabel(11), "第十一章");
  assert.equal(chapterLabel(20), "第二十章");
});

test("chapterLabel respects format / prefix / suffix overrides", () => {
  assert.equal(chapterLabel(1, { format: "decimal-padded", prefix: "Chapter ", suffix: "" }), "Chapter 01");
  assert.equal(chapterLabel(4, { format: "roman", prefix: "Part ", suffix: "" }), "Part IV");
  assert.equal(chapterLabel(2, { prefix: "", suffix: "" }), "二");
  assert.equal(chapterLabel(3, { format: "cjk-formal" }), "第參章");
});

test("sectionLabel + sectionLabelOf compose dotted labels", () => {
  assert.equal(sectionLabel(1, 2), "1.2");
  assert.equal(sectionLabel(1, 2, 3), "1.2.3");
  assert.equal(sectionLabelOf([1, 2], { separator: "-" }), "1-2");
  assert.equal(sectionLabelOf([1, 2, 3], { format: "alpha" }), "a.b.c");
  assert.equal(sectionLabelOf([1, 1], { format: "cjk", separator: "之" }), "一之一");
});

test("formatNumber dispatches by name", () => {
  assert.equal(formatNumber(7, "cjk"), "七");
  assert.equal(formatNumber(7, "cjk-formal"), "柒");
  assert.equal(formatNumber(7, "roman"), "VII");
  assert.equal(formatNumber(7, "roman-lower"), "vii");
  assert.equal(formatNumber(7, "alpha"), "g");
  assert.equal(formatNumber(7, "decimal"), "7");
  assert.equal(formatNumber(3, "decimal-padded", 3), "003");
  assert.equal(formatNumber(3, "cjk-heavenly-stem"), "丙");
  assert.equal(formatNumber(3, "cjk-earthly-branch"), "寅");
});
