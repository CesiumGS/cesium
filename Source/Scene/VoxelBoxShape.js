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
   * @type {OrientedBoundingBox}
   * @readonly
   */
  this.orientedBoundingBox = new OrientedBoundingBox();

  /**
   * A bounding sphere containing the bounded shape.
   * The update function must be called before accessing this value.
   * @type {BoundingSphere}
   * @readonly
   */
  this.boundingSphere = new BoundingSphere();

  /**
   * A transformation matrix containing the bounded shape.
   * The update function must be called before accessing this value.
   * @type {Matrix4}
   * @readonly
   */
  this.boundTransform = new Matrix4();

  /**
   * A transformation matrix containing the shape, ignoring the bounds.
   * The update function must be called before accessing this value.
   * @type {Matrix4}
   * @readonly
   */
  this.shapeTransform = new Matrix4();

  /**
   * @type {Cartesian3}
   * @private
   */
  this._minBounds = Cartesian3.clone(
    VoxelBoxShape.DefaultMinBounds,
    new Cartesian3()
  );

  /**
   * @type {Cartesian3}
   * @private
   */
  this._maxBounds = Cartesian3.clone(
    VoxelBoxShape.DefaultMaxBounds,
    new Cartesian3()
  );

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderUniforms = {
    boxScaleUvToBoundsUv: new Cartesian3(),
    boxTranslateUvToBoundsUv: new Cartesian3(),
    boxScaleUvToBounds: new Cartesian3(),
    boxTranslateUvToBounds: new Cartesian3(),
    boxTransformUvToBounds: new Matrix4(),
  };

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderDefines = {
    BOX_INTERSECTION_COUNT: 1, // never changes
    BOX_INTERSECTION_INDEX: 0, // never changes
    BOX_BOUNDED: undefined,
    BOX_XY_PLANE: undefined,
    BOX_XZ_PLANE: undefined,
    BOX_YZ_PLANE: undefined,
  };
}

const scratchTranslation = new Cartesian3();
const scratchScale = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchTransformLocalToBounds = new Matrix4();
const scratchBoundsTranslation = new Cartesian3();
const scratchBoundsScale = new Cartesian3();

const transformUvToLocal = Matrix4.fromRotationTranslation(
  Matrix3.fromUniformScale(2.0, new Matrix3()),
  new Cartesian3(-1.0, -1.0, -1.0),
  new Matrix4()
);

const transformXYZToZYX = Matrix4.fromRotation(
  Matrix3.fromColumnMajorArray(
    [0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0],
    new Matrix3()
  ),
  new Matrix4()
);

const transformXYZToXZY = Matrix4.fromRotation(
  Matrix3.fromColumnMajorArray(
    [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0],
    new Matrix3()
  ),
  new Matrix4()
);

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 * @returns {Boolean} Whether the shape is visible.
 */
VoxelBoxShape.prototype.update = function (modelMatrix, minBounds, maxBounds) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  const defaultMinBounds = VoxelBoxShape.DefaultMinBounds;
  const defaultMaxBounds = VoxelBoxShape.DefaultMaxBounds;

  minBounds = this._minBounds = Cartesian3.clamp(
    minBounds,
    defaultMinBounds,
    defaultMaxBounds,
    this._minBounds
  );

  maxBounds = this._maxBounds = Cartesian3.clamp(
    maxBounds,
    defaultMinBounds,
    defaultMaxBounds,
    this._maxBounds
  );

  const scale = Matrix4.getScale(modelMatrix, scratchScale);

  // Box is not visible if:
  // - any of the min bounds exceed the max bounds
  // - two or more of the min bounds equal the max bounds (line / point)
  // - scale is 0 for any component (too annoying to reconstruct rotation matrix)
  if (
    minBounds.x > maxBounds.x ||
    minBounds.y > maxBounds.y ||
    minBounds.z > maxBounds.z ||
    (minBounds.x === maxBounds.x) +
      (minBounds.y === maxBounds.y) +
      (minBounds.z === maxBounds.z) >=
      2 ||
    scale.x === 0.0 ||
    scale.y === 0.0 ||
    scale.z === 0.0
  ) {
    return false;
  }

  this.shapeTransform = Matrix4.clone(modelMatrix, this.shapeTransform);

  this.orientedBoundingBox = getBoxChunkObb(
    this._minBounds,
    this._maxBounds,
    this.shapeTransform,
    this.orientedBoundingBox
  );

  // All of the box bounds go from -1 to +1, so the model matrix scale can be
  // used as the oriented bounding box half axes.
  this.boundTransform = Matrix4.fromRotationTranslation(
    this.orientedBoundingBox.halfAxes,
    this.orientedBoundingBox.center,
    this.boundTransform
  );

  this.boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this.orientedBoundingBox,
    this.boundingSphere
  );

  const shaderUniforms = this.shaderUniforms;
  const shaderDefines = this.shaderDefines;

  // To keep things simple, clear the defines every time
  shaderDefines["BOX_BOUNDED"] = undefined;
  shaderDefines["BOX_XY_PLANE"] = undefined;
  shaderDefines["BOX_XZ_PLANE"] = undefined;
  shaderDefines["BOX_YZ_PLANE"] = undefined;

  if (
    minBounds.x !== defaultMinBounds.x ||
    minBounds.y !== defaultMinBounds.y ||
    minBounds.z !== defaultMinBounds.z ||
    maxBounds.x !== defaultMaxBounds.x ||
    maxBounds.y !== defaultMaxBounds.y ||
    maxBounds.z !== defaultMaxBounds.z
  ) {
    shaderDefines["BOX_BOUNDED"] = true;

    // inverse(scale)
    // inverse(maxBoundsUv - minBoundsUv)
    // inverse((maxBounds * 0.5 + 0.5) - (minBounds * 0.5 + 0.5))
    // inverse(0.5 * (maxBounds - minBounds))
    // 2.0 / (maxBounds - minBounds) // with divide by zero protection
    const boundsScaleLocalToBounds = Cartesian3.fromElements(
      2.0 / (minBounds.x === maxBounds.x ? 1.0 : maxBounds.x - minBounds.x),
      2.0 / (minBounds.y === maxBounds.y ? 1.0 : maxBounds.y - minBounds.y),
      2.0 / (minBounds.z === maxBounds.z ? 1.0 : maxBounds.z - minBounds.z),
      scratchBoundsScale
    );

    // -inverse(scale) * translation // affine inverse
    // -inverse(scale) * 0.5 * (minBounds + maxBounds)
    const boundsTranslateLocalToBounds = Cartesian3.fromElements(
      -boundsScaleLocalToBounds.x * 0.5 * (minBounds.x + maxBounds.x),
      -boundsScaleLocalToBounds.y * 0.5 * (minBounds.y + maxBounds.y),
      -boundsScaleLocalToBounds.z * 0.5 * (minBounds.z + maxBounds.z),
      scratchBoundsTranslation
    );

    let transformLocalToBounds = Matrix4.fromRotationTranslation(
      Matrix3.fromScale(boundsScaleLocalToBounds),
      boundsTranslateLocalToBounds,
      scratchTransformLocalToBounds
    );

    if (
      minBounds.x === maxBounds.x ||
      minBounds.y === maxBounds.y ||
      minBounds.z === maxBounds.z
    ) {
      let transformAxisConversion;
      if (minBounds.x === maxBounds.x) {
        shaderDefines["BOX_YZ_PLANE"] = true;
        transformAxisConversion = transformXYZToZYX;
      } else if (minBounds.y === maxBounds.y) {
        shaderDefines["BOX_XZ_PLANE"] = true;
        transformAxisConversion = transformXYZToXZY;
      } else if (minBounds.z === maxBounds.z) {
        shaderDefines["BOX_XY_PLANE"] = true;
        transformAxisConversion = Matrix4.IDENTITY;
      }
      transformLocalToBounds = Matrix4.multiply(
        transformAxisConversion,
        transformLocalToBounds,
        transformLocalToBounds
      );
    }

    shaderUniforms.boxTransformUvToBounds = Matrix4.multiplyTransformation(
      transformLocalToBounds,
      transformUvToLocal,
      shaderUniforms.boxTransformUvToBounds
    );
    shaderUniforms.boxScaleUvToBounds = Matrix4.getScale(
      shaderUniforms.boxTransformUvToBounds,
      shaderUniforms.boxScaleUvToBounds
    );
    shaderUniforms.boxTranslateUvToBounds = Matrix4.getTranslation(
      shaderUniforms.boxTransformUvToBounds,
      shaderUniforms.boxTranslateUvToBounds
    );

    // Go from UV space to bounded UV space:
    // delerp(posUv, minBoundsUv, maxBoundsUv)
    // (posUv - minBoundsUv) / (maxBoundsUv - minBoundsUv)
    // posUv / (maxBoundsUv - minBoundsUv) - minBoundsUv / (maxBoundsUv - minBoundsUv)
    // scale = 1.0 / (maxBoundsUv - minBoundsUv)
    // scale = 1.0 / ((maxBounds * 0.5 + 0.5) - (minBounds * 0.5 + 0.5))
    // scale = 2.0 / (maxBounds - minBounds)
    // translation = -minBoundsUv / ((maxBounds * 0.5 + 0.5) - (minBounds * 0.5 + 0.5))
    // translation = -2.0 * (minBounds * 0.5 + 0.5) / (maxBounds - minBounds)
    // translation = -scale * (minBounds * 0.5 + 0.5)
    shaderUniforms.boxScaleUvToBoundsUv = Cartesian3.clone(
      boundsScaleLocalToBounds,
      shaderUniforms.boxScaleUvToBoundsUv
    );
    shaderUniforms.boxTranslateUvToBoundsUv = Cartesian3.fromElements(
      -boundsScaleLocalToBounds.x * (minBounds.x * 0.5 + 0.5),
      -boundsScaleLocalToBounds.y * (minBounds.y * 0.5 + 0.5),
      -boundsScaleLocalToBounds.z * (minBounds.z * 0.5 + 0.5),
      shaderUniforms.boxTranslateUvToBoundsUv
    );
  }

  return true;
};

const scratchTileMinBounds = new Cartesian3();
const scratchTileMaxBounds = new Cartesian3();

/**
 * Computes an oriented bounding box for a specified tile.
 * The update function must be called before calling this function.
 *
 * @param {Number} tileLevel The tile's level.
 * @param {Number} tileX The tile's x coordinate.
 * @param {Number} tileY The tile's y coordinate.
 * @param {Number} tileZ The tile's z coordinate.
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified tile
 * @returns {OrientedBoundingBox} The oriented bounding box.
 */
VoxelBoxShape.prototype.computeOrientedBoundingBoxForTile = function (
  tileLevel,
  tileX,
  tileY,
  tileZ,
  result
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
    scratchTileMinBounds
  );

  const tileMaxBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, sizeAtLevel * (tileX + 1)),
    CesiumMath.lerp(minBounds.y, maxBounds.y, sizeAtLevel * (tileY + 1)),
    CesiumMath.lerp(minBounds.z, maxBounds.z, sizeAtLevel * (tileZ + 1)),
    scratchTileMaxBounds
  );

  return getBoxChunkObb(
    tileMinBounds,
    tileMaxBounds,
    this.shapeTransform,
    result
  );
};

/**
 * Computes an approximate step size for raymarching the root tile of a voxel grid.
 * The update function must be called before calling this function.
 *
 * @param {Cartesian3} dimensions The voxel grid dimensions for a tile.
 * @returns {Number} The step size.
 */
VoxelBoxShape.prototype.computeApproximateStepSize = function (dimensions) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("dimensions", dimensions);
  //>>includeEnd('debug');

  return 1.0 / Cartesian3.maximumComponent(dimensions);
};

/**
 * Defines the minimum bounds of the shape. Corresponds to minimum X, Y, Z.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelBoxShape.DefaultMinBounds = new Cartesian3(-1.0, -1.0, -1.0);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum X, Y, Z.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelBoxShape.DefaultMaxBounds = new Cartesian3(+1.0, +1.0, +1.0);

/**
 * Computes an {@link OrientedBoundingBox} for a subregion of the shape.
 *
 * @function
 *
 * @param {Number} minimumBounds The minimum bounds.
 * @param {Number} maximumBounds The maximum bounds.
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
    const translation = Matrix4.getTranslation(matrix, scratchTranslation);
    result.center = Cartesian3.fromElements(
      translation.x + scale.x * 0.5 * (minimumBounds.x + maximumBounds.x),
      translation.y + scale.y * 0.5 * (maximumBounds.y + minimumBounds.y),
      translation.z + scale.z * 0.5 * (maximumBounds.z + minimumBounds.z),
      result.center
    );
    scale = Cartesian3.fromElements(
      scale.x * 0.5 * (maximumBounds.x - minimumBounds.x),
      scale.y * 0.5 * (maximumBounds.y - minimumBounds.y),
      scale.z * 0.5 * (maximumBounds.z - minimumBounds.z),
      scratchScale
    );
    const rotation = Matrix4.getRotation(matrix, scratchRotation);
    result.halfAxes = Matrix3.setScale(rotation, scale, result.halfAxes);
  }

  return result;
}

export default VoxelBoxShape;
