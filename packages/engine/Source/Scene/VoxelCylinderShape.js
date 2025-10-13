import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import ClippingPlane from "./ClippingPlane.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import VoxelBoundsCollection from "./VoxelBoundsCollection.js";

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
  this._orientedBoundingBox = new OrientedBoundingBox();
  this._boundingSphere = new BoundingSphere();
  this._boundTransform = new Matrix4();
  this._shapeTransform = new Matrix4();

  /**
   * The minimum bounds of the shape, corresponding to minimum radius, angle, and height.
   * @type {Cartesian3}
   * @private
   */
  this._minBounds = VoxelCylinderShape.DefaultMinBounds.clone();

  /**
   * The maximum bounds of the shape, corresponding to maximum radius, angle, and height.
   * @type {Cartesian3}
   * @private
   */
  this._maxBounds = VoxelCylinderShape.DefaultMaxBounds.clone();

  const { DefaultMinBounds, DefaultMaxBounds } = VoxelCylinderShape;
  const boundPlanes = [
    new ClippingPlane(
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      DefaultMinBounds.z,
    ),
    new ClippingPlane(Cartesian3.UNIT_Z, -DefaultMaxBounds.z),
  ];

  this._renderBoundPlanes = new VoxelBoundsCollection({ planes: boundPlanes });

  this._shaderUniforms = {
    cameraShapePosition: new Cartesian3(),
    cylinderEcToRadialTangentUp: new Matrix3(),
    cylinderRenderRadiusMinMax: new Cartesian2(),
    cylinderRenderAngleMinMax: new Cartesian2(),
    cylinderLocalToShapeUvRadius: new Cartesian2(),
    cylinderLocalToShapeUvAngle: new Cartesian2(),
    cylinderLocalToShapeUvHeight: new Cartesian2(),
    cylinderShapeUvAngleRangeOrigin: 0.0,
  };

  this._shaderDefines = {
    CYLINDER_HAS_SHAPE_BOUNDS_ANGLE: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_ANGLE: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_ZERO: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF: undefined,
    CYLINDER_INTERSECTION_INDEX_RADIUS_MAX: undefined,
    CYLINDER_INTERSECTION_INDEX_RADIUS_MIN: undefined,
    CYLINDER_INTERSECTION_INDEX_ANGLE: undefined,
  };

  this._shaderMaximumIntersectionsLength = 0; // not known until update
}

Object.defineProperties(VoxelCylinderShape.prototype, {
  /**
   * An oriented bounding box containing the bounded shape.
   *
   * @memberof VoxelCylinderShape.prototype
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
   * @memberof VoxelCylinderShape.prototype
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
   * @memberof VoxelCylinderShape.prototype
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
   * @memberof VoxelCylinderShape.prototype
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
   * @memberof VoxelCylinderShape.prototype
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
   * @memberof VoxelCylinderShape.prototype
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
   * @memberof VoxelCylinderShape.prototype
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
   * @memberof VoxelCylinderShape.prototype
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

const scratchScale = new Cartesian3();
const scratchClipMinBounds = new Cartesian3();
const scratchClipMaxBounds = new Cartesian3();
const scratchRenderMinBounds = new Cartesian3();
const scratchRenderMaxBounds = new Cartesian3();
const scratchTransformPositionWorldToLocal = new Matrix4();
const scratchCameraPositionLocal = new Cartesian3();
const scratchCameraRadialPosition = new Cartesian2();

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
VoxelCylinderShape.prototype.update = function (
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

  const { DefaultMinBounds, DefaultMaxBounds } = VoxelCylinderShape;
  const defaultAngleRange = DefaultMaxBounds.y - DefaultMinBounds.y; // == 2 * PI
  const defaultAngleRangeHalf = 0.5 * defaultAngleRange; // == PI

  const epsilonZeroScale = CesiumMath.EPSILON10;
  const epsilonAngle = CesiumMath.EPSILON10;

  // Clamp the bounds to the valid range
  minBounds.x = Math.max(0.0, minBounds.x);
  // TODO: require maxBounds.x >= minBounds.x ?
  maxBounds.x = Math.max(0.0, maxBounds.x);
  minBounds.y = CesiumMath.negativePiToPi(minBounds.y);
  maxBounds.y = CesiumMath.negativePiToPi(maxBounds.y);

  clipMinBounds.y = CesiumMath.negativePiToPi(clipMinBounds.y);
  clipMaxBounds.y = CesiumMath.negativePiToPi(clipMaxBounds.y);

  // TODO: what does this do with partial volumes crossing the antimeridian?
  // We could have minBounds.y = +PI/2 and maxBounds.y = -PI/2.
  // Then clipMinBounds.y = +PI/4 and clipMaxBounds.y = -PI/4.
  // This maximumByComponent would cancel the clipping.
  const renderMinBounds = Cartesian3.maximumByComponent(
    minBounds,
    clipMinBounds,
    scratchRenderMinBounds,
  );
  const renderMaxBounds = Cartesian3.minimumByComponent(
    maxBounds,
    clipMaxBounds,
    scratchRenderMaxBounds,
  );

  // Exit early if the shape is not visible.
  // Note that minAngle may be greater than maxAngle when crossing the 180th meridian.

  // Cylinder is not visible if:
  // - maxRadius is zero (line)
  // - minRadius is greater than maxRadius
  // - minHeight is greater than maxHeight
  // - scale is 0 for any component (too annoying to reconstruct rotation matrix)
  const scale = Matrix4.getScale(modelMatrix, scratchScale);
  if (
    renderMaxBounds.x === 0.0 ||
    renderMinBounds.x > renderMaxBounds.x ||
    renderMinBounds.z > renderMaxBounds.z ||
    CesiumMath.equalsEpsilon(scale.x, 0.0, undefined, epsilonZeroScale) ||
    CesiumMath.equalsEpsilon(scale.y, 0.0, undefined, epsilonZeroScale) ||
    CesiumMath.equalsEpsilon(scale.z, 0.0, undefined, epsilonZeroScale)
  ) {
    return false;
  }

  // Update the render bounds planes
  const renderBoundPlanes = this._renderBoundPlanes;
  renderBoundPlanes.get(0).distance = renderMinBounds.z;
  renderBoundPlanes.get(1).distance = -renderMaxBounds.z;

  this._shapeTransform = Matrix4.clone(modelMatrix, this._shapeTransform);

  this._orientedBoundingBox = getCylinderChunkObb(
    renderMinBounds,
    renderMaxBounds,
    this._shapeTransform,
    this._orientedBoundingBox,
  );

  this._boundTransform = Matrix4.fromRotationTranslation(
    this._orientedBoundingBox.halfAxes,
    this._orientedBoundingBox.center,
    this._boundTransform,
  );

  this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this._orientedBoundingBox,
    this._boundingSphere,
  );

  const shapeIsAngleReversed = maxBounds.y < minBounds.y;
  const shapeAngleRange =
    maxBounds.y - minBounds.y + shapeIsAngleReversed * defaultAngleRange;

  const renderIsAngleReversed = renderMaxBounds.y < renderMinBounds.y;
  const renderAngleRange =
    renderMaxBounds.y -
    renderMinBounds.y +
    renderIsAngleReversed * defaultAngleRange;
  const renderIsAngleRegular =
    renderAngleRange >= defaultAngleRangeHalf - epsilonAngle &&
    renderAngleRange < defaultAngleRange - epsilonAngle;
  const renderIsAngleFlipped =
    renderAngleRange > epsilonAngle &&
    renderAngleRange < defaultAngleRangeHalf - epsilonAngle;
  const renderIsAngleRangeZero = renderAngleRange <= epsilonAngle;
  const renderHasAngle =
    renderIsAngleRegular || renderIsAngleFlipped || renderIsAngleRangeZero;

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

  shaderDefines["CYLINDER_INTERSECTION_INDEX_RADIUS_MAX"] = intersectionCount;
  intersectionCount += 1;

  if (shapeAngleRange < defaultAngleRange - epsilonAngle) {
    shaderDefines["CYLINDER_HAS_SHAPE_BOUNDS_ANGLE"] = true;
  }

  if (renderMinBounds.x !== DefaultMinBounds.x) {
    shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN"] = true;
    shaderDefines["CYLINDER_INTERSECTION_INDEX_RADIUS_MIN"] = intersectionCount;
    intersectionCount += 1;
  }
  shaderUniforms.cylinderRenderRadiusMinMax = Cartesian2.fromElements(
    renderMinBounds.x,
    renderMaxBounds.x,
    shaderUniforms.cylinderRenderRadiusMinMax,
  );

  if (renderMinBounds.x === renderMaxBounds.x) {
    shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT"] = true;
  }

  const radiusRange = maxBounds.x - minBounds.x;
  let radialScale = 0.0;
  let radialOffset = 1.0;
  if (radiusRange !== 0.0) {
    radialScale = 1.0 / radiusRange;
    radialOffset = -minBounds.x * radialScale;
  }
  shaderUniforms.cylinderLocalToShapeUvRadius = Cartesian2.fromElements(
    radialScale,
    radialOffset,
    shaderUniforms.cylinderLocalToShapeUvRadius,
  );

  const heightRange = maxBounds.z - minBounds.z; // Default 2.0
  let heightScale = 0.0;
  let heightOffset = 1.0;
  if (heightRange !== 0.0) {
    heightScale = 1.0 / heightRange;
    heightOffset = -minBounds.z * heightScale;
  }
  shaderUniforms.cylinderLocalToShapeUvHeight = Cartesian2.fromElements(
    heightScale,
    heightOffset,
    shaderUniforms.cylinderLocalToShapeUvHeight,
  );

  if (renderHasAngle) {
    shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_ANGLE"] = true;
    shaderDefines["CYLINDER_INTERSECTION_INDEX_ANGLE"] = intersectionCount;

    if (renderIsAngleRegular) {
      shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF"] = true;
      intersectionCount += 1;
    } else if (renderIsAngleFlipped) {
      shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF"] = true;
      intersectionCount += 2;
    } else if (renderIsAngleRangeZero) {
      shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_ZERO"] = true;
      intersectionCount += 2;
    }

    shaderUniforms.cylinderRenderAngleMinMax = Cartesian2.fromElements(
      renderMinBounds.y,
      renderMaxBounds.y,
      shaderUniforms.cylinderRenderAngleMinMax,
    );
  }

  const uvMinAngle = (minBounds.y - DefaultMinBounds.y) / defaultAngleRange;
  const uvMaxAngle = (maxBounds.y - DefaultMinBounds.y) / defaultAngleRange;
  const uvAngleRangeZero = 1.0 - shapeAngleRange / defaultAngleRange;

  // Translate the origin of UV angles (in [0,1]) to the center of the unoccupied space
  const uvAngleRangeOrigin = (uvMaxAngle + 0.5 * uvAngleRangeZero) % 1.0;
  shaderUniforms.cylinderShapeUvAngleRangeOrigin = uvAngleRangeOrigin;

  if (shapeAngleRange <= epsilonAngle) {
    shaderUniforms.cylinderLocalToShapeUvAngle = Cartesian2.fromElements(
      0.0,
      1.0,
      shaderUniforms.cylinderLocalToShapeUvAngle,
    );
  } else {
    const scale = defaultAngleRange / shapeAngleRange;
    const shiftedMinAngle = uvMinAngle - uvAngleRangeOrigin;
    const offset = -scale * (shiftedMinAngle - Math.floor(shiftedMinAngle));
    shaderUniforms.cylinderLocalToShapeUvAngle = Cartesian2.fromElements(
      scale,
      offset,
      shaderUniforms.cylinderLocalToShapeUvAngle,
    );
  }

  this._shaderMaximumIntersectionsLength = intersectionCount;

  return true;
};

const scratchRotateRtuToLocal = new Matrix3();
const scratchRtuRotation = new Matrix3();
const scratchTransformPositionViewToLocal = new Matrix4();

/**
 * Update any view-dependent transforms.
 * @private
 * @param {FrameState} frameState The frame state.
 */
VoxelCylinderShape.prototype.updateViewTransforms = function (frameState) {
  const shaderUniforms = this._shaderUniforms;
  // 1. Update camera position in cylindrical coordinates
  const transformPositionWorldToLocal = Matrix4.inverse(
    this._shapeTransform,
    scratchTransformPositionWorldToLocal,
  );
  const cameraPositionLocal = Matrix4.multiplyByPoint(
    transformPositionWorldToLocal,
    frameState.camera.positionWC,
    scratchCameraPositionLocal,
  );
  shaderUniforms.cameraShapePosition = Cartesian3.fromElements(
    Cartesian2.magnitude(cameraPositionLocal),
    Math.atan2(cameraPositionLocal.y, cameraPositionLocal.x),
    cameraPositionLocal.z,
    shaderUniforms.cameraShapePosition,
  );
  // 2. Find radial, tangent, and up components at camera position
  const cameraRadialDirection = Cartesian2.normalize(
    Cartesian2.fromCartesian3(cameraPositionLocal, scratchCameraRadialPosition),
    scratchCameraRadialPosition,
  );
  // As row vectors, the radial, tangent, and up vectors constitute a rotation matrix from local to RTU.
  const rotateLocalToRtu = Matrix3.fromRowMajorArray(
    [
      cameraRadialDirection.x,
      cameraRadialDirection.y,
      0.0,
      -cameraRadialDirection.y,
      cameraRadialDirection.x,
      0.0,
      0.0,
      0.0,
      1.0,
    ],
    scratchRotateRtuToLocal,
  );
  // 3. Get rotation from eye to local coordinates
  const transformPositionViewToWorld =
    frameState.context.uniformState.inverseView;
  const transformPositionViewToLocal = Matrix4.multiplyTransformation(
    transformPositionWorldToLocal,
    transformPositionViewToWorld,
    scratchTransformPositionViewToLocal,
  );
  const transformDirectionViewToLocal = Matrix4.getMatrix3(
    transformPositionViewToLocal,
    scratchRtuRotation,
  );
  // 4. Multiply to get rotation from eye to RTU coordinates
  shaderUniforms.cylinderEcToRadialTangentUp = Matrix3.multiply(
    rotateLocalToRtu,
    transformDirectionViewToLocal,
    shaderUniforms.cylinderEcToRadialTangentUp,
  );
};

/**
 * Convert a UV coordinate to the shape's UV space.
 * @private
 * @param {Cartesian3} positionLocal The local coordinate to convert.
 * @param {Cartesian3} result The Cartesian3 to store the result in.
 * @returns {Cartesian3} The converted UV coordinate.
 */
VoxelCylinderShape.prototype.convertLocalToShapeUvSpace = function (
  positionLocal,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("positionLocal", positionLocal);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  let radius = Math.hypot(positionLocal.x, positionLocal.y);
  let angle = Math.atan2(positionLocal.y, positionLocal.x);
  let height = positionLocal.z;

  const {
    cylinderLocalToShapeUvRadius,
    cylinderLocalToShapeUvAngle,
    cylinderShapeUvAngleRangeOrigin,
    cylinderLocalToShapeUvHeight,
  } = this._shaderUniforms;

  radius =
    radius * cylinderLocalToShapeUvRadius.x + cylinderLocalToShapeUvRadius.y;

  // Convert angle to a "UV" in [0,1] with 0 defined at the center of the unoccupied space.
  angle = (angle + Math.PI) / (2.0 * Math.PI);
  angle -= cylinderShapeUvAngleRangeOrigin;
  angle = angle - Math.floor(angle);
  // Scale and shift so [0,1] covers the occupied space.
  angle = angle * cylinderLocalToShapeUvAngle.x + cylinderLocalToShapeUvAngle.y;

  height =
    height * cylinderLocalToShapeUvHeight.x + cylinderLocalToShapeUvHeight.y;

  return Cartesian3.fromElements(radius, angle, height, result);
};

const scratchMinBounds = new Cartesian3();
const scratchMaxBounds = new Cartesian3();

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
VoxelCylinderShape.prototype.computeOrientedBoundingBoxForTile = function (
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

  const sizeAtLevel = 1.0 / Math.pow(2.0, tileLevel);

  const tileMinBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, tileX * sizeAtLevel),
    CesiumMath.lerp(minBounds.y, maxBounds.y, tileY * sizeAtLevel),
    CesiumMath.lerp(minBounds.z, maxBounds.z, tileZ * sizeAtLevel),
    scratchMinBounds,
  );
  const tileMaxBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, (tileX + 1) * sizeAtLevel),
    CesiumMath.lerp(minBounds.y, maxBounds.y, (tileY + 1) * sizeAtLevel),
    CesiumMath.lerp(minBounds.z, maxBounds.z, (tileZ + 1) * sizeAtLevel),
    scratchMaxBounds,
  );

  return getCylinderChunkObb(
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
VoxelCylinderShape.prototype.computeOrientedBoundingBoxForSample = function (
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

  const tileSizeAtLevel = 1.0 / Math.pow(2.0, spatialNode.level);
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
      scratchMinBounds,
    ),
    tileSizeAtLevel,
    scratchMinBounds,
  );
  const maxLerp = Cartesian3.add(minLerp, sampleSizeAtLevel, scratchMaxBounds);

  const minBounds = this._minBounds;
  const maxBounds = this._maxBounds;

  const sampleMinBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, minLerp.x),
    CesiumMath.lerp(minBounds.y, maxBounds.y, minLerp.y),
    CesiumMath.lerp(minBounds.z, maxBounds.z, minLerp.z),
    scratchMinBounds,
  );
  const sampleMaxBounds = Cartesian3.fromElements(
    CesiumMath.lerp(minBounds.x, maxBounds.x, maxLerp.x),
    CesiumMath.lerp(minBounds.y, maxBounds.y, maxLerp.y),
    CesiumMath.lerp(minBounds.z, maxBounds.z, maxLerp.z),
    scratchMaxBounds,
  );

  return getCylinderChunkObb(
    sampleMinBounds,
    sampleMaxBounds,
    this._shapeTransform,
    result,
  );
};

/**
 * Defines the minimum bounds of the shape. Corresponds to minimum radius, angle, and height.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 *
 * @private
 */
VoxelCylinderShape.DefaultMinBounds = Object.freeze(
  new Cartesian3(0.0, -CesiumMath.PI, -1.0),
);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum radius, angle, height.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 *
 * @private
 */
VoxelCylinderShape.DefaultMaxBounds = Object.freeze(
  new Cartesian3(1.0, +CesiumMath.PI, +1.0),
);

const maxTestAngles = 5;
const scratchTestAngles = new Array(maxTestAngles);
const scratchTranslation = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchTranslationMatrix = new Matrix4();
const scratchRotationMatrix = new Matrix4();
const scratchScaleMatrix = new Matrix4();
const scratchMatrix = new Matrix4();
const scratchColumn0 = new Cartesian3();
const scratchColumn1 = new Cartesian3();
const scratchColumn2 = new Cartesian3();
const scratchCorners = new Array(8);
for (let i = 0; i < 8; i++) {
  scratchCorners[i] = new Cartesian3();
}

function orthogonal(a, b, epsilon) {
  return Math.abs(Cartesian4.dot(a, b)) < epsilon;
}

function isValidOrientedBoundingBoxTransformation(matrix) {
  const column0 = Matrix4.getColumn(matrix, 0, scratchColumn0);
  const column1 = Matrix4.getColumn(matrix, 1, scratchColumn1);
  const column2 = Matrix4.getColumn(matrix, 2, scratchColumn2);

  const epsilon = CesiumMath.EPSILON4;

  return (
    orthogonal(column0, column1, epsilon) &&
    orthogonal(column1, column2, epsilon)
  );
}

function computeLooseOrientedBoundingBox(matrix, result) {
  const corners = scratchCorners;
  Cartesian3.fromElements(-0.5, -0.5, -0.5, corners[0]);
  Cartesian3.fromElements(-0.5, -0.5, 0.5, corners[1]);
  Cartesian3.fromElements(-0.5, 0.5, -0.5, corners[2]);
  Cartesian3.fromElements(-0.5, 0.5, 0.5, corners[3]);
  Cartesian3.fromElements(0.5, -0.5, -0.5, corners[4]);
  Cartesian3.fromElements(0.5, -0.5, 0.5, corners[5]);
  Cartesian3.fromElements(0.5, 0.5, -0.5, corners[6]);
  Cartesian3.fromElements(0.5, 0.5, 0.5, corners[7]);

  for (let i = 0; i < 8; ++i) {
    Matrix4.multiplyByPoint(matrix, corners[i], corners[i]);
  }

  return OrientedBoundingBox.fromPoints(corners, result);
}

const scratchBoxScale = new Cartesian3();
/**
 * Computes an {@link OrientedBoundingBox} for a subregion of the shape.
 *
 * @function
 *
 * @param {Cartesian3} chunkMinBounds The minimum bounds of the subregion.
 * @param {Cartesian3} chunkMaxBounds The maximum bounds of the subregion.
 * @param {Matrix4} matrix The matrix to transform the points.
 * @param {OrientedBoundingBox} result The object onto which to store the result.
 * @returns {OrientedBoundingBox} The oriented bounding box that contains this subregion.
 *
 * @private
 */
function getCylinderChunkObb(chunkMinBounds, chunkMaxBounds, matrix, result) {
  const radiusStart = chunkMinBounds.x;
  const radiusEnd = chunkMaxBounds.x;
  const angleStart = chunkMinBounds.y;
  const angleEnd =
    chunkMaxBounds.y < angleStart
      ? chunkMaxBounds.y + CesiumMath.TWO_PI
      : chunkMaxBounds.y;
  const heightStart = chunkMinBounds.z;
  const heightEnd = chunkMaxBounds.z;

  const angleRange = angleEnd - angleStart;
  const angleMid = angleStart + angleRange * 0.5;

  const testAngles = scratchTestAngles;
  let testAngleCount = 0;

  testAngles[testAngleCount++] = angleStart;
  testAngles[testAngleCount++] = angleEnd;
  testAngles[testAngleCount++] = angleMid;

  if (angleRange > CesiumMath.PI) {
    testAngles[testAngleCount++] = angleMid - CesiumMath.PI_OVER_TWO;
    testAngles[testAngleCount++] = angleMid + CesiumMath.PI_OVER_TWO;
  }

  // Find bounding box in shape space relative to angleMid
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < testAngleCount; ++i) {
    const angle = testAngles[i] - angleMid;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const x1 = cosAngle * radiusStart;
    const y1 = sinAngle * radiusStart;
    const x2 = cosAngle * radiusEnd;
    const y2 = sinAngle * radiusEnd;

    minX = Math.min(minX, x1, x2);
    minY = Math.min(minY, y1, y2);
    maxX = Math.max(maxX, x1, x2);
    maxY = Math.max(maxY, y1, y2);
  }

  const extentX = maxX - minX;
  const extentY = maxY - minY;
  const extentZ = heightEnd - heightStart;

  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const centerZ = (heightStart + heightEnd) * 0.5;

  const translation = Cartesian3.fromElements(
    centerX,
    centerY,
    centerZ,
    scratchTranslation,
  );

  const rotation = Matrix3.fromRotationZ(angleMid, scratchRotation);

  const scale = Cartesian3.fromElements(
    extentX,
    extentY,
    extentZ,
    scratchBoxScale,
  );

  const scaleMatrix = Matrix4.fromScale(scale, scratchScaleMatrix);
  const rotationMatrix = Matrix4.fromRotation(rotation, scratchRotationMatrix);
  const translationMatrix = Matrix4.fromTranslation(
    translation,
    scratchTranslationMatrix,
  );

  // Shape space matrix = R * T * S
  const localMatrix = Matrix4.multiplyTransformation(
    rotationMatrix,
    Matrix4.multiplyTransformation(
      translationMatrix,
      scaleMatrix,
      scratchMatrix,
    ),
    scratchMatrix,
  );

  const globalMatrix = Matrix4.multiplyTransformation(
    matrix,
    localMatrix,
    scratchMatrix,
  );

  if (!isValidOrientedBoundingBoxTransformation(globalMatrix)) {
    return computeLooseOrientedBoundingBox(globalMatrix, result);
  }

  return OrientedBoundingBox.fromTransformation(globalMatrix, result);
}

export default VoxelCylinderShape;
