import removeExtension from "../Source/removeExtension.js";

describe("removeExtension", function () {
  it("removes extension", function () {
    const gltf = {
      extensionsRequired: ["extension1", "extension2", "extension3"],
      extensionsUsed: ["extension1", "extension2", "extension3"],
      extensions: {
        extension1: {
          value: 9,
        },
        extension2: [0, 1, 2],
      },
      materials: [
        {
          baseColorFactor: [1.0, 0.0, 0.0, 1.0],
          extensions: {
            extension1: {
              value: 10,
            },
          },
        },
        {
          baseColorFactor: [0.0, 0.0, 1.0, 1.0],
          extensions: {
            extension1: {
              value: 11,
            },
          },
        },
      ],
      cameras: [
        {
          extensions: {
            extension1: {
              value: 9,
            },
            extension2: [3, 4, 5],
          },
        },
      ],
    };
    const extension1 = removeExtension(gltf, "extension1");
    expect(gltf.extensionsRequired).toEqual(["extension2", "extension3"]);
    expect(gltf.extensionsUsed).toEqual(["extension2", "extension3"]);
    expect(gltf.extensions).toEqual({
      extension2: [0, 1, 2],
    });
    expect(gltf.materials[0].extensions).toBeUndefined();
    expect(gltf.materials[1].extensions).toBeUndefined();
    expect(gltf.cameras[0].extensions).toEqual({
      extension2: [3, 4, 5],
    });
    expect(extension1).toEqual({
      value: 9,
    });

    const extension2 = removeExtension(gltf, "extension2");
    expect(gltf.extensionsRequired).toEqual(["extension3"]);
    expect(gltf.extensionsUsed).toEqual(["extension3"]);
    expect(gltf.extensions).toBeUndefined();
    expect(gltf.materials[0].extensions).toBeUndefined();
    expect(gltf.materials[1].extensions).toBeUndefined();
    expect(gltf.cameras[0].extensions).toBeUndefined();
    expect(extension2).toEqual([0, 1, 2]);

    const extension3 = removeExtension(gltf, "extension3");
    expect(gltf.extensionsRequired).toBeUndefined();
    expect(gltf.extensionsUsed).toBeUndefined();
    expect(gltf.extensions).toBeUndefined();
    expect(gltf.materials[0].extensions).toBeUndefined();
    expect(gltf.materials[1].extensions).toBeUndefined();
    expect(gltf.cameras[0].extensions).toBeUndefined();
    expect(extension3).toBeUndefined();

    const emptyGltf = {};
    removeExtension(gltf, "extension1");
    expect(emptyGltf).toEqual({});
  });
});
