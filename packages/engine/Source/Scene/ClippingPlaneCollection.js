import AttributeCompression from "../Core/AttributeCompression.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Intersect from "../Core/Intersect.js";
import Matrix4 from "../Core/Matrix4.js";
import PixelFormat from "../Core/PixelFormat.js";
import Plane from "../Core/Plane.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import ClippingPlane from "./ClippingPlane.js";

/**
 * Specifies a set of clipping planes. Clipping planes selectively disable rendering in a region on the
 * outside of the specified list of {@link ClippingPlane} objects for a single gltf model, 3D Tileset, or the globe.
 * <p>
 * In general the clipping planes' coordinates are relative to the object they're attached to, so a plane with distance set to 0 will clip
 * through the center of the object.
 * </p>
 * <p>
 * For 3D Tiles, the root tile's transform is used to position the clipping planes. If a transform is not defined, the root tile's {@link Cesium3DTile#boundingSphere} is used instead.
 * </p>
 *
 * @alias ClippingPlaneCollection
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {ClippingPlane[]} [options.planes=[]] An array of {@link ClippingPlane} objects used to selectively disable rendering on the outside of each plane.
 * @param {boolean} [options.enabled=true] Determines whether the clipping planes are active.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix specifying an additional transform relative to the clipping planes original coordinate system.
 * @param {boolean} [options.unionClippingRegions=false] If true, a region will be clipped if it is on the outside of any plane in the collection. Otherwise, a region will only be clipped if it is on the outside of every plane.
 * @param {Color} [options.edgeColor=Color.WHITE] The color applied to highlight the edge along which an object is clipped.
 * @param {number} [options.edgeWidth=0.0] The width, in pixels, of the highlight applied to the edge along which an object is clipped.
 *
 * @demo {@link https://sandcastle.cesium.com/?src=3D%20Tiles%20Clipping%20Planes.html|Clipping 3D Tiles and glTF models.}
 * @demo {@link https://sandcastle.cesium.com/?src=Terrain%20Clipping%20Planes.html|Clipping the Globe.}
 *
 * @example
 * // This clipping plane's distance is positive, which means its normal
 * // is facing the origin. This will clip everything that is behind
 * // the plane, which is anything with y coordinate < -5.
 * const clippingPlanes = new Cesium.ClippingPlaneCollection({
 *     planes : [
 *         new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), 5.0)
 *     ],
 * });
 * // Create an entity and attach the ClippingPlaneCollection to the model.
 * const entity = viewer.entities.add({
 *     position : Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 10000),
 *     model : {
 *         uri : 'model.gltf',
 *         minimumPixelSize : 128,
 *         maximumScale : 20000,
 *         clippingPlanes : clippingPlanes
 *     }
 * });
 * viewer.zoomTo(entity);
 */
function ClippingPlaneCollection(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._planes = [];

  // Do partial texture updates if just one plane is dirty.
  // If many planes are dirty, refresh the entire texture.
  this._dirtyIndex = -1;
  this._multipleDirtyPlanes = false;

  this._enabled = options.enabled ?? true;

  /**
   * The 4x4 transformation matrix specifying an additional transform relative to the clipping planes
   * original coordinate system.
   *
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   */
  this.modelMatrix = Matrix4.clone(options.modelMatrix ?? Matrix4.IDENTITY);

  /**
   * The color applied to highlight the edge along which an object is clipped.
   *
   * @type {Color}
   * @default Color.WHITE
   */
  this.edgeColor = Color.clone(options.edgeColor ?? Color.WHITE);

  /**
   * The width, in pixels, of the highlight applied to the edge along which an object is clipped.
   *
   * @type {number}
   * @default 0.0
   */
  this.edgeWidth = options.edgeWidth ?? 0.0;

  /**
   * An event triggered when a new clipping plane is added to the collection.  Event handlers
   * are passed the new plane and the index at which it was added.
   * @type {Event}
   * @default Event()
   */
  this.planeAdded = new Event();

  /**
   * An event triggered when a new clipping plane is removed from the collection.  Event handlers
   * are passed the new plane and the index from which it was removed.
   * @type {Event}
   * @default Event()
   */
  this.planeRemoved = new Event();

  // If this ClippingPlaneCollection has an owner, only its owner should update or destroy it.
  // This is because in a Cesium3DTileset multiple models may reference the tileset's ClippingPlaneCollection.
  this._owner = undefined;

  const unionClippingRegions = options.unionClippingRegions ?? false;
  this._unionClippingRegions = unionClippingRegions;
  this._testIntersection = unionClippingRegions
    ? unionIntersectFunction
    : defaultIntersectFunction;

  this._uint8View = undefined;
  this._float32View = undefined;

  this._clippingPlanesTexture = undefined;

  // Add each ClippingPlane object.
  const planes = options.planes;
  if (defined(planes)) {
    const planesLength = planes.length;
    for (let i = 0; i < planesLength; ++i) {
      this.add(planes[i]);
    }
  }
}

function unionIntersectFunction(value) {
  return value === Intersect.OUTSIDE;
}

function defaultIntersectFunction(value) {
  return value === Intersect.INSIDE;
}

Object.defineProperties(ClippingPlaneCollection.prototype, {
  /**
   * Returns the number of planes in this collection.  This is commonly used with
   * {@link ClippingPlaneCollection#get} to iterate over all the planes
   * in the collection.
   *
   * @memberof ClippingPlaneCollection.prototype
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._planes.length;
    },
  },

  /**
   * If true, a region will be clipped if it is on the outside of any plane in the
   * collection. Otherwise, a region will only be clipped if it is on the
   * outside of every plane.
   *
   * @memberof ClippingPlaneCollection.prototype
   * @type {boolean}
   * @default false
   */
  unionClippingRegions: {
    get: function () {
      return this._unionClippingRegions;
    },
    set: function (value) {
      if (this._unionClippingRegions === value) {
        return;
      }
      this._unionClippingRegions = value;
      this._testIntersection = value
        ? unionIntersectFunction
        : defaultIntersectFunction;
    },
  },

  /**
   * If true, clipping will be enabled.
   *
   * @memberof ClippingPlaneCollection.prototype
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
   * Returns a texture containing packed, untransformed clipping planes.
   *
   * @memberof ClippingPlaneCollection.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  texture: {
    get: function () {
      return this._clippingPlanesTexture;
    },
  },

  /**
   * A reference to the ClippingPlaneCollection's owner, if any.
   *
   * @memberof ClippingPlaneCollection.prototype
   * @readonly
   * @private
   */
  owner: {
    get: function () {
      return this._owner;
    },
  },

  /**
   * Returns a Number encapsulating the state for this ClippingPlaneCollection.
   *
   * Clipping mode is encoded in the sign of the number, which is just the plane count.
   * If this value changes, then shader regeneration is necessary.
   *
   * @memberof ClippingPlaneCollection.prototype
   * @returns {number} A Number that describes the ClippingPlaneCollection's state.
   * @readonly
   * @private
   */
  clippingPlanesState: {
    get: function () {
      return this._unionClippingRegions
        ? this._planes.length
        : -this._planes.length;
    },
  },
});

function setIndexDirty(collection, index) {
  // If there's already a different _dirtyIndex set, more than one plane has changed since update.
  // Entire texture must be reloaded
  collection._multipleDirtyPlanes =
    collection._multipleDirtyPlanes ||
    (collection._dirtyIndex !== -1 && collection._dirtyIndex !== index);
  collection._dirtyIndex = index;
}

/**
 * Adds the specified {@link ClippingPlane} to the collection to be used to selectively disable rendering
 * on the outside of each plane. Use {@link ClippingPlaneCollection#unionClippingRegions} to modify
 * how modify the clipping behavior of multiple planes.
 *
 * @param {ClippingPlane} plane The ClippingPlane to add to the collection.
 *
 * @see ClippingPlaneCollection#unionClippingRegions
 * @see ClippingPlaneCollection#remove
 * @see ClippingPlaneCollection#removeAll
 */
ClippingPlaneCollection.prototype.add = function (plane) {
  const newPlaneIndex = this._planes.length;

  const that = this;
  plane.onChangeCallback = function (index) {
    setIndexDirty(that, index);
  };
  plane.index = newPlaneIndex;

  setIndexDirty(this, newPlaneIndex);
  this._planes.push(plane);
  this.planeAdded.raiseEvent(plane, newPlaneIndex);
};

/**
 * Returns the plane in the collection at the specified index.  Indices are zero-based
 * and increase as planes are added.  Removing a plane shifts all planes after
 * it to the left, changing their indices.  This function is commonly used with
 * {@link ClippingPlaneCollection#length} to iterate over all the planes
 * in the collection.
 *
 * @param {number} index The zero-based index of the plane.
 * @returns {ClippingPlane} The ClippingPlane at the specified index.
 *
 * @see ClippingPlaneCollection#length
 */
ClippingPlaneCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  return this._planes[index];
};

function indexOf(planes, plane) {
  const length = planes.length;
  for (let i = 0; i < length; ++i) {
    if (Plane.equals(planes[i], plane)) {
      return i;
    }
  }

  return -1;
}

/**
 * Checks whether this collection contains a ClippingPlane equal to the given ClippingPlane.
 *
 * @param {ClippingPlane} [clippingPlane] The ClippingPlane to check for.
 * @returns {boolean} true if this collection contains the ClippingPlane, false otherwise.
 *
 * @see ClippingPlaneCollection#get
 */
ClippingPlaneCollection.prototype.contains = function (clippingPlane) {
  return indexOf(this._planes, clippingPlane) !== -1;
};

/**
 * Removes the first occurrence of the given ClippingPlane from the collection.
 *
 * @param {ClippingPlane} clippingPlane
 * @returns {boolean} <code>true</code> if the plane was removed; <code>false</code> if the plane was not found in the collection.
 *
 * @see ClippingPlaneCollection#add
 * @see ClippingPlaneCollection#contains
 * @see ClippingPlaneCollection#removeAll
 */
ClippingPlaneCollection.prototype.remove = function (clippingPlane) {
  const planes = this._planes;
  const index = indexOf(planes, clippingPlane);

  if (index === -1) {
    return false;
  }

  // Unlink this ClippingPlaneCollection from the ClippingPlane
  if (clippingPlane instanceof ClippingPlane) {
    clippingPlane.onChangeCallback = undefined;
    clippingPlane.index = -1;
  }

  // Shift and update indices
  const length = planes.length - 1;
  for (let i = index; i < length; ++i) {
    const planeToKeep = planes[i + 1];
    planes[i] = planeToKeep;
    if (planeToKeep instanceof ClippingPlane) {
      planeToKeep.index = i;
    }
  }

  // Indicate planes texture is dirty
  this._multipleDirtyPlanes = true;
  planes.length = length;

  this.planeRemoved.raiseEvent(clippingPlane, index);

  return true;
};

/**
 * Removes all planes from the collection.
 *
 * @see ClippingPlaneCollection#add
 * @see ClippingPlaneCollection#remove
 */
ClippingPlaneCollection.prototype.removeAll = function () {
  // Dereference this ClippingPlaneCollection from all ClippingPlanes
  const planes = this._planes;
  const planesCount = planes.length;
  for (let i = 0; i < planesCount; ++i) {
    const plane = planes[i];
    if (plane instanceof ClippingPlane) {
      plane.onChangeCallback = undefined;
      plane.index = -1;
    }
    this.planeRemoved.raiseEvent(plane, i);
  }
  this._multipleDirtyPlanes = true;
  this._planes = [];
};

const distanceEncodeScratch = new Cartesian4();
const oct32EncodeScratch = new Cartesian4();
function packPlanesAsUint8(clippingPlaneCollection, startIndex, endIndex) {
  const uint8View = clippingPlaneCollection._uint8View;
  const planes = clippingPlaneCollection._planes;
  let byteIndex = 0;
  for (let i = startIndex; i < endIndex; ++i) {
    const plane = planes[i];

    const oct32Normal = AttributeCompression.octEncodeToCartesian4(
      plane.normal,
      oct32EncodeScratch,
    );
    uint8View[byteIndex] = oct32Normal.x;
    uint8View[byteIndex + 1] = oct32Normal.y;
    uint8View[byteIndex + 2] = oct32Normal.z;
    uint8View[byteIndex + 3] = oct32Normal.w;

    const encodedDistance = Cartesian4.packFloat(
      plane.distance,
      distanceEncodeScratch,
    );
    uint8View[byteIndex + 4] = encodedDistance.x;
    uint8View[byteIndex + 5] = encodedDistance.y;
    uint8View[byteIndex + 6] = encodedDistance.z;
    uint8View[byteIndex + 7] = encodedDistance.w;

    byteIndex += 8;
  }
}

// Pack starting at the beginning of the buffer to allow partial update
function packPlanesAsFloats(clippingPlaneCollection, startIndex, endIndex) {
  const float32View = clippingPlaneCollection._float32View;
  const planes = clippingPlaneCollection._planes;

  let floatIndex = 0;
  for (let i = startIndex; i < endIndex; ++i) {
    const plane = planes[i];
    const normal = plane.normal;

    float32View[floatIndex] = normal.x;
    float32View[floatIndex + 1] = normal.y;
    float32View[floatIndex + 2] = normal.z;
    float32View[floatIndex + 3] = plane.distance;

    floatIndex += 4; // each plane is 4 floats
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
 * build the resources for clipping planes.
 * <p>
 * Do not call this function directly.
 * </p>
 */
ClippingPlaneCollection.prototype.update = function (frameState) {
  let clippingPlanesTexture = this._clippingPlanesTexture;
  const context = frameState.context;
  const useFloatTexture = ClippingPlaneCollection.useFloatTexture(context);

  // Compute texture requirements for current planes
  // In RGBA FLOAT, A plane is 4 floats packed to a RGBA.
  // In RGBA UNSIGNED_BYTE, A plane is a float in [0, 1) packed to RGBA and an Oct32 quantized normal,
  // so 8 bits or 2 pixels in RGBA.
  const pixelsNeeded = useFloatTexture ? this.length : this.length * 2;

  if (defined(clippingPlanesTexture)) {
    const currentPixelCount =
      clippingPlanesTexture.width * clippingPlanesTexture.height;
    // Recreate the texture to double current requirement if it isn't big enough or is 4 times larger than it needs to be.
    // Optimization note: this isn't exactly the classic resizeable array algorithm
    // * not necessarily checking for resize after each add/remove operation
    // * random-access deletes instead of just pops
    // * alloc ops likely more expensive than demonstrable via big-O analysis
    if (
      currentPixelCount < pixelsNeeded ||
      pixelsNeeded < 0.25 * currentPixelCount
    ) {
      clippingPlanesTexture.destroy();
      clippingPlanesTexture = undefined;
      this._clippingPlanesTexture = undefined;
    }
  }

  // If there are no clipping planes, there's nothing to update.
  if (this.length === 0) {
    return;
  }

  if (!defined(clippingPlanesTexture)) {
    const requiredResolution = computeTextureResolution(
      pixelsNeeded,
      textureResolutionScratch,
    );
    // Allocate twice as much space as needed to avoid frequent texture reallocation.
    // Allocate in the Y direction, since texture may be as wide as context texture support.
    requiredResolution.y *= 2;

    if (useFloatTexture) {
      clippingPlanesTexture = new Texture({
        context: context,
        width: requiredResolution.x,
        height: requiredResolution.y,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.FLOAT,
        sampler: Sampler.NEAREST,
        flipY: false,
      });
      this._float32View = new Float32Array(
        requiredResolution.x * requiredResolution.y * 4,
      );
    } else {
      clippingPlanesTexture = new Texture({
        context: context,
        width: requiredResolution.x,
        height: requiredResolution.y,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        sampler: Sampler.NEAREST,
        flipY: false,
      });
      this._uint8View = new Uint8Array(
        requiredResolution.x * requiredResolution.y * 4,
      );
    }

    this._clippingPlanesTexture = clippingPlanesTexture;
    this._multipleDirtyPlanes = true;
  }

  const dirtyIndex = this._dirtyIndex;
  if (!this._multipleDirtyPlanes && dirtyIndex === -1) {
    return;
  }
  if (!this._multipleDirtyPlanes) {
    // partial updates possible
    let offsetX = 0;
    let offsetY = 0;
    if (useFloatTexture) {
      offsetY = Math.floor(dirtyIndex / clippingPlanesTexture.width);
      offsetX = Math.floor(dirtyIndex - offsetY * clippingPlanesTexture.width);

      packPlanesAsFloats(this, dirtyIndex, dirtyIndex + 1);
      clippingPlanesTexture.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: this._float32View,
        },
        xOffset: offsetX,
        yOffset: offsetY,
      });
    } else {
      offsetY = Math.floor((dirtyIndex * 2) / clippingPlanesTexture.width);
      offsetX = Math.floor(
        dirtyIndex * 2 - offsetY * clippingPlanesTexture.width,
      );
      packPlanesAsUint8(this, dirtyIndex, dirtyIndex + 1);
      clippingPlanesTexture.copyFrom({
        source: {
          width: 2,
          height: 1,
          arrayBufferView: this._uint8View,
        },
        xOffset: offsetX,
        yOffset: offsetY,
      });
    }
  } else if (useFloatTexture) {
    packPlanesAsFloats(this, 0, this._planes.length);
    clippingPlanesTexture.copyFrom({
      source: {
        width: clippingPlanesTexture.width,
        height: clippingPlanesTexture.height,
        arrayBufferView: this._float32View,
      },
    });
  } else {
    packPlanesAsUint8(this, 0, this._planes.length);
    clippingPlanesTexture.copyFrom({
      source: {
        width: clippingPlanesTexture.width,
        height: clippingPlanesTexture.height,
        arrayBufferView: this._uint8View,
      },
    });
  }

  this._multipleDirtyPlanes = false;
  this._dirtyIndex = -1;
};

const scratchMatrix = new Matrix4();
const scratchPlane = new Plane(Cartesian3.UNIT_X, 0.0);
/**
 * Determines the type intersection with the planes of this ClippingPlaneCollection instance and the specified {@link TileBoundingVolume}.
 * @private
 *
 * @param {object} tileBoundingVolume The volume to determine the intersection with the planes.
 * @param {Matrix4} [transform] An optional, additional matrix to transform the plane to world coordinates.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire volume is on the side of the planes
 *                      the normal is pointing and should be entirely rendered, {@link Intersect.OUTSIDE}
 *                      if the entire volume is on the opposite side and should be clipped, and
 *                      {@link Intersect.INTERSECTING} if the volume intersects the planes.
 */
ClippingPlaneCollection.prototype.computeIntersectionWithBoundingVolume =
  function (tileBoundingVolume, transform) {
    const planes = this._planes;
    const length = planes.length;

    let modelMatrix = this.modelMatrix;
    if (defined(transform)) {
      modelMatrix = Matrix4.multiply(transform, modelMatrix, scratchMatrix);
    }

    // If the collection is not set to union the clipping regions, the volume must be outside of all planes to be
    // considered completely clipped. If the collection is set to union the clipping regions, if the volume can be
    // outside any the planes, it is considered completely clipped.
    // Lastly, if not completely clipped, if any plane is intersecting, more calculations must be performed.
    let intersection = Intersect.INSIDE;
    if (!this.unionClippingRegions && length > 0) {
      intersection = Intersect.OUTSIDE;
    }

    for (let i = 0; i < length; ++i) {
      const plane = planes[i];

      Plane.transform(plane, modelMatrix, scratchPlane); // ClippingPlane can be used for Plane math

      const value = tileBoundingVolume.intersectPlane(scratchPlane);
      if (value === Intersect.INTERSECTING) {
        intersection = value;
      } else if (this._testIntersection(value)) {
        return value;
      }
    }

    return intersection;
  };

/**
 * Sets the owner for the input ClippingPlaneCollection if there wasn't another owner.
 * Destroys the owner's previous ClippingPlaneCollection if setting is successful.
 *
 * @param {ClippingPlaneCollection} [clippingPlaneCollection] A ClippingPlaneCollection (or undefined) being attached to an object
 * @param {object} owner An Object that should receive the new ClippingPlaneCollection
 * @param {string} key The Key for the Object to reference the ClippingPlaneCollection
 * @private
 */
ClippingPlaneCollection.setOwner = function (
  clippingPlaneCollection,
  owner,
  key,
) {
  // Don't destroy the ClippingPlaneCollection if it is already owned by newOwner
  if (clippingPlaneCollection === owner[key]) {
    return;
  }
  // Destroy the existing ClippingPlaneCollection, if any
  owner[key] = owner[key] && owner[key].destroy();
  if (defined(clippingPlaneCollection)) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(clippingPlaneCollection._owner)) {
      throw new DeveloperError(
        "ClippingPlaneCollection should only be assigned to one object",
      );
    }
    //>>includeEnd('debug');
    clippingPlaneCollection._owner = owner;
    owner[key] = clippingPlaneCollection;
  }
};

/**
 * Function for checking if the context will allow clipping planes with floating point textures.
 *
 * @param {Context} context The Context that will contain clipped objects and clipping textures.
 * @returns {boolean} <code>true</code> if floating point textures can be used for clipping planes.
 * @private
 */
ClippingPlaneCollection.useFloatTexture = function (context) {
  return context.floatingPointTexture;
};

/**
 * Function for getting the clipping plane collection's texture resolution.
 * If the ClippingPlaneCollection hasn't been updated, returns the resolution that will be
 * allocated based on the current plane count.
 *
 * @param {ClippingPlaneCollection} clippingPlaneCollection The clipping plane collection
 * @param {Context} context The rendering context
 * @param {Cartesian2} result A Cartesian2 for the result.
 * @returns {Cartesian2} The required resolution.
 * @private
 */
ClippingPlaneCollection.getTextureResolution = function (
  clippingPlaneCollection,
  context,
  result,
) {
  const texture = clippingPlaneCollection.texture;
  if (defined(texture)) {
    result.x = texture.width;
    result.y = texture.height;
    return result;
  }

  const pixelsNeeded = ClippingPlaneCollection.useFloatTexture(context)
    ? clippingPlaneCollection.length
    : clippingPlaneCollection.length * 2;
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
 * @see ClippingPlaneCollection#destroy
 */
ClippingPlaneCollection.prototype.isDestroyed = function () {
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
 * clippingPlanes = clippingPlanes && clippingPlanes.destroy();
 *
 * @see ClippingPlaneCollection#isDestroyed
 */
ClippingPlaneCollection.prototype.destroy = function () {
  this._clippingPlanesTexture =
    this._clippingPlanesTexture && this._clippingPlanesTexture.destroy();
  return destroyObject(this);
};
export default ClippingPlaneCollection;
