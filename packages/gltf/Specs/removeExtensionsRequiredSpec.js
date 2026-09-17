"use strict";
const { removeExtensionsRequired } = require("@gltf-pipeline/core");

describe("removeExtensionsRequired", () => {
  it("removes extension from extensionsRequired", () => {
    const gltf = {
      extensionsRequired: ["extension1", "extension2"],
      extensionsUsed: ["extension1", "extension2"],
    };
    removeExtensionsRequired(gltf, "extension1");
    expect(gltf.extensionsRequired).toEqual(["extension2"]);
    removeExtensionsRequired(gltf, "extension2");
    expect(gltf.extensionsRequired).toBeUndefined();
    expect(gltf.extensionsUsed).toEqual(["extension1", "extension2"]);

    const emptyGltf = {};
    removeExtensionsRequired(gltf, "extension1");
    expect(emptyGltf).toEqual({});
  });
});
