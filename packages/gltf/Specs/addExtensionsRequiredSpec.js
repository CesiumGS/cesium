import { addExtensionsRequired } from "../index.js";

describe("addExtensionsRequired", function () {
  it("adds an extension to extensionsRequired", function () {
    const gltf = {};
    addExtensionsRequired(gltf, "KHR_materials_pbrSpecularGlossiness");
    addExtensionsRequired(gltf, "KHR_draco_mesh_compression");
    addExtensionsRequired(gltf, "KHR_draco_mesh_compression"); // Test adding duplicate
    expect(gltf.extensionsRequired).toEqual([
      "KHR_materials_pbrSpecularGlossiness",
      "KHR_draco_mesh_compression",
    ]);
    expect(gltf.extensionsUsed).toEqual([
      "KHR_materials_pbrSpecularGlossiness",
      "KHR_draco_mesh_compression",
    ]);
  });
});
