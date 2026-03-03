import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import PolygonBoundaryExtractor from "../Core/PolygonBoundaryExtractor.js";
import ClassificationType from "../Scene/ClassificationType.js";
import HeightReference from "../Scene/HeightReference.js";
import Entity from "./Entity.js";
import PolygonGraphics from "./PolygonGraphics.js";

/**
 * @typedef {object} Cesium3DTilesetFootprintGenerator.ConstructorOptions
 *
 * Initialization options for the Cesium3DTilesetFootprintGenerator constructor.
 *
 * @property {Cesium3DTileset} tileset The source tileset. Must have `enablePick: true`
 *   (or `enableGeometryExtraction: true` when available) so that CPU-side vertex data is retained.
 * @property {EntityCollection} entityCollection Where to add generated entities.
 * @property {string} [hullMethod='convexHull'] The footprint extraction method.
 *   One of `'convexHull'` or `'boundary'`. `'boundary'` requires index buffers
 *   and produces accurate concave footprints. `'convexHull'` is faster but always convex.
 * @property {Cesium3DTilesetFootprintGenerator.FilterCallback} [filterFeature] A predicate to skip features.
 * @property {Cesium3DTilesetFootprintGenerator.CreateEntityCallback} [createEntity] Custom entity factory. When
 *   provided, this replaces the default entity creation, giving full
 *   control over the entity that is created for each feature footprint.
 *   Receives the polygon hierarchy, the source feature, and the tile.
 */



/**
 * A callback that decides whether a feature should have a footprint generated.
 * @callback Cesium3DTilesetFootprintGenerator.FilterCallback
 * @param {Cesium3DTileFeature} feature The tile feature.
 * @returns {boolean} Return `true` to include the feature, `false` to skip.
 */

/**
 * A callback that creates an entity from a polygon hierarchy, the source
 * feature, and its tile.  When provided, this replaces the default entity
 * creation.
 *
 * @callback Cesium3DTilesetFootprintGenerator.CreateEntityCallback
 * @param {PolygonHierarchy} hierarchy The polygon hierarchy for the footprint.
 * @param {Cesium3DTileFeature} feature The tile feature this footprint was extracted from.
 * @param {Cesium3DTile} tile The tile that contains the feature.
 * @returns {Entity} The created entity.
 */

/**
 * Generates 2D terrain-draped polygon footprints from a {@link Cesium3DTileset}.
 *
 * Call {@link Cesium3DTilesetFootprintGenerator#generate} to process all
 * currently-loaded tiles and create footprint polygons.
 *
 * @alias Cesium3DTilesetFootprintGenerator
 * @constructor
 *
 * @param {Cesium3DTilesetFootprintGenerator.ConstructorOptions} options An object describing initialization options.
 *
 * @example
 * const generator = new Cesium.Cesium3DTilesetFootprintGenerator({
 *   tileset: tileset,
 *   entityCollection: viewer.entities,
 *   hullMethod: 'convexHull',
 *   material: Cesium.Color.BLUE.withAlpha(0.3),
 * });
 * // One-shot after all tiles load
 * tileset.allTilesLoaded.addEventListener(() => generator.generate());
 */
function Cesium3DTilesetFootprintGenerator(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options", options);
  Check.defined("options.tileset", options.tileset);
  //>>includeEnd('debug');

  this._tileset = options.tileset;
  this._entityCollection = options.entityCollection;

  this._hullMethod = options.hullMethod ?? "convexHull";
  this._filterFeature = options.filterFeature;
  this._createEntity = options.createEntity;

  /**
   * Map from a deduplication key (string) to the entity that
   * was created for it. Used to avoid duplicates across LODs.
   * @type {Map<string, { entity: Entity }>}
   * @private
   */
  this._footprintMap = new Map();

  /**
   * Map from tile cache key to an array of deduplication keys that were
   * generated from that specific tile. Used to efficiently remove
   * footprints when a tile is unloaded.
   * @type {Map<string, string[]>}
   * @private
   */
  this._tileToFootprintKeys = new Map();

  this._isDestroyed = false;

  /**
   * Event raised when footprints are generated for a tile.
   * The tile is passed as the event argument.
   * @type {Event}
   */
  this.footprintsGenerated = new Event();
}

Object.defineProperties(Cesium3DTilesetFootprintGenerator.prototype, {
  /**
   * The source tileset.
   * @memberof Cesium3DTilesetFootprintGenerator.prototype
   * @type {Cesium3DTileset}
   * @readonly
   */
  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  /**
   * Number of unique footprint polygons currently tracked.
   * @memberof Cesium3DTilesetFootprintGenerator.prototype
   * @type {number}
   * @readonly
   */
  footprintCount: {
    get: function () {
      return this._footprintMap.size;
    },
  },
});

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
 * Creates a default footprint entity with a terrain-clamped polygon.
 *
 * @param {PolygonHierarchy} hierarchy The polygon outer ring and holes.
 * @param {Cesium3DTileFeature} feature The tile feature.
 * @param {Cesium3DTile} tile The tile that contains the feature.
 * @returns {Entity} A new entity with the polygon draping on terrain.
 * @private
 */
function createDefaultEntity(hierarchy, feature, tile) {
  const tileKey = getTileKey(tile);
  const featureId = feature.featureId;
  return new Entity({
    id: getFeatureKey(tileKey, featureId),
    polygon: new PolygonGraphics({
      hierarchy: hierarchy,
      heightReference: HeightReference.CLAMP_TO_GROUND,
      material: Color.WHITE.withAlpha(0.5),
      classificationType: ClassificationType.TERRAIN,
    }),
    properties: { tilesetFeatureId: featureId },
  });
}

/**
 * Extracts footprint positions from tile content using the configured method.
 *
 * When per-feature mode is enabled and the content supports
 * {@link Cesium3DTileFeature#getPositions}, actual vertex data is used to
 * compute convex-hull footprints via {@link PolygonBoundaryExtractor}.
 * Features without vertex data are skipped.
 *
 * @param {Cesium3DTilesetFootprintGenerator} generator
 * @param {Cesium3DTile} tile
 * @returns {Map<number, PolygonHierarchy>|undefined}
 * @private
 */
function extractFootprintsFromTile(generator, tile) {
  const content = tile.content;
  if (!defined(content)) {
    return undefined;
  }

  const featuresLength = content.featuresLength;
  if (featuresLength === 0) {
    return undefined;
  }

  return extractPerFeatureFootprints(generator, tile, content, featuresLength);
}

/**
 * Creates per-feature footprints using {@link Cesium3DTileFeature#getPositions}
 * to obtain actual vertex data. Positions are projected to a 2-D convex hull
 * via {@link PolygonBoundaryExtractor.convexHullFromPositions}. Features
 * without vertex data (fewer than 3 positions or `getPositions` returns
 * `undefined`) are skipped.
 *
 * @param {Cesium3DTilesetFootprintGenerator} generator
 * @param {Cesium3DTile} tile
 * @param {Cesium3DTileContent} content
 * @param {number} featuresLength
 * @returns {Map<number, PolygonHierarchy>|undefined}
 * @private
 */
function extractPerFeatureFootprints(
  generator,
  tile,
  content,
  featuresLength,
) {
  const filterFn = generator._filterFeature;
  const result = new Map();

  // Retrieve all positions grouped by feature ID in a single pass
  const positionsMap = content.getPositions();
  if (!defined(positionsMap) || positionsMap.size === 0) {
    return undefined;
  }

  for (const [featureId, positions] of positionsMap) {
    if (featureId < 0 || featureId >= featuresLength) {
      continue;
    }

    // Apply the user filter
    if (typeof filterFn === "function") {
      const feature = content.getFeature(featureId);
      if (!filterFn(feature)) {
        continue;
      }
    }

    if (positions.length < 3) {
      continue;
    }

    const hierarchy =
      PolygonBoundaryExtractor.convexHullFromPositions(positions);
    if (defined(hierarchy)) {
      result.set(featureId, hierarchy);
    }
  }

  return result.size > 0 ? result : undefined;
}

/**
 * Creates footprint entities for the given hierarchies and
 * registers them in the tracking maps.
 *
 * @param {Cesium3DTilesetFootprintGenerator} generator
 * @param {Cesium3DTile} tile
 * @param {Map<number, PolygonHierarchy>} featureHierarchies
 * @private
 */
function createFootprintsForTile(generator, tile, featureHierarchies) {
  const tileKey = getTileKey(tile);
  const footprintKeys = [];

  const entityCollection = generator._entityCollection;
  if (!defined(entityCollection)) {
    return;
  }

  const content = tile.content;

  for (const [fid, hierarchy] of featureHierarchies) {
    const key = getFeatureKey(tileKey, fid);
    footprintKeys.push(key);

    // Deduplication: if a footprint for this key already exists, just
    // record this tile as an additional source.
    if (generator._footprintMap.has(key)) {
      continue;
    }

    const feature = content.getFeature(fid);

    const entity = defined(generator._createEntity)
      ? generator._createEntity(hierarchy, feature, tile)
      : createDefaultEntity(hierarchy, feature, tile);
    entityCollection.add(entity);

    generator._footprintMap.set(key, {
      entity: entity,
    });
  }

  generator._tileToFootprintKeys.set(tileKey, footprintKeys);
}

/**
 * Process all currently loaded tiles and create footprint polygons for them.
 */
Cesium3DTilesetFootprintGenerator.prototype.generate = function () {
  //>>includeStart('debug', pragmas.debug);
  if (this._isDestroyed) {
    throw new DeveloperError(
      "This object was destroyed, i.e., destroy() was called.",
    );
  }
  //>>includeEnd('debug');

  const tileset = this._tileset;
  const root = tileset.root;
  if (!defined(root)) {
    return;
  }

  // Traverse all reachable tiles
  const stack = [root];
  while (stack.length > 0) {
    const tile = stack.pop();

    if (defined(tile.content) && tile.contentReady) {
      this._processTile(tile);
    }

    // Push children
    const children = tile.children;
    if (defined(children)) {
      for (let i = 0; i < children.length; i++) {
        stack.push(children[i]);
      }
    }
  }
};

/**
 * Processes a single tile — extracts footprints and creates renderable objects.
 *
 * @param {Cesium3DTile} tile
 * @private
 */
Cesium3DTilesetFootprintGenerator.prototype._processTile = function (tile) {
  const tileKey = getTileKey(tile);

  // Skip if already processed
  if (this._tileToFootprintKeys.has(tileKey)) {
    return;
  }

  const hierarchies = extractFootprintsFromTile(this, tile);
  if (!defined(hierarchies) || hierarchies.size === 0) {
    return;
  }

  createFootprintsForTile(this, tile, hierarchies);
  this.footprintsGenerated.raiseEvent(tile);
};

/**
 * Returns the footprint entity for a given feature, if one has been generated.
 *
 * @param {Cesium3DTileFeature} feature The tile feature.
 * @returns {Entity|undefined} The entity, or `undefined` if no footprint exists.
 */
Cesium3DTilesetFootprintGenerator.prototype.getFootprintForFeature =
  function (feature) {
    const content = feature._content;
    const tile = content._tile;
    const tileKey = getTileKey(tile);
    const featureId = feature.featureId;
    const key = getFeatureKey(tileKey, featureId);
    const record = this._footprintMap.get(key);
    return defined(record) ? record.entity : undefined;
  };

/**
 * Remove all generated footprints and reset tracking state.
 */
Cesium3DTilesetFootprintGenerator.prototype.clear = function () {
  if (defined(this._entityCollection)) {
    for (const [, record] of this._footprintMap) {
      if (defined(record.entity)) {
        this._entityCollection.remove(record.entity);
      }
    }
  }

  this._footprintMap.clear();
  this._tileToFootprintKeys.clear();
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {boolean} True if destroyed.
 *
 * @see Cesium3DTilesetFootprintGenerator#destroy
 */
Cesium3DTilesetFootprintGenerator.prototype.isDestroyed = function () {
  return this._isDestroyed;
};

/**
 * Destroys the generator, removing all footprints and unsubscribing from
 * tile events. Once an object is destroyed, it should not be used.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see Cesium3DTilesetFootprintGenerator#isDestroyed
 */
Cesium3DTilesetFootprintGenerator.prototype.destroy = function () {
  this.clear();
  return destroyObject(this);
};

export default Cesium3DTilesetFootprintGenerator;
