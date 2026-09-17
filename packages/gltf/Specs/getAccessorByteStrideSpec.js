"use strict";
const Cesium = require("cesium");
const { getAccessorByteStride } = require("@gltf-pipeline/core");

const WebGLConstants = Cesium.WebGLConstants;

describe("getAccessorByteStride", () => {
  it("gets accessor byte stride", () => {
    const gltf = {
      accessors: [
        {
          componentType: WebGLConstants.FLOAT,
          count: 24,
          type: "VEC3",
          min: [-1.0, -1.0, -1.0],
          max: [1.0, 1.0, 1.0],
        },
        {
          bufferView: 0,
          componentType: WebGLConstants.FLOAT,
          count: 24,
          type: "VEC3",
          min: [-1.0, -1.0, -1.0],
          max: [1.0, 1.0, 1.0],
        },
        {
          bufferView: 1,
          componentType: WebGLConstants.FLOAT,
          count: 24,
          type: "VEC3",
          min: [-1.0, -1.0, -1.0],
          max: [1.0, 1.0, 1.0],
        },
        {
          componentType: WebGLConstants.FLOAT,
          count: 24,
          type: "VEC2",
          min: [0.0, 0.0],
          max: [1.0, 1.0],
        },
        {
          componentType: WebGLConstants.INT,
          count: 36,
          type: "SCALAR",
          min: [0],
          max: [24],
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteLength: 288,
          byteOffset: 0,
        },
        {
          buffer: 0,
          byteLength: 288,
          byteOffset: 288,
          byteStride: 32,
        },
      ],
    };

    expect(getAccessorByteStride(gltf, gltf.accessors[0])).toBe(12);
    expect(getAccessorByteStride(gltf, gltf.accessors[1])).toBe(12);
    expect(getAccessorByteStride(gltf, gltf.accessors[2])).toBe(32);
    expect(getAccessorByteStride(gltf, gltf.accessors[3])).toBe(8);
    expect(getAccessorByteStride(gltf, gltf.accessors[4])).toBe(4);
  });
});
