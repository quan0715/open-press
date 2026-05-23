// @open-press/core/numbering — label formatters for AI authoring layer.
//
// Core stays neutral about how chapter / section / topic numbers should look.
// Source resolution exposes raw integers via outline items
// (`chapterNumber`, `sectionIndex`, `topicIndex`). This module is a toolbox
// of pure functions that turn those integers into human-readable labels —
// Chinese numerals, Roman numerals, alphabet letters, padded decimals, etc.
//
// Workspaces import what they need and compose them inside their own
// `<Page>` / `<Toc>` components. The core engine never calls these.

// ---------------------------------------------------------------------------
// CJK numeral systems
// ---------------------------------------------------------------------------

const CJK_INFORMAL = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const CJK_FORMAL = ["零", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖"];
const CJK_HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const CJK_EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/**
 * Informal CJK numerals (一二三...). Handles 0 to 9999.
 *
 *   toCjk(1)   → "一"
 *   toCjk(10)  → "十"
 *   toCjk(15)  → "十五"
 *   toCjk(23)  → "二十三"
 *   toCjk(100) → "一百"
 *   toCjk(108) → "一百零八"
 *   toCjk(2024) → "二千零二十四"
 */
export function toCjk(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  return formatCjkDigits(Math.floor(n), CJK_INFORMAL);
}

/**
 * Formal CJK numerals (壹貳參...). Used in legal / financial contexts.
 *
 *   toCjkFormal(1)   → "壹"
 *   toCjkFormal(100) → "壹佰"
 */
export function toCjkFormal(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  return formatCjkDigits(Math.floor(n), CJK_FORMAL, { formal: true });
}

/**
 * Heavenly Stems cycle (甲乙丙丁戊己庚辛壬癸 — 10 only).
 * Cycles for n > 10; n=11 → 甲 again.
 *
 *   toCjkHeavenlyStem(1) → "甲"
 *   toCjkHeavenlyStem(10) → "癸"
 *   toCjkHeavenlyStem(11) → "甲"
 */
export function toCjkHeavenlyStem(n: number): string {
  if (!Number.isFinite(n) || n < 1) return String(n);
  return CJK_HEAVENLY_STEMS[(Math.floor(n) - 1) % 10]!;
}

/**
 * Earthly Branches cycle (子丑寅卯辰巳午未申酉戌亥 — 12 only).
 * Cycles for n > 12.
 */
export function toCjkEarthlyBranch(n: number): string {
  if (!Number.isFinite(n) || n < 1) return String(n);
  return CJK_EARTHLY_BRANCHES[(Math.floor(n) - 1) % 12]!;
}

// ---------------------------------------------------------------------------
// Roman numerals
// ---------------------------------------------------------------------------

const ROMAN_TABLE: Array<[number, string]> = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"],  [90, "XC"],  [50, "L"],  [40, "XL"],
  [10, "X"],   [9, "IX"],   [5, "V"],   [4, "IV"],
  [1, "I"],
];

/**
 * Roman numerals (I, II, III, …, MMXX). Uppercase by default.
 * Pass `{ upper: false }` for lowercase (typical front-matter page numbering).
 *
 *   toRoman(1)     → "I"
 *   toRoman(4)     → "IV"
 *   toRoman(2024)  → "MMXXIV"
 *   toRoman(3, { upper: false }) → "iii"
 */
export function toRoman(n: number, opts: { upper?: boolean } = {}): string {
  if (!Number.isFinite(n) || n < 1) return String(n);
  let value = Math.floor(n);
  let out = "";
  for (const [num, sym] of ROMAN_TABLE) {
    while (value >= num) {
      out += sym;
      value -= num;
    }
  }
  return opts.upper === false ? out.toLowerCase() : out;
}

// ---------------------------------------------------------------------------
// Latin alphabet (a, b, c, …, z, aa, ab, …)
// ---------------------------------------------------------------------------

/**
 * Spreadsheet-column-style alphabet labels.
 *
 *   toAlpha(1)  → "a"
 *   toAlpha(26) → "z"
 *   toAlpha(27) → "aa"
 *   toAlpha(53) → "ba"
 *   toAlpha(1, { upper: true }) → "A"
 */
export function toAlpha(n: number, opts: { upper?: boolean } = {}): string {
  if (!Number.isFinite(n) || n < 1) return String(n);
  let value = Math.floor(n);
  let out = "";
  while (value > 0) {
    const rem = (value - 1) % 26;
    out = String.fromCharCode(97 + rem) + out;
    value = Math.floor((value - 1) / 26);
  }
  return opts.upper ? out.toUpperCase() : out;
}

// ---------------------------------------------------------------------------
// Zero-padded decimal
// ---------------------------------------------------------------------------

/**
 * Zero-padded decimal — `width` is the minimum number of digits.
 *
 *   toPadded(1)              → "01"
 *   toPadded(1, { width: 3 }) → "001"
 *   toPadded(123)            → "123"
 */
export function toPadded(n: number, opts: { width?: number } = {}): string {
  if (!Number.isFinite(n)) return String(n);
  const width = Math.max(1, opts.width ?? 2);
  return String(Math.floor(n)).padStart(width, "0");
}

// ---------------------------------------------------------------------------
// Composable label templates
// ---------------------------------------------------------------------------

export type NumberFormat =
  | "decimal"
  | "decimal-padded"
  | "cjk"
  | "cjk-formal"
  | "cjk-heavenly-stem"
  | "cjk-earthly-branch"
  | "roman"
  | "roman-lower"
  | "alpha"
  | "alpha-upper";

export interface ChapterLabelOptions {
  format?: NumberFormat;
  prefix?: string;
  suffix?: string;
  width?: number;
}

/**
 * Compose a chapter label like "第一章" / "Chapter 1" / "01" / "Part IV".
 *
 *   chapterLabel(1)
 *     → "第一章" (default: cjk informal, prefix 第, suffix 章)
 *   chapterLabel(1, { format: "decimal-padded", prefix: "Chapter " })
 *     → "Chapter 01"
 *   chapterLabel(4, { format: "roman", prefix: "Part " })
 *     → "Part IV"
 *   chapterLabel(2, { prefix: "", suffix: "" })
 *     → "二"
 */
export function chapterLabel(n: number, opts: ChapterLabelOptions = {}): string {
  const { format = "cjk", prefix = "第", suffix = "章", width } = opts;
  return `${prefix}${formatNumber(n, format, width)}${suffix}`;
}

export interface SectionLabelOptions {
  format?: NumberFormat;
  separator?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Compose a section label like "1.1" / "1.1.2" / "一-1".
 *
 * Accepts variadic counters for nesting:
 *   sectionLabel(1, 2)
 *     → "1.2"
 *   sectionLabel(1, 2, 3)
 *     → "1.2.3"
 *   sectionLabel(1, 2, { format: "cjk", separator: "之" })
 *     ⚠ note: pass options as last argument when using variadic counters;
 *     prefer `sectionLabelOf([1, 2], { … })` below for clarity.
 */
export function sectionLabel(...counters: number[]): string {
  return sectionLabelOf(counters);
}

/**
 * Explicit-array variant of `sectionLabel` so options can be passed cleanly.
 *
 *   sectionLabelOf([1, 2], { separator: "-" })   → "1-2"
 *   sectionLabelOf([1, 2, 3], { format: "alpha" }) → "a.b.c"
 *   sectionLabelOf([1, 1], { format: "cjk", separator: "-" }) → "一-一"
 */
export function sectionLabelOf(counters: number[], opts: SectionLabelOptions = {}): string {
  const { format = "decimal", separator = ".", prefix = "", suffix = "" } = opts;
  const parts = counters.map((c) => formatNumber(c, format));
  return `${prefix}${parts.join(separator)}${suffix}`;
}

// ---------------------------------------------------------------------------
// Generic dispatch — `format` -> formatter
// ---------------------------------------------------------------------------

/**
 * Format a single number using one of the named formats. Useful when the
 * caller already knows which format string to use (e.g. from config).
 *
 *   formatNumber(7, "cjk")           → "七"
 *   formatNumber(7, "roman-lower")   → "vii"
 *   formatNumber(3, "decimal-padded", 3) → "003"
 */
export function formatNumber(n: number, format: NumberFormat, width?: number): string {
  switch (format) {
    case "decimal": return String(Math.floor(n));
    case "decimal-padded": return toPadded(n, { width });
    case "cjk": return toCjk(n);
    case "cjk-formal": return toCjkFormal(n);
    case "cjk-heavenly-stem": return toCjkHeavenlyStem(n);
    case "cjk-earthly-branch": return toCjkEarthlyBranch(n);
    case "roman": return toRoman(n, { upper: true });
    case "roman-lower": return toRoman(n, { upper: false });
    case "alpha": return toAlpha(n);
    case "alpha-upper": return toAlpha(n, { upper: true });
    default: return String(n);
  }
}

// ---------------------------------------------------------------------------
// CJK digit formatter (internal)
// ---------------------------------------------------------------------------

const CJK_UNITS = ["", "十", "百", "千"];
const CJK_UNITS_FORMAL = ["", "拾", "佰", "仟"];

// Gap-zero indicator used between non-zero digits when reading aloud
// (e.g. 一百零八). Distinct from 〇/零 as a literal zero digit.
const CJK_GAP_ZERO = "零";

function formatCjkDigits(n: number, digits: string[], opts: { formal?: boolean } = {}): string {
  if (n === 0) return digits[0]!;
  if (n < 0) return `負${formatCjkDigits(-n, digits, opts)}`;
  if (n >= 10000) {
    const wan = Math.floor(n / 10000);
    const rest = n % 10000;
    if (rest === 0) return `${formatCjkDigits(wan, digits, opts)}萬`;
    const restStr = formatCjkDigits(rest, digits, opts);
    const padded = rest < 1000 ? `${CJK_GAP_ZERO}${restStr}` : restStr;
    return `${formatCjkDigits(wan, digits, opts)}萬${padded}`;
  }
  const units = opts.formal ? CJK_UNITS_FORMAL : CJK_UNITS;
  const str = String(n);
  let out = "";
  let zeroPending = false;
  for (let i = 0; i < str.length; i++) {
    const digit = Number(str[i]);
    const unit = str.length - 1 - i;
    if (digit === 0) {
      zeroPending = true;
      continue;
    }
    if (zeroPending && out.length > 0) {
      out += CJK_GAP_ZERO;
      zeroPending = false;
    }
    // Special case: leading "一十" usually written as just "十" in informal CJK
    if (!opts.formal && digit === 1 && unit === 1 && i === 0) {
      out += units[unit];
    } else {
      out += digits[digit] + units[unit];
    }
  }
  return out;
}
