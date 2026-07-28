import { findMeshoptExtension } from "../../index.js";

describe("Scene/findMeshoptExtension", function () {
  it("returns undefined when neither extension is present", function () {
    expect(findMeshoptExtension({})).not.toBeDefined();
    expect(
      findMeshoptExtension({
        extensions: {},
      }),
    ).not.toBeDefined();
  });

  it("returns EXT object when only EXT is present", function () {
    const ext = {
      buffer: 1,
      byteOffset: 0,
      byteLength: 100,
      mode: "ATTRIBUTES",
    };
    const gltfObject = {
      extensions: {
        EXT_meshopt_compression: ext,
      },
    };
    expect(findMeshoptExtension(gltfObject)).toBe(ext);
  });

  it("returns KHR object when only KHR is present", function () {
    const khr = {
      buffer: 2,
      byteOffset: 4,
      byteLength: 200,
      mode: "ATTRIBUTES",
      filter: "COLOR",
    };
    const gltfObject = {
      extensions: {
        KHR_meshopt_compression: khr,
      },
    };
    expect(findMeshoptExtension(gltfObject)).toBe(khr);
  });

  it("prefers KHR when both extensions are present", function () {
    const khr = {
      buffer: 2,
      mode: "ATTRIBUTES",
    };
    const ext = {
      buffer: 1,
      mode: "ATTRIBUTES",
    };
    const gltfObject = {
      extensions: {
        KHR_meshopt_compression: khr,
        EXT_meshopt_compression: ext,
      },
    };

    expect(findMeshoptExtension(gltfObject)).toBe(khr);
  });
});
