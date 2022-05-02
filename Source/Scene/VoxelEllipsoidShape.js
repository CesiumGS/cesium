import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
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
   * @type {Matrix3}
   */
  this._rotation = new Matrix3();

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderUniforms = {
    ellipsoidRadiiUv: new Cartesian3(),
    ellipsoidInverseRadiiSquaredUv: new Cartesian3(),
    ellipsoidRenderLongitudeMinMax: new Cartesian2(),
    ellipsoidShapeUvLongitudeMinMaxMid: new Cartesian3(),
    ellipsoidUvToShapeUvLongitude: new Cartesian2(),
    ellipsoidUvToShapeUvLatitude: new Cartesian2(),
    ellipsoidRenderLatitudeCosSqrHalfMinMax: new Cartesian2(),
    ellipsoidInverseHeightDifferenceUv: 0.0,
    ellipseInnerRadiiUv: new Cartesian2(),
    ellipsoidInverseInnerScaleUv: 0.0,
  };

  /**
   * @type {Object.<string, any>}
   * @readonly
   */
  this.shaderDefines = {
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_UNDER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_OVER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_HEIGHT_MIN: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_RANGE_EQUAL_ZERO: undefined,
    ELLIPSOID_IS_SPHERE: undefined,
    ELLIPSOID_INTERSECTION_INDEX_LONGITUDE: undefined,
    ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX: undefined,
    ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN: undefined,
    ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX: undefined,
    ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MIN: undefined,
  };

  /**
   * The maximum number of intersections against the shape for any ray direction.
   * @type {Number}
   * @readonly
   */
  this.shaderMaximumIntersectionsLength = 0; // not known until update
}

const scratchScale = new Cartesian3();
const scratchRotationScale = new Matrix3();
const scratchOuterExtentShape = new Cartesian3();
const scratchInnerExtentShape = new Cartesian3();
const scratchOuterExtentRender = new Cartesian3();
const scratchInnerExtentRender = new Cartesian3();

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 * @param {Cartesian3} clipMinBounds The minimum clip bounds.
 * @param {Cartesian3} clipMaxBounds The maximum clip bounds.
 * @returns {Boolean} Whether the shape is visible.
 */
VoxelEllipsoidShape.prototype.update = function (
  modelMatrix,
  minBounds,
  maxBounds,
  clipMinBounds,
  clipMaxBounds
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  Check.typeOf.object("clipMinBounds", clipMinBounds);
  Check.typeOf.object("clipMaxBounds", clipMaxBounds);
  //>>includeEnd('debug');

  const zeroScaleEpsilon = CesiumMath.EPSILON10;
  const longitudeDiscontinuityEpsilon = CesiumMath.EPSILON3; // 0.001 radians = 0.05729578 degrees
  const longitudeEpsilon = CesiumMath.EPSILON10;
  const latitudeEpsilon = CesiumMath.EPSILON10;
  const flatLatitudeEpsilon = CesiumMath.EPSILON3; // 0.001 radians = 0.05729578 degrees

  const longitudeMinDefault = VoxelEllipsoidShape.DefaultMinBounds.x;
  const longitudeMaxDefault = VoxelEllipsoidShape.DefaultMaxBounds.x;
  const longitudeRangeDefault = longitudeMaxDefault - longitudeMinDefault;
  const longitudeHalfRangeDefault = 0.5 * longitudeRangeDefault;
  const latitudeMinDefault = VoxelEllipsoidShape.DefaultMinBounds.y;
  const latitudeMaxDefault = VoxelEllipsoidShape.DefaultMaxBounds.y;
  const latitudeRangeDefault = latitudeMaxDefault - latitudeMinDefault;

  // Clamp the longitude / latitude to the valid range
  const longitudeMinShape = CesiumMath.clamp(
    minBounds.x,
    longitudeMinDefault,
    longitudeMaxDefault
  );
  const longitudeMaxShape = CesiumMath.clamp(
    maxBounds.x,
    longitudeMinDefault,
    longitudeMaxDefault
  );
  const longitudeMinClip = CesiumMath.clamp(
    clipMinBounds.x,
    longitudeMinDefault,
    longitudeMaxDefault
  );
  const longitudeMaxClip = CesiumMath.clamp(
    clipMaxBounds.x,
    longitudeMinDefault,
    longitudeMaxDefault
  );
  const longitudeMinRender = CesiumMath.clamp(
    longitudeMinClip,
    longitudeMinShape,
    longitudeMaxShape
  );
  const longitudeMaxRender = CesiumMath.clamp(
    longitudeMaxShape,
    longitudeMinClip,
    longitudeMaxClip
  );

  const latitudeMinShape = CesiumMath.clamp(
    minBounds.y,
    latitudeMinDefault,
    latitudeMaxDefault
  );
  const latitudeMaxShape = CesiumMath.clamp(
    maxBounds.y,
    latitudeMinDefault,
    latitudeMaxDefault
  );
  const latitudeMinClip = CesiumMath.clamp(
    clipMinBounds.y,
    latitudeMinDefault,
    latitudeMaxDefault
  );
  const latitudeMaxClip = CesiumMath.clamp(
    clipMaxBounds.y,
    latitudeMinDefault,
    latitudeMaxDefault
  );
  const latitudeMinRender = CesiumMath.clamp(
    latitudeMinClip,
    latitudeMinShape,
    latitudeMaxShape
  );
  const latitudeMaxRender = CesiumMath.clamp(
    latitudeMaxShape,
    latitudeMinClip,
    latitudeMaxClip
  );

  // Don't let the height go below the center of the ellipsoid.
  const radii = Matrix4.getScale(modelMatrix, scratchScale);
  const isSphere = radii.x === radii.y && radii.y === radii.z;
  const minRadius = Cartesian3.minimumComponent(radii);
  const minHeightShape = Math.max(minBounds.z, -minRadius);
  const maxHeightShape = Math.max(maxBounds.z, -minRadius);
  const minHeightClip = Math.max(clipMinBounds.z, -minRadius);
  const maxHeightClip = Math.max(clipMaxBounds.z, -minRadius);
  const minHeightRender = CesiumMath.clamp(
    minHeightShape,
    minHeightClip,
    maxHeightClip
  );
  const maxHeightRender = CesiumMath.clamp(
    maxHeightShape,
    minHeightClip,
    maxHeightClip
  );

  // Compute the closest and farthest a point can be from the center of the ellipsoid.
  const innerExtentShape = Cartesian3.add(
    radii,
    Cartesian3.fromElements(
      minHeightShape,
      minHeightShape,
      minHeightShape,
      scratchInnerExtentShape
    ),
    scratchInnerExtentShape
  );
  const outerExtentShape = Cartesian3.add(
    radii,
    Cartesian3.fromElements(
      maxHeightShape,
      maxHeightShape,
      maxHeightShape,
      scratchOuterExtentShape
    ),
    scratchOuterExtentShape
  );
  const maxExtentShape = Cartesian3.maximumComponent(outerExtentShape);

  const innerExtentRender = Cartesian3.add(
    radii,
    Cartesian3.fromElements(
      minHeightRender,
      minHeightRender,
      minHeightRender,
      scratchInnerExtentRender
    ),
    scratchInnerExtentRender
  );
  const outerExtentRender = Cartesian3.add(
    radii,
    Cartesian3.fromElements(
      maxHeightRender,
      maxHeightRender,
      maxHeightRender,
      scratchOuterExtentRender
    ),
    scratchOuterExtentRender
  );
  const maxExtentRender = Cartesian3.maximumComponent(outerExtentRender);

  // Exit early if the shape is not visible.
  // Note that minLongitude may be greater than maxLongitude when crossing the 180th meridian.
  if (
    latitudeMinRender > latitudeMaxRender ||
    latitudeMinRender === latitudeMaxDefault ||
    latitudeMaxRender === latitudeMinDefault ||
    minHeightRender > maxHeightRender ||
    maxHeightShape < minHeightClip ||
    minHeightShape > maxHeightClip ||
    CesiumMath.equalsEpsilon(
      outerExtentRender.x,
      0.0,
      undefined,
      zeroScaleEpsilon
    ) ||
    CesiumMath.equalsEpsilon(
      outerExtentRender.y,
      0.0,
      undefined,
      zeroScaleEpsilon
    ) ||
    CesiumMath.equalsEpsilon(
      outerExtentRender.z,
      0.0,
      undefined,
      zeroScaleEpsilon
    )
  ) {
    return false;
  }

  this._rectangle = Rectangle.fromRadians(
    longitudeMinShape,
    latitudeMinShape,
    longitudeMaxShape,
    latitudeMaxShape
  );
  this._translation = Matrix4.getTranslation(modelMatrix, this._translation);
  this._rotation = Matrix4.getRotation(modelMatrix, this._rotation);
  this._ellipsoid = Ellipsoid.fromCartesian3(radii, this._ellipsoid);
  this._minimumHeight = minHeightShape;
  this._maximumHeight = maxHeightShape;

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
    Matrix3.setScale(this._rotation, outerExtentRender, scratchRotationScale),
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

  // To keep things simple, clear the defines every time
  for (const key in shaderDefines) {
    if (shaderDefines.hasOwnProperty(key)) {
      shaderDefines[key] = undefined;
    }
  }

  // The ellipsoid radii scaled to [0,1]. The max ellipsoid radius will be 1.0 and others will be less.
  shaderUniforms.ellipsoidRadiiUv = Cartesian3.divideByScalar(
    outerExtentShape,
    maxExtentShape,
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

  // Longitude
  const isLongitudeMinMaxReversedRender =
    longitudeMaxRender < longitudeMinRender;
  const longitudeRangeRender =
    longitudeMaxRender -
    longitudeMinRender +
    isLongitudeMinMaxReversedRender * longitudeRangeDefault;
  const hasLongitudeRangeEqualZeroRender =
    longitudeRangeRender <= longitudeEpsilon;
  const hasLongitudeRangeUnderHalfRender =
    longitudeRangeRender > longitudeHalfRangeDefault + longitudeEpsilon &&
    longitudeRangeRender < longitudeRangeDefault - longitudeEpsilon;
  const hasLongitudeRangeEqualHalfRender =
    longitudeRangeRender >= longitudeHalfRangeDefault - longitudeEpsilon &&
    longitudeRangeRender <= longitudeHalfRangeDefault + longitudeEpsilon;
  const hasLongitudeRangeOverHalfRender =
    longitudeRangeRender > longitudeEpsilon &&
    longitudeRangeRender < longitudeHalfRangeDefault - longitudeEpsilon;
  const hasLongitudeRender =
    hasLongitudeRangeEqualZeroRender ||
    hasLongitudeRangeUnderHalfRender ||
    hasLongitudeRangeEqualHalfRender ||
    hasLongitudeRangeOverHalfRender;

  const isLongitudeMinMaxReversedShape =
    longitudeMaxRender < longitudeMinRender;
  const longitudeRangeShape =
    longitudeMaxShape -
    longitudeMinShape +
    isLongitudeMinMaxReversedShape * longitudeRangeDefault;
  const hasLongitudeRangeEqualZeroShape =
    longitudeRangeShape <= longitudeEpsilon;
  const hasLongitudeRangeUnderHalfShape =
    longitudeRangeShape > longitudeHalfRangeDefault + longitudeEpsilon &&
    longitudeRangeShape < longitudeRangeDefault - longitudeEpsilon;
  const hasLongitudeRangeEqualHalfShape =
    longitudeRangeShape >= longitudeHalfRangeDefault - longitudeEpsilon &&
    longitudeRangeShape <= longitudeHalfRangeDefault + longitudeEpsilon;
  const hasLongitudeRangeOverHalfShape =
    longitudeRangeShape > longitudeEpsilon &&
    longitudeRangeShape < longitudeHalfRangeDefault - longitudeEpsilon;
  const hasLongitudeShape =
    hasLongitudeRangeEqualZeroShape ||
    hasLongitudeRangeUnderHalfShape ||
    hasLongitudeRangeEqualHalfShape ||
    hasLongitudeRangeOverHalfShape;

  // Latitude
  const hasLatitudeMaxUnderHalfRender =
    latitudeMaxRender < -flatLatitudeEpsilon;
  const hasLatitudeMaxEqualHalfRender =
    latitudeMaxRender >= -flatLatitudeEpsilon &&
    latitudeMaxRender <= +flatLatitudeEpsilon;
  const hasLatitudeMaxOverHalfRender =
    latitudeMaxRender > +flatLatitudeEpsilon &&
    latitudeMaxRender < latitudeMaxDefault - latitudeEpsilon;
  const hasLatitudeMaxRender =
    hasLatitudeMaxUnderHalfRender ||
    hasLatitudeMaxEqualHalfRender ||
    hasLatitudeMaxOverHalfRender;
  const hasLatitudeMinUnderHalfRender =
    latitudeMinRender > latitudeMinDefault + latitudeEpsilon &&
    latitudeMinRender < -flatLatitudeEpsilon;
  const hasLatitudeMinEqualHalfRender =
    latitudeMinRender >= -flatLatitudeEpsilon &&
    latitudeMinRender <= +flatLatitudeEpsilon;
  const hasLatitudeMinOverHalfRender = latitudeMinRender > +flatLatitudeEpsilon;
  const hasLatitudeMinRender =
    hasLatitudeMinUnderHalfRender ||
    hasLatitudeMinEqualHalfRender ||
    hasLatitudeMinOverHalfRender;
  const hasLatitudeRender = hasLatitudeMaxRender || hasLatitudeMinRender;

  const latitudeRangeShape = latitudeMaxShape - latitudeMinShape;
  const hasLatitudeMaxUnderHalfShape = latitudeMaxShape < -flatLatitudeEpsilon;
  const hasLatitudeMaxEqualHalfShape =
    latitudeMaxShape >= -flatLatitudeEpsilon &&
    latitudeMaxShape <= +flatLatitudeEpsilon;
  const hasLatitudeMaxOverHalfShape =
    latitudeMaxShape > +flatLatitudeEpsilon &&
    latitudeMaxShape < latitudeMaxDefault - latitudeEpsilon;
  const hasLatitudeMaxShape =
    hasLatitudeMaxUnderHalfShape ||
    hasLatitudeMaxEqualHalfShape ||
    hasLatitudeMaxOverHalfShape;
  const hasLatitudeMinUnderHalfShape =
    latitudeMinShape > latitudeMinDefault + latitudeEpsilon &&
    latitudeMinShape < -flatLatitudeEpsilon;
  const hasLatitudeMinEqualHalfShape =
    latitudeMinShape >= -flatLatitudeEpsilon &&
    latitudeMinShape <= +flatLatitudeEpsilon;
  const hasLatitudeMinOverHalfShape = latitudeMinShape > +flatLatitudeEpsilon;
  const hasLatitudeMinShape =
    hasLatitudeMinUnderHalfShape ||
    hasLatitudeMinEqualHalfShape ||
    hasLatitudeMinOverHalfShape;
  const hasLatitudeShape = hasLatitudeMaxShape || hasLatitudeMinShape;

  // Height
  const hasHeightMinRender = !Cartesian3.equals(
    innerExtentRender,
    Cartesian3.ZERO
  );
  const hasHeightMaxRender = !Cartesian3.equals(
    outerExtentRender,
    Cartesian3.ZERO
  );
  const hasHeightRender = hasHeightMinRender || hasHeightMaxRender;
  const heightRangeRender = maxHeightRender - minHeightRender;
  const hasHeightMinShape = !Cartesian3.equals(
    innerExtentShape,
    Cartesian3.ZERO
  );
  const hasHeightMaxShape = !Cartesian3.equals(
    outerExtentShape,
    Cartesian3.ZERO
  );
  const hasHeightShape = hasHeightMinShape || hasHeightMaxShape;

  // Keep track of how many intersections there are going to be.
  let intersectionCount = 0;

  // Intersects an outer ellipsoid for the max height.
  shaderDefines["ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX"] = intersectionCount;
  intersectionCount += 1;

  if (hasHeightRender) {
    if (heightRangeRender === 0.0) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_HEIGHT_RANGE_EQUAL_ZERO"
      ] = true;
    }

    if (hasHeightMinRender) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_HEIGHT_MIN"] = true;
      shaderDefines[
        "ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MIN"
      ] = intersectionCount;
      intersectionCount += 1;

      // The inverse of the percent of space that is taken up by the inner ellipsoid.
      // 1.0 / (1.0 - thickness) // thickness = percent of space that is between the min and max height.
      // 1.0 / (1.0 - (maxHeightRender - minHeightRender) / maxExtentRender)
      // maxExtentRender / (maxExtentRender - (maxHeightRender - minHeightRender))
      shaderUniforms.ellipsoidInverseInnerScaleUv =
        maxExtentRender / (maxExtentRender - heightRangeRender);
    }
  }

  if (hasHeightShape) {
    if (hasHeightMinShape) {
      shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_MIN"] = true;

      // The percent of space that is between the inner and outer ellipsoid.
      const thickness = (maxHeightShape - minHeightShape) / maxExtentShape;
      shaderUniforms.ellipsoidInverseHeightDifferenceUv = 1.0 / thickness;
      shaderUniforms.ellipseInnerRadiiUv = Cartesian2.fromElements(
        shaderUniforms.ellipsoidRadiiUv.x * (1.0 - thickness),
        shaderUniforms.ellipsoidRadiiUv.z * (1.0 - thickness),
        shaderUniforms.ellipseInnerRadiiUv
      );
    }
    if (minHeightShape === maxHeightShape) {
      shaderDefines[
        "ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_RANGE_EQUAL_ZERO"
      ] = true;
    }
  }

  // Intersects a wedge for the min and max longitude.
  if (hasLongitudeRender) {
    shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE"] = true;
    shaderDefines["ELLIPSOID_INTERSECTION_INDEX_LONGITUDE"] = intersectionCount;

    if (hasLongitudeRangeUnderHalfRender) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_UNDER_HALF"
      ] = true;
      intersectionCount += 1;
    } else if (hasLongitudeRangeOverHalfRender) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_OVER_HALF"
      ] = true;
      intersectionCount += 2;
    } else if (hasLongitudeRangeEqualHalfRender) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_HALF"
      ] = true;
      intersectionCount += 1;
    } else if (hasLongitudeRangeEqualZeroRender) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO"
      ] = true;
      intersectionCount += 2;
    }

    shaderUniforms.ellipsoidRenderLongitudeMinMax = Cartesian2.fromElements(
      longitudeMinRender,
      longitudeMaxRender,
      shaderUniforms.ellipsoidRenderLongitudeMinMax
    );
  }

  if (hasLongitudeShape) {
    shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE"] = true;

    const isLongitudeMinMaxReversedShape =
      longitudeMaxShape < longitudeMinShape;

    if (isLongitudeMinMaxReversedShape) {
      shaderDefines[
        "ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED"
      ] = true;
    }

    // delerp(longitudeUv, minLongitudeUv, maxLongitudeUv)
    // (longitudeUv - minLongitudeUv) / (maxLongitudeUv - minLongitudeUv)
    // longitudeUv / (maxLongitudeUv - minLongitudeUv) - minLongitudeUv / (maxLongitudeUv - minLongitudeUv)
    // scale = 1.0 / (maxLongitudeUv - minLongitudeUv)
    // scale = 1.0 / (((maxLongitude - pi) / (2.0 * pi)) - ((minLongitude - pi) / (2.0 * pi)))
    // scale = 2.0 * pi / (maxLongitude - minLongitude)
    // offset = -minLongitudeUv / (maxLongitudeUv - minLongitudeUv)
    // offset = -((minLongitude - pi) / (2.0 * pi)) / (((maxLongitude - pi) / (2.0 * pi)) - ((minLongitude - pi) / (2.0 * pi)))
    // offset = -(minLongitude - pi) / (maxLongitude - minLongitude)
    const scale = longitudeRangeDefault / longitudeRangeShape;
    const offset =
      -(longitudeMinShape - longitudeMinDefault) / longitudeRangeShape;
    shaderUniforms.ellipsoidUvToShapeUvLongitude = Cartesian2.fromElements(
      scale,
      offset,
      shaderUniforms.ellipsoidUvToShapeUvLongitude
    );
  }

  if (hasLongitudeShape || hasLongitudeRender) {
    const isMinLongitudeDiscontinuityRender = CesiumMath.equalsEpsilon(
      longitudeMinRender,
      longitudeMinDefault,
      undefined,
      longitudeDiscontinuityEpsilon
    );
    const isMaxLongitudeDiscontinuityRender = CesiumMath.equalsEpsilon(
      longitudeMaxRender,
      longitudeMaxDefault,
      undefined,
      longitudeDiscontinuityEpsilon
    );

    if (isMinLongitudeDiscontinuityRender) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY"
      ] = true;
    }
    if (isMaxLongitudeDiscontinuityRender) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY"
      ] = true;
    }
    const longitudeMinShapeUv =
      (longitudeMinShape - longitudeMinDefault) / longitudeRangeDefault;
    const longitudeMaxShapeUv =
      (longitudeMaxShape - longitudeMinDefault) / longitudeRangeDefault;

    const longitudeMaxRenderUv =
      (longitudeMaxRender - longitudeMinDefault) / longitudeRangeDefault;
    const longitudeRangeEmptyRender =
      1.0 - longitudeRangeRender / longitudeRangeDefault;
    const emptyMidLongitudeRenderUv =
      (longitudeMaxRenderUv + 0.5 * longitudeRangeEmptyRender) % 1.0;

    shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid = Cartesian3.fromElements(
      longitudeMinShapeUv,
      longitudeMaxShapeUv,
      emptyMidLongitudeRenderUv,
      shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid
    );
  }

  if (hasLatitudeRender) {
    shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE"] = true;

    // Intersects a cone for min latitude
    if (hasLatitudeMinRender) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN"] = true;
      shaderDefines[
        "ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN"
      ] = intersectionCount;

      if (hasLatitudeMinUnderHalfRender) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF"
        ] = true;
        intersectionCount += 1;
      } else if (hasLatitudeMinEqualHalfRender) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF"
        ] = true;
        intersectionCount += 1;
      } else if (hasLatitudeMinOverHalfRender) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF"
        ] = true;
        intersectionCount += 2;
      }
    }

    // Intersects a cone for max latitude
    if (hasLatitudeMaxRender) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX"] = true;
      shaderDefines[
        "ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX"
      ] = intersectionCount;

      if (hasLatitudeMaxUnderHalfRender) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF"
        ] = true;
        intersectionCount += 2;
      } else if (hasLatitudeMaxEqualHalfRender) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF"
        ] = true;
        intersectionCount += 1;
      } else if (hasLatitudeMaxOverHalfRender) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF"
        ] = true;
        intersectionCount += 1;
      }
    }

    if (latitudeMinRender === latitudeMaxRender) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO"
      ] = true;
    }

    const minCosHalfAngleSqr = Math.pow(
      Math.cos(CesiumMath.PI_OVER_TWO - Math.abs(latitudeMinRender)),
      2.0
    );
    const maxCosHalfAngleSqr = Math.pow(
      Math.cos(CesiumMath.PI_OVER_TWO - Math.abs(latitudeMaxRender)),
      2.0
    );
    shaderUniforms.ellipsoidRenderLatitudeCosSqrHalfMinMax = Cartesian2.fromElements(
      minCosHalfAngleSqr,
      maxCosHalfAngleSqr,
      shaderUniforms.ellipsoidRenderLatitudeCosSqrHalfMinMax
    );
  }

  if (hasLatitudeShape) {
    shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE"] = true;

    if (latitudeMinShape === latitudeMaxShape) {
      shaderDefines[
        "ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE_RANGE_EQUAL_ZERO"
      ] = true;
    }

    // delerp(latitudeUv, minLatitudeUv, maxLatitudeUv)
    // (latitudeUv - minLatitudeUv) / (maxLatitudeUv - minLatitudeUv)
    // latitudeUv / (maxLatitudeUv - minLatitudeUv) - minLatitudeUv / (maxLatitudeUv - minLatitudeUv)
    // scale = 1.0 / (maxLatitudeUv - minLatitudeUv)
    // scale = 1.0 / (((maxLatitude - pi) / (2.0 * pi)) - ((minLatitude - pi) / (2.0 * pi)))
    // scale = 2.0 * pi / (maxLatitude - minLatitude)
    // offset = -minLatitudeUv / (maxLatitudeUv - minLatitudeUv)
    // offset = -((minLatitude - -pi) / (2.0 * pi)) / (((maxLatitude - pi) / (2.0 * pi)) - ((minLatitude - pi) / (2.0 * pi)))
    // offset = -(minLatitude - -pi) / (maxLatitude - minLatitude)
    // offset = (-pi - minLatitude) / (maxLatitude - minLatitude)
    const scale = latitudeRangeDefault / latitudeRangeShape;
    const offset = (latitudeMinDefault - latitudeMinShape) / latitudeRangeShape;
    shaderUniforms.ellipsoidUvToShapeUvLatitude = Cartesian2.fromElements(
      scale,
      offset,
      shaderUniforms.ellipsoidUvToShapeUvLatitude
    );
  }

  if (isSphere) {
    shaderDefines["ELLIPSOID_IS_SPHERE"] = true;
  }

  this.shaderMaximumIntersectionsLength = intersectionCount;

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
  const minLongitudeLerp = tileX * sizeAtLevel;
  const maxLongitudeLerp = (tileX + 1) * sizeAtLevel;
  const minLatitudeLerp = tileY * sizeAtLevel;
  const maxLatitudeLerp = (tileY + 1) * sizeAtLevel;
  const minHeightLerp = tileZ * sizeAtLevel;
  const maxHeightLerp = (tileZ + 1) * sizeAtLevel;

  const rectangle = Rectangle.subsection(
    this._rectangle,
    minLongitudeLerp,
    minLatitudeLerp,
    maxLongitudeLerp,
    maxLatitudeLerp,
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
