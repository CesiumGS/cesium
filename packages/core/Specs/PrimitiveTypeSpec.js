import { PrimitiveType } from "../../index.js";

describe("Core/PrimitiveType", function () {
  it("validate works", function () {
    expect(PrimitiveType.validate(PrimitiveType.POINTS)).toBe(true);
    expect(PrimitiveType.validate(PrimitiveType.LINES)).toBe(true);
    expect(PrimitiveType.validate(PrimitiveType.LINE_LOOP)).toBe(true);
    expect(PrimitiveType.validate(PrimitiveType.LINE_STRIP)).toBe(true);
    expect(PrimitiveType.validate(PrimitiveType.TRIANGLES)).toBe(true);
    expect(PrimitiveType.validate(PrimitiveType.TRIANGLE_STRIP)).toBe(true);
    expect(PrimitiveType.validate(PrimitiveType.TRIANGLE_FAN)).toBe(true);
    expect(PrimitiveType.validate(undefined)).toBe(false);
  });

  it("isLines works", function () {
    expect(PrimitiveType.isLines(PrimitiveType.POINTS)).toBe(false);
    expect(PrimitiveType.isLines(PrimitiveType.LINES)).toBe(true);
    expect(PrimitiveType.isLines(PrimitiveType.LINE_LOOP)).toBe(true);
    expect(PrimitiveType.isLines(PrimitiveType.LINE_STRIP)).toBe(true);
    expect(PrimitiveType.isLines(PrimitiveType.TRIANGLES)).toBe(false);
    expect(PrimitiveType.isLines(PrimitiveType.TRIANGLE_STRIP)).toBe(false);
    expect(PrimitiveType.isLines(PrimitiveType.TRIANGLE_FAN)).toBe(false);
    expect(PrimitiveType.isLines(undefined)).toBe(false);
  });

  it("isTriangles works", function () {
    expect(PrimitiveType.isTriangles(PrimitiveType.POINTS)).toBe(false);
    expect(PrimitiveType.isTriangles(PrimitiveType.LINES)).toBe(false);
    expect(PrimitiveType.isTriangles(PrimitiveType.LINE_LOOP)).toBe(false);
    expect(PrimitiveType.isTriangles(PrimitiveType.LINE_STRIP)).toBe(false);
    expect(PrimitiveType.isTriangles(PrimitiveType.TRIANGLES)).toBe(true);
    expect(PrimitiveType.isTriangles(PrimitiveType.TRIANGLE_STRIP)).toBe(true);
    expect(PrimitiveType.isTriangles(PrimitiveType.TRIANGLE_FAN)).toBe(true);
    expect(PrimitiveType.isTriangles(undefined)).toBe(false);
  });
});
