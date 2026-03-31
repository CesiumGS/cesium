import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import PolygonHierarchy from "../Core/PolygonHierarchy.js";

/**
 * @typedef {object} Cesium3DTilesetFootprintGenerator.GenerateOptions
 *
 * Options for {@link Cesium3DTilesetFootprintGenerator.generate}.
 *
 * @property {Cesium3DTileset} tileset The source tileset.
 * @property {Cesium3DTilesetFootprintGenerator.FilterFeatureCallback} [filterFeature] A predicate to skip features.
 * @property {Cesium3DTilesetFootprintGenerator.FilterTileCallback} [filterTile] A predicate to skip tiles.
 * @property {Cesium3DTilesetFootprintGenerator.CreateEntityCallback} [createEntity] Custom entity factory.
 * @property {Cesium3DTilesetFootprintGenerator.FootprintsGeneratedCallback} [footprintsGenerated] Optional callback
 *   invoked after footprints are created for each tile.
 */

/**
 * A callback that decides whether a feature should have a footprint generated.
 * @callback Cesium3DTilesetFootprintGenerator.FilterFeatureCallback
 * @param {Cesium3DTileFeature} feature The tile feature.
 * @param {number} vertexCount The number of vertices in the feature geometry.
 * @returns {boolean} Return `true` to include the feature, `false` to skip.
 */

/**
 * A callback that decides whether a tile should be processed for footprints.
 * @callback Cesium3DTilesetFootprintGenerator.FilterTileCallback
 * @param {Cesium3DTile} tile The tile.
 * @returns {boolean} Return `true` to include the tile, `false` to skip.
 */

/**
 * A callback that creates an entity from a polygon hierarchy, the source
 * feature, and its tile.  When provided, this replaces the default entity
 * creation.
 *
 * @callback Cesium3DTilesetFootprintGenerator.CreateEntityCallback
 * @param {Cesium3DTilesetFootprintGenerator.Footprint} footprint The footprint containing the polygon hierarchy and color.
 * @param {Cesium3DTileFeature} feature The tile feature this footprint was extracted from.
 * @param {Cesium3DTile} tile The tile that contains the feature.
 */

/**
 * A callback invoked after footprint entities are created for a tile.
 * @callback Cesium3DTilesetFootprintGenerator.FootprintsGeneratedCallback
 * @param {Cesium3DTile} tile The tile that was processed.
 * @param {number} count The number of footprint entities created from this tile.
 */

/**
 * @typedef {object} Cesium3DTilesetFootprintGenerator.Footprint
 * @property {PolygonHierarchy} hierarchy The polygon hierarchy for the footprint.
 * @property {Color|undefined} color The averaged color extracted from the feature geometry.
 * @property {number} minHeight The minimum cartographic height of the feature vertices.
 * @property {number} maxHeight The maximum cartographic height of the feature vertices.
 */

const Cesium3DTilesetFootprintGenerator = {};

// ---- ConvexHull2D helpers (inlined) ---- //

/**
 * Finds the point with the lowest y-coordinate (and leftmost x as a tiebreaker).
 * @param {Cartesian2[]} points The input points.
 * @returns {number} The index of the pivot point.
 * @private
 */
function findPivotIndex(points) {
  let pivotIndex = 0;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const pivot = points[pivotIndex];
    if (p.y < pivot.y || (p.y === pivot.y && p.x < pivot.x)) {
      pivotIndex = i;
    }
  }
  return pivotIndex;
}

/**
 * Returns the cross product of vectors (O->A) and (O->B).
 * @param {Cartesian2} o The origin point.
 * @param {Cartesian2} a The first point.
 * @param {Cartesian2} b The second point.
 * @returns {number} The cross product value.
 * @private
 */
function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Computes the squared distance between two 2D points.
 * @param {Cartesian2} a The first point.
 * @param {Cartesian2} b The second point.
 * @returns {number} The squared distance.
 * @private
 */
function distanceSquared2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Removes duplicate 2D points within an epsilon tolerance.
 * @param {Cartesian2[]} points The input points.
 * @param {number} epsilon The tolerance.
 * @returns {Cartesian2[]} A new array with duplicates removed.
 * @private
 */
function removeDuplicates2D(points, epsilon) {
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const epsilonSquared = epsilon * epsilon;
  const unique = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (
      distanceSquared2D(sorted[i], unique[unique.length - 1]) >= epsilonSquared
    ) {
      unique.push(sorted[i]);
    }
  }
  return unique;
}

/**
 * Computes the 2D convex hull of a set of points using the Graham scan algorithm.
 * @param {Cartesian2[]} points An array of {@link Cartesian2} points.
 * @param {number} [epsilon=1e-12] Tolerance for degenerate/collinear point removal.
 * @returns {Cartesian2[]} The convex hull in counter-clockwise order.
 * @private
 */
function computeConvexHull2D(points, epsilon) {
  if (!defined(epsilon)) {
    epsilon = 1e-12;
  }

  const uniquePoints = removeDuplicates2D(points, epsilon);

  if (uniquePoints.length === 1) {
    return [Cartesian2.clone(uniquePoints[0])];
  }
  if (uniquePoints.length === 2) {
    return [
      Cartesian2.clone(uniquePoints[0]),
      Cartesian2.clone(uniquePoints[1]),
    ];
  }

  const pivotIndex = findPivotIndex(uniquePoints);
  const pivot = uniquePoints[pivotIndex];

  const sorted = [];
  for (let i = 0; i < uniquePoints.length; i++) {
    if (i !== pivotIndex) {
      sorted.push(uniquePoints[i]);
    }
  }

  sorted.sort(function (a, b) {
    const crossValue = cross(pivot, a, b);
    if (Math.abs(crossValue) < epsilon) {
      return distanceSquared2D(pivot, a) - distanceSquared2D(pivot, b);
    }
    return -crossValue;
  });

  const filtered = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const crossValue = cross(pivot, sorted[i - 1], sorted[i]);
    if (Math.abs(crossValue) < epsilon) {
      filtered[filtered.length - 1] = sorted[i];
    } else {
      filtered.push(sorted[i]);
    }
  }

  if (filtered.length < 2) {
    const result = [Cartesian2.clone(pivot)];
    for (let i = 0; i < filtered.length; i++) {
      result.push(Cartesian2.clone(filtered[i]));
    }
    return result;
  }

  const stack = [pivot, filtered[0]];
  for (let i = 1; i < filtered.length; i++) {
    while (
      stack.length > 1 &&
      cross(stack[stack.length - 2], stack[stack.length - 1], filtered[i]) <=
        epsilon
    ) {
      stack.pop();
    }
    stack.push(filtered[i]);
  }

  const result = new Array(stack.length);
  for (let i = 0; i < stack.length; i++) {
    result[i] = Cartesian2.clone(stack[i]);
  }
  return result;
}

// ---- PolygonBoundaryExtractor helpers (inlined) ---- //

const cartographicScratch = new Cartographic();

/**
 * Extracts a 2D convex hull polygon from an array of 3D positions
 * by projecting them onto the ellipsoid surface and computing the
 * convex hull in geographic (longitude/latitude) space.
 *
 * @param {Cartesian3[]} positions An array of vertex positions in ECEF coordinates.
 * @param {object} [options] Options object.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid for projection.
 * @returns {{hierarchy: PolygonHierarchy, minHeight: number, maxHeight: number}|undefined}
 * @private
 */
function convexHullFromPositions(positions, options) {
  options = defined(options) ? options : {};
  const ellipsoid = defined(options.ellipsoid)
    ? options.ellipsoid
    : Ellipsoid.default;

  const points2D = new Array(positions.length);
  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < positions.length; i++) {
    const carto = Cartographic.fromCartesian(
      positions[i],
      ellipsoid,
      cartographicScratch,
    );
    if (!defined(carto)) {
      points2D[i] = new Cartesian2(0, 0);
    } else {
      points2D[i] = new Cartesian2(carto.longitude, carto.latitude);
      if (carto.height < minHeight) {
        minHeight = carto.height;
      }
      if (carto.height > maxHeight) {
        maxHeight = carto.height;
      }
    }
  }

  const hull2D = computeConvexHull2D(points2D);

  if (hull2D.length < 3) {
    return undefined;
  }

  const hullPositions = new Array(hull2D.length);
  for (let i = 0; i < hull2D.length; i++) {
    hullPositions[i] = Cartesian3.fromRadians(
      hull2D[i].x,
      hull2D[i].y,
      0.0,
      ellipsoid,
    );
  }

  return {
    hierarchy: new PolygonHierarchy(hullPositions),
    minHeight: minHeight,
    maxHeight: maxHeight,
  };
}

// ---- Tile helpers ---- //

/**
 * Computes a cache key for a tile, used to track which tile contributed
 * which footprints.
 * @param {Cesium3DTile} tile
 * @returns {string}
 * @private
 */
function getTileKey(tile) {
  if (defined(tile.content) && defined(tile.content.url)) {
    return tile.content.url;
  }
  // Fallback for tiles without a URL (implicit tiling etc.)
  return `tile-${tile._depth}-${tile._x}-${tile._y}-${tile._z}`;
}

/**
 * Computes a deduplication key for a feature.
 * @param {string} tileKey The tile's cache key.
 * @param {number} featureId The feature ID within the tile.
 * @returns {string}
 * @private
 */
function getFeatureKey(tileKey, featureId) {
  return `${tileKey}#${featureId}`;
}

/**
 * Averages an array of vertex colors into a single representative color.
 *
 * @param {Color[]} colors The vertex colors.
 * @returns {Color|undefined} The averaged color, or undefined if the array is empty.
 * @private
 */
function calculateColor(colors) {
  if (!defined(colors) || colors.length === 0) {
    return undefined;
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (let i = 0; i < colors.length; i++) {
    r += colors[i].red;
    g += colors[i].green;
    b += colors[i].blue;
    a += colors[i].alpha;
  }
  const len = colors.length;
  return new Color(r / len, g / len, b / len, a / len);
}

/**
 * Extracts per-feature footprint hierarchies from a single tile.
 *
 * @param {Cesium3DTile} tile
 * @param {Cesium3DTilesetFootprintGenerator.FilterFeatureCallback} [filterFeature]
 * @returns {Promise<Map<number, Cesium3DTilesetFootprintGenerator.Footprint>|undefined>}
 * @private
 */
async function extractFootprintsFromTile(tile, filterFeature) {
  const content = tile.content;
  if (!defined(content)) {
    return undefined;
  }

  const featuresLength = content.featuresLength;
  if (featuresLength === 0) {
    return undefined;
  }

  const result = new Map();

  // Retrieve all positions grouped by feature ID in a single pass
  const geometryMap = await content.getGeometry({
    extractPositions: true,
    extractColors: true,
  });
  if (!defined(geometryMap) || geometryMap.size === 0) {
    return undefined;
  }

  for (const [featureId, geometry] of geometryMap) {
    if (featureId < 0 || featureId >= featuresLength) {
      continue;
    }

    const positions = geometry.positions;
    if (!defined(positions) || positions.length < 3) {
      continue;
    }

    // Apply the user filter
    if (typeof filterFeature === "function") {
      const feature = content.getFeature(featureId);
      if (!filterFeature(feature, positions.length)) {
        continue;
      }
    }

    const hullResult = convexHullFromPositions(positions);
    if (defined(hullResult)) {
      const color = calculateColor(geometry.colors);
      result.set(featureId, {
        hierarchy: hullResult.hierarchy,
        color,
        minHeight: hullResult.minHeight,
        maxHeight: hullResult.maxHeight,
      });
    }
  }

  return result.size > 0 ? result : undefined;
}

/**
 * Process all currently loaded tiles in the tileset and create footprint
 * polygon entities for each feature.
 *
 * @param {Cesium3DTilesetFootprintGenerator.GenerateOptions} options An object describing generation options.
 * @returns {Promise<number>} A promise that resolves to the number of footprint entities that were created.
 *
 *
 * @example
 * // With filtering and custom entity creation
 * const count = await Cesium.Cesium3DTilesetFootprintGenerator.generate({
 *   tileset,
 *   filterFeature: function (feature) {
 *     return feature.getProperty('height') > 10;
 *   },
 *   createEntity: function (footprint, feature, tile) {
 *     return new Cesium.Entity({
 *       polygon: new Cesium.PolygonGraphics({ hierarchy: footprint.hierarchy }),
 *     });
 *   },
 * });
 */
Cesium3DTilesetFootprintGenerator.generate = async function (options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options", options);
  Check.defined("options.tileset", options.tileset);
  //>>includeEnd('debug');

  const tileset = options.tileset;
  const filterFeature = options.filterFeature;
  const filterTile = options.filterTile;
  const createEntity = options.createEntity;
  const footprintsGenerated = options.footprintsGenerated;

  const root = tileset.root;
  if (!defined(root)) {
    return 0;
  }

  let count = 0;
  const seen = new Set();

  // Traverse all reachable tiles in breadth-first order
  const queue = [root];
  let head = 0;
  while (head < queue.length) {
    const tile = queue[head++];

    // Push children before any filtering so traversal always continues
    const children = tile.children;
    if (defined(children)) {
      for (let i = 0; i < children.length; i++) {
        queue.push(children[i]);
      }
    }

    if (!defined(tile.content) || !tile.contentReady) {
      continue;
    }

    if (typeof filterTile === "function" && !filterTile(tile)) {
      continue;
    }

    const tileKey = getTileKey(tile);

    if (seen.has(tileKey)) {
      continue;
    }
    seen.add(tileKey);

    const hierarchies = await extractFootprintsFromTile(tile, filterFeature);
    if (!defined(hierarchies) || hierarchies.size === 0) {
      continue;
    }

    const content = tile.content;
    let tileCount = 0;

    for (const [fid, footprint] of hierarchies) {
      const key = getFeatureKey(tileKey, fid);

      // Deduplication
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const feature = content.getFeature(fid);

      if (defined(createEntity)) {
        createEntity(footprint, feature, tile);
      }

      tileCount++;
      count++;
    }

    if (typeof footprintsGenerated === "function" && tileCount > 0) {
      footprintsGenerated(tile, tileCount);
    }
  }

  return count;
};

export default Cesium3DTilesetFootprintGenerator;
