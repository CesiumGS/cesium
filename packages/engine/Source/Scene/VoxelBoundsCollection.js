import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import ClippingPlane from "./ClippingPlane.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Event from "../Core/Event.js";
import Frozen from "../Core/Frozen.js";
import Intersect from "../Core/Intersect.js";
import Matrix4 from "../Core/Matrix4.js";
import PixelFormat from "../Core/PixelFormat.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Plane from "../Core/Plane.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";

/**
 * Specifies a set of clipping planes defining rendering bounds for a {@link VoxelPrimitive}.
 *
 * @alias VoxelBoundsCollection
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {ClippingPlane[]} [options.planes=[]] An array of {@link ClippingPlane} objects used to selectively disable rendering on the outside of each plane.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix specifying an additional transform relative to the clipping planes original coordinate system.
 * @param {boolean} [options.unionClippingRegions=false] If true, a region will be clipped if it is on the outside of any plane in the collection. Otherwise, a region will only be clipped if it is on the outside of every plane.
 *
 * @private
 */
function VoxelBoundsCollection(options) {
  const {
    planes,
    modelMatrix = Matrix4.IDENTITY,
    unionClippingRegions = false,
  } = options ?? Frozen.EMPTY_OBJECT;

  this._planes = [];

  /**
   * The 4x4 transformation matrix specifying an additional transform relative to the clipping planes
   * original coordinate system.
   *
   * @type {Matrix4}
   * @default Matrix4.IDENTITY
   */
  this.modelMatrix = Matrix4.clone(modelMatrix);

  /**
   * An event triggered when a new clipping plane is added to the collection.  Event handlers
   * are passed the new plane and the index at which it was added.
   * @type {Event}
   * @readonly
   */
  this.planeAdded = new Event();

  /**
   * An event triggered when a new clipping plane is removed from the collection.  Event handlers
   * are passed the new plane and the index from which it was removed.
   * @type {Event}
   * @readonly
   */
  this.planeRemoved = new Event();

  this._unionClippingRegions = unionClippingRegions;
  this._testIntersection = unionClippingRegions
    ? unionIntersectFunction
    : defaultIntersectFunction;

  this._float32View = undefined;

  this._clippingPlanesTexture = undefined;

  // Add each ClippingPlane object.
  if (defined(planes)) {
    for (let i = 0; i < planes.length; ++i) {
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

Object.defineProperties(VoxelBoundsCollection.prototype, {
  /**
   * Returns the number of planes in this collection.  This is commonly used with
   * {@link VoxelBoundsCollection#get} to iterate over all the planes
   * in the collection.
   *
   * @memberof VoxelBoundsCollection.prototype
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
   * @memberof VoxelBoundsCollection.prototype
   * @type {boolean}
   * @default false
   */
  unionClippingRegions: {
    get: function () {
      return this._unionClippingRegions;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("value", value);
      //>>includeEnd('debug');
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
   * Returns a texture containing packed, untransformed clipping planes.
   *
   * @memberof VoxelBoundsCollection.prototype
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
   * Returns a Number encapsulating the state for this VoxelBoundsCollection.
   *
   * Clipping mode is encoded in the sign of the number, which is just the plane count.
   * If this value changes, then shader regeneration is necessary.
   *
   * @memberof VoxelBoundsCollection.prototype
   * @returns {number} A Number that describes the VoxelBoundsCollection's state.
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

/**
 * Adds the specified {@link ClippingPlane} to the collection to be used to selectively disable rendering
 * on the outside of each plane. Use {@link VoxelBoundsCollection#unionClippingRegions} to modify
 * how modify the clipping behavior of multiple planes.
 *
 * @param {ClippingPlane} plane The ClippingPlane to add to the collection.
 *
 * @see VoxelBoundsCollection#unionClippingRegions
 * @see VoxelBoundsCollection#remove
 * @see VoxelBoundsCollection#removeAll
 */
VoxelBoundsCollection.prototype.add = function (plane) {
  const newPlaneIndex = this._planes.length;
  plane.index = newPlaneIndex;
  this._planes.push(plane);
  this.planeAdded.raiseEvent(plane, newPlaneIndex);
};

/**
 * Returns the plane in the collection at the specified index.  Indices are zero-based
 * and increase as planes are added.  Removing a plane shifts all planes after
 * it to the left, changing their indices.  This function is commonly used with
 * {@link VoxelBoundsCollection#length} to iterate over all the planes
 * in the collection.
 *
 * @param {number} index The zero-based index of the plane.
 * @returns {ClippingPlane} The ClippingPlane at the specified index.
 *
 * @see VoxelBoundsCollection#length
 */
VoxelBoundsCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  return this._planes[index];
};

function indexOf(planes, plane) {
  for (let i = 0; i < planes.length; ++i) {
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
 * @see VoxelBoundsCollection#get
 */
VoxelBoundsCollection.prototype.contains = function (clippingPlane) {
  return indexOf(this._planes, clippingPlane) !== -1;
};

/**
 * Removes the first occurrence of the given ClippingPlane from the collection.
 *
 * @param {ClippingPlane} clippingPlane
 * @returns {boolean} <code>true</code> if the plane was removed; <code>false</code> if the plane was not found in the collection.
 *
 * @see VoxelBoundsCollection#add
 * @see VoxelBoundsCollection#contains
 * @see VoxelBoundsCollection#removeAll
 */
VoxelBoundsCollection.prototype.remove = function (clippingPlane) {
  const planes = this._planes;
  const index = indexOf(planes, clippingPlane);

  if (index === -1) {
    return false;
  }

  // Unlink this VoxelBoundsCollection from the ClippingPlane
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

  planes.length = length;

  this.planeRemoved.raiseEvent(clippingPlane, index);

  return true;
};

/**
 * Removes all planes from the collection.
 *
 * @see VoxelBoundsCollection#add
 * @see VoxelBoundsCollection#remove
 */
VoxelBoundsCollection.prototype.removeAll = function () {
  // Dereference this VoxelBoundsCollection from all ClippingPlanes
  const planes = this._planes;
  for (let i = 0; i < planes.length; ++i) {
    const plane = planes[i];
    if (plane instanceof ClippingPlane) {
      plane.onChangeCallback = undefined;
      plane.index = -1;
    }
    this.planeRemoved.raiseEvent(plane, i);
  }
  this._planes = [];
};

const scratchPlane = new Plane(Cartesian3.fromElements(1.0, 0.0, 0.0), 0.0);

// Pack starting at the beginning of the buffer to allow partial update
function transformAndPackPlanes(clippingPlaneCollection, transform) {
  const float32View = clippingPlaneCollection._float32View;
  const planes = clippingPlaneCollection._planes;

  let floatIndex = 0;
  for (let i = 0; i < planes.length; ++i) {
    const { normal, distance } = transformPlane(
      planes[i],
      transform,
      scratchPlane,
    );

    float32View[floatIndex] = normal.x;
    float32View[floatIndex + 1] = normal.y;
    float32View[floatIndex + 2] = normal.z;
    float32View[floatIndex + 3] = distance;

    floatIndex += 4; // each plane is 4 floats
  }
}

const scratchPlaneCartesian4 = new Cartesian4();
const scratchTransformedNormal = new Cartesian3();

function transformPlane(plane, transform, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("plane", plane);
  Check.typeOf.object("transform", transform);
  //>>includeEnd('debug');

  const { normal, distance } = plane;
  const planeAsCartesian4 = Cartesian4.fromElements(
    normal.x,
    normal.y,
    normal.z,
    distance,
    scratchPlaneCartesian4,
  );
  let transformedPlane = Matrix4.multiplyByVector(
    transform,
    planeAsCartesian4,
    scratchPlaneCartesian4,
  );

  // Convert the transformed plane to Hessian Normal Form
  const transformedNormal = Cartesian3.fromCartesian4(
    transformedPlane,
    scratchTransformedNormal,
  );
  transformedPlane = Cartesian4.divideByScalar(
    transformedPlane,
    Cartesian3.magnitude(transformedNormal),
    scratchPlaneCartesian4,
  );

  return Plane.fromCartesian4(transformedPlane, result);
}

function computeTextureResolution(pixelsNeeded, result) {
  result.x = Math.min(pixelsNeeded, ContextLimits.maximumTextureSize);
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
VoxelBoundsCollection.prototype.update = function (frameState, transform) {
  let clippingPlanesTexture = this._clippingPlanesTexture;

  // Compute texture requirements for current planes
  // In RGBA FLOAT, a plane is 4 floats packed to a single RGBA pixel.
  const pixelsNeeded = this.length;

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

  // If there are no bound planes, there's nothing to update.
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

    clippingPlanesTexture = new Texture({
      context: frameState.context,
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

    this._clippingPlanesTexture = clippingPlanesTexture;
  }

  const { width, height } = clippingPlanesTexture;
  transformAndPackPlanes(this, transform);
  clippingPlanesTexture.copyFrom({
    source: {
      width: width,
      height: height,
      arrayBufferView: this._float32View,
    },
  });
};

/**
 * Function for getting the clipping plane collection's texture resolution.
 * If the VoxelBoundsCollection hasn't been updated, returns the resolution that will be
 * allocated based on the current plane count.
 *
 * @param {VoxelBoundsCollection} clippingPlaneCollection The clipping plane collection
 * @param {Context} context The rendering context
 * @param {Cartesian2} result A Cartesian2 for the result.
 * @returns {Cartesian2} The required resolution.
 * @private
 */
VoxelBoundsCollection.getTextureResolution = function (
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

  const pixelsNeeded = clippingPlaneCollection.length;
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
 * @see VoxelBoundsCollection#destroy
 */
VoxelBoundsCollection.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * voxelBounds = voxelBounds && voxelBounds.destroy();
 *
 * @see VoxelBoundsCollection#isDestroyed
 */
VoxelBoundsCollection.prototype.destroy = function () {
  this._clippingPlanesTexture =
    this._clippingPlanesTexture && this._clippingPlanesTexture.destroy();
  return destroyObject(this);
};
export default VoxelBoundsCollection;
