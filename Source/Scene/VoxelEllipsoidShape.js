import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Ray from "../Core/Ray.js";
import Rectangle from "../Core/Rectangle.js";
import VoxelShapeType from "./VoxelShapeType.js";

/**
 * A {@link VoxelShape} for an ellipsoid.
 *
 * @alias VoxelEllipsoidShape
 * @constructor
 *
 * @param {Object} [options]
 * @param {Ellipsoid} [options.ellipsoid]
 * @param {Rectangle} [options.rectangle]
 * @param {Number} [options.minimumHeight]
 * @param {Number} [options.maximumHeight]
 * @param {Cartesian3} [options.translation]
 * @param {Cartesian3} [options.scale]
 * @param {Matrix3} [options.rotation]
 *
 * @see VoxelShape
 * @see VoxelShapeType
 */
function VoxelEllipsoidShape(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._ellipsoid = Ellipsoid.clone(
    defaultValue(options.ellipsoid, Ellipsoid.WGS84)
  );
  this._rectangle = Rectangle.clone(
    defaultValue(options.rectangle, Rectangle.MAX_VALUE)
  );
  this._minimumHeight = defaultValue(options.minimumHeight, 0.0);
  this._maximumHeight = defaultValue(options.maximumHeight, 1.0);
  this._translation = Cartesian3.clone(
    defaultValue(options.translation, Cartesian3.ZERO)
  );
  this._scale = Cartesian3.clone(defaultValue(options.scale, Cartesian3.ONE));
  this._rotation = Matrix3.clone(
    defaultValue(options.rotation, Matrix3.IDENTITY)
  );

  this._firstUpdate = true;
  this._ellipsoidOld = Ellipsoid.clone(this._ellipsoid);
  this._rectangleOld = Rectangle.clone(this._rectangle);
  this._minimumHeightOld = this._minimumHeight;
  this._maximumHeightOld = this._maximumHeight;
  this._translationOld = Cartesian3.clone(this._translation);
  this._scaleOld = Cartesian3.clone(this._scale);
  this._rotationOld = Matrix3.clone(this._rotation);

  this._boundTransform = Matrix4.clone(Matrix4.IDENTITY);
  this._shapeTransform = Matrix4.clone(Matrix4.IDENTITY);
  this._orientedBoundingBox = new OrientedBoundingBox();
  this._boundingSphere = new BoundingSphere();

  this._ellipsoidHeightDifferenceUv = 1.0;
  this._ellipsoidOuterRadiiLocal = new Cartesian3();
  this._ellipsoidLongitudeBounds = new Cartesian3();
  this._ellipsoidLatitudeBounds = new Cartesian3();

  this._type = VoxelShapeType.ELLIPSOID;

  this._phiMin = undefined;
  this._phiMax = undefined;
  this._thetaMin = undefined;
  this._thetaMax = undefined;
  setThetaAndPhiExtrema(this);
}

function setThetaAndPhiExtrema(that) {
  const rectangle = that.rectangle;
  // Converting from cartographic lat, lon, height to spherical theta, phi, and radius for math

  // phi is the angle with the x axis in the counter clockwise direction. It is like
  // longitude, but when it gets halfway around the globe, instead of going to negative
  // pi it continues to positive 2 pi. [0, 2pi]
  that._phiMin = rectangle.west;
  if (rectangle.west < 0) {
    // from [-pi, pi] to [0, 2pi]
    that._phiMin = CesiumMath.TWO_PI + rectangle.west;
  }
  that._phiMax = that._phiMin + rectangle.width;
  if (that._phiMax > CesiumMath.TWO_PI) {
    that._phiMax -= CesiumMath.TWO_PI;
  }

  // theta is angle from z axis to point. It is like latitude except zero is the north pole
  // and it increases as it points more and more south.
  // From [-pi/2, pi/2] centered on equator to [0, pi] from z axis. This swaps min/max
  that._thetaMin = CesiumMath.PI_OVER_TWO - rectangle.north;
  that._thetaMax = that._thetaMin + rectangle.height;
}

Object.defineProperties(VoxelEllipsoidShape.prototype, {
  /**
   * Gets or sets the ellipsoid.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("ellipsoid", value);
      //>>includeEnd('debug');

      this._ellipsoid = Ellipsoid.clone(value, this._translation);
    },
  },
  /**
   * Gets or sets the rectangle relative to the ellipsoid.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {Rectangle}
   */
  rectangle: {
    get: function () {
      return this._rectangle;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("rectangle", value);
      //>>includeEnd('debug');

      this._rectangle = Rectangle.clone(value, this._rectangle);
      setThetaAndPhiExtrema(this);
    },
  },
  /**
   * Gets or sets the minimum height relative to the ellipsoid surface.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {Number}
   */
  minimumHeight: {
    get: function () {
      return this._minimumHeight;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("minimumHeight", value);
      //>>includeEnd('debug');

      this._minimumHeight = value;
    },
  },
  /**
   * Gets or sets the maximum height relative to the ellipsoid surface.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {Number}
   */
  maximumHeight: {
    get: function () {
      return this._maximumHeight;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("maximumHeight", value);
      //>>includeEnd('debug');

      this._maximumHeight = value;
    },
  },
  /**
   * Gets or sets the translation.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {Cartesian3}
   */
  translation: {
    get: function () {
      return this._translation;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("translation", value);
      //>>includeEnd('debug');

      this._translation = Cartesian3.clone(value, this._translation);
    },
  },
  /**
   * Gets or sets the scale.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {Cartesian3}
   */
  scale: {
    get: function () {
      return this._scale;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("scale", value);
      //>>includeEnd('debug');

      this._scale = Cartesian3.clone(value, this._scale);
    },
  },
  /**
   * Gets or sets the rotation.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {Matrix3}
   */
  rotation: {
    get: function () {
      return this._rotation;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("rotation", value);
      //>>includeEnd('debug');

      this._rotation = Matrix3.clone(value, this._rotation);
    },
  },
  /**
   * Gets the bounding sphere.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      if (isDirty(this)) {
        computeTransforms(this);
      }
      return this._boundingSphere;
    },
  },
  /**
   * Gets the oriented bounding box.
   * @memberof VoxelEllipsoidShape.prototype
   * @type {OrientedBoundingBox}
   * @readonly
   */
  orientedBoundingBox: {
    get: function () {
      if (isDirty(this)) {
        computeTransforms(this);
      }
      return this._orientedBoundingBox;
    },
  },
});

VoxelEllipsoidShape.clone = function (shape, result) {
  if (!defined(shape)) {
    return undefined;
  }

  if (!defined(result)) {
    result = new VoxelEllipsoidShape();
  }

  result._minimumHeight = shape._minimumHeight;
  result._maximumHeight = shape._maximumHeight;
  result._ellipsoid = shape._ellipsoid;
  result._rectangle = shape._rectangle;

  result._translation = Cartesian3.clone(shape._translation);
  result._scale = Cartesian3.clone(shape._scale);
  result._rotation = Matrix3.clone(shape._rotation);

  result._firstUpdate = shape._firstUpdate;

  result._minimumHeightOld = shape._minimumHeightOld;
  result._maximumHeightOld = shape._maximumHeightOld;
  result._ellipsoidOld = shape._ellipsoidOld;
  result._rectangleOld = shape._rectangleOld;
  result._translationOld = Cartesian3.clone(shape._translationOld);
  result._scaleOld = Cartesian3.clone(shape._scaleOld);
  result._rotationOld = Matrix3.clone(shape._rotationOld);

  result._boundTransform = Matrix4.clone(shape._boundTransform);
  result._shapeTransform = Matrix4.clone(shape._shapeTransform);
  result._orientedBoundingBox = OrientedBoundingBox.clone(
    shape._orientedBoundingBox
  );
  result._boundingSphere = BoundingSphere.clone(shape._boundingSphere);

  result._type = shape._type;

  return result;
};

VoxelEllipsoidShape.prototype.clone = function (result) {
  return VoxelEllipsoidShape.clone(this, result);
};

const scratchScale = new Cartesian3();
const scratchOrientedBoundingBox = new OrientedBoundingBox();
const scratchRectangle = new Rectangle();

function isDirty(that) {
  const dirtyEllipsoid = !that._ellipsoid.equals(that._ellipsoidOld);
  const dirtyRectangle = !Rectangle.equals(that._rectangle, that._rectangleOld);
  const dirtyMinimumHeight = that._minimumHeight !== that._minimumHeightOld;
  const dirtyMaximumHeight = that._maximumHeight !== that._maximumHeightOld;
  const dirtyTranslation = !Cartesian3.equals(
    that._translation,
    that._translationOld
  );
  const dirtyScale = !Cartesian3.equals(that._scale, that._scaleOld);
  const dirtyRotation = !Matrix3.equals(that._rotation, that._rotationOld);

  return (
    that._firstUpdate ||
    dirtyEllipsoid ||
    dirtyRectangle ||
    dirtyMinimumHeight ||
    dirtyMaximumHeight ||
    dirtyTranslation ||
    dirtyScale ||
    dirtyRotation
  );
}

function computeTransforms(that) {
  const ellipsoid = that._ellipsoid;
  const minimumHeight = that._minimumHeight;
  const maximumHeight = that._maximumHeight;
  const rectangle = that._rectangle;

  const radii = ellipsoid.radii;
  const scaleX = 2.0 * (radii.x + maximumHeight);
  const scaleY = 2.0 * (radii.y + maximumHeight);
  const scaleZ = 2.0 * (radii.z + maximumHeight);
  const scale = Cartesian3.fromElements(scaleX, scaleY, scaleZ, scratchScale);

  that._shapeTransform = Matrix4.fromScale(scale, that._shapeTransform);

  if (rectangle.equals(Rectangle.MAX_VALUE)) {
    that._boundTransform = Matrix4.clone(
      that._shapeTransform,
      that._boundTransform
    );
  } else {
    // Convert the obb to a model matrix
    const obb = OrientedBoundingBox.fromRectangle(
      rectangle,
      minimumHeight,
      maximumHeight,
      ellipsoid,
      scratchOrientedBoundingBox
    );
    that._boundTransform = OrientedBoundingBox.computeTransformation(
      obb,
      that._boundTransform
    );
  }

  that._orientedBoundingBox = OrientedBoundingBox.fromTransformation(
    that._boundTransform,
    that._orientedBoundingBox
  );
  that._boundingSphere = BoundingSphere.fromTransformation(
    that._boundTransform,
    that._boundingSphere
  );

  const boundedWest = rectangle.west;
  const boundedEast = rectangle.east;
  const boundedSouth = rectangle.south;
  const boundedNorth = rectangle.north;
  const longitudeRange = rectangle.width;
  const latitudeRange = rectangle.height;

  const ellipsoidRadii = ellipsoid.radii;
  const ellipsoidMaximumRadius = ellipsoid.maximumRadius;
  that._ellipsoidHeightDifferenceUv =
    1.0 -
    (ellipsoidMaximumRadius + minimumHeight) /
      (ellipsoidMaximumRadius + maximumHeight);
  that._ellipsoidOuterRadiiLocal = Cartesian3.divideByScalar(
    ellipsoidRadii,
    ellipsoidMaximumRadius,
    that._ellipsoidOuterRadiiLocal
  );
  that._ellipsoidLongitudeBounds = Cartesian3.fromElements(
    boundedWest,
    boundedEast,
    longitudeRange,
    that._ellipsoidLongitudeBounds
  );
  that._ellipsoidLatitudeBounds = Cartesian3.fromElements(
    boundedSouth,
    boundedNorth,
    latitudeRange,
    that._ellipsoidLatitudeBounds
  );
}

VoxelEllipsoidShape.prototype.update = function () {
  if (isDirty(this)) {
    computeTransforms(this);
    this._firstUpdate = false;
    this._ellipsoidOld = Ellipsoid.clone(this._ellipsoid, this._ellipsoidOld);
    this._rectangleOld = Rectangle.clone(this._rectangle, this._rectangleOld);
    this._minimumHeightOld = this._minimumHeight;
    this._maximumHeightOld = this._maximumHeight;
    this._translationOld = Cartesian3.clone(
      this._translation,
      this._translationOld
    );
    this._scaleOld = Cartesian3.clone(this._scale, this._scaleOld);
    this._rotationOld = Matrix3.clone(this._rotation, this._rotationOld);
    return true;
  }

  return false;
};

VoxelEllipsoidShape.prototype.computeOrientedBoundingBoxForTile = function (
  tileLevel,
  tileX,
  tileY,
  tileZ,
  result
) {
  const ellipsoid = this._ellipsoid;
  const rectangle = this._rectangle;
  const minimumHeight = this._minimumHeight;
  const maximumHeight = this._maximumHeight;

  const sizeAtLevel = 1.0 / Math.pow(2, tileLevel);
  const tileMinimumHeight = CesiumMath.lerp(
    minimumHeight,
    maximumHeight,
    tileZ * sizeAtLevel
  );
  const tileMaximumHeight = CesiumMath.lerp(
    minimumHeight,
    maximumHeight,
    (tileZ + 1) * sizeAtLevel
  );

  const westLerp = tileX * sizeAtLevel;
  const eastLerp = (tileX + 1) * sizeAtLevel;
  const southLerp = tileY * sizeAtLevel;
  const northLerp = (tileY + 1) * sizeAtLevel;
  const tileRectangle = Rectangle.subsection(
    rectangle,
    westLerp,
    southLerp,
    eastLerp,
    northLerp,
    scratchRectangle
  );
  return OrientedBoundingBox.fromRectangle(
    tileRectangle,
    tileMinimumHeight,
    tileMaximumHeight,
    ellipsoid,
    result
  );
};

VoxelEllipsoidShape.prototype.computeApproximateStepSize = function (
  voxelDimensions
) {
  const ellipsoid = this._ellipsoid;
  const ellipsoidMaximumRadius = ellipsoid.maximumRadius;
  const minimumHeight = this._minimumHeight;
  const maximumHeight = this._maximumHeight;

  const shellToEllipsoidRatio =
    (maximumHeight - minimumHeight) / (ellipsoidMaximumRadius + maximumHeight);
  const stepSize = (0.5 * shellToEllipsoidRatio) / voxelDimensions.z;
  return stepSize;
};

const scratchSphericalMinima = new Cartesian3();
const scratchSphericalMaxima = new Cartesian3();
VoxelEllipsoidShape.prototype.localPointInsideShape = function (
  point,
  clippingMinimum,
  clippingMaximum
) {
  const pointUv = Cartesian3.multiplyByScalar(point, 2.0, new Cartesian3());
  const pointEllipsoidSpace = Cartesian3.multiplyComponents(
    pointUv,
    this._ellipsoidOuterRadiiLocal,
    new Cartesian3()
  ); // now we work as if the ellipsoid is a sphere

  getSphericalExtremaFromClippingExtrema(
    this,
    clippingMinimum,
    clippingMaximum,
    scratchSphericalMinima,
    scratchSphericalMaxima
  );
  return pointIsWithinClippingParameters(
    pointEllipsoidSpace,
    scratchSphericalMinima.z,
    scratchSphericalMaxima.z,
    scratchSphericalMinima.y,
    scratchSphericalMaxima.y,
    scratchSphericalMinima.x,
    scratchSphericalMaxima.x,
    this._ellipsoidLongitudeBounds
  );
};

VoxelEllipsoidShape.prototype.transformFromLocalToShapeSpace = function (
  localCartesian,
  result
) {
  const pos3D = new Cartesian3();
  pos3D.x = localCartesian.x * 2.0;
  pos3D.y = localCartesian.y * 2.0;
  pos3D.z = localCartesian.z * 2.0;
  const ellipsoidRadiiLocal = this._ellipsoidOuterRadiiLocal;
  Cartesian3.multiplyComponents(pos3D, ellipsoidRadiiLocal, pos3D);

  const cartographic = Ellipsoid.fromCartesian3(
    Cartesian3.fromElements(1.0, 1.0, 1.0)
  ).cartesianToCartographic(pos3D);
  let longitudeMin = this._ellipsoidLongitudeBounds.x;
  const longitudeMax = this._ellipsoidLongitudeBounds.y;
  const longitudeWidth = this._ellipsoidLongitudeBounds.z;

  const latitudeMin = this._ellipsoidLatitudeBounds.x;
  const latitudeWidth = this._ellipsoidLatitudeBounds.z;

  if (longitudeMin > longitudeMax) {
    longitudeMin -= CesiumMath.TWO_PI;
    if (cartographic.longitude > longitudeMax) {
      cartographic.longitude -= CesiumMath.TWO_PI;
    }
  }

  // normalize to be within min and max of ellipsoid slice
  const distMin = -this._ellipsoidHeightDifferenceUv;
  cartographic.longitude =
    (cartographic.longitude - longitudeMin) / longitudeWidth;
  cartographic.latitude = (cartographic.latitude - latitudeMin) / latitudeWidth;
  cartographic.height = (cartographic.height - distMin) / -distMin;
  result.x = cartographic.longitude;
  result.y = cartographic.latitude;
  result.z = cartographic.height;
  return result;
};

const scratchIntersectionTs = new Cartesian2();
VoxelEllipsoidShape.prototype.intersectRay = function (
  ray,
  clippingMinimum,
  clippingMaximum
) {
  if (!defined(clippingMinimum)) {
    clippingMinimum = Cartesian3.ZERO;
  }
  if (!defined(clippingMaximum)) {
    clippingMinimum = Cartesian3.fromElements(1.0, 1.0, 1.0);
  }

  const epsilon = CesiumMath.EPSILON6;

  getSphericalExtremaFromClippingExtrema(
    this,
    clippingMinimum,
    clippingMaximum,
    scratchSphericalMinima,
    scratchSphericalMaxima
  );
  const phiMinClipping = scratchSphericalMinima.x;
  const phiMaxClipping = scratchSphericalMaxima.x;
  const thetaMinClipping = scratchSphericalMinima.y;
  const thetaMaxClipping = scratchSphericalMaxima.y;
  const radiusMinClipping = scratchSphericalMinima.z;
  const radiusMaxClipping = scratchSphericalMaxima.z;

  // convert to ellipsoid space. This simplifies analytical solutions since in ellipsoid space we are working with a sphere.
  const ellipsoidRadiiLocal = this._ellipsoidOuterRadiiLocal;
  const origin = Cartesian3.multiplyComponents(
    ray.origin,
    ellipsoidRadiiLocal,
    new Cartesian3()
  );
  let direction = Cartesian3.multiplyComponents(
    ray.direction,
    ellipsoidRadiiLocal,
    new Cartesian3()
  );
  direction = Cartesian3.normalize(direction, direction);
  const rayEllipsoidSpace = new Ray(origin, direction);

  const a = Cartesian3.dot(direction, direction);
  const b = Cartesian3.dot(origin, direction);
  const originDot = Cartesian3.dot(origin, origin);

  let returnT = Number.MAX_VALUE;

  const tsOuter = findTsAtRadus(
    radiusMaxClipping,
    a,
    b,
    originDot,
    scratchIntersectionTs
  );

  const ellipsoidLongitudeBounds = this._ellipsoidLongitudeBounds;
  if (
    tsOuter.x >= 0.0 &&
    tIsWithinClippingPlanes(
      tsOuter.x,
      rayEllipsoidSpace,
      radiusMinClipping,
      radiusMaxClipping,
      thetaMinClipping,
      thetaMaxClipping,
      phiMinClipping,
      phiMaxClipping,
      ellipsoidLongitudeBounds
    )
  ) {
    returnT = tsOuter.x;
  }
  const tsInner = findTsAtRadus(
    radiusMinClipping,
    a,
    b,
    originDot,
    scratchIntersectionTs
  );
  if (
    tsInner.y >= 0.0 &&
    tIsWithinClippingPlanes(
      tsInner.y,
      rayEllipsoidSpace,
      radiusMinClipping,
      radiusMaxClipping,
      thetaMinClipping,
      thetaMaxClipping,
      phiMinClipping,
      phiMaxClipping,
      ellipsoidLongitudeBounds
    )
  ) {
    returnT = Math.min(returnT, tsInner.y);
  }

  const tPhiMinClipping = findTAtPhi(phiMinClipping, rayEllipsoidSpace);
  if (
    tPhiMinClipping >= 0 &&
    tIsWithinClippingPlanes(
      tPhiMinClipping,
      rayEllipsoidSpace,
      radiusMinClipping,
      radiusMaxClipping,
      thetaMinClipping,
      thetaMaxClipping,
      phiMinClipping,
      phiMaxClipping,
      ellipsoidLongitudeBounds
    )
  ) {
    returnT = Math.min(returnT, tPhiMinClipping);
  }
  const tPhiMaxClipping = findTAtPhi(phiMaxClipping, rayEllipsoidSpace);
  if (
    tPhiMinClipping >= 0 &&
    tIsWithinClippingPlanes(
      tPhiMaxClipping,
      rayEllipsoidSpace,
      radiusMinClipping,
      radiusMaxClipping,
      thetaMinClipping,
      thetaMaxClipping,
      phiMinClipping,
      phiMaxClipping,
      ellipsoidLongitudeBounds
    )
  ) {
    returnT = Math.min(returnT, tPhiMaxClipping);
  }

  if (phiMinClipping < phiMaxClipping) {
    const tPhiMinAbsolute = findTAtPhi(this._phiMin, rayEllipsoidSpace);
    if (
      tPhiMinClipping >= 0 &&
      tIsWithinClippingPlanes(
        tPhiMinAbsolute,
        rayEllipsoidSpace,
        radiusMinClipping,
        radiusMaxClipping,
        thetaMinClipping,
        thetaMaxClipping,
        phiMinClipping,
        phiMaxClipping,
        ellipsoidLongitudeBounds
      )
    ) {
      returnT = Math.min(returnT, tPhiMinAbsolute);
    }
    const tPhiMaxAbsolute = findTAtPhi(this._phiMax, rayEllipsoidSpace);
    if (
      tPhiMinAbsolute >= 0 &&
      tIsWithinClippingPlanes(
        tPhiMaxAbsolute,
        rayEllipsoidSpace,
        radiusMinClipping,
        radiusMaxClipping,
        thetaMinClipping,
        thetaMaxClipping,
        phiMinClipping,
        phiMaxClipping,
        ellipsoidLongitudeBounds
      )
    ) {
      returnT = Math.min(returnT, tPhiMaxAbsolute);
    }
  }

  const tsThetaMin = findTAtTheta(
    thetaMinClipping,
    rayEllipsoidSpace,
    scratchIntersectionTs
  );
  if (
    tsThetaMin.x >= 0.0 &&
    tIsWithinClippingPlanes(
      tsThetaMin.x,
      rayEllipsoidSpace,
      radiusMinClipping,
      radiusMaxClipping,
      thetaMinClipping,
      thetaMaxClipping,
      phiMinClipping,
      phiMaxClipping,
      ellipsoidLongitudeBounds
    )
  ) {
    returnT = Math.min(returnT, tsThetaMin.x);
  }
  if (
    tsThetaMin.y >= 0.0 &&
    tIsWithinClippingPlanes(
      tsThetaMin.y,
      rayEllipsoidSpace,
      radiusMinClipping,
      radiusMaxClipping,
      thetaMinClipping,
      thetaMaxClipping,
      phiMinClipping,
      phiMaxClipping,
      ellipsoidLongitudeBounds
    )
  ) {
    returnT = Math.min(returnT, tsThetaMin.y);
  }
  const tsThetaMax = findTAtTheta(
    thetaMaxClipping,
    rayEllipsoidSpace,
    scratchIntersectionTs
  );
  if (
    tsThetaMax.x >= 0.0 &&
    tIsWithinClippingPlanes(
      tsThetaMax.x,
      rayEllipsoidSpace,
      radiusMinClipping,
      radiusMaxClipping,
      thetaMinClipping,
      thetaMaxClipping,
      phiMinClipping,
      phiMaxClipping,
      ellipsoidLongitudeBounds
    )
  ) {
    returnT = Math.min(returnT, tsThetaMax.x);
  }
  if (
    tsThetaMax.y >= 0.0 &&
    tIsWithinClippingPlanes(
      tsThetaMax.y,
      rayEllipsoidSpace,
      radiusMinClipping,
      radiusMaxClipping,
      thetaMinClipping,
      thetaMaxClipping,
      phiMinClipping,
      phiMaxClipping,
      ellipsoidLongitudeBounds
    )
  ) {
    returnT = Math.min(returnT, tsThetaMax.y);
  }
  if (returnT === Number.MAX_VALUE) {
    return -1.0;
  }

  const intersection = Ray.getPoint(rayEllipsoidSpace, returnT);
  // transfor point to non ellipsoid space
  Cartesian3.divideComponents(intersection, ellipsoidRadiiLocal, intersection);
  // get t for non ellipsoid space
  let t;
  if (ray.direction.x !== 0) {
    t = (intersection.x - ray.origin.x) / ray.direction.x;
  } else if (ray.direction.y !== 0) {
    t = (intersection.y - ray.origin.y) / ray.direction.y;
  } else if (ray.direction.z !== 0) {
    t = (intersection.z - ray.origin.z) / ray.direction.z;
  }
  return t + epsilon;
};

function pointIsWithinClippingParameters(
  point,
  radiusMinClipping,
  radiusMaxClipping,
  thetaMinClipping,
  thetaMaxClipping,
  phiMinClipping,
  phiMaxClipping,
  ellipsoidLongitudeBounds
) {
  const radius = Math.sqrt(Cartesian3.dot(point, point));
  let phi = Math.atan2(point.y, point.x);
  if (phi < 0.0) {
    phi += CesiumMath.TWO_PI;
  }
  let theta = Math.atan(
    Math.abs(Math.sqrt(point.x * point.x + point.y * point.y) / point.z)
  );
  if (point.z < 0) {
    theta = CesiumMath.PI - theta;
  }

  let absolutePhiMin = ellipsoidLongitudeBounds.x;
  if (absolutePhiMin < 0.0) {
    absolutePhiMin += CesiumMath.TWO_PI;
  }
  let absolutePhiMax = ellipsoidLongitudeBounds.y;
  if (absolutePhiMax < 0.0) {
    absolutePhiMax += CesiumMath.TWO_PI;
  }
  let withinAbsolutePhiBounds = phi >= absolutePhiMin && phi <= absolutePhiMax;
  if (absolutePhiMin >= absolutePhiMax) {
    withinAbsolutePhiBounds = phi >= absolutePhiMin || phi <= absolutePhiMax;
  }
  let withinPhiRange = phi >= phiMinClipping && phi <= phiMaxClipping;
  if (phiMinClipping >= phiMaxClipping) {
    // wrap around zero
    withinPhiRange = phi >= phiMinClipping || phi <= phiMaxClipping;
  }
  return (
    radius >= radiusMinClipping &&
    radius <= radiusMaxClipping &&
    withinPhiRange &&
    withinAbsolutePhiBounds &&
    theta >= thetaMinClipping &&
    theta <= thetaMaxClipping
  );
}

/**
 * Takes the clipping minima and maxima and converts them to spherical minima and maxima
 * (phi in radians, theta in radians, radius) for the ellipsoid
 * @param {VoxelEllipsoidShape} that
 * @param {Cartesian3} clippingMinimum The minimum values for shape parameters that the shader renders. Shape space [0, 1].
 * @param {Cartesian3} clippingMaximum The minimum values for shape parameters that the shader renders. Shape space [0, 1].
 * @param {Cartesian3} sphericalMinimum Result parameter. The minimum values in unit sphere space. (phi [0, 2pi], theta [0, pi], radius [0, inf]).
 * @param {Cartesian3} sphericalMaximum Result parameter. The maximum values in unit sphere space. (phi [0, 2pi], theta [0, pi], radius [0, inf]).
 * @private
 */
function getSphericalExtremaFromClippingExtrema(
  that,
  clippingMinimum,
  clippingMaximum,
  sphericalMinimum,
  sphericalMaximum
) {
  const rectangle = that._rectangle;
  const phiWidth = rectangle.width;
  let phiMin = that._phiMin + phiWidth * clippingMinimum.x;
  if (phiMin >= CesiumMath.TWO_PI) {
    // wrap around zero
    phiMin -= CesiumMath.TWO_PI;
  }
  sphericalMinimum.x = phiMin;
  let phiMax = that._phiMin + phiWidth * clippingMaximum.x;
  if (phiMax >= CesiumMath.TWO_PI) {
    // wrap around zero
    phiMax -= CesiumMath.TWO_PI;
  }
  sphericalMaximum.x = phiMax;

  const thetaWidth = rectangle.height;
  sphericalMinimum.y = that._thetaMin + thetaWidth * (1 - clippingMaximum.y);
  sphericalMaximum.y = that._thetaMin + thetaWidth * (1 - clippingMinimum.y);

  const radiusWidth = that._ellipsoidHeightDifferenceUv;
  sphericalMinimum.z = 1.0 + (clippingMinimum.z - 1.0) * radiusWidth;
  sphericalMaximum.z = 1.0 + (clippingMaximum.z - 1.0) * radiusWidth;
}

/**
 * Get the ray parameter t of the intersection with a sphere of given radius
 * @param {Number} radius The radius of the sphere you are intersecting with
 * @param {Number} a The first coefficient of the quadratic equation that we are solving. This should be ray direction dot ray direction.
 * @param {Number} b The second coefficient of the quadratic equation that we are solving. This should be ray direction dot ray origin.
 * @param {Number} c The third coefficient of the quadratic equation that we are solving. This should be ray origin dot ray origin.
 * @param {Cartesian2} tsAtRadius Return parameter. The first intersection will be stored in x while the second will be stored in y.
 * @returns {Cartesian2} The return parameter tsAtRadius with the ts for the intersections in order first to second in x and y.
 * @private
 */
function findTsAtRadus(radius, a, b, c, tsAtRadius) {
  // no 2 in quadratic formula because it cancels out by taking 2 out of b
  c -= radius * radius;
  let discrim = b * b - a * c;
  tsAtRadius.x = -1.0;
  tsAtRadius.y = -1.0;
  if (discrim >= 0.0) {
    discrim = Math.sqrt(discrim);
    tsAtRadius.x = (-b - discrim) / a;
    tsAtRadius.y = (-b + discrim) / a;
  }
  return tsAtRadius;
}

const epsilon = CesiumMath.EPSILON6;
function tIsWithinClippingPlanes(
  t,
  ray,
  radiusMinClipping,
  radiusMaxClipping,
  thetaMinClipping,
  thetaMaxClipping,
  phiMinClipping,
  phiMaxClipping,
  ellipsoidLongitudeBounds
) {
  const intersectionPoint = Ray.getPoint(ray, t + epsilon);
  return pointIsWithinClippingParameters(
    intersectionPoint,
    radiusMinClipping,
    radiusMaxClipping,
    thetaMinClipping,
    thetaMaxClipping,
    phiMinClipping,
    phiMaxClipping,
    ellipsoidLongitudeBounds
  );
}

/**
 * Finds the ray parameter t for the intersection with a plane created by a constant phi and a ray
 * @param {Number} phi The angle that your want to intersect with. [0, 2pi]
 * @param {Ray} ray The ray you are intersecting
 * @returns {Number} The ray parameter that of the intersection of the ray and the angle phi
 * @private
 */
function findTAtPhi(phi, ray) {
  // tan(phi) = y/x, solve for t
  const tanPhi = Math.tan(phi);
  const origin = ray.origin;
  const numerator = tanPhi * origin.x - origin.y;
  const direction = ray.direction;
  const denominator = direction.y - tanPhi * direction.x;
  return numerator / denominator;
}

/**
 * Finds the ray parameters t for the intersections with a ray and the cone created by a constant theta angle
 * @param {Number} theta The theta angle that you want to intersect with. [0, pi]
 * @param {Ray} ray The ray you are intersecting
 * @param {Cartesian2} returnTs Return parameter. The first intersection will be stored in x while the second will be stored in y.
 * @returns {Cartesian2} The return parameter tsAtRadius with the ts for the intersections in order first to second in x and y.
 * @private
 */
function findTAtTheta(theta, ray, returnTs) {
  const d = ray.direction;
  const o = ray.origin;
  if (theta === CesiumMath.PI_OVER_TWO) {
    // intersect with z = 0
    const intersectionT = -o.z / d.z;
    returnTs.x = intersectionT;
    returnTs.y = intersectionT;
  } else {
    // tan(theta) = sqrt(x^2 + y^2) / z, solve for t
    const tanTheta = Math.tan(theta);
    const tan2Theta = tanTheta * tanTheta;
    const a = d.x * d.x + d.y * d.y - tan2Theta * d.z * d.z;
    const b = o.x * d.x + o.y * d.y - o.z * d.z * tan2Theta;
    const c = o.x * o.x + o.y * o.y - o.z * o.z * tan2Theta;
    let discrim = b * b - a * c;
    if (discrim >= 0.0) {
      discrim = Math.sqrt(discrim);
      returnTs.x = (-b - discrim) / a;
      returnTs.y = (-b + discrim) / a;
    }
  }
  return returnTs;
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

export default VoxelEllipsoidShape;
