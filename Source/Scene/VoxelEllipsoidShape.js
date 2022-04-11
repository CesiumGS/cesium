import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
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

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderUniforms = {
    ellipsoidRectangle: new Cartesian4(),
    ellipsoidRadiiUv: new Cartesian3(),
    ellipsoidInverseRadiiSquaredUv: new Cartesian3(),
    // Wedge uniforms
    ellipsoidWestUv: 0.0,
    ellipsoidInverseLongitudeRangeUv: 0.0,
    // Cone uniforms
    ellipsoidSouthUv: 0.0,
    ellipsoidInverseLatitudeRangeUv: 0.0,
    // Inner ellipsoid uniforms
    ellipsoidInverseHeightDifferenceUv: 0.0,
    ellipsoidInverseInnerScaleUv: 0.0,
    ellipsoidInnerRadiiUv: new Cartesian3(),
  };

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderDefines = {
    ELLIPSOID_WEDGE_REGULAR: undefined,
    ELLIPSOID_WEDGE_FLIPPED: undefined,
    ELLIPSOID_CONE_BOTTOM_REGULAR: undefined,
    ELLIPSOID_CONE_BOTTOM_FLIPPED: undefined,
    ELLIPSOID_CONE_TOP_REGULAR: undefined,
    ELLIPSOID_CONE_TOP_FLIPPED: undefined,
    ELLIPSOID_OUTER: undefined,
    ELLIPSOID_INNER: undefined,
    ELLIPSOID_INTERSECTION_COUNT: undefined,
  };
}

const scratchScale = new Cartesian3();
const scratchRotationScale = new Matrix3();
const scratchOuter = new Cartesian3();
const scratchInner = new Cartesian3();

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 * @returns {Boolean} Whether the shape is visible.
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

  const defaultMinBounds = VoxelEllipsoidShape.DefaultMinBounds;
  const defaultMaxBounds = VoxelEllipsoidShape.DefaultMaxBounds;

  const west = CesiumMath.clamp(
    minBounds.x,
    defaultMinBounds.x,
    defaultMaxBounds.x
  );
  const east = CesiumMath.clamp(
    maxBounds.x,
    defaultMinBounds.x,
    defaultMaxBounds.x
  );
  const south = CesiumMath.clamp(
    minBounds.y,
    defaultMinBounds.y,
    defaultMaxBounds.y
  );
  const north = CesiumMath.clamp(
    maxBounds.y,
    defaultMinBounds.y,
    defaultMaxBounds.y
  );

  // Don't let the height go below the center of the ellipsoid.
  const radii = Matrix4.getScale(modelMatrix, scratchScale);
  const minRadius = Cartesian3.minimumComponent(radii);
  const minHeight = Math.max(minBounds.z, -minRadius);
  const maxHeight = Math.max(maxBounds.z, -minRadius);

  // The closest and farthest a point can be from the center of the ellipsoid.
  const innerExtent = Cartesian3.add(
    radii,
    Cartesian3.fromElements(minHeight, minHeight, minHeight, scratchInner),
    scratchInner
  );
  const outerExtent = Cartesian3.add(
    radii,
    Cartesian3.fromElements(maxHeight, maxHeight, maxHeight, scratchOuter),
    scratchOuter
  );
  const maxExtent = Cartesian3.maximumComponent(outerExtent);

  // Exit early if the shape is not visible.
  // Note that west may be greater than east when crossing the 180th meridian.
  const absEpsilon = CesiumMath.EPSILON10;
  if (
    south > north ||
    minHeight > maxHeight ||
    CesiumMath.equalsEpsilon(outerExtent.x, 0.0, undefined, absEpsilon) ||
    CesiumMath.equalsEpsilon(outerExtent.y, 0.0, undefined, absEpsilon) ||
    CesiumMath.equalsEpsilon(outerExtent.z, 0.0, undefined, absEpsilon)
  ) {
    return false;
  }

  this._rectangle = Rectangle.fromRadians(west, south, east, north);
  this._translation = Matrix4.getTranslation(modelMatrix, this._translation);
  this._rotation = Matrix4.getRotation(modelMatrix, this._rotation);
  this._ellipsoid = Ellipsoid.fromCartesian3(radii, this._ellipsoid);
  this._minimumHeight = minHeight;
  this._maximumHeight = maxHeight;

  this.orientedBoundingBox = getEllipsoidChunkObb(
    this._rectangle,
    this._minimumHeight,
    this._maximumHeight,
    this._ellipsoid,
    this._translation,
    this._rotation,
    this.orientedBoundingBox
  );

  this.shapeTransform = Matrix4.fromRotationTranslation(
    Matrix3.setScale(this._rotation, outerExtent, scratchRotationScale),
    this._translation,
    this.shapeTransform
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

  const shaderUniforms = this.shaderUniforms;
  const shaderDefines = this.shaderDefines;

  shaderUniforms.ellipsoidRectangle = Cartesian4.fromElements(
    west,
    south,
    east,
    north,
    shaderUniforms.ellipsoidRectangle
  );

  // The ellipsoid radii scaled to [0,1]. The max ellipsoid radius will be 1.0 and others will be less.
  shaderUniforms.ellipsoidRadiiUv = Cartesian3.divideByScalar(
    outerExtent,
    maxExtent,
    shaderUniforms.ellipsoidRadiiUv
  );

  // Used to compute geodetic surface normal.
  shaderUniforms.ellipsoidInverseRadiiSquaredUv = Cartesian3.divideComponents(
    Cartesian3.ONE,
    Cartesian3.multiplyComponents(
      shaderUniforms.ellipsoidRadiiUv,
      shaderUniforms.ellipsoidRadiiUv,
      shaderUniforms.ellipsoidInverseRadiiSquaredUv
    ),
    shaderUniforms.ellipsoidInverseRadiiSquaredUv
  );

  const rectangleWidth = Rectangle.computeWidth(this._rectangle);
  const hasInnerEllipsoid = !Cartesian3.equals(innerExtent, Cartesian3.ZERO);
  const hasWedgeRegular =
    rectangleWidth >= CesiumMath.PI && rectangleWidth < CesiumMath.TWO_PI;
  const hasWedgeFlipped = rectangleWidth < CesiumMath.PI;
  const hasTopConeRegular = north >= 0.0 && north < +CesiumMath.PI_OVER_TWO;
  const hasTopConeFlipped = north < 0.0;
  const hasBottomConeRegular = south <= 0.0 && south > -CesiumMath.PI_OVER_TWO;
  const hasBottomConeFlipped = south > 0.0;

  // Determine how many intersections there are going to be.
  let intersectionCount = 0;

  // Intersects an outer ellipsoid for the max height.
  shaderDefines["ELLIPSOID_OUTER"] = intersectionCount * 2;
  intersectionCount += 1;

  // Intersects an inner ellipsoid for the min height.
  if (hasInnerEllipsoid) {
    shaderDefines["ELLIPSOID_INNER"] = intersectionCount * 2;
    intersectionCount += 1;

    // The percent of space that is between the inner and outer ellipsoid.
    const thickness = (maxHeight - minHeight) / maxExtent;
    shaderUniforms.ellipsoidInverseHeightDifferenceUv = 1.0 / thickness;

    // The percent of space that is taken up by the inner ellipsoid.
    const innerScale = 1.0 - thickness;
    shaderUniforms.ellipsoidInverseInnerScaleUv = 1.0 / innerScale;

    // The inner ellipsoid radii scaled to [0,innerScale]. The max inner ellipsoid radius will equal innerScale and others will be less.
    shaderUniforms.ellipsoidInnerRadiiUv = Cartesian3.multiplyByScalar(
      shaderUniforms.ellipsoidRadiiUv,
      innerScale,
      shaderUniforms.ellipsoidInnerRadiiUv
    );
  } else {
    shaderDefines["ELLIPSOID_INNER"] = undefined;
  }

  // Intersects a wedge for the min and max longitude.
  if (hasWedgeRegular) {
    shaderDefines["ELLIPSOID_WEDGE_REGULAR"] = intersectionCount * 2;
    shaderDefines["ELLIPSOID_WEDGE_FLIPPED"] = undefined;
    intersectionCount += 1;
  } else if (hasWedgeFlipped) {
    shaderDefines["ELLIPSOID_WEDGE_REGULAR"] = undefined;
    shaderDefines["ELLIPSOID_WEDGE_FLIPPED"] = intersectionCount * 2;
    intersectionCount += 2;
  } else {
    shaderDefines["ELLIPSOID_WEDGE_REGULAR"] = undefined;
    shaderDefines["ELLIPSOID_WEDGE_FLIPPED"] = undefined;
  }

  // Intersects a cone for min latitude
  if (hasBottomConeRegular) {
    shaderDefines["ELLIPSOID_CONE_BOTTOM_REGULAR"] = intersectionCount * 2;
    shaderDefines["ELLIPSOID_CONE_BOTTOM_FLIPPED"] = undefined;
    intersectionCount += 1;
  } else if (hasBottomConeFlipped) {
    shaderDefines["ELLIPSOID_CONE_BOTTOM_REGULAR"] = undefined;
    shaderDefines["ELLIPSOID_CONE_BOTTOM_FLIPPED"] = intersectionCount * 2;
    intersectionCount += 2;
  } else {
    shaderDefines["ELLIPSOID_CONE_BOTTOM_REGULAR"] = undefined;
    shaderDefines["ELLIPSOID_CONE_BOTTOM_FLIPPED"] = undefined;
  }

  // Intersects a cone for max latitude
  if (hasTopConeRegular) {
    shaderDefines["ELLIPSOID_CONE_TOP_REGULAR"] = intersectionCount * 2;
    shaderDefines["ELLIPSOID_CONE_TOP_FLIPPED"] = undefined;
    intersectionCount += 1;
  } else if (hasTopConeFlipped) {
    shaderDefines["ELLIPSOID_CONE_TOP_REGULAR"] = undefined;
    shaderDefines["ELLIPSOID_CONE_TOP_FLIPPED"] = intersectionCount * 2;
    intersectionCount += 2;
  } else {
    shaderDefines["ELLIPSOID_CONE_TOP_REGULAR"] = undefined;
    shaderDefines["ELLIPSOID_CONE_TOP_FLIPPED"] = undefined;
  }

  shaderDefines["ELLIPSOID_INTERSECTION_COUNT"] = intersectionCount;

  return true;
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
    rectangle,
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
 * Computes an {@link OrientedBoundingBox} for a subregion of the shape.
 *
 * @function
 *
 * @param {Rectangle} rectangle The rectangle.
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
  rectangle,
  minHeight,
  maxHeight,
  ellipsoid,
  translation,
  rotation,
  result
) {
  result = OrientedBoundingBox.fromRectangle(
    rectangle,
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
  -Number.MAX_VALUE
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
  +Number.MAX_VALUE
);

export default VoxelEllipsoidShape;
