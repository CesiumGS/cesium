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
  Math_default
} from "./chunk-DPAUXJXY.js";
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

// packages/engine/Source/Core/Cartesian3.js
function Cartesian3(x, y, z) {
  this.x = defaultValue_default(x, 0);
  this.y = defaultValue_default(y, 0);
  this.z = defaultValue_default(z, 0);
}
Cartesian3.fromSpherical = function(spherical, result) {
  Check_default.typeOf.object("spherical", spherical);
  if (!defined_default(result)) {
    result = new Cartesian3();
  }
  const clock = spherical.clock;
  const cone = spherical.cone;
  const magnitude = defaultValue_default(spherical.magnitude, 1);
  const radial = magnitude * Math.sin(cone);
  result.x = radial * Math.cos(clock);
  result.y = radial * Math.sin(clock);
  result.z = magnitude * Math.cos(cone);
  return result;
};
Cartesian3.fromElements = function(x, y, z, result) {
  if (!defined_default(result)) {
    return new Cartesian3(x, y, z);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Cartesian3.clone = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Cartesian3(cartesian.x, cartesian.y, cartesian.z);
  }
  result.x = cartesian.x;
  result.y = cartesian.y;
  result.z = cartesian.z;
  return result;
};
Cartesian3.fromCartesian4 = Cartesian3.clone;
Cartesian3.packedLength = 3;
Cartesian3.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex] = value.z;
  return array;
};
Cartesian3.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Cartesian3();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex++];
  result.z = array[startingIndex];
  return result;
};
Cartesian3.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 3;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 3 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Cartesian3.pack(array[i], result, i * 3);
  }
  return result;
};
Cartesian3.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 3);
  if (array.length % 3 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 3.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }
  for (let i = 0; i < length; i += 3) {
    const index = i / 3;
    result[index] = Cartesian3.unpack(array, i, result[index]);
  }
  return result;
};
Cartesian3.fromArray = Cartesian3.unpack;
Cartesian3.maximumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.max(cartesian.x, cartesian.y, cartesian.z);
};
Cartesian3.minimumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.min(cartesian.x, cartesian.y, cartesian.z);
};
Cartesian3.minimumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.min(first.x, second.x);
  result.y = Math.min(first.y, second.y);
  result.z = Math.min(first.z, second.z);
  return result;
};
Cartesian3.maximumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.max(first.x, second.x);
  result.y = Math.max(first.y, second.y);
  result.z = Math.max(first.z, second.z);
  return result;
};
Cartesian3.clamp = function(value, min, max, result) {
  Check_default.typeOf.object("value", value);
  Check_default.typeOf.object("min", min);
  Check_default.typeOf.object("max", max);
  Check_default.typeOf.object("result", result);
  const x = Math_default.clamp(value.x, min.x, max.x);
  const y = Math_default.clamp(value.y, min.y, max.y);
  const z = Math_default.clamp(value.z, min.z, max.z);
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Cartesian3.magnitudeSquared = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z;
};
Cartesian3.magnitude = function(cartesian) {
  return Math.sqrt(Cartesian3.magnitudeSquared(cartesian));
};
var distanceScratch = new Cartesian3();
Cartesian3.distance = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian3.subtract(left, right, distanceScratch);
  return Cartesian3.magnitude(distanceScratch);
};
Cartesian3.distanceSquared = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian3.subtract(left, right, distanceScratch);
  return Cartesian3.magnitudeSquared(distanceScratch);
};
Cartesian3.normalize = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const magnitude = Cartesian3.magnitude(cartesian);
  result.x = cartesian.x / magnitude;
  result.y = cartesian.y / magnitude;
  result.z = cartesian.z / magnitude;
  if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z)) {
    throw new DeveloperError_default("normalized result is not a number");
  }
  return result;
};
Cartesian3.dot = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.x + left.y * right.y + left.z * right.z;
};
Cartesian3.multiplyComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x * right.x;
  result.y = left.y * right.y;
  result.z = left.z * right.z;
  return result;
};
Cartesian3.divideComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x / right.x;
  result.y = left.y / right.y;
  result.z = left.z / right.z;
  return result;
};
Cartesian3.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x + right.x;
  result.y = left.y + right.y;
  result.z = left.z + right.z;
  return result;
};
Cartesian3.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x - right.x;
  result.y = left.y - right.y;
  result.z = left.z - right.z;
  return result;
};
Cartesian3.multiplyByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x * scalar;
  result.y = cartesian.y * scalar;
  result.z = cartesian.z * scalar;
  return result;
};
Cartesian3.divideByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x / scalar;
  result.y = cartesian.y / scalar;
  result.z = cartesian.z / scalar;
  return result;
};
Cartesian3.negate = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = -cartesian.x;
  result.y = -cartesian.y;
  result.z = -cartesian.z;
  return result;
};
Cartesian3.abs = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = Math.abs(cartesian.x);
  result.y = Math.abs(cartesian.y);
  result.z = Math.abs(cartesian.z);
  return result;
};
var lerpScratch = new Cartesian3();
Cartesian3.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  Cartesian3.multiplyByScalar(end, t, lerpScratch);
  result = Cartesian3.multiplyByScalar(start, 1 - t, result);
  return Cartesian3.add(lerpScratch, result, result);
};
var angleBetweenScratch = new Cartesian3();
var angleBetweenScratch2 = new Cartesian3();
Cartesian3.angleBetween = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian3.normalize(left, angleBetweenScratch);
  Cartesian3.normalize(right, angleBetweenScratch2);
  const cosine = Cartesian3.dot(angleBetweenScratch, angleBetweenScratch2);
  const sine = Cartesian3.magnitude(
    Cartesian3.cross(
      angleBetweenScratch,
      angleBetweenScratch2,
      angleBetweenScratch
    )
  );
  return Math.atan2(sine, cosine);
};
var mostOrthogonalAxisScratch = new Cartesian3();
Cartesian3.mostOrthogonalAxis = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const f = Cartesian3.normalize(cartesian, mostOrthogonalAxisScratch);
  Cartesian3.abs(f, f);
  if (f.x <= f.y) {
    if (f.x <= f.z) {
      result = Cartesian3.clone(Cartesian3.UNIT_X, result);
    } else {
      result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
    }
  } else if (f.y <= f.z) {
    result = Cartesian3.clone(Cartesian3.UNIT_Y, result);
  } else {
    result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
  }
  return result;
};
Cartesian3.projectVector = function(a, b, result) {
  Check_default.defined("a", a);
  Check_default.defined("b", b);
  Check_default.defined("result", result);
  const scalar = Cartesian3.dot(a, b) / Cartesian3.dot(b, b);
  return Cartesian3.multiplyByScalar(b, scalar, result);
};
Cartesian3.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.x === right.x && left.y === right.y && left.z === right.z;
};
Cartesian3.equalsArray = function(cartesian, array, offset) {
  return cartesian.x === array[offset] && cartesian.y === array[offset + 1] && cartesian.z === array[offset + 2];
};
Cartesian3.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
  return left === right || defined_default(left) && defined_default(right) && Math_default.equalsEpsilon(
    left.x,
    right.x,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.y,
    right.y,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.z,
    right.z,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian3.cross = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const leftX = left.x;
  const leftY = left.y;
  const leftZ = left.z;
  const rightX = right.x;
  const rightY = right.y;
  const rightZ = right.z;
  const x = leftY * rightZ - leftZ * rightY;
  const y = leftZ * rightX - leftX * rightZ;
  const z = leftX * rightY - leftY * rightX;
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Cartesian3.midpoint = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = (left.x + right.x) * 0.5;
  result.y = (left.y + right.y) * 0.5;
  result.z = (left.z + right.z) * 0.5;
  return result;
};
Cartesian3.fromDegrees = function(longitude, latitude, height, ellipsoid, result) {
  Check_default.typeOf.number("longitude", longitude);
  Check_default.typeOf.number("latitude", latitude);
  longitude = Math_default.toRadians(longitude);
  latitude = Math_default.toRadians(latitude);
  return Cartesian3.fromRadians(longitude, latitude, height, ellipsoid, result);
};
var scratchN = new Cartesian3();
var scratchK = new Cartesian3();
var wgs84RadiiSquared = new Cartesian3(
  6378137 * 6378137,
  6378137 * 6378137,
  6356752314245179e-9 * 6356752314245179e-9
);
Cartesian3.fromRadians = function(longitude, latitude, height, ellipsoid, result) {
  Check_default.typeOf.number("longitude", longitude);
  Check_default.typeOf.number("latitude", latitude);
  height = defaultValue_default(height, 0);
  const radiiSquared = defined_default(ellipsoid) ? ellipsoid.radiiSquared : wgs84RadiiSquared;
  const cosLatitude = Math.cos(latitude);
  scratchN.x = cosLatitude * Math.cos(longitude);
  scratchN.y = cosLatitude * Math.sin(longitude);
  scratchN.z = Math.sin(latitude);
  scratchN = Cartesian3.normalize(scratchN, scratchN);
  Cartesian3.multiplyComponents(radiiSquared, scratchN, scratchK);
  const gamma = Math.sqrt(Cartesian3.dot(scratchN, scratchK));
  scratchK = Cartesian3.divideByScalar(scratchK, gamma, scratchK);
  scratchN = Cartesian3.multiplyByScalar(scratchN, height, scratchN);
  if (!defined_default(result)) {
    result = new Cartesian3();
  }
  return Cartesian3.add(scratchK, scratchN, result);
};
Cartesian3.fromDegreesArray = function(coordinates, ellipsoid, result) {
  Check_default.defined("coordinates", coordinates);
  if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
    throw new DeveloperError_default(
      "the number of coordinates must be a multiple of 2 and at least 2"
    );
  }
  const length = coordinates.length;
  if (!defined_default(result)) {
    result = new Array(length / 2);
  } else {
    result.length = length / 2;
  }
  for (let i = 0; i < length; i += 2) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const index = i / 2;
    result[index] = Cartesian3.fromDegrees(
      longitude,
      latitude,
      0,
      ellipsoid,
      result[index]
    );
  }
  return result;
};
Cartesian3.fromRadiansArray = function(coordinates, ellipsoid, result) {
  Check_default.defined("coordinates", coordinates);
  if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
    throw new DeveloperError_default(
      "the number of coordinates must be a multiple of 2 and at least 2"
    );
  }
  const length = coordinates.length;
  if (!defined_default(result)) {
    result = new Array(length / 2);
  } else {
    result.length = length / 2;
  }
  for (let i = 0; i < length; i += 2) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const index = i / 2;
    result[index] = Cartesian3.fromRadians(
      longitude,
      latitude,
      0,
      ellipsoid,
      result[index]
    );
  }
  return result;
};
Cartesian3.fromDegreesArrayHeights = function(coordinates, ellipsoid, result) {
  Check_default.defined("coordinates", coordinates);
  if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
    throw new DeveloperError_default(
      "the number of coordinates must be a multiple of 3 and at least 3"
    );
  }
  const length = coordinates.length;
  if (!defined_default(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }
  for (let i = 0; i < length; i += 3) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const height = coordinates[i + 2];
    const index = i / 3;
    result[index] = Cartesian3.fromDegrees(
      longitude,
      latitude,
      height,
      ellipsoid,
      result[index]
    );
  }
  return result;
};
Cartesian3.fromRadiansArrayHeights = function(coordinates, ellipsoid, result) {
  Check_default.defined("coordinates", coordinates);
  if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
    throw new DeveloperError_default(
      "the number of coordinates must be a multiple of 3 and at least 3"
    );
  }
  const length = coordinates.length;
  if (!defined_default(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }
  for (let i = 0; i < length; i += 3) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const height = coordinates[i + 2];
    const index = i / 3;
    result[index] = Cartesian3.fromRadians(
      longitude,
      latitude,
      height,
      ellipsoid,
      result[index]
    );
  }
  return result;
};
Cartesian3.ZERO = Object.freeze(new Cartesian3(0, 0, 0));
Cartesian3.ONE = Object.freeze(new Cartesian3(1, 1, 1));
Cartesian3.UNIT_X = Object.freeze(new Cartesian3(1, 0, 0));
Cartesian3.UNIT_Y = Object.freeze(new Cartesian3(0, 1, 0));
Cartesian3.UNIT_Z = Object.freeze(new Cartesian3(0, 0, 1));
Cartesian3.prototype.clone = function(result) {
  return Cartesian3.clone(this, result);
};
Cartesian3.prototype.equals = function(right) {
  return Cartesian3.equals(this, right);
};
Cartesian3.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
  return Cartesian3.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian3.prototype.toString = function() {
  return `(${this.x}, ${this.y}, ${this.z})`;
};
var Cartesian3_default = Cartesian3;

// packages/engine/Source/Core/scaleToGeodeticSurface.js
var scaleToGeodeticSurfaceIntersection = new Cartesian3_default();
var scaleToGeodeticSurfaceGradient = new Cartesian3_default();
function scaleToGeodeticSurface(cartesian, oneOverRadii, oneOverRadiiSquared, centerToleranceSquared, result) {
  if (!defined_default(cartesian)) {
    throw new DeveloperError_default("cartesian is required.");
  }
  if (!defined_default(oneOverRadii)) {
    throw new DeveloperError_default("oneOverRadii is required.");
  }
  if (!defined_default(oneOverRadiiSquared)) {
    throw new DeveloperError_default("oneOverRadiiSquared is required.");
  }
  if (!defined_default(centerToleranceSquared)) {
    throw new DeveloperError_default("centerToleranceSquared is required.");
  }
  const positionX = cartesian.x;
  const positionY = cartesian.y;
  const positionZ = cartesian.z;
  const oneOverRadiiX = oneOverRadii.x;
  const oneOverRadiiY = oneOverRadii.y;
  const oneOverRadiiZ = oneOverRadii.z;
  const x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX;
  const y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY;
  const z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ;
  const squaredNorm = x2 + y2 + z2;
  const ratio = Math.sqrt(1 / squaredNorm);
  const intersection = Cartesian3_default.multiplyByScalar(
    cartesian,
    ratio,
    scaleToGeodeticSurfaceIntersection
  );
  if (squaredNorm < centerToleranceSquared) {
    return !isFinite(ratio) ? void 0 : Cartesian3_default.clone(intersection, result);
  }
  const oneOverRadiiSquaredX = oneOverRadiiSquared.x;
  const oneOverRadiiSquaredY = oneOverRadiiSquared.y;
  const oneOverRadiiSquaredZ = oneOverRadiiSquared.z;
  const gradient = scaleToGeodeticSurfaceGradient;
  gradient.x = intersection.x * oneOverRadiiSquaredX * 2;
  gradient.y = intersection.y * oneOverRadiiSquaredY * 2;
  gradient.z = intersection.z * oneOverRadiiSquaredZ * 2;
  let lambda = (1 - ratio) * Cartesian3_default.magnitude(cartesian) / (0.5 * Cartesian3_default.magnitude(gradient));
  let correction = 0;
  let func;
  let denominator;
  let xMultiplier;
  let yMultiplier;
  let zMultiplier;
  let xMultiplier2;
  let yMultiplier2;
  let zMultiplier2;
  let xMultiplier3;
  let yMultiplier3;
  let zMultiplier3;
  do {
    lambda -= correction;
    xMultiplier = 1 / (1 + lambda * oneOverRadiiSquaredX);
    yMultiplier = 1 / (1 + lambda * oneOverRadiiSquaredY);
    zMultiplier = 1 / (1 + lambda * oneOverRadiiSquaredZ);
    xMultiplier2 = xMultiplier * xMultiplier;
    yMultiplier2 = yMultiplier * yMultiplier;
    zMultiplier2 = zMultiplier * zMultiplier;
    xMultiplier3 = xMultiplier2 * xMultiplier;
    yMultiplier3 = yMultiplier2 * yMultiplier;
    zMultiplier3 = zMultiplier2 * zMultiplier;
    func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1;
    denominator = x2 * xMultiplier3 * oneOverRadiiSquaredX + y2 * yMultiplier3 * oneOverRadiiSquaredY + z2 * zMultiplier3 * oneOverRadiiSquaredZ;
    const derivative = -2 * denominator;
    correction = func / derivative;
  } while (Math.abs(func) > Math_default.EPSILON12);
  if (!defined_default(result)) {
    return new Cartesian3_default(
      positionX * xMultiplier,
      positionY * yMultiplier,
      positionZ * zMultiplier
    );
  }
  result.x = positionX * xMultiplier;
  result.y = positionY * yMultiplier;
  result.z = positionZ * zMultiplier;
  return result;
}
var scaleToGeodeticSurface_default = scaleToGeodeticSurface;

// packages/engine/Source/Core/Cartographic.js
function Cartographic(longitude, latitude, height) {
  this.longitude = defaultValue_default(longitude, 0);
  this.latitude = defaultValue_default(latitude, 0);
  this.height = defaultValue_default(height, 0);
}
Cartographic.fromRadians = function(longitude, latitude, height, result) {
  Check_default.typeOf.number("longitude", longitude);
  Check_default.typeOf.number("latitude", latitude);
  height = defaultValue_default(height, 0);
  if (!defined_default(result)) {
    return new Cartographic(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
Cartographic.fromDegrees = function(longitude, latitude, height, result) {
  Check_default.typeOf.number("longitude", longitude);
  Check_default.typeOf.number("latitude", latitude);
  longitude = Math_default.toRadians(longitude);
  latitude = Math_default.toRadians(latitude);
  return Cartographic.fromRadians(longitude, latitude, height, result);
};
var cartesianToCartographicN = new Cartesian3_default();
var cartesianToCartographicP = new Cartesian3_default();
var cartesianToCartographicH = new Cartesian3_default();
var wgs84OneOverRadii = new Cartesian3_default(
  1 / 6378137,
  1 / 6378137,
  1 / 6356752314245179e-9
);
var wgs84OneOverRadiiSquared = new Cartesian3_default(
  1 / (6378137 * 6378137),
  1 / (6378137 * 6378137),
  1 / (6356752314245179e-9 * 6356752314245179e-9)
);
var wgs84CenterToleranceSquared = Math_default.EPSILON1;
Cartographic.fromCartesian = function(cartesian, ellipsoid, result) {
  const oneOverRadii = defined_default(ellipsoid) ? ellipsoid.oneOverRadii : wgs84OneOverRadii;
  const oneOverRadiiSquared = defined_default(ellipsoid) ? ellipsoid.oneOverRadiiSquared : wgs84OneOverRadiiSquared;
  const centerToleranceSquared = defined_default(ellipsoid) ? ellipsoid._centerToleranceSquared : wgs84CenterToleranceSquared;
  const p = scaleToGeodeticSurface_default(
    cartesian,
    oneOverRadii,
    oneOverRadiiSquared,
    centerToleranceSquared,
    cartesianToCartographicP
  );
  if (!defined_default(p)) {
    return void 0;
  }
  let n = Cartesian3_default.multiplyComponents(
    p,
    oneOverRadiiSquared,
    cartesianToCartographicN
  );
  n = Cartesian3_default.normalize(n, n);
  const h = Cartesian3_default.subtract(cartesian, p, cartesianToCartographicH);
  const longitude = Math.atan2(n.y, n.x);
  const latitude = Math.asin(n.z);
  const height = Math_default.sign(Cartesian3_default.dot(h, cartesian)) * Cartesian3_default.magnitude(h);
  if (!defined_default(result)) {
    return new Cartographic(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
Cartographic.toCartesian = function(cartographic, ellipsoid, result) {
  Check_default.defined("cartographic", cartographic);
  return Cartesian3_default.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height,
    ellipsoid,
    result
  );
};
Cartographic.clone = function(cartographic, result) {
  if (!defined_default(cartographic)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Cartographic(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height
    );
  }
  result.longitude = cartographic.longitude;
  result.latitude = cartographic.latitude;
  result.height = cartographic.height;
  return result;
};
Cartographic.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.longitude === right.longitude && left.latitude === right.latitude && left.height === right.height;
};
Cartographic.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left.longitude - right.longitude) <= epsilon && Math.abs(left.latitude - right.latitude) <= epsilon && Math.abs(left.height - right.height) <= epsilon;
};
Cartographic.ZERO = Object.freeze(new Cartographic(0, 0, 0));
Cartographic.prototype.clone = function(result) {
  return Cartographic.clone(this, result);
};
Cartographic.prototype.equals = function(right) {
  return Cartographic.equals(this, right);
};
Cartographic.prototype.equalsEpsilon = function(right, epsilon) {
  return Cartographic.equalsEpsilon(this, right, epsilon);
};
Cartographic.prototype.toString = function() {
  return `(${this.longitude}, ${this.latitude}, ${this.height})`;
};
var Cartographic_default = Cartographic;

// packages/engine/Source/Core/Ellipsoid.js
function initialize(ellipsoid, x, y, z) {
  x = defaultValue_default(x, 0);
  y = defaultValue_default(y, 0);
  z = defaultValue_default(z, 0);
  Check_default.typeOf.number.greaterThanOrEquals("x", x, 0);
  Check_default.typeOf.number.greaterThanOrEquals("y", y, 0);
  Check_default.typeOf.number.greaterThanOrEquals("z", z, 0);
  ellipsoid._radii = new Cartesian3_default(x, y, z);
  ellipsoid._radiiSquared = new Cartesian3_default(x * x, y * y, z * z);
  ellipsoid._radiiToTheFourth = new Cartesian3_default(
    x * x * x * x,
    y * y * y * y,
    z * z * z * z
  );
  ellipsoid._oneOverRadii = new Cartesian3_default(
    x === 0 ? 0 : 1 / x,
    y === 0 ? 0 : 1 / y,
    z === 0 ? 0 : 1 / z
  );
  ellipsoid._oneOverRadiiSquared = new Cartesian3_default(
    x === 0 ? 0 : 1 / (x * x),
    y === 0 ? 0 : 1 / (y * y),
    z === 0 ? 0 : 1 / (z * z)
  );
  ellipsoid._minimumRadius = Math.min(x, y, z);
  ellipsoid._maximumRadius = Math.max(x, y, z);
  ellipsoid._centerToleranceSquared = Math_default.EPSILON1;
  if (ellipsoid._radiiSquared.z !== 0) {
    ellipsoid._squaredXOverSquaredZ = ellipsoid._radiiSquared.x / ellipsoid._radiiSquared.z;
  }
}
function Ellipsoid(x, y, z) {
  this._radii = void 0;
  this._radiiSquared = void 0;
  this._radiiToTheFourth = void 0;
  this._oneOverRadii = void 0;
  this._oneOverRadiiSquared = void 0;
  this._minimumRadius = void 0;
  this._maximumRadius = void 0;
  this._centerToleranceSquared = void 0;
  this._squaredXOverSquaredZ = void 0;
  initialize(this, x, y, z);
}
Object.defineProperties(Ellipsoid.prototype, {
  /**
   * Gets the radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radii: {
    get: function() {
      return this._radii;
    }
  },
  /**
   * Gets the squared radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radiiSquared: {
    get: function() {
      return this._radiiSquared;
    }
  },
  /**
   * Gets the radii of the ellipsoid raise to the fourth power.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radiiToTheFourth: {
    get: function() {
      return this._radiiToTheFourth;
    }
  },
  /**
   * Gets one over the radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  oneOverRadii: {
    get: function() {
      return this._oneOverRadii;
    }
  },
  /**
   * Gets one over the squared radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  oneOverRadiiSquared: {
    get: function() {
      return this._oneOverRadiiSquared;
    }
  },
  /**
   * Gets the minimum radius of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {number}
   * @readonly
   */
  minimumRadius: {
    get: function() {
      return this._minimumRadius;
    }
  },
  /**
   * Gets the maximum radius of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {number}
   * @readonly
   */
  maximumRadius: {
    get: function() {
      return this._maximumRadius;
    }
  }
});
Ellipsoid.clone = function(ellipsoid, result) {
  if (!defined_default(ellipsoid)) {
    return void 0;
  }
  const radii = ellipsoid._radii;
  if (!defined_default(result)) {
    return new Ellipsoid(radii.x, radii.y, radii.z);
  }
  Cartesian3_default.clone(radii, result._radii);
  Cartesian3_default.clone(ellipsoid._radiiSquared, result._radiiSquared);
  Cartesian3_default.clone(ellipsoid._radiiToTheFourth, result._radiiToTheFourth);
  Cartesian3_default.clone(ellipsoid._oneOverRadii, result._oneOverRadii);
  Cartesian3_default.clone(ellipsoid._oneOverRadiiSquared, result._oneOverRadiiSquared);
  result._minimumRadius = ellipsoid._minimumRadius;
  result._maximumRadius = ellipsoid._maximumRadius;
  result._centerToleranceSquared = ellipsoid._centerToleranceSquared;
  return result;
};
Ellipsoid.fromCartesian3 = function(cartesian, result) {
  if (!defined_default(result)) {
    result = new Ellipsoid();
  }
  if (!defined_default(cartesian)) {
    return result;
  }
  initialize(result, cartesian.x, cartesian.y, cartesian.z);
  return result;
};
Ellipsoid.WGS84 = Object.freeze(
  new Ellipsoid(6378137, 6378137, 6356752314245179e-9)
);
Ellipsoid.UNIT_SPHERE = Object.freeze(new Ellipsoid(1, 1, 1));
Ellipsoid.MOON = Object.freeze(
  new Ellipsoid(
    Math_default.LUNAR_RADIUS,
    Math_default.LUNAR_RADIUS,
    Math_default.LUNAR_RADIUS
  )
);
Ellipsoid.prototype.clone = function(result) {
  return Ellipsoid.clone(this, result);
};
Ellipsoid.packedLength = Cartesian3_default.packedLength;
Ellipsoid.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  Cartesian3_default.pack(value._radii, array, startingIndex);
  return array;
};
Ellipsoid.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const radii = Cartesian3_default.unpack(array, startingIndex);
  return Ellipsoid.fromCartesian3(radii, result);
};
Ellipsoid.prototype.geocentricSurfaceNormal = Cartesian3_default.normalize;
Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function(cartographic, result) {
  Check_default.typeOf.object("cartographic", cartographic);
  const longitude = cartographic.longitude;
  const latitude = cartographic.latitude;
  const cosLatitude = Math.cos(latitude);
  const x = cosLatitude * Math.cos(longitude);
  const y = cosLatitude * Math.sin(longitude);
  const z = Math.sin(latitude);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  result.x = x;
  result.y = y;
  result.z = z;
  return Cartesian3_default.normalize(result, result);
};
Ellipsoid.prototype.geodeticSurfaceNormal = function(cartesian, result) {
  if (Cartesian3_default.equalsEpsilon(cartesian, Cartesian3_default.ZERO, Math_default.EPSILON14)) {
    return void 0;
  }
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  result = Cartesian3_default.multiplyComponents(
    cartesian,
    this._oneOverRadiiSquared,
    result
  );
  return Cartesian3_default.normalize(result, result);
};
var cartographicToCartesianNormal = new Cartesian3_default();
var cartographicToCartesianK = new Cartesian3_default();
Ellipsoid.prototype.cartographicToCartesian = function(cartographic, result) {
  const n = cartographicToCartesianNormal;
  const k = cartographicToCartesianK;
  this.geodeticSurfaceNormalCartographic(cartographic, n);
  Cartesian3_default.multiplyComponents(this._radiiSquared, n, k);
  const gamma = Math.sqrt(Cartesian3_default.dot(n, k));
  Cartesian3_default.divideByScalar(k, gamma, k);
  Cartesian3_default.multiplyByScalar(n, cartographic.height, n);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  return Cartesian3_default.add(k, n, result);
};
Ellipsoid.prototype.cartographicArrayToCartesianArray = function(cartographics, result) {
  Check_default.defined("cartographics", cartographics);
  const length = cartographics.length;
  if (!defined_default(result)) {
    result = new Array(length);
  } else {
    result.length = length;
  }
  for (let i = 0; i < length; i++) {
    result[i] = this.cartographicToCartesian(cartographics[i], result[i]);
  }
  return result;
};
var cartesianToCartographicN2 = new Cartesian3_default();
var cartesianToCartographicP2 = new Cartesian3_default();
var cartesianToCartographicH2 = new Cartesian3_default();
Ellipsoid.prototype.cartesianToCartographic = function(cartesian, result) {
  const p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP2);
  if (!defined_default(p)) {
    return void 0;
  }
  const n = this.geodeticSurfaceNormal(p, cartesianToCartographicN2);
  const h = Cartesian3_default.subtract(cartesian, p, cartesianToCartographicH2);
  const longitude = Math.atan2(n.y, n.x);
  const latitude = Math.asin(n.z);
  const height = Math_default.sign(Cartesian3_default.dot(h, cartesian)) * Cartesian3_default.magnitude(h);
  if (!defined_default(result)) {
    return new Cartographic_default(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
Ellipsoid.prototype.cartesianArrayToCartographicArray = function(cartesians, result) {
  Check_default.defined("cartesians", cartesians);
  const length = cartesians.length;
  if (!defined_default(result)) {
    result = new Array(length);
  } else {
    result.length = length;
  }
  for (let i = 0; i < length; ++i) {
    result[i] = this.cartesianToCartographic(cartesians[i], result[i]);
  }
  return result;
};
Ellipsoid.prototype.scaleToGeodeticSurface = function(cartesian, result) {
  return scaleToGeodeticSurface_default(
    cartesian,
    this._oneOverRadii,
    this._oneOverRadiiSquared,
    this._centerToleranceSquared,
    result
  );
};
Ellipsoid.prototype.scaleToGeocentricSurface = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  const positionX = cartesian.x;
  const positionY = cartesian.y;
  const positionZ = cartesian.z;
  const oneOverRadiiSquared = this._oneOverRadiiSquared;
  const beta = 1 / Math.sqrt(
    positionX * positionX * oneOverRadiiSquared.x + positionY * positionY * oneOverRadiiSquared.y + positionZ * positionZ * oneOverRadiiSquared.z
  );
  return Cartesian3_default.multiplyByScalar(cartesian, beta, result);
};
Ellipsoid.prototype.transformPositionToScaledSpace = function(position, result) {
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  return Cartesian3_default.multiplyComponents(position, this._oneOverRadii, result);
};
Ellipsoid.prototype.transformPositionFromScaledSpace = function(position, result) {
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  return Cartesian3_default.multiplyComponents(position, this._radii, result);
};
Ellipsoid.prototype.equals = function(right) {
  return this === right || defined_default(right) && Cartesian3_default.equals(this._radii, right._radii);
};
Ellipsoid.prototype.toString = function() {
  return this._radii.toString();
};
Ellipsoid.prototype.getSurfaceNormalIntersectionWithZAxis = function(position, buffer, result) {
  Check_default.typeOf.object("position", position);
  if (!Math_default.equalsEpsilon(
    this._radii.x,
    this._radii.y,
    Math_default.EPSILON15
  )) {
    throw new DeveloperError_default(
      "Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)"
    );
  }
  Check_default.typeOf.number.greaterThan("Ellipsoid.radii.z", this._radii.z, 0);
  buffer = defaultValue_default(buffer, 0);
  const squaredXOverSquaredZ = this._squaredXOverSquaredZ;
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  result.x = 0;
  result.y = 0;
  result.z = position.z * (1 - squaredXOverSquaredZ);
  if (Math.abs(result.z) >= this._radii.z - buffer) {
    return void 0;
  }
  return result;
};
var abscissas = [
  0.14887433898163,
  0.43339539412925,
  0.67940956829902,
  0.86506336668898,
  0.97390652851717,
  0
];
var weights = [
  0.29552422471475,
  0.26926671930999,
  0.21908636251598,
  0.14945134915058,
  0.066671344308684,
  0
];
function gaussLegendreQuadrature(a, b, func) {
  Check_default.typeOf.number("a", a);
  Check_default.typeOf.number("b", b);
  Check_default.typeOf.func("func", func);
  const xMean = 0.5 * (b + a);
  const xRange = 0.5 * (b - a);
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    const dx = xRange * abscissas[i];
    sum += weights[i] * (func(xMean + dx) + func(xMean - dx));
  }
  sum *= xRange;
  return sum;
}
Ellipsoid.prototype.surfaceArea = function(rectangle) {
  Check_default.typeOf.object("rectangle", rectangle);
  const minLongitude = rectangle.west;
  let maxLongitude = rectangle.east;
  const minLatitude = rectangle.south;
  const maxLatitude = rectangle.north;
  while (maxLongitude < minLongitude) {
    maxLongitude += Math_default.TWO_PI;
  }
  const radiiSquared = this._radiiSquared;
  const a2 = radiiSquared.x;
  const b2 = radiiSquared.y;
  const c2 = radiiSquared.z;
  const a2b2 = a2 * b2;
  return gaussLegendreQuadrature(minLatitude, maxLatitude, function(lat) {
    const sinPhi = Math.cos(lat);
    const cosPhi = Math.sin(lat);
    return Math.cos(lat) * gaussLegendreQuadrature(minLongitude, maxLongitude, function(lon) {
      const cosTheta = Math.cos(lon);
      const sinTheta = Math.sin(lon);
      return Math.sqrt(
        a2b2 * cosPhi * cosPhi + c2 * (b2 * cosTheta * cosTheta + a2 * sinTheta * sinTheta) * sinPhi * sinPhi
      );
    });
  });
};
var Ellipsoid_default = Ellipsoid;

// packages/engine/Source/Core/Matrix3.js
function Matrix3(column0Row0, column1Row0, column2Row0, column0Row1, column1Row1, column2Row1, column0Row2, column1Row2, column2Row2) {
  this[0] = defaultValue_default(column0Row0, 0);
  this[1] = defaultValue_default(column0Row1, 0);
  this[2] = defaultValue_default(column0Row2, 0);
  this[3] = defaultValue_default(column1Row0, 0);
  this[4] = defaultValue_default(column1Row1, 0);
  this[5] = defaultValue_default(column1Row2, 0);
  this[6] = defaultValue_default(column2Row0, 0);
  this[7] = defaultValue_default(column2Row1, 0);
  this[8] = defaultValue_default(column2Row2, 0);
}
Matrix3.packedLength = 9;
Matrix3.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value[0];
  array[startingIndex++] = value[1];
  array[startingIndex++] = value[2];
  array[startingIndex++] = value[3];
  array[startingIndex++] = value[4];
  array[startingIndex++] = value[5];
  array[startingIndex++] = value[6];
  array[startingIndex++] = value[7];
  array[startingIndex++] = value[8];
  return array;
};
Matrix3.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Matrix3();
  }
  result[0] = array[startingIndex++];
  result[1] = array[startingIndex++];
  result[2] = array[startingIndex++];
  result[3] = array[startingIndex++];
  result[4] = array[startingIndex++];
  result[5] = array[startingIndex++];
  result[6] = array[startingIndex++];
  result[7] = array[startingIndex++];
  result[8] = array[startingIndex++];
  return result;
};
Matrix3.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 9;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 9 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Matrix3.pack(array[i], result, i * 9);
  }
  return result;
};
Matrix3.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 9);
  if (array.length % 9 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 9.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 9);
  } else {
    result.length = length / 9;
  }
  for (let i = 0; i < length; i += 9) {
    const index = i / 9;
    result[index] = Matrix3.unpack(array, i, result[index]);
  }
  return result;
};
Matrix3.clone = function(matrix, result) {
  if (!defined_default(matrix)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Matrix3(
      matrix[0],
      matrix[3],
      matrix[6],
      matrix[1],
      matrix[4],
      matrix[7],
      matrix[2],
      matrix[5],
      matrix[8]
    );
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  return result;
};
Matrix3.fromArray = Matrix3.unpack;
Matrix3.fromColumnMajorArray = function(values, result) {
  Check_default.defined("values", values);
  return Matrix3.clone(values, result);
};
Matrix3.fromRowMajorArray = function(values, result) {
  Check_default.defined("values", values);
  if (!defined_default(result)) {
    return new Matrix3(
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5],
      values[6],
      values[7],
      values[8]
    );
  }
  result[0] = values[0];
  result[1] = values[3];
  result[2] = values[6];
  result[3] = values[1];
  result[4] = values[4];
  result[5] = values[7];
  result[6] = values[2];
  result[7] = values[5];
  result[8] = values[8];
  return result;
};
Matrix3.fromQuaternion = function(quaternion, result) {
  Check_default.typeOf.object("quaternion", quaternion);
  const x2 = quaternion.x * quaternion.x;
  const xy = quaternion.x * quaternion.y;
  const xz = quaternion.x * quaternion.z;
  const xw = quaternion.x * quaternion.w;
  const y2 = quaternion.y * quaternion.y;
  const yz = quaternion.y * quaternion.z;
  const yw = quaternion.y * quaternion.w;
  const z2 = quaternion.z * quaternion.z;
  const zw = quaternion.z * quaternion.w;
  const w2 = quaternion.w * quaternion.w;
  const m00 = x2 - y2 - z2 + w2;
  const m01 = 2 * (xy - zw);
  const m02 = 2 * (xz + yw);
  const m10 = 2 * (xy + zw);
  const m11 = -x2 + y2 - z2 + w2;
  const m12 = 2 * (yz - xw);
  const m20 = 2 * (xz - yw);
  const m21 = 2 * (yz + xw);
  const m22 = -x2 - y2 + z2 + w2;
  if (!defined_default(result)) {
    return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
  }
  result[0] = m00;
  result[1] = m10;
  result[2] = m20;
  result[3] = m01;
  result[4] = m11;
  result[5] = m21;
  result[6] = m02;
  result[7] = m12;
  result[8] = m22;
  return result;
};
Matrix3.fromHeadingPitchRoll = function(headingPitchRoll, result) {
  Check_default.typeOf.object("headingPitchRoll", headingPitchRoll);
  const cosTheta = Math.cos(-headingPitchRoll.pitch);
  const cosPsi = Math.cos(-headingPitchRoll.heading);
  const cosPhi = Math.cos(headingPitchRoll.roll);
  const sinTheta = Math.sin(-headingPitchRoll.pitch);
  const sinPsi = Math.sin(-headingPitchRoll.heading);
  const sinPhi = Math.sin(headingPitchRoll.roll);
  const m00 = cosTheta * cosPsi;
  const m01 = -cosPhi * sinPsi + sinPhi * sinTheta * cosPsi;
  const m02 = sinPhi * sinPsi + cosPhi * sinTheta * cosPsi;
  const m10 = cosTheta * sinPsi;
  const m11 = cosPhi * cosPsi + sinPhi * sinTheta * sinPsi;
  const m12 = -sinPhi * cosPsi + cosPhi * sinTheta * sinPsi;
  const m20 = -sinTheta;
  const m21 = sinPhi * cosTheta;
  const m22 = cosPhi * cosTheta;
  if (!defined_default(result)) {
    return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
  }
  result[0] = m00;
  result[1] = m10;
  result[2] = m20;
  result[3] = m01;
  result[4] = m11;
  result[5] = m21;
  result[6] = m02;
  result[7] = m12;
  result[8] = m22;
  return result;
};
Matrix3.fromScale = function(scale, result) {
  Check_default.typeOf.object("scale", scale);
  if (!defined_default(result)) {
    return new Matrix3(scale.x, 0, 0, 0, scale.y, 0, 0, 0, scale.z);
  }
  result[0] = scale.x;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = scale.y;
  result[5] = 0;
  result[6] = 0;
  result[7] = 0;
  result[8] = scale.z;
  return result;
};
Matrix3.fromUniformScale = function(scale, result) {
  Check_default.typeOf.number("scale", scale);
  if (!defined_default(result)) {
    return new Matrix3(scale, 0, 0, 0, scale, 0, 0, 0, scale);
  }
  result[0] = scale;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = scale;
  result[5] = 0;
  result[6] = 0;
  result[7] = 0;
  result[8] = scale;
  return result;
};
Matrix3.fromCrossProduct = function(vector, result) {
  Check_default.typeOf.object("vector", vector);
  if (!defined_default(result)) {
    return new Matrix3(
      0,
      -vector.z,
      vector.y,
      vector.z,
      0,
      -vector.x,
      -vector.y,
      vector.x,
      0
    );
  }
  result[0] = 0;
  result[1] = vector.z;
  result[2] = -vector.y;
  result[3] = -vector.z;
  result[4] = 0;
  result[5] = vector.x;
  result[6] = vector.y;
  result[7] = -vector.x;
  result[8] = 0;
  return result;
};
Matrix3.fromRotationX = function(angle, result) {
  Check_default.typeOf.number("angle", angle);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  if (!defined_default(result)) {
    return new Matrix3(
      1,
      0,
      0,
      0,
      cosAngle,
      -sinAngle,
      0,
      sinAngle,
      cosAngle
    );
  }
  result[0] = 1;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = cosAngle;
  result[5] = sinAngle;
  result[6] = 0;
  result[7] = -sinAngle;
  result[8] = cosAngle;
  return result;
};
Matrix3.fromRotationY = function(angle, result) {
  Check_default.typeOf.number("angle", angle);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  if (!defined_default(result)) {
    return new Matrix3(
      cosAngle,
      0,
      sinAngle,
      0,
      1,
      0,
      -sinAngle,
      0,
      cosAngle
    );
  }
  result[0] = cosAngle;
  result[1] = 0;
  result[2] = -sinAngle;
  result[3] = 0;
  result[4] = 1;
  result[5] = 0;
  result[6] = sinAngle;
  result[7] = 0;
  result[8] = cosAngle;
  return result;
};
Matrix3.fromRotationZ = function(angle, result) {
  Check_default.typeOf.number("angle", angle);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  if (!defined_default(result)) {
    return new Matrix3(
      cosAngle,
      -sinAngle,
      0,
      sinAngle,
      cosAngle,
      0,
      0,
      0,
      1
    );
  }
  result[0] = cosAngle;
  result[1] = sinAngle;
  result[2] = 0;
  result[3] = -sinAngle;
  result[4] = cosAngle;
  result[5] = 0;
  result[6] = 0;
  result[7] = 0;
  result[8] = 1;
  return result;
};
Matrix3.toArray = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  if (!defined_default(result)) {
    return [
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      matrix[4],
      matrix[5],
      matrix[6],
      matrix[7],
      matrix[8]
    ];
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  return result;
};
Matrix3.getElementIndex = function(column, row) {
  Check_default.typeOf.number.greaterThanOrEquals("row", row, 0);
  Check_default.typeOf.number.lessThanOrEquals("row", row, 2);
  Check_default.typeOf.number.greaterThanOrEquals("column", column, 0);
  Check_default.typeOf.number.lessThanOrEquals("column", column, 2);
  return column * 3 + row;
};
Matrix3.getColumn = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 2);
  Check_default.typeOf.object("result", result);
  const startIndex = index * 3;
  const x = matrix[startIndex];
  const y = matrix[startIndex + 1];
  const z = matrix[startIndex + 2];
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix3.setColumn = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 2);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix3.clone(matrix, result);
  const startIndex = index * 3;
  result[startIndex] = cartesian.x;
  result[startIndex + 1] = cartesian.y;
  result[startIndex + 2] = cartesian.z;
  return result;
};
Matrix3.getRow = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 2);
  Check_default.typeOf.object("result", result);
  const x = matrix[index];
  const y = matrix[index + 3];
  const z = matrix[index + 6];
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix3.setRow = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 2);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix3.clone(matrix, result);
  result[index] = cartesian.x;
  result[index + 3] = cartesian.y;
  result[index + 6] = cartesian.z;
  return result;
};
var scaleScratch1 = new Cartesian3_default();
Matrix3.setScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix3.getScale(matrix, scaleScratch1);
  const scaleRatioX = scale.x / existingScale.x;
  const scaleRatioY = scale.y / existingScale.y;
  const scaleRatioZ = scale.z / existingScale.z;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3] * scaleRatioY;
  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioZ;
  result[7] = matrix[7] * scaleRatioZ;
  result[8] = matrix[8] * scaleRatioZ;
  return result;
};
var scaleScratch2 = new Cartesian3_default();
Matrix3.setUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix3.getScale(matrix, scaleScratch2);
  const scaleRatioX = scale / existingScale.x;
  const scaleRatioY = scale / existingScale.y;
  const scaleRatioZ = scale / existingScale.z;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3] * scaleRatioY;
  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioZ;
  result[7] = matrix[7] * scaleRatioZ;
  result[8] = matrix[8] * scaleRatioZ;
  return result;
};
var scratchColumn = new Cartesian3_default();
Matrix3.getScale = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result.x = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn)
  );
  result.y = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[3], matrix[4], matrix[5], scratchColumn)
  );
  result.z = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[6], matrix[7], matrix[8], scratchColumn)
  );
  return result;
};
var scaleScratch3 = new Cartesian3_default();
Matrix3.getMaximumScale = function(matrix) {
  Matrix3.getScale(matrix, scaleScratch3);
  return Cartesian3_default.maximumComponent(scaleScratch3);
};
var scaleScratch4 = new Cartesian3_default();
Matrix3.setRotation = function(matrix, rotation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix3.getScale(matrix, scaleScratch4);
  result[0] = rotation[0] * scale.x;
  result[1] = rotation[1] * scale.x;
  result[2] = rotation[2] * scale.x;
  result[3] = rotation[3] * scale.y;
  result[4] = rotation[4] * scale.y;
  result[5] = rotation[5] * scale.y;
  result[6] = rotation[6] * scale.z;
  result[7] = rotation[7] * scale.z;
  result[8] = rotation[8] * scale.z;
  return result;
};
var scaleScratch5 = new Cartesian3_default();
Matrix3.getRotation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix3.getScale(matrix, scaleScratch5);
  result[0] = matrix[0] / scale.x;
  result[1] = matrix[1] / scale.x;
  result[2] = matrix[2] / scale.x;
  result[3] = matrix[3] / scale.y;
  result[4] = matrix[4] / scale.y;
  result[5] = matrix[5] / scale.y;
  result[6] = matrix[6] / scale.z;
  result[7] = matrix[7] / scale.z;
  result[8] = matrix[8] / scale.z;
  return result;
};
Matrix3.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const column0Row0 = left[0] * right[0] + left[3] * right[1] + left[6] * right[2];
  const column0Row1 = left[1] * right[0] + left[4] * right[1] + left[7] * right[2];
  const column0Row2 = left[2] * right[0] + left[5] * right[1] + left[8] * right[2];
  const column1Row0 = left[0] * right[3] + left[3] * right[4] + left[6] * right[5];
  const column1Row1 = left[1] * right[3] + left[4] * right[4] + left[7] * right[5];
  const column1Row2 = left[2] * right[3] + left[5] * right[4] + left[8] * right[5];
  const column2Row0 = left[0] * right[6] + left[3] * right[7] + left[6] * right[8];
  const column2Row1 = left[1] * right[6] + left[4] * right[7] + left[7] * right[8];
  const column2Row2 = left[2] * right[6] + left[5] * right[7] + left[8] * right[8];
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = column1Row0;
  result[4] = column1Row1;
  result[5] = column1Row2;
  result[6] = column2Row0;
  result[7] = column2Row1;
  result[8] = column2Row2;
  return result;
};
Matrix3.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] + right[0];
  result[1] = left[1] + right[1];
  result[2] = left[2] + right[2];
  result[3] = left[3] + right[3];
  result[4] = left[4] + right[4];
  result[5] = left[5] + right[5];
  result[6] = left[6] + right[6];
  result[7] = left[7] + right[7];
  result[8] = left[8] + right[8];
  return result;
};
Matrix3.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] - right[0];
  result[1] = left[1] - right[1];
  result[2] = left[2] - right[2];
  result[3] = left[3] - right[3];
  result[4] = left[4] - right[4];
  result[5] = left[5] - right[5];
  result[6] = left[6] - right[6];
  result[7] = left[7] - right[7];
  result[8] = left[8] - right[8];
  return result;
};
Matrix3.multiplyByVector = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const x = matrix[0] * vX + matrix[3] * vY + matrix[6] * vZ;
  const y = matrix[1] * vX + matrix[4] * vY + matrix[7] * vZ;
  const z = matrix[2] * vX + matrix[5] * vY + matrix[8] * vZ;
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix3.multiplyByScalar = function(matrix, scalar, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scalar;
  result[1] = matrix[1] * scalar;
  result[2] = matrix[2] * scalar;
  result[3] = matrix[3] * scalar;
  result[4] = matrix[4] * scalar;
  result[5] = matrix[5] * scalar;
  result[6] = matrix[6] * scalar;
  result[7] = matrix[7] * scalar;
  result[8] = matrix[8] * scalar;
  return result;
};
Matrix3.multiplyByScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale.x;
  result[1] = matrix[1] * scale.x;
  result[2] = matrix[2] * scale.x;
  result[3] = matrix[3] * scale.y;
  result[4] = matrix[4] * scale.y;
  result[5] = matrix[5] * scale.y;
  result[6] = matrix[6] * scale.z;
  result[7] = matrix[7] * scale.z;
  result[8] = matrix[8] * scale.z;
  return result;
};
Matrix3.multiplyByUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale;
  result[1] = matrix[1] * scale;
  result[2] = matrix[2] * scale;
  result[3] = matrix[3] * scale;
  result[4] = matrix[4] * scale;
  result[5] = matrix[5] * scale;
  result[6] = matrix[6] * scale;
  result[7] = matrix[7] * scale;
  result[8] = matrix[8] * scale;
  return result;
};
Matrix3.negate = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = -matrix[0];
  result[1] = -matrix[1];
  result[2] = -matrix[2];
  result[3] = -matrix[3];
  result[4] = -matrix[4];
  result[5] = -matrix[5];
  result[6] = -matrix[6];
  result[7] = -matrix[7];
  result[8] = -matrix[8];
  return result;
};
Matrix3.transpose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const column0Row0 = matrix[0];
  const column0Row1 = matrix[3];
  const column0Row2 = matrix[6];
  const column1Row0 = matrix[1];
  const column1Row1 = matrix[4];
  const column1Row2 = matrix[7];
  const column2Row0 = matrix[2];
  const column2Row1 = matrix[5];
  const column2Row2 = matrix[8];
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = column1Row0;
  result[4] = column1Row1;
  result[5] = column1Row2;
  result[6] = column2Row0;
  result[7] = column2Row1;
  result[8] = column2Row2;
  return result;
};
function computeFrobeniusNorm(matrix) {
  let norm = 0;
  for (let i = 0; i < 9; ++i) {
    const temp = matrix[i];
    norm += temp * temp;
  }
  return Math.sqrt(norm);
}
var rowVal = [1, 0, 0];
var colVal = [2, 2, 1];
function offDiagonalFrobeniusNorm(matrix) {
  let norm = 0;
  for (let i = 0; i < 3; ++i) {
    const temp = matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])];
    norm += 2 * temp * temp;
  }
  return Math.sqrt(norm);
}
function shurDecomposition(matrix, result) {
  const tolerance = Math_default.EPSILON15;
  let maxDiagonal = 0;
  let rotAxis = 1;
  for (let i = 0; i < 3; ++i) {
    const temp = Math.abs(
      matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])]
    );
    if (temp > maxDiagonal) {
      rotAxis = i;
      maxDiagonal = temp;
    }
  }
  let c = 1;
  let s = 0;
  const p = rowVal[rotAxis];
  const q = colVal[rotAxis];
  if (Math.abs(matrix[Matrix3.getElementIndex(q, p)]) > tolerance) {
    const qq = matrix[Matrix3.getElementIndex(q, q)];
    const pp = matrix[Matrix3.getElementIndex(p, p)];
    const qp = matrix[Matrix3.getElementIndex(q, p)];
    const tau = (qq - pp) / 2 / qp;
    let t;
    if (tau < 0) {
      t = -1 / (-tau + Math.sqrt(1 + tau * tau));
    } else {
      t = 1 / (tau + Math.sqrt(1 + tau * tau));
    }
    c = 1 / Math.sqrt(1 + t * t);
    s = t * c;
  }
  result = Matrix3.clone(Matrix3.IDENTITY, result);
  result[Matrix3.getElementIndex(p, p)] = result[Matrix3.getElementIndex(q, q)] = c;
  result[Matrix3.getElementIndex(q, p)] = s;
  result[Matrix3.getElementIndex(p, q)] = -s;
  return result;
}
var jMatrix = new Matrix3();
var jMatrixTranspose = new Matrix3();
Matrix3.computeEigenDecomposition = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  const tolerance = Math_default.EPSILON20;
  const maxSweeps = 10;
  let count = 0;
  let sweep = 0;
  if (!defined_default(result)) {
    result = {};
  }
  const unitaryMatrix = result.unitary = Matrix3.clone(
    Matrix3.IDENTITY,
    result.unitary
  );
  const diagMatrix = result.diagonal = Matrix3.clone(matrix, result.diagonal);
  const epsilon = tolerance * computeFrobeniusNorm(diagMatrix);
  while (sweep < maxSweeps && offDiagonalFrobeniusNorm(diagMatrix) > epsilon) {
    shurDecomposition(diagMatrix, jMatrix);
    Matrix3.transpose(jMatrix, jMatrixTranspose);
    Matrix3.multiply(diagMatrix, jMatrix, diagMatrix);
    Matrix3.multiply(jMatrixTranspose, diagMatrix, diagMatrix);
    Matrix3.multiply(unitaryMatrix, jMatrix, unitaryMatrix);
    if (++count > 2) {
      ++sweep;
      count = 0;
    }
  }
  return result;
};
Matrix3.abs = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = Math.abs(matrix[0]);
  result[1] = Math.abs(matrix[1]);
  result[2] = Math.abs(matrix[2]);
  result[3] = Math.abs(matrix[3]);
  result[4] = Math.abs(matrix[4]);
  result[5] = Math.abs(matrix[5]);
  result[6] = Math.abs(matrix[6]);
  result[7] = Math.abs(matrix[7]);
  result[8] = Math.abs(matrix[8]);
  return result;
};
Matrix3.determinant = function(matrix) {
  Check_default.typeOf.object("matrix", matrix);
  const m11 = matrix[0];
  const m21 = matrix[3];
  const m31 = matrix[6];
  const m12 = matrix[1];
  const m22 = matrix[4];
  const m32 = matrix[7];
  const m13 = matrix[2];
  const m23 = matrix[5];
  const m33 = matrix[8];
  return m11 * (m22 * m33 - m23 * m32) + m12 * (m23 * m31 - m21 * m33) + m13 * (m21 * m32 - m22 * m31);
};
Matrix3.inverse = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const m11 = matrix[0];
  const m21 = matrix[1];
  const m31 = matrix[2];
  const m12 = matrix[3];
  const m22 = matrix[4];
  const m32 = matrix[5];
  const m13 = matrix[6];
  const m23 = matrix[7];
  const m33 = matrix[8];
  const determinant = Matrix3.determinant(matrix);
  if (Math.abs(determinant) <= Math_default.EPSILON15) {
    throw new DeveloperError_default("matrix is not invertible");
  }
  result[0] = m22 * m33 - m23 * m32;
  result[1] = m23 * m31 - m21 * m33;
  result[2] = m21 * m32 - m22 * m31;
  result[3] = m13 * m32 - m12 * m33;
  result[4] = m11 * m33 - m13 * m31;
  result[5] = m12 * m31 - m11 * m32;
  result[6] = m12 * m23 - m13 * m22;
  result[7] = m13 * m21 - m11 * m23;
  result[8] = m11 * m22 - m12 * m21;
  const scale = 1 / determinant;
  return Matrix3.multiplyByScalar(result, scale, result);
};
var scratchTransposeMatrix = new Matrix3();
Matrix3.inverseTranspose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  return Matrix3.inverse(
    Matrix3.transpose(matrix, scratchTransposeMatrix),
    result
  );
};
Matrix3.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left[0] === right[0] && left[1] === right[1] && left[2] === right[2] && left[3] === right[3] && left[4] === right[4] && left[5] === right[5] && left[6] === right[6] && left[7] === right[7] && left[8] === right[8];
};
Matrix3.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon && Math.abs(left[2] - right[2]) <= epsilon && Math.abs(left[3] - right[3]) <= epsilon && Math.abs(left[4] - right[4]) <= epsilon && Math.abs(left[5] - right[5]) <= epsilon && Math.abs(left[6] - right[6]) <= epsilon && Math.abs(left[7] - right[7]) <= epsilon && Math.abs(left[8] - right[8]) <= epsilon;
};
Matrix3.IDENTITY = Object.freeze(
  new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1)
);
Matrix3.ZERO = Object.freeze(
  new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0)
);
Matrix3.COLUMN0ROW0 = 0;
Matrix3.COLUMN0ROW1 = 1;
Matrix3.COLUMN0ROW2 = 2;
Matrix3.COLUMN1ROW0 = 3;
Matrix3.COLUMN1ROW1 = 4;
Matrix3.COLUMN1ROW2 = 5;
Matrix3.COLUMN2ROW0 = 6;
Matrix3.COLUMN2ROW1 = 7;
Matrix3.COLUMN2ROW2 = 8;
Object.defineProperties(Matrix3.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof Matrix3.prototype
   *
   * @type {number}
   */
  length: {
    get: function() {
      return Matrix3.packedLength;
    }
  }
});
Matrix3.prototype.clone = function(result) {
  return Matrix3.clone(this, result);
};
Matrix3.prototype.equals = function(right) {
  return Matrix3.equals(this, right);
};
Matrix3.equalsArray = function(matrix, array, offset) {
  return matrix[0] === array[offset] && matrix[1] === array[offset + 1] && matrix[2] === array[offset + 2] && matrix[3] === array[offset + 3] && matrix[4] === array[offset + 4] && matrix[5] === array[offset + 5] && matrix[6] === array[offset + 6] && matrix[7] === array[offset + 7] && matrix[8] === array[offset + 8];
};
Matrix3.prototype.equalsEpsilon = function(right, epsilon) {
  return Matrix3.equalsEpsilon(this, right, epsilon);
};
Matrix3.prototype.toString = function() {
  return `(${this[0]}, ${this[3]}, ${this[6]})
(${this[1]}, ${this[4]}, ${this[7]})
(${this[2]}, ${this[5]}, ${this[8]})`;
};
var Matrix3_default = Matrix3;

export {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
};
