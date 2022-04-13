import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";

/**
 * A cylinder {@link VoxelShape}.
 *
 * @alias VoxelCylinderShape
 * @constructor
 *
 * @see VoxelShape
 * @see VoxelBoxShape
 * @see VoxelEllipsoidShape
 * @see VoxelShapeType
 *
 * @private
 */
function VoxelCylinderShape() {
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
   * @type {Number}
   * @private
   */
  this._minimumRadius = VoxelCylinderShape.DefaultMinBounds.x;

  /**
   * @type {Number}
   * @private
   */
  this._maximumRadius = VoxelCylinderShape.DefaultMaxBounds.x;

  /**
   * @type {Number}
   * @private
   */
  this._minimumHeight = VoxelCylinderShape.DefaultMinBounds.y;

  /**
   * @type {Number}
   * @private
   */
  this._maximumHeight = VoxelCylinderShape.DefaultMaxBounds.y;

  /**
   * @type {Number}
   * @private
   */
  this._minimumAngle = VoxelCylinderShape.DefaultMinBounds.z;

  /**
   * @type {Number}
   * @private
   */
  this._maximumAngle = VoxelCylinderShape.DefaultMaxBounds.z;

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderUniforms = {
    cylinderInnerRadiusUv: 0.0,
    cylinderMinAngleUv: 0.0,
    cylinderInverseAngleUv: 0.0,
  };

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderDefines = {
    CYLINDER_INTERSECTION_COUNT: undefined,
    CYLINDER_INNER: undefined,
    CYLINDER_OUTER: undefined,
    CYLINDER_INNER_OUTER_EQUAL: undefined,
    CYLINDER_WEDGE_REGULAR: undefined,
    CYLINDER_WEDGE_FLIPPED: undefined,
  };
}

const scratchTestAngles = new Array(6);

// Preallocated arrays for all of the possible test angle counts
const scratchPositions = [
  new Array(),
  new Array(
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3()
  ),
  new Array(
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3()
  ),
  new Array(
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3()
  ),
  new Array(
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3()
  ),
  new Array(
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3()
  ),
  new Array(
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3(),
    new Cartesian3()
  ),
];

const scratchScale = new Cartesian3();

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 */
VoxelCylinderShape.prototype.update = function (
  modelMatrix,
  minBounds,
  maxBounds
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  const scale = Matrix4.getScale(modelMatrix, scratchScale);
  const defaultMinBounds = VoxelCylinderShape.DefaultMinBounds;
  const defaultMaxBounds = VoxelCylinderShape.DefaultMaxBounds;

  // Clamp the radii to the valid range
  const minRadius = CesiumMath.clamp(
    minBounds.x,
    defaultMinBounds.x,
    defaultMaxBounds.x
  );
  const maxRadius = CesiumMath.clamp(
    maxBounds.x,
    defaultMinBounds.x,
    defaultMaxBounds.x
  );

  // Clamp the heights to the valid range
  const minHeight = CesiumMath.clamp(
    minBounds.y,
    defaultMinBounds.y,
    defaultMaxBounds.y
  );
  const maxHeight = CesiumMath.clamp(
    maxBounds.y,
    defaultMinBounds.y,
    defaultMaxBounds.y
  );

  // Clamp the angles to the valid range
  const minAngle = CesiumMath.negativePiToPi(minBounds.z);
  const maxAngle = CesiumMath.negativePiToPi(maxBounds.z);

  const outerExtent = Cartesian3.fromElements(
    scale.x * maxRadius,
    scale.y * maxRadius,
    scale.z * 0.5 * (maxHeight - minHeight)
  );

  // Exit early if the shape is not visible.
  // Note that minAngle may be greater than maxAngle when crossing the 180th meridian.
  const absEpsilon = CesiumMath.EPSILON10;
  if (
    minRadius > maxRadius ||
    minHeight > maxHeight ||
    CesiumMath.equalsEpsilon(outerExtent.x, 0.0, undefined, absEpsilon) ||
    CesiumMath.equalsEpsilon(outerExtent.y, 0.0, undefined, absEpsilon) ||
    CesiumMath.equalsEpsilon(outerExtent.z, 0.0, undefined, absEpsilon)
  ) {
    return false;
  }

  this._minimumRadius = minRadius; // [0,1]
  this._maximumRadius = maxRadius; // [0,1]
  this._minimumHeight = minHeight; // [-1,+1]
  this._maximumHeight = maxHeight; // [-1,+1]
  this._minimumAngle = minAngle; // [-halfPi,+halfPi]
  this._maximumAngle = maxAngle; // [-halfPi,+halfPi]

  this.shapeTransform = Matrix4.clone(modelMatrix, this.shapeTransform);

  this.orientedBoundingBox = getCylinderChunkObb(
    minRadius,
    maxRadius,
    minHeight,
    maxHeight,
    minAngle,
    maxAngle,
    this.shapeTransform,
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

  const shaderUniforms = this.shaderUniforms;
  const shaderDefines = this.shaderDefines;

  // To keep things simple, clear the defines every time
  shaderDefines["CYLINDER_INTERSECTION_COUNT"] = undefined;
  shaderDefines["CYLINDER_INNER"] = undefined;
  shaderDefines["CYLINDER_OUTER"] = undefined;
  shaderDefines["CYLINDER_INNER_OUTER_EQUAL"] = undefined;
  shaderDefines["CYLINDER_WEDGE_REGULAR"] = undefined;
  shaderDefines["CYLINDER_WEDGE_FLIPPED"] = undefined;

  return true;
};

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
VoxelCylinderShape.prototype.computeOrientedBoundingBoxForTile = function (
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

  const rootTransform = this.shapeTransform;
  const minimumRadius = this._minimumRadius;
  const maximumRadius = this._maximumRadius;
  const minimumHeight = this._minimumHeight;
  const maximumHeight = this._maximumHeight;
  const minimumAngle = this._minimumAngle;
  const maximumAngle = this._maximumAngle;

  const sizeAtLevel = 1.0 / Math.pow(2.0, tileLevel);

  const radiusStart = CesiumMath.lerp(
    minimumRadius,
    maximumRadius,
    tileX * sizeAtLevel
  );
  const radiusEnd = CesiumMath.lerp(
    minimumRadius,
    maximumRadius,
    (tileX + 1) * sizeAtLevel
  );
  const heightStart = CesiumMath.lerp(
    minimumHeight,
    maximumHeight,
    tileY * sizeAtLevel
  );
  const heightEnd = CesiumMath.lerp(
    minimumHeight,
    maximumHeight,
    (tileY + 1) * sizeAtLevel
  );
  const angleStart = CesiumMath.lerp(
    minimumAngle,
    maximumAngle,
    tileZ * sizeAtLevel
  );
  const angleEnd = CesiumMath.lerp(
    minimumAngle,
    maximumAngle,
    (tileZ + 1) * sizeAtLevel
  );

  return getCylinderChunkObb(
    radiusStart,
    radiusEnd,
    heightStart,
    heightEnd,
    angleStart,
    angleEnd,
    rootTransform,
    result
  );
};

const scratchOrientedBoundingBox = new OrientedBoundingBox();
const scratchVoxelScale = new Cartesian3();
const scratchRootScale = new Cartesian3();
const scratchScaleRatio = new Cartesian3();

/**
 * Computes an approximate step size for raymarching the root tile of a voxel grid.
 * The update function must be called before calling this function.
 *
 * @param {Cartesian3} dimensions The voxel grid dimensions for a tile.
 * @returns {Number} The step size.
 */
VoxelCylinderShape.prototype.computeApproximateStepSize = function (
  dimensions
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("dimensions", dimensions);
  //>>includeEnd('debug');

  const rootTransform = this.shapeTransform;

  const minRadius = this._minimumRadius;
  const maxRadius = this._maximumRadius;
  const minHeight = this._minimumHeight;
  const maxHeight = this._maximumHeight;
  const minAngle = this._minimumAngle;
  const maxAngle = this._maximumAngle;

  const lerpRadius = 1.0 - 1.0 / dimensions.x;
  const lerpHeight = 1.0 - 1.0 / dimensions.y;
  const lerpAngle = 1.0 - 1.0 / dimensions.z;

  // Compare the size of an outermost cylinder voxel to the total cylinder
  const voxelMinimumRadius = CesiumMath.lerp(minRadius, maxRadius, lerpRadius);
  const voxelMinimumHeight = CesiumMath.lerp(minHeight, maxHeight, lerpHeight);
  const voxelMinimumAngle = CesiumMath.lerp(minAngle, maxAngle, lerpAngle);
  const voxelMaximumRadius = maxRadius;
  const voxelMaximumHeight = maxHeight;
  const voxelMaximumAngle = maxAngle;

  const voxelObb = getCylinderChunkObb(
    voxelMinimumRadius,
    voxelMaximumRadius,
    voxelMinimumHeight,
    voxelMaximumHeight,
    voxelMinimumAngle,
    voxelMaximumAngle,
    rootTransform,
    scratchOrientedBoundingBox
  );

  const voxelScale = Matrix3.getScale(voxelObb.halfAxes, scratchVoxelScale);
  const rootScale = Matrix4.getScale(rootTransform, scratchRootScale);
  const scaleRatio = Cartesian3.divideComponents(
    voxelScale,
    rootScale,
    scratchScaleRatio
  );
  const stepSize = Cartesian3.minimumComponent(scaleRatio);
  return stepSize;
};

/**
 * Defines the minimum bounds of the shape. Corresponds to minimum radius, height, angle.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 *
 * @private
 */
VoxelCylinderShape.DefaultMinBounds = new Cartesian3(0.0, -1.0, -CesiumMath.PI);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum radius, height, angle.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 *
 * @private
 */
VoxelCylinderShape.DefaultMaxBounds = new Cartesian3(1.0, +1.0, +CesiumMath.PI);

/**
 * Computes an {@link OrientedBoundingBox} for a subregion of the shape.
 *
 * @function
 *
 * @param {Number} radiusStart The radiusStart.
 * @param {Number} radiusEnd The radiusEnd.
 * @param {Number} heightStart The heightStart.
 * @param {Number} heightEnd The heightEnd.
 * @param {Number} angleStart The angleStart.
 * @param {Number} angleEnd The angleEnd.
 * @param {Matrix4} matrix The matrix to transform the points.
 * @param {OrientedBoundingBox} result The object onto which to store the result.
 * @returns {OrientedBoundingBox} The oriented bounding box that contains this subregion.
 *
 * @private
 */
function getCylinderChunkObb(
  radiusStart,
  radiusEnd,
  heightStart,
  heightEnd,
  angleStart,
  angleEnd,
  matrix,
  result
) {
  const defaultMinBounds = VoxelCylinderShape.DefaultMinBounds;
  const defaultMaxBounds = VoxelCylinderShape.DefaultMaxBounds;
  const defaultMinRadius = defaultMinBounds.x; // 0
  const defaultMaxRadius = defaultMaxBounds.x; // 1
  const defaultMinHeight = defaultMinBounds.y; // -1
  const defaultMaxHeight = defaultMaxBounds.y; // +1
  const defaultMinAngle = defaultMinBounds.z; // -pi/2
  const defaultMaxAngle = defaultMaxBounds.z; // +pi/2

  // Return early if using the default bounds
  if (
    radiusStart === defaultMinRadius &&
    radiusEnd === defaultMaxRadius &&
    heightStart === defaultMinHeight &&
    heightEnd === defaultMaxHeight &&
    angleStart === defaultMinAngle &&
    angleEnd === defaultMaxAngle
  ) {
    result.center = Matrix4.getTranslation(matrix, result.center);
    result.halfAxes = Matrix4.getMatrix3(matrix, result.halfAxes);
    return result;
  }

  let testAngleCount = 0;
  const testAngles = scratchTestAngles;
  const halfPi = CesiumMath.PI_OVER_TWO;

  testAngles[testAngleCount++] = angleStart;
  testAngles[testAngleCount++] = angleEnd;

  if (angleStart > angleEnd) {
    if (angleStart > 0.0 && angleEnd > 0.0) {
      testAngles[testAngleCount++] = 0.0;
    }
    if (angleStart > +halfPi && angleEnd > +halfPi) {
      testAngles[testAngleCount++] = +halfPi;
    }
    if (angleStart > -halfPi && angleEnd > -halfPi) {
      testAngles[testAngleCount++] = -halfPi;
    }
    // It will always cross the 180th meridian
    testAngles[testAngleCount++] = CesiumMath.PI;
  } else {
    if (angleStart < 0.0 && angleEnd > 0.0) {
      testAngles[testAngleCount++] = 0.0;
    }
    if (angleStart < +halfPi && angleEnd > +halfPi) {
      testAngles[testAngleCount++] = +halfPi;
    }
    if (angleStart < -halfPi && angleEnd > -halfPi) {
      testAngles[testAngleCount++] = -halfPi;
    }
  }

  const positions = scratchPositions[testAngleCount];

  for (let i = 0; i < testAngleCount; i++) {
    const angle = testAngles[i];
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    positions[i * 4 + 0] = Cartesian3.fromElements(
      cosAngle * radiusStart,
      sinAngle * radiusStart,
      heightStart,
      positions[i * 4 + 0]
    );
    positions[i * 4 + 1] = Cartesian3.fromElements(
      cosAngle * radiusEnd,
      sinAngle * radiusEnd,
      heightStart,
      positions[i * 4 + 1]
    );
    positions[i * 4 + 2] = Cartesian3.fromElements(
      cosAngle * radiusStart,
      sinAngle * radiusStart,
      heightEnd,
      positions[i * 4 + 2]
    );
    positions[i * 4 + 3] = Cartesian3.fromElements(
      cosAngle * radiusEnd,
      sinAngle * radiusEnd,
      heightEnd,
      positions[i * 4 + 3]
    );
  }

  for (let i = 0; i < testAngleCount * 4; i++) {
    positions[i] = Matrix4.multiplyByPoint(matrix, positions[i], positions[i]);
  }

  return OrientedBoundingBox.fromPoints(positions, result);
}

export default VoxelCylinderShape;
