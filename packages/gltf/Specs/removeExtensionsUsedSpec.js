import { removeExtensionsUsed } from "../index.js";

describe("removeExtensionsUsed", function () {
  it("removes extension from extensionsUsed", function () {
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
