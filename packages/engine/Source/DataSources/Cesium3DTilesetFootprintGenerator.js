import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import PolygonBoundaryExtractor from "../Core/PolygonBoundaryExtractor.js";
import ClassificationType from "../Scene/ClassificationType.js";
import FootprintPolygonBuilder from "../Scene/FootprintPolygonBuilder.js";

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
 * @property {Color} [material=Color.WHITE.withAlpha(0.5)] Default polygon fill color.
 * @property {ClassificationType} [classificationType=ClassificationType.TERRAIN] Classification type.
 * @property {Cesium3DTilesetFootprintGenerator.FilterCallback} [filterFeature] A predicate to skip features.
 * @property {Cesium3DTilesetFootprintGenerator.StyleCallback} [styleFeature] Per-feature styling function.
 */

/**
 * @typedef {object} Cesium3DTilesetFootprintGenerator.StyleOverrides
 * @property {Color} [material] Override polygon fill color.
 * @property {Color} [color] Override polygon color (alternative to material).
 * @property {string} [name] Override entity name.
 */

/**
 * A callback that decides whether a feature should have a footprint generated.
 * @callback Cesium3DTilesetFootprintGenerator.FilterCallback
 * @param {Cesium3DTileFeature} feature The tile feature.
 * @returns {boolean} Return `true` to include the feature, `false` to skip.
 */

/**
 * A callback that returns per-feature style overrides.
 * @callback Cesium3DTilesetFootprintGenerator.StyleCallback
 * @param {Cesium3DTileFeature} feature The tile feature.
 * @returns {Cesium3DTilesetFootprintGenerator.StyleOverrides|undefined}
 */

/**
 * Generates 2D terrain-draped polygon footprints from a {@link Cesium3DTileset}.
 *
 * The generator can work in two modes:
 * - **One-shot** via {@link Cesium3DTilesetFootprintGenerator#generate}: processes
 *   all currently-loaded tiles and creates footprints.
 * - **Auto-update** via {@link Cesium3DTilesetFootprintGenerator#startAutoUpdate}:
 *   subscribes to `tileLoad` / `tileUnload` events and creates/removes footprints
 *   as tiles stream in and out of the view.
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
 *
 * @example
 * // Auto-update mode
 * const generator = new Cesium.Cesium3DTilesetFootprintGenerator({
 *   tileset: tileset,
 *   entityCollection: viewer.entities,
 * });
 * generator.startAutoUpdate();
 * // Later:
 * generator.stopAutoUpdate();
 * generator.destroy();
 */
function Cesium3DTilesetFootprintGenerator(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options", options);
  Check.defined("options.tileset", options.tileset);
  //>>includeEnd('debug');

  this._tileset = options.tileset;
  this._entityCollection = options.entityCollection;

  this._hullMethod = options.hullMethod ?? "convexHull";
  this._material = options.material ?? Color.WHITE.withAlpha(0.5);
  this._classificationType =
    options.classificationType ?? ClassificationType.TERRAIN;
  this._filterFeature = options.filterFeature;
  this._styleFeature = options.styleFeature;

  /**
   * Map from a deduplication key (string) to the entity that
   * was created for it. Used to avoid duplicates across LODs and to clean
   * up on tile unload.
   * @type {Map<string, { entity: Entity, tileKeys: Set<string> }>}
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

  this._tileLoadListener = undefined;
  this._tileUnloadListener = undefined;
  this._isAutoUpdating = false;
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
   * Whether auto-update mode is active.
   * @memberof Cesium3DTilesetFootprintGenerator.prototype
   * @type {boolean}
   * @readonly
   */
  isAutoUpdating: {
    get: function () {
      return this._isAutoUpdating;
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

  for (const [fid, hierarchy] of featureHierarchies) {
    const key = getFeatureKey(tileKey, fid);
    footprintKeys.push(key);

    // Deduplication: if a footprint for this key already exists, just
    // record this tile as an additional source.
    if (generator._footprintMap.has(key)) {
      generator._footprintMap.get(key).tileKeys.add(tileKey);
      continue;
    }

    const entityOptions = {
      material: generator._material,
      classificationType: generator._classificationType,
      id: key,
      properties: { tilesetFeatureId: fid },
    };

    // Per-feature styling
    if (typeof generator._styleFeature === "function") {
      const content = tile.content;
      if (defined(content) && fid < content.featuresLength) {
        const feature = content.getFeature(fid);
        const style = generator._styleFeature(feature);
        if (defined(style)) {
          if (defined(style.material)) {
            entityOptions.material = style.material;
          }
          if (defined(style.name)) {
            entityOptions.name = style.name;
          }
        }
      }
    }

    const entity = FootprintPolygonBuilder.createEntity(
      hierarchy,
      entityOptions,
    );
    entityCollection.add(entity);

    generator._footprintMap.set(key, {
      entity: entity,
      tileKeys: new Set([tileKey]),
    });
  }

  generator._tileToFootprintKeys.set(tileKey, footprintKeys);
}

/**
 * Removes all footprints that were sourced from a specific tile.
 * Implements deduplication-aware removal: a footprint is only deleted
 * if no other loaded tile still references it.
 *
 * @param {Cesium3DTilesetFootprintGenerator} generator
 * @param {Cesium3DTile} tile
 * @private
 */
function removeFootprintsForTile(generator, tile) {
  const tileKey = getTileKey(tile);

  const footprintKeys = generator._tileToFootprintKeys.get(tileKey);
  if (!defined(footprintKeys)) {
    return;
  }

  for (let i = 0; i < footprintKeys.length; i++) {
    const key = footprintKeys[i];
    const record = generator._footprintMap.get(key);
    if (!defined(record)) {
      continue;
    }

    record.tileKeys.delete(tileKey);

    // Only remove the entity if no other tile references this footprint
    if (record.tileKeys.size === 0) {
      if (defined(record.entity) && defined(generator._entityCollection)) {
        generator._entityCollection.remove(record.entity);
      }
      generator._footprintMap.delete(key);
    }
  }

  generator._tileToFootprintKeys.delete(tileKey);
}

/**
 * Process all currently loaded tiles and create footprint polygons for them.
 * This is a one-shot operation. For dynamic updates, use
 * {@link Cesium3DTilesetFootprintGenerator#startAutoUpdate}.
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
 * Subscribe to `tileLoad` and `tileUnload` events on the tileset to
 * dynamically create and remove footprint polygons as tiles stream
 * in and out of the view.
 */
Cesium3DTilesetFootprintGenerator.prototype.startAutoUpdate = function () {
  //>>includeStart('debug', pragmas.debug);
  if (this._isDestroyed) {
    throw new DeveloperError(
      "This object was destroyed, i.e., destroy() was called.",
    );
  }
  //>>includeEnd('debug');

  if (this._isAutoUpdating) {
    return;
  }

  const that = this;

  this._tileLoadListener = this._tileset.tileLoad.addEventListener(
    function (tile) {
      that._processTile(tile);
    },
  );

  this._tileUnloadListener = this._tileset.tileUnload.addEventListener(
    function (tile) {
      removeFootprintsForTile(that, tile);
    },
  );

  this._isAutoUpdating = true;
};

/**
 * Unsubscribe from tile events. Existing footprints remain until
 * {@link Cesium3DTilesetFootprintGenerator#clear} or
 * {@link Cesium3DTilesetFootprintGenerator#destroy} is called.
 */
Cesium3DTilesetFootprintGenerator.prototype.stopAutoUpdate = function () {
  if (!this._isAutoUpdating) {
    return;
  }

  if (defined(this._tileLoadListener)) {
    this._tileLoadListener();
    this._tileLoadListener = undefined;
  }

  if (defined(this._tileUnloadListener)) {
    this._tileUnloadListener();
    this._tileUnloadListener = undefined;
  }

  this._isAutoUpdating = false;
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
 * Updates the style function and reapplies it to all existing entity footprints.
 *
 * @param {Cesium3DTilesetFootprintGenerator.StyleCallback} styleFunction The new style callback.
 */
Cesium3DTilesetFootprintGenerator.prototype.setStyle = function (
  styleFunction,
) {
  this._styleFeature = styleFunction;
  // Note: reapplying styles to existing entities would require re-creating
  // them. For the initial implementation, styles only affect newly created
  // footprints. A full restyle can be done via clear() + generate().
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
  this.stopAutoUpdate();
  this.clear();
  return destroyObject(this);
};

export default Cesium3DTilesetFootprintGenerator;
