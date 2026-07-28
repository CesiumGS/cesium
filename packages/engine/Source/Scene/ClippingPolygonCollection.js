import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Intersect from "../Core/Intersect.js";
import Rectangle from "../Core/Rectangle.js";
import RuntimeError from "../Core/RuntimeError.js";
import ClippingPolygon from "./ClippingPolygon.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolygon from "./BufferPolygon.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import VectorPipeline from "../Core/VectorPipeline.js";

/** @import { VectorCollectionData } from "../Core/VectorPipeline.js" */

// Reused flyweight for reading/writing individual BufferPolygons.
const bufferPolygonScratch = new BufferPolygon();

const qualityDeprecationMessage =
  "ClippingPolygonCollection.quality is deprecated as of CesiumJS 1.144 and will be removed in 1.146. Signed distance field clipping was replaced with vector clipping, so this property no longer has any effect.";
const debugShowDistanceTextureDeprecationMessage =
  "ClippingPolygonCollection.debugShowDistanceTexture is deprecated as of CesiumJS 1.144 and will be removed in 1.146. Signed distance field clipping was replaced with vector clipping, so this property no longer has any effect.";
const isDestroyedDeprecationMessage =
  "ClippingPolygonCollection.isDestroyed is deprecated as of CesiumJS 1.144 and will be removed in 1.146. The collection no longer holds any GPU resources of its own, so it does not need to be destroyed.";
const destroyDeprecationMessage =
  "ClippingPolygonCollection.destroy is deprecated as of CesiumJS 1.144 and will be removed in 1.146. The collection no longer holds any GPU resources of its own, so it does not need to be destroyed.";

/**
 * A ClippingPolygon paired with the index of its mirrored primitive in a collection's BufferPolygonCollection.
 *
 * @typedef {object} ClippingPolygonEntry
 * @property {ClippingPolygon} clippingPolygon
 * @property {number} bufferIndex
 * @private
 */

/**
 * Specifies a set of clipping polygons. Clipping polygons selectively disable rendering in a region
 * inside or outside the specified list of {@link ClippingPolygon} objects for a single glTF model, 3D Tileset, or the globe.
 *
 * Clipping Polygons are only supported in WebGL 2 contexts.
 *
 * @alias ClippingPolygonCollection
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {ClippingPolygon[]} [options.polygons=[]] An array of {@link ClippingPolygon} objects used to selectively disable rendering on the inside of each polygon.
 * @param {boolean} [options.enabled=true] Determines whether the clipping polygons are active.
 * @param {boolean} [options.inverse=false] If true, a region will be clipped if it is outside of every polygon in the collection. Otherwise, a region will only be clipped if it is on the inside of any polygon.
 * @param {number} [options.quality=1.0] A scalar that controls the resolution of the signed distance texture used for clipping. Values greater than 1.0 increase quality, values less than 1.0 decrease it. Must be greater than 0.0. <p>Deprecated in CesiumJS 1.144 and will be removed in 1.146. Signed distance field clipping was replaced with vector clipping, so this option no longer has any effect.</p>
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid to use to project the clipping polygons onto the globe.
 *
 * @example
 * const positions = Cesium.Cartesian3.fromRadiansArray([
 *     -1.3194369277314022,
 *     0.6988062530900625,
 *     -1.31941,
 *     0.69879,
 *     -1.3193955980204217,
 *     0.6988091578771254,
 *     -1.3193931220959367,
 *     0.698743632490865,
 *     -1.3194358224045408,
 *     0.6987471965556998,
 * ]);
 *
 * const polygon = new Cesium.ClippingPolygon({
 *     positions: positions
 * });
 *
 * const polygons = new Cesium.ClippingPolygonCollection({
 *    polygons: [ polygon ]
 * });
 */
function ClippingPolygonCollection(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  /**
   * @type {ClippingPolygonEntry[]}
   * @private
   */
  this._polygons = [];

  const polygons = options.polygons;
  let numVertices = 0;
  if (defined(polygons)) {
    const polygonsLength = polygons.length;
    for (let i = 0; i < polygonsLength; ++i) {
      numVertices += polygons[i].length;
    }
  }

  // Note: update uses this as a sentinel for tracking changes to the collections. Leave it as 0 for now so that
  // the first update loop always runs, even though we already know the value (numVertices).
  this._totalPositions = 0;

  // For now: this is a write-through mirror of the polygons array. In upcoming work,
  // this will be the source of truth. To maintain backwards compatibility, though, we will still
  // have to wrap BufferPolygons in ClippingPolygons for the public API.
  this._bufferPolygonCollection = new BufferPolygonCollection({
    // We just need it as a data structure, set show to false to prevent unnecessary render buffer allocations.
    show: false,
    // Preallocate double the initial data.
    primitiveCountMax: 2 * (polygons?.length ?? 0),
    vertexCountMax: 2 * numVertices,
    // ClippingPolygonCollection does not support holes currently (when this changes, update accordingly)
    holeCountMax: 0,
    // This may be fine to stay as 0: we do not need the triangulation for Vector-based clipping.
    triangleCountMax: 0,
  });

  if (defined(polygons)) {
    for (let i = 0; i < polygons.length; ++i) {
      const positions = polygons[i].positions;
      const bufferIndex = this._bufferPolygonCollection.primitiveCount;
      this._bufferPolygonCollection.add(
        {
          positions: Cartesian3.packArray(
            positions,
            new Float64Array(positions.length * 3),
          ),
        },
        bufferPolygonScratch,
      );
      this._polygons.push({
        clippingPolygon: polygons[i],
        bufferIndex: bufferIndex,
      });
    }
  }

  if (defined(options.debugShowDistanceTexture)) {
    deprecationWarning(
      "ClippingPolygonCollection.debugShowDistanceTexture",
      debugShowDistanceTextureDeprecationMessage,
    );
  }
  this._debugShowDistanceTexture = options.debugShowDistanceTexture ?? false;

  /**
   * If true, clipping will be enabled.
   *
   * @type {boolean}
   * @default true
   */
  this.enabled = options.enabled ?? true;

  /**
   * If true, a region will be clipped if it is outside of every polygon in the
   * collection. Otherwise, a region will only be clipped if it is
   * inside of any polygon.
   *
   * @type {boolean}
   * @default false
   */
  this.inverse = options.inverse ?? false;

  if (defined(options.quality)) {
    deprecationWarning(
      "ClippingPolygonCollection.quality",
      qualityDeprecationMessage,
    );
  }
  this._quality = options.quality ?? 1.0;

  /**
   * An event triggered when a new clipping polygon is added to the collection.  Event handlers
   * are passed the new polygon and the index at which it was added.
   * @type {Event}
   * @default Event()
   */
  this.polygonAdded = new Event();

  /**
   * An event triggered when a new clipping polygon is removed from the collection.  Event handlers
   * are passed the new polygon and the index from which it was removed.
   * @type {Event}
   * @default Event()
   */
  this.polygonRemoved = new Event();

  /**
   * The ellipsoid to use to project the clipping polygons onto the globe.
   * @type {Ellipsoid}
   * @default Ellipsoid.default
   */
  this.ellipsoid = options.ellipsoid ?? Ellipsoid.default;

  // If this ClippingPolygonCollection has an owner, only its owner should update or destroy it.
  // This is because in a Cesium3DTileset multiple models may reference the tileset's ClippingPolygonCollection.
  this._owner = undefined;

  /**
   * @type {VectorCollectionData}
   * @private
   */
  this._vectorCollectionData = VectorPipeline.packPolygonCollectionData(
    this._bufferPolygonCollection,
    this.ellipsoid,
  );
}

Object.defineProperties(ClippingPolygonCollection.prototype, {
  /**
   * Returns the number of polygons in this collection.  This is commonly used with
   * {@link ClippingPolygonCollection#get} to iterate over all the polygons
   * in the collection.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._polygons.length;
    },
  },

  /**
   * If true, a debug texture visualizing the signed distance field is shown.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {boolean}
   * @default false
   * @deprecated This property was deprecated in CesiumJS 1.144 and will be removed in 1.146. Signed distance field clipping was replaced with vector clipping, so this property no longer has any effect.
   */
  debugShowDistanceTexture: {
    get: function () {
      deprecationWarning(
        "ClippingPolygonCollection.debugShowDistanceTexture",
        debugShowDistanceTextureDeprecationMessage,
      );
      return this._debugShowDistanceTexture;
    },
    set: function (value) {
      deprecationWarning(
        "ClippingPolygonCollection.debugShowDistanceTexture",
        debugShowDistanceTextureDeprecationMessage,
      );
      this._debugShowDistanceTexture = value;
    },
  },

  /**
   * A scalar that controlled the resolution of the signed distance texture used for clipping.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {number}
   * @default 1.0
   * @deprecated This property was deprecated in CesiumJS 1.144 and will be removed in 1.146. Signed distance field clipping was replaced with vector clipping, so this property no longer has any effect.
   */
  quality: {
    get: function () {
      deprecationWarning(
        "ClippingPolygonCollection.quality",
        qualityDeprecationMessage,
      );
      return this._quality;
    },
    set: function (value) {
      deprecationWarning(
        "ClippingPolygonCollection.quality",
        qualityDeprecationMessage,
      );
      this._quality = value;
    },
  },

  /**
   * Returns the total number of positions in all polygons in the collection.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {number}
   * @readonly
   * @private
   */
  totalPositions: {
    get: function () {
      return this._totalPositions;
    },
  },

  /**
   * A reference to the ClippingPolygonCollection's owner, if any.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @readonly
   * @private
   */
  owner: {
    get: function () {
      return this._owner;
    },
  },

  /**
   * Returns a number encapsulating the state for this ClippingPolygonCollection.
   *
   * The value is 0 when clipping is inactive (disabled or empty), 1 for regular
   * clipping, and -1 for inverse clipping. If this value changes, then shader
   * regeneration is necessary.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @returns {number} A Number that describes the ClippingPolygonCollection's state.
   * @readonly
   * @private
   */
  clippingPolygonsState: {
    get: function () {
      if (!this.enabled || this.length === 0) {
        return 0;
      }
      return this.inverse ? -1 : 1;
    },
  },
});

/**
 * Grows the backing BufferPolygonCollection if one more polygon of the given
 * vertex count would exceed capacity, returning the collection to add into.
 *
 * @param {ClippingPolygonCollection} collection
 * @param {number} addedVertexCount
 * @returns {BufferPolygonCollection}
 * @private
 */
function reserveBufferCapacity(collection, addedVertexCount) {
  const buffer = collection._bufferPolygonCollection;

  const neededPrimitives = buffer.primitiveCount + 1;
  const neededVertices = buffer.vertexCount + addedVertexCount;

  if (
    neededPrimitives <= buffer.primitiveCountMax &&
    neededVertices <= buffer.vertexCountMax
  ) {
    return buffer;
  }

  const hasHiddenPolygons =
    collection._polygons.length !== buffer.primitiveCount;

  const grown = BufferPolygonCollection.fromCollection(
    buffer,
    {
      primitiveCountMax: CesiumMath.nextPowerOfTwo(neededPrimitives),
      vertexCountMax: CesiumMath.nextPowerOfTwo(neededVertices),
    },
    hasHiddenPolygons ? (polygon) => polygon.show : undefined,
  );

  buffer.destroy();
  collection._bufferPolygonCollection = grown;

  if (hasHiddenPolygons) {
    // Reassign indices after compaction (note that this assumes compaction keeps order contiguous)
    const polygons = collection._polygons;
    for (let i = 0; i < polygons.length; ++i) {
      polygons[i].bufferIndex = i;
    }
  }

  return grown;
}

/**
 * Hides the mirrored BufferPolygon for the given entry and clears its buffer index, since BufferPolygonCollection does not support removal.
 *
 * @param {ClippingPolygonCollection} collection
 * @param {ClippingPolygonEntry} entry
 * @private
 */
function hideBufferPolygon(collection, entry) {
  collection._bufferPolygonCollection.get(
    entry.bufferIndex,
    bufferPolygonScratch,
  ).show = false;
  entry.bufferIndex = -1;
}

/**
 * Adds the specified {@link ClippingPolygon} to the collection to be used to selectively disable rendering
 * on the inside of each polygon. Use {@link ClippingPolygonCollection#unionClippingRegions} to modify
 * how modify the clipping behavior of multiple polygons.
 *
 * @param {ClippingPolygon} polygon The ClippingPolygon to add to the collection.
 * @returns {ClippingPolygon} The added ClippingPolygon.
 *
 * @example
 * const polygons = new Cesium.ClippingPolygonCollection();
 *
 * const positions = Cesium.Cartesian3.fromRadiansArray([
 *     -1.3194369277314022,
 *     0.6988062530900625,
 *     -1.31941,
 *     0.69879,
 *     -1.3193955980204217,
 *     0.6988091578771254,
 *     -1.3193931220959367,
 *     0.698743632490865,
 *     -1.3194358224045408,
 *     0.6987471965556998,
 * ]);
 *
 * polygons.add(new Cesium.ClippingPolygon({
 *     positions: positions
 * }));
 *
 *
 *
 * @see ClippingPolygonCollection#remove
 * @see ClippingPolygonCollection#removeAll
 */
ClippingPolygonCollection.prototype.add = function (polygon) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygon", polygon);
  //>>includeEnd('debug');

  const newPlaneIndex = this._polygons.length;

  const bufferPolygonCollection = reserveBufferCapacity(this, polygon.length);
  this._polygons.push({
    clippingPolygon: polygon,
    bufferIndex: bufferPolygonCollection.primitiveCount,
  });
  bufferPolygonCollection.add(
    {
      positions: Cartesian3.packArray(
        polygon.positions,
        new Float64Array(polygon.positions.length * 3),
      ),
    },
    bufferPolygonScratch,
  );

  this.polygonAdded.raiseEvent(polygon, newPlaneIndex);
  return polygon;
};

/**
 * Returns the clipping polygon in the collection at the specified index.  Indices are zero-based
 * and increase as polygons are added.  Removing a polygon polygon all polygons after
 * it to the left, changing their indices.  This function is commonly used with
 * {@link ClippingPolygonCollection#length} to iterate over all the polygons
 * in the collection.
 *
 * @param {number} index The zero-based index of the polygon.
 * @returns {ClippingPolygon} The ClippingPolygon at the specified index.
 *
 * @see ClippingPolygonCollection#length
 */
ClippingPolygonCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  return this._polygons[index]?.clippingPolygon;
};

/**
 * Checks whether this collection contains a ClippingPolygon equal to the given ClippingPolygon.
 *
 * @param {ClippingPolygon} polygon The ClippingPolygon to check for.
 * @returns {boolean} true if this collection contains the ClippingPolygon, false otherwise.
 *
 * @see ClippingPolygonCollection#get
 */
ClippingPolygonCollection.prototype.contains = function (polygon) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygon", polygon);
  //>>includeEnd('debug');

  return this._polygons.some((entry) =>
    ClippingPolygon.equals(entry.clippingPolygon, polygon),
  );
};

/**
 * Removes the first occurrence of the given ClippingPolygon from the collection.
 *
 * @param {ClippingPolygon} polygon
 * @returns {boolean} <code>true</code> if the polygon was removed; <code>false</code> if the polygon was not found in the collection.
 *
 * @see ClippingPolygonCollection#add
 * @see ClippingPolygonCollection#contains
 * @see ClippingPolygonCollection#removeAll
 */
ClippingPolygonCollection.prototype.remove = function (polygon) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygon", polygon);
  //>>includeEnd('debug');

  const polygons = this._polygons;
  const index = polygons.findIndex((entry) =>
    ClippingPolygon.equals(entry.clippingPolygon, polygon),
  );

  if (index === -1) {
    return false;
  }

  const [entry] = polygons.splice(index, 1);

  hideBufferPolygon(this, entry);

  this.polygonRemoved.raiseEvent(entry.clippingPolygon, index);
  return true;
};

/**
 * Removes all polygons from the collection.
 *
 * @see ClippingPolygonCollection#add
 * @see ClippingPolygonCollection#remove
 */
ClippingPolygonCollection.prototype.removeAll = function () {
  const polygons = this._polygons;
  const polygonsCount = polygons.length;
  for (let i = 0; i < polygonsCount; ++i) {
    const entry = polygons[i];
    hideBufferPolygon(this, entry);
    this.polygonRemoved.raiseEvent(entry.clippingPolygon, i);
  }
  this._polygons = [];
};

/**
 * Called by the collection's owner (a {@link Cesium3DTileset}, {@link Model}, or
 * the globe surface tile provider) during the scene update to build the
 * resources for clipping polygons.
 * <p>
 * Do not call this function directly.
 * </p>
 * @private
 * @throws {RuntimeError} ClippingPolygonCollections are only supported for WebGL 2
 */
ClippingPolygonCollection.prototype.update = function (frameState) {
  if (!ClippingPolygonCollection.isSupported(frameState)) {
    throw new RuntimeError(
      "ClippingPolygonCollections are only supported for WebGL 2.",
    );
  }

  // It'd be expensive to validate any individual position has changed. Instead verify if the list of polygon positions has had elements added or removed, which should be good enough for most cases.
  const totalPositions = this._polygons.reduce(
    (totalPositions, entry) => totalPositions + entry.clippingPolygon.length,
    0,
  );

  if (totalPositions === this.totalPositions) {
    return;
  }

  this._totalPositions = totalPositions;

  // If there are no clipping polygons, there's nothing to update.
  if (this.length === 0) {
    return;
  }

  // Update the vector polygon data
  this._vectorCollectionData = VectorPipeline.packPolygonCollectionData(
    this._bufferPolygonCollection,
    this.ellipsoid,
  );
};

const scratchRectangleTile = new Rectangle();
const scratchRectangleIntersection = new Rectangle();
const scratchRectanglePolygon = new Rectangle();
/**
 * Determines the type intersection with the polygons of this ClippingPolygonCollection instance and the specified {@link TileBoundingVolume}.
 * @ignore
 *
 * @param {object} tileBoundingVolume The volume to determine the intersection with the polygons.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the bounding volumes are defined.
 * @returns {Intersect} The intersection type: {@link Intersect.OUTSIDE} if the entire volume is not clipped, {@link Intersect.INSIDE}
 *                      if the entire volume should be clipped, and {@link Intersect.INTERSECTING} if the volume intersects the polygons and will partially clipped.
 */
ClippingPolygonCollection.prototype.computeIntersectionWithBoundingVolume =
  function (tileBoundingVolume, ellipsoid) {
    const polygons = this._polygons;
    const length = polygons.length;

    let intersection = Intersect.OUTSIDE;
    if (this.inverse) {
      intersection = Intersect.INSIDE;
    }

    let tileBoundingRectangle = tileBoundingVolume.rectangle;
    if (
      !defined(tileBoundingRectangle) &&
      defined(tileBoundingVolume.boundingVolume?.computeCorners)
    ) {
      const points = tileBoundingVolume.boundingVolume.computeCorners();
      tileBoundingRectangle = Rectangle.fromCartesianArray(
        points,
        ellipsoid,
        scratchRectangleTile,
      );
    }

    if (!defined(tileBoundingRectangle)) {
      tileBoundingRectangle = Rectangle.fromBoundingSphere(
        tileBoundingVolume.boundingSphere,
        ellipsoid,
        scratchRectangleTile,
      );
    }

    for (let i = 0; i < length; ++i) {
      const polygon = polygons[i].clippingPolygon;

      const polygonBoundingRectangle = polygon.computeRectangle(
        scratchRectanglePolygon,
      );

      const result = Rectangle.intersection(
        tileBoundingRectangle,
        polygonBoundingRectangle,
        scratchRectangleIntersection,
      );

      if (defined(result)) {
        return Intersect.INTERSECTING;
      }
    }

    return intersection;
  };

/**
 * Sets the owner for the input ClippingPolygonCollection if there wasn't another owner.
 * Destroys the owner's previous ClippingPolygonCollection if setting is successful.
 *
 * @param {ClippingPolygonCollection} [clippingPolygonsCollection] A ClippingPolygonCollection (or undefined) being attached to an object
 * @param {object} owner An Object that should receive the new ClippingPolygonCollection
 * @param {string} key The Key for the Object to reference the ClippingPolygonCollection
 * @ignore
 */
ClippingPolygonCollection.setOwner = function (
  clippingPolygonsCollection,
  owner,
  key,
) {
  // Don't detach the ClippingPolygonCollection if it is already owned by newOwner
  if (clippingPolygonsCollection === owner[key]) {
    return;
  }
  // Detach the existing ClippingPolygonCollection, if any. It holds no GPU
  // resources of its own, so dropping the reference is sufficient.
  owner[key] = undefined;
  if (defined(clippingPolygonsCollection)) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(clippingPolygonsCollection._owner)) {
      throw new DeveloperError(
        "ClippingPolygonCollection should only be assigned to one object",
      );
    }
    //>>includeEnd('debug');
    clippingPolygonsCollection._owner = owner;
    owner[key] = clippingPolygonsCollection;
  }
};

/**
 * Compute data and pack into textures used for vector-style clipping.
 * Consumers should listen to {@link ClippingPolygonCollection#polygonAdded} and {@link ClippingPolygonCollection#polygonRemoved}
 * to know when this data becomes stale. It will be refreshed on the next update call (note: update is invoked by the collection's owner).
 *
 * @param {Rectangle} rectangle The region of space to consider for clipping. Polygons outside of this rectangle
 *                              will not be included in the returned data.
 * @param {Context} context The context to use for creating textures.
 * @returns {VectorTileData} The data (including textures) for the clipping polygons in the specified rectangle.
 *
 * @ignore
 */
ClippingPolygonCollection.prototype.requestRectangleData = function (
  rectangle,
  context,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.object("context", context);
  //>>includeEnd('debug');

  const vectorTileData = {
    rectangle: Rectangle.clone(rectangle),
    polygonRings: [],
  };

  if (this.length === 0) {
    return vectorTileData;
  }

  VectorPipeline.packPolygonRings(
    this._bufferPolygonCollection,
    this._vectorCollectionData,
    rectangle,
    vectorTileData,
  );

  // No overlapping polygons means no textures to pack (and the caller can skip the clipping rendering step)
  if (vectorTileData.polygonRings.length === 0) {
    return vectorTileData;
  }

  VectorPipeline.packPolygonGrid(vectorTileData);

  VectorPipeline.packPolygonTextures(context, vectorTileData);

  return vectorTileData;
};

/**
 * Destroy resources associated with the given rectangle data.
 *
 * @param {VectorTileData} data The data (including textures) for the clipping polygons in the specified rectangle.
 * @ignore
 */
ClippingPolygonCollection.releaseRectangleData = function (data) {
  VectorPipeline.freeResources(data);
};

/**
 * Function for checking if the context will allow clipping polygons, which require floating point textures.
 *
 * @param {Scene|object} scene The scene that will contain clipped objects and clipping textures.
 * @returns {boolean} <code>true</code> if the context supports clipping polygons.
 */
ClippingPolygonCollection.isSupported = function (scene) {
  return scene?.context.webgl2;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @deprecated This function was deprecated in CesiumJS 1.144 and will be removed in 1.146. The collection no longer holds any GPU resources of its own, so it does not need to be destroyed.
 * @see ClippingPolygonCollection#destroy
 */
ClippingPolygonCollection.prototype.isDestroyed = function () {
  deprecationWarning(
    "ClippingPolygonCollection.isDestroyed",
    isDestroyedDeprecationMessage,
  );
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * clippingPolygons = clippingPolygons && clippingPolygons.destroy();
 *
 * @deprecated This function was deprecated in CesiumJS 1.144 and will be removed in 1.146. The collection no longer holds any GPU resources of its own, so it does not need to be destroyed.
 * @see ClippingPolygonCollection#isDestroyed
 */
ClippingPolygonCollection.prototype.destroy = function () {
  deprecationWarning(
    "ClippingPolygonCollection.destroy",
    destroyDeprecationMessage,
  );
  return destroyObject(this);
};

export default ClippingPolygonCollection;
