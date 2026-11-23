// StableId text form (CS-940): a bigint to and from 16 hex digits.
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  parseStableId,
  stableIdOf,
  stableIdToHex,
  type StableId,
} from "../packages/core/src/scene/identity.ts";

const MAX = (1n << 64n) - 1n;

/** A made-up ID: the engine brands only real ones. */
const asId = (n: bigint) => n as StableId;

describe("stableIdToHex", () => {
  it("writes zero as 16 zeros", () => {
    expect(stableIdToHex(asId(0n))).toBe("0000000000000000");
  });
  it("writes the largest 64-bit value as 16 lowercase f", () => {
    expect(stableIdToHex(asId(MAX))).toBe("ffffffffffffffff");
  });
  it("zero-pads and uses lowercase", () => {
    expect(stableIdToHex(asId(0xabcn))).toBe("0000000000000abc");
  });
  it("refuses a value outside 0 to 2^64 - 1", () => {
    expect(() => stableIdToHex(asId(-1n))).toThrow(RangeError);
    expect(() => stableIdToHex(asId(MAX + 1n))).toThrow(
      /outside 0 to 2\^64 - 1/,
    );
  });
  it("refuses a value that is not a bigint", () => {
    expect(() => stableIdToHex(5 as unknown as StableId)).toThrow(TypeError);
    expect(() => stableIdToHex("5" as unknown as StableId)).toThrow(/bigint/);
  });
});

describe("parseStableId", () => {
  it("reads zero as 0n (the none value round-trips)", () => {
    expect(parseStableId("0000000000000000")).toBe(0n);
  });
  it("reads the largest 64-bit value", () => {
    expect(parseStableId("ffffffffffffffff")).toBe(MAX);
  });
  it("accepts uppercase digits", () => {
    expect(parseStableId("ABCDEF0123456789")).toBe(0xabcdef0123456789n);
  });
  it("round-trips a value from stableIdOf", () => {
    const id = stableIdOf({ kind: "host", item: "a", key: "b" });
    expect(parseStableId(stableIdToHex(id))).toBe(id);
  });
  it("round-trips through JSON with a replacer and a reviver", () => {
    const id = 0x0123456789abcdefn;
    const text = JSON.stringify({ id }, (_k, v) =>
      typeof v === "bigint" ? stableIdToHex(v as StableId) : v,
    );
    expect(() => JSON.stringify({ id })).toThrow(TypeError);
    const back = JSON.parse(text, (k, v) =>
      k === "id" ? parseStableId(v as string) : v,
    ) as { id: bigint };
    expect(back.id).toBe(id);
  });
  it.each([
    ["a sign", "+000000000000001"],
    ["a minus sign", "-000000000000001"],
    ["a 0x prefix", "0x00000000000001"],
    ["leading whitespace", " 000000000000001"],
    ["trailing newline", "000000000000001\n"],
    ["15 digits", "000000000000001"],
    ["17 digits", "00000000000000001"],
    ["a non-hex digit", "000000000000000g"],
    ["the empty string", ""],
    ["an underscore", "0000_0000000001"],
  ])("refuses %s", (_name, text) => {
    expect(() => parseStableId(text)).toThrow(SyntaxError);
  });
  it("refuses a non-string", () => {
    expect(() => parseStableId(1 as unknown as string)).toThrow(TypeError);
  });
  it("does not echo long input", () => {
    const long = "z".repeat(5000);
    try {
      parseStableId(long);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message.length).toBeLessThan(200);
      expect((e as Error).message).toMatch(/5000/);
    }
  });
});

describe("the StableId brand (CS-997)", () => {
  it("is not a plain bigint", () => {
    expectTypeOf<bigint>().not.toExtend<StableId>();
    expectTypeOf<StableId>().toExtend<bigint>();
    // @ts-expect-error a plain bigint is not a StableId
    stableIdToHex(5n);
  });
  it("is what stableIdOf and parseStableId return", () => {
    expectTypeOf(stableIdOf).returns.toEqualTypeOf<StableId>();
    expectTypeOf(parseStableId).returns.toEqualTypeOf<StableId>();
  });
});
