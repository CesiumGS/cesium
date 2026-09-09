// @ts-check

import ComponentDatatype from "../Core/ComponentDatatype.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import defined from "../Core/defined.js";
import MetadataType from "./MetadataType.js";
import buildVectorTileBuffers from "./buildVectorTileBuffers.js";

/** @import { TypedArray } from "../Core/globalTypes.js"; */
/** @import { DecodedVectorTile, BuildVectorBuffersOptions, VectorTileBuffers } from "./buildVectorTileBuffers.js"; */

/**
 * Build a vector glTF payload from decoded tile-local vector geometry.
 * Each MVT layer produces a separate glTF node (named after the layer),
 * enabling layer-specific styling in the future.
 *
 * @param {DecodedVectorTile} decoded
 * @param {{tileX:number, tileY:number, tileZ:number}} tileCoordinates
 * @param {BuildVectorBuffersOptions} [options]
 * @returns {Uint8Array|undefined}
 *
 * @ignore
 */
function buildVectorGltfFromMVT(decoded, tileCoordinates, options) {
  const buffers = buildVectorTileBuffers(decoded, tileCoordinates, options);
  if (!defined(buffers)) {
    return undefined;
  }
  return buildVectorGltfFromBuffers(buffers);
}

/**
 * Builds a vector glTF (GLB) payload from prepared vector tile geometry
 * buffers, as produced by buildVectorTileBuffers.
 *
 * @param {VectorTileBuffers} buffers
 * @returns {Uint8Array|undefined}
 *
 * @ignore
 */
function buildVectorGltfFromBuffers(buffers) {
  const nullFeatureId = buffers.nullFeatureId;
  const featureCount = buffers.featureCount;
  const properties = buffers.properties;
  const hasProperties = properties.some(
    (props) => props !== null && props !== undefined,
  );

  /** @type {object[]} */
  const bufferViews = [];
  /** @type {object[]} */
  const accessors = [];
  /** @type {Uint8Array[]} */
  const chunks = [];
  let byteLength = 0;

  /**
   * Pads the binary chunk to the given byte alignment.
   * @param {number} [alignment=4]
   */
  function addPadding(alignment) {
    alignment = alignment ?? 4;
    const padding = (alignment - (byteLength % alignment)) % alignment;
    if (padding > 0) {
      chunks.push(new Uint8Array(padding));
      byteLength += padding;
    }
  }

  /**
   * @param {TypedArray} typedArray
   * @param {number} target
   * @returns {number}
   */
  function addBufferView(typedArray, target) {
    addPadding();
    const byteOffset = byteLength;
    chunks.push(
      new Uint8Array(
        typedArray.buffer,
        typedArray.byteOffset,
        typedArray.byteLength,
      ),
    );
    byteLength += typedArray.byteLength;
    const bufferViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: byteOffset,
      byteLength: typedArray.byteLength,
      target: target,
    });
    return bufferViewIndex;
  }

  /**
   * @param {TypedArray} typedArray
   * @param {object} options
   * @param {string} options.type
   * @param {number} options.componentType
   * @param {number} options.target
   * @param {number[]} [options.min]
   * @param {number[]} [options.max]
   * @returns {number}
   */
  function addAccessor(typedArray, options) {
    const bufferView = addBufferView(typedArray, options.target);
    const componentCount = /** @type {*} */ (MetadataType).getComponentCount(
      options.type,
    );
    const accessor = /** @type {*} */ ({
      bufferView: bufferView,
      byteOffset: 0,
      componentType: options.componentType,
      count: typedArray.length / componentCount,
      type: options.type,
    });
    if (defined(options.min)) {
      accessor.min = options.min;
    }
    if (defined(options.max)) {
      accessor.max = options.max;
    }
    const accessorIndex = accessors.length;
    accessors.push(accessor);
    return accessorIndex;
  }

  /**
   * @param {Float32Array} positions
   * @returns {{min:number[],max:number[]}}
   */
  function computeMinMax(positions) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (z < minZ) {
        minZ = z;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }
      if (z > maxZ) {
        maxZ = z;
      }
    }

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    };
  }

  /**
   * @param {*} attributes
   * @param {*} extensions
   * @param {Uint32Array} featureIds
   */
  function addFeatureIdsToPrimitive(attributes, extensions, featureIds) {
    if (featureIds.length === 0) {
      return;
    }
    const featureAccessor = addAccessor(featureIds, {
      type: "SCALAR",
      componentType: ComponentDatatype.UNSIGNED_INT,
      target: WebGLConstants.ARRAY_BUFFER,
    });
    attributes._FEATURE_ID_0 = featureAccessor;
    /** @type {*} */
    const featureIdDef = {
      featureCount: featureCount,
      nullFeatureId: nullFeatureId,
      attribute: 0,
    };
    if (hasProperties) {
      featureIdDef.propertyTable = 0;
    }
    extensions.EXT_mesh_features = {
      featureIds: [featureIdDef],
    };
  }

  /**
   * Adds a raw buffer view for metadata (no accessor target).
   * @param {Uint8Array} bytes
   * @param {number} [alignment=4] Required byte alignment (e.g., 8 for Float64).
   * @returns {number} bufferView index
   */
  function addMetadataBufferView(bytes, alignment) {
    addPadding(alignment);
    const byteOffset = byteLength;
    chunks.push(bytes);
    byteLength += bytes.byteLength;
    const bufferViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset: byteOffset,
      byteLength: bytes.byteLength,
    });
    return bufferViewIndex;
  }

  /**
   * Builds the EXT_structural_metadata extension object with schema and
   * property table from the collected feature properties.
   * @returns {object|undefined}
   */
  function buildStructuralMetadata() {
    if (!hasProperties) {
      return undefined;
    }

    // 1. Determine union of all property names and infer types.
    // propertyName -> "STRING"|"SCALAR"|"BOOLEAN"
    /** @type {Map<string, string>} */
    const propertyTypes = new Map();

    for (const props of properties) {
      if (!props) {
        continue;
      }
      for (const [key, value] of Object.entries(props)) {
        if (!defined(value)) {
          continue;
        }
        const jsType = typeof value;
        let metaType;
        if (jsType === "string") {
          metaType = "STRING";
        } else if (jsType === "number") {
          metaType = "SCALAR";
        } else if (jsType === "boolean") {
          metaType = "BOOLEAN";
        } else {
          // Objects/arrays: coerce to string
          metaType = "STRING";
        }

        const existing = propertyTypes.get(key);
        if (!defined(existing)) {
          propertyTypes.set(key, metaType);
        } else if (existing !== metaType) {
          // Mixed types: coerce to STRING
          propertyTypes.set(key, "STRING");
        }
      }
    }

    if (propertyTypes.size === 0) {
      return undefined;
    }

    // 2. Build schema class properties.
    /** @type {Object.<string, *>} */
    const classProperties = {};
    for (const [name, type] of propertyTypes) {
      if (type === "SCALAR") {
        classProperties[name] = {
          type: "SCALAR",
          componentType: "FLOAT64",
        };
      } else if (type === "BOOLEAN") {
        classProperties[name] = {
          type: "BOOLEAN",
        };
      } else {
        classProperties[name] = {
          type: "STRING",
        };
      }
    }

    // 3. Encode property values into binary buffers.
    /** @type {Object.<string, *>} */
    const tableProperties = {};
    const count = featureCount;

    for (const [name, type] of propertyTypes) {
      if (type === "SCALAR") {
        const values = new Float64Array(count);
        for (let i = 0; i < count; i++) {
          const props = properties[i];
          const raw = props?.[name];
          values[i] =
            typeof raw === "number" && Number.isFinite(raw) ? raw : NaN;
        }
        const bvIndex = addMetadataBufferView(
          new Uint8Array(values.buffer, values.byteOffset, values.byteLength),
          8,
        );
        tableProperties[name] = { values: bvIndex };
      } else if (type === "BOOLEAN") {
        const byteCount = Math.ceil(count / 8);
        const values = new Uint8Array(byteCount);
        for (let i = 0; i < count; i++) {
          const props = properties[i];
          const raw = props?.[name];
          if (raw) {
            values[i >> 3] |= 1 << (i & 7);
          }
        }
        const bvIndex = addMetadataBufferView(values);
        tableProperties[name] = { values: bvIndex };
      } else {
        // STRING encoding: values (UTF-8 bytes) + stringOffsets (Uint32)
        const encoder = new TextEncoder();
        /** @type {Uint8Array[]} */
        const stringParts = [];
        const offsets = new Uint32Array(count + 1);
        let totalBytes = 0;

        for (let i = 0; i < count; i++) {
          offsets[i] = totalBytes;
          const props = properties[i];
          const raw = props?.[name];
          let str;
          if (raw === null || raw === undefined) {
            str = "";
          } else if (typeof raw === "string") {
            str = raw;
          } else {
            str = String(raw);
          }
          const encoded = encoder.encode(str);
          stringParts.push(encoded);
          totalBytes += encoded.byteLength;
        }
        offsets[count] = totalBytes;

        // Concatenate string bytes
        const valuesBuffer = new Uint8Array(totalBytes);
        let writeOffset = 0;
        for (const part of stringParts) {
          valuesBuffer.set(part, writeOffset);
          writeOffset += part.byteLength;
        }

        const valuesBv = addMetadataBufferView(valuesBuffer);
        const offsetsBv = addMetadataBufferView(
          new Uint8Array(
            offsets.buffer,
            offsets.byteOffset,
            offsets.byteLength,
          ),
        );
        tableProperties[name] = {
          values: valuesBv,
          stringOffsets: offsetsBv,
          stringOffsetType: "UINT32",
        };
      }
    }

    return {
      schema: {
        classes: {
          mvt_feature: {
            properties: classProperties,
          },
        },
      },
      propertyTables: [
        {
          class: "mvt_feature",
          count: count,
          properties: tableProperties,
        },
      ],
    };
  }

  /** @type {object[]} */
  const meshes = [];
  /** @type {object[]} */
  const nodes = [];
  const translation = [buffers.origin.x, buffers.origin.y, buffers.origin.z];

  for (const layer of buffers.layers) {
    /** @type {object[]} */
    const primitives = [];

    if (defined(layer.points)) {
      const positions = layer.points.positions;
      const minMax = computeMinMax(positions);

      const positionAccessor = addAccessor(positions, {
        type: "VEC3",
        componentType: ComponentDatatype.FLOAT,
        target: WebGLConstants.ARRAY_BUFFER,
        min: minMax.min,
        max: minMax.max,
      });
      const attributes = /** @type {*} */ ({
        POSITION: positionAccessor,
      });
      const extensions = /** @type {*} */ ({
        CESIUM_mesh_vector: {
          vector: true,
          count: positions.length / 3,
        },
      });
      addFeatureIdsToPrimitive(attributes, extensions, layer.points.featureIds);

      primitives.push({
        mode: PrimitiveType.POINTS,
        attributes: attributes,
        extensions: extensions,
      });
    }

    if (defined(layer.polylines)) {
      const positions = layer.polylines.positions;
      const indices = layer.polylines.indices;
      const minMax = computeMinMax(positions);

      const positionAccessor = addAccessor(positions, {
        type: "VEC3",
        componentType: ComponentDatatype.FLOAT,
        target: WebGLConstants.ARRAY_BUFFER,
        min: minMax.min,
        max: minMax.max,
      });
      const indicesAccessor = addAccessor(indices, {
        type: "SCALAR",
        componentType: ComponentDatatype.UNSIGNED_INT,
        target: WebGLConstants.ELEMENT_ARRAY_BUFFER,
      });
      const attributes = /** @type {*} */ ({
        POSITION: positionAccessor,
      });
      const extensions = /** @type {*} */ ({
        CESIUM_mesh_vector: {
          vector: true,
          count: layer.polylines.count,
        },
      });
      addFeatureIdsToPrimitive(
        attributes,
        extensions,
        layer.polylines.featureIds,
      );

      primitives.push({
        mode: PrimitiveType.LINE_STRIP,
        indices: indicesAccessor,
        attributes: attributes,
        extensions: extensions,
      });
    }

    if (defined(layer.polygons)) {
      const positions = layer.polygons.positions;
      const indices = layer.polygons.indices;
      const attributeOffsets = layer.polygons.attributeOffsets;
      const indicesOffsets = layer.polygons.indicesOffsets;
      const hasPolygonHoles = defined(layer.polygons.holeOffsets);
      const holeCounts = layer.polygons.holeCounts;
      const holeOffsets = layer.polygons.holeOffsets;
      const minMax = computeMinMax(positions);

      const positionAccessor = addAccessor(positions, {
        type: "VEC3",
        componentType: ComponentDatatype.FLOAT,
        target: WebGLConstants.ARRAY_BUFFER,
        min: minMax.min,
        max: minMax.max,
      });
      const indicesAccessor = addAccessor(indices, {
        type: "SCALAR",
        componentType: ComponentDatatype.UNSIGNED_INT,
        target: WebGLConstants.ELEMENT_ARRAY_BUFFER,
      });
      const attributeOffsetsAccessor = addAccessor(attributeOffsets, {
        type: "SCALAR",
        componentType: ComponentDatatype.UNSIGNED_INT,
        target: WebGLConstants.ARRAY_BUFFER,
      });
      const indicesOffsetsAccessor = addAccessor(indicesOffsets, {
        type: "SCALAR",
        componentType: ComponentDatatype.UNSIGNED_INT,
        target: WebGLConstants.ARRAY_BUFFER,
      });
      const holeCountsAccessor = defined(holeCounts)
        ? addAccessor(holeCounts, {
            type: "SCALAR",
            componentType: ComponentDatatype.UNSIGNED_INT,
            target: WebGLConstants.ARRAY_BUFFER,
          })
        : undefined;
      const holeOffsetsAccessor = defined(holeOffsets)
        ? addAccessor(holeOffsets, {
            type: "SCALAR",
            componentType: ComponentDatatype.UNSIGNED_INT,
            target: WebGLConstants.ARRAY_BUFFER,
          })
        : undefined;
      const attributes = /** @type {*} */ ({
        POSITION: positionAccessor,
      });
      const extensions = /** @type {*} */ ({
        CESIUM_mesh_vector: {
          vector: true,
          count: layer.polygons.count,
          polygonAttributeOffsets: attributeOffsetsAccessor,
          polygonIndicesOffsets: indicesOffsetsAccessor,
        },
      });
      if (hasPolygonHoles) {
        extensions.CESIUM_mesh_vector.polygonHoleCounts = holeCountsAccessor;
        extensions.CESIUM_mesh_vector.polygonHoleOffsets = holeOffsetsAccessor;
      }
      addFeatureIdsToPrimitive(
        attributes,
        extensions,
        layer.polygons.featureIds,
      );

      primitives.push({
        mode: PrimitiveType.TRIANGLES,
        indices: indicesAccessor,
        attributes: attributes,
        extensions: extensions,
      });
    }

    if (primitives.length === 0) {
      continue;
    }

    const meshIndex = meshes.length;
    meshes.push({ primitives: primitives });
    nodes.push({
      name: layer.name,
      mesh: meshIndex,
      translation: translation,
    });
  }

  if (nodes.length === 0) {
    return undefined;
  }

  // Build property table AFTER primitives (adds metadata buffer views).
  const structuralMetadata = buildStructuralMetadata();

  const binaryChunk = concatChunks(chunks, byteLength);
  const extensionsUsed = ["CESIUM_mesh_vector"];
  if (featureCount > 0) {
    extensionsUsed.push("EXT_mesh_features");
  }
  if (defined(structuralMetadata)) {
    extensionsUsed.push("EXT_structural_metadata");
  }

  const nodeIndices = nodes.map((_, i) => i);

  const gltfJson = {
    asset: {
      version: "2.0",
    },
    extensionsUsed: extensionsUsed,
    scene: 0,
    scenes: [
      {
        nodes: nodeIndices,
      },
    ],
    nodes: nodes,
    meshes: meshes,
    accessors: accessors,
    bufferViews: bufferViews,
    buffers: [
      {
        byteLength: binaryChunk.byteLength,
      },
    ],
    extensions: /** @type {Object|undefined} */ (undefined),
  };

  if (defined(structuralMetadata)) {
    gltfJson.extensions = {
      EXT_structural_metadata: structuralMetadata,
    };
  }

  return buildGlb(gltfJson, binaryChunk);
}

/**
 * Packs a glTF JSON object and binary buffer into a GLB (Binary glTF) Uint8Array.
 * GLB spec: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout
 *
 * @param {object} gltfJson
 * @param {Uint8Array} binaryChunk
 * @returns {Uint8Array}
 * @ignore
 */
function buildGlb(gltfJson, binaryChunk) {
  const GLB_MAGIC = 0x46546c67; // "glTF"
  const GLB_VERSION = 2;
  const CHUNK_TYPE_JSON = 0x4e4f534a; // "JSON"
  const CHUNK_TYPE_BIN = 0x004e4942; // "BIN\0"

  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltfJson));
  // Pad JSON to 4-byte boundary with spaces (0x20)
  const jsonPaddedLength = Math.ceil(jsonBytes.length / 4) * 4;
  const jsonChunk = new Uint8Array(jsonPaddedLength);
  jsonChunk.fill(0x20);
  jsonChunk.set(jsonBytes);

  // Pad binary to 4-byte boundary with zeros
  const binPaddedLength = Math.ceil(binaryChunk.byteLength / 4) * 4;
  const binChunk = new Uint8Array(binPaddedLength);
  binChunk.set(binaryChunk);

  const totalLength =
    12 + // header
    8 +
    jsonPaddedLength + // JSON chunk header + data
    8 +
    binPaddedLength; // BIN chunk header + data

  const glb = new Uint8Array(totalLength);
  const view = new DataView(glb.buffer);
  let offset = 0;

  // Header
  view.setUint32(offset, GLB_MAGIC, true);
  offset += 4;
  view.setUint32(offset, GLB_VERSION, true);
  offset += 4;
  view.setUint32(offset, totalLength, true);
  offset += 4;

  // JSON chunk
  view.setUint32(offset, jsonPaddedLength, true);
  offset += 4;
  view.setUint32(offset, CHUNK_TYPE_JSON, true);
  offset += 4;
  glb.set(jsonChunk, offset);
  offset += jsonPaddedLength;

  // BIN chunk
  view.setUint32(offset, binPaddedLength, true);
  offset += 4;
  view.setUint32(offset, CHUNK_TYPE_BIN, true);
  offset += 4;
  glb.set(binChunk, offset);

  return glb;
}

/**
 * @param {Uint8Array[]} chunks
 * @param {number} totalByteLength
 * @returns {Uint8Array}
 * @ignore
 */
function concatChunks(chunks, totalByteLength) {
  const out = new Uint8Array(totalByteLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export default buildVectorGltfFromMVT;
export { buildVectorGltfFromBuffers };
