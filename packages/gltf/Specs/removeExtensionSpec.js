"use strict";
const Cesium = require("cesium");
const { removeExtension } = require("@gltf-pipeline/core");

const WebGLConstants = Cesium.WebGLConstants;

describe("removeExtension", () => {
  it("removes extension", () => {
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

  it("removes CESIUM_RTC extension", () => {
    const gltf = {
      extensionsRequired: ["CESIUM_RTC", "KHR_techniques_webgl"],
      extensionsUsed: ["CESIUM_RTC", "KHR_techniques_webgl"],
      extensions: {
        CESIUM_RTC: {
          center: [1.0, 2.0, 3.0],
        },
        KHR_techniques_webgl: {
          techniques: [
            {
              uniforms: {
                u_modelViewMatrix: {
                  type: WebGLConstants.FLOAT_MAT4,
                  semantic: "CESIUM_RTC_MODELVIEW",
                },
              },
            },
          ],
        },
      },
    };
    const extension = removeExtension(gltf, "CESIUM_RTC");
    expect(extension).toEqual({
      center: [1.0, 2.0, 3.0],
    });
    expect(gltf.extensionsRequired).toEqual(["KHR_techniques_webgl"]);
    expect(gltf.extensionsUsed).toEqual(["KHR_techniques_webgl"]);
    expect(
      gltf.extensions.KHR_techniques_webgl.techniques[0].uniforms
        .u_modelViewMatrix.semantic,
    ).toBe("MODELVIEW");
  });
});
