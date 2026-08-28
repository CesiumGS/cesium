// @ts-check

import BufferPolygonCollection from "../Scene/BufferPolygonCollection.js";
import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js";
import DeveloperError from "./DeveloperError.js";
import HeightReference, {
  isHeightReferenceClamp,
} from "../Scene/HeightReference.js";
import Cartesian2 from "./Cartesian2.js";
import CesiumMath from "./Math.js";
import Rectangle from "./Rectangle.js";
import defined from "./defined.js";
import VectorPipeline from "./VectorPipeline.js";

/** @import BufferPrimitive from "../Scene/BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../Scene/BufferPrimitiveCollection.js"; */
/** @import Context from "../Renderer/Context.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import TilingScheme from "./TilingScheme.js"; */
/** @import { VectorCollectionData, VectorTileData } from "./VectorPipeline.js"; */

/** @ignore */
const scratchTileRectangle = new Rectangle();
const scratchCollectionRectangle = new Rectangle();
const scratchIntersectRectangle = new Rectangle();
const scratchDirtyTileData = /** @type {VectorTileData} */ ({});

/**
 * A cartographic region and the widest line painted over it, in the sign
 * convention of <code>VectorCollectionData#widths</code>.
 *
 * @typedef {object} VectorDirtyRegion
 * @property {Rectangle} rectangle
 * @property {number} maximumWidth
 * @private
 */

/**
 * Extracts a collection's snapshot of projected positions and per-primitive
 * material properties.
 *
 * @callback PackCollectionData
 * @param {*} collection
 * @param {TilingScheme} tilingScheme
 * @param {VectorCollectionData} [result]
 * @returns {VectorCollectionData}
 * @private
 */

/**
 * Packs a collection's primitives into a tile's vector data.
 *
 * @callback PackTilePrimitives
 * @param {*} collection
 * @param {VectorCollectionData} collectionData
 * @param {Rectangle} rectangle
 * @param {VectorTileData} result
 * @returns {void}
 * @private
 */

/**
 * Packing functions for a collection type.
 *
 * @typedef {object} CollectionPacker
 * @property {PackCollectionData} packCollectionData Extracts the per-collection snapshot.
 * @property {PackTilePrimitives} packTilePrimitives Packs the collection's primitives into a tile.
 * @private
 */

/**
 * Per-type packing functions, keyed by collection class.
 * @type {Map<Function, CollectionPacker>}
 * @private
 */
const collectionPackers = new Map();
collectionPackers.set(BufferPolylineCollection, {
  packCollectionData: VectorPipeline.packPolylineCollectionData,
  packTilePrimitives: VectorPipeline.packPolylineSegments,
});
collectionPackers.set(BufferPolygonCollection, {
  packCollectionData: VectorPipeline.packPolygonCollectionData,
  packTilePrimitives: VectorPipeline.packPolygonRings,
});

/**
 * @typedef {object} VectorProviderConstructorOptions
 * @property {TilingScheme} tilingScheme
 * @property {boolean} [antialias=true] Whether to fade draped polyline edges over the pixel
 * straddling them. Disabling this is faster but leaves the edges aliased.
 * @property {number} [minimumTileScreenPixels=256] Lower bound on the screen size, in pixels, of
 * a tile baked by this provider.
 * @private
 */

/**
 * @ignore
 */
class VectorProvider {
  /** @param {VectorProviderConstructorOptions} options */
  constructor(options) {
    /** @private */
    this._tilingScheme = options.tilingScheme;

    /**
     * Whether to fade draped polyline edges over the pixel straddling them.
     * Disabling this is faster but leaves the edges aliased.
     *
     * @type {boolean}
     * @default true
     */
    this.antialias = options.antialias ?? true;

    /**
     * Lower bound on the screen size, in pixels, of a tile baked by this provider. Line widths are
     * in screen pixels but baking has no camera, so this is what converts them to tile UV. The
     * surface consuming the tiles is expected to derive it from its own refinement criterion.
     *
     * @type {number}
     * @default 256
     */
    this.minimumTileScreenPixels = options.minimumTileScreenPixels ?? 256.0;

    /**
     * Marked collections, mapped to the {@link HeightReference} they were marked
     * with, which determines the surfaces they are draped onto.
     * @type {Map<BufferPrimitiveCollection<BufferPrimitive>, HeightReference>}
     * @private
     */
    this._heightReferenceByCollection = new Map();

    /**
     * Per-collection snapshot of projected positions and per-primitive
     * material properties, keyed by collection version.
     * @type {WeakMap<BufferPrimitiveCollection<BufferPrimitive>, VectorCollectionData>}
     * @private
     */
    this._collectionDataCache = new WeakMap();

    /**
     * Collections marked this frame (only these are baked).
     * @type {Set<BufferPrimitiveCollection<BufferPrimitive>>}
     * @private
     */
    this._markedThisFrame = new Set();

    /** @private */
    this._markedFrameNumber = -1;

    /**
     * Cartographic regions changed since the last
     * {@link VectorProvider#makeClean}, so only overlapping terrain
     * tiles are re-baked.
     * @type {VectorDirtyRegion[]}
     * @private
     */
    this._dirtyRegions = [];
  }

  /** @type {TilingScheme} */
  get tilingScheme() {
    return this._tilingScheme;
  }

  set tilingScheme(value) {
    this._tilingScheme = value;
  }

  /** @type {Ellipsoid} */
  get ellipsoid() {
    return this._tilingScheme.ellipsoid;
  }

  /**
   * Drops a collection immediately, rather than waiting for it to be pruned by
   * the next {@link VectorProvider#update}. Call when a collection is destroyed,
   * so that it is never draped after its buffers are released.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   */
  remove(collection) {
    this._markedThisFrame.delete(collection);
    if (this._heightReferenceByCollection.delete(collection)) {
      this._markCollectionRegionDirty(collection);
    }
  }

  /**
   * Whether a collection is currently being draped, that is, whether it has
   * been marked and not yet pruned or removed.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @returns {boolean}
   */
  has(collection) {
    return this._heightReferenceByCollection.has(collection);
  }

  /**
   * Whether draping is supported for the given collection's type. Callers must
   * render unsupported collections themselves.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @returns {boolean}
   */
  static isSupported(collection) {
    return collectionPackers.has(collection.constructor);
  }

  /**
   * Marks a collection as draped for this frame; collections not marked are
   * pruned next frame, keeping the draped set aligned with the rendered LOD.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @param {number} frameNumber
   * @param {HeightReference} [heightReference=HeightReference.CLAMP_TO_GROUND] The surfaces the
   *   collection is draped onto: {@link HeightReference.CLAMP_TO_TERRAIN} for the globe,
   *   {@link HeightReference.CLAMP_TO_3D_TILE} for 3D Tiles, or
   *   {@link HeightReference.CLAMP_TO_GROUND} for both.
   */
  markForFrame(
    collection,
    frameNumber,
    heightReference = HeightReference.CLAMP_TO_GROUND,
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!VectorProvider.isSupported(collection)) {
      throw new DeveloperError(
        `Draping is not supported for ${collection.constructor.name}. Check VectorProvider.isSupported before marking a collection.`,
      );
    }
    if (!isHeightReferenceClamp(heightReference)) {
      throw new DeveloperError(
        "heightReference must be CLAMP_TO_GROUND, CLAMP_TO_TERRAIN, or CLAMP_TO_3D_TILE.",
      );
    }
    //>>includeEnd('debug');

    this._beginFrame(frameNumber);
    this._markedThisFrame.add(collection);

    if (!this._heightReferenceByCollection.has(collection)) {
      this._markCollectionRegionDirty(collection);
    }

    this._heightReferenceByCollection.set(collection, heightReference);
  }

  /**
   * Prunes the previous frame's unmarked collections when a new frame begins.
   * Called both from {@link VectorProvider#markForFrame} and once per frame
   * from {@link VectorProvider#update}, so that a frame in which nothing is
   * marked still prunes the collections left over from the frame before it.
   *
   * @param {number} frameNumber
   * @private
   */
  _beginFrame(frameNumber) {
    if (frameNumber === this._markedFrameNumber) {
      return;
    }

    for (const collection of this._heightReferenceByCollection.keys()) {
      if (!this._markedThisFrame.has(collection)) {
        this._heightReferenceByCollection.delete(collection);
        this._markCollectionRegionDirty(collection);
      }
    }
    this._markedThisFrame.clear();

    this._markedFrameNumber = frameNumber;
  }

  /**
   * Records a changed collection's region(s) so the next re-bake only touches
   * overlapping tiles.
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @private
   */
  _markCollectionRegionDirty(collection) {
    this._dirtyRegions.push({
      rectangle: Rectangle.fromBoundingSphere(
        collection.boundingVolume,
        this._tilingScheme.ellipsoid,
        new Rectangle(),
      ),
      maximumWidth:
        this._collectionDataCache.get(collection)?.maximumWidth ?? 0.0,
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @param {Context} context
   * @param {HeightReference} targetHeightReference The kind of
   *   surface the data is baked for, either {@link HeightReference.CLAMP_TO_TERRAIN} or
   *   {@link HeightReference.CLAMP_TO_3D_TILE}. Only collections draped onto that surface are
   *   included.
   * @returns {VectorTileData}
   */
  requestTileData(x, y, level, context, targetHeightReference) {
    const tileRectangle = this._tilingScheme.tileXYToRectangle(
      x,
      y,
      level,
      scratchTileRectangle,
    );
    return this.requestDataForRectangle(
      tileRectangle,
      context,
      targetHeightReference,
    );
  }

  /**
   * Bakes vector lookup data for an arbitrary cartographic rectangle, such as
   * a 3D Tiles content's bounding region.
   *
   * @param {Rectangle} rectangle
   * @param {Context} context
   * @param {HeightReference} targetHeightReference The kind of
   *   surface the data is baked for, either {@link HeightReference.CLAMP_TO_TERRAIN} or
   *   {@link HeightReference.CLAMP_TO_3D_TILE}. Only collections draped onto that surface are
   *   included.
   * @returns {VectorTileData}
   */
  requestDataForRectangle(rectangle, context, targetHeightReference) {
    const tilingScheme = this._tilingScheme;
    const heightReferenceByCollection = this._heightReferenceByCollection;

    /** @type {VectorTileData} */
    const result = {
      show: true,
      hasPolylines: false,
      hasPolygons: false,
      rectangle: Rectangle.clone(rectangle),
      collectionVersions: new Map(),
      minimumTileScreenPixels: this.minimumTileScreenPixels,
      metersPerUv: computeMetersPerUv(rectangle, tilingScheme.ellipsoid),
    };

    for (const [collection, heightReference] of heightReferenceByCollection) {
      if (!targetsSurface(heightReference, targetHeightReference)) {
        continue;
      }

      // Guaranteed by the VectorProvider.isSupported check in markForFrame.
      const packer = /** @type {CollectionPacker} */ (
        collectionPackers.get(collection.constructor)
      );

      const collectionData = this._getCollectionDataCached(
        collection,
        packer.packCollectionData,
      );

      const collectionRectangle = computePaintedRectangle(
        collectionData,
        rectangle,
        result,
        scratchCollectionRectangle,
      );

      const isIntersected = !!Rectangle.intersection(
        rectangle,
        collectionRectangle,
        scratchIntersectRectangle,
      );

      if (!isIntersected) {
        continue;
      }

      result.collectionVersions.set(collection, collectionData.version);
      packer.packTilePrimitives(collection, collectionData, rectangle, result);
    }

    const hasPolylines =
      defined(result.polylineSegments) && result.polylineSegments.length > 0;
    const hasPolygons =
      defined(result.polygonRings) && result.polygonRings.length > 0;
    result.hasPolylines = hasPolylines;
    result.hasPolygons = hasPolygons;

    if (!hasPolylines && !hasPolygons) {
      result.show = false;
      return result;
    }

    if (hasPolylines) {
      VectorPipeline.packPolylineGrid(result);
      VectorPipeline.packPolylineTextures(context, result);
    }

    if (hasPolygons) {
      VectorPipeline.packPolygonGrid(result);
      VectorPipeline.packPolygonTextures(context, result);
    }

    VectorPipeline.packPrimitiveTextures(context, result);

    return result;
  }

  /**
   * @param {VectorTileData} data
   */
  releaseTileData(data) {
    VectorPipeline.freeResources(data);
  }

  /**
   * Re-bakes a tile's vector data if the tile overlaps a region changed since
   * the last {@link VectorProvider#makeClean}, releasing the previous data.
   * Returns the current data unchanged when the tile is outside every changed
   * region.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @param {Context} context
   * @param {VectorTileData} currentData
   * @param {HeightReference} targetHeightReference Either
   *   {@link HeightReference.CLAMP_TO_TERRAIN} or {@link HeightReference.CLAMP_TO_3D_TILE}.
   * @returns {VectorTileData}
   */
  updateTileData(x, y, level, context, currentData, targetHeightReference) {
    const dirtyRegions = this._dirtyRegions;
    const tilingScheme = this._tilingScheme;
    if (
      !intersectRegions(
        x,
        y,
        level,
        dirtyRegions,
        tilingScheme,
        this.minimumTileScreenPixels,
      )
    ) {
      return currentData;
    }

    this.releaseTileData(currentData);

    return this.requestTileData(x, y, level, context, targetHeightReference);
  }

  /**
   * Re-bakes vector data for an arbitrary rectangle when the collections it was
   * baked from have changed. Unlike {@link VectorProvider#updateTileData}, this
   * does not consult {@link VectorProvider#_dirtyRegions} — they are cleared
   * each frame by {@link VectorProvider#makeClean}, which consumers outside the
   * terrain pass cannot rely on observing — so staleness is instead detected by
   * comparing the collection versions recorded when the data was baked.
   *
   * @param {Rectangle} rectangle
   * @param {Context} context
   * @param {VectorTileData} currentData
   * @param {HeightReference} targetHeightReference Either
   *   {@link HeightReference.CLAMP_TO_TERRAIN} or {@link HeightReference.CLAMP_TO_3D_TILE}.
   * @returns {VectorTileData}
   */
  updateDataForRectangle(
    rectangle,
    context,
    currentData,
    targetHeightReference,
  ) {
    if (!this._isStale(currentData, rectangle, targetHeightReference)) {
      return currentData;
    }

    this.releaseTileData(currentData);

    return this.requestDataForRectangle(
      rectangle,
      context,
      targetHeightReference,
    );
  }

  /**
   * Whether baked data no longer reflects the collections overlapping its
   * rectangle. Stale when a collection it was baked from has changed, when a
   * collection has left the rectangle or been pruned, or when a collection has
   * moved into the rectangle since the bake.
   *
   * @param {VectorTileData} data
   * @param {Rectangle} rectangle
   * @param {HeightReference} targetHeightReference
   * @returns {boolean}
   * @private
   */
  _isStale(data, rectangle, targetHeightReference) {
    // The rectangle itself can change, such as when a model moves.
    if (!Rectangle.equals(data.rectangle, rectangle)) {
      return true;
    }

    const bakedVersions = data.collectionVersions;
    const heightReferenceByCollection = this._heightReferenceByCollection;
    let bakedVersionsVisited = 0;

    for (const [collection, heightReference] of heightReferenceByCollection) {
      if (!targetsSurface(heightReference, targetHeightReference)) {
        continue;
      }

      // Guaranteed by the VectorProvider.isSupported check in markForFrame.
      const packer = /** @type {CollectionPacker} */ (
        collectionPackers.get(collection.constructor)
      );
      const collectionRectangle = computePaintedRectangle(
        this._getCollectionDataCached(collection, packer.packCollectionData),
        rectangle,
        data,
        scratchCollectionRectangle,
      );
      const isIntersected = !!Rectangle.intersection(
        rectangle,
        collectionRectangle,
        scratchIntersectRectangle,
      );
      const bakedVersion = bakedVersions.get(collection);

      if (!isIntersected) {
        // Left the rectangle since the bake.
        if (defined(bakedVersion)) {
          return true;
        }
        continue;
      }

      // Moved into the rectangle since the bake.
      if (!defined(bakedVersion)) {
        return true;
      }

      bakedVersionsVisited++;

      if (collection._dirtyCount > 0 || bakedVersion !== collection._version) {
        return true;
      }
    }

    // A collection the data was baked from is no longer marked.
    return bakedVersionsVisited !== bakedVersions.size;
  }

  /**
   * Clears the regions recorded as changed. Call once after a re-bake pass has
   * updated the overlapping tiles via {@link VectorProvider#updateTileData}.
   */
  makeClean() {
    this._dirtyRegions.length = 0;
  }

  /**
   * Prunes the previous frame's unmarked collections and records dirty regions
   * for collections whose content has changed since their last extraction, so
   * overlapping tiles are re-baked. Call once per frame, before
   * {@link VectorProvider#updateTileData}.
   *
   * @param {number} [frameNumber] The current frame number. When omitted, the
   *   marked set is left untouched and only dirty regions are recorded.
   */
  update(frameNumber) {
    if (defined(frameNumber)) {
      this._beginFrame(frameNumber);
    }

    for (const collection of this._heightReferenceByCollection.keys()) {
      const cache = this._collectionDataCache.get(collection);
      if (!defined(cache)) {
        // Never extracted; new tiles bake on request.
        continue;
      }
      const changed =
        collection._dirtyCount > 0 || cache.version !== collection._version;
      if (!changed) {
        continue;
      }
      // Re-bake the previously baked region; content may have moved away from it.
      if (defined(cache.rectangle)) {
        this._dirtyRegions.push({
          rectangle: Rectangle.clone(cache.rectangle),
          maximumWidth: cache.maximumWidth,
        });
      }

      // Guaranteed by the VectorProvider.isSupported check in markForFrame.
      const packer = /** @type {CollectionPacker} */ (
        collectionPackers.get(collection.constructor)
      );

      // Extract first, so a stroke that widened reaches tiles its old width missed.
      this._getCollectionDataCached(collection, packer.packCollectionData);
      this._markCollectionRegionDirty(collection);
    }
  }

  /**
   * Returns the collection's {@link VectorCollectionData} snapshot,
   * re-extracted when the collection has changed. The collection is marked
   * clean only after everything has been read back.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @param {PackCollectionData} packCollectionData
   * @returns {VectorCollectionData}
   * @private
   */
  _getCollectionDataCached(collection, packCollectionData) {
    const cache = this._collectionDataCache.get(collection);
    const dirty = collection._dirtyCount > 0;
    const outdated = cache?.version !== collection._version;

    if (defined(cache) && !dirty && !outdated) {
      return cache;
    }

    const data = packCollectionData(collection, this._tilingScheme, cache);

    // If dirty, the version increments +1 when marked clean below.
    data.version = collection._version + (dirty ? 1 : 0);
    data.rectangle = Rectangle.fromBoundingSphere(
      collection.boundingVolume,
      this.ellipsoid,
      data.rectangle,
    );
    this._collectionDataCache.set(collection, data);

    collection._makeClean();

    return data;
  }
}

/**
 * Whether a collection draped with <code>collectionHeightReference</code> lands
 * on a surface of kind <code>targetHeightReference</code>.
 *
 * @param {HeightReference} collectionHeightReference
 * @param {HeightReference} targetHeightReference Either
 *   {@link HeightReference.CLAMP_TO_TERRAIN} or {@link HeightReference.CLAMP_TO_3D_TILE}.
 * @returns {boolean}
 * @private
 */
function targetsSurface(collectionHeightReference, targetHeightReference) {
  return (
    collectionHeightReference === HeightReference.CLAMP_TO_GROUND ||
    collectionHeightReference === targetHeightReference
  );
}

/**
 * Ground size, in meters, of a rectangle's UV domain. Evaluated at the center latitude, so the
 * east-west scale drifts toward the northern and southern edges.
 *
 * @param {Rectangle} rectangle
 * @param {Ellipsoid} ellipsoid
 * @returns {Cartesian2}
 * @private
 */
function computeMetersPerUv(rectangle, ellipsoid) {
  const radius = ellipsoid.maximumRadius;
  const centerLatitude = (rectangle.south + rectangle.north) * 0.5;
  return new Cartesian2(
    rectangle.width * radius * Math.cos(centerLatitude),
    rectangle.height * radius,
  );
}

/**
 * The ground a collection covers: the rectangle its geometry occupies, grown by
 * half the width of its widest line. The margin is a fraction of the target
 * rectangle, matching the one segments are clipped with, so a target admitted
 * here is one that can pack content.
 *
 * @param {VectorDirtyRegion} region
 * @param {Rectangle} rectangle The target rectangle the margin is measured against.
 * @param {VectorTileData} tileData
 * @param {Rectangle} result
 * @returns {Rectangle}
 * @private
 */
function computePaintedRectangle(region, rectangle, tileData, result) {
  const uvMargin = VectorPipeline.maximumHalfWidthToTileUv(
    region.maximumWidth,
    tileData,
  );
  const marginLongitude = uvMargin * rectangle.width;
  const collectionRectangle = region.rectangle;

  Rectangle.clone(collectionRectangle, result);

  // Latitude does not wrap, so a margin reaching past a pole is harmless.
  result.south -= uvMargin * rectangle.height;
  result.north += uvMargin * rectangle.height;

  if (collectionRectangle.width + 2.0 * marginLongitude >= CesiumMath.TWO_PI) {
    result.west = -CesiumMath.PI;
    result.east = CesiumMath.PI;
  } else {
    result.west = CesiumMath.negativePiToPi(result.west - marginLongitude);
    result.east = CesiumMath.negativePiToPi(result.east + marginLongitude);
  }

  return result;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} level
 * @param {VectorDirtyRegion[]} regions
 * @param {TilingScheme} tilingScheme
 * @param {number} minimumTileScreenPixels
 * @returns {boolean}
 * @private
 */
function intersectRegions(
  x,
  y,
  level,
  regions,
  tilingScheme,
  minimumTileScreenPixels,
) {
  // No dirty regions recorded — nothing to re-bake. A caller needing a full
  // re-bake should record Rectangle.MAX_VALUE instead.
  if (regions.length === 0) {
    return false;
  }

  const tileRectangle = tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    scratchTileRectangle,
  );

  // Matches the predicate the tile was baked with, so a region painting into
  // the tile without reaching it geometrically still marks it for re-bake.
  scratchDirtyTileData.minimumTileScreenPixels = minimumTileScreenPixels;
  scratchDirtyTileData.metersPerUv = computeMetersPerUv(
    tileRectangle,
    tilingScheme.ellipsoid,
  );

  for (let i = 0; i < regions.length; i++) {
    const paintedRectangle = computePaintedRectangle(
      regions[i],
      tileRectangle,
      scratchDirtyTileData,
      scratchCollectionRectangle,
    );

    const isIntersected = Rectangle.intersection(
      tileRectangle,
      paintedRectangle,
      scratchIntersectRectangle,
    );

    if (isIntersected) {
      return true;
    }
  }

  return false;
}

export default VectorProvider;
