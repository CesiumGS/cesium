import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import EllipsoidTangentPlane from "./EllipsoidTangentPlane.js";
import IntersectionTests from "./IntersectionTests.js";
import CesiumMath from "./Math.js";
import Ray from "./Ray.js";

/**
 * Represents a point in stereographic coordinates, which can be obtained by projecting a cartesian coordinate from one pole onto a tangent plane at the other pole.
 * The stereographic projection faithfully represents the relative directions of all great circles passing through its center point.
 * To faithfully represents angles everywhere, this is a conformal projection, which means points are projected onto an arbrary sphere.
 * @param {Cartesian2} [position] The steroegraphic coordinates.
 * @param {EllipseGeometry} [tangentPlane] The tangent plane onto which the point was projected.
 */
function Stereographic(position, tangentPlane) {
  this.position = position;
  if (!defined(this.position)) {
    this.position = new Cartesian2();
  }

  this.tangentPlane = tangentPlane;
  if (!defined(this.tangentPlane)) {
    this.tangentPlane = Stereographic.NORTH_POLE_TANGENT_PLANE;
  }
}

Object.defineProperties(Stereographic.prototype, {
  /**
   * Gets the ellipsoid.
   * @memberof Stereographic.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function () {
      return this.tangentPlane.ellipsoid;
    },
  },

  /**
   * Gets the x coordinate
   * @memberof Stereographic.prototype
   * @type {number}
   */
  x: {
    get: function () {
      return this.position.x;
    },
  },

  /**
   * Gets the y coordinate
   * @memberof Stereographic.prototype
   * @type {number}
   */
  y: {
    get: function () {
      return this.position.y;
    },
  },

  /**
   * Computes the conformal latitude, or the ellipsoidal latitude projected onto an arbitrary sphere.
   * @memberof Stereographic.prototype
   * @type {number}
   */
  conformalLatitude: {
    get: function () {
      const r = Cartesian2.magnitude(this.position);
      const d = 2 * this.ellipsoid.maximumRadius;
      const sign = this.tangentPlane.plane.normal.z;
      return sign * (CesiumMath.PI_OVER_TWO - 2 * Math.atan2(r, d));
    },
  },

  /**
   * Computes the longitude
   * @memberof Stereographic.prototype
   * @type {number}
   */
  longitude: {
    get: function () {
      let longitude = CesiumMath.PI_OVER_TWO + Math.atan2(this.y, this.x);
      if (longitude > Math.PI) {
        longitude -= CesiumMath.TWO_PI;
      }

      return longitude;
    },
  },
});

const scratchCartographic = new Cartographic();
const scratchCartesian = new Cartesian3();

/**
 * Computes the latitude based on an ellipsoid.
 *
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which to compute the longitude.
 * @returns {number} The latitude
 */
Stereographic.prototype.getLatitude = function (ellipsoid) {
  if (!defined(ellipsoid)) {
    ellipsoid = Ellipsoid.WGS84;
  }

  scratchCartographic.latitude = this.conformalLatitude;
  scratchCartographic.longitude = this.longitude;
  scratchCartographic.height = 0.0;
  const cartesian = this.ellipsoid.cartographicToCartesian(
    scratchCartographic,
    scratchCartesian
  );
  ellipsoid.cartesianToCartographic(cartesian, scratchCartographic);
  return scratchCartographic.latitude;
};

const scratchProjectPointOntoPlaneRay = new Ray();
const scratchProjectPointOntoPlaneRayDirection = new Cartesian3();
const scratchProjectPointOntoPlaneCartesian3 = new Cartesian3();

/**
 * Computes the projection of the provided 3D position onto the 2D polar plane, radially outward from the provided origin.
 *
 * @param {Cartesian3} cartesian The point to project.
 * @param {Stereographic} [result] The object onto which to store the result.
 * @returns {Sterographic} The modified result parameter or a new Sterographic instance if none was provided.
 */
Stereographic.fromCartesian = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesian", cartesian);
  //>>includeEnd('debug');

  const sign = CesiumMath.signNotZero(cartesian.z);
  let tangentPlane = Stereographic.NORTH_POLE_TANGENT_PLANE;
  let origin = Stereographic.SOUTH_POLE;
  if (sign < 0) {
    tangentPlane = Stereographic.SOUTH_POLE_TANGENT_PLANE;
    origin = Stereographic.NORTH_POLE;
  }

  const ray = scratchProjectPointOntoPlaneRay;
  ray.origin = tangentPlane.ellipsoid.scaleToGeocentricSurface(
    cartesian,
    ray.origin
  );
  ray.direction = Cartesian3.subtract(
    ray.origin,
    origin,
    scratchProjectPointOntoPlaneRayDirection
  );
  Cartesian3.normalize(ray.direction, ray.direction);

  const intersectionPoint = IntersectionTests.rayPlane(
    ray,
    tangentPlane.plane,
    scratchProjectPointOntoPlaneCartesian3
  );
  const v = Cartesian3.subtract(intersectionPoint, origin, intersectionPoint);
  const x = Cartesian3.dot(tangentPlane.xAxis, v);
  const y = sign * Cartesian3.dot(tangentPlane.yAxis, v);

  if (!defined(result)) {
    return new Stereographic(new Cartesian2(x, y), tangentPlane);
  }

  result.position = new Cartesian2(x, y);
  result.tangentPlane = tangentPlane;
  return result;
};

/**
 * Computes the projection of the provided 3D positions onto the 2D polar plane, radially outward from the provided origin.
 *
 * @param {Cartesian3[]} cartesians The points to project.
 * @param {Stereographic[]} [result] The object onto which to store the result.
 * @returns {Sterographic[]} The modified result parameter or a new Sterographic instance if none was provided.
 */
Stereographic.fromCartesianArray = function (cartesians, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesians", cartesians);
  //>>includeEnd('debug');

  const length = cartesians.length;
  if (!defined(result)) {
    result = new Array(length);
  } else {
    result.length = length;
  }
  for (let i = 0; i < length; i++) {
    result[i] = Stereographic.fromCartesian(cartesians[i], result[i]);
  }
  return result;
};

/**
 * Duplicates a Stereographic instance.
 *
 * @param {Stereographic} stereographic The Stereographic to duplicate.
 * @param {Stereographic} [result] The object onto which to store the result.
 * @returns {Stereographic} The modified result parameter or a new Stereographic instance if one was not provided. (Returns undefined if stereographic is undefined)
 */
Stereographic.clone = function (stereographic, result) {
  if (!defined(stereographic)) {
    return undefined;
  }
  if (!defined(result)) {
    return new Stereographic(
      stereographic.position,
      stereographic.tangentPlane
    );
  }

  result.position = stereographic.position;
  result.tangentPlane = stereographic.tangentPlane;

  return result;
};

/**
 * An Ellipsoid instance initialized to radii of (0.5, 0.5, 0.5).
 *
 * @type {Stereographic}
 * @constant
 */
Stereographic.HALF_UNIT_SPHERE = Object.freeze(new Ellipsoid(0.5, 0.5, 0.5));

Stereographic.NORTH_POLE = Object.freeze(new Cartesian3(0.0, 0.0, 0.5));
Stereographic.SOUTH_POLE = Object.freeze(new Cartesian3(0.0, 0.0, -0.5));

Stereographic.NORTH_POLE_TANGENT_PLANE = Object.freeze(
  new EllipsoidTangentPlane(
    Stereographic.NORTH_POLE,
    Stereographic.HALF_UNIT_SPHERE
  )
);
Stereographic.SOUTH_POLE_TANGENT_PLANE = Object.freeze(
  new EllipsoidTangentPlane(
    Stereographic.SOUTH_POLE,
    Stereographic.HALF_UNIT_SPHERE
  )
);

export default Stereographic;
