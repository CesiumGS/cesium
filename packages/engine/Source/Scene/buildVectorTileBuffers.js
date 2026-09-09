// @ts-check

import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import PolygonPipeline from "../Core/PolygonPipeline.js";
import Rectangle from "../Core/Rectangle.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import defined from "../Core/defined.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";

/** @ignore */
const DEFAULT_HEIGHT = 0;

// Maximum value of a Uint32; used as sentinel for null feature IDs and primitive restart indices.
const MAX_INT_U32 = 0xffffffff;

const scratchWorld = new Cartesian3();
const scratchLocal = new Cartesian3();
const tilingScheme = new WebMercatorTilingScheme();

/**
 * @typedef {object} VectorTilePoint
 * @property {number} x Tile-local x (0–extent)
 * @property {number} y Tile-local y (0–extent)
 * @ignore
 */

/**
 * @typedef {object} VectorTileFeature
 * @property {"Point"|"LineString"|"Polygon"|"Unknown"} type
 * @property {Array<VectorTilePoint>|Array<Array<VectorTilePoint>>} geometry
 * @property {object} [properties]
 * @ignore
 */

/**
 * @typedef {object} VectorTileLayer
 * @property {string} [name]
 * @property {number} extent
 * @property {VectorTileFeature[]} features
 * @property {PreTessellatedPolygons} [preTessellated] Pre-tessellated polygon data (e.g. from MLT GpuVector).
 * @ignore
 */

/**
 * @typedef {object} DecodedVectorTile
 * @property {VectorTileLayer[]} layers
 * @ignore
 */

/**
 * @typedef {object} PolygonRingGroup
 * @property {Array.<VectorTilePoint>} outerRing
 * @property {Array.<Array.<VectorTilePoint>>} holes
 * @ignore
 */

/**
 * Pre-tessellated polygon data from MLT GpuVector. Contains triangle indices
 * and vertex positions already suitable for direct GPU upload, skipping runtime
 * triangulation.
 *
 * @typedef {object} PreTessellatedPolygons
 * @property {Uint32Array} triangleOffsets Per-feature offset in triangle count (length = numFeatures + 1).
 * @property {Uint32Array} indexBuffer Triangle indices into the vertex buffer.
 * @property {Int32Array|Uint32Array} vertexBuffer Interleaved x,y tile-local coordinates.
 * @property {number} numFeatures Number of polygon features.
 * @property {Uint32Array} [vertexOffsets] Exact per-feature vertex start offsets (length = numFeatures + 1).
 * @ignore
 */

/**
 * @typedef {object} BuildVectorBuffersOptions
 * @property {string} [featureIdProperty] MVT property name to use as feature ID.
 * @ignore
 */

/**
 * Point geometry buffers for a single layer.
 *
 * @typedef {object} VectorLayerPointBuffers
 * @property {Float32Array} positions Interleaved x,y,z local positions.
 * @property {Uint32Array} featureIds Per-vertex feature IDs.
 * @ignore
 */

/**
 * Polyline geometry buffers for a single layer.
 *
 * @typedef {object} VectorLayerPolylineBuffers
 * @property {Float32Array} positions Interleaved x,y,z local positions.
 * @property {Uint32Array} featureIds Per-vertex feature IDs.
 * @property {Uint32Array} indices Line strip indices, separated by primitive restart values.
 * @property {number} count Number of line strips.
 * @ignore
 */

/**
 * Polygon geometry buffers for a single layer.
 *
 * @typedef {object} VectorLayerPolygonBuffers
 * @property {Float32Array} positions Interleaved x,y,z local positions.
 * @property {Uint32Array} featureIds Per-vertex feature IDs.
 * @property {Uint32Array} indices Triangle indices (collection-global).
 * @property {Uint32Array} attributeOffsets Per-polygon vertex start offset.
 * @property {Uint32Array} indicesOffsets Per-polygon triangle index start offset.
 * @property {Uint32Array} [holeCounts] Per-polygon hole count.
 * @property {Uint32Array} [holeOffsets] Flat list of hole start vertex offsets (collection-global).
 * @property {number} count Number of polygons.
 * @ignore
 */

/**
 * Geometry buffers for a single layer. At least one of points/polylines/polygons is defined.
 *
 * @typedef {object} VectorLayerBuffers
 * @property {string} [name]
 * @property {VectorLayerPointBuffers} [points]
 * @property {VectorLayerPolylineBuffers} [polylines]
 * @property {VectorLayerPolygonBuffers} [polygons]
 * @ignore
 */

/**
 * Transferable vector tile geometry: typed array buffers per layer, plus a
 * property table as plain objects. All typed arrays are backed by dedicated
 * ArrayBuffers, suitable for zero-copy transfer from a worker.
 *
 * @typedef {object} VectorTileBuffers
 * @property {{x:number, y:number, z:number}} origin ECEF origin (RTC center) of all local positions.
 * @property {VectorLayerBuffers[]} layers
 * @property {Array<Object.<string, *>|null>} properties Feature properties, indexed by feature ID.
 * @property {number} featureCount Number of features (= number of assigned feature IDs).
 * @property {number} nullFeatureId Sentinel feature ID for vertices without a feature.
 * @ignore
 */

/**
 * Builds transferable vector geometry buffers from decoded tile-local vector
 * geometry. Each layer produces separate point/polyline/polygon buffers.
 * This is the shared geometry stage consumed both by the glTF builder
 * (buildVectorGltfFromMVT) and by the direct buffer path
 * (VectorGltf3DTileContent.fromBuffers).
 *
 * Positions go through tile-local (0–extent) → Web Mercator lon/lat → ECEF,
 * then are emitted relative to the tile-center origin (RTC) so they retain
 * enough precision as Float32.
 *
 * @param {DecodedVectorTile} decoded
 * @param {{tileX:number, tileY:number, tileZ:number}} tileCoordinates
 * @param {BuildVectorBuffersOptions} [options]
 * @returns {VectorTileBuffers|undefined}
 *
 * @ignore
 */
function buildVectorTileBuffers(decoded, tileCoordinates, options) {
  const tileX = tileCoordinates.tileX;
  const tileY = tileCoordinates.tileY;
  const tileZ = tileCoordinates.tileZ;
  const featureIdProperty = options?.featureIdProperty;

  const tileRect = tilingScheme.tileXYToRectangle(tileX, tileY, tileZ);
  const tileCenter = Rectangle.center(tileRect);
  const origin = Cartesian3.fromRadians(
    tileCenter.longitude,
    tileCenter.latitude,
    0,
  );

  const nullFeatureId = MAX_INT_U32;
  const primitiveRestartIndex = MAX_INT_U32;
  // Feature IDs are compact, tile-scoped integers assigned in encounter order,
  // so they can directly index the output properties array. Without
  // featureIdProperty each feature object gets its own ID; with it, features
  // sharing the same property value share one ID (first-seen properties win).
  // Maps a property value (or the feature object itself) to its feature ID.
  const featureIdLookup = new Map();

  // Maps featureId -> properties object (first-seen wins for ID collisions).
  /** @type {Map<number, Object.<string, *>>} */
  const featureProperties = new Map();

  /** @type {VectorLayerBuffers[]} */
  const layers = [];

  for (const layer of decoded.layers) {
    const extent = layer.extent;

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
    /** @type {number[]} */
    const polygonHoleCounts = [];
    /** @type {number[]} */
    const polygonHoleOffsets = [];
    let polygonCount = 0;

    // --- Pre-tessellated polygon path (e.g. from MLT GpuVector) ---
    // When a layer has pre-tessellated data, populate polygon buffers directly
    // from the index/vertex buffers without runtime triangulation.
    if (defined(layer.preTessellated)) {
      const pt = layer.preTessellated;
      const vb = pt.vertexBuffer;
      const ib = pt.indexBuffer;
      const triOffsets = pt.triangleOffsets;
      const numVerts = vb.length / 2;

      // First, assign feature IDs and collect properties from features (in order).
      // This ensures the property table aligns with the triangle offsets.
      const preTessFeatureIds = [];
      for (let fi = 0; fi < pt.numFeatures; fi++) {
        const feature = layer.features[fi];
        let featureId;
        if (defined(feature)) {
          featureId = defined(featureIdProperty)
            ? (mapFeatureIdFromProperty(
                feature,
                featureIdProperty,
                featureIdLookup,
              ) ?? nullFeatureId)
            : getOrAssignAutoFeatureId(feature, featureIdLookup);

          // Collect properties for the property table.
          if (
            featureId !== nullFeatureId &&
            !featureProperties.has(featureId)
          ) {
            /** @type {Object<string, *>} */
            const props = Object.assign({}, feature.properties);
            props["_layer"] = layer.name ?? "";
            featureProperties.set(featureId, props);
          }
        } else {
          featureId = nullFeatureId;
        }
        preTessFeatureIds.push(featureId);
      }

      // Convert all vertices from tile-local coords to local 3D positions.
      for (let vi = 0; vi < numVerts; vi++) {
        const px = vb[vi * 2];
        const py = vb[vi * 2 + 1];
        appendTilePointAsLocalPosition(
          { x: px, y: py },
          tileX,
          tileY,
          tileZ,
          extent,
          DEFAULT_HEIGHT,
          origin,
          polygonPositions,
        );
      }

      // The index buffer uses per-feature LOCAL indices (starting from 0 for
      // each feature). We need vertex offsets per feature to convert local
      // indices to global positions in the vertex buffer. Prefer the exact
      // offsets derived from the MLT topology vector; fall back to inferring
      // them from the maximum referenced index. The fallback undercounts when
      // the tessellation does not reference every ring vertex (e.g. collinear
      // vertices dropped by earcut), which corrupts all subsequent features.
      let featureVertexOffsets = pt.vertexOffsets;
      if (!defined(featureVertexOffsets)) {
        featureVertexOffsets = new Uint32Array(pt.numFeatures + 1);
        for (let fi = 0; fi < pt.numFeatures; fi++) {
          const triStart = triOffsets[fi];
          const triEnd = triOffsets[fi + 1];
          let maxLocalIdx = 0;
          for (let ti = triStart * 3; ti < triEnd * 3; ti++) {
            if (ib[ti] > maxLocalIdx) {
              maxLocalIdx = ib[ti];
            }
          }
          featureVertexOffsets[fi + 1] =
            featureVertexOffsets[fi] + maxLocalIdx + 1;
        }
      }

      if (featureVertexOffsets[pt.numFeatures] !== numVerts) {
        oneTimeWarning(
          "buildVectorTileBuffers-pretess-vertex-mismatch",
          `Pre-tessellated vertex count mismatch: offsets cover ` +
            `${featureVertexOffsets[pt.numFeatures]} vertices but the vertex ` +
            `buffer has ${numVerts}. Geometry may render incorrectly.`,
        );
      }

      // Copy indices, converting from per-feature local to global.
      const vertexFeatureIds = new Array(numVerts).fill(nullFeatureId);
      for (let fi = 0; fi < pt.numFeatures; fi++) {
        const triStart = triOffsets[fi];
        const triEnd = triOffsets[fi + 1];
        const vertOffset = featureVertexOffsets[fi];
        const vertEnd = featureVertexOffsets[fi + 1];
        const featureId = preTessFeatureIds[fi];

        // Mark all vertices belonging to this feature.
        for (let vi = vertOffset; vi < vertEnd; vi++) {
          vertexFeatureIds[vi] = featureId;
        }

        polygonAttributeOffsets.push(vertOffset);
        polygonIndicesOffsets.push(polygonIndices.length);
        polygonHoleCounts.push(0);
        for (let ti = triStart * 3; ti < triEnd * 3; ti++) {
          polygonIndices.push(ib[ti] + vertOffset);
        }
        polygonCount++;
      }

      for (let vi = 0; vi < numVerts; vi++) {
        polygonFeatureIds.push(vertexFeatureIds[vi]);
      }
    }

    for (const feature of layer.features) {
      const currentFeatureId = defined(featureIdProperty)
        ? (mapFeatureIdFromProperty(
            feature,
            featureIdProperty,
            featureIdLookup,
          ) ?? nullFeatureId)
        : getOrAssignAutoFeatureId(feature, featureIdLookup);

      // Collect properties for the property table (first-seen wins).
      if (
        currentFeatureId !== nullFeatureId &&
        !featureProperties.has(currentFeatureId)
      ) {
        /** @type {Object.<string, *>} */
        const props = Object.assign({}, feature.properties);
        props["_layer"] = layer.name ?? "";
        featureProperties.set(currentFeatureId, props);
      }

      if (feature.type === "Point") {
        const points = /** @type {VectorTilePoint[]} */ (feature.geometry);
        for (const point of points) {
          appendTilePointAsLocalPosition(
            point,
            tileX,
            tileY,
            tileZ,
            extent,
            DEFAULT_HEIGHT,
            origin,
            pointPositions,
          );
          pointFeatureIds.push(currentFeatureId);
        }
        continue;
      }

      if (feature.type === "LineString") {
        const lines = /** @type {VectorTilePoint[][]} */ (feature.geometry);
        for (const line of lines) {
          const lineStart = linePositions.length / 3;
          for (const point of line) {
            appendTilePointAsLocalPosition(
              point,
              tileX,
              tileY,
              tileZ,
              extent,
              DEFAULT_HEIGHT,
              origin,
              linePositions,
            );
            lineFeatureIds.push(currentFeatureId);
          }

          for (let i = 0; i < line.length; i++) {
            lineIndices.push(lineStart + i);
          }
          lineIndices.push(primitiveRestartIndex);
          lineCount++;
        }
        continue;
      }

      if (feature.type === "Polygon") {
        // Skip polygon features when pre-tessellated data was already processed.
        if (defined(layer.preTessellated)) {
          continue;
        }
        const rawRings = /** @type {VectorTilePoint[][]} */ (feature.geometry);
        const groups = groupPolygonRings(rawRings);

        if (groups.length === 0 && rawRings.length > 0) {
          // All rings were classified as holes (no outer ring found).
          // This indicates a winding order mismatch.
          oneTimeWarning(
            "buildVectorTileBuffers-no-outer-ring",
            `Polygon has ${rawRings.length} ring(s) but none classified as outer. ` +
              `Signed areas: [${rawRings.map((r) => ringSignedArea(stripClosingVertex(r)).toFixed(1)).join(", ")}]. ` +
              `This may indicate inverted winding order from the source format.`,
          );
        }

        for (const group of groups) {
          const rings = [group.outerRing, ...group.holes];
          /** @type {Cartesian2[]} */
          const positions2D = [];
          /** @type {number[]} */
          const polygonPositionComponents = [];
          /** @type {number[]} */
          const holeOffsets = [];
          let vertexOffset = 0;

          for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
            const ring = rings[ringIndex];
            if (ringIndex > 0) {
              holeOffsets.push(vertexOffset);
            }

            for (const point of ring) {
              positions2D.push(new Cartesian2(point.x, point.y));
              appendTilePointAsLocalPosition(
                point,
                tileX,
                tileY,
                tileZ,
                extent,
                DEFAULT_HEIGHT,
                origin,
                polygonPositionComponents,
              );
              vertexOffset++;
            }
          }

          if (positions2D.length < 3) {
            continue;
          }

          const triangles = PolygonPipeline.triangulate(
            positions2D,
            holeOffsets.length > 0 ? holeOffsets : undefined,
          );

          if (!defined(triangles) || triangles.length === 0) {
            oneTimeWarning(
              "buildVectorTileBuffers-triangulation-failed",
              `Polygon triangulation failed; skipping polygon. ` +
                `Vertices: ${positions2D.length}, holes: ${holeOffsets.length}, ` +
                `layer: "${layer.name}".`,
            );
            continue;
          }

          const globalVertexStart = polygonPositions.length / 3;
          const globalIndexStart = polygonIndices.length;
          polygonAttributeOffsets.push(globalVertexStart);
          polygonIndicesOffsets.push(globalIndexStart);
          polygonHoleCounts.push(holeOffsets.length);
          for (let i = 0; i < holeOffsets.length; i++) {
            polygonHoleOffsets.push(globalVertexStart + holeOffsets[i]);
          }

          for (let i = 0; i < polygonPositionComponents.length; i++) {
            polygonPositions.push(polygonPositionComponents[i]);
          }
          for (let i = 0; i < polygonPositionComponents.length / 3; i++) {
            polygonFeatureIds.push(currentFeatureId);
          }
          for (let i = 0; i < triangles.length; i++) {
            polygonIndices.push(triangles[i] + globalVertexStart);
          }
          polygonCount++;
        }
      }
    }

    // Skip layers with no geometry.
    if (
      pointPositions.length === 0 &&
      linePositions.length === 0 &&
      polygonPositions.length === 0
    ) {
      continue;
    }

    if (
      lineIndices.length > 0 &&
      lineIndices[lineIndices.length - 1] === primitiveRestartIndex
    ) {
      lineIndices.pop();
    }

    /** @type {VectorLayerBuffers} */
    const layerBuffers = {
      name: layer.name,
      points: undefined,
      polylines: undefined,
      polygons: undefined,
    };

    if (pointPositions.length > 0) {
      layerBuffers.points = {
        positions: new Float32Array(pointPositions),
        featureIds: new Uint32Array(pointFeatureIds),
      };
    }

    if (linePositions.length > 0 && lineIndices.length > 1) {
      layerBuffers.polylines = {
        positions: new Float32Array(linePositions),
        featureIds: new Uint32Array(lineFeatureIds),
        indices: new Uint32Array(lineIndices),
        count: lineCount,
      };
    }

    if (polygonPositions.length > 0 && polygonIndices.length >= 3) {
      const hasPolygonHoles = polygonHoleOffsets.length > 0;
      layerBuffers.polygons = {
        positions: new Float32Array(polygonPositions),
        featureIds: new Uint32Array(polygonFeatureIds),
        indices: new Uint32Array(polygonIndices),
        attributeOffsets: new Uint32Array(polygonAttributeOffsets),
        indicesOffsets: new Uint32Array(polygonIndicesOffsets),
        holeCounts: hasPolygonHoles
          ? new Uint32Array(polygonHoleCounts)
          : undefined,
        holeOffsets: hasPolygonHoles
          ? new Uint32Array(polygonHoleOffsets)
          : undefined,
        count: polygonCount,
      };
    }

    if (
      !defined(layerBuffers.points) &&
      !defined(layerBuffers.polylines) &&
      !defined(layerBuffers.polygons)
    ) {
      continue;
    }

    layers.push(layerBuffers);
  }

  if (layers.length === 0) {
    return undefined;
  }

  /** @type {Array<Object.<string, *>|null>} */
  const properties = new Array(featureIdLookup.size).fill(null);
  for (const [featureId, props] of featureProperties) {
    properties[featureId] = props;
  }

  return {
    origin: { x: origin.x, y: origin.y, z: origin.z },
    layers: layers,
    properties: properties,
    featureCount: featureIdLookup.size,
    nullFeatureId: nullFeatureId,
  };
}

/**
 * Collects the backing ArrayBuffers of all typed arrays in the given vector
 * tile buffers, for use as transferables when posting from a worker.
 *
 * @param {VectorTileBuffers} buffers
 * @param {ArrayBuffer[]} [result]
 * @returns {ArrayBuffer[]}
 * @ignore
 */
function collectVectorBufferTransferables(buffers, result) {
  result = result ?? [];
  const seen = new Set(result);

  /** @param {TypedArray|undefined} typedArray */
  function add(typedArray) {
    if (!defined(typedArray)) {
      return;
    }
    const buffer = /** @type {ArrayBuffer} */ (typedArray.buffer);
    if (!seen.has(buffer)) {
      seen.add(buffer);
      result.push(buffer);
    }
  }

  for (const layer of buffers.layers) {
    if (defined(layer.points)) {
      add(layer.points.positions);
      add(layer.points.featureIds);
    }
    if (defined(layer.polylines)) {
      add(layer.polylines.positions);
      add(layer.polylines.featureIds);
      add(layer.polylines.indices);
    }
    if (defined(layer.polygons)) {
      add(layer.polygons.positions);
      add(layer.polygons.featureIds);
      add(layer.polygons.indices);
      add(layer.polygons.attributeOffsets);
      add(layer.polygons.indicesOffsets);
      add(layer.polygons.holeCounts);
      add(layer.polygons.holeOffsets);
    }
  }

  return result;
}

/** @import { TypedArray } from "../Core/globalTypes.js"; */

/**
 * Assigns a stable auto-incrementing integer ID to each unique feature.
 *
 * @param {VectorTileFeature} feature
 * @param {Map<VectorTileFeature, number>} featureIdLookup
 * @returns {number}
 * @ignore
 */
function getOrAssignAutoFeatureId(feature, featureIdLookup) {
  let id = featureIdLookup.get(feature);
  if (!defined(id)) {
    id = featureIdLookup.size;
    featureIdLookup.set(feature, id);
  }
  return id;
}

/**
 * @param {VectorTileFeature} feature
 * @param {string} featureIdProperty
 * @param {Map<string, number>} featureIdLookup
 * @returns {number|undefined}
 * @ignore
 */
function mapFeatureIdFromProperty(feature, featureIdProperty, featureIdLookup) {
  const properties = feature.properties;
  if (!defined(properties)) {
    return undefined;
  }
  const propertyValue = /** @type {*} */ (properties)[featureIdProperty];
  if (!defined(propertyValue)) {
    return undefined;
  }
  if (
    typeof propertyValue !== "string" &&
    typeof propertyValue !== "number" &&
    typeof propertyValue !== "boolean"
  ) {
    return undefined;
  }
  if (typeof propertyValue === "number" && !Number.isFinite(propertyValue)) {
    return undefined;
  }
  const mapKey = `${typeof propertyValue}:${propertyValue}`;
  let mappedFeatureId = featureIdLookup.get(mapKey);
  if (defined(mappedFeatureId)) {
    return mappedFeatureId;
  }
  mappedFeatureId = featureIdLookup.size;
  featureIdLookup.set(mapKey, mappedFeatureId);
  return mappedFeatureId;
}

/**
 * @param {VectorTilePoint[][]} rawRings
 * @returns {Array.<PolygonRingGroup>}
 * @ignore
 */
function groupPolygonRings(rawRings) {
  /** @type {Array.<PolygonRingGroup>} */
  const groups = [];
  for (const rawRing of rawRings) {
    const ring = stripClosingVertex(rawRing);
    if (ring.length < 3) {
      continue;
    }
    // Tile coordinates are y-down, so spec-compliant outer rings (clockwise
    // per the MVT spec) have non-positive signed area and holes
    // (counter-clockwise) positive — the opposite of the y-up convention.
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
 * @param {VectorTilePoint[]} ring
 * @returns {number}
 * @ignore
 */
function ringSignedArea(ring) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
  }
  return area / 2;
}

/**
 * @param {VectorTilePoint[]} ring
 * @returns {VectorTilePoint[]}
 * @ignore
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
 * @param {VectorTilePoint} point
 * @param {number} tileX
 * @param {number} tileY
 * @param {number} tileZ
 * @param {number} extent
 * @param {number} height
 * @param {Cartesian3} origin
 * @param {number[]} out
 * @ignore
 */
function appendTilePointAsLocalPosition(
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

export default buildVectorTileBuffers;
export { collectVectorBufferTransferables };
