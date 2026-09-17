"use strict";

const { RuntimeError } = require("cesium");

const { parseGlb, removePipelineExtras } = require("@gltf-pipeline/core");

describe("parseGlb", () => {
  it("throws an error with invalid magic", () => {
    const glb = Buffer.alloc(20);
    glb.write("NOPE", 0);

    let thrownError;
    try {
      parseGlb(glb);
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toEqual(
      new RuntimeError("File is not valid binary glTF"),
    );
  });

  it("throws an error if version is not 1 or 2", () => {
    const glb = Buffer.alloc(20);
    glb.write("glTF", 0);
    glb.writeUInt32LE(3, 4);

    let thrownError;
    try {
      parseGlb(glb);
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).toEqual(
      new RuntimeError("Binary glTF version is not 1 or 2"),
    );
  });

  describe("1.0", () => {
    it("throws an error if content format is not JSON", () => {
      const glb = Buffer.alloc(20);
      glb.write("glTF", 0);
      glb.writeUInt32LE(1, 4);
      glb.writeUInt32LE(20, 8);
      glb.writeUInt32LE(0, 12);
      glb.writeUInt32LE(1, 16);

      let thrownError;
      try {
        parseGlb(glb);
      } catch (e) {
        thrownError = e;
      }
      expect(thrownError).toEqual(
        new RuntimeError("Binary glTF scene format is not JSON"),
      );
    });

    it("loads binary glTF", () => {
      const binaryData = Buffer.from([0, 1, 2, 3, 4, 5]);
      const gltf = {
        bufferViews: {
          imageBufferView: {
            byteLength: 0,
          },
          shaderBufferView: {
            byteLength: 0,
          },
        },
        buffers: {
          binary_glTF: {
            byteLength: binaryData.length,
            uri: "data:,",
          },
        },
        images: {
          image: {
            extensions: {
              KHR_binary_glTF: {
                bufferView: "imageBufferView",
                mimeType: "image/jpg",
              },
            },
          },
        },
        shaders: {
          shader: {
            extensions: {
              KHR_binary_glTF: {
                bufferView: "shaderBufferView",
              },
            },
          },
        },
        extensionsUsed: ["KHR_binary_glTF"],
      };
      let gltfString = JSON.stringify(gltf);
      while (gltfString.length % 4 !== 0) {
        gltfString += " ";
      }
      const glb = Buffer.alloc(20 + gltfString.length + binaryData.length);
      glb.write("glTF", 0);
      glb.writeUInt32LE(1, 4);
      glb.writeUInt32LE(20 + gltfString.length + binaryData.length, 8);
      glb.writeUInt32LE(gltfString.length, 12);
      glb.writeUInt32LE(0, 16);
      glb.write(gltfString, 20);
      binaryData.copy(glb, 20 + gltfString.length);

      const parsedGltf = parseGlb(glb);
      expect(parsedGltf.extensionsUsed).toBeUndefined();
      const buffer = parsedGltf.buffers.binary_glTF;
      for (let i = 0; i < binaryData.length; i++) {
        expect(buffer.extras._pipeline.source[i]).toEqual(binaryData[i]);
        expect(buffer.uri).toBeUndefined();
      }

      const image = parsedGltf.images.image;
      expect(image.extensions.KHR_binary_glTF).toBeDefined();
      expect(image.extensions.KHR_binary_glTF.bufferView).toBe(
        "imageBufferView",
      );
      expect(image.extensions.KHR_binary_glTF.mimeType).toBe("image/jpg");
      const shader = parsedGltf.shaders.shader;
      expect(shader.extensions.KHR_binary_glTF).toBeDefined();
      expect(shader.extensions.KHR_binary_glTF.bufferView).toBe(
        "shaderBufferView",
      );
    });
  });

  describe("2.0", () => {
    it("loads binary glTF", () => {
      let i;
      const binaryData = Buffer.from([0, 1, 2, 3, 4, 5]);
      const gltf = {
        asset: {
          version: "2.0",
        },
        buffers: [
          {
            byteLength: binaryData.length,
          },
        ],
        images: [
          {
            bufferView: 0,
            mimeType: "image/jpg",
          },
        ],
      };
      let gltfString = JSON.stringify(gltf);
      while (gltfString.length % 4 !== 0) {
        gltfString += " ";
      }
      const glb = Buffer.alloc(28 + gltfString.length + binaryData.length);
      glb.write("glTF", 0);
      glb.writeUInt32LE(2, 4);
      glb.writeUInt32LE(12 + 8 + gltfString.length + 8 + binaryData.length, 8);
      glb.writeUInt32LE(gltfString.length, 12);
      glb.writeUInt32LE(0x4e4f534a, 16);
      glb.write(gltfString, 20);
      glb.writeUInt32LE(binaryData.length, 20 + gltfString.length);
      glb.writeUInt32LE(0x004e4942, 24 + gltfString.length);
      binaryData.copy(glb, 28 + gltfString.length);

      const parsedGltf = parseGlb(glb);
      const buffer = parsedGltf.buffers[0];
      for (i = 0; i < binaryData.length; i++) {
        expect(buffer.extras._pipeline.source[i]).toEqual(binaryData[i]);
      }
      removePipelineExtras(parsedGltf);
      expect(parsedGltf).toEqual(gltf);
    });
  });
});
