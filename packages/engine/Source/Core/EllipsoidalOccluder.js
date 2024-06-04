import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import Rectangle from "./Rectangle.js";

/**
 * Determine whether or not other objects are visible or hidden behind the visible horizon defined by
 * an {@link Ellipsoid} and a camera position.  The ellipsoid is assumed to be located at the
 * origin of the coordinate system.  This class uses the algorithm described in the
 * {@link https://cesium.com/blog/2013/04/25/Horizon-culling/|Horizon Culling} blog post.
 *
 * @alias EllipsoidalOccluder
 *
 * @param {Ellipsoid} ellipsoid The ellipsoid to use as an occluder.
 * @param {Cartesian3} [cameraPosition] The coordinate of the viewer/camera.  If this parameter is not
 *        specified, {@link EllipsoidalOccluder#cameraPosition} must be called before
 *        testing visibility.
 *
 * @constructor
 *
 * @example
 * // Construct an ellipsoidal occluder with radii 1.0, 1.1, and 0.9.
 * const cameraPosition = new Cesium.Cartesian3(5.0, 6.0, 7.0);
 * const occluderEllipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
 * const occluder = new Cesium.EllipsoidalOccluder(occluderEllipsoid, cameraPosition);
 *
 * @private
 */
function EllipsoidalOccluder(ellipsoid, cameraPosition) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("ellipsoid", ellipsoid);
  //>>includeEnd('debug');

  this._ellipsoid = ellipsoid;
  this._cameraPosition = new Cartesian3();
  this._cameraPositionInScaledSpace = new Cartesian3();
  this._distanceToLimbInScaledSpaceSquared = 0.0;

  // cameraPosition fills in the above values
  if (defined(cameraPosition)) {
    this.cameraPosition = cameraPosition;
  }
}

Object.defineProperties(EllipsoidalOccluder.prototype, {
  /**
   * Gets the occluding ellipsoid.
   * @memberof EllipsoidalOccluder.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },
  /**
   * Gets or sets the position of the camera.
   * @memberof EllipsoidalOccluder.prototype
   * @type {Cartesian3}
   */
  cameraPosition: {
    get: function () {
      return this._cameraPosition;
    },
    set: function (cameraPosition) {
      // See https://cesium.com/blog/2013/04/25/Horizon-culling/
      const ellipsoid = this._ellipsoid;
      const cv = ellipsoid.transformPositionToScaledSpace(
        cameraPosition,
        this._cameraPositionInScaledSpace
      );
      const vhMagnitudeSquared = Cartesian3.magnitudeSquared(cv) - 1.0;

      Cartesian3.clone(cameraPosition, this._cameraPosition);
      this._cameraPositionInScaledSpace = cv;
      this._distanceToLimbInScaledSpaceSquared = vhMagnitudeSquared;
    },
  },
});

const scratchCartesian = new Cartesian3();

/**
 * Determines whether or not a point, the <code>occludee</code>, is hidden from view by the occluder.
 *
 * @param {Cartesian3} occludee The point to test for visibility.
 * @returns {boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
 *
 * @example
 * const cameraPosition = new Cesium.Cartesian3(0, 0, 2.5);
 * const ellipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
 * const occluder = new Cesium.EllipsoidalOccluder(ellipsoid, cameraPosition);
 * const point = new Cesium.Cartesian3(0, -3, -3);
 * occluder.isPointVisible(point); //returns true
 */
EllipsoidalOccluder.prototype.isPointVisible = function (occludee) {
  const ellipsoid = this._ellipsoid;
  const occludeeScaledSpacePosition = ellipsoid.transformPositionToScaledSpace(
    occludee,
    scratchCartesian
  );
  return isScaledSpacePointVisible(
    occludeeScaledSpacePosition,
    this._cameraPositionInScaledSpace,
    this._distanceToLimbInScaledSpaceSquared
  );
};

/**
 * Determines whether or not a point expressed in the ellipsoid scaled space, is hidden from view by the
 * occluder.  To transform a Cartesian X, Y, Z position in the coordinate system aligned with the ellipsoid
 * into the scaled space, call {@link Ellipsoid#transformPositionToScaledSpace}.
 *
 * @param {Cartesian3} occludeeScaledSpacePosition The point to test for visibility, represented in the scaled space.
 * @returns {boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
 *
 * @example
 * const cameraPosition = new Cesium.Cartesian3(0, 0, 2.5);
 * const ellipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
 * const occluder = new Cesium.EllipsoidalOccluder(ellipsoid, cameraPosition);
 * const point = new Cesium.Cartesian3(0, -3, -3);
 * const scaledSpacePoint = ellipsoid.transformPositionToScaledSpace(point);
 * occluder.isScaledSpacePointVisible(scaledSpacePoint); //returns true
 */
EllipsoidalOccluder.prototype.isScaledSpacePointVisible = function (
  occludeeScaledSpacePosition
) {
  return isScaledSpacePointVisible(
    occludeeScaledSpacePosition,
    this._cameraPositionInScaledSpace,
    this._distanceToLimbInScaledSpaceSquared
  );
};

const scratchCameraPositionInScaledSpaceShrunk = new Cartesian3();

/**
 * Similar to {@link EllipsoidalOccluder#isScaledSpacePointVisible} except tests against an
 * ellipsoid that has been shrunk by the minimum height when the minimum height is below
 * the ellipsoid. This is intended to be used with points generated by
 * {@link EllipsoidalOccluder#computeHorizonCullingPointPossiblyUnderEllipsoid} or
 * {@link EllipsoidalOccluder#computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid}.
 *
 * @param {Cartesian3} occludeeScaledSpacePosition The point to test for visibility, represented in the scaled space of the possibly-shrunk ellipsoid.
 * @returns {boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
 */
EllipsoidalOccluder.prototype.isScaledSpacePointVisiblePossiblyUnderEllipsoid = function (
  occludeeScaledSpacePosition,
  minimumHeight
) {
  const ellipsoid = this._ellipsoid;
  let vhMagnitudeSquared;
  let cv;

  if (
    defined(minimumHeight) &&
    minimumHeight < 0.0 &&
    ellipsoid.minimumRadius > -minimumHeight
  ) {
    // This code is similar to the cameraPosition setter, but unrolled for performance because it will be called a lot.
    cv = scratchCameraPositionInScaledSpaceShrunk;
    cv.x = this._cameraPosition.x / (ellipsoid.radii.x + minimumHeight);
    cv.y = this._cameraPosition.y / (ellipsoid.radii.y + minimumHeight);
    cv.z = this._cameraPosition.z / (ellipsoid.radii.z + minimumHeight);
    vhMagnitudeSquared = cv.x * cv.x + cv.y * cv.y + cv.z * cv.z - 1.0;
  } else {
    cv = this._cameraPositionInScaledSpace;
    vhMagnitudeSquared = this._distanceToLimbInScaledSpaceSquared;
  }

  return isScaledSpacePointVisible(
    occludeeScaledSpacePosition,
    cv,
    vhMagnitudeSquared
  );
};

/**
 * Computes a point that can be used for horizon culling from a list of positions.  If the point is below
 * the horizon, all of the positions are guaranteed to be below the horizon as well.  The returned point
 * is expressed in the ellipsoid-scaled space and is suitable for use with
 * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
 *
 * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
 *                     A reasonable direction to use is the direction from the center of the ellipsoid to
 *                     the center of the bounding sphere computed from the positions.  The direction need not
 *                     be normalized.
 * @param {Cartesian3[]} positions The positions from which to compute the horizon culling point.  The positions
 *                       must be expressed in a reference frame centered at the ellipsoid and aligned with the
 *                       ellipsoid's axes.
 * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
 * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
 */
EllipsoidalOccluder.prototype.computeHorizonCullingPoint = function (
  directionToPoint,
  positions,
  result
) {
  return computeHorizonCullingPointFromPositions(
    this._ellipsoid,
    directionToPoint,
    positions,
    result
  );
};

const scratchEllipsoidShrunk = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);

/**
 * Similar to {@link EllipsoidalOccluder#computeHorizonCullingPoint} except computes the culling
 * point relative to an ellipsoid that has been shrunk by the minimum height when the minimum height is below
 * the ellipsoid. The returned point is expressed in the possibly-shrunk ellipsoid-scaled space and is suitable
 * for use with {@link EllipsoidalOccluder#isScaledSpacePointVisiblePossiblyUnderEllipsoid}.
 *
 * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
 *                     A reasonable direction to use is the direction from the center of the ellipsoid to
 *                     the center of the bounding sphere computed from the positions.  The direction need not
 *                     be normalized.
 * @param {Cartesian3[]} positions The positions from which to compute the horizon culling point.  The positions
 *                       must be expressed in a reference frame centered at the ellipsoid and aligned with the
 *                       ellipsoid's axes.
 * @param {number} [minimumHeight] The minimum height of all positions. If this value is undefined, all positions are assumed to be above the ellipsoid.
 * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
 * @returns {Cartesian3} The computed horizon culling point, expressed in the possibly-shrunk ellipsoid-scaled space.
 */
EllipsoidalOccluder.prototype.computeHorizonCullingPointPossiblyUnderEllipsoid = function (
  directionToPoint,
  positions,
  minimumHeight,
  result
) {
  const possiblyShrunkEllipsoid = getPossiblyShrunkEllipsoid(
    this._ellipsoid,
    minimumHeight,
    scratchEllipsoidShrunk
  );
  return computeHorizonCullingPointFromPositions(
    possiblyShrunkEllipsoid,
    directionToPoint,
    positions,
    result
  );
};
/**
 * Computes a point that can be used for horizon culling from a list of positions.  If the point is below
 * the horizon, all of the positions are guaranteed to be below the horizon as well.  The returned point
 * is expressed in the ellipsoid-scaled space and is suitable for use with
 * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
 *
 * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
 *                     A reasonable direction to use is the direction from the center of the ellipsoid to
 *                     the center of the bounding sphere computed from the positions.  The direction need not
 *                     be normalized.
 * @param {number[]} vertices  The vertices from which to compute the horizon culling point.  The positions
 *                   must be expressed in a reference frame centered at the ellipsoid and aligned with the
 *                   ellipsoid's axes.
 * @param {number} [stride=3]
 * @param {Cartesian3} [center=Cartesian3.ZERO]
 * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
 * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
 */
EllipsoidalOccluder.prototype.computeHorizonCullingPointFromVertices = function (
  directionToPoint,
  vertices,
  stride,
  center,
  result
) {
  return computeHorizonCullingPointFromVertices(
    this._ellipsoid,
    directionToPoint,
    vertices,
    stride,
    center,
    result
  );
};

/**
 * Similar to {@link EllipsoidalOccluder#computeHorizonCullingPointFromVertices} except computes the culling
 * point relative to an ellipsoid that has been shrunk by the minimum height when the minimum height is below
 * the ellipsoid. The returned point is expressed in the possibly-shrunk ellipsoid-scaled space and is suitable
 * for use with {@link EllipsoidalOccluder#isScaledSpacePointVisiblePossiblyUnderEllipsoid}.
 *
 * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
 *                     A reasonable direction to use is the direction from the center of the ellipsoid to
 *                     the center of the bounding sphere computed from the positions.  The direction need not
 *                     be normalized.
 * @param {number[]} vertices  The vertices from which to compute the horizon culling point.  The positions
 *                   must be expressed in a reference frame centered at the ellipsoid and aligned with the
 *                   ellipsoid's axes.
 * @param {number} [stride=3]
 * @param {Cartesian3} [center=Cartesian3.ZERO]
 * @param {number} [minimumHeight] The minimum height of all vertices. If this value is undefined, all vertices are assumed to be above the ellipsoid.
 * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
 * @returns {Cartesian3} The computed horizon culling point, expressed in the possibly-shrunk ellipsoid-scaled space.
 */
EllipsoidalOccluder.prototype.computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid = function (
  directionToPoint,
  vertices,
  stride,
  center,
  minimumHeight,
  result
) {
  const possiblyShrunkEllipsoid = getPossiblyShrunkEllipsoid(
    this._ellipsoid,
    minimumHeight,
    scratchEllipsoidShrunk
  );
  return computeHorizonCullingPointFromVertices(
    possiblyShrunkEllipsoid,
    directionToPoint,
    vertices,
    stride,
    center,
    result
  );
};

const subsampleScratch = [];

/**
 * Computes a point that can be used for horizon culling of a rectangle.  If the point is below
 * the horizon, the ellipsoid-conforming rectangle is guaranteed to be below the horizon as well.
 * The returned point is expressed in the ellipsoid-scaled space and is suitable for use with
 * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
 *
 * @param {Rectangle} rectangle The rectangle for which to compute the horizon culling point.
 * @param {Ellipsoid} ellipsoid The ellipsoid on which the rectangle is defined.  This may be different from
 *                    the ellipsoid used by this instance for occlusion testing.
 * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
 * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
 */
EllipsoidalOccluder.prototype.computeHorizonCullingPointFromRectangle = function (
  rectangle,
  ellipsoid,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  const positions = Rectangle.subsample(
    rectangle,
    ellipsoid,
    0.0,
    subsampleScratch
  );
  const bs = BoundingSphere.fromPoints(positions);

  // If the bounding sphere center is too close to the center of the occluder, it doesn't make
  // sense to try to horizon cull it.
  if (Cartesian3.magnitude(bs.center) < 0.1 * ellipsoid.minimumRadius) {
    return undefined;
  }

  return this.computeHorizonCullingPoint(bs.center, positions, result);
};

const scratchEllipsoidShrunkRadii = new Cartesian3();

function getPossiblyShrunkEllipsoid(ellipsoid, minimumHeight, result) {
  if (
    defined(minimumHeight) &&
    minimumHeight < 0.0 &&
    ellipsoid.minimumRadius > -minimumHeight
  ) {
    const ellipsoidShrunkRadii = Cartesian3.fromElements(
      ellipsoid.radii.x + minimumHeight,
      ellipsoid.radii.y + minimumHeight,
      ellipsoid.radii.z + minimumHeight,
      scratchEllipsoidShrunkRadii
    );
    ellipsoid = Ellipsoid.fromCartesian3(ellipsoidShrunkRadii, result);
  }
  return ellipsoid;
}

function computeHorizonCullingPointFromPositions(
  ellipsoid,
  directionToPoint,
  positions,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("directionToPoint", directionToPoint);
  Check.defined("positions", positions);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(
    ellipsoid,
    directionToPoint
  );
  let resultMagnitude = 0.0;

  for (let i = 0, len = positions.length; i < len; ++i) {
    const position = positions[i];
    const candidateMagnitude = computeMagnitude(
      ellipsoid,
      position,
      scaledSpaceDirectionToPoint
    );
    if (candidateMagnitude < 0.0) {
      // all points should face the same direction, but this one doesn't, so return undefined
      return undefined;
    }
    resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
  }

  return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result);
}

const positionScratch = new Cartesian3();

function computeHorizonCullingPointFromVertices(
  ellipsoid,
  directionToPoint,
  vertices,
  stride,
  center,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("directionToPoint", directionToPoint);
  Check.defined("vertices", vertices);
  Check.typeOf.number("stride", stride);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  stride = defaultValue(stride, 3);
  center = defaultValue(center, Cartesian3.ZERO);
  const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(
    ellipsoid,
    directionToPoint
  );
  let resultMagnitude = 0.0;

  for (let i = 0, len = vertices.length; i < len; i += stride) {
    positionScratch.x = vertices[i] + center.x;
    positionScratch.y = vertices[i + 1] + center.y;
    positionScratch.z = vertices[i + 2] + center.z;

    const candidateMagnitude = computeMagnitude(
      ellipsoid,
      positionScratch,
      scaledSpaceDirectionToPoint
    );
    if (candidateMagnitude < 0.0) {
      // all points should face the same direction, but this one doesn't, so return undefined
      return undefined;
    }
    resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
  }

  return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result);
}

function isScaledSpacePointVisible(
  occludeeScaledSpacePosition,
  cameraPositionInScaledSpace,
  distanceToLimbInScaledSpaceSquared
) {
  // See https://cesium.com/blog/2013/04/25/Horizon-culling/
  const cv = cameraPositionInScaledSpace;
  const vhMagnitudeSquared = distanceToLimbInScaledSpaceSquared;
  const vt = Cartesian3.subtract(
    occludeeScaledSpacePosition,
    cv,
    scratchCartesian
  );
  const vtDotVc = -Cartesian3.dot(vt, cv);
  // If vhMagnitudeSquared < 0 then we are below the surface of the ellipsoid and
  // in this case, set the culling plane to be on V.
  const isOccluded =
    vhMagnitudeSquared < 0
      ? vtDotVc > 0
      : vtDotVc > vhMagnitudeSquared &&
        (vtDotVc * vtDotVc) / Cartesian3.magnitudeSquared(vt) >
          vhMagnitudeSquared;
  return !isOccluded;
}

const scaledSpaceScratch = new Cartesian3();
const directionScratch = new Cartesian3();

function computeMagnitude(ellipsoid, position, scaledSpaceDirectionToPoint) {
  const scaledSpacePosition = ellipsoid.transformPositionToScaledSpace(
    position,
    scaledSpaceScratch
  );
  let magnitudeSquared = Cartesian3.magnitudeSquared(scaledSpacePosition);
  let magnitude = Math.sqrt(magnitudeSquared);
  const direction = Cartesian3.divideByScalar(
    scaledSpacePosition,
    magnitude,
    directionScratch
  );

  // For the purpose of this computation, points below the ellipsoid are consider to be on it instead.
  magnitudeSquared = Math.max(1.0, magnitudeSquared);
  magnitude = Math.max(1.0, magnitude);

  const cosAlpha = Cartesian3.dot(direction, scaledSpaceDirectionToPoint);
  const sinAlpha = Cartesian3.magnitude(
    Cartesian3.cross(direction, scaledSpaceDirectionToPoint, direction)
  );
  const cosBeta = 1.0 / magnitude;
  const sinBeta = Math.sqrt(magnitudeSquared - 1.0) * cosBeta;

  return 1.0 / (cosAlpha * cosBeta - sinAlpha * sinBeta);
}

function magnitudeToPoint(
  scaledSpaceDirectionToPoint,
  resultMagnitude,
  result
) {
  // The horizon culling point is undefined if there were no positions from which to compute it,
  // the directionToPoint is pointing opposite all of the positions,  or if we computed NaN or infinity.
  if (
    resultMagnitude <= 0.0 ||
    resultMagnitude === 1.0 / 0.0 ||
    resultMagnitude !== resultMagnitude
  ) {
    return undefined;
  }

  return Cartesian3.multiplyByScalar(
    scaledSpaceDirectionToPoint,
    resultMagnitude,
    result
  );
}

const directionToPointScratch = new Cartesian3();

function computeScaledSpaceDirectionToPoint(ellipsoid, directionToPoint) {
  if (Cartesian3.equals(directionToPoint, Cartesian3.ZERO)) {
    return directionToPoint;
  }

  ellipsoid.transformPositionToScaledSpace(
    directionToPoint,
    directionToPointScratch
  );
  return Cartesian3.normalize(directionToPointScratch, directionToPointScratch);
}
export default EllipsoidalOccluder;
