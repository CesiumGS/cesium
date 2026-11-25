import { addPipelineExtras, removePipelineExtras } from "../index.js";

describe("removePipelineExtras", function () {
  it("removes pipeline extras", function () {
    const gltf = {
      buffers: [
        {
          byteLength: 100,
        },
      ],
    };
    const gltfWithExtrasRemoved = removePipelineExtras(addPipelineExtras(gltf));
    expect(gltfWithExtrasRemoved.buffers[0].extras).toBeUndefined();
  });
});
