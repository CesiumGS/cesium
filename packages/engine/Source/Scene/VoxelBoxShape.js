import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";

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
  /**
   * An oriented bounding box containing the bounded shape.
   * The update function must be called before accessing this value.
   * @private
   * @type {OrientedBoundingBox}
   * @readonly
   */
  this.orientedBoundingBox = new OrientedBoundingBox();

  /**
   * A bounding sphere containing the bounded shape.
   * The update function must be called before accessing this value.
   * @private
   * @type {BoundingSphere}
   * @readonly
   */
  this.boundingSphere = new BoundingSphere();

  /**
   * A transformation matrix containing the bounded shape.
   * The update function must be called before accessing this value.
   * @private
   * @type {Matrix4}
   * @readonly
   */
  this.boundTransform = new Matrix4();

  /**
   * A transformation matrix containing the shape, ignoring the bounds.
   * The update function must be called before accessing this value.
   * @private
   * @type {Matrix4}
   * @readonly
   */
  this.shapeTransform = new Matrix4();

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
   * @private
   * @type {Object<string, any>}
   * @readonly
   */
  this.shaderUniforms = {
    renderMinBounds: new Cartesian3(),
    renderMaxBounds: new Cartesian3(),
    boxUvToShapeUvScale: new Cartesian3(),
    boxUvToShapeUvTranslate: new Cartesian3(),
  };

  /**
   * @private
   * @type {Object<string, any>}
   * @readonly
   */
  this.shaderDefines = {
    BOX_INTERSECTION_INDEX: undefined,
    BOX_HAS_SHAPE_BOUNDS: undefined,
  };

  /**
   * The maximum number of intersections against the shape for any ray direction.
   * @private
   * @type {number}
   * @readonly
   */
  this.shaderMaximumIntersectionsLength = 0; // not known until update
}

const scratchCenter = new Cartesian3();
const scratchScale = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchClipMinBounds = new Cartesian3();
const scratchClipMaxBounds = new Cartesian3();
const scratchRenderMinBounds = new Cartesian3();
const scratchRenderMaxBounds = new Cartesian3();

const transformLocalToUv = Matrix4.fromRotationTranslation(
  Matrix3.fromUniformScale(0.5, new Matrix3()),
  new Cartesian3(0.5, 0.5, 0.5),
  new Matrix4(),
);

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
    scratchRenderMinBounds,
  );
  const renderMaxBounds = Cartesian3.clamp(
    maxBounds,
    clipMinBounds,
    clipMaxBounds,
    scratchRenderMaxBounds,
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

  this.shapeTransform = Matrix4.clone(modelMatrix, this.shapeTransform);

  this.orientedBoundingBox = getBoxChunkObb(
    renderMinBounds,
    renderMaxBounds,
    this.shapeTransform,
    this.orientedBoundingBox,
  );

  // All of the box bounds go from -1 to +1, so the model matrix scale can be
  // used as the oriented bounding box half axes.
  this.boundTransform = Matrix4.fromRotationTranslation(
    this.orientedBoundingBox.halfAxes,
    this.orientedBoundingBox.center,
    this.boundTransform,
  );

  this.boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this.orientedBoundingBox,
    this.boundingSphere,
  );

  const { shaderUniforms, shaderDefines } = this;

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

  shaderUniforms.renderMinBounds = Matrix4.multiplyByPoint(
    transformLocalToUv,
    renderMinBounds,
    shaderUniforms.renderMinBounds,
  );
  shaderUniforms.renderMaxBounds = Matrix4.multiplyByPoint(
    transformLocalToUv,
    renderMaxBounds,
    shaderUniforms.renderMaxBounds,
  );

  shaderDefines["BOX_HAS_SHAPE_BOUNDS"] = true;

  const min = minBounds;
  const max = maxBounds;

  // Go from UV space to bounded UV space:
  // delerp(posUv, minBoundsUv, maxBoundsUv)
  // (posUv - minBoundsUv) / (maxBoundsUv - minBoundsUv)
  // posUv / (maxBoundsUv - minBoundsUv) - minBoundsUv / (maxBoundsUv - minBoundsUv)
  // scale = 1.0 / (maxBoundsUv - minBoundsUv)
  // scale = 1.0 / ((maxBounds * 0.5 + 0.5) - (minBounds * 0.5 + 0.5))
  // scale = 2.0 / (maxBounds - minBounds)
  // offset = -minBoundsUv / ((maxBounds * 0.5 + 0.5) - (minBounds * 0.5 + 0.5))
  // offset = -2.0 * (minBounds * 0.5 + 0.5) / (maxBounds - minBounds)
  // offset = -scale * (minBounds * 0.5 + 0.5)
  shaderUniforms.boxUvToShapeUvScale = Cartesian3.fromElements(
    2.0 / (min.x === max.x ? 1.0 : max.x - min.x),
    2.0 / (min.y === max.y ? 1.0 : max.y - min.y),
    2.0 / (min.z === max.z ? 1.0 : max.z - min.z),
    shaderUniforms.boxUvToShapeUvScale,
  );

  shaderUniforms.boxUvToShapeUvTranslate = Cartesian3.fromElements(
    -shaderUniforms.boxUvToShapeUvScale.x * (min.x * 0.5 + 0.5),
    -shaderUniforms.boxUvToShapeUvScale.y * (min.y * 0.5 + 0.5),
    -shaderUniforms.boxUvToShapeUvScale.z * (min.z * 0.5 + 0.5),
    shaderUniforms.boxUvToShapeUvTranslate,
  );

  this.shaderMaximumIntersectionsLength = intersectionCount;

  return true;
};

const scratchTileMinBounds = new Cartesian3();
const scratchTileMaxBounds = new Cartesian3();

/**
 * Computes an oriented bounding box for a specified tile.
 * The update function must be called before calling this function.
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
    this.shapeTransform,
    result,
  );
};

const sampleSizeScratch = new Cartesian3();

/**
 * Computes an oriented bounding box for a specified sample within a specified tile.
 * The update function must be called before calling this function.
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
    this.shapeTransform,
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
    let scale = Matrix4.getScale(matrix, scratchScale);
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
      scratchScale,
    );
    const rotation = Matrix4.getRotation(matrix, scratchRotation);
    result.halfAxes = Matrix3.setScale(rotation, scale, result.halfAxes);
  }

  return result;
}

export default VoxelBoxShape;
