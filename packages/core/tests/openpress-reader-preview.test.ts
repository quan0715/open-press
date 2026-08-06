import { describe, expect, it } from "vitest";
import { resolveReaderPreviewUrl } from "../src/openpress/workbench/actions/ReaderPreviewControl";

describe("current Reader preview URL", () => {
  it("opens the active Press from the current local server", () => {
    expect(resolveReaderPreviewUrl(
      { origin: "http://127.0.0.1:6543", hash: "" },
      "userstory",
    )).toBe("http://127.0.0.1:6543/userstory/preview?reader=1");
  });

  it("keeps the current page hash", () => {
    expect(resolveReaderPreviewUrl(
      { origin: "http://localhost:5173", hash: "#page-23" },
      "annual report",
    )).toBe("http://localhost:5173/annual%20report/preview?reader=1#page-23");
  });

  it("does not offer a link without an active Press", () => {
    expect(resolveReaderPreviewUrl(
      { origin: "http://127.0.0.1:6543", hash: "" },
      null,
    )).toBeUndefined();
  });
});
