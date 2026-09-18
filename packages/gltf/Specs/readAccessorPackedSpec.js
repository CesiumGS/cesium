import { readAccessorPacked } from "../index.js";

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
  const source = new Uint8Array(new Float32Array(elements).buffer);
  const byteLength = source.byteLength;
  return {
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
        byteLength: byteLength,
        extras: {
          _pipeline: {
            source: source,
          },
        },
      },
    ],
  };
}

describe("readAccessorPacked", function () {
  it("reads contiguous accessor", function () {
    const gltf = createGltf(contiguousData, 12);
    expect(readAccessorPacked(gltf, gltf.accessors[0])).toEqual(contiguousData);
  });

  it("reads non-contiguous accessor", function () {
    const gltf = createGltf(nonContiguousData, 24);
    expect(readAccessorPacked(gltf, gltf.accessors[0])).toEqual(contiguousData);
  });

  it("reads accessor that does not have a buffer view", function () {
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
