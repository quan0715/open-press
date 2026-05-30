import { describe, expect, it } from "vitest";
import { isWorkspaceModeLocation } from "../src/openpress/shared";

describe("workspace runtime mode routing", () => {
  it("uses explicit workspace routes instead of the dev query string", () => {
    expect(isWorkspaceModeLocation(locationFixture("/workspace"))).toBe(true);
    expect(isWorkspaceModeLocation(locationFixture("/slide/preview"))).toBe(true);
    expect(isWorkspaceModeLocation(locationFixture("/?dev=1"))).toBe(false);
    expect(isWorkspaceModeLocation(locationFixture("/slide"))).toBe(false);
  });
});

function locationFixture(path: string) {
  const url = new URL(path, "http://127.0.0.1:5173");
  return {
    hostname: url.hostname,
    pathname: url.pathname,
    search: url.search,
  } as Location;
}
