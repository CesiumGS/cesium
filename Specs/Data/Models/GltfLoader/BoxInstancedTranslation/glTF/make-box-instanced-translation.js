"use strict";

const fs = require("fs");

// prettier-ignore
const indices = [0, 1, 2, 0, 2, 3, 6, 5, 4, 7, 6, 4, 8, 9, 10, 8, 10,
  11, 14, 13, 12, 15, 14, 12, 18, 17, 16, 19, 18, 16, 20, 21, 22, 20,
  22, 23];

// prettier-ignore
const positions = [-0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
  0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5,
  0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,
  -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
  -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
  0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5];

// prettier-ignore
const normals = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
  1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
  1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1.0,
  0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 1.0,
  0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0,
  0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0];

// prettier-ignore
const translations = [
  -2.0, 2.0, 0.0,
  -2.0, -2.0, 0.0,
  2.0, -2.0, 0.0,
  2.0, 2.0, 0.0
];

function float32ArrayToBuffer(float32Array) {
  const buffer = Buffer.alloc(float32Array.byteLength);
  for (let i = 0; i < float32Array.length; ++i) {
    buffer.writeFloatLE(float32Array[i], i * 4);
  }
  return buffer;
}

function uint16ArrayToBuffer(uint16Array) {
  const buffer = Buffer.alloc(uint16Array.byteLength);
  for (let i = 0; i < uint16Array.length; ++i) {
    buffer.writeUInt16LE(uint16Array[i], i * 2);
  }
  return buffer;
}

const indicesBuffer = uint16ArrayToBuffer(new Uint16Array(indices));
const positionsBuffer = float32ArrayToBuffer(new Float32Array(positions));
const normalsBuffer = float32ArrayToBuffer(new Float32Array(normals));

const translationsBuffer = float32ArrayToBuffer(new Float32Array(translations));

const geometryBuffer = Buffer.concat([
  positionsBuffer,
  normalsBuffer,
  indicesBuffer,
]);
fs.writeFileSync("geometry.bin", geometryBuffer);

const instancesBuffer = Buffer.concat([translationsBuffer]);
fs.writeFileSync("instances.bin", instancesBuffer);

const gltf = {
  asset: {
    version: "2.0",
  },
  extensionsUsed: ["EXT_mesh_gpu_instancing"],
  extensionsRequired: ["EXT_mesh_gpu_instancing"],
  scene: 0,
  scenes: [
    {
      nodes: [0],
    },
  ],
  nodes: [
    {
      mesh: 0,
      extensions: {
        EXT_mesh_gpu_instancing: {
          attributes: {
            TRANSLATION: 3,
          },
        },
      },
    },
  ],
  meshes: [
    {
      primitives: [
        {
          attributes: {
            POSITION: 0,
            NORMAL: 1,
          },
          indices: 2,
          mode: 4, // TRIANGLES
        },
      ],
    },
  ],
  accessors: [
    {
      name: "Positions",
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: 24,
      max: [0.5, 0.5, 0.5],
      min: [-0.5, -0.5, -0.5],
      type: "VEC3",
    },
    {
      name: "Normals",
      bufferView: 1,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: 24,
      type: "VEC3",
    },
    {
      name: "Indices",
      bufferView: 2,
      byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: 36,
      type: "SCALAR",
    },
    {
      name: "Instance Translations",
      bufferView: 3,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: 4,
      type: "VEC3",
    },
  ],
  bufferViews: [
    {
      name: "Positions",
      buffer: 0,
      byteLength: positionsBuffer.byteLength,
      byteOffset: 0,
    },
    {
      name: "Normals",
      buffer: 0,
      byteLength: normalsBuffer.byteLength,
      byteOffset: positionsBuffer.byteLength,
    },
    {
      name: "Indices",
      buffer: 0,
      byteLength: indicesBuffer.byteLength,
      byteOffset: positionsBuffer.byteLength + normalsBuffer.byteLength,
    },
    {
      name: "Instance Translations",
      buffer: 1,
      byteLength: translationsBuffer.byteLength,
      byteOffset: 0,
    },
  ],
  buffers: [
    {
      name: "Geometry Buffer",
      byteLength: geometryBuffer.byteLength,
      uri: "geometry.bin",
    },
    {
      name: "Instances Buffer",
      byteLength: instancesBuffer.byteLength,
      uri: "instances.bin",
    },
  ],
};

fs.writeFileSync(
  "box-instanced-translation.gltf",
  JSON.stringify(gltf, undefined, 2)
);
