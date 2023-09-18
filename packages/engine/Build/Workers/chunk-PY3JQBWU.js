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
  Cartesian4_default,
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartesian3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/Plane.js
function Plane(normal, distance) {
  Check_default.typeOf.object("normal", normal);
  if (!Math_default.equalsEpsilon(
    Cartesian3_default.magnitude(normal),
    1,
    Math_default.EPSILON6
  )) {
    throw new DeveloperError_default("normal must be normalized.");
  }
  Check_default.typeOf.number("distance", distance);
  this.normal = Cartesian3_default.clone(normal);
  this.distance = distance;
}
Plane.fromPointNormal = function(point, normal, result) {
  Check_default.typeOf.object("point", point);
  Check_default.typeOf.object("normal", normal);
  if (!Math_default.equalsEpsilon(
    Cartesian3_default.magnitude(normal),
    1,
    Math_default.EPSILON6
  )) {
    throw new DeveloperError_default("normal must be normalized.");
  }
  const distance = -Cartesian3_default.dot(normal, point);
  if (!defined_default(result)) {
    return new Plane(normal, distance);
  }
  Cartesian3_default.clone(normal, result.normal);
  result.distance = distance;
  return result;
};
var scratchNormal = new Cartesian3_default();
Plane.fromCartesian4 = function(coefficients, result) {
  Check_default.typeOf.object("coefficients", coefficients);
  const normal = Cartesian3_default.fromCartesian4(coefficients, scratchNormal);
  const distance = coefficients.w;
  if (!Math_default.equalsEpsilon(
    Cartesian3_default.magnitude(normal),
    1,
    Math_default.EPSILON6
  )) {
    throw new DeveloperError_default("normal must be normalized.");
  }
  if (!defined_default(result)) {
    return new Plane(normal, distance);
  }
  Cartesian3_default.clone(normal, result.normal);
  result.distance = distance;
  return result;
};
Plane.getPointDistance = function(plane, point) {
  Check_default.typeOf.object("plane", plane);
  Check_default.typeOf.object("point", point);
  return Cartesian3_default.dot(plane.normal, point) + plane.distance;
};
var scratchCartesian = new Cartesian3_default();
Plane.projectPointOntoPlane = function(plane, point, result) {
  Check_default.typeOf.object("plane", plane);
  Check_default.typeOf.object("point", point);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  const pointDistance = Plane.getPointDistance(plane, point);
  const scaledNormal = Cartesian3_default.multiplyByScalar(
    plane.normal,
    pointDistance,
    scratchCartesian
  );
  return Cartesian3_default.subtract(point, scaledNormal, result);
};
var scratchInverseTranspose = new Matrix4_default();
var scratchPlaneCartesian4 = new Cartesian4_default();
var scratchTransformNormal = new Cartesian3_default();
Plane.transform = function(plane, transform, result) {
  Check_default.typeOf.object("plane", plane);
  Check_default.typeOf.object("transform", transform);
  const normal = plane.normal;
  const distance = plane.distance;
  const inverseTranspose = Matrix4_default.inverseTranspose(
    transform,
    scratchInverseTranspose
  );
  let planeAsCartesian4 = Cartesian4_default.fromElements(
    normal.x,
    normal.y,
    normal.z,
    distance,
    scratchPlaneCartesian4
  );
  planeAsCartesian4 = Matrix4_default.multiplyByVector(
    inverseTranspose,
    planeAsCartesian4,
    planeAsCartesian4
  );
  const transformedNormal = Cartesian3_default.fromCartesian4(
    planeAsCartesian4,
    scratchTransformNormal
  );
  planeAsCartesian4 = Cartesian4_default.divideByScalar(
    planeAsCartesian4,
    Cartesian3_default.magnitude(transformedNormal),
    planeAsCartesian4
  );
  return Plane.fromCartesian4(planeAsCartesian4, result);
};
Plane.clone = function(plane, result) {
  Check_default.typeOf.object("plane", plane);
  if (!defined_default(result)) {
    return new Plane(plane.normal, plane.distance);
  }
  Cartesian3_default.clone(plane.normal, result.normal);
  result.distance = plane.distance;
  return result;
};
Plane.equals = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.distance === right.distance && Cartesian3_default.equals(left.normal, right.normal);
};
Plane.ORIGIN_XY_PLANE = Object.freeze(new Plane(Cartesian3_default.UNIT_Z, 0));
Plane.ORIGIN_YZ_PLANE = Object.freeze(new Plane(Cartesian3_default.UNIT_X, 0));
Plane.ORIGIN_ZX_PLANE = Object.freeze(new Plane(Cartesian3_default.UNIT_Y, 0));
var Plane_default = Plane;

export {
  Plane_default
};
