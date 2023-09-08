import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Rectangle from "../Core/Rectangle.js";
import defaultValue from "../Core/defaultValue.js";

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
   * @type {number}
   * @private
   */
  this._minimumHeight = VoxelEllipsoidShape.DefaultMinBounds.z;

  /**
   * @type {number}
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
   * @type {Object<string, any>}
   * @readonly
   */
  this.shaderUniforms = {
    ellipsoidRadiiUv: new Cartesian3(),
    ellipsoidInverseRadiiSquaredUv: new Cartesian3(),
    ellipsoidRenderLongitudeMinMax: new Cartesian2(),
    ellipsoidShapeUvLongitudeMinMaxMid: new Cartesian3(),
    ellipsoidUvToShapeUvLongitude: new Cartesian2(),
    ellipsoidUvToShapeUvLatitude: new Cartesian2(),
    ellipsoidRenderLatitudeCosHalfMinMax: new Cartesian2(),
    ellipsoidInverseHeightDifferenceUv: 0.0,
    ellipseInnerRadiiUv: new Cartesian2(),
    clipMinMaxHeight: new Cartesian2(),
  };

  /**
   * @type {Object<string, any>}
   * @readonly
   */
  this.shaderDefines = {
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_UNDER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_OVER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF: undefined,
    ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE: undefined,
    ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT: undefined,
    ELLIPSOID_INTERSECTION_INDEX_LONGITUDE: undefined,
    ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX: undefined,
    ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN: undefined,
    ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX: undefined,
    ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MIN: undefined,
  };

  /**
   * The maximum number of intersections against the shape for any ray direction.
   * @type {number}
   * @readonly
   */
  this.shaderMaximumIntersectionsLength = 0; // not known until update
}

const scratchScale = new Cartesian3();
const scratchRotationScale = new Matrix3();
const scratchShapeOuterExtent = new Cartesian3();
const scratchRenderOuterExtent = new Cartesian3();
const scratchRenderRectangle = new Rectangle();

/**
 * Update the shape's state.
 *
 * @param {Matrix4} modelMatrix The model matrix.
 * @param {Cartesian3} minBounds The minimum bounds.
 * @param {Cartesian3} maxBounds The maximum bounds.
 * @param {Cartesian3} [clipMinBounds=VoxelEllipsoidShape.DefaultMinBounds] The minimum clip bounds.
 * @param {Cartesian3} [clipMaxBounds=VoxelEllipsoidShape.DefaultMaxBounds] The maximum clip bounds.
 * @returns {boolean} Whether the shape is visible.
 */
VoxelEllipsoidShape.prototype.update = function (
  modelMatrix,
  minBounds,
  maxBounds,
  clipMinBounds,
  clipMaxBounds
) {
  clipMinBounds = defaultValue(
    clipMinBounds,
    VoxelEllipsoidShape.DefaultMinBounds
  );
  clipMaxBounds = defaultValue(
    clipMaxBounds,
    VoxelEllipsoidShape.DefaultMaxBounds
  );
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  const defaultMinLongitude = VoxelEllipsoidShape.DefaultMinBounds.x;
  const defaultMaxLongitude = VoxelEllipsoidShape.DefaultMaxBounds.x;
  const defaultLongitudeRange = defaultMaxLongitude - defaultMinLongitude;
  const defaultLongitudeRangeHalf = 0.5 * defaultLongitudeRange;
  const defaultMinLatitude = VoxelEllipsoidShape.DefaultMinBounds.y;
  const defaultMaxLatitude = VoxelEllipsoidShape.DefaultMaxBounds.y;
  const defaultLatitudeRange = defaultMaxLatitude - defaultMinLatitude;

  const epsilonZeroScale = CesiumMath.EPSILON10;
  const epsilonLongitudeDiscontinuity = CesiumMath.EPSILON3; // 0.001 radians = 0.05729578 degrees
  const epsilonLongitude = CesiumMath.EPSILON10;
  const epsilonLatitude = CesiumMath.EPSILON10;
  const epsilonLatitudeFlat = CesiumMath.EPSILON3; // 0.001 radians = 0.05729578 degrees

  // Clamp shape and clipping bounds to valid ranges
  const { DefaultMinBounds, DefaultMaxBounds } = VoxelEllipsoidShape;
  // Don't let the height go below the center of the ellipsoid.
  const radii = Matrix4.getScale(modelMatrix, scratchScale);
  const actualMinBounds = Cartesian3.clone(DefaultMinBounds, new Cartesian3());
  actualMinBounds.z = -Cartesian3.minimumComponent(radii);

  const shapeMinBounds = Cartesian3.clamp(
    minBounds,
    actualMinBounds,
    DefaultMaxBounds,
    new Cartesian3()
  );
  const shapeMaxBounds = Cartesian3.clamp(
    minBounds,
    actualMinBounds,
    DefaultMaxBounds,
    new Cartesian3()
  );
  const clampedClipMinBounds = Cartesian3.clamp(
    clipMinBounds,
    actualMinBounds,
    DefaultMaxBounds,
    new Cartesian3()
  );
  const clampedClipMaxBounds = Cartesian3.clamp(
    clipMaxBounds,
    actualMinBounds,
    DefaultMaxBounds,
    new Cartesian3()
  );
  const renderMinBounds = Cartesian3.maximumByComponent(
    shapeMinBounds,
    clampedClipMinBounds,
    new Cartesian3()
  );
  const renderMaxBounds = Cartesian3.minimumByComponent(
    shapeMaxBounds,
    clampedClipMaxBounds,
    new Cartesian3()
  );

  // Compute the farthest a point can be from the center of the ellipsoid.
  const shapeOuterExtent = Cartesian3.add(
    radii,
    Cartesian3.fromElements(
      shapeMaxBounds.z,
      shapeMaxBounds.z,
      shapeMaxBounds.z,
      scratchShapeOuterExtent
    ),
    scratchShapeOuterExtent
  );
  const shapeMaxExtent = Cartesian3.maximumComponent(shapeOuterExtent);

  const renderOuterExtent = Cartesian3.add(
    radii,
    Cartesian3.fromElements(
      renderMaxBounds.z,
      renderMaxBounds.z,
      renderMaxBounds.z,
      scratchRenderOuterExtent
    ),
    scratchRenderOuterExtent
  );

  // Exit early if the shape is not visible.
  // Note that minLongitude may be greater than maxLongitude when crossing the 180th meridian.
  if (
    renderMinBounds.y > renderMaxBounds.y ||
    renderMinBounds.y === defaultMaxLatitude ||
    renderMaxBounds.y === defaultMinLatitude ||
    renderMinBounds.z > renderMaxBounds.z ||
    CesiumMath.equalsEpsilon(
      renderOuterExtent,
      Cartesian3.ZERO,
      undefined,
      epsilonZeroScale
    )
  ) {
    return false;
  }

  this._rectangle = Rectangle.fromRadians(
    shapeMinBounds.x,
    shapeMinBounds.y,
    shapeMaxBounds.x,
    shapeMaxBounds.y
  );
  this._translation = Matrix4.getTranslation(modelMatrix, this._translation);
  this._rotation = Matrix4.getRotation(modelMatrix, this._rotation);
  this._ellipsoid = Ellipsoid.fromCartesian3(radii, this._ellipsoid);
  this._minimumHeight = shapeMinBounds.z;
  this._maximumHeight = shapeMaxBounds.z;

  const renderRectangle = Rectangle.fromRadians(
    renderMinBounds.x,
    renderMinBounds.y,
    renderMaxBounds.x,
    renderMaxBounds.y,
    scratchRenderRectangle
  );

  this.orientedBoundingBox = getEllipsoidChunkObb(
    renderRectangle,
    renderMinBounds.z,
    renderMaxBounds.z,
    this._ellipsoid,
    this._translation,
    this._rotation,
    this.orientedBoundingBox
  );

  this.shapeTransform = Matrix4.fromRotationTranslation(
    Matrix3.setScale(this._rotation, shapeOuterExtent, scratchRotationScale),
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

  // Longitude
  const renderIsLongitudeReversed = renderMaxBounds.x < renderMinBounds.x;
  const renderLongitudeRange =
    renderMaxBounds.x -
    renderMinBounds.x +
    renderIsLongitudeReversed * defaultLongitudeRange;
  const renderIsLongitudeRangeZero = renderLongitudeRange <= epsilonLongitude;
  const renderIsLongitudeRangeUnderHalf =
    renderLongitudeRange >= defaultLongitudeRangeHalf - epsilonLongitude &&
    renderLongitudeRange < defaultLongitudeRange - epsilonLongitude;
  const renderIsLongitudeRangeOverHalf =
    renderLongitudeRange > epsilonLongitude &&
    renderLongitudeRange < defaultLongitudeRangeHalf - epsilonLongitude;
  const renderHasLongitude =
    renderIsLongitudeRangeZero ||
    renderIsLongitudeRangeUnderHalf ||
    renderIsLongitudeRangeOverHalf;

  const shapeIsLongitudeReversed = shapeMaxBounds.x < shapeMinBounds.x;
  const shapeLongitudeRange =
    shapeMaxBounds.x -
    shapeMinBounds.x +
    shapeIsLongitudeReversed * defaultLongitudeRange;
  const shapeIsLongitudeRangeZero = shapeLongitudeRange <= epsilonLongitude;
  const shapeIsLongitudeRangeUnderHalf =
    shapeLongitudeRange > defaultLongitudeRangeHalf + epsilonLongitude &&
    shapeLongitudeRange < defaultLongitudeRange - epsilonLongitude;
  const shapeIsLongitudeRangeHalf =
    shapeLongitudeRange >= defaultLongitudeRangeHalf - epsilonLongitude &&
    shapeLongitudeRange <= defaultLongitudeRangeHalf + epsilonLongitude;
  const shapeIsLongitudeRangeOverHalf =
    shapeLongitudeRange > epsilonLongitude &&
    shapeLongitudeRange < defaultLongitudeRangeHalf - epsilonLongitude;
  const shapeHasLongitude =
    shapeIsLongitudeRangeZero ||
    shapeIsLongitudeRangeUnderHalf ||
    shapeIsLongitudeRangeHalf ||
    shapeIsLongitudeRangeOverHalf;

  // Latitude
  const renderIsLatitudeMaxUnderHalf = renderMaxBounds.y < -epsilonLatitudeFlat;
  const renderIsLatitudeMaxHalf =
    renderMaxBounds.y >= -epsilonLatitudeFlat &&
    renderMaxBounds.y <= +epsilonLatitudeFlat;
  const renderIsLatitudeMaxOverHalf =
    renderMaxBounds.y > +epsilonLatitudeFlat &&
    renderMaxBounds.y < defaultMaxLatitude - epsilonLatitude;
  const renderHasLatitudeMax =
    renderIsLatitudeMaxUnderHalf ||
    renderIsLatitudeMaxHalf ||
    renderIsLatitudeMaxOverHalf;
  const renderIsLatitudeMinUnderHalf =
    renderMinBounds.y > defaultMinLatitude + epsilonLatitude &&
    renderMinBounds.y < -epsilonLatitudeFlat;
  const renderIsLatitudeMinHalf =
    renderMinBounds.y >= -epsilonLatitudeFlat &&
    renderMinBounds.y <= +epsilonLatitudeFlat;
  const renderIsLatitudeMinOverHalf = renderMinBounds.y > +epsilonLatitudeFlat;
  const renderHasLatitudeMin =
    renderIsLatitudeMinUnderHalf ||
    renderIsLatitudeMinHalf ||
    renderIsLatitudeMinOverHalf;
  const renderHasLatitude = renderHasLatitudeMax || renderHasLatitudeMin;

  const shapeLatitudeRange = shapeMaxBounds.y - shapeMinBounds.y;
  const shapeIsLatitudeMaxUnderHalf = shapeMaxBounds.y < -epsilonLatitudeFlat;
  const shapeIsLatitudeMaxHalf =
    shapeMaxBounds.y >= -epsilonLatitudeFlat &&
    shapeMaxBounds.y <= +epsilonLatitudeFlat;
  const shapeIsLatitudeMaxOverHalf =
    shapeMaxBounds.y > +epsilonLatitudeFlat &&
    shapeMaxBounds.y < defaultMaxLatitude - epsilonLatitude;
  const shapeHasLatitudeMax =
    shapeIsLatitudeMaxUnderHalf ||
    shapeIsLatitudeMaxHalf ||
    shapeIsLatitudeMaxOverHalf;
  const shapeIsLatitudeMinUnderHalf =
    shapeMinBounds.y > defaultMinLatitude + epsilonLatitude &&
    shapeMinBounds.y < -epsilonLatitudeFlat;
  const shapeIsLatitudeMinHalf =
    shapeMinBounds.y >= -epsilonLatitudeFlat &&
    shapeMinBounds.y <= +epsilonLatitudeFlat;
  const shapeIsLatitudeMinOverHalf = shapeMinBounds.y > +epsilonLatitudeFlat;
  const shapeHasLatitudeMin =
    shapeIsLatitudeMinUnderHalf ||
    shapeIsLatitudeMinHalf ||
    shapeIsLatitudeMinOverHalf;
  const shapeHasLatitude = shapeHasLatitudeMax || shapeHasLatitudeMin;

  const { shaderUniforms, shaderDefines } = this;

  // To keep things simple, clear the defines every time
  for (const key in shaderDefines) {
    if (shaderDefines.hasOwnProperty(key)) {
      shaderDefines[key] = undefined;
    }
  }

  // The ellipsoid radii scaled to [0,1]. The max ellipsoid radius will be 1.0 and others will be less.
  shaderUniforms.ellipsoidRadiiUv = Cartesian3.divideByScalar(
    shapeOuterExtent,
    shapeMaxExtent,
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

  // Keep track of how many intersections there are going to be.
  let intersectionCount = 0;

  // Intersect outer and innner ellipsoids for the max and min height.
  shaderDefines["ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX"] = intersectionCount;
  intersectionCount += 1;
  shaderDefines["ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MIN"] = intersectionCount;
  intersectionCount += 1;

  shaderUniforms.clipMinMaxHeight = Cartesian2.fromElements(
    (renderMinBounds.z - shapeMaxBounds.z) / shapeMaxExtent,
    (renderMaxBounds.z - shapeMaxBounds.z) / shapeMaxExtent,
    shaderUniforms.clipMinMaxHeight
  );

  // The percent of space that is between the inner and outer ellipsoid.
  const thickness = (shapeMaxBounds.z - shapeMinBounds.z) / shapeMaxExtent;
  shaderUniforms.ellipsoidInverseHeightDifferenceUv = 1.0 / thickness;
  shaderUniforms.ellipseInnerRadiiUv = Cartesian2.fromElements(
    shaderUniforms.ellipsoidRadiiUv.x * (1.0 - thickness),
    shaderUniforms.ellipsoidRadiiUv.z * (1.0 - thickness),
    shaderUniforms.ellipseInnerRadiiUv
  );
  if (shapeMinBounds.z === shapeMaxBounds.z) {
    shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT"] = true;
  }

  // Intersects a wedge for the min and max longitude.
  if (renderHasLongitude) {
    shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE"] = true;
    shaderDefines["ELLIPSOID_INTERSECTION_INDEX_LONGITUDE"] = intersectionCount;

    if (renderIsLongitudeRangeUnderHalf) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_UNDER_HALF"
      ] = true;
      intersectionCount += 1;
    } else if (renderIsLongitudeRangeOverHalf) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_OVER_HALF"
      ] = true;
      intersectionCount += 2;
    } else if (renderIsLongitudeRangeZero) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO"
      ] = true;
      intersectionCount += 2;
    }

    shaderUniforms.ellipsoidRenderLongitudeMinMax = Cartesian2.fromElements(
      renderMinBounds.x,
      renderMaxBounds.x,
      shaderUniforms.ellipsoidRenderLongitudeMinMax
    );
  }

  if (shapeHasLongitude) {
    shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE"] = true;

    const shapeIsLongitudeReversed = shapeMaxBounds.x < shapeMinBounds.x;

    if (shapeIsLongitudeReversed) {
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
    if (shapeLongitudeRange === 0.0) {
      shaderUniforms.ellipsoidUvToShapeUvLongitude = Cartesian2.fromElements(
        0.0,
        1.0,
        shaderUniforms.ellipsoidUvToShapeUvLongitude
      );
    } else {
      const scale = defaultLongitudeRange / shapeLongitudeRange;
      const offset =
        -(shapeMinBounds.x - defaultMinLongitude) / shapeLongitudeRange;
      shaderUniforms.ellipsoidUvToShapeUvLongitude = Cartesian2.fromElements(
        scale,
        offset,
        shaderUniforms.ellipsoidUvToShapeUvLongitude
      );
    }
  }

  if (renderHasLongitude) {
    const renderIsMinLongitudeDiscontinuity = CesiumMath.equalsEpsilon(
      renderMinBounds.x,
      defaultMinLongitude,
      undefined,
      epsilonLongitudeDiscontinuity
    );
    const renderIsMaxLongitudeDiscontinuity = CesiumMath.equalsEpsilon(
      renderMaxBounds.x,
      defaultMaxLongitude,
      undefined,
      epsilonLongitudeDiscontinuity
    );

    if (renderIsMinLongitudeDiscontinuity) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY"
      ] = true;
    }
    if (renderIsMaxLongitudeDiscontinuity) {
      shaderDefines[
        "ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY"
      ] = true;
    }
    const uvShapeMinLongitude =
      (shapeMinBounds.x - defaultMinLongitude) / defaultLongitudeRange;
    const uvShapeMaxLongitude =
      (shapeMaxBounds.x - defaultMinLongitude) / defaultLongitudeRange;

    const uvRenderMaxLongitude =
      (renderMaxBounds.x - defaultMinLongitude) / defaultLongitudeRange;
    const uvRenderLongitudeRangeZero =
      1.0 - renderLongitudeRange / defaultLongitudeRange;
    const uvRenderLongitudeRangeZeroMid =
      (uvRenderMaxLongitude + 0.5 * uvRenderLongitudeRangeZero) % 1.0;

    shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid = Cartesian3.fromElements(
      uvShapeMinLongitude,
      uvShapeMaxLongitude,
      uvRenderLongitudeRangeZeroMid,
      shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid
    );
  }

  if (renderHasLatitude) {
    // Intersects a cone for min latitude
    if (renderHasLatitudeMin) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN"] = true;
      shaderDefines[
        "ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN"
      ] = intersectionCount;

      if (renderIsLatitudeMinUnderHalf) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF"
        ] = true;
        intersectionCount += 1;
      } else if (renderIsLatitudeMinHalf) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF"
        ] = true;
        intersectionCount += 1;
      } else if (renderIsLatitudeMinOverHalf) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF"
        ] = true;
        intersectionCount += 2;
      }
    }

    // Intersects a cone for max latitude
    if (renderHasLatitudeMax) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX"] = true;
      shaderDefines[
        "ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX"
      ] = intersectionCount;

      if (renderIsLatitudeMaxUnderHalf) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF"
        ] = true;
        intersectionCount += 2;
      } else if (renderIsLatitudeMaxHalf) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF"
        ] = true;
        intersectionCount += 1;
      } else if (renderIsLatitudeMaxOverHalf) {
        shaderDefines[
          "ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF"
        ] = true;
        intersectionCount += 1;
      }
    }

    const minCosHalfAngle = Math.cos(
      CesiumMath.PI_OVER_TWO - renderMinBounds.y
    );
    const maxCosHalfAngle = Math.cos(
      CesiumMath.PI_OVER_TWO - renderMaxBounds.y
    );
    shaderUniforms.ellipsoidRenderLatitudeCosHalfMinMax = Cartesian2.fromElements(
      minCosHalfAngle,
      maxCosHalfAngle,
      shaderUniforms.ellipsoidRenderLatitudeCosHalfMinMax
    );
  }

  if (shapeHasLatitude) {
    shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE"] = true;

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
    if (shapeLatitudeRange === 0.0) {
      shaderUniforms.ellipsoidUvToShapeUvLatitude = Cartesian2.fromElements(
        0.0,
        1.0,
        shaderUniforms.ellipsoidUvToShapeUvLatitude
      );
    } else {
      const scale = defaultLatitudeRange / shapeLatitudeRange;
      const offset =
        (defaultMinLatitude - shapeMinBounds.y) / shapeLatitudeRange;
      shaderUniforms.ellipsoidUvToShapeUvLatitude = Cartesian2.fromElements(
        scale,
        offset,
        shaderUniforms.ellipsoidUvToShapeUvLatitude
      );
    }
  }

  this.shaderMaximumIntersectionsLength = intersectionCount;

  return true;
};

/**
 * Convert a position in model UV coordinates to shape UV coordinates:
 * longitude, latitude, and altitude, all expressed as numbers in [0,1]
 * where the endpoints of the interval correspond to the shape bounds
 *
 * @param {Cartesian3} positionUv The input position
 * @param {Cartesian3} result The object onto which to store the result
 * @returns {Cartesian3} The modified result parameter
 */
VoxelEllipsoidShape.prototype.convertUvToShapeUvSpace = function (
  positionUv,
  result
) {
  const { shaderUniforms, shaderDefines } = this;
  // Compute position and normal.
  // Convert positionUv [0,1] to local space [-1,+1] to "normalized" cartesian space [-a,+a] where a = (radii + height) / (max(radii) + height).
  // A point on the largest ellipsoid axis would be [-1,+1] and everything else would be smaller.
  const positionLocal = Cartesian3.multiplyByScalar(positionUv, 2.0);
  Cartesian3.add(positionLocal, new Cartesian3(1.0, 1.0, 1.0), positionLocal);
  const posEllipsoid = Cartesian3.multiplyComponents(
    positionLocal,
    shaderUniforms.ellipsoidRadiiUv
  );

  const { x, y, z } = shaderUniforms.ellipsoidRadiiUv;
  const ellipsoid = new Ellipsoid(x, y, z);
  const cartographic = Cartographic.fromCartesian(
    posEllipsoid,
    ellipsoid,
    new Cartographic()
  );

  // Compute longitude, shifted and scaled to the range [0, 1]
  let longitude = (cartographic.longitude + Math.PI) / (2.0 * Math.PI);
  // Correct the angle when max < min
  // Technically this should compare against min longitude - but it has precision problems so compare against the middle of empty space.
  if (shaderDefines.ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED) {
    longitude +=
      longitude < shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid.z;
  }

  // Avoid flickering from reading voxels from both sides of the -pi/+pi discontinuity.
  /*if (shaderDefines.ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY) {
    longitude =
      longitude > shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid.z
        ? shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid.x
        : longitude;
  }
  if (shaderDefines.ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY) {
    longitude =
      longitude < shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid.z
        ? shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid.y
        : longitude;
  }*/

  if (shaderDefines.ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE) {
    longitude =
      longitude * shaderUniforms.ellipsoidUvToShapeUvLongitude.x +
      shaderUniforms.ellipsoidUvToShapeUvLongitude.y;
  }

  // Compute latitude, shifted and scaled to the range [0, 1]
  let latitude = (cartographic.latitude + Math.PI / 2.0) / Math.PI;
  if (shaderDefines.ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE) {
    latitude =
      latitude * shaderUniforms.ellipsoidUvToShapeUvLatitude.x +
      shaderUniforms.ellipsoidUvToShapeUvLatitude.y;
  }

  // Compute height
  const height =
    cartographic.height * shaderUniforms.ellipsoidInverseHeightDifferenceUv;
  /*if (shaderDefines.ELLIPSOID_HAS_SHAPE_BOUNDS_HEIGHT_FLAT) {
    // TODO: This breaks down when minBounds == maxBounds. To fix it, this
    // function would have to know if ray is intersecting the front or back of the shape
    // and set the shape space position to 1 (front) or 0 (back) accordingly.
    height = 1.0;
  }*/

  return Cartesian3.fromElements(longitude, latitude, height, result);
};

const scratchRectangle = new Rectangle();

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
 * @returns {number} The step size.
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
 * @param {number} minHeight The minimumZ.
 * @param {number} maxHeight The maximumZ.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @param {Cartesian3} translation The translation applied to the shape
 * @param {Matrix3} rotation The rotation applied to the shape
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
VoxelEllipsoidShape.DefaultMinBounds = Object.freeze(
  new Cartesian3(-CesiumMath.PI, -CesiumMath.PI_OVER_TWO, -Number.MAX_VALUE)
);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum longitude, latitude, height.
 *
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelEllipsoidShape.DefaultMaxBounds = Object.freeze(
  new Cartesian3(+CesiumMath.PI, +CesiumMath.PI_OVER_TWO, +Number.MAX_VALUE)
);

export default VoxelEllipsoidShape;
