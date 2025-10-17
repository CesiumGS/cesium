import defined from "../Core/defined.js";
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
import Transforms from "../Core/Transforms.js";

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
  this._orientedBoundingBox = new OrientedBoundingBox();
  this._boundingSphere = new BoundingSphere();
  this._boundTransform = new Matrix4();
  this._shapeTransform = new Matrix4();

  /**
   * @type {Rectangle}
   * @private
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
   * @private
   */
  this._translation = new Cartesian3();

  /**
   * @type {Matrix3}
   * @private
   */
  this._rotation = new Matrix3();

  this._shaderUniforms = {
    cameraPositionCartographic: new Cartesian3(),
    ellipsoidEcToEastNorthUp: new Matrix3(),
    ellipsoidRadii: new Cartesian3(),
    eccentricitySquared: 0.0,
    evoluteScale: new Cartesian2(),
    ellipsoidCurvatureAtLatitude: new Cartesian2(),
    ellipsoidInverseRadiiSquared: new Cartesian3(),
    ellipsoidRenderLongitudeMinMax: new Cartesian2(),
    ellipsoidShapeUvLongitudeRangeOrigin: 0.0,
    ellipsoidShapeUvLongitudeMinMaxMid: new Cartesian3(),
    ellipsoidLocalToShapeUvLongitude: new Cartesian2(),
    ellipsoidLocalToShapeUvLatitude: new Cartesian2(),
    ellipsoidRenderLatitudeSinMinMax: new Cartesian2(),
    ellipsoidInverseHeightDifference: 0.0,
    clipMinMaxHeight: new Cartesian2(),
  };

  this._shaderDefines = {
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
    ELLIPSOID_INTERSECTION_INDEX_LONGITUDE: undefined,
    ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX: undefined,
    ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN: undefined,
    ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX: undefined,
    ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MIN: undefined,
  };

  this._shaderMaximumIntersectionsLength = 0; // not known until update
}

Object.defineProperties(VoxelEllipsoidShape.prototype, {
  /**
   * An oriented bounding box containing the bounded shape.
   *
   * @memberof VoxelEllipsoidShape.prototype
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
   * A bounding sphere containing the bounded shape.
   *
   * @memberof VoxelEllipsoidShape.prototype
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
   * @memberof VoxelEllipsoidShape.prototype
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
   * @memberof VoxelEllipsoidShape.prototype
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
   * @memberof VoxelEllipsoidShape.prototype
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
   * @memberof VoxelEllipsoidShape.prototype
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
   * @memberof VoxelEllipsoidShape.prototype
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

const scratchActualMinBounds = new Cartesian3();
const scratchShapeMinBounds = new Cartesian3();
const scratchShapeMaxBounds = new Cartesian3();
const scratchClipMinBounds = new Cartesian3();
const scratchClipMaxBounds = new Cartesian3();
const scratchRenderMinBounds = new Cartesian3();
const scratchRenderMaxBounds = new Cartesian3();
const scratchScale = new Cartesian3();
const scratchShapeOuterExtent = new Cartesian3();
const scratchRenderOuterExtent = new Cartesian3();
const scratchRenderRectangle = new Rectangle();

/**
 * Update the shape's state.
 * @private
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
  clipMaxBounds,
) {
  const { DefaultMinBounds, DefaultMaxBounds } = VoxelEllipsoidShape;
  clipMinBounds = clipMinBounds ?? DefaultMinBounds;
  clipMaxBounds = clipMaxBounds ?? DefaultMaxBounds;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("modelMatrix", modelMatrix);
  Check.typeOf.object("minBounds", minBounds);
  Check.typeOf.object("maxBounds", maxBounds);
  //>>includeEnd('debug');

  const epsilonZeroScale = CesiumMath.EPSILON10;
  const epsilonLongitudeDiscontinuity = CesiumMath.EPSILON3; // 0.001 radians = 0.05729578 degrees
  const epsilonLongitude = CesiumMath.EPSILON10;
  const epsilonLatitude = CesiumMath.EPSILON10;
  const epsilonLatitudeFlat = CesiumMath.EPSILON3; // 0.001 radians = 0.05729578 degrees

  // Don't let the height go below the center of the ellipsoid.
  const radii = Matrix4.getScale(modelMatrix, scratchScale);
  const actualMinBounds = Cartesian3.clone(
    DefaultMinBounds,
    scratchActualMinBounds,
  );
  actualMinBounds.z = -Cartesian3.minimumComponent(radii);

  const shapeMinBounds = Cartesian3.clamp(
    minBounds,
    actualMinBounds,
    DefaultMaxBounds,
    scratchShapeMinBounds,
  );
  const shapeMaxBounds = Cartesian3.clamp(
    maxBounds,
    actualMinBounds,
    DefaultMaxBounds,
    scratchShapeMaxBounds,
  );
  const clampedClipMinBounds = Cartesian3.clamp(
    clipMinBounds,
    actualMinBounds,
    DefaultMaxBounds,
    scratchClipMinBounds,
  );
  const clampedClipMaxBounds = Cartesian3.clamp(
    clipMaxBounds,
    actualMinBounds,
    DefaultMaxBounds,
    scratchClipMaxBounds,
  );
  const renderMinBounds = Cartesian3.maximumByComponent(
    shapeMinBounds,
    clampedClipMinBounds,
    scratchRenderMinBounds,
  );
  const renderMaxBounds = Cartesian3.minimumByComponent(
    shapeMaxBounds,
    clampedClipMaxBounds,
    scratchRenderMaxBounds,
  );

  // Compute the farthest a point can be from the center of the ellipsoid.
  const shapeOuterExtent = Cartesian3.add(
    radii,
    Cartesian3.fromElements(
      shapeMaxBounds.z,
      shapeMaxBounds.z,
      shapeMaxBounds.z,
      scratchShapeOuterExtent,
    ),
    scratchShapeOuterExtent,
  );

  const renderOuterExtent = Cartesian3.add(
    radii,
    Cartesian3.fromElements(
      renderMaxBounds.z,
      renderMaxBounds.z,
      renderMaxBounds.z,
      scratchRenderOuterExtent,
    ),
    scratchRenderOuterExtent,
  );

  // Exit early if the shape is not visible.
  // Note that minLongitude may be greater than maxLongitude when crossing the 180th meridian.
  if (
    renderMinBounds.y > renderMaxBounds.y ||
    renderMinBounds.y === DefaultMaxBounds.y ||
    renderMaxBounds.y === DefaultMinBounds.y ||
    renderMinBounds.z > renderMaxBounds.z ||
    CesiumMath.equalsEpsilon(
      renderOuterExtent,
      Cartesian3.ZERO,
      undefined,
      epsilonZeroScale,
    )
  ) {
    return false;
  }

  this._rectangle = Rectangle.fromRadians(
    shapeMinBounds.x,
    shapeMinBounds.y,
    shapeMaxBounds.x,
    shapeMaxBounds.y,
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
    scratchRenderRectangle,
  );

  this._orientedBoundingBox = getEllipsoidChunkObb(
    renderRectangle,
    renderMinBounds.z,
    renderMaxBounds.z,
    this._ellipsoid,
    this._translation,
    this._rotation,
    this._orientedBoundingBox,
  );

  this._shapeTransform = Matrix4.fromRotationTranslation(
    this._rotation,
    this._translation,
    this._shapeTransform,
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

  // Longitude
  const defaultLongitudeRange = DefaultMaxBounds.x - DefaultMinBounds.x;
  const defaultLongitudeRangeHalf = 0.5 * defaultLongitudeRange;
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
  const shapeIsLongitudeRangeUnderHalf =
    shapeLongitudeRange > defaultLongitudeRangeHalf + epsilonLongitude &&
    shapeLongitudeRange < defaultLongitudeRange - epsilonLongitude;
  const shapeIsLongitudeRangeHalf =
    shapeLongitudeRange >= defaultLongitudeRangeHalf - epsilonLongitude &&
    shapeLongitudeRange <= defaultLongitudeRangeHalf + epsilonLongitude;
  const shapeIsLongitudeRangeOverHalf =
    shapeLongitudeRange < defaultLongitudeRangeHalf - epsilonLongitude;
  const shapeHasLongitude =
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
    renderMaxBounds.y < DefaultMaxBounds.y - epsilonLatitude;
  const renderHasLatitudeMax =
    renderIsLatitudeMaxUnderHalf ||
    renderIsLatitudeMaxHalf ||
    renderIsLatitudeMaxOverHalf;
  const renderIsLatitudeMinUnderHalf =
    renderMinBounds.y > DefaultMinBounds.y + epsilonLatitude &&
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
    shapeMaxBounds.y < DefaultMaxBounds.y - epsilonLatitude;
  const shapeHasLatitudeMax =
    shapeIsLatitudeMaxUnderHalf ||
    shapeIsLatitudeMaxHalf ||
    shapeIsLatitudeMaxOverHalf;
  const shapeIsLatitudeMinUnderHalf =
    shapeMinBounds.y > DefaultMinBounds.y + epsilonLatitude &&
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

  const shaderUniforms = this._shaderUniforms;
  const shaderDefines = this._shaderDefines;

  // To keep things simple, clear the defines every time
  for (const key in shaderDefines) {
    if (shaderDefines.hasOwnProperty(key)) {
      shaderDefines[key] = undefined;
    }
  }

  shaderUniforms.ellipsoidRadii = Cartesian3.clone(
    shapeOuterExtent,
    shaderUniforms.ellipsoidRadii,
  );
  const { x: radiiX, z: radiiZ } = shaderUniforms.ellipsoidRadii;
  const axisRatio = radiiZ / radiiX;
  shaderUniforms.eccentricitySquared = 1.0 - axisRatio * axisRatio;
  shaderUniforms.evoluteScale = Cartesian2.fromElements(
    (radiiX * radiiX - radiiZ * radiiZ) / radiiX,
    (radiiZ * radiiZ - radiiX * radiiX) / radiiZ,
    shaderUniforms.evoluteScale,
  );

  // Used to compute geodetic surface normal.
  shaderUniforms.ellipsoidInverseRadiiSquared = Cartesian3.divideComponents(
    Cartesian3.ONE,
    Cartesian3.multiplyComponents(
      shaderUniforms.ellipsoidRadii,
      shaderUniforms.ellipsoidRadii,
      shaderUniforms.ellipsoidInverseRadiiSquared,
    ),
    shaderUniforms.ellipsoidInverseRadiiSquared,
  );

  // Keep track of how many intersections there are going to be.
  let intersectionCount = 0;

  // Intersects outer and inner ellipsoid for the max and min height.
  shaderDefines["ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MAX"] = intersectionCount;
  intersectionCount += 1;
  shaderDefines["ELLIPSOID_INTERSECTION_INDEX_HEIGHT_MIN"] = intersectionCount;
  intersectionCount += 1;

  shaderUniforms.clipMinMaxHeight = Cartesian2.fromElements(
    renderMinBounds.z - shapeMaxBounds.z,
    renderMaxBounds.z - shapeMaxBounds.z,
    shaderUniforms.clipMinMaxHeight,
  );

  // The percent of space that is between the inner and outer ellipsoid.
  const thickness = shapeMaxBounds.z - shapeMinBounds.z;
  shaderUniforms.ellipsoidInverseHeightDifference = 1.0 / thickness;
  if (shapeMinBounds.z === shapeMaxBounds.z) {
    shaderUniforms.ellipsoidInverseHeightDifference = 0.0;
  }

  // Intersects a wedge for the min and max longitude.
  if (renderHasLongitude) {
    shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE"] = true;
    shaderDefines["ELLIPSOID_INTERSECTION_INDEX_LONGITUDE"] = intersectionCount;

    if (renderIsLongitudeRangeUnderHalf) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_UNDER_HALF"] =
        true;
      intersectionCount += 1;
    } else if (renderIsLongitudeRangeOverHalf) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_OVER_HALF"] =
        true;
      intersectionCount += 2;
    } else if (renderIsLongitudeRangeZero) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_RANGE_EQUAL_ZERO"] =
        true;
      intersectionCount += 2;
    }

    shaderUniforms.ellipsoidRenderLongitudeMinMax = Cartesian2.fromElements(
      renderMinBounds.x,
      renderMaxBounds.x,
      shaderUniforms.ellipsoidRenderLongitudeMinMax,
    );
  }

  if (shapeHasLongitude) {
    shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE"] = true;

    const uvShapeMinLongitude =
      (shapeMinBounds.x - DefaultMinBounds.x) / defaultLongitudeRange;
    const uvShapeMaxLongitude =
      (shapeMaxBounds.x - DefaultMinBounds.x) / defaultLongitudeRange;
    const uvLongitudeRangeZero =
      1.0 - shapeLongitudeRange / defaultLongitudeRange;
    // Translate the origin of UV angles (in [0,1]) to the center of the unoccupied space
    const uvLongitudeRangeOrigin =
      (uvShapeMaxLongitude + 0.5 * uvLongitudeRangeZero) % 1.0;
    shaderUniforms.ellipsoidShapeUvLongitudeRangeOrigin =
      uvLongitudeRangeOrigin;

    const shapeIsLongitudeReversed = shapeMaxBounds.x < shapeMinBounds.x;
    if (shapeIsLongitudeReversed) {
      shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE_MIN_MAX_REVERSED"] =
        true;
    }

    if (shapeLongitudeRange <= epsilonLongitude) {
      shaderUniforms.ellipsoidLocalToShapeUvLongitude = Cartesian2.fromElements(
        0.0,
        1.0,
        shaderUniforms.ellipsoidLocalToShapeUvLongitude,
      );
    } else {
      const scale = defaultLongitudeRange / shapeLongitudeRange;
      const shiftedMinLongitude = uvShapeMinLongitude - uvLongitudeRangeOrigin;
      const offset =
        -scale * (shiftedMinLongitude - Math.floor(shiftedMinLongitude));
      shaderUniforms.ellipsoidLocalToShapeUvLongitude = Cartesian2.fromElements(
        scale,
        offset,
        shaderUniforms.ellipsoidLocalToShapeUvLongitude,
      );
    }
  }

  if (renderHasLongitude) {
    const renderIsMinLongitudeDiscontinuity = CesiumMath.equalsEpsilon(
      renderMinBounds.x,
      DefaultMinBounds.x,
      undefined,
      epsilonLongitudeDiscontinuity,
    );
    const renderIsMaxLongitudeDiscontinuity = CesiumMath.equalsEpsilon(
      renderMaxBounds.x,
      DefaultMaxBounds.x,
      undefined,
      epsilonLongitudeDiscontinuity,
    );

    if (renderIsMinLongitudeDiscontinuity) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MIN_DISCONTINUITY"] =
        true;
    }
    if (renderIsMaxLongitudeDiscontinuity) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LONGITUDE_MAX_DISCONTINUITY"] =
        true;
    }
    const uvShapeMinLongitude =
      (shapeMinBounds.x - DefaultMinBounds.x) / defaultLongitudeRange;
    const uvShapeMaxLongitude =
      (shapeMaxBounds.x - DefaultMinBounds.x) / defaultLongitudeRange;

    const uvRenderMaxLongitude =
      (renderMaxBounds.x - DefaultMinBounds.x) / defaultLongitudeRange;
    const uvRenderLongitudeRangeZero =
      1.0 - renderLongitudeRange / defaultLongitudeRange;
    const uvRenderLongitudeRangeZeroMid =
      (uvRenderMaxLongitude + 0.5 * uvRenderLongitudeRangeZero) % 1.0;

    shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid = Cartesian3.fromElements(
      uvShapeMinLongitude,
      uvShapeMaxLongitude,
      uvRenderLongitudeRangeZeroMid,
      shaderUniforms.ellipsoidShapeUvLongitudeMinMaxMid,
    );
  }

  if (renderHasLatitude) {
    // Intersects a cone for min latitude
    if (renderHasLatitudeMin) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN"] = true;
      shaderDefines["ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MIN"] =
        intersectionCount;

      if (renderIsLatitudeMinUnderHalf) {
        shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_UNDER_HALF"] =
          true;
        intersectionCount += 1;
      } else if (renderIsLatitudeMinHalf) {
        shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_EQUAL_HALF"] =
          true;
        intersectionCount += 1;
      } else if (renderIsLatitudeMinOverHalf) {
        shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MIN_OVER_HALF"] =
          true;
        intersectionCount += 2;
      }
    }

    // Intersects a cone for max latitude
    if (renderHasLatitudeMax) {
      shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX"] = true;
      shaderDefines["ELLIPSOID_INTERSECTION_INDEX_LATITUDE_MAX"] =
        intersectionCount;

      if (renderIsLatitudeMaxUnderHalf) {
        shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_UNDER_HALF"] =
          true;
        intersectionCount += 2;
      } else if (renderIsLatitudeMaxHalf) {
        shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_EQUAL_HALF"] =
          true;
        intersectionCount += 1;
      } else if (renderIsLatitudeMaxOverHalf) {
        shaderDefines["ELLIPSOID_HAS_RENDER_BOUNDS_LATITUDE_MAX_OVER_HALF"] =
          true;
        intersectionCount += 1;
      }
    }

    shaderUniforms.ellipsoidRenderLatitudeSinMinMax = Cartesian2.fromElements(
      Math.sin(renderMinBounds.y),
      Math.sin(renderMaxBounds.y),
      shaderUniforms.ellipsoidRenderLatitudeSinMinMax,
    );
  }

  if (shapeHasLatitude) {
    shaderDefines["ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE"] = true;

    if (shapeLatitudeRange < epsilonLatitude) {
      shaderUniforms.ellipsoidLocalToShapeUvLatitude = Cartesian2.fromElements(
        0.0,
        1.0,
        shaderUniforms.ellipsoidLocalToShapeUvLatitude,
      );
    } else {
      const defaultLatitudeRange = DefaultMaxBounds.y - DefaultMinBounds.y;
      const scale = defaultLatitudeRange / shapeLatitudeRange;
      const offset =
        (DefaultMinBounds.y - shapeMinBounds.y) / shapeLatitudeRange;
      shaderUniforms.ellipsoidLocalToShapeUvLatitude = Cartesian2.fromElements(
        scale,
        offset,
        shaderUniforms.ellipsoidLocalToShapeUvLatitude,
      );
    }
  }

  this._shaderMaximumIntersectionsLength = intersectionCount;

  return true;
};

const scratchCameraPositionCartographic = new Cartographic();
const surfacePositionScratch = new Cartesian3();
const enuTransformScratch = new Matrix4();
const enuRotationScratch = new Matrix3();
/**
 * Update any view-dependent transforms.
 * @private
 * @param {FrameState} frameState The frame state.
 */
VoxelEllipsoidShape.prototype.updateViewTransforms = function (frameState) {
  const shaderUniforms = this._shaderUniforms;
  const ellipsoid = this._ellipsoid;
  // TODO: incorporate modelMatrix or shapeTransform here?
  const cameraWC = frameState.camera.positionWC;
  const cameraPositionCartographic = ellipsoid.cartesianToCartographic(
    cameraWC,
    scratchCameraPositionCartographic,
  );
  Cartesian3.fromElements(
    cameraPositionCartographic.longitude,
    cameraPositionCartographic.latitude,
    cameraPositionCartographic.height,
    shaderUniforms.cameraPositionCartographic,
  );

  // TODO: incorporate modelMatrix here?
  const surfacePosition = Cartesian3.fromRadians(
    cameraPositionCartographic.longitude,
    cameraPositionCartographic.latitude,
    0.0,
    ellipsoid,
    surfacePositionScratch,
  );

  shaderUniforms.ellipsoidCurvatureAtLatitude = ellipsoid.getLocalCurvature(
    surfacePosition,
    shaderUniforms.ellipsoidCurvatureAtLatitude,
  );

  const enuToWorld = Transforms.eastNorthUpToFixedFrame(
    surfacePosition,
    ellipsoid,
    enuTransformScratch,
  );
  const rotateEnuToWorld = Matrix4.getRotation(enuToWorld, enuRotationScratch);
  const rotateWorldToView = frameState.context.uniformState.viewRotation;
  const rotateEnuToView = Matrix3.multiply(
    rotateWorldToView,
    rotateEnuToWorld,
    enuRotationScratch,
  );
  // Inverse is the transpose since it's a pure rotation.
  shaderUniforms.ellipsoidEcToEastNorthUp = Matrix3.transpose(
    rotateEnuToView,
    shaderUniforms.ellipsoidEcToEastNorthUp,
  );
};

const scratchRectangle = new Rectangle();

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
VoxelEllipsoidShape.prototype.computeOrientedBoundingBoxForTile = function (
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
    scratchRectangle,
  );

  const minHeight = CesiumMath.lerp(
    this._minimumHeight,
    this._maximumHeight,
    minHeightLerp,
  );

  const maxHeight = CesiumMath.lerp(
    this._minimumHeight,
    this._maximumHeight,
    maxHeightLerp,
  );

  return getEllipsoidChunkObb(
    rectangle,
    minHeight,
    maxHeight,
    this._ellipsoid,
    this._translation,
    this._rotation,
    result,
  );
};

const scratchQuadrantPosition = new Cartesian2();
const scratchInverseRadii = new Cartesian2();
const scratchEllipseTrigs = new Cartesian2();
const scratchEllipseGuess = new Cartesian2();
const scratchEvolute = new Cartesian2();
const scratchQ = new Cartesian2();

/**
 * Find the nearest point on an ellipse and its radius.
 * @param {Cartesian2} position
 * @param {Cartesian2} radii
 * @param {Cartesian2} evoluteScale
 * @param {Cartesian3} result The Cartesian3 to store the result in. .x and .y components contain the nearest point on the ellipse, .z contains the local radius of curvature.
 * @returns {Cartesian3} The nearest point on the ellipse and its radius.
 * @private
 */
function nearestPointAndRadiusOnEllipse(position, radii, evoluteScale, result) {
  // Map to the first quadrant
  const p = Cartesian2.abs(position, scratchQuadrantPosition);
  const inverseRadii = Cartesian2.fromElements(
    1.0 / radii.x,
    1.0 / radii.y,
    scratchInverseRadii,
  );
  // We describe the ellipse parametrically: v = radii * vec2(cos(t), sin(t))
  // but store the cos and sin of t in a vec2 for efficiency.
  // Initial guess: t = pi/4
  let tTrigs = Cartesian2.fromElements(
    Math.SQRT1_2,
    Math.SQRT1_2,
    scratchEllipseTrigs,
  );
  // TODO: too much duplication. Move v and evolute declarations inside loop?
  // Initial guess of point on ellipsoid
  let v = Cartesian2.multiplyComponents(radii, tTrigs, scratchEllipseGuess);
  // Center of curvature of the ellipse at v
  let evolute = Cartesian2.fromElements(
    evoluteScale.x * tTrigs.x * tTrigs.x * tTrigs.x,
    evoluteScale.y * tTrigs.y * tTrigs.y * tTrigs.y,
    scratchEvolute,
  );
  for (let i = 0; i < 3; ++i) {
    // Find the (approximate) intersection of p - evolute with the ellipsoid.
    const distance = Cartesian2.magnitude(
      Cartesian2.subtract(v, evolute, scratchQ),
    );
    const direction = Cartesian2.normalize(
      Cartesian2.subtract(p, evolute, scratchQ),
      scratchQ,
    );
    const q = Cartesian2.multiplyByScalar(direction, distance, scratchQ);
    // Update the estimate of t
    tTrigs = Cartesian2.multiplyComponents(
      Cartesian2.add(q, evolute, scratchEllipseTrigs),
      inverseRadii,
      scratchEllipseTrigs,
    );
    tTrigs = Cartesian2.normalize(
      Cartesian2.clamp(
        tTrigs,
        Cartesian2.ZERO,
        Cartesian2.ONE,
        scratchEllipseTrigs,
      ),
      scratchEllipseTrigs,
    );
    v = Cartesian2.multiplyComponents(radii, tTrigs, scratchEllipseGuess);
    evolute = Cartesian2.fromElements(
      evoluteScale.x * tTrigs.x * tTrigs.x * tTrigs.x,
      evoluteScale.y * tTrigs.y * tTrigs.y * tTrigs.y,
      scratchEvolute,
    );
  }

  // Map back to the original quadrant
  return Cartesian3.fromElements(
    Math.sign(position.x) * v.x,
    Math.sign(position.y) * v.y,
    Cartesian2.magnitude(Cartesian2.subtract(v, evolute, scratchQ)),
    result,
  );
}

const scratchEllipseRadii = new Cartesian2();
const scratchEllipsePosition = new Cartesian2();
const scratchSurfacePointAndRadius = new Cartesian3();
const scratchNormal2d = new Cartesian2();
/**
 * Convert a UV coordinate to the shape's UV space.
 * @private
 * @param {Cartesian3} positionLocal The local position to convert.
 * @param {Cartesian3} result The Cartesian3 to store the result in.
 * @returns {Cartesian3} The converted UV coordinate.
 */
VoxelEllipsoidShape.prototype.convertLocalToShapeUvSpace = function (
  positionLocal,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("positionLocal", positionLocal);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  let longitude = Math.atan2(positionLocal.y, positionLocal.x);

  const {
    ellipsoidRadii,
    evoluteScale,
    ellipsoidInverseRadiiSquared,
    ellipsoidInverseHeightDifference,
    ellipsoidShapeUvLongitudeRangeOrigin,
    ellipsoidLocalToShapeUvLongitude,
    ellipsoidLocalToShapeUvLatitude,
  } = this._shaderUniforms;

  const distanceFromZAxis = Math.hypot(positionLocal.x, positionLocal.y);
  const posEllipse = Cartesian2.fromElements(
    distanceFromZAxis,
    positionLocal.z,
    scratchEllipsePosition,
  );
  const surfacePointAndRadius = nearestPointAndRadiusOnEllipse(
    posEllipse,
    Cartesian2.fromElements(
      ellipsoidRadii.x,
      ellipsoidRadii.z,
      scratchEllipseRadii,
    ),
    evoluteScale,
    scratchSurfacePointAndRadius,
  );

  const normal2d = Cartesian2.normalize(
    Cartesian2.fromElements(
      surfacePointAndRadius.x * ellipsoidInverseRadiiSquared.x,
      surfacePointAndRadius.y * ellipsoidInverseRadiiSquared.z,
      scratchNormal2d,
    ),
    scratchNormal2d,
  );
  let latitude = Math.atan2(normal2d.y, normal2d.x);

  const heightSign =
    Cartesian2.magnitude(posEllipse) <
    Cartesian2.magnitude(surfacePointAndRadius)
      ? -1.0
      : 1.0;
  const heightVector = Cartesian2.subtract(
    posEllipse,
    surfacePointAndRadius,
    scratchEllipsePosition,
  );
  let height = heightSign * Cartesian2.magnitude(heightVector);

  const {
    ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE,
    ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE,
  } = this._shaderDefines;

  longitude = (longitude + Math.PI) / (2.0 * Math.PI);
  if (defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LONGITUDE)) {
    longitude -= ellipsoidShapeUvLongitudeRangeOrigin;
    longitude = longitude - Math.floor(longitude);
    // Scale and shift so [0, 1] covers the occupied space.
    longitude =
      longitude * ellipsoidLocalToShapeUvLongitude.x +
      ellipsoidLocalToShapeUvLongitude.y;
  }

  latitude = (latitude + Math.PI / 2.0) / Math.PI;
  if (defined(ELLIPSOID_HAS_SHAPE_BOUNDS_LATITUDE)) {
    // Scale and shift so [0, 1] covers the occupied space.
    latitude =
      latitude * ellipsoidLocalToShapeUvLatitude.x +
      ellipsoidLocalToShapeUvLatitude.y;
  }

  height = 1.0 + height * ellipsoidInverseHeightDifference;

  return Cartesian3.fromElements(longitude, latitude, height, result);
};

const sampleSizeScratch = new Cartesian3();
const scratchTileMinBounds = new Cartesian3();
const scratchTileMaxBounds = new Cartesian3();

/**
 * Computes an oriented bounding box for a specified sample within a specified tile.
 * @private
 * @param {SpatialNode} spatialNode The spatial node containing the sample
 * @param {Cartesian3} tileDimensions The size of the tile in number of samples, before padding
 * @param {Cartesian3} tileUv The sample coordinate within the tile
 * @param {OrientedBoundingBox} result The oriented bounding box that will be set to enclose the specified sample
 * @returns {OrientedBoundingBox} The oriented bounding box.
 */
VoxelEllipsoidShape.prototype.computeOrientedBoundingBoxForSample = function (
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

  const rectangle = Rectangle.subsection(
    this._rectangle,
    minLerp.x,
    minLerp.y,
    maxLerp.x,
    maxLerp.y,
    scratchRectangle,
  );
  const minHeight = CesiumMath.lerp(
    this._minimumHeight,
    this._maximumHeight,
    minLerp.z,
  );
  const maxHeight = CesiumMath.lerp(
    this._minimumHeight,
    this._maximumHeight,
    maxLerp.z,
  );

  return getEllipsoidChunkObb(
    rectangle,
    minHeight,
    maxHeight,
    this._ellipsoid,
    this._translation,
    this._rotation,
    result,
  );
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
  result,
) {
  result = OrientedBoundingBox.fromRectangle(
    rectangle,
    minHeight,
    maxHeight,
    ellipsoid,
    result,
  );
  result.center = Cartesian3.add(result.center, translation, result.center);
  result.halfAxes = Matrix3.multiply(
    result.halfAxes,
    rotation,
    result.halfAxes,
  );
  return result;
}

/**
 * Defines the minimum bounds of the shape. Corresponds to minimum longitude, latitude, height.
 * @private
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelEllipsoidShape.DefaultMinBounds = Object.freeze(
  new Cartesian3(
    -CesiumMath.PI,
    -CesiumMath.PI_OVER_TWO,
    -Ellipsoid.WGS84.minimumRadius,
  ),
);

/**
 * Defines the maximum bounds of the shape. Corresponds to maximum longitude, latitude, height.
 * @private
 * @type {Cartesian3}
 * @constant
 * @readonly
 */
VoxelEllipsoidShape.DefaultMaxBounds = Object.freeze(
  new Cartesian3(
    CesiumMath.PI,
    CesiumMath.PI_OVER_TWO,
    10.0 * Ellipsoid.WGS84.maximumRadius,
  ),
);

export default VoxelEllipsoidShape;
