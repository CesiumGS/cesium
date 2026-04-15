// @ts-check

import Axis from "./Axis.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Matrix4 from "../Core/Matrix4.js";
import PolygonPipeline from "../Core/PolygonPipeline.js";
import decodeMVT from "./decodeMVT.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js";

/** @import Resource from "../Core/Resource.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import { TypedArray } from "../Core/globalTypes.js"; */

const FLOAT = 5126;
const UNSIGNED_INT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const POINTS = 0;
const LINE_STRIP = 3;
const TRIANGLES = 4;

const HEIGHT_POINT = 150;
const HEIGHT_LINE = 100;
const HEIGHT_POLYGON = 50;

const scratchWorld = new Cartesian3();
const scratchLocal = new Cartesian3();

class MVTVectorContent {
  /**
   * @param {VectorGltf3DTileContent} vectorContent
   * @param {*} tilesetAdapter
   */
  constructor(vectorContent, tilesetAdapter) {
    this._vectorContent = vectorContent;
    this._tilesetAdapter = tilesetAdapter;
  }

  get featuresLength() {
    return this._vectorContent.featuresLength;
  }

  get pointsLength() {
    return this._vectorContent.pointsLength;
  }

  get trianglesLength() {
    return this._vectorContent.trianglesLength;
  }

  get geometryByteLength() {
    return this._vectorContent.geometryByteLength;
  }

  get texturesByteLength() {
    return this._vectorContent.texturesByteLength;
  }

  get ready() {
    return this._vectorContent.ready;
  }

  get url() {
    return this._vectorContent.url;
  }

  /**
   * @param {FrameState} frameState
   */
  update(frameState) {
    this._vectorContent.update(this._tilesetAdapter, frameState);
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    this._vectorContent.destroy();
    return destroyObject(this);
  }

  /**
   * @param {Resource} resource
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<MVTVectorContent|undefined>}
   */
  static async fromArrayBuffer(resource, arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      arrayBuffer = await decompressGzip(arrayBuffer);
    }

    const decoded = decodeMVT(arrayBuffer);
    const { tileX, tileY, tileZ } = parseTileCoords(
      resource.getUrlComponent(true),
    );
    const gltf = buildVectorGltfFromDecodedMvt(decoded, tileX, tileY, tileZ);
    if (!defined(gltf)) {
      return undefined;
    }

    const tilesetAdapter = createTilesetAdapter();
    const tileAdapter = createTileAdapter();
    const vectorContent = await VectorGltf3DTileContent.fromGltf(
      tilesetAdapter,
      tileAdapter,
      resource,
      gltf,
    );

    return new MVTVectorContent(vectorContent, tilesetAdapter);
  }
}

/**
 * @param {import("./decodeMVT.js").DecodedMVT} decoded
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @returns {object|undefined}
 */
function buildVectorGltfFromDecodedMvt(decoded, tileX, tileY, tileZ) {
  const origin = computeTileOriginCartesian(tileX, tileY, tileZ);

  /** @type {number[]} */
  const pointPositions = [];
  /** @type {number[]} */
  const pointFeatureIds = [];

  /** @type {number[]} */
  const linePositions = [];
  /** @type {number[]} */
  const lineFeatureIds = [];
  /** @type {number[]} */
  const lineIndices = [];
  let lineCount = 0;

  /** @type {number[]} */
  const polygonPositions = [];
  /** @type {number[]} */
  const polygonFeatureIds = [];
  /** @type {number[]} */
  const polygonIndices = [];
  /** @type {number[]} */
  const polygonAttributeOffsets = [];
  /** @type {number[]} */
  const polygonIndicesOffsets = [];
  let polygonCount = 0;

  let featureId = 0;

  for (const layer of decoded.layers) {
    const extent = layer.extent;
    for (const feature of layer.features) {
      const currentFeatureId = featureId++;

      if (feature.type === "Point") {
        const points = /** @type {import("./decodeMVT.js").MVTPoint[]} */ (
          feature.geometry
        );
        for (const point of points) {
          appendMvtPointAsLocalPosition(
            point,
            tileX,
            tileY,
            tileZ,
            extent,
            HEIGHT_POINT,
            origin,
            pointPositions,
          );
          pointFeatureIds.push(currentFeatureId);
        }
        continue;
      }

      if (feature.type === "LineString") {
        const lines = /** @type {import("./decodeMVT.js").MVTPoint[][]} */ (
          feature.geometry
        );
        for (const line of lines) {
          if (line.length < 2) {
            continue;
          }

          const lineStart = linePositions.length / 3;
          for (const point of line) {
            appendMvtPointAsLocalPosition(
              point,
              tileX,
              tileY,
              tileZ,
              extent,
              HEIGHT_LINE,
              origin,
              linePositions,
            );
            lineFeatureIds.push(currentFeatureId);
          }

          for (let i = 0; i < line.length; i++) {
            lineIndices.push(lineStart + i);
          }
          lineIndices.push(0xffffffff);
          lineCount++;
        }
        continue;
      }

      if (feature.type === "Polygon") {
        const rawRings = /** @type {import("./decodeMVT.js").MVTPoint[][]} */ (
          feature.geometry
        );
        const groups = groupPolygonRings(rawRings);

        for (const group of groups) {
          const rings = [group.outerRing, ...group.holes];
          /** @type {Cartesian2[]} */
          const positions2D = [];
          /** @type {number[]} */
          const positions3D = [];
          /** @type {number[]} */
          const holeOffsets = [];
          let vertexOffset = 0;

          for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
            const ring = rings[ringIndex];
            if (ring.length < 3) {
              continue;
            }
            if (ringIndex > 0) {
              holeOffsets.push(vertexOffset);
            }

            for (const point of ring) {
              positions2D.push(new Cartesian2(point.x, point.y));
              appendMvtPointAsLocalPosition(
                point,
                tileX,
                tileY,
                tileZ,
                extent,
                HEIGHT_POLYGON,
                origin,
                positions3D,
              );
              vertexOffset++;
            }
          }

          if (positions2D.length < 3) {
            continue;
          }

          let triangles;
          try {
            triangles = PolygonPipeline.triangulate(
              positions2D,
              holeOffsets.length > 0 ? holeOffsets : undefined,
            );
          } catch {
            continue;
          }

          if (!defined(triangles) || triangles.length === 0) {
            continue;
          }

          const globalVertexStart = polygonPositions.length / 3;
          const globalIndexStart = polygonIndices.length;
          polygonAttributeOffsets.push(globalVertexStart);
          polygonIndicesOffsets.push(globalIndexStart);

          for (let i = 0; i < positions3D.length; i++) {
            polygonPositions.push(positions3D[i]);
          }
          for (let i = 0; i < positions3D.length / 3; i++) {
            polygonFeatureIds.push(currentFeatureId);
          }
          for (let i = 0; i < triangles.length; i++) {
            polygonIndices.push(triangles[i] + globalVertexStart);
          }
          polygonCount++;
        }
      }
    }
  }

  if (
    pointPositions.length === 0 &&
    linePositions.length === 0 &&
    polygonPositions.length === 0
  ) {
    return undefined;
  }

  if (
    lineIndices.length > 0 &&
    lineIndices[lineIndices.length - 1] === 0xffffffff
  ) {
    lineIndices.pop();
  }

  /** @type {object[]} */
  const bufferViews = [];
  /** @type {object[]} */
  const accessors = [];
  /** @type {Uint8Array[]} */
  const chunks = [];
  let byteLength = 0;

  function addPadding() {
    const padding = (4 - (byteLength % 4)) % 4;
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
    const copy = new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength,
    );
    chunks.push(new Uint8Array(copy));
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
    const componentCount =
      options.type === "SCALAR"
        ? 1
        : options.type === "VEC2"
          ? 2
          : options.type === "VEC3"
            ? 3
            : 4;
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

  /** @type {object[]} */
  const primitives = [];

  if (pointPositions.length > 0) {
    const positions = new Float32Array(pointPositions);
    const featureIds = new Uint32Array(pointFeatureIds);
    const minMax = computeMinMax(positions);

    const positionAccessor = addAccessor(positions, {
      type: "VEC3",
      componentType: FLOAT,
      target: ARRAY_BUFFER,
      min: minMax.min,
      max: minMax.max,
    });
    const featureAccessor = addAccessor(featureIds, {
      type: "SCALAR",
      componentType: UNSIGNED_INT,
      target: ARRAY_BUFFER,
    });

    primitives.push({
      mode: POINTS,
      attributes: {
        POSITION: positionAccessor,
        _FEATURE_ID_0: featureAccessor,
      },
      extensions: {
        CESIUM_mesh_vector: {
          vector: true,
          count: positions.length / 3,
        },
        EXT_mesh_features: {
          featureIds: [
            {
              featureCount: featureId,
              nullFeatureId: 0xffffffff,
              attribute: 0,
            },
          ],
        },
      },
    });
  }

  if (linePositions.length > 0 && lineIndices.length > 1) {
    const positions = new Float32Array(linePositions);
    const featureIds = new Uint32Array(lineFeatureIds);
    const indices = new Uint32Array(lineIndices);
    const minMax = computeMinMax(positions);

    const positionAccessor = addAccessor(positions, {
      type: "VEC3",
      componentType: FLOAT,
      target: ARRAY_BUFFER,
      min: minMax.min,
      max: minMax.max,
    });
    const featureAccessor = addAccessor(featureIds, {
      type: "SCALAR",
      componentType: UNSIGNED_INT,
      target: ARRAY_BUFFER,
    });
    const indicesAccessor = addAccessor(indices, {
      type: "SCALAR",
      componentType: UNSIGNED_INT,
      target: ELEMENT_ARRAY_BUFFER,
    });

    primitives.push({
      mode: LINE_STRIP,
      indices: indicesAccessor,
      attributes: {
        POSITION: positionAccessor,
        _FEATURE_ID_0: featureAccessor,
      },
      extensions: {
        CESIUM_mesh_vector: {
          vector: true,
          count: lineCount,
        },
        EXT_mesh_features: {
          featureIds: [
            {
              featureCount: featureId,
              nullFeatureId: 0xffffffff,
              attribute: 0,
            },
          ],
        },
      },
    });
  }

  if (polygonPositions.length > 0 && polygonIndices.length >= 3) {
    const positions = new Float32Array(polygonPositions);
    const featureIds = new Uint32Array(polygonFeatureIds);
    const indices = new Uint32Array(polygonIndices);
    const attributeOffsets = new Uint32Array(polygonAttributeOffsets);
    const indicesOffsets = new Uint32Array(polygonIndicesOffsets);
    const minMax = computeMinMax(positions);

    const positionAccessor = addAccessor(positions, {
      type: "VEC3",
      componentType: FLOAT,
      target: ARRAY_BUFFER,
      min: minMax.min,
      max: minMax.max,
    });
    const featureAccessor = addAccessor(featureIds, {
      type: "SCALAR",
      componentType: UNSIGNED_INT,
      target: ARRAY_BUFFER,
    });
    const indicesAccessor = addAccessor(indices, {
      type: "SCALAR",
      componentType: UNSIGNED_INT,
      target: ELEMENT_ARRAY_BUFFER,
    });
    const attributeOffsetsAccessor = addAccessor(attributeOffsets, {
      type: "SCALAR",
      componentType: UNSIGNED_INT,
      target: ARRAY_BUFFER,
    });
    const indicesOffsetsAccessor = addAccessor(indicesOffsets, {
      type: "SCALAR",
      componentType: UNSIGNED_INT,
      target: ARRAY_BUFFER,
    });

    primitives.push({
      mode: TRIANGLES,
      indices: indicesAccessor,
      attributes: {
        POSITION: positionAccessor,
        _FEATURE_ID_0: featureAccessor,
      },
      extensions: {
        CESIUM_mesh_vector: {
          vector: true,
          count: polygonCount,
          polygonAttributeOffsets: attributeOffsetsAccessor,
          polygonIndicesOffsets: indicesOffsetsAccessor,
        },
        EXT_mesh_features: {
          featureIds: [
            {
              featureCount: featureId,
              nullFeatureId: 0xffffffff,
              attribute: 0,
            },
          ],
        },
      },
    });
  }

  if (primitives.length === 0) {
    return undefined;
  }

  const binary = concatChunks(chunks, byteLength);
  const base64 = encodeBase64(binary);
  const translation = [origin.x, origin.y, origin.z];

  return {
    asset: {
      version: "2.0",
    },
    extensionsUsed: ["CESIUM_mesh_vector", "EXT_mesh_features"],
    extensionsRequired: ["CESIUM_mesh_vector", "EXT_mesh_features"],
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    nodes: [
      {
        mesh: 0,
        translation: translation,
      },
    ],
    meshes: [
      {
        primitives: primitives,
      },
    ],
    accessors: accessors,
    bufferViews: bufferViews,
    buffers: [
      {
        byteLength: binary.byteLength,
        uri: `data:application/octet-stream;base64,${base64}`,
      },
    ],
  };
}

/**
 * @param {import("./decodeMVT.js").MVTPoint[][]} rawRings
 * @returns {{outerRing: import("./decodeMVT.js").MVTPoint[], holes: import("./decodeMVT.js").MVTPoint[][]}[]}
 */
function groupPolygonRings(rawRings) {
  /** @type {{outerRing: import("./decodeMVT.js").MVTPoint[], holes: import("./decodeMVT.js").MVTPoint[][]}[]} */
  const groups = [];
  for (const rawRing of rawRings) {
    const ring = stripClosingVertex(rawRing);
    if (ring.length < 3) {
      continue;
    }
    const area = ringSignedArea(ring);
    if (area <= 0) {
      groups.push({ outerRing: ring, holes: [] });
    } else if (groups.length > 0) {
      groups[groups.length - 1].holes.push(ring);
    }
  }
  return groups;
}

/**
 * @param {import("./decodeMVT.js").MVTPoint[]} ring
 * @returns {number}
 */
function ringSignedArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
  }
  return area / 2;
}

/**
 * @param {import("./decodeMVT.js").MVTPoint[]} ring
 * @returns {import("./decodeMVT.js").MVTPoint[]}
 */
function stripClosingVertex(ring) {
  if (
    ring.length > 1 &&
    ring[0].x === ring[ring.length - 1].x &&
    ring[0].y === ring[ring.length - 1].y
  ) {
    return ring.slice(0, ring.length - 1);
  }
  return ring;
}

/**
 * @param {import("./decodeMVT.js").MVTPoint} point
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @param {number} extent
 * @param {number} height
 * @param {Cartesian3} origin
 * @param {number[]} out
 */
function appendMvtPointAsLocalPosition(
  point,
  tileX,
  tileY,
  tileZ,
  extent,
  height,
  origin,
  out,
) {
  const n = 1 << tileZ;
  const u = (tileX + point.x / extent) / n;
  const v = (tileY + point.y / extent) / n;
  const lon = u * 2 * Math.PI - Math.PI;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));

  Cartesian3.fromRadians(lon, lat, height, undefined, scratchWorld);
  Cartesian3.subtract(scratchWorld, origin, scratchLocal);
  out.push(scratchLocal.x, scratchLocal.y, scratchLocal.z);
}

/**
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @returns {Cartesian3}
 */
function computeTileOriginCartesian(tileX, tileY, tileZ) {
  const n = 1 << tileZ;
  const u = (tileX + 0.5) / n;
  const v = (tileY + 0.5) / n;
  const lon = u * 2 * Math.PI - Math.PI;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));
  return Cartesian3.fromRadians(lon, lat, 0);
}

/**
 * @param {Uint8Array[]} chunks
 * @param {number} totalByteLength
 * @returns {Uint8Array}
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

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function encodeBase64(bytes) {
  const bufferCtor = /** @type {*} */ (globalThis).Buffer;
  if (defined(bufferCtor)) {
    return bufferCtor.from(bytes).toString("base64");
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * @returns {*}
 */
function createTilesetAdapter() {
  return {
    _modelUpAxis: Axis.Z,
    _modelForwardAxis: Axis.X,
    _projectTo2D: false,
    _enablePick: true,
    _enableDebugWireframe: false,
    featureIdLabel: "featureId_0",
    instanceFeatureIdLabel: "instanceFeatureId_0",
  };
}

/**
 * @returns {*}
 */
function createTileAdapter() {
  return {
    computedTransform: Matrix4.clone(Matrix4.IDENTITY),
  };
}

/**
 * @param {string} url
 * @returns {{tileZ:number, tileX:number, tileY:number}}
 */
function parseTileCoords(url) {
  const match = url.match(/\/(\d+)\/(\d+)\/(\d+)\.(?:pbf|mvt)(?:[?#]|$)/i);
  if (!match) {
    return { tileZ: 0, tileX: 0, tileY: 0 };
  }
  return {
    tileZ: parseInt(match[1], 10),
    tileX: parseInt(match[2], 10),
    tileY: parseInt(match[3], 10),
  };
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<ArrayBuffer>}
 */
async function decompressGzip(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (typeof DecompressionStream === "function") {
    try {
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      return await new Response(stream).arrayBuffer();
    } catch {
      // Use fallback.
    }
  }

  const { inflate } = await import("pako");
  const out = inflate(bytes);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

export { buildVectorGltfFromDecodedMvt };
export default MVTVectorContent;
