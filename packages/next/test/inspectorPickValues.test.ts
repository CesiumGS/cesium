import { describe, expect, it } from "vitest";
import { formatValue } from "../widgets/inspector.ts";

describe("inspector formatValue", () => {
  it("writes a bigint as its decimal digits", () => {
    expect(formatValue(2n ** 63n)).toBe("9223372036854775808");
  });

  it("formats a bigint array without throwing", () => {
    expect(formatValue([2n ** 60n + 1n, -3n])).toBe(
      '["1152921504606846977","-3"]',
    );
  });

  it("still formats other arrays as JSON", () => {
    expect(formatValue([1, "a"])).toBe('[1,"a"]');
  });
});
