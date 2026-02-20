import { PrimitiveType, PrimitiveTypeUtils } from "../../index.js";

describe("Core/PrimitiveType", function () {
  it("validate works", function () {
    expect(PrimitiveTypeUtils.validate(PrimitiveType.POINTS)).toBe(true);
    expect(PrimitiveTypeUtils.validate(PrimitiveType.LINES)).toBe(true);
    expect(PrimitiveTypeUtils.validate(PrimitiveType.LINE_LOOP)).toBe(true);
    expect(PrimitiveTypeUtils.validate(PrimitiveType.LINE_STRIP)).toBe(true);
    expect(PrimitiveTypeUtils.validate(PrimitiveType.TRIANGLES)).toBe(true);
    expect(PrimitiveTypeUtils.validate(PrimitiveType.TRIANGLE_STRIP)).toBe(
      true,
    );
    expect(PrimitiveTypeUtils.validate(PrimitiveType.TRIANGLE_FAN)).toBe(true);
    expect(PrimitiveTypeUtils.validate(undefined)).toBe(false);
  });

  it("isLines works", function () {
    expect(PrimitiveTypeUtils.isLines(PrimitiveType.POINTS)).toBe(false);
    expect(PrimitiveTypeUtils.isLines(PrimitiveType.LINES)).toBe(true);
    expect(PrimitiveTypeUtils.isLines(PrimitiveType.LINE_LOOP)).toBe(true);
    expect(PrimitiveTypeUtils.isLines(PrimitiveType.LINE_STRIP)).toBe(true);
    expect(PrimitiveTypeUtils.isLines(PrimitiveType.TRIANGLES)).toBe(false);
    expect(PrimitiveTypeUtils.isLines(PrimitiveType.TRIANGLE_STRIP)).toBe(
      false,
    );
    expect(PrimitiveTypeUtils.isLines(PrimitiveType.TRIANGLE_FAN)).toBe(false);
    expect(PrimitiveTypeUtils.isLines(undefined)).toBe(false);
  });

  it("isTriangles works", function () {
    expect(PrimitiveTypeUtils.isTriangles(PrimitiveType.POINTS)).toBe(false);
    expect(PrimitiveTypeUtils.isTriangles(PrimitiveType.LINES)).toBe(false);
    expect(PrimitiveTypeUtils.isTriangles(PrimitiveType.LINE_LOOP)).toBe(false);
    expect(PrimitiveTypeUtils.isTriangles(PrimitiveType.LINE_STRIP)).toBe(
      false,
    );
    expect(PrimitiveTypeUtils.isTriangles(PrimitiveType.TRIANGLES)).toBe(true);
    expect(PrimitiveTypeUtils.isTriangles(PrimitiveType.TRIANGLE_STRIP)).toBe(
      true,
    );
    expect(PrimitiveTypeUtils.isTriangles(PrimitiveType.TRIANGLE_FAN)).toBe(
      true,
    );
    expect(PrimitiveTypeUtils.isTriangles(undefined)).toBe(false);
  });
});
