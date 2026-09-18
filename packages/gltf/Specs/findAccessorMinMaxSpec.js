import { findAccessorMinMax } from "../index.js";

const contiguousData = [
  -1.0, -2.0, -3.0, 3.0, 2.0, 1.0, 0.0, 0.0, 0.0, 0.5, -0.5, 0.5,
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
    asset: {
      version: "2.0",
    },
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

describe("findAccessorMinMax", function () {
  it("finds the min and max of an accessor", function () {
    const gltf = createGltf(contiguousData, 12);
    const expectedMin = [-1.0, -2.0, -3.0];
    const expectedMax = [3.0, 2.0, 1.0];
    const minMax = findAccessorMinMax(gltf, gltf.accessors[0]);
    expect(minMax.min).toEqual(expectedMin);
    expect(minMax.max).toEqual(expectedMax);
  });

  it("finds the min and max in a non-contiguous accessor", function () {
    const gltf = createGltf(nonContiguousData, 24);
    const expectedMin = [-1.0, -2.0, -3.0];
    const expectedMax = [3.0, 2.0, 1.0];
    const minMax = findAccessorMinMax(gltf, gltf.accessors[0]);
    expect(minMax.min).toEqual(expectedMin);
    expect(minMax.max).toEqual(expectedMax);
  });
});
