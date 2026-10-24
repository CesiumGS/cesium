import { RuntimeError } from "@cesium/core";
import { parseGlb, removePipelineExtras } from "../index.js";

function writeString(glb, string, byteOffset) {
  glb.set(new TextEncoder().encode(string), byteOffset);
}

function writeUint32(glb, value, byteOffset) {
  new DataView(glb.buffer).setUint32(byteOffset, value, true);
}

describe("parseGlb", function () {
  it("throws an error with invalid magic", function () {
    const glb = new Uint8Array(20);
    writeString(glb, "NOPE", 0);

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

  it("throws an error if version is not 1 or 2", function () {
    const glb = new Uint8Array(20);
    writeString(glb, "glTF", 0);
    writeUint32(glb, 3, 4);

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

  describe("1.0", function () {
    it("throws an error if content format is not JSON", function () {
      const glb = new Uint8Array(20);
      writeString(glb, "glTF", 0);
      writeUint32(glb, 1, 4);
      writeUint32(glb, 20, 8);
      writeUint32(glb, 0, 12);
      writeUint32(glb, 1, 16);

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

    it("loads binary glTF", function () {
      const binaryData = new Uint8Array([0, 1, 2, 3, 4, 5]);
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
      const glb = new Uint8Array(20 + gltfString.length + binaryData.length);
      writeString(glb, "glTF", 0);
      writeUint32(glb, 1, 4);
      writeUint32(glb, 20 + gltfString.length + binaryData.length, 8);
      writeUint32(glb, gltfString.length, 12);
      writeUint32(glb, 0, 16);
      writeString(glb, gltfString, 20);
      glb.set(binaryData, 20 + gltfString.length);

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

  describe("2.0", function () {
    it("loads binary glTF", function () {
      let i;
      const binaryData = new Uint8Array([0, 1, 2, 3, 4, 5]);
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
      const glb = new Uint8Array(28 + gltfString.length + binaryData.length);
      writeString(glb, "glTF", 0);
      writeUint32(glb, 2, 4);
      writeUint32(glb, 12 + 8 + gltfString.length + 8 + binaryData.length, 8);
      writeUint32(glb, gltfString.length, 12);
      writeUint32(glb, 0x4e4f534a, 16);
      writeString(glb, gltfString, 20);
      writeUint32(glb, binaryData.length, 20 + gltfString.length);
      writeUint32(glb, 0x004e4942, 24 + gltfString.length);
      glb.set(binaryData, 28 + gltfString.length);

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
