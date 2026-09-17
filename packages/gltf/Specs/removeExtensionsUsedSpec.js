"use strict";
const { removeExtensionsUsed } = require("@gltf-pipeline/core");

describe("removeExtensionsUsed", () => {
  it("removes extension from extensionsUsed", () => {
    const gltf = {
      extensionsRequired: ["extension1", "extension2"],
      extensionsUsed: ["extension1", "extension2"],
    };
    removeExtensionsUsed(gltf, "extension1");
    expect(gltf.extensionsRequired).toEqual(["extension2"]);
    expect(gltf.extensionsUsed).toEqual(["extension2"]);

    removeExtensionsUsed(gltf, "extension2");
    expect(gltf.extensionsRequired).toBeUndefined();
    expect(gltf.extensionsUsed).toBeUndefined();

    const emptyGltf = {};
    removeExtensionsUsed(gltf, "extension1");
    expect(emptyGltf).toEqual({});
  });
});
