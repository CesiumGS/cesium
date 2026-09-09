// @ts-check
import { decodeTile, GEOMETRY_TYPE, GpuVector } from "@maplibre/mlt";
import defined from "../Core/defined.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";

/** @import { FeatureTable } from "@maplibre/mlt"; */

/**
 * @typedef {object} MLTPoint
 * @property {number} x Tile-local x (0–extent)
 * @property {number} y Tile-local y (0–extent)
 * @ignore
 */

/**
 * @typedef {object} MLTFeature
 * @property {"Point"|"LineString"|"Polygon"|"Unknown"} type
 * @property {Array<MLTPoint>|Array<Array<MLTPoint>>} geometry
 * @property {Record<string, *>} properties
 * @ignore
 */

/**
 * @typedef {object} PreTessellatedPolygons
 * @property {Uint32Array} triangleOffsets
 * @property {Uint32Array} indexBuffer
 * @property {Int32Array|Uint32Array} vertexBuffer
 * @property {number} numFeatures
 * @property {Uint32Array} [vertexOffsets] Exact per-feature vertex start offsets (length = numFeatures + 1), derived from the topology vector.
 * @ignore
 */

/**
 * @typedef {object} MLTLayer
 * @property {string} name
 * @property {number} extent
 * @property {MLTFeature[]} features
 * @property {PreTessellatedPolygons} [preTessellated]
 * @ignore
 */

/**
 * @typedef {object} DecodedMLT
 * @property {MLTLayer[]} layers
 * @ignore
 */

/**
 * Decode a MapLibre Tile (MLT) binary buffer into the same layer/feature
 * structure used by the vector glTF builder ({@link buildVectorGltfFromMVT}).
 * Geometry coordinates remain in tile-local integer space (0 – layer extent,
 * typically 4096).
 *
 * Note on tessellated tiles: the MLT specification allows polygon layers to
 * carry only tessellation data (triangle index/vertex buffers) without the
 * ring topology streams (outlines). Such layers cannot be converted back to
 * ring coordinates, so their <code>features</code> array is empty (no
 * per-feature properties) while the pre-tessellated geometry is still
 * returned for rendering. Encode tiles with both tessellation and outlines
 * enabled to get full feature support.
 *
 * @param {ArrayBuffer} arrayBuffer The raw .mlt tile binary
 * @returns {DecodedMLT}
 * @ignore
 */
function decodeMLT(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const featureTables = decodeTile(bytes);

  /** @type {MLTLayer[]} */
  const layers = [];

  for (const table of featureTables) {
    const extent = table.extent;
    const preTessellated = extractPreTessellated(table);

    /** @type {MLTFeature[]} */
    let features;
    if (defined(preTessellated) && !hasTopology(table.geometryVector)) {
      // Spec-legal encoding: tessellation data without the optional ring
      // topology streams. Ring coordinates (and with them per-feature
      // properties) cannot be reconstructed; keep the GPU buffers so the
      // geometry still renders.
      decodeMLT._oneTimeWarning(
        "decodeMLT-missing-topology",
        `MLT layer "${table.name}" is tessellated but has no ring topology ` +
          `(outlines). Feature coordinates and properties are unavailable; ` +
          `encode with outlines enabled for full feature support.`,
      );
      features = [];
    } else {
      features = convertFeatureTable(table);
    }

    /** @type {MLTLayer} */
    const layer = {
      name: table.name,
      extent: extent,
      features: features,
    };
    if (defined(preTessellated)) {
      layer.preTessellated = preTessellated;
    }
    layers.push(layer);
  }

  return { layers };
}

/**
 * Whether a geometry vector carries the topology streams (part/ring offsets)
 * required to reconstruct ring coordinates.
 *
 * @param {*} geomVector
 * @returns {boolean}
 * @ignore
 */
function hasTopology(geomVector) {
  const topology = geomVector?.topologyVector;
  return defined(topology?.partOffsets) && defined(topology?.ringOffsets);
}

/**
 * Extract pre-tessellated polygon data from an MLT FeatureTable if the
 * geometry is stored as a GpuVector (pre-triangulated index + vertex buffers).
 *
 * @param {FeatureTable} table
 * @returns {PreTessellatedPolygons|undefined}
 * @ignore
 */
function extractPreTessellated(table) {
  const geomVector = table.geometryVector;
  if (!(geomVector instanceof GpuVector)) {
    return undefined;
  }

  const triangleOffsets = geomVector.triangleOffsets;
  const indexBuffer = geomVector.indexBuffer;
  const vertexBuffer = geomVector.vertexBuffer;

  if (
    !defined(triangleOffsets) ||
    !defined(indexBuffer) ||
    !defined(vertexBuffer)
  ) {
    return undefined;
  }

  return {
    triangleOffsets: triangleOffsets,
    indexBuffer: indexBuffer,
    vertexBuffer: vertexBuffer,
    numFeatures: geomVector.numGeometries,
    vertexOffsets: computeVertexOffsets(geomVector),
  };
}

/**
 * Computes exact per-feature vertex start offsets into the GpuVector vertex
 * buffer from its topology vector (ring vertex counts), mirroring the layout
 * used by GpuVector.getGeometries(). Returns undefined when no topology data
 * is present.
 *
 * This is required to map the per-feature local triangle indices to global
 * vertex positions: inferring vertex counts from the maximum referenced index
 * is incorrect when the tessellation does not reference every ring vertex
 * (e.g. collinear vertices dropped by earcut).
 *
 * @param {GpuVector} geomVector
 * @returns {Uint32Array|undefined}
 * @ignore
 */
function computeVertexOffsets(geomVector) {
  const topology = geomVector.topologyVector;
  const partOffsets = topology?.partOffsets;
  const ringOffsets = topology?.ringOffsets;
  if (!defined(partOffsets) || !defined(ringOffsets)) {
    return undefined;
  }
  const geometryOffsets = topology.geometryOffsets;

  const numFeatures = geomVector.numGeometries;
  const vertexOffsets = new Uint32Array(numFeatures + 1);
  let partOffsetCounter = 1;
  let ringOffsetCounter = 1;
  let geometryOffsetCounter = 1;
  let vertexCounter = 0;

  for (let i = 0; i < numFeatures; i++) {
    const geometryType = geomVector.geometryType(i);
    let numPolygons = 1;
    if (geometryType === GEOMETRY_TYPE.MULTIPOLYGON) {
      numPolygons =
        geometryOffsets[geometryOffsetCounter] -
        geometryOffsets[geometryOffsetCounter - 1];
      geometryOffsetCounter++;
    } else if (geometryType !== GEOMETRY_TYPE.POLYGON) {
      // Mixed non-polygon geometry in a GpuVector is not supported.
      return undefined;
    } else if (defined(geometryOffsets)) {
      geometryOffsetCounter++;
    }

    for (let p = 0; p < numPolygons; p++) {
      const numRings =
        partOffsets[partOffsetCounter] - partOffsets[partOffsetCounter - 1];
      partOffsetCounter++;
      for (let r = 0; r < numRings; r++) {
        vertexCounter +=
          ringOffsets[ringOffsetCounter] - ringOffsets[ringOffsetCounter - 1];
        ringOffsetCounter++;
      }
    }
    vertexOffsets[i + 1] = vertexCounter;
  }

  return vertexOffsets;
}

/**
 * Convert an MLT FeatureTable into MLTFeature[] compatible with
 * buildVectorGltfFromMVT's expected input.
 *
 * @param {FeatureTable} table
 * @returns {MLTFeature[]}
 * @ignore
 */
function convertFeatureTable(table) {
  /** @type {MLTFeature[]} */
  const features = [];
  const mltFeatures = table.getFeatures();

  for (let idx = 0; idx < mltFeatures.length; idx++) {
    const mltFeature = mltFeatures[idx];
    const type = geometryTypeToString(mltFeature.geometry.type);
    if (type === "Unknown") {
      continue;
    }

    const geometry = convertGeometry(
      mltFeature.geometry.coordinates,
      mltFeature.geometry.type,
    );
    if (!defined(geometry)) {
      continue;
    }

    /** @type {Object.<string, *>} */
    const properties = {};
    if (defined(mltFeature.properties)) {
      for (const [key, value] of Object.entries(mltFeature.properties)) {
        properties[key] = value;
      }
    }

    features.push({
      type: type,
      geometry: geometry,
      properties: properties,
    });
  }

  return features;
}

/**
 * Map MLT GEOMETRY_TYPE enum to the string types used internally.
 *
 * @param {number} geomType
 * @returns {"Point"|"LineString"|"Polygon"|"Unknown"}
 * @ignore
 */
function geometryTypeToString(geomType) {
  switch (geomType) {
    case GEOMETRY_TYPE.POINT:
    case GEOMETRY_TYPE.MULTIPOINT:
      return "Point";
    case GEOMETRY_TYPE.LINESTRING:
    case GEOMETRY_TYPE.MULTILINESTRING:
      return "LineString";
    case GEOMETRY_TYPE.POLYGON:
    case GEOMETRY_TYPE.MULTIPOLYGON:
      return "Polygon";
    default:
      return "Unknown";
  }
}

/**
 * Convert MLT coordinate arrays (Array<Array<Point>>) into the format
 * expected by buildVectorGltfFromMVT:
 *  - Point: VectorTilePoint[] (flat array of points)
 *  - LineString: VectorTilePoint[][] (array of line segments)
 *  - Polygon: VectorTilePoint[][] (array of rings)
 *
 * MLT coordinates are already in tile-local integer space (0–extent).
 *
 * @param {Array<Array<{x:number, y:number}>>} coordinates
 * @param {number} geomType
 * @returns {Array<MLTPoint>|Array<Array<MLTPoint>>|undefined}
 * @ignore
 */
function convertGeometry(coordinates, geomType) {
  if (!defined(coordinates) || coordinates.length === 0) {
    return undefined;
  }

  switch (geomType) {
    case GEOMETRY_TYPE.POINT:
    case GEOMETRY_TYPE.MULTIPOINT: {
      // Points: flatten all coordinate rings into a single MLTPoint[].
      /** @type {MLTPoint[]} */
      const points = [];
      for (const ring of coordinates) {
        for (const pt of ring) {
          points.push({ x: pt.x, y: pt.y });
        }
      }
      return points.length > 0 ? points : undefined;
    }

    case GEOMETRY_TYPE.LINESTRING:
    case GEOMETRY_TYPE.MULTILINESTRING: {
      // Lines: each ring is a separate line segment.
      /** @type {MLTPoint[][]} */
      const lines = [];
      for (const ring of coordinates) {
        if (ring.length < 2) {
          continue;
        }
        /** @type {MLTPoint[]} */
        const line = [];
        for (const pt of ring) {
          line.push({ x: pt.x, y: pt.y });
        }
        lines.push(line);
      }
      return lines.length > 0 ? lines : undefined;
    }

    case GEOMETRY_TYPE.POLYGON:
    case GEOMETRY_TYPE.MULTIPOLYGON: {
      // Polygons: each ring is either an outer ring or a hole.
      // The buildVectorGltfFromMVT groupPolygonRings function uses
      // signed area to determine outer vs hole, same as MVT convention.
      /** @type {MLTPoint[][]} */
      const rings = [];
      for (const ring of coordinates) {
        if (ring.length < 3) {
          continue;
        }
        /** @type {MLTPoint[]} */
        const convertedRing = [];
        for (const pt of ring) {
          convertedRing.push({ x: pt.x, y: pt.y });
        }
        rings.push(convertedRing);
      }
      return rings.length > 0 ? rings : undefined;
    }

    default:
      return undefined;
  }
}

// Exposed for testing purposes.
decodeMLT._oneTimeWarning = oneTimeWarning;

export default decodeMLT;
