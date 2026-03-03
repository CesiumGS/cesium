import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import PolygonBoundaryExtractor from "../Core/PolygonBoundaryExtractor.js";
import ClassificationType from "../Scene/ClassificationType.js";
import HeightReference from "../Scene/HeightReference.js";
import Entity from "./Entity.js";
import PolygonGraphics from "./PolygonGraphics.js";

/**
 * @typedef {object} Cesium3DTilesetFootprintGenerator.GenerateOptions
 *
 * Options for {@link Cesium3DTilesetFootprintGenerator.generate}.
 *
 * @property {Cesium3DTileset} tileset The source tileset. Must have `enablePick: true`
 *   (or `enableGeometryExtraction: true` when available) so that CPU-side vertex data is retained.
 * @property {EntityCollection} entityCollection Where to add generated entities.
 * @property {Cesium3DTilesetFootprintGenerator.FilterCallback} [filterFeature] A predicate to skip features.
 * @property {Cesium3DTilesetFootprintGenerator.CreateEntityCallback} [createEntity] Custom entity factory. When
 *   provided, this replaces the default entity creation, giving full
 *   control over the entity that is created for each feature footprint.
 *   Receives the polygon hierarchy, the source feature, and the tile.
 * @property {Cesium3DTilesetFootprintGenerator.FootprintsGeneratedCallback} [footprintsGenerated] Optional callback
 *   invoked after footprints are created for each tile. Receives the tile and
 *   the array of entities created from it.
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
 * A callback invoked after footprint entities are created for a tile.
 * @callback Cesium3DTilesetFootprintGenerator.FootprintsGeneratedCallback
 * @param {Cesium3DTile} tile The tile that was processed.
 * @param {number} count The number of footprint entities created from this tile.
 */

/**
 * Static utility functions for generating 2D terrain-draped polygon footprints
 * from a {@link Cesium3DTileset}.
 *
 * @namespace Cesium3DTilesetFootprintGenerator
 *
 * @example
 * // One-shot after all tiles load
 * tileset.allTilesLoaded.addEventListener(() => {
 *   const count = Cesium.Cesium3DTilesetFootprintGenerator.generate({
 *     tileset: tileset,
 *     entityCollection: viewer.entities,
 *   });
 *   console.log(`Created ${count} footprints`);
 * });
 */
const Cesium3DTilesetFootprintGenerator = {};

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
 * Extracts per-feature footprint hierarchies from a single tile.
 *
 * @param {Cesium3DTile} tile
 * @param {Cesium3DTilesetFootprintGenerator.FilterCallback} [filterFeature]
 * @returns {Map<number, PolygonHierarchy>|undefined}
 * @private
 */
function extractFootprintsFromTile(tile, filterFeature) {
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
  const positionsMap = content.getPositions();
  if (!defined(positionsMap) || positionsMap.size === 0) {
    return undefined;
  }

  for (const [featureId, positions] of positionsMap) {
    if (featureId < 0 || featureId >= featuresLength) {
      continue;
    }

    // Apply the user filter
    if (typeof filterFeature === "function") {
      const feature = content.getFeature(featureId);
      if (!filterFeature(feature)) {
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
 * Process all currently loaded tiles in the tileset and create footprint
 * polygon entities for each feature.
 *
 * @param {Cesium3DTilesetFootprintGenerator.GenerateOptions} options An object describing generation options.
 * @returns {number} The number of footprint entities that were created.
 *
 * @example
 * tileset.allTilesLoaded.addEventListener(() => {
 *   const count = Cesium.Cesium3DTilesetFootprintGenerator.generate({
 *     tileset: tileset,
 *     entityCollection: viewer.entities,
 *   });
 *   console.log(`Created ${count} footprints`);
 * });
 *
 * @example
 * // With filtering and custom entity creation
 * const count = Cesium.Cesium3DTilesetFootprintGenerator.generate({
 *   tileset: tileset,
 *   entityCollection: viewer.entities,
 *   filterFeature: function (feature) {
 *     return feature.getProperty('height') > 10;
 *   },
 *   createEntity: function (hierarchy, feature, tile) {
 *     return new Cesium.Entity({
 *       polygon: new Cesium.PolygonGraphics({ hierarchy: hierarchy }),
 *     });
 *   },
 * });
 */
Cesium3DTilesetFootprintGenerator.generate = function (options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options", options);
  Check.defined("options.tileset", options.tileset);
  Check.defined("options.entityCollection", options.entityCollection);
  //>>includeEnd('debug');

  const tileset = options.tileset;
  const entityCollection = options.entityCollection;
  const filterFeature = options.filterFeature;
  const createEntity = options.createEntity;
  const footprintsGenerated = options.footprintsGenerated;

  const root = tileset.root;
  if (!defined(root)) {
    return 0;
  }

  let count = 0;
  const seen = new Set();

  // Traverse all reachable tiles
  const stack = [root];
  while (stack.length > 0) {
    const tile = stack.pop();

    if (defined(tile.content) && tile.contentReady) {
      const tileKey = getTileKey(tile);

      if (!seen.has(tileKey)) {
        seen.add(tileKey);

        const hierarchies = extractFootprintsFromTile(tile, filterFeature);
        if (defined(hierarchies) && hierarchies.size > 0) {
          const content = tile.content;
          const tileEntities = [];

          for (const [fid, hierarchy] of hierarchies) {
            const key = getFeatureKey(tileKey, fid);

            // Deduplication
            if (seen.has(key)) {
              continue;
            }
            seen.add(key);

            const feature = content.getFeature(fid);

            const entity = defined(createEntity)
              ? createEntity(hierarchy, feature, tile)
              : createDefaultEntity(hierarchy, feature, tile);

            entityCollection.add(entity);
            tileEntities.push(entity);
            count++;
          }

          if (
            typeof footprintsGenerated === "function" &&
            tileEntities.length > 0
          ) {
            footprintsGenerated(tile, tileEntities.length);
          }
        }
      }
    }

    // Push children
    const children = tile.children;
    if (defined(children)) {
      for (let i = 0; i < children.length; i++) {
        stack.push(children[i]);
      }
    }
  }

  return count;
};

/**
 * Generates footprint entities for a single tile.
 *
 * @param {object} options An object with the following properties:
 * @param {Cesium3DTile} options.tile The tile to process.
 * @param {EntityCollection} options.entityCollection Where to add generated entities.
 * @param {Cesium3DTilesetFootprintGenerator.FilterCallback} [options.filterFeature] A predicate to skip features.
 * @param {Cesium3DTilesetFootprintGenerator.CreateEntityCallback} [options.createEntity] Custom entity factory.
 * @param {Cesium3DTilesetFootprintGenerator.FootprintsGeneratedCallback} [options.footprintsGenerated] Optional callback invoked after footprints are created.
 * @returns {number} The number of footprint entities that were created.
 */
Cesium3DTilesetFootprintGenerator.generateForTile = function (options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options", options);
  Check.defined("options.tile", options.tile);
  Check.defined("options.entityCollection", options.entityCollection);
  //>>includeEnd('debug');

  const tile = options.tile;
  const entityCollection = options.entityCollection;
  const filterFeature = options.filterFeature;
  const createEntity = options.createEntity;
  const footprintsGenerated = options.footprintsGenerated;

  if (!defined(tile.content) || !tile.contentReady) {
    return 0;
  }

  const hierarchies = extractFootprintsFromTile(tile, filterFeature);
  if (!defined(hierarchies) || hierarchies.size === 0) {
    return 0;
  }

  const createdEntities = [];
  const content = tile.content;
  const tileKey = getTileKey(tile);

  for (const [fid, hierarchy] of hierarchies) {
    const feature = content.getFeature(fid);

    const entity = defined(createEntity)
      ? createEntity(hierarchy, feature, tile)
      : createDefaultEntity(hierarchy, feature, tile);

    // Ensure a stable ID for potential later lookup
    if (!defined(entity.id)) {
      entity.id = getFeatureKey(tileKey, fid);
    }

    entityCollection.add(entity);
    createdEntities.push(entity);
  }

  if (
    typeof footprintsGenerated === "function" &&
    createdEntities.length > 0
  ) {
    footprintsGenerated(tile, createdEntities.length);
  }

  return createdEntities.length;
};

export default Cesium3DTilesetFootprintGenerator;
