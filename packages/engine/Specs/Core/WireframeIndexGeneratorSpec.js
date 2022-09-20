import { PrimitiveType, WireframeIndexGenerator } from "../../index.js";

describe("Core/WireframeIndexGenerator", function () {
  const createWireframeIndices = WireframeIndexGenerator.createWireframeIndices;
  const getWireframeIndicesCount =
    WireframeIndexGenerator.getWireframeIndicesCount;

  it("createWireframeIndices returns undefined for non-triangles", function () {
    let result = createWireframeIndices(PrimitiveType.POINTS, 6);
    expect(result).toBeUndefined();

    result = createWireframeIndices(PrimitiveType.LINES, 6);
    expect(result).toBeUndefined();

    result = createWireframeIndices(PrimitiveType.LINE_STRIP, 6);
    expect(result).toBeUndefined();

    result = createWireframeIndices(PrimitiveType.LINE_LOOP, 6);
    expect(result).toBeUndefined();
  });

  it("createWireframeIndices works for triangles", function () {
    // prettier-ignore
    const expected = [ 0, 1, 1, 2, 2, 0,   // First triangle
                       3, 4, 4, 5, 5, 3 ]; // Second triangle

    const result = createWireframeIndices(PrimitiveType.TRIANGLES, 6);
    expect(result).toEqual(expected);
  });

  it("createWireframeIndices works for triangles from indices", function () {
    const indices = [1, 0, 2, 4, 5, 3];
    // prettier-ignore
    const expected = [ 1, 0, 0, 2, 2, 1,   // First triangle
                       4, 5, 5, 3, 3, 4 ]; // Second triangle

    const result = createWireframeIndices(PrimitiveType.TRIANGLES, 6, indices);
    expect(result).toEqual(expected);
  });

  it("createWireframeIndices works for triangle strip", function () {
    // prettier-ignore
    const expected = [ 0, 1,         // First edge of the strip
                       1, 2, 2, 0,   // The next two edges of the first triangle
                       2, 3, 3, 1,   // The next two edges of the third triangle
                       3, 4, 4, 2,   // And so on...
                       4, 5, 5, 3 ];

    const result = createWireframeIndices(PrimitiveType.TRIANGLE_STRIP, 6);
    expect(result).toEqual(expected);
  });

  it("createWireframeIndices works for triangle strip from indices", function () {
    const indices = [1, 0, 2, 4, 5, 3];
    // prettier-ignore
    const expected = [ 1, 0,         // First edge of the strip
                       0, 2, 2, 1,   // The next two edges of the first triangle
                       2, 4, 4, 0,   // The next two edges of the third triangle
                       4, 5, 5, 2,   // And so on...
                       5, 3, 3, 4 ];

    const result = createWireframeIndices(
      PrimitiveType.TRIANGLE_STRIP,
      6,
      indices
    );
    expect(result).toEqual(expected);
  });

  it("createWireframeIndices works for triangle fan", function () {
    // prettier-ignore
    const expected = [ 0, 1,         // First edge of the fan
                       1, 2, 2, 0,   // The next two edges of the first triangle
                       2, 3, 3, 0,   // The next two edges of the third triangle
                       3, 4, 4, 0,   // And so on...
                       4, 5, 5, 0 ];

    const result = createWireframeIndices(PrimitiveType.TRIANGLE_FAN, 6);
    expect(result).toEqual(expected);
  });

  it("createWireframeIndices works for triangle fan from indices", function () {
    const indices = [1, 0, 2, 4, 5, 3];
    // prettier-ignore
    const expected = [ 1, 0,         // First edge of the fan
                       0, 2, 2, 1,   // The next two edges of the first triangle
                       2, 4, 4, 1,   // The next two edges of the third triangle
                       4, 5, 5, 1,   // And so on...
                       5, 3, 3, 1 ];

    const result = createWireframeIndices(
      PrimitiveType.TRIANGLE_FAN,
      6,
      indices
    );
    expect(result).toEqual(expected);
  });

  it("getWireframeIndicesCount returns original count for non-triangles", function () {
    const originalCount = 6;
    let result = getWireframeIndicesCount(PrimitiveType.POINTS, originalCount);
    expect(result).toEqual(originalCount);

    result = getWireframeIndicesCount(PrimitiveType.LINES, originalCount);
    expect(result).toEqual(originalCount);

    result = getWireframeIndicesCount(PrimitiveType.LINE_STRIP, originalCount);
    expect(result).toEqual(originalCount);

    result = getWireframeIndicesCount(PrimitiveType.LINE_LOOP, originalCount);
    expect(result).toEqual(originalCount);
  });

  it("getWireframeIndicesCount works", function () {
    const originalCount = 6;
    let result = getWireframeIndicesCount(
      PrimitiveType.TRIANGLES,
      originalCount
    );
    expect(result).toEqual(12);

    result = getWireframeIndicesCount(
      PrimitiveType.TRIANGLE_STRIP,
      originalCount
    );
    expect(result).toEqual(18);

    result = getWireframeIndicesCount(
      PrimitiveType.TRIANGLE_FAN,
      originalCount
    );
    expect(result).toEqual(18);
  });
});
