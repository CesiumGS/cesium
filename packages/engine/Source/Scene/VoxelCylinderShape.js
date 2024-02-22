import defaultValue from "../Core/defaultValue.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Cartesian4 from "../Core/Cartesian4.js";

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
   * @type {number}
   * @private
   */
  this._minimumRadius = VoxelCylinderShape.DefaultMinBounds.x;

  /**
   * @type {number}
   * @private
   */
  this._maximumRadius = VoxelCylinderShape.DefaultMaxBounds.x;

  /**
   * @type {number}
   * @private
   */
  this._minimumHeight = VoxelCylinderShape.DefaultMinBounds.y;

  /**
   * @type {number}
   * @private
   */
  this._maximumHeight = VoxelCylinderShape.DefaultMaxBounds.y;

  /**
   * @type {number}
   * @private
   */
  this._minimumAngle = VoxelCylinderShape.DefaultMinBounds.z;

  /**
   * @type {number}
   * @private
   */
  this._maximumAngle = VoxelCylinderShape.DefaultMaxBounds.z;

  /**
   * @type {Object<string, any>}
   * @readonly
   */
  this.shaderUniforms = {
    cylinderUvToRenderBoundsScale: new Cartesian3(),
    cylinderUvToRenderBoundsTranslate: new Cartesian3(),
    cylinderUvToRenderRadiusMin: 0.0,
    cylinderRenderAngleMinMax: new Cartesian2(),
    cylinderUvToShapeUvRadius: new Cartesian2(),
    cylinderUvToShapeUvHeight: new Cartesian2(),
    cylinderUvToShapeUvAngle: new Cartesian2(),
    cylinderShapeUvAngleMinMax: new Cartesian2(),
    cylinderShapeUvAngleRangeZeroMid: 0.0,
  };

  /**
   * @type {Object<string, any>}
   * @readonly
   */
  this.shaderDefines = {
    CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_HEIGHT: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_HEIGHT_FLAT: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_ANGLE: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_EQUAL_ZERO: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_UNDER_HALF: undefined,
    CYLINDER_HAS_RENDER_BOUNDS_ANGLE_RANGE_OVER_HALF: undefined,

    CYLINDER_HAS_SHAPE_BOUNDS_RADIUS: undefined,
    CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT: undefined,
    CYLINDER_HAS_SHAPE_BOUNDS_ANGLE: undefined,
    CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_DISCONTINUITY: undefined,
    CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MAX_DISCONTINUITY: undefined,
    CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_MAX_REVERSED: undefined,

    CYLINDER_INTERSECTION_INDEX_RADIUS_MAX: undefined,
    CYLINDER_INTERSECTION_INDEX_RADIUS_MIN: undefined,
    CYLINDER_INTERSECTION_INDEX_ANGLE: undefined,
  };

  /**
   * The maximum number of intersections against the shape for any ray direction.
   * @type {number}
   * @readonly
   */
  this.shaderMaximumIntersectionsLength = 0; // not known until update
}

const scratchScale = new Cartesian3();
const scratchBoundsTranslation = new Cartesian3();
const scratchBoundsScale = new Cartesian3();
const scratchBoundsScaleMatrix = new Matrix3();
const scratchTransformLocalToBounds = new Matrix4();
const scratchTransformUvToBounds = new Matrix4();

const transformUvToLocal = Matrix4.fromRotationTranslation(
  Matrix3.fromUniformScale(2.0, new Matrix3()),
  new Cartesian3(-1.0, -1.0, -1.0),
  new Matrix4()
);

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 * @param {Cartesian3} [clipMinBounds=VoxelCylinderShape.DefaultMinBounds] The minimum clip bounds.
 * @param {Cartesian3} [clipMaxBounds=VoxelCylinderShape.DefaultMaxBounds] The maximum clip bounds.
 * @returns {boolean} Whether the shape is visible.
 */
VoxelCylinderShape.prototype.update = function (
  modelMatrix,
  minBounds,
  maxBounds,
  clipMinBounds,
  clipMaxBounds
) {
  clipMinBounds = defaultValue(
    clipMinBounds,
    VoxelCylinderShape.DefaultMinBounds
  );
  clipMaxBounds = defaultValue(
    clipMaxBounds,
    VoxelCylinderShape.DefaultMaxBounds
  );
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  const defaultMinRadius = VoxelCylinderShape.DefaultMinBounds.x;
  const defaultMaxRadius = VoxelCylinderShape.DefaultMaxBounds.x;
  const defaultMinHeight = VoxelCylinderShape.DefaultMinBounds.y;
  const defaultMaxHeight = VoxelCylinderShape.DefaultMaxBounds.y;
  const defaultMinAngle = VoxelCylinderShape.DefaultMinBounds.z;
  const defaultMaxAngle = VoxelCylinderShape.DefaultMaxBounds.z;
  const defaultAngleRange = defaultMaxAngle - defaultMinAngle;
  const defaultAngleRangeHalf = 0.5 * defaultAngleRange;

  const epsilonZeroScale = CesiumMath.EPSILON10;
  const epsilonAngleDiscontinuity = CesiumMath.EPSILON3; // 0.001 radians = 0.05729578 degrees
  const epsilonAngle = CesiumMath.EPSILON10;

  // Clamp the radii to the valid range
  const shapeMinRadius = CesiumMath.clamp(
    minBounds.x,
    defaultMinRadius,
    defaultMaxRadius
  );
  const shapeMaxRadius = CesiumMath.clamp(
    maxBounds.x,
    defaultMinRadius,
    defaultMaxRadius
  );
  const clipMinRadius = CesiumMath.clamp(
    clipMinBounds.x,
    defaultMinRadius,
    defaultMaxRadius
  );
  const clipMaxRadius = CesiumMath.clamp(
    clipMaxBounds.x,
    defaultMinRadius,
    defaultMaxRadius
  );
  const renderMinRadius = Math.max(shapeMinRadius, clipMinRadius);
  const renderMaxRadius = Math.min(shapeMaxRadius, clipMaxRadius);

  // Clamp the heights to the valid range
  const shapeMinHeight = CesiumMath.clamp(
    minBounds.y,
    defaultMinHeight,
    defaultMaxHeight
  );
  const shapeMaxHeight = CesiumMath.clamp(
    maxBounds.y,
    defaultMinHeight,
    defaultMaxHeight
  );
  const clipMinHeight = CesiumMath.clamp(
    clipMinBounds.y,
    defaultMinHeight,
    defaultMaxHeight
  );
  const clipMaxHeight = CesiumMath.clamp(
    clipMaxBounds.y,
    defaultMinHeight,
    defaultMaxHeight
  );
  const renderMinHeight = Math.max(shapeMinHeight, clipMinHeight);
  const renderMaxHeight = Math.min(shapeMaxHeight, clipMaxHeight);

  // Clamp the angles to the valid range
  const shapeMinAngle = CesiumMath.negativePiToPi(minBounds.z);
  const shapeMaxAngle = CesiumMath.negativePiToPi(maxBounds.z);
  const clipMinAngle = CesiumMath.negativePiToPi(clipMinBounds.z);
  const clipMaxAngle = CesiumMath.negativePiToPi(clipMaxBounds.z);
  const renderMinAngle = Math.max(shapeMinAngle, clipMinAngle);
  const renderMaxAngle = Math.min(shapeMaxAngle, clipMaxAngle);

  const scale = Matrix4.getScale(modelMatrix, scratchScale);

  // Exit early if the shape is not visible.
  // Note that minAngle may be greater than maxAngle when crossing the 180th meridian.

  // Cylinder is not visible if:
  // - maxRadius is zero (line)
  // - minRadius is greater than maxRadius
  // - minHeight is greater than maxHeight
  // - scale is 0 for any component (too annoying to reconstruct rotation matrix)
  if (
    renderMaxRadius === 0.0 ||
    renderMinRadius > renderMaxRadius ||
    renderMinHeight > renderMaxHeight ||
    CesiumMath.equalsEpsilon(scale.x, 0.0, undefined, epsilonZeroScale) ||
    CesiumMath.equalsEpsilon(scale.y, 0.0, undefined, epsilonZeroScale) ||
    CesiumMath.equalsEpsilon(scale.z, 0.0, undefined, epsilonZeroScale)
  ) {
    return false;
  }

  this._minimumRadius = shapeMinRadius; // [0,1]
  this._maximumRadius = shapeMaxRadius; // [0,1]
  this._minimumHeight = shapeMinHeight; // [-1,+1]
  this._maximumHeight = shapeMaxHeight; // [-1,+1]
  this._minimumAngle = shapeMinAngle; // [-pi,+pi]
  this._maximumAngle = shapeMaxAngle; // [-pi,+pi]

  this.shapeTransform = Matrix4.clone(modelMatrix, this.shapeTransform);

  this.orientedBoundingBox = getCylinderChunkObb(
    renderMinRadius,
    renderMaxRadius,
    renderMinHeight,
    renderMaxHeight,
    renderMinAngle,
    renderMaxAngle,
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

  const shapeIsDefaultMaxRadius = shapeMaxRadius === defaultMaxRadius;
  const shapeIsDefaultMinRadius = shapeMinRadius === defaultMinRadius;
  const shapeIsDefaultRadius =
    shapeIsDefaultMinRadius && shapeIsDefaultMaxRadius;
  const shapeIsDefaultHeight =
    shapeMinHeight === defaultMinHeight && shapeMaxHeight === defaultMaxHeight;
  const shapeIsAngleReversed = shapeMaxAngle < shapeMinAngle;
  const shapeAngleRange =
    shapeMaxAngle - shapeMinAngle + shapeIsAngleReversed * defaultAngleRange;
  const shapeIsAngleRegular =
    shapeAngleRange > defaultAngleRangeHalf + epsilonAngle &&
    shapeAngleRange < defaultAngleRange - epsilonAngle;
  const shapeIsAngleFlipped =
    shapeAngleRange < defaultAngleRangeHalf - epsilonAngle;
  const shapeIsAngleRangeHalf =
    shapeAngleRange >= defaultAngleRangeHalf - epsilonAngle &&
    shapeAngleRange <= defaultAngleRangeHalf + epsilonAngle;
  const shapeHasAngle =
    shapeIsAngleRegular || shapeIsAngleFlipped || shapeIsAngleRangeHalf;
  const shapeIsMinAngleDiscontinuity = CesiumMath.equalsEpsilon(
    shapeMinAngle,
    defaultMinAngle,
    undefined,
    epsilonAngleDiscontinuity
  );
  const shapeIsMaxAngleDiscontinuity = CesiumMath.equalsEpsilon(
    shapeMaxAngle,
    defaultMaxAngle,
    undefined,
    epsilonAngleDiscontinuity
  );

  const renderIsDefaultMaxRadius = renderMaxRadius === defaultMaxRadius;
  const renderIsDefaultMinRadius = renderMinRadius === defaultMinRadius;
  const renderIsDefaultHeight =
    renderMinHeight === defaultMinHeight &&
    renderMaxHeight === defaultMaxHeight;
  const renderIsAngleReversed = renderMaxAngle < renderMinAngle;
  const renderAngleRange =
    renderMaxAngle - renderMinAngle + renderIsAngleReversed * defaultAngleRange;
  const renderIsAngleRegular =
    renderAngleRange >= defaultAngleRangeHalf - epsilonAngle &&
    renderAngleRange < defaultAngleRange - epsilonAngle;
  const renderIsAngleFlipped =
    renderAngleRange > epsilonAngle &&
    renderAngleRange < defaultAngleRangeHalf - epsilonAngle;
  const renderIsAngleRangeZero = renderAngleRange <= epsilonAngle;
  const renderHasAngle =
    renderIsAngleRegular || renderIsAngleFlipped || renderIsAngleRangeZero;

  const { shaderUniforms, shaderDefines } = this;

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

  if (!renderIsDefaultMinRadius) {
    shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MIN"] = true;
    shaderDefines["CYLINDER_INTERSECTION_INDEX_RADIUS_MIN"] = intersectionCount;
    intersectionCount += 1;

    shaderUniforms.cylinderUvToRenderRadiusMin =
      renderMaxRadius / renderMinRadius;
  }
  if (!renderIsDefaultMaxRadius) {
    shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_RADIUS_MAX"] = true;
  }
  if (renderMinRadius === renderMaxRadius) {
    shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_RADIUS_FLAT"] = true;
  }
  if (!renderIsDefaultHeight) {
    shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_HEIGHT"] = true;
  }
  if (renderMinHeight === renderMaxHeight) {
    shaderDefines["CYLINDER_HAS_RENDER_BOUNDS_HEIGHT_FLAT"] = true;
  }
  if (!shapeIsDefaultRadius) {
    shaderDefines["CYLINDER_HAS_SHAPE_BOUNDS_RADIUS"] = true;

    // delerp(radius, minRadius, maxRadius)
    // (radius - minRadius) / (maxRadius - minRadius)
    // radius / (maxRadius - minRadius) - minRadius / (maxRadius - minRadius)
    // scale = 1.0 / (maxRadius - minRadius)
    // offset = -minRadius / (maxRadius - minRadius)
    // offset = minRadius / (minRadius - maxRadius)
    const radiusRange = shapeMaxRadius - shapeMinRadius;
    let scale = 0.0;
    let offset = 1.0;
    if (radiusRange !== 0.0) {
      scale = 1.0 / radiusRange;
      offset = -shapeMinRadius / radiusRange;
    }
    shaderUniforms.cylinderUvToShapeUvRadius = Cartesian2.fromElements(
      scale,
      offset,
      shaderUniforms.cylinderUvToShapeUvRadius
    );
  }

  if (!shapeIsDefaultHeight) {
    shaderDefines["CYLINDER_HAS_SHAPE_BOUNDS_HEIGHT"] = true;

    // delerp(heightUv, minHeightUv, maxHeightUv)
    // (heightUv - minHeightUv) / (maxHeightUv - minHeightUv)
    // heightUv / (maxHeightUv - minHeightUv) - minHeightUv / (maxHeightUv - minHeightUv)
    // scale = 1.0 / (maxHeightUv - minHeightUv)
    // scale = 1.0 / ((maxHeight * 0.5 + 0.5) - (minHeight * 0.5 + 0.5))
    // scale = 2.0 / (maxHeight - minHeight)
    // offset = -minHeightUv / (maxHeightUv - minHeightUv)
    // offset = -minHeightUv / ((maxHeight * 0.5 + 0.5) - (minHeight * 0.5 + 0.5))
    // offset = -2.0 * (minHeight * 0.5 + 0.5) / (maxHeight - minHeight)
    // offset = -(minHeight + 1.0) / (maxHeight - minHeight)
    // offset = (minHeight + 1.0) / (minHeight - maxHeight)
    const heightRange = shapeMaxHeight - shapeMinHeight;
    let scale = 0.0;
    let offset = 1.0;
    if (heightRange !== 0.0) {
      scale = 2.0 / heightRange;
      offset = -(shapeMinHeight + 1.0) / heightRange;
    }
    shaderUniforms.cylinderUvToShapeUvHeight = Cartesian2.fromElements(
      scale,
      offset,
      shaderUniforms.cylinderUvToShapeUvHeight
    );
  }

  if (!renderIsDefaultMaxRadius || !renderIsDefaultHeight) {
    const heightScale = 0.5 * (renderMaxHeight - renderMinHeight);
    const scaleLocalToBounds = Cartesian3.fromElements(
      1.0 / renderMaxRadius,
      1.0 / renderMaxRadius,
      1.0 / (heightScale === 0.0 ? 1.0 : heightScale),
      scratchBoundsScale
    );
    // -inverse(scale) * translation // affine inverse
    // -inverse(scale) * 0.5 * (minHeight + maxHeight)
    const translateLocalToBounds = Cartesian3.fromElements(
      0.0,
      0.0,
      -scaleLocalToBounds.z * 0.5 * (renderMinHeight + renderMaxHeight),
      scratchBoundsTranslation
    );
    const transformLocalToBounds = Matrix4.fromRotationTranslation(
      Matrix3.fromScale(scaleLocalToBounds, scratchBoundsScaleMatrix),
      translateLocalToBounds,
      scratchTransformLocalToBounds
    );
    const transformUvToBounds = Matrix4.multiplyTransformation(
      transformLocalToBounds,
      transformUvToLocal,
      scratchTransformUvToBounds
    );
    shaderUniforms.cylinderUvToRenderBoundsScale = Matrix4.getScale(
      transformUvToBounds,
      shaderUniforms.cylinderUvToRenderBoundsScale
    );
    shaderUniforms.cylinderUvToRenderBoundsTranslate = Matrix4.getTranslation(
      transformUvToBounds,
      shaderUniforms.cylinderUvToRenderBoundsTranslate
    );
  }

  if (shapeIsAngleReversed) {
    shaderDefines["CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_MAX_REVERSED"] = true;
  }

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
      renderMinAngle,
      renderMaxAngle,
      shaderUniforms.cylinderAngleMinMax
    );
  }

  if (shapeHasAngle) {
    shaderDefines["CYLINDER_HAS_SHAPE_BOUNDS_ANGLE"] = true;
    if (shapeIsMinAngleDiscontinuity) {
      shaderDefines["CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MIN_DISCONTINUITY"] = true;
    }
    if (shapeIsMaxAngleDiscontinuity) {
      shaderDefines["CYLINDER_HAS_SHAPE_BOUNDS_ANGLE_MAX_DISCONTINUITY"] = true;
    }

    const uvMinAngle = (shapeMinAngle - defaultMinAngle) / defaultAngleRange;
    const uvMaxAngle = (shapeMaxAngle - defaultMinAngle) / defaultAngleRange;
    const uvAngleRangeZero = 1.0 - shapeAngleRange / defaultAngleRange;

    shaderUniforms.cylinderShapeUvAngleMinMax = Cartesian2.fromElements(
      uvMinAngle,
      uvMaxAngle,
      shaderUniforms.cylinderShapeUvAngleMinMax
    );
    shaderUniforms.cylinderShapeUvAngleRangeZeroMid =
      (uvMaxAngle + 0.5 * uvAngleRangeZero) % 1.0;

    // delerp(angleUv, uvMinAngle, uvMaxAngle)
    // (angelUv - uvMinAngle) / (uvMaxAngle - uvMinAngle)
    // angleUv / (uvMaxAngle - uvMinAngle) - uvMinAngle / (uvMaxAngle - uvMinAngle)
    // scale = 1.0 / (uvMaxAngle - uvMinAngle)
    // scale = 1.0 / (((maxAngle - pi) / (2.0 * pi)) - ((minAngle - pi) / (2.0 * pi)))
    // scale = 2.0 * pi / (maxAngle - minAngle)
    // offset = -uvMinAngle / (uvMaxAngle - uvMinAngle)
    // offset = -((minAngle - pi) / (2.0 * pi)) / (((maxAngle - pi) / (2.0 * pi)) - ((minAngle - pi) / (2.0 * pi)))
    // offset = -(minAngle - pi) / (maxAngle - minAngle)
    if (shapeAngleRange <= epsilonAngle) {
      shaderUniforms.cylinderUvToShapeUvAngle = Cartesian2.fromElements(
        0.0,
        1.0,
        shaderUniforms.cylinderUvToShapeUvAngle
      );
    } else {
      const scale = defaultAngleRange / shapeAngleRange;
      const offset = -(shapeMinAngle - defaultMinAngle) / shapeAngleRange;
      shaderUniforms.cylinderUvToShapeUvAngle = Cartesian2.fromElements(
        scale,
        offset,
        shaderUniforms.cylinderUvToShapeUvAngle
      );
    }
  }

  this.shaderMaximumIntersectionsLength = intersectionCount;

  return true;
};

/**
 * Computes an oriented bounding box for a specified tile.
 * The update function must be called before calling this function.
 *
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
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("tileLevel", tileLevel);
  Check.typeOf.number("tileX", tileX);
  Check.typeOf.number("tileY", tileY);
  Check.typeOf.number("tileZ", tileZ);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

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
    this.shapeTransform,
    result
  );
};

const sampleSizeScratch = new Cartesian3();
const scratchTileMinBounds = new Cartesian3();
const scratchTileMaxBounds = new Cartesian3();

/**
 * Computes an oriented bounding box for a specified sample within a specified tile.
 * The update function must be called before calling this function.
 *
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
  result
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
    sampleSizeScratch
  );
  const sampleSizeAtLevel = Cartesian3.multiplyByScalar(
    sampleSize,
    tileSizeAtLevel,
    sampleSizeScratch
  );

  const minLerp = Cartesian3.multiplyByScalar(
    Cartesian3.fromElements(
      spatialNode.x + tileUv.x,
      spatialNode.y + tileUv.y,
      spatialNode.z + tileUv.z,
      scratchTileMinBounds
    ),
    tileSizeAtLevel,
    scratchTileMinBounds
  );
  const maxLerp = Cartesian3.add(
    minLerp,
    sampleSizeAtLevel,
    scratchTileMaxBounds
  );

  const minimumRadius = this._minimumRadius;
  const maximumRadius = this._maximumRadius;
  const minimumHeight = this._minimumHeight;
  const maximumHeight = this._maximumHeight;
  const minimumAngle = this._minimumAngle;
  const maximumAngle = this._maximumAngle;

  const radiusStart = CesiumMath.lerp(minimumRadius, maximumRadius, minLerp.x);
  const radiusEnd = CesiumMath.lerp(minimumRadius, maximumRadius, maxLerp.x);
  const heightStart = CesiumMath.lerp(minimumHeight, maximumHeight, minLerp.y);
  const heightEnd = CesiumMath.lerp(minimumHeight, maximumHeight, maxLerp.y);
  const angleStart = CesiumMath.lerp(minimumAngle, maximumAngle, minLerp.z);
  const angleEnd = CesiumMath.lerp(minimumAngle, maximumAngle, maxLerp.z);

  return getCylinderChunkObb(
    radiusStart,
    radiusEnd,
    heightStart,
    heightEnd,
    angleStart,
    angleEnd,
    this.shapeTransform,
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
 * @returns {number} The step size.
 */
VoxelCylinderShape.prototype.computeApproximateStepSize = function (
  dimensions
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("dimensions", dimensions);
  //>>includeEnd('debug');

  const shapeTransform = this.shapeTransform;
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
    shapeTransform,
    scratchOrientedBoundingBox
  );

  const voxelScale = Matrix3.getScale(voxelObb.halfAxes, scratchVoxelScale);
  const rootScale = Matrix4.getScale(shapeTransform, scratchRootScale);
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
VoxelCylinderShape.DefaultMinBounds = Object.freeze(
  new Cartesian3(0.0, -1.0, -CesiumMath.PI)
);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum radius, height, angle.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 *
 * @private
 */
VoxelCylinderShape.DefaultMaxBounds = Object.freeze(
  new Cartesian3(1.0, +1.0, +CesiumMath.PI)
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

/**
 * Computes an {@link OrientedBoundingBox} for a subregion of the shape.
 *
 * @function
 *
 * @param {number} radiusStart The radiusStart.
 * @param {number} radiusEnd The radiusEnd.
 * @param {number} heightStart The heightStart.
 * @param {number} heightEnd The heightEnd.
 * @param {number} angleStart The angleStart.
 * @param {number} angleEnd The angleEnd.
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
  const defaultMinAngle = defaultMinBounds.z; // -pi
  const defaultMaxAngle = defaultMaxBounds.z; // +pi

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

  const isAngleReversed = angleEnd < angleStart;

  if (isAngleReversed) {
    angleEnd += CesiumMath.TWO_PI;
  }

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
  let minX = 1.0;
  let minY = 1.0;
  let maxX = -1.0;
  let maxY = -1.0;

  for (let i = 0; i < testAngleCount; ++i) {
    const angle = testAngles[i] - angleMid;
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    const x1 = cosAngle * radiusStart;
    const y1 = sinAngle * radiusStart;
    const x2 = cosAngle * radiusEnd;
    const y2 = sinAngle * radiusEnd;

    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    minX = Math.min(minX, x2);
    minY = Math.min(minY, y2);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
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
    scratchTranslation
  );

  const rotation = Matrix3.fromRotationZ(angleMid, scratchRotation);

  const scale = Cartesian3.fromElements(
    extentX,
    extentY,
    extentZ,
    scratchScale
  );

  const scaleMatrix = Matrix4.fromScale(scale, scratchScaleMatrix);
  const rotationMatrix = Matrix4.fromRotation(rotation, scratchRotationMatrix);
  const translationMatrix = Matrix4.fromTranslation(
    translation,
    scratchTranslationMatrix
  );

  // Shape space matrix = R * T * S
  const localMatrix = Matrix4.multiplyTransformation(
    rotationMatrix,
    Matrix4.multiplyTransformation(
      translationMatrix,
      scaleMatrix,
      scratchMatrix
    ),
    scratchMatrix
  );

  const globalMatrix = Matrix4.multiplyTransformation(
    matrix,
    localMatrix,
    scratchMatrix
  );

  if (!isValidOrientedBoundingBoxTransformation(globalMatrix)) {
    return computeLooseOrientedBoundingBox(globalMatrix, result);
  }

  return OrientedBoundingBox.fromTransformation(globalMatrix, result);
}

export default VoxelCylinderShape;
