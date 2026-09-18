import { WebGLConstants } from "@cesium/core";
import { addPipelineExtras, removePipelineExtras } from "../index.js";

describe("removePipelineExtras", function () {
  it("removes pipeline extras", function () {
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
    };
    const gltfWithExtrasRemoved = removePipelineExtras(addPipelineExtras(gltf));
    expect(gltfWithExtrasRemoved.buffers[0].extras).toBeUndefined();
    expect(
      gltfWithExtrasRemoved.extensions.KHR_techniques_webgl.shaders[0].extras,
    ).toBeUndefined();
  });
});
