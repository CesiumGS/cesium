"use strict";
const { readResources } = require("@gltf-pipeline/lib");
const { readAccessorPacked } = require("@gltf-pipeline/core");

const contiguousData = [
  -1.0, 1.0, -1.0, 0.0, 0.0, 0.0, 3.0, 2.0, 1.0, -1.0, -2.0, -3.0,
];

const nan = Number.NaN;
const nonContiguousData = [
  -1.0,
  1.0,
  -1.0,
  nan,
  nan,
  nan,
  0.0,
  0.0,
  0.0,
  nan,
  nan,
  nan,
  3.0,
  2.0,
  1.0,
  nan,
  nan,
  nan,
  -1.0,
  -2.0,
  -3.0,
  nan,
  nan,
  nan,
];

function createGltf(elements, byteStride) {
  const buffer = Buffer.from(new Float32Array(elements).buffer);
  const byteLength = buffer.length;
  const dataUri = `data:application/octet-stream;base64,${buffer.toString(
    "base64",
  )}`;
  const gltf = {
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: "VEC3",
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: byteLength,
        byteStride: byteStride,
      },
    ],
    buffers: [
      {
        uri: dataUri,
        byteLength: byteLength,
      },
    ],
  };
  return readResources(gltf);
}

describe("readAccessorPacked", () => {
  it("reads contiguous accessor", async () => {
    const gltf = await createGltf(contiguousData, 12);
    expect(readAccessorPacked(gltf, gltf.accessors[0])).toEqual(contiguousData);
  });

  it("reads non-contiguous accessor", async () => {
    const gltf = await createGltf(nonContiguousData, 24);
    expect(readAccessorPacked(gltf, gltf.accessors[0])).toEqual(contiguousData);
  });

  it("reads accessor that does not have a buffer view", () => {
    const gltf = {
      accessors: [
        {
          componentType: 5126,
          count: 4,
          type: "VEC3",
        },
      ],
    };
    const expected = new Array(12).fill(0);
    expect(readAccessorPacked(gltf, gltf.accessors[0])).toEqual(expected);
  });
});
