import { describe, expect, it } from "vitest";
import {
  getFigureDirectory,
  getTableDirectory,
  type CaptionDirectoryItem,
} from "@open-press/core/navigation";

const captions: CaptionDirectoryItem[] = [
  { id: "figure-1", kind: "figure", number: 1, label: "圖 1", title: "系統架構", pageIndex: 2 },
  { id: "table-1", kind: "table", number: 1, label: "表 1", title: "支援格式", pageIndex: 3 },
  { id: "figure-2", kind: "figure", number: 2, label: "圖 2", title: "資料流程", pageIndex: 5 },
];

describe("caption directory selectors", () => {
  it("returns figures in exported document order", () => {
    expect(getFigureDirectory({ indexes: { captions } })).toEqual([
      captions[0],
      captions[2],
    ]);
  });

  it("returns tables without mixing figure entries", () => {
    expect(getTableDirectory({ indexes: { captions } })).toEqual([
      captions[1],
    ]);
  });

  it("supports documents exported before caption indexes existed", () => {
    expect(getFigureDirectory({})).toEqual([]);
    expect(getTableDirectory(null)).toEqual([]);
  });

  it("does not expose a mutable shared empty result", () => {
    const first = getFigureDirectory({});
    first.push(captions[0]);

    expect(getFigureDirectory({})).toEqual([]);
  });
});
