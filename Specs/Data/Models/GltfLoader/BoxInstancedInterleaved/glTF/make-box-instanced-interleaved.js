"use strict";

const fs = require("fs");

const boxesLength = 4;
const sectionsLength = 2;

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

// prettier-ignore
const rotations = [
  0.3826834, 0.0, 0.0, 0.9238795,
  0.3535534, 0.3535534, 0.1464466, 0.8535534,
  0.4619398, 0.1913417, 0.4619398, 0.7325378,
  0.5319757, 0.02226, 0.4396797, 0.7233174
];

// prettier-ignore
const scales = [
  0.6, 0.7, 1.0,
  1.0, 1.0, 0.5,
  0.75, 0.20, 0.5,
  0.8, 0.60, 0.9,
];

const featureIds = [0, 0, 1, 1];

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

const geometryBuffer = Buffer.concat([
  positionsBuffer,
  normalsBuffer,
  indicesBuffer,
]);
fs.writeFileSync("geometry.bin", geometryBuffer);

const instancesBuffer = Buffer.alloc(boxesLength * 44);

let byteOffset = 0;

for (let i = 0; i < boxesLength; ++i) {
  instancesBuffer.writeFloatLE(translations[i * 3 + 0], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(translations[i * 3 + 1], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(translations[i * 3 + 2], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(rotations[i * 4 + 0], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(rotations[i * 4 + 1], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(rotations[i * 4 + 2], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(rotations[i * 4 + 3], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(scales[i * 3 + 0], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(scales[i * 3 + 1], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(scales[i * 3 + 2], byteOffset);
  byteOffset += 4;
  instancesBuffer.writeFloatLE(featureIds[i], byteOffset);
  byteOffset += 4;
}

fs.writeFileSync("instances.bin", instancesBuffer);

// Feature table 0 properties
const boxNames = ["top left", "bottom left", "bottom right", "top right"];
const boxVolumes = [
  scales[0] * scales[1] * scales[2],
  scales[3] * scales[4] * scales[5],
  scales[6] * scales[7] * scales[8],
  scales[9] * scales[10] * scales[11],
];

// Feature table 1 properties
const sectionNames = ["left", "right"];
const sectionIds = [10293, 54923];

function makeBoxFeatures() {
  const offsets = new Uint16Array(boxesLength + 1);
  const volumes = new Float32Array(boxVolumes);
  let nameText = "";
  let currentOffset = 0;
  for (let i = 0; i < boxesLength; ++i) {
    const name = boxNames[i];
    offsets[i] = currentOffset;
    currentOffset += Buffer.byteLength(name, "utf8");
    nameText += name;
  }
  offsets[boxesLength] = currentOffset;

  return [
    Buffer.from(nameText, "utf8"),
    uint16ArrayToBuffer(offsets),
    float32ArrayToBuffer(volumes),
  ];
}

function makeSectionFeatures() {
  const offsets = new Uint16Array(sectionsLength + 1);
  const ids = new Uint16Array(sectionIds);
  let nameText = "";
  let currentOffset = 0;
  for (let i = 0; i < sectionsLength; ++i) {
    const name = sectionNames[i];
    offsets[i] = currentOffset;
    currentOffset += Buffer.byteLength(name, "utf8");
    nameText += name;
  }
  offsets[sectionsLength] = currentOffset;

  return [
    Buffer.from(nameText, "utf8"),
    uint16ArrayToBuffer(offsets),
    uint16ArrayToBuffer(ids),
  ];
}

const boxMetadataBuffers = makeBoxFeatures();
const sectionMetadataBuffers = makeSectionFeatures();

const metadataBufferViews = boxMetadataBuffers.concat(sectionMetadataBuffers);
const metadataBuffers = [];
const metadataOffsets = [];
let currentOffset = 0;
metadataBufferViews.map(function (metadataBufferView) {
  const boundary = 8;
  const remainder = metadataBufferView.byteLength % boundary;
  const padding = remainder === 0 ? 0 : boundary - remainder;
  const paddingBuffer = Buffer.alloc(padding);
  metadataBuffers.push(metadataBufferView);
  metadataBuffers.push(paddingBuffer);
  metadataOffsets.push(currentOffset);
  currentOffset += metadataBufferView.byteLength + padding;
});
const metadataBuffer = Buffer.concat(metadataBuffers);
fs.writeFileSync("metadata.bin", metadataBuffer);

const gltf = {
  asset: {
    version: "2.0",
  },
  extensionsUsed: ["EXT_feature_metadata", "EXT_mesh_gpu_instancing"],
  extensionsRequired: ["EXT_mesh_gpu_instancing"],
  extensions: {
    EXT_feature_metadata: {
      schema: {
        classes: {
          box: {
            properties: {
              name: {
                type: "STRING",
              },
              volume: {
                type: "FLOAT32",
              },
            },
          },
          section: {
            properties: {
              name: {
                type: "STRING",
              },
              id: {
                type: "UINT16",
              },
            },
          },
        },
      },
      featureTables: {
        boxTable: {
          class: "box",
          count: boxesLength,
          properties: {
            name: {
              offsetType: "UINT16",
              bufferView: 4,
              stringOffsetBufferView: 5,
            },
            volume: {
              bufferView: 6,
            },
          },
        },
        sectionTable: {
          class: "section",
          count: sectionsLength,
          properties: {
            name: {
              offsetType: "UINT16",
              bufferView: 7,
              stringOffsetBufferView: 8,
            },
            id: {
              bufferView: 9,
            },
          },
        },
      },
    },
  },
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
            ROTATION: 4,
            SCALE: 5,
            _FEATURE_ID_0: 6,
          },
          extensions: {
            EXT_feature_metadata: {
              featureIdAttributes: [
                {
                  featureTable: "boxTable",
                  featureIds: {
                    constant: 0,
                    divisor: 1,
                  },
                },
                {
                  featureTable: "sectionTable",
                  featureIds: {
                    attribute: "_FEATURE_ID_0",
                  },
                },
              ],
            },
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
    {
      name: "Instance Rotations",
      bufferView: 3,
      byteOffset: 12,
      componentType: 5126, // FLOAT
      count: 4,
      type: "VEC4",
    },
    {
      name: "Instance Scales",
      bufferView: 3,
      byteOffset: 28,
      componentType: 5126, // FLOAT
      count: 4,
      type: "VEC3",
    },
    {
      name: "Instance Feature IDs",
      bufferView: 3,
      byteOffset: 40,
      componentType: 5126, // FLOAT,
      count: 4,
      type: "SCALAR",
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
      name: "Instance Translations, Rotations, Scales, Feature IDs",
      buffer: 1,
      byteLength: 44 * boxesLength,
      byteStride: 44,
      byteOffset: 0,
    },
    {
      name: "Box Names",
      buffer: 2,
      byteLength: metadataBufferViews[0].byteLength,
      byteOffset: metadataOffsets[0],
    },
    {
      name: "Box Name Offsets",
      buffer: 2,
      byteLength: metadataBufferViews[1].byteLength,
      byteOffset: metadataOffsets[1],
    },
    {
      name: "Box Volumes",
      buffer: 2,
      byteLength: metadataBufferViews[2].byteLength,
      byteOffset: metadataOffsets[2],
    },
    {
      name: "Section Name",
      buffer: 2,
      byteLength: metadataBufferViews[3].byteLength,
      byteOffset: metadataOffsets[3],
    },
    {
      name: "Section Name Offsets",
      buffer: 2,
      byteLength: metadataBufferViews[4].byteLength,
      byteOffset: metadataOffsets[4],
    },
    {
      name: "Section IDs",
      buffer: 2,
      byteLength: metadataBufferViews[5].byteLength,
      byteOffset: metadataOffsets[5],
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
    {
      name: "Metadata Buffer",
      byteLength: metadataBuffer.byteLength,
      uri: "metadata.bin",
    },
  ],
};

const filename = "box-instanced-interleaved.gltf";
fs.writeFileSync(filename, JSON.stringify(gltf, undefined, 2));
