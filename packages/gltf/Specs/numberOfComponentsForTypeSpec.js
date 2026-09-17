"use strict";
const { numberOfComponentsForType } = require("@gltf-pipeline/core");

describe("numberOfComponentsForType", () => {
  it("numberOfComponentsForType", () => {
    expect(numberOfComponentsForType("SCALAR")).toBe(1);
    expect(numberOfComponentsForType("VEC2")).toBe(2);
    expect(numberOfComponentsForType("VEC3")).toBe(3);
    expect(numberOfComponentsForType("VEC4")).toBe(4);
    expect(numberOfComponentsForType("MAT2")).toBe(4);
    expect(numberOfComponentsForType("MAT3")).toBe(9);
    expect(numberOfComponentsForType("MAT4")).toBe(16);
  });
});
