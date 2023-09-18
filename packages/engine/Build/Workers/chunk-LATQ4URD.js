/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  AxisAlignedBoundingBox_default
} from "./chunk-IYKFKVQR.js";
import {
  IntersectionTests_default,
  Ray_default
} from "./chunk-MKJM6R4K.js";
import {
  Plane_default
} from "./chunk-PY3JQBWU.js";
import {
  Transforms_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default,
  Cartesian4_default,
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartesian3_default,
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/EllipsoidTangentPlane.js
var scratchCart4 = new Cartesian4_default();
function EllipsoidTangentPlane(origin, ellipsoid) {
  Check_default.defined("origin", origin);
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  origin = ellipsoid.scaleToGeodeticSurface(origin);
  if (!defined_default(origin)) {
    throw new DeveloperError_default(
      "origin must not be at the center of the ellipsoid."
    );
  }
  const eastNorthUp = Transforms_default.eastNorthUpToFixedFrame(origin, ellipsoid);
  this._ellipsoid = ellipsoid;
  this._origin = origin;
  this._xAxis = Cartesian3_default.fromCartesian4(
    Matrix4_default.getColumn(eastNorthUp, 0, scratchCart4)
  );
  this._yAxis = Cartesian3_default.fromCartesian4(
    Matrix4_default.getColumn(eastNorthUp, 1, scratchCart4)
  );
  const normal = Cartesian3_default.fromCartesian4(
    Matrix4_default.getColumn(eastNorthUp, 2, scratchCart4)
  );
  this._plane = Plane_default.fromPointNormal(origin, normal);
}
Object.defineProperties(EllipsoidTangentPlane.prototype, {
  /**
   * Gets the ellipsoid.
   * @memberof EllipsoidTangentPlane.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function() {
      return this._ellipsoid;
    }
  },
  /**
   * Gets the origin.
   * @memberof EllipsoidTangentPlane.prototype
   * @type {Cartesian3}
   */
  origin: {
    get: function() {
      return this._origin;
    }
  },
  /**
   * Gets the plane which is tangent to the ellipsoid.
   * @memberof EllipsoidTangentPlane.prototype
   * @readonly
   * @type {Plane}
   */
  plane: {
    get: function() {
      return this._plane;
    }
  },
  /**
   * Gets the local X-axis (east) of the tangent plane.
   * @memberof EllipsoidTangentPlane.prototype
   * @readonly
   * @type {Cartesian3}
   */
  xAxis: {
    get: function() {
      return this._xAxis;
    }
  },
  /**
   * Gets the local Y-axis (north) of the tangent plane.
   * @memberof EllipsoidTangentPlane.prototype
   * @readonly
   * @type {Cartesian3}
   */
  yAxis: {
    get: function() {
      return this._yAxis;
    }
  },
  /**
   * Gets the local Z-axis (up) of the tangent plane.
   * @memberof EllipsoidTangentPlane.prototype
   * @readonly
   * @type {Cartesian3}
   */
  zAxis: {
    get: function() {
      return this._plane.normal;
    }
  }
});
var tmp = new AxisAlignedBoundingBox_default();
EllipsoidTangentPlane.fromPoints = function(cartesians, ellipsoid) {
  Check_default.defined("cartesians", cartesians);
  const box = AxisAlignedBoundingBox_default.fromPoints(cartesians, tmp);
  return new EllipsoidTangentPlane(box.center, ellipsoid);
};
var scratchProjectPointOntoPlaneRay = new Ray_default();
var scratchProjectPointOntoPlaneCartesian3 = new Cartesian3_default();
EllipsoidTangentPlane.prototype.projectPointOntoPlane = function(cartesian, result) {
  Check_default.defined("cartesian", cartesian);
  const ray = scratchProjectPointOntoPlaneRay;
  ray.origin = cartesian;
  Cartesian3_default.normalize(cartesian, ray.direction);
  let intersectionPoint = IntersectionTests_default.rayPlane(
    ray,
    this._plane,
    scratchProjectPointOntoPlaneCartesian3
  );
  if (!defined_default(intersectionPoint)) {
    Cartesian3_default.negate(ray.direction, ray.direction);
    intersectionPoint = IntersectionTests_default.rayPlane(
      ray,
      this._plane,
      scratchProjectPointOntoPlaneCartesian3
    );
  }
  if (defined_default(intersectionPoint)) {
    const v = Cartesian3_default.subtract(
      intersectionPoint,
      this._origin,
      intersectionPoint
    );
    const x = Cartesian3_default.dot(this._xAxis, v);
    const y = Cartesian3_default.dot(this._yAxis, v);
    if (!defined_default(result)) {
      return new Cartesian2_default(x, y);
    }
    result.x = x;
    result.y = y;
    return result;
  }
  return void 0;
};
EllipsoidTangentPlane.prototype.projectPointsOntoPlane = function(cartesians, result) {
  Check_default.defined("cartesians", cartesians);
  if (!defined_default(result)) {
    result = [];
  }
  let count = 0;
  const length = cartesians.length;
  for (let i = 0; i < length; i++) {
    const p = this.projectPointOntoPlane(cartesians[i], result[count]);
    if (defined_default(p)) {
      result[count] = p;
      count++;
    }
  }
  result.length = count;
  return result;
};
EllipsoidTangentPlane.prototype.projectPointToNearestOnPlane = function(cartesian, result) {
  Check_default.defined("cartesian", cartesian);
  if (!defined_default(result)) {
    result = new Cartesian2_default();
  }
  const ray = scratchProjectPointOntoPlaneRay;
  ray.origin = cartesian;
  Cartesian3_default.clone(this._plane.normal, ray.direction);
  let intersectionPoint = IntersectionTests_default.rayPlane(
    ray,
    this._plane,
    scratchProjectPointOntoPlaneCartesian3
  );
  if (!defined_default(intersectionPoint)) {
    Cartesian3_default.negate(ray.direction, ray.direction);
    intersectionPoint = IntersectionTests_default.rayPlane(
      ray,
      this._plane,
      scratchProjectPointOntoPlaneCartesian3
    );
  }
  const v = Cartesian3_default.subtract(
    intersectionPoint,
    this._origin,
    intersectionPoint
  );
  const x = Cartesian3_default.dot(this._xAxis, v);
  const y = Cartesian3_default.dot(this._yAxis, v);
  result.x = x;
  result.y = y;
  return result;
};
EllipsoidTangentPlane.prototype.projectPointsToNearestOnPlane = function(cartesians, result) {
  Check_default.defined("cartesians", cartesians);
  if (!defined_default(result)) {
    result = [];
  }
  const length = cartesians.length;
  result.length = length;
  for (let i = 0; i < length; i++) {
    result[i] = this.projectPointToNearestOnPlane(cartesians[i], result[i]);
  }
  return result;
};
var projectPointsOntoEllipsoidScratch = new Cartesian3_default();
EllipsoidTangentPlane.prototype.projectPointOntoEllipsoid = function(cartesian, result) {
  Check_default.defined("cartesian", cartesian);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  const ellipsoid = this._ellipsoid;
  const origin = this._origin;
  const xAxis = this._xAxis;
  const yAxis = this._yAxis;
  const tmp2 = projectPointsOntoEllipsoidScratch;
  Cartesian3_default.multiplyByScalar(xAxis, cartesian.x, tmp2);
  result = Cartesian3_default.add(origin, tmp2, result);
  Cartesian3_default.multiplyByScalar(yAxis, cartesian.y, tmp2);
  Cartesian3_default.add(result, tmp2, result);
  ellipsoid.scaleToGeocentricSurface(result, result);
  return result;
};
EllipsoidTangentPlane.prototype.projectPointsOntoEllipsoid = function(cartesians, result) {
  Check_default.defined("cartesians", cartesians);
  const length = cartesians.length;
  if (!defined_default(result)) {
    result = new Array(length);
  } else {
    result.length = length;
  }
  for (let i = 0; i < length; ++i) {
    result[i] = this.projectPointOntoEllipsoid(cartesians[i], result[i]);
  }
  return result;
};
var EllipsoidTangentPlane_default = EllipsoidTangentPlane;

export {
  EllipsoidTangentPlane_default
};
