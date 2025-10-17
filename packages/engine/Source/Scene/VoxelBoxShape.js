import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import VoxelBoundsCollection from "./VoxelBoundsCollection.js";
import ClippingPlane from "./ClippingPlane.js";

/**
 * A box {@link VoxelShape}.
 *
 * @alias VoxelBoxShape
 * @constructor
 *
 * @see VoxelShape
 * @see VoxelEllipsoidShape
 * @see VoxelCylinderShape
 * @see VoxelShapeType
 *
 * @private
 */
function VoxelBoxShape() {
  this._orientedBoundingBox = new OrientedBoundingBox();
  this._boundingSphere = new BoundingSphere();
  this._boundTransform = new Matrix4();
  this._shapeTransform = new Matrix4();

  /**
   * The minimum bounds of the shape.
   * @type {Cartesian3}
   * @private
   */
  this._minBounds = VoxelBoxShape.DefaultMinBounds.clone();

  /**
   * The maximum bounds of the shape.
   * @type {Cartesian3}
   * @private
   */
  this._maxBounds = VoxelBoxShape.DefaultMaxBounds.clone();

  /**
   * The minimum render bounds of the shape.
   * @type {Cartesian3}
   * @private
   */
  this._renderMinBounds = VoxelBoxShape.DefaultMinBounds.clone();

  /**
   * The maximum render bounds of the shape.
   * @type {Cartesian3}
   * @private
   */
  this._renderMaxBounds = VoxelBoxShape.DefaultMaxBounds.clone();

  const { DefaultMinBounds, DefaultMaxBounds } = VoxelBoxShape;
  const boundPlanes = [
    new ClippingPlane(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      DefaultMinBounds.x,
    ),
    new ClippingPlane(
      Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()),
      DefaultMinBounds.y,
    ),
    new ClippingPlane(
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      DefaultMinBounds.z,
    ),
    new ClippingPlane(Cartesian3.UNIT_X, -DefaultMaxBounds.x),
    new ClippingPlane(Cartesian3.UNIT_Y, -DefaultMaxBounds.y),
    new ClippingPlane(Cartesian3.UNIT_Z, -DefaultMaxBounds.z),
  ];

  this._renderBoundPlanes = new VoxelBoundsCollection({ planes: boundPlanes });

  this._shaderUniforms = {
    boxEcToXyz: new Matrix3(),
    boxLocalToShapeUvScale: new Cartesian3(),
    boxLocalToShapeUvTranslate: new Cartesian3(),
  };

  this._shaderDefines = {
    BOX_INTERSECTION_INDEX: undefined,
  };

  this._shaderMaximumIntersectionsLength = 0; // not known until update
}

Object.defineProperties(VoxelBoxShape.prototype, {
  /**
   * An oriented bounding box containing the bounded shape.
   *
   * @memberof VoxelBoxShape.prototype
   * @type {OrientedBoundingBox}
   * @readonly
   * @private
   */
  orientedBoundingBox: {
    get: function () {
      return this._orientedBoundingBox;
    },
  },

  /**
   * A collection of planes used for the render bounds
   * @memberof VoxelBoxShape.prototype
   * @type {VoxelBoundsCollection}
   * @readonly
   * @private
   */
  renderBoundPlanes: {
    get: function () {
      return this._renderBoundPlanes;
    },
  },

  /**
   * A bounding sphere containing the bounded shape.
   *
   * @memberof VoxelBoxShape.prototype
   * @type {BoundingSphere}
   * @readonly
   * @private
   */
  boundingSphere: {
    get: function () {
      return this._boundingSphere;
    },
  },

  /**
   * A transformation matrix containing the bounded shape.
   *
   * @memberof VoxelBoxShape.prototype
   * @type {Matrix4}
   * @readonly
   * @private
   */
  boundTransform: {
    get: function () {
      return this._boundTransform;
    },
  },

  /**
   * A transformation matrix containing the shape, ignoring the bounds.
   *
   * @memberof VoxelBoxShape.prototype
   * @type {Matrix4}
   * @readonly
   * @private
   */
  shapeTransform: {
    get: function () {
      return this._shapeTransform;
    },
  },

  /**
   * @memberof VoxelBoxShape.prototype
   * @type {Object<string, any>}
   * @readonly
   * @private
   */
  shaderUniforms: {
    get: function () {
      return this._shaderUniforms;
    },
  },

  /**
   * @memberof VoxelBoxShape.prototype
   * @type {Object<string, any>}
   * @readonly
   * @private
   */
  shaderDefines: {
    get: function () {
      return this._shaderDefines;
    },
  },

  /**
   * The maximum number of intersections against the shape for any ray direction.
   * @memberof VoxelBoxShape.prototype
   * @type {number}
   * @readonly
   * @private
   */
  shaderMaximumIntersectionsLength: {
    get: function () {
      return this._shaderMaximumIntersectionsLength;
    },
  },
});

const scratchCenter = new Cartesian3();
const scratchScale = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchClipMinBounds = new Cartesian3();
const scratchClipMaxBounds = new Cartesian3();

/**
 * Update the shape's state.
 * @private
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 * @param {Cartesian3} [clipMinBounds] The minimum clip bounds.
 * @param {Cartesian3} [clipMaxBounds] The maximum clip bounds.
 * @returns {boolean} Whether the shape is visible.
 */
VoxelBoxShape.prototype.update = function (
  modelMatrix,
  minBounds,
  maxBounds,
  clipMinBounds,
  clipMaxBounds,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  clipMinBounds = clipMinBounds ?? minBounds.clone(scratchClipMinBounds);
  clipMaxBounds = clipMaxBounds ?? maxBounds.clone(scratchClipMaxBounds);

  minBounds = Cartesian3.clone(minBounds, this._minBounds);
  maxBounds = Cartesian3.clone(maxBounds, this._maxBounds);

  const renderMinBounds = Cartesian3.clamp(
    minBounds,
    clipMinBounds,
    clipMaxBounds,
    this._renderMinBounds,
  );
  const renderMaxBounds = Cartesian3.clamp(
    maxBounds,
    clipMinBounds,
    clipMaxBounds,
    this._renderMaxBounds,
  );

  // Box is not visible if:
  // - any of the min render bounds exceed the max render bounds
  // - two or more of the min bounds equal the max bounds (line / point)
  // - scale is 0 for any component (too annoying to reconstruct rotation matrix)
  const scale = Matrix4.getScale(modelMatrix, scratchScale);
  if (
    renderMinBounds.x > renderMaxBounds.x ||
    renderMinBounds.y > renderMaxBounds.y ||
    renderMinBounds.z > renderMaxBounds.z ||
    (renderMinBounds.x === renderMaxBounds.x) +
      (renderMinBounds.y === renderMaxBounds.y) +
      (renderMinBounds.z === renderMaxBounds.z) >=
      2 ||
    scale.x === 0.0 ||
    scale.y === 0.0 ||
    scale.z === 0.0
  ) {
    return false;
  }

  // Update the render bounds planes
  const renderBoundPlanes = this._renderBoundPlanes;
  renderBoundPlanes.get(0).distance = renderMinBounds.x;
  renderBoundPlanes.get(1).distance = renderMinBounds.y;
  renderBoundPlanes.get(2).distance = renderMinBounds.z;
  renderBoundPlanes.get(3).distance = -renderMaxBounds.x;
  renderBoundPlanes.get(4).distance = -renderMaxBounds.y;
  renderBoundPlanes.get(5).distance = -renderMaxBounds.z;

  this._shapeTransform = Matrix4.clone(modelMatrix, this._shapeTransform);

  this._orientedBoundingBox = getBoxChunkObb(
    renderMinBounds,
    renderMaxBounds,
    this._shapeTransform,
    this._orientedBoundingBox,
  );

  // All of the box bounds go from -1 to +1, so the model matrix scale can be
  // used as the oriented bounding box half axes.
  this._boundTransform = Matrix4.fromRotationTranslation(
    this._orientedBoundingBox.halfAxes,
    this._orientedBoundingBox.center,
    this._boundTransform,
  );

  this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this._orientedBoundingBox,
    this._boundingSphere,
  );

  const shaderUniforms = this._shaderUniforms;
  const shaderDefines = this._shaderDefines;

  // To keep things simple, clear the defines every time
  for (const key in shaderDefines) {
    if (shaderDefines.hasOwnProperty(key)) {
      shaderDefines[key] = undefined;
    }
  }

  // Keep track of how many intersections there are going to be.
  let intersectionCount = 0;

  shaderDefines["BOX_INTERSECTION_INDEX"] = intersectionCount;
  intersectionCount += 1;

  // Compute scale and translation to transform from UV space to bounded UV space
  const min = minBounds;
  const max = maxBounds;
  const boxLocalToShapeUvScale = Cartesian3.fromElements(
    boundScale(min.x, max.x),
    boundScale(min.y, max.y),
    boundScale(min.z, max.z),
    shaderUniforms.boxLocalToShapeUvScale,
  );
  shaderUniforms.boxLocalToShapeUvTranslate = Cartesian3.negate(
    Cartesian3.multiplyComponents(
      boxLocalToShapeUvScale,
      min,
      shaderUniforms.boxLocalToShapeUvTranslate,
    ),
    shaderUniforms.boxLocalToShapeUvTranslate,
  );

  this._shaderMaximumIntersectionsLength = intersectionCount;

  return true;
};

function boundScale(minBound, maxBound) {
  return CesiumMath.equalsEpsilon(minBound, maxBound, CesiumMath.EPSILON7)
    ? 1.0
    : 1.0 / (maxBound - minBound);
}

const scratchTransformPositionWorldToLocal = new Matrix4();
/**
 * Update any view-dependent transforms.
 * @private
 * @param {FrameState} frameState The frame state.
 */
VoxelBoxShape.prototype.updateViewTransforms = function (frameState) {
  const shaderUniforms = this._shaderUniforms;
  const transformPositionWorldToLocal = Matrix4.inverse(
    this._shapeTransform,
    scratchTransformPositionWorldToLocal,
  );
  const transformDirectionWorldToLocal = Matrix4.getMatrix3(
    transformPositionWorldToLocal,
    shaderUniforms.boxEcToXyz,
  );
  const rotateViewToWorld = frameState.context.uniformState.inverseViewRotation;
  Matrix3.multiply(
    transformDirectionWorldToLocal,
    rotateViewToWorld,
    shaderUniforms.boxEcToXyz,
  );
};

/**
 * Convert a local coordinate to the shape's UV space.
 * @private
 * @param {Cartesian3} positionLocal The local coordinate to convert.
 * @param {Cartesian3} result The Cartesian3 to store the result in.
 * @returns {Cartesian3} The converted UV coordinate.
 */
VoxelBoxShape.prototype.convertLocalToShapeUvSpace = function (
  positionLocal,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("positionLocal", positionLocal);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const { boxLocalToShapeUvScale, boxLocalToShapeUvTranslate } =
    this._shaderUniforms;

  return Cartesian3.add(
    Cartesian3.multiplyComponents(
      positionLocal,
      boxLocalToShapeUvScale,
      result,
    ),
    boxLocalToShapeUvTranslate,
    result,
  );
};

const scratchTileMinBounds = new Cartesian3();
const scratchTileMaxBounds = new Cartesian3();

/**
 * Computes an oriented bounding box for a specified tile.
 * @private
 * @param {number} tileLevel The tile's level.
 * @param {number} tileX The tile's x coordinate.
 * @param {number} tileY The tile's y coordinate.
 * @param {number} tileZ The tile's z coordinate.
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified tile
 * @returns {OrientedBoundingBox} The oriented bounding box.
 */
VoxelBoxShape.prototype.computeOrientedBoundingBoxForTile = function (
  tileLevel,
  tileX,
  tileY,
  tileZ,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("tileLevel", tileLevel);
  Check.typeOf.number("tileX", tileX);
  Check.typeOf.number("tileY", tileY);
  Check.typeOf.number("tileZ", tileZ);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const minBounds = this._minBounds;
  const maxBounds = this._maxBounds;
  const sizeAtLevel = 1.0 / Math.pow(2, tileLevel);

  const tileMinBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, sizeAtLevel * tileX),
    CesiumMath.lerp(minBounds.y, maxBounds.y, sizeAtLevel * tileY),
    CesiumMath.lerp(minBounds.z, maxBounds.z, sizeAtLevel * tileZ),
    scratchTileMinBounds,
  );

  const tileMaxBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, sizeAtLevel * (tileX + 1)),
    CesiumMath.lerp(minBounds.y, maxBounds.y, sizeAtLevel * (tileY + 1)),
    CesiumMath.lerp(minBounds.z, maxBounds.z, sizeAtLevel * (tileZ + 1)),
    scratchTileMaxBounds,
  );

  return getBoxChunkObb(
    tileMinBounds,
    tileMaxBounds,
    this._shapeTransform,
    result,
  );
};

const sampleSizeScratch = new Cartesian3();

/**
 * Computes an oriented bounding box for a specified sample within a specified tile.
 * @private
 * @param {SpatialNode} spatialNode The spatial node containing the sample
 * @param {Cartesian3} tileDimensions The size of the tile in number of samples, before padding
 * @param {Cartesian3} tileUv The sample coordinate within the tile
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified sample
 * @returns {OrientedBoundingBox} The oriented bounding box.
 */
VoxelBoxShape.prototype.computeOrientedBoundingBoxForSample = function (
  spatialNode,
  tileDimensions,
  tileUv,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("spatialNode", spatialNode);
  Check.typeOf.object("tileDimensions", tileDimensions);
  Check.typeOf.object("tileUv", tileUv);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const tileSizeAtLevel = 1.0 / Math.pow(2, spatialNode.level);
  const sampleSize = Cartesian3.divideComponents(
    Cartesian3.ONE,
    tileDimensions,
    sampleSizeScratch,
  );
  const sampleSizeAtLevel = Cartesian3.multiplyByScalar(
    sampleSize,
    tileSizeAtLevel,
    sampleSizeScratch,
  );

  const minLerp = Cartesian3.multiplyByScalar(
    Cartesian3.fromElements(
      spatialNode.x + tileUv.x,
      spatialNode.y + tileUv.y,
      spatialNode.z + tileUv.z,
      scratchTileMinBounds,
    ),
    tileSizeAtLevel,
    scratchTileMinBounds,
  );
  const maxLerp = Cartesian3.add(
    minLerp,
    sampleSizeAtLevel,
    scratchTileMaxBounds,
  );

  const minBounds = this._minBounds;
  const maxBounds = this._maxBounds;
  const sampleMinBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, minLerp.x),
    CesiumMath.lerp(minBounds.y, maxBounds.y, minLerp.y),
    CesiumMath.lerp(minBounds.z, maxBounds.z, minLerp.z),
    scratchTileMinBounds,
  );
  const sampleMaxBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, maxLerp.x),
    CesiumMath.lerp(minBounds.y, maxBounds.y, maxLerp.y),
    CesiumMath.lerp(minBounds.z, maxBounds.z, maxLerp.z),
    scratchTileMaxBounds,
  );

  return getBoxChunkObb(
    sampleMinBounds,
    sampleMaxBounds,
    this._shapeTransform,
    result,
  );
};

/**
 * Defines the minimum bounds of the shape. Corresponds to minimum X, Y, Z.
 * @private
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelBoxShape.DefaultMinBounds = Object.freeze(
  new Cartesian3(-1.0, -1.0, -1.0),
);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum X, Y, Z.
 * @private
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelBoxShape.DefaultMaxBounds = Object.freeze(
  new Cartesian3(+1.0, +1.0, +1.0),
);

const scratchBoxScale = new Cartesian3();
/**
 * Computes an {@link OrientedBoundingBox} for a subregion of the shape.
 *
 * @function
 *
 * @param {Cartesian3} minimumBounds The minimum bounds, in the local coordinates of the shape.
 * @param {Cartesian3} maximumBounds The maximum bounds, in the local coordinates of the shape.
 * @param {Matrix4} matrix The matrix to transform the points.
 * @param {OrientedBoundingBox} result The object onto which to store the result.
 * @returns {OrientedBoundingBox} The oriented bounding box that contains this subregion.
 *
 * @private
 */
function getBoxChunkObb(minimumBounds, maximumBounds, matrix, result) {
  const defaultMinBounds = VoxelBoxShape.DefaultMinBounds;
  const defaultMaxBounds = VoxelBoxShape.DefaultMaxBounds;

  const isDefaultBounds =
    Cartesian3.equals(minimumBounds, defaultMinBounds) &&
    Cartesian3.equals(maximumBounds, defaultMaxBounds);

  if (isDefaultBounds) {
    result.center = Matrix4.getTranslation(matrix, result.center);
    result.halfAxes = Matrix4.getMatrix3(matrix, result.halfAxes);
  } else {
    let scale = Matrix4.getScale(matrix, scratchBoxScale);
    const localCenter = Cartesian3.midpoint(
      minimumBounds,
      maximumBounds,
      scratchCenter,
    );
    result.center = Matrix4.multiplyByPoint(matrix, localCenter, result.center);
    scale = Cartesian3.fromElements(
      scale.x * 0.5 * (maximumBounds.x - minimumBounds.x),
      scale.y * 0.5 * (maximumBounds.y - minimumBounds.y),
      scale.z * 0.5 * (maximumBounds.z - minimumBounds.z),
      scratchBoxScale,
    );
    const rotation = Matrix4.getRotation(matrix, scratchRotation);
    result.halfAxes = Matrix3.setScale(rotation, scale, result.halfAxes);
  }

  return result;
}

export default VoxelBoxShape;
