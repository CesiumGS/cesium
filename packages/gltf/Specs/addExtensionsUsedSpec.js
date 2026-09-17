"use strict";
const { addExtensionsUsed } = require("@gltf-pipeline/core");

describe("addExtensionsUsed", () => {
  it("adds an extension to extensionsUsed", () => {
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
