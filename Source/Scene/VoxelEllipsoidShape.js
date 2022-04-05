import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Rectangle from "../Core/Rectangle.js";

/**
 * An ellipsoid {@link VoxelShape}.
 *
 * @alias VoxelEllipsoidShape
 * @constructor
 *
 * @see VoxelShape
 * @see VoxelBoxShape
 * @see VoxelCylinderShape
 * @see VoxelShapeType
 *
 * @private
 */
function VoxelEllipsoidShape() {
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
   * Check if the shape is visible. For example, if the shape has zero scale it will be invisible.
   * The update function must be called before accessing this value.
   * @type {Boolean}
   * @readonly
   */
  this.isVisible = false;

  /**
   * @type {Rectangle}
   */
  this._rectangle = new Rectangle();

  /**
   * @type {Number}
   * @private
   */
  this._minimumHeight = VoxelEllipsoidShape.DefaultMinBounds.z;

  /**
   * @type {Number}
   * @private
   */
  this._maximumHeight = VoxelEllipsoidShape.DefaultMaxBounds.z;

  /**
   * @type {Ellipsoid}
   * @private
   */
  this._ellipsoid = new Ellipsoid();

  /**
   * @type {Cartesian3}
   */
  this._translation = new Cartesian3();

  /**
   * @type {Matrix3
   */
  this._rotation = new Matrix3();
}

/**
 * @type {Cartesian3}
 * @private
 */
VoxelEllipsoidShape.DefaultMinBounds = new Cartesian3(
  -CesiumMath.PI,
  -CesiumMath.PI_OVER_TWO,
  0.0
);

/**
 * @type {Cartesian3}
 * @private
 */
VoxelEllipsoidShape.DefaultMaxBounds = new Cartesian3(
  +CesiumMath.PI,
  +CesiumMath.PI_OVER_TWO,
  1.0
);

const scratchScale = new Cartesian3();
const scratchFullScale = new Cartesian3();
const scratchRotationScale = new Matrix3();

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 */
VoxelEllipsoidShape.prototype.update = function (
  modelMatrix,
  minBounds,
  maxBounds
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  // Don't let the scale be 0, it will screw up a bunch of math
  const scaleEps = CesiumMath.EPSILON8;
  const scale = Matrix4.getScale(modelMatrix, scratchScale);
  if (Math.abs(scale.x) < scaleEps) {
    scale.x = CesiumMath.signNotZero(scale.x) * scaleEps;
  }
  if (Math.abs(scale.y) < scaleEps) {
    scale.y = CesiumMath.signNotZero(scale.y) * scaleEps;
  }
  if (Math.abs(scale.z) < scaleEps) {
    scale.z = CesiumMath.signNotZero(scale.z) * scaleEps;
  }

  this._rectangle = Rectangle.fromRadians(
    minBounds.x,
    minBounds.y,
    maxBounds.x,
    maxBounds.y
  );

  const minHeight = minBounds.z;
  const maxHeight = maxBounds.z;

  // Exit early if the bounds make the shape invisible.
  // Note that west may be greater than east when crossing the 180th meridian.
  const rectangle = this._rectangle;
  if (rectangle.south > rectangle.north || minHeight > maxHeight) {
    this.isVisible = false;
    return;
  }

  this._translation = Matrix4.getTranslation(modelMatrix, this._translation);
  this._rotation = Matrix4.getRotation(modelMatrix, this._rotation);
  this._ellipsoid = Ellipsoid.fromCartesian3(scale, this._ellipsoid);

  const fullScale = Cartesian3.add(
    scale,
    Cartesian3.fromElements(maxHeight, maxHeight, maxHeight, scratchFullScale),
    scratchFullScale
  );
  const rotationScale = Matrix3.setScale(
    this._rotation,
    fullScale,
    scratchRotationScale
  );
  this.shapeTransform = Matrix4.fromRotationTranslation(
    rotationScale,
    this._translation,
    this.shapeTransform
  );

  this.orientedBoundingBox = getEllipsoidChunkObb(
    rectangle.west,
    rectangle.east,
    rectangle.south,
    rectangle.north,
    minHeight,
    maxHeight,
    this._ellipsoid,
    this._translation,
    this._rotation,
    this.orientedBoundingBox
  );

  this.boundTransform = Matrix4.fromRotationTranslation(
    this.orientedBoundingBox.halfAxes,
    this.orientedBoundingBox.center,
    this.boundTransform
  );

  this.boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this.orientedBoundingBox,
    this.boundingSphere
  );

  this.isVisible = true;
};

const scratchRectangle = new Rectangle();

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
VoxelEllipsoidShape.prototype.computeOrientedBoundingBoxForTile = function (
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

  const sizeAtLevel = 1.0 / Math.pow(2.0, tileLevel);
  const westLerp = tileX * sizeAtLevel;
  const eastLerp = (tileX + 1) * sizeAtLevel;
  const southLerp = tileY * sizeAtLevel;
  const northLerp = (tileY + 1) * sizeAtLevel;
  const minHeightLerp = tileZ * sizeAtLevel;
  const maxHeightLerp = (tileZ + 1) * sizeAtLevel;

  const rectangle = Rectangle.subsection(
    this._rectangle,
    westLerp,
    southLerp,
    eastLerp,
    northLerp,
    scratchRectangle
  );

  const minHeight = CesiumMath.lerp(
    this._minimumHeight,
    this._maximumHeight,
    minHeightLerp
  );

  const maxHeight = CesiumMath.lerp(
    this._minimumHeight,
    this._maximumHeight,
    maxHeightLerp
  );

  return getEllipsoidChunkObb(
    rectangle.west,
    rectangle.east,
    rectangle.south,
    rectangle.north,
    minHeight,
    maxHeight,
    this._ellipsoid,
    this._translation,
    this._rotation,
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
VoxelEllipsoidShape.prototype.computeApproximateStepSize = function (
  dimensions
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("dimensions", dimensions);
  //>>includeEnd('debug');

  const ellipsoid = this._ellipsoid;
  const ellipsoidMaximumRadius = ellipsoid.maximumRadius;
  const minimumHeight = this._minimumHeight;
  const maximumHeight = this._maximumHeight;

  const shellToEllipsoidRatio =
    (maximumHeight - minimumHeight) / (ellipsoidMaximumRadius + maximumHeight);
  const stepSize = (0.5 * shellToEllipsoidRatio) / dimensions.z;
  return stepSize;
};

/**
 * Defines the minimum bounds of the shape. Corresponds to minimum longitude, latitude, height.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelEllipsoidShape.DefaultMinBounds = new Cartesian3(
  -CesiumMath.PI,
  -CesiumMath.PI_OVER_TWO,
  0.0
);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum longitude, latitude, height.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelEllipsoidShape.DefaultMaxBounds = new Cartesian3(
  +CesiumMath.PI,
  +CesiumMath.PI_OVER_TWO,
  1.0
);

/**
 * Computes an {@link OrientedBoundingBox} for a subregion of the shape.
 *
 * @function
 *
 * @param {Number} west The minimumX.
 * @param {Number} east The maximumX.
 * @param {Number} south The minimumY.
 * @param {Number} north The maximumY.
 * @param {Number} minHeight The minimumZ.
 * @param {Number} maxHeight The maximumZ.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @param {Matrix4} matrix The matrix to transform the points.
 * @param {OrientedBoundingBox} result The object onto which to store the result.
 * @returns {OrientedBoundingBox} The oriented bounding box that contains this subregion.
 *
 * @private
 */
function getEllipsoidChunkObb(
  west,
  east,
  south,
  north,
  minHeight,
  maxHeight,
  ellipsoid,
  translation,
  rotation,
  result
) {
  result = OrientedBoundingBox.fromRectangle(
    Rectangle.fromRadians(west, south, east, north, scratchRectangle),
    minHeight,
    maxHeight,
    ellipsoid,
    result
  );
  result.center = Cartesian3.add(result.center, translation, result.center);
  result.halfAxes = Matrix3.multiply(
    result.halfAxes,
    rotation,
    result.halfAxes
  );
  return result;
}

export default VoxelEllipsoidShape;
