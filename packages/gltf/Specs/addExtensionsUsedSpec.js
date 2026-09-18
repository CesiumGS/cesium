import { addExtensionsUsed } from "../index.js";

describe("addExtensionsUsed", function () {
  it("adds an extension to extensionsUsed", function () {
    const gltf = {};
    addExtensionsUsed(gltf, "KHR_materials_pbrSpecularGlossiness");
    addExtensionsUsed(gltf, "KHR_draco_mesh_compression");
    addExtensionsUsed(gltf, "KHR_draco_mesh_compression"); // Test adding duplicate
    expect(gltf.extensionsUsed).toEqual([
      "KHR_materials_pbrSpecularGlossiness",
      "KHR_draco_mesh_compression",
    ]);
    expect(gltf.extensionsRequired).toBeUndefined();
  });
});
