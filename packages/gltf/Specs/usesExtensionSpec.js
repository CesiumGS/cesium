"use strict";
const { usesExtension } = require("@gltf-pipeline/core");

describe("usesExtension", () => {
  it("uses extension", () => {
    const gltf = {
      extensionsUsed: ["extension1", "extension2"],
    };
    expect(usesExtension(gltf, "extension1")).toBe(true);
    expect(usesExtension(gltf, "extension2")).toBe(true);
    expect(usesExtension(gltf, "extension3")).toBe(false);

    const emptyGltf = {};
    expect(usesExtension(emptyGltf, "extension1")).toBe(false);
  });
});
