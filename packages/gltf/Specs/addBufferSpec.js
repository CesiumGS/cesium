"use strict";
const { addBuffer } = require("@gltf-pipeline/core");

describe("addBuffer", () => {
  it("adds buffer to gltf and returns its bufferView id", () => {
    const gltf = {
      buffers: [],
      bufferViews: [],
    };
    const buffer0 = Buffer.alloc(100);
    const buffer1 = Buffer.alloc(200);

    expect(addBuffer(gltf, buffer0)).toBe(0);
    expect(addBuffer(gltf, buffer1)).toBe(1);
    expect(gltf.buffers.length).toBe(2);
    expect(gltf.bufferViews.length).toBe(2);
    expect(gltf.buffers[0].extras._pipeline.source).toEqual(buffer0);
    expect(gltf.buffers[1].extras._pipeline.source).toEqual(buffer1);
    expect(gltf.bufferViews[0].buffer).toBe(0);
    expect(gltf.bufferViews[1].buffer).toBe(1);
  });
});
