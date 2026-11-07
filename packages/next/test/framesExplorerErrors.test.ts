import { describe, expect, it } from "vitest";
import {
  MissingDataError,
  isMissing,
  messageOf,
} from "../examples/frames-explorer/errors.ts";

describe("frames explorer errors", () => {
  it("treats a MissingDataError as missing data, on either thread", () => {
    expect(isMissing(new MissingDataError("re-run `npm run setup`"))).toBe(
      true,
    );
    // The protocol rebuilds the error on the page with its name only.
    const rebuilt = Object.assign(new Error("x"), { name: "MissingDataError" });
    expect(isMissing(rebuilt)).toBe(true);
  });

  it("treats any other error as an error", () => {
    expect(isMissing(new Error("re-run `npm run setup`"))).toBe(false);
    expect(isMissing("npm run setup")).toBe(false);
    expect(messageOf(42)).toBe("42");
  });
});
