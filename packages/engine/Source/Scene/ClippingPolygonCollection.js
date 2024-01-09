import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Intersect from "../Core/Intersect.js";
import PixelFormat from "../Core/PixelFormat.js";
import Plane from "../Core/Plane.js";
import Rectangle from "../Core/Rectangle.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import ClippingPolygon from "./ClippingPolygon.js";

/**
 * Specifies a set of clipping polygons. Clipping polygons selectively disable rendering in a region on the
 * outside of the specified list of {@link ClippingPolygon} objects for a single gltf model, 3D Tileset, or the globe.
 *
 * @alias ClippingPolygonCollection
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {ClippingPolygon[]} [options.polygons=[]] An array of {@link ClippingPolygon} objects used to selectively disable rendering on the inside of each polygon.
 * @param {boolean} [options.enabled=true] Determines whether the clipping polyongs are active.
 * @param {boolean} [options.inverse=false]
 *
 * // TODO: Example
 */
function ClippingPolygonCollection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._polygons = [];
  this._totalPositions = 0;

  this._enabled = defaultValue(options.enabled, true);
  this._inverse = defaultValue(options.inverse, false);

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

  // If this ClippingPolygonCollection has an owner, only its owner should update or destroy it.
  // This is because in a Cesium3DTileset multiple models may reference the tileset's ClippingPolygonCollection.
  this._owner = undefined;

  this._uint8View = undefined;
  this._float32View = undefined;

  this._clippingPolygonsTexture = undefined;

  this._dirty = false;

  // Add each ClippingPolygon object.
  const polygons = options.polygons;
  if (defined(polygons)) {
    const polygonsLength = polygons.length;
    for (let i = 0; i < polygonsLength; ++i) {
      this._polygons.push(polygons[i]);
      this._totalPositions += polygons[i].positions.length;
      this._dirty = true;
    }
  }
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

  // TODO
  totalPositions: {
    get: function () {
      return this._totalPositions;
    },
  },

  /**
   * If true, a region will be clipped if it is on the outside of any polygon in the
   * collection. Otherwise, a region will only be clipped if it is on the
   * outside of every polygon.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {boolean}
   * @default false
   */
  inverse: {
    get: function () {
      return this._inverse;
    },
    set: function (value) {
      if (this._inverse === value) {
        return;
      }
      this._inverse = value;
    },
  },

  /**
   * If true, clipping will be enabled.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {boolean}
   * @default true
   */
  enabled: {
    get: function () {
      return this._enabled;
    },
    set: function (value) {
      if (this._enabled === value) {
        return;
      }
      this._enabled = value;
    },
  },

  /**
   * Returns a texture containing packed, clipping polygons.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  texture: {
    get: function () {
      return this._clippingPolygonsTexture;
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
   * Returns a Number encapsulating the state for this ClippingPolygonCollection.
   *
   * Clipping mode is encoded in the sign of the number, which is just the total position count.
   * If this value changes, then shader regeneration is necessary.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @returns {number} A Number that describes the ClippingPolygonCollection's state.
   * @readonly
   * @private
   */
  clippingPolygonsState: {
    get: function () {
      return this._inverse
        ? -this._totalPositions - this.length
        : this._totalPositions + this.length;
    },
  },
});

/**
 * Adds the specified {@link ClippingPolygon} to the collection to be used to selectively disable rendering
 * on the insode of each polygon. Use {@link ClippingPolygonCollection#unionClippingRegions} to modify
 * how modify the clipping behavior of multiple polygons.
 *
 * @param {ClippingPolygon} polygon The ClippingPolygon to add to the collection.
 *
 * @see ClippingPolygonCollection#remove
 * @see ClippingPolygonCollection#removeAll
 */
ClippingPolygonCollection.prototype.add = function (polygon) {
  const newPlaneIndex = this._polygons.length;

  polygon.onChangeCallback = (index) => {
    this._dirty = true;
  };
  polygon.index = newPlaneIndex;

  this._dirty = true;
  this._polygons.push(polygon);
  this._totalPositions += polygon.positions.length;
  this.polygonAdded.raiseEvent(polygon, newPlaneIndex);
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

  return this._polygons[index];
};

function indexOf(polygons, polygon) {
  const length = polygons.length;
  for (let i = 0; i < length; ++i) {
    if (Plane.equals(polygons[i], polygon)) {
      return i;
    }
  }

  return -1;
}

/**
 * Checks whether this collection contains a ClippingPolygon equal to the given ClippingPolygon.
 *
 * @param {ClippingPolygon} [clippingPolygon] The ClippingPolygon to check for.
 * @returns {boolean} true if this collection contains the ClippingPolygon, false otherwise.
 *
 * @see ClippingPolygonCollection#get
 */
ClippingPolygonCollection.prototype.contains = function (clippingPolygon) {
  return indexOf(this._polygons, clippingPolygon) !== -1;
};

/**
 * Removes the first occurrence of the given ClippingPolygon from the collection.
 *
 * @param {ClippingPolygon} clippingPolygon
 * @returns {boolean} <code>true</code> if the polygon was removed; <code>false</code> if the polygon was not found in the collection.
 *
 * @see ClippingPolygonCollection#add
 * @see ClippingPolygonCollection#contains
 * @see ClippingPolygonCollection#removeAll
 */
ClippingPolygonCollection.prototype.remove = function (clippingPolygon) {
  const polygons = this._polygons;
  const index = indexOf(polygons, clippingPolygon);

  if (index === -1) {
    return false;
  }

  // Unlink this ClippingPolygonCollection from the ClippingPolygon
  if (clippingPolygon instanceof ClippingPolygon) {
    clippingPolygon.onChangeCallback = undefined;
    clippingPolygon.index = -1;
  }

  // Shift and update indices
  const length = polygons.length - 1;
  for (let i = index; i < length; ++i) {
    const polygonToKeep = polygons[i + 1];
    polygons[i] = polygonToKeep;
    if (polygonToKeep instanceof ClippingPolygon) {
      polygonToKeep.index = i;
    }
  }

  polygons.length = length;

  this.polygonRemoved.raiseEvent(clippingPolygon, index);

  return true;
};

/**
 * Removes all polygons from the collection.
 *
 * @see ClippingPolygonCollection#add
 * @see ClippingPolygonCollection#remove
 */
ClippingPolygonCollection.prototype.removeAll = function () {
  // Dereference this ClippingPolygonCollection from all ClippingPolygons
  const polygons = this._polygons;
  const polygonsCount = polygons.length;
  for (let i = 0; i < polygonsCount; ++i) {
    const polygon = polygons[i];
    if (polygon instanceof ClippingPolygon) {
      polygon.onChangeCallback = undefined;
      polygon.index = -1;
    }
    this.polygonRemoved.raiseEvent(polygon, i);
  }
  this._dirty = true;
  this._polygons = [];
};

// const distanceEncodeScratch = new Cartesian4();
// const oct32EncodeScratch = new Cartesian4();
// function packPlanesAsUint8(clippingPolygonsCollection, startIndex, endIndex) {
//   const uint8View = clippingPolygonsCollection._uint8View;
//   const polygons = clippingPolygonsCollection._polygons;
//   let byteIndex = 0;
//   for (let i = startIndex; i < endIndex; ++i) {
//     const polygon = polygons[i];

//     const oct32Normal = AttributeCompression.octEncodeToCartesian4(
//       polygon.normal,
//       oct32EncodeScratch
//     );
//     uint8View[byteIndex] = oct32Normal.x;
//     uint8View[byteIndex + 1] = oct32Normal.y;
//     uint8View[byteIndex + 2] = oct32Normal.z;
//     uint8View[byteIndex + 3] = oct32Normal.w;

//     const encodedDistance = Cartesian4.packFloat(
//       polygon.distance,
//       distanceEncodeScratch
//     );
//     uint8View[byteIndex + 4] = encodedDistance.x;
//     uint8View[byteIndex + 5] = encodedDistance.y;
//     uint8View[byteIndex + 6] = encodedDistance.z;
//     uint8View[byteIndex + 7] = encodedDistance.w;

//     byteIndex += 8;
//   }
// }

function packPolygonsAsFloats(clippingPolygonCollection) {
  const float32View = clippingPolygonCollection._float32View;
  const polygons = clippingPolygonCollection._polygons;

  let floatIndex = 0;
  for (const polygon of polygons) {
    const length = polygon.positions.length;
    // Pack the length of the polygon
    float32View[floatIndex] = length;
    floatIndex += 3;

    for (let i = 0; i < length; ++i) {
      // TODO: Cartesian3 pack?
      const position = polygon.positions[i];

      float32View[floatIndex] = position.x;
      float32View[floatIndex + 1] = position.y;
      float32View[floatIndex + 2] = position.z;

      floatIndex += 3; // each position is 3 floats
    }
  }
}

function computeTextureResolution(pixelsNeeded, result) {
  const maxSize = ContextLimits.maximumTextureSize;
  result.x = Math.min(pixelsNeeded, maxSize);
  result.y = Math.ceil(pixelsNeeded / result.x);
  return result;
}

const textureResolutionScratch = new Cartesian2();
/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * build the resources for clipping polygons.
 * <p>
 * Do not call this function directly.
 * </p>
 */
ClippingPolygonCollection.prototype.update = function (frameState) {
  let clippingPolygonTexture = this._clippingPolygonsTexture;
  const context = frameState.context;
  const useFloatTexture = true; //ClippingPolygonCollection.useFloatTexture(context); TODO

  // TODO: Cull polygons outside of frustum

  // Compute texture requirements for current polygons TODO
  // In RGBA FLOAT, A plane is 4 floats packed to a RGBA.
  // In RGBA UNSIGNED_BYTE, A plane is a float in [0, 1) packed to RGBA and an Oct32 quantized normal,
  // so 8 bits or 2 pixels in RGBA.
  const pixelsNeeded = useFloatTexture
    ? this.totalPositions + this.length
    : this.totalPositions * 2;

  if (defined(clippingPolygonTexture)) {
    const currentPixelCount =
      clippingPolygonTexture.width * clippingPolygonTexture.height;
    // Recreate the texture to double current requirement if it isn't big enough or is 4 times larger than it needs to be.
    // Optimization note: this isn't exactly the classic resizeable array algorithm
    // * not necessarily checking for resize after each add/remove operation
    // * random-access deletes instead of just pops
    // * alloc ops likely more expensive than demonstrable via big-O analysis
    if (
      currentPixelCount < pixelsNeeded ||
      pixelsNeeded < 0.25 * currentPixelCount
    ) {
      clippingPolygonTexture.destroy();
      clippingPolygonTexture = undefined;
      this._clippingPolygonsTexture = undefined;
    }
  }

  // If there are no clipping polygons, there's nothing to update.
  if (this.length === 0) {
    return;
  }

  if (!defined(clippingPolygonTexture)) {
    const requiredResolution = computeTextureResolution(
      pixelsNeeded,
      textureResolutionScratch
    );
    // Allocate twice as much space as needed to avoid frequent texture reallocation.
    // Allocate in the Y direction, since texture may be as wide as context texture support.
    requiredResolution.y *= 2;

    if (useFloatTexture) {
      clippingPolygonTexture = new Texture({
        context: context,
        width: requiredResolution.x,
        height: requiredResolution.y,
        pixelFormat: PixelFormat.RGB,
        pixelDatatype: PixelDatatype.FLOAT,
        sampler: Sampler.NEAREST,
        flipY: false,
      });
      this._float32View = new Float32Array(
        requiredResolution.x * requiredResolution.y * 3
      );
    } else {
      // clippingPolygonTexture = new Texture({
      //   context: context,
      //   width: requiredResolution.x,
      //   height: requiredResolution.y,
      //   pixelFormat: PixelFormat.RGBA,
      //   pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      //   sampler: Sampler.NEAREST,
      //   flipY: false,
      // });
      // this._uint8View = new Uint8Array(
      //   requiredResolution.x * requiredResolution.y * 4
      // );
    }

    this._clippingPolygonsTexture = clippingPolygonTexture;
  }

  if (!this._dirty) {
    return;
  }

  if (useFloatTexture) {
    packPolygonsAsFloats(this);
    clippingPolygonTexture.copyFrom({
      source: {
        width: clippingPolygonTexture.width,
        height: clippingPolygonTexture.height,
        arrayBufferView: this._float32View,
      },
    });
  } else {
    // packPlanesAsUint8(this, 0, this._planes.length);
    // clippingPolygonTexture.copyFrom({
    //   source: {
    //     width: clippingPolygonTexture.width,
    //     height: clippingPolygonTexture.height,
    //     arrayBufferView: this._uint8View,
    //   },
    // });
  }

  this._dirty = false;
};

const scratchRectangle = new Rectangle();
const scratchRectangleTile = new Rectangle();
const scratchRectangleIntersection = new Rectangle();
/**
 * Determines the type intersection with the polygons of this ClippingPolygonCollection instance and the specified {@link TileBoundingVolume}.
 * @private
 *
 * @param {object} tileBoundingVolume The volume to determine the intersection with the planes.
 * @param {Matrix4} [transform] An optional, additional matrix to transform the plane to world coordinates.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire volume is on the side of the planes
 *                      the normal is pointing and should be entirely rendered, {@link Intersect.OUTSIDE}
 *                      if the entire volume is on the opposite side and should be clipped, and
 *                      {@link Intersect.INTERSECTING} if the volume intersects the planes.
 */
ClippingPolygonCollection.prototype.computeIntersectionWithBoundingVolume = function (
  tileBoundingVolume,
  transform
) {
  const polygons = this._polygons;
  const length = polygons.length;

  // If the collection is not set to union the clipping regions, the volume must be outside of all planes to be
  // considered completely clipped. If the collection is set to union the clipping regions, if the volume can be
  // outside any the planes, it is considered completely clipped.
  // Lastly, if not completely clipped, if any plane is intersecting, more calculations must be performed.
  let intersection = Intersect.OUTSIDE;
  if (this.inverse && length > 0) {
    intersection = Intersect.INSIDE;
  }

  for (let i = 0; i < length; ++i) {
    const polygon = polygons[i];

    const polygonBoundingRectangle = polygon.computeRectangle(scratchRectangle);
    let tileBoundingRectangle = tileBoundingVolume.rectangle; //TODO:  BoundingSphere
    if (!defined(tileBoundingRectangle)) {
      const points = tileBoundingVolume.boundingVolume.computeCorners();
      tileBoundingRectangle = Rectangle.fromCartesianArray(
        points,
        undefined,
        scratchRectangleTile
      );
    }
    if (!defined(tileBoundingRectangle)) {
      return Intersect.INTERSECTING;
    }
    const result = Rectangle.intersection(
      polygonBoundingRectangle,
      tileBoundingRectangle,
      scratchRectangleIntersection
    );

    if (defined(result)) {
      // if (Rectangle.equalsEpsilon(result, tileBoundingRectangle, CesiumMath.EPSILON10)) {
      //   return this.inverse ? Intersect.OUTSIDE : Intersect.INSIDE;
      // }

      intersection = Intersect.INTERSECTING;
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
 * @private
 */
ClippingPolygonCollection.setOwner = function (
  clippingPolygonsCollection,
  owner,
  key
) {
  // Don't destroy the ClippingPolygonCollection if it is already owned by newOwner
  if (clippingPolygonsCollection === owner[key]) {
    return;
  }
  // Destroy the existing ClippingPolygonCollection, if any
  owner[key] = owner[key] && owner[key].destroy();
  if (defined(clippingPolygonsCollection)) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(clippingPolygonsCollection._owner)) {
      throw new DeveloperError(
        "ClippingPolygonCollection should only be assigned to one object"
      );
    }
    //>>includeEnd('debug');
    clippingPolygonsCollection._owner = owner;
    owner[key] = clippingPolygonsCollection;
  }
};

/**
 * Function for checking if the context will allow clipping polygons with floating point textures.
 *
 * @param {Context} context The Context that will contain clipped objects and clipping textures.
 * @returns {boolean} <code>true</code> if floating point textures can be used for clipping polygons.
 * @private
 */
ClippingPolygonCollection.useFloatTexture = function (context) {
  return context.floatingPointTexture;
};

/**
 * Function for getting the clipping collection's texture resolution.
 * If the ClippingPolygonCollection hasn't been updated, returns the resolution that will be
 * allocated based on the current polygon count.
 *
 * @param {ClippingPolygonCollection} clippingPolygonCollection The clipping polygon collection
 * @param {Context} context The rendering context
 * @param {Cartesian2} result A Cartesian2 for the result.
 * @returns {Cartesian2} The required resolution.
 * @private
 */
ClippingPolygonCollection.getTextureResolution = function (
  clippingPolygonCollection,
  context,
  result
) {
  const texture = clippingPolygonCollection.texture;
  if (defined(texture)) {
    result.x = texture.width;
    result.y = texture.height;
    return result;
  }

  const pixelsNeeded = ClippingPolygonCollection.useFloatTexture(context)
    ? clippingPolygonCollection.length
    : clippingPolygonCollection.length * 2;
  const requiredResolution = computeTextureResolution(pixelsNeeded, result);

  // Allocate twice as much space as needed to avoid frequent texture reallocation.
  requiredResolution.y *= 2;
  return requiredResolution;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see ClippingPolygonCollection#destroy
 */
ClippingPolygonCollection.prototype.isDestroyed = function () {
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
 * @see ClippingPolygonCollection#isDestroyed
 */
ClippingPolygonCollection.prototype.destroy = function () {
  this._clippingPolygonsTexture =
    this._clippingPolygonsTexture && this._clippingPolygonsTexture.destroy();
  return destroyObject(this);
};
export default ClippingPolygonCollection;
