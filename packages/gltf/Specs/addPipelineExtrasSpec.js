import { WebGLConstants } from "@cesium/core";
import { addPipelineExtras } from "../index.js";

describe("addPipelineExtras", function () {
  it("adds pipeline extras to glTF 1.0 assets", function () {
    const gltf = {
      buffers: {
        sampleBuffer0: {
          byteLength: 100,
        },
      },
      shaders: {
        sample0VS: {
          type: WebGLConstants.VERTEX_SHADER,
          uri: "data:,",
        },
      },
    };
    const gltfWithExtras = addPipelineExtras(gltf);
    expect(
      gltfWithExtras.buffers["sampleBuffer0"].extras._pipeline,
    ).toBeDefined();
    expect(gltfWithExtras.shaders["sample0VS"].extras._pipeline).toBeDefined();
  });

  it("adds pipeline extras to glTF 2.0 assets", function () {
    const gltf = {
      buffers: [
        {
          byteLength: 100,
        },
      ],
      extensions: {
        KHR_techniques_webgl: {
          shaders: [
            {
              type: WebGLConstants.VERTEX_SHADER,
              uri: "data:,",
            },
          ],
        },
      },
      extensionsRequired: ["KHR_techniques_webgl"],
      extensionsUsed: ["KHR_techniques_webgl"],
    };
    const gltfWithExtras = addPipelineExtras(gltf);
    expect(gltfWithExtras.buffers[0].extras._pipeline).toBeDefined();
    expect(
      gltfWithExtras.extensions.KHR_techniques_webgl.shaders[0].extras
        ._pipeline,
    ).toBeDefined();
  });
});
