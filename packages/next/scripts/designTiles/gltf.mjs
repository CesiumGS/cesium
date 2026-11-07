// A minimal GLB 2.0 writer for the generated design tiles (plan 4b task 13).
// Plain Node, no dependencies. One mesh, one primitive: POSITION, NORMAL, a
// `_FEATURE_ID_0` attribute (EXT_mesh_features) and a property table of each
// feature's `name` and `kind` (EXT_structural_metadata), so a pick reports
// the feature's name through `World.feature`.

const FLOAT = 5126;
const UNSIGNED_SHORT = 5123;
const UNSIGNED_INT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

const pad4 = (n) => (n + 3) & ~3;

/**
 * @param {{
 *   positions: Float32Array, normals: Float32Array, indices: Uint32Array,
 *   featureIds: Uint16Array, features: readonly {name: string, kind: string}[],
 *   color: [number, number, number, number],
 * }} mesh Positions are glTF Y-up. `color` is linear RGBA.
 * @returns {Uint8Array}
 */
export function writeGlb(mesh) {
  const { positions, normals, indices, featureIds, features, color } = mesh;
  if (positions.length === 0 || positions.length % 3 !== 0) {
    throw new Error("writeGlb: positions must be a non-empty multiple of 3");
  }
  const vertices = positions.length / 3;
  if (normals.length !== positions.length) {
    throw new Error("writeGlb: normals must match positions");
  }
  if (featureIds.length !== vertices) {
    throw new Error("writeGlb: one feature ID per vertex");
  }
  if (indices.length === 0 || indices.length % 3 !== 0) {
    throw new Error("writeGlb: indices must be a non-empty multiple of 3");
  }
  if (features.length === 0) {
    throw new Error("writeGlb: at least one feature");
  }
  for (const index of indices) {
    if (index >= vertices) {
      throw new Error(
        `writeGlb: index ${index} is beyond ${vertices} vertices`,
      );
    }
  }
  for (const id of featureIds) {
    if (id >= features.length) {
      throw new Error(`writeGlb: feature ID ${id} has no feature`);
    }
  }
  if (color.length !== 4 || !color.every(Number.isFinite)) {
    throw new Error("writeGlb: color is four finite numbers");
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const v = positions[i];
    if (!Number.isFinite(v)) {
      throw new Error("writeGlb: positions must be finite");
    }
    min[i % 3] = Math.min(min[i % 3], v);
    max[i % 3] = Math.max(max[i % 3], v);
  }

  // The property table's strings and their offsets.
  const encoder = new TextEncoder();
  const column = (key) => {
    const parts = features.map((f) => encoder.encode(String(f[key])));
    const offsets = new Uint32Array(parts.length + 1);
    parts.forEach((p, i) => (offsets[i + 1] = offsets[i] + p.length));
    // A zero-length bufferView is invalid glTF: an all-empty column keeps one
    // padding byte (every offset is 0, so no string reads it).
    const values = new Uint8Array(Math.max(1, offsets[parts.length]));
    parts.forEach((p, i) => values.set(p, offsets[i]));
    return { values, offsets };
  };
  const names = column("name");
  const kinds = column("kind");

  // Binary chunk: each view starts 4-byte aligned.
  const blobs = [];
  let length = 0;
  const view = (bytes, target, byteStride) => {
    const entry = { byteOffset: length, byteLength: bytes.byteLength };
    if (byteStride !== undefined) {
      entry.byteStride = byteStride;
    }
    if (target !== undefined) {
      entry.target = target;
    }
    blobs.push({ at: length, bytes });
    length += pad4(bytes.byteLength);
    return entry;
  };
  const raw = (array) =>
    new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  // glTF wants each vertex attribute element 4-byte aligned: every u16 ID
  // sits in its own 4-byte slot (byteStride 4).
  const slots = new Uint8Array(vertices * 4);
  const slotView = new DataView(slots.buffer);
  featureIds.forEach((id, i) => slotView.setUint16(i * 4, id, true));
  const bufferViews = [
    view(raw(positions), ARRAY_BUFFER),
    view(raw(normals), ARRAY_BUFFER),
    view(slots, ARRAY_BUFFER, 4),
    view(raw(indices), ELEMENT_ARRAY_BUFFER),
    view(names.values),
    view(raw(names.offsets)),
    view(kinds.values),
    view(raw(kinds.offsets)),
  ].map((v) => ({ buffer: 0, ...v }));

  const json = {
    asset: { version: "2.0", generator: "cesium-next design tiles" },
    extensionsUsed: ["EXT_mesh_features", "EXT_structural_metadata"],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, _FEATURE_ID_0: 2 },
            indices: 3,
            material: 0,
            mode: 4,
            extensions: {
              EXT_mesh_features: {
                featureIds: [
                  {
                    featureCount: features.length,
                    attribute: 0,
                    propertyTable: 0,
                  },
                ],
              },
            },
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [...color],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
        doubleSided: true,
        ...(color[3] < 1 ? { alphaMode: "BLEND" } : {}),
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: FLOAT,
        count: vertices,
        type: "VEC3",
        min,
        max,
      },
      { bufferView: 1, componentType: FLOAT, count: vertices, type: "VEC3" },
      {
        bufferView: 2,
        componentType: UNSIGNED_SHORT,
        count: vertices,
        type: "SCALAR",
      },
      {
        bufferView: 3,
        componentType: UNSIGNED_INT,
        count: indices.length,
        type: "SCALAR",
      },
    ],
    bufferViews,
    buffers: [{ byteLength: length }],
    extensions: {
      EXT_structural_metadata: {
        schema: {
          id: "design-features",
          classes: {
            feature: {
              properties: {
                name: { type: "STRING" },
                kind: { type: "STRING" },
              },
            },
          },
        },
        propertyTables: [
          {
            class: "feature",
            name: "features",
            count: features.length,
            properties: {
              name: { values: 4, stringOffsets: 5 },
              kind: { values: 6, stringOffsets: 7 },
            },
          },
        ],
      },
    },
  };

  // Chunks: JSON padded with spaces, BIN with zeros.
  const jsonBytes = encoder.encode(JSON.stringify(json));
  const jsonLength = pad4(jsonBytes.length);
  const binLength = pad4(length);
  const total = 12 + 8 + jsonLength + 8 + binLength;
  const out = new Uint8Array(total);
  const data = new DataView(out.buffer);
  data.setUint32(0, GLB_MAGIC, true);
  data.setUint32(4, 2, true);
  data.setUint32(8, total, true);
  data.setUint32(12, jsonLength, true);
  data.setUint32(16, CHUNK_JSON, true);
  out.fill(0x20, 20, 20 + jsonLength);
  out.set(jsonBytes, 20);
  const binHeader = 20 + jsonLength;
  data.setUint32(binHeader, binLength, true);
  data.setUint32(binHeader + 4, CHUNK_BIN, true);
  for (const { at, bytes } of blobs) {
    out.set(bytes, binHeader + 8 + at);
  }
  return out;
}
