import { WebGLConstants } from "@cesium/core";
import { updateAccessorComponentTypes } from "../index.js";

function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

let buffer;

describe("updateAccessorComponentTypes", function () {
  beforeAll(function () {
    // Note: TypedArray constructors initialize all elements to zero
    const byteBuffer = new Uint8Array(new Int8Array(96).buffer);
    const floatBuffer = new Uint8Array(new Float32Array(96).buffer);
    const unsignedShortBuffer = new Uint8Array(new Uint16Array(96).buffer);
    const source = concatUint8Arrays([
      byteBuffer,
      floatBuffer,
      unsignedShortBuffer,
    ]);
    buffer = {
      byteLength: source.byteLength,
      extras: {
        _pipeline: {
          source: source,
        },
      },
    };
  });

  it("converts joints accessor types", function () {
    const gltf = {
      meshes: [
        {
          primitives: [
            {
              attributes: {
                JOINTS_0: 0,
              },
            },
            {
              attributes: {
                JOINTS_0: 1,
              },
            },
            {
              attributes: {
                JOINTS_0: 2,
              },
            },
          ],
        },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: WebGLConstants.BYTE,
          count: 24,
          type: "VEC4",
        },
        {
          bufferView: 1,
          componentType: WebGLConstants.FLOAT,
          byteOffset: 12,
          count: 24,
          type: "VEC4",
        },
        {
          bufferView: 2,
          componentType: WebGLConstants.UNSIGNED_SHORT,
          count: 24,
          type: "VEC4",
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: 96,
        },
        {
          buffer: 0,
          byteOffset: 96,
          byteLength: 384,
        },
        {
          buffer: 0,
          byteOffset: 480,
          byteLength: 192,
        },
      ],
      buffers: [buffer],
    };

    updateAccessorComponentTypes(gltf);

    expect(gltf.accessors.length).toBe(3);
    expect(gltf.bufferViews.length).toBe(5);
    expect(gltf.buffers.length).toBe(3);

    expect(gltf.accessors[0].componentType).toBe(WebGLConstants.UNSIGNED_BYTE);
    expect(gltf.accessors[0].bufferView).toBe(3);
    expect(gltf.bufferViews[3].buffer).toBe(1);
    expect(gltf.bufferViews[3].byteLength).toBe(96);

    expect(gltf.accessors[1].componentType).toBe(WebGLConstants.UNSIGNED_SHORT);
    expect(gltf.accessors[1].bufferView).toBe(4);
    expect(gltf.accessors[1].byteOffset).toBe(0);
    expect(gltf.bufferViews[4].buffer).toBe(2);
    expect(gltf.bufferViews[4].byteLength).toBe(192);

    expect(gltf.accessors[2].componentType).toBe(WebGLConstants.UNSIGNED_SHORT);
    expect(gltf.accessors[2].bufferView).toBe(2);
  });

  it("converts weights accessor types", function () {
    const gltf = {
      meshes: [
        {
          primitives: [
            {
              attributes: {
                WEIGHTS_0: 0,
              },
            },
            {
              attributes: {
                WEIGHTS_0: 1,
              },
            },
            {
              attributes: {
                WEIGHTS_0: 2,
              },
            },
          ],
        },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: WebGLConstants.FLOAT,
          count: 24,
          type: "VEC4",
        },
        {
          bufferView: 1,
          componentType: WebGLConstants.BYTE,
          byteOffset: 12,
          count: 24,
          type: "VEC4",
        },
        {
          bufferView: 2,
          componentType: WebGLConstants.SHORT,
          count: 24,
          type: "VEC4",
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteLength: 12,
        },
        {
          buffer: 0,
          byteOffset: 12,
          byteLength: 12,
        },
        {
          buffer: 0,
          byteLength: 12,
        },
      ],
      buffers: [buffer],
    };

    updateAccessorComponentTypes(gltf);

    expect(gltf.accessors.length).toBe(3);
    expect(gltf.bufferViews.length).toBe(5);
    expect(gltf.buffers.length).toBe(3);

    expect(gltf.accessors[0].componentType).toBe(WebGLConstants.FLOAT);
    expect(gltf.accessors[0].bufferView).toBe(0);

    expect(gltf.accessors[1].componentType).toBe(WebGLConstants.UNSIGNED_BYTE);
    expect(gltf.accessors[1].bufferView).toBe(3);
    expect(gltf.accessors[1].byteOffset).toBe(0);
    expect(gltf.bufferViews[3].buffer).toBe(1);
    expect(gltf.bufferViews[3].byteLength).toBe(96);

    expect(gltf.accessors[2].componentType).toBe(WebGLConstants.UNSIGNED_SHORT);
    expect(gltf.accessors[2].bufferView).toBe(4);
    expect(gltf.bufferViews[4].buffer).toBe(2);
    expect(gltf.bufferViews[4].byteLength).toBe(192);
  });
});
