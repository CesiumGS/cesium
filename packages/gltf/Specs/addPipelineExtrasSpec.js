import { addPipelineExtras } from "../index.js";

describe("addPipelineExtras", function () {
  it("adds pipeline extras to glTF 1.0 assets", function () {
    const gltf = {
      buffers: {
        sampleBuffer0: {
          byteLength: 100,
        },
      },
    };
    const gltfWithExtras = addPipelineExtras(gltf);
    expect(
      gltfWithExtras.buffers["sampleBuffer0"].extras._pipeline,
    ).toBeDefined();
  });

  it("adds pipeline extras to glTF 2.0 assets", function () {
    const gltf = {
      buffers: [
        {
          byteLength: 100,
        },
      ],
    };
    const gltfWithExtras = addPipelineExtras(gltf);
    expect(gltfWithExtras.buffers[0].extras._pipeline).toBeDefined();
  });
});
