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
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  RuntimeError_default
} from "./chunk-JQQW5OSU.js";
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

// packages/engine/Source/Core/Cartesian4.js
function Cartesian4(x, y, z, w) {
  this.x = defaultValue_default(x, 0);
  this.y = defaultValue_default(y, 0);
  this.z = defaultValue_default(z, 0);
  this.w = defaultValue_default(w, 0);
}
Cartesian4.fromElements = function(x, y, z, w, result) {
  if (!defined_default(result)) {
    return new Cartesian4(x, y, z, w);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Cartesian4.fromColor = function(color, result) {
  Check_default.typeOf.object("color", color);
  if (!defined_default(result)) {
    return new Cartesian4(color.red, color.green, color.blue, color.alpha);
  }
  result.x = color.red;
  result.y = color.green;
  result.z = color.blue;
  result.w = color.alpha;
  return result;
};
Cartesian4.clone = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  }
  result.x = cartesian.x;
  result.y = cartesian.y;
  result.z = cartesian.z;
  result.w = cartesian.w;
  return result;
};
Cartesian4.packedLength = 4;
Cartesian4.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex++] = value.z;
  array[startingIndex] = value.w;
  return array;
};
Cartesian4.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Cartesian4();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex++];
  result.z = array[startingIndex++];
  result.w = array[startingIndex];
  return result;
};
Cartesian4.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 4;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 4 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Cartesian4.pack(array[i], result, i * 4);
  }
  return result;
};
Cartesian4.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
  if (array.length % 4 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 4.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 4);
  } else {
    result.length = length / 4;
  }
  for (let i = 0; i < length; i += 4) {
    const index = i / 4;
    result[index] = Cartesian4.unpack(array, i, result[index]);
  }
  return result;
};
Cartesian4.fromArray = Cartesian4.unpack;
Cartesian4.maximumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.max(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
};
Cartesian4.minimumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.min(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
};
Cartesian4.minimumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.min(first.x, second.x);
  result.y = Math.min(first.y, second.y);
  result.z = Math.min(first.z, second.z);
  result.w = Math.min(first.w, second.w);
  return result;
};
Cartesian4.maximumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.max(first.x, second.x);
  result.y = Math.max(first.y, second.y);
  result.z = Math.max(first.z, second.z);
  result.w = Math.max(first.w, second.w);
  return result;
};
Cartesian4.clamp = function(value, min, max, result) {
  Check_default.typeOf.object("value", value);
  Check_default.typeOf.object("min", min);
  Check_default.typeOf.object("max", max);
  Check_default.typeOf.object("result", result);
  const x = Math_default.clamp(value.x, min.x, max.x);
  const y = Math_default.clamp(value.y, min.y, max.y);
  const z = Math_default.clamp(value.z, min.z, max.z);
  const w = Math_default.clamp(value.w, min.w, max.w);
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Cartesian4.magnitudeSquared = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z + cartesian.w * cartesian.w;
};
Cartesian4.magnitude = function(cartesian) {
  return Math.sqrt(Cartesian4.magnitudeSquared(cartesian));
};
var distanceScratch = new Cartesian4();
Cartesian4.distance = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian4.subtract(left, right, distanceScratch);
  return Cartesian4.magnitude(distanceScratch);
};
Cartesian4.distanceSquared = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian4.subtract(left, right, distanceScratch);
  return Cartesian4.magnitudeSquared(distanceScratch);
};
Cartesian4.normalize = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const magnitude = Cartesian4.magnitude(cartesian);
  result.x = cartesian.x / magnitude;
  result.y = cartesian.y / magnitude;
  result.z = cartesian.z / magnitude;
  result.w = cartesian.w / magnitude;
  if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z) || isNaN(result.w)) {
    throw new DeveloperError_default("normalized result is not a number");
  }
  return result;
};
Cartesian4.dot = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
};
Cartesian4.multiplyComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x * right.x;
  result.y = left.y * right.y;
  result.z = left.z * right.z;
  result.w = left.w * right.w;
  return result;
};
Cartesian4.divideComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x / right.x;
  result.y = left.y / right.y;
  result.z = left.z / right.z;
  result.w = left.w / right.w;
  return result;
};
Cartesian4.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x + right.x;
  result.y = left.y + right.y;
  result.z = left.z + right.z;
  result.w = left.w + right.w;
  return result;
};
Cartesian4.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x - right.x;
  result.y = left.y - right.y;
  result.z = left.z - right.z;
  result.w = left.w - right.w;
  return result;
};
Cartesian4.multiplyByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x * scalar;
  result.y = cartesian.y * scalar;
  result.z = cartesian.z * scalar;
  result.w = cartesian.w * scalar;
  return result;
};
Cartesian4.divideByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x / scalar;
  result.y = cartesian.y / scalar;
  result.z = cartesian.z / scalar;
  result.w = cartesian.w / scalar;
  return result;
};
Cartesian4.negate = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = -cartesian.x;
  result.y = -cartesian.y;
  result.z = -cartesian.z;
  result.w = -cartesian.w;
  return result;
};
Cartesian4.abs = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = Math.abs(cartesian.x);
  result.y = Math.abs(cartesian.y);
  result.z = Math.abs(cartesian.z);
  result.w = Math.abs(cartesian.w);
  return result;
};
var lerpScratch = new Cartesian4();
Cartesian4.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  Cartesian4.multiplyByScalar(end, t, lerpScratch);
  result = Cartesian4.multiplyByScalar(start, 1 - t, result);
  return Cartesian4.add(lerpScratch, result, result);
};
var mostOrthogonalAxisScratch = new Cartesian4();
Cartesian4.mostOrthogonalAxis = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const f = Cartesian4.normalize(cartesian, mostOrthogonalAxisScratch);
  Cartesian4.abs(f, f);
  if (f.x <= f.y) {
    if (f.x <= f.z) {
      if (f.x <= f.w) {
        result = Cartesian4.clone(Cartesian4.UNIT_X, result);
      } else {
        result = Cartesian4.clone(Cartesian4.UNIT_W, result);
      }
    } else if (f.z <= f.w) {
      result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
    } else {
      result = Cartesian4.clone(Cartesian4.UNIT_W, result);
    }
  } else if (f.y <= f.z) {
    if (f.y <= f.w) {
      result = Cartesian4.clone(Cartesian4.UNIT_Y, result);
    } else {
      result = Cartesian4.clone(Cartesian4.UNIT_W, result);
    }
  } else if (f.z <= f.w) {
    result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
  } else {
    result = Cartesian4.clone(Cartesian4.UNIT_W, result);
  }
  return result;
};
Cartesian4.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.x === right.x && left.y === right.y && left.z === right.z && left.w === right.w;
};
Cartesian4.equalsArray = function(cartesian, array, offset) {
  return cartesian.x === array[offset] && cartesian.y === array[offset + 1] && cartesian.z === array[offset + 2] && cartesian.w === array[offset + 3];
};
Cartesian4.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
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
  ) && Math_default.equalsEpsilon(
    left.w,
    right.w,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian4.ZERO = Object.freeze(new Cartesian4(0, 0, 0, 0));
Cartesian4.ONE = Object.freeze(new Cartesian4(1, 1, 1, 1));
Cartesian4.UNIT_X = Object.freeze(new Cartesian4(1, 0, 0, 0));
Cartesian4.UNIT_Y = Object.freeze(new Cartesian4(0, 1, 0, 0));
Cartesian4.UNIT_Z = Object.freeze(new Cartesian4(0, 0, 1, 0));
Cartesian4.UNIT_W = Object.freeze(new Cartesian4(0, 0, 0, 1));
Cartesian4.prototype.clone = function(result) {
  return Cartesian4.clone(this, result);
};
Cartesian4.prototype.equals = function(right) {
  return Cartesian4.equals(this, right);
};
Cartesian4.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
  return Cartesian4.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian4.prototype.toString = function() {
  return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
};
var scratchF32Array = new Float32Array(1);
var scratchU8Array = new Uint8Array(scratchF32Array.buffer);
var testU32 = new Uint32Array([287454020]);
var testU8 = new Uint8Array(testU32.buffer);
var littleEndian = testU8[0] === 68;
Cartesian4.packFloat = function(value, result) {
  Check_default.typeOf.number("value", value);
  if (!defined_default(result)) {
    result = new Cartesian4();
  }
  scratchF32Array[0] = value;
  if (littleEndian) {
    result.x = scratchU8Array[0];
    result.y = scratchU8Array[1];
    result.z = scratchU8Array[2];
    result.w = scratchU8Array[3];
  } else {
    result.x = scratchU8Array[3];
    result.y = scratchU8Array[2];
    result.z = scratchU8Array[1];
    result.w = scratchU8Array[0];
  }
  return result;
};
Cartesian4.unpackFloat = function(packedFloat) {
  Check_default.typeOf.object("packedFloat", packedFloat);
  if (littleEndian) {
    scratchU8Array[0] = packedFloat.x;
    scratchU8Array[1] = packedFloat.y;
    scratchU8Array[2] = packedFloat.z;
    scratchU8Array[3] = packedFloat.w;
  } else {
    scratchU8Array[0] = packedFloat.w;
    scratchU8Array[1] = packedFloat.z;
    scratchU8Array[2] = packedFloat.y;
    scratchU8Array[3] = packedFloat.x;
  }
  return scratchF32Array[0];
};
var Cartesian4_default = Cartesian4;

// packages/engine/Source/Core/Matrix4.js
function Matrix4(column0Row0, column1Row0, column2Row0, column3Row0, column0Row1, column1Row1, column2Row1, column3Row1, column0Row2, column1Row2, column2Row2, column3Row2, column0Row3, column1Row3, column2Row3, column3Row3) {
  this[0] = defaultValue_default(column0Row0, 0);
  this[1] = defaultValue_default(column0Row1, 0);
  this[2] = defaultValue_default(column0Row2, 0);
  this[3] = defaultValue_default(column0Row3, 0);
  this[4] = defaultValue_default(column1Row0, 0);
  this[5] = defaultValue_default(column1Row1, 0);
  this[6] = defaultValue_default(column1Row2, 0);
  this[7] = defaultValue_default(column1Row3, 0);
  this[8] = defaultValue_default(column2Row0, 0);
  this[9] = defaultValue_default(column2Row1, 0);
  this[10] = defaultValue_default(column2Row2, 0);
  this[11] = defaultValue_default(column2Row3, 0);
  this[12] = defaultValue_default(column3Row0, 0);
  this[13] = defaultValue_default(column3Row1, 0);
  this[14] = defaultValue_default(column3Row2, 0);
  this[15] = defaultValue_default(column3Row3, 0);
}
Matrix4.packedLength = 16;
Matrix4.pack = function(value, array, startingIndex) {
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
  array[startingIndex++] = value[9];
  array[startingIndex++] = value[10];
  array[startingIndex++] = value[11];
  array[startingIndex++] = value[12];
  array[startingIndex++] = value[13];
  array[startingIndex++] = value[14];
  array[startingIndex] = value[15];
  return array;
};
Matrix4.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Matrix4();
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
  result[9] = array[startingIndex++];
  result[10] = array[startingIndex++];
  result[11] = array[startingIndex++];
  result[12] = array[startingIndex++];
  result[13] = array[startingIndex++];
  result[14] = array[startingIndex++];
  result[15] = array[startingIndex];
  return result;
};
Matrix4.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 16;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 16 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Matrix4.pack(array[i], result, i * 16);
  }
  return result;
};
Matrix4.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 16);
  if (array.length % 16 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 16.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 16);
  } else {
    result.length = length / 16;
  }
  for (let i = 0; i < length; i += 16) {
    const index = i / 16;
    result[index] = Matrix4.unpack(array, i, result[index]);
  }
  return result;
};
Matrix4.clone = function(matrix, result) {
  if (!defined_default(matrix)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Matrix4(
      matrix[0],
      matrix[4],
      matrix[8],
      matrix[12],
      matrix[1],
      matrix[5],
      matrix[9],
      matrix[13],
      matrix[2],
      matrix[6],
      matrix[10],
      matrix[14],
      matrix[3],
      matrix[7],
      matrix[11],
      matrix[15]
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
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.fromArray = Matrix4.unpack;
Matrix4.fromColumnMajorArray = function(values, result) {
  Check_default.defined("values", values);
  return Matrix4.clone(values, result);
};
Matrix4.fromRowMajorArray = function(values, result) {
  Check_default.defined("values", values);
  if (!defined_default(result)) {
    return new Matrix4(
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5],
      values[6],
      values[7],
      values[8],
      values[9],
      values[10],
      values[11],
      values[12],
      values[13],
      values[14],
      values[15]
    );
  }
  result[0] = values[0];
  result[1] = values[4];
  result[2] = values[8];
  result[3] = values[12];
  result[4] = values[1];
  result[5] = values[5];
  result[6] = values[9];
  result[7] = values[13];
  result[8] = values[2];
  result[9] = values[6];
  result[10] = values[10];
  result[11] = values[14];
  result[12] = values[3];
  result[13] = values[7];
  result[14] = values[11];
  result[15] = values[15];
  return result;
};
Matrix4.fromRotationTranslation = function(rotation, translation, result) {
  Check_default.typeOf.object("rotation", rotation);
  translation = defaultValue_default(translation, Cartesian3_default.ZERO);
  if (!defined_default(result)) {
    return new Matrix4(
      rotation[0],
      rotation[3],
      rotation[6],
      translation.x,
      rotation[1],
      rotation[4],
      rotation[7],
      translation.y,
      rotation[2],
      rotation[5],
      rotation[8],
      translation.z,
      0,
      0,
      0,
      1
    );
  }
  result[0] = rotation[0];
  result[1] = rotation[1];
  result[2] = rotation[2];
  result[3] = 0;
  result[4] = rotation[3];
  result[5] = rotation[4];
  result[6] = rotation[5];
  result[7] = 0;
  result[8] = rotation[6];
  result[9] = rotation[7];
  result[10] = rotation[8];
  result[11] = 0;
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = 1;
  return result;
};
Matrix4.fromTranslationQuaternionRotationScale = function(translation, rotation, scale, result) {
  Check_default.typeOf.object("translation", translation);
  Check_default.typeOf.object("rotation", rotation);
  Check_default.typeOf.object("scale", scale);
  if (!defined_default(result)) {
    result = new Matrix4();
  }
  const scaleX = scale.x;
  const scaleY = scale.y;
  const scaleZ = scale.z;
  const x2 = rotation.x * rotation.x;
  const xy = rotation.x * rotation.y;
  const xz = rotation.x * rotation.z;
  const xw = rotation.x * rotation.w;
  const y2 = rotation.y * rotation.y;
  const yz = rotation.y * rotation.z;
  const yw = rotation.y * rotation.w;
  const z2 = rotation.z * rotation.z;
  const zw = rotation.z * rotation.w;
  const w2 = rotation.w * rotation.w;
  const m00 = x2 - y2 - z2 + w2;
  const m01 = 2 * (xy - zw);
  const m02 = 2 * (xz + yw);
  const m10 = 2 * (xy + zw);
  const m11 = -x2 + y2 - z2 + w2;
  const m12 = 2 * (yz - xw);
  const m20 = 2 * (xz - yw);
  const m21 = 2 * (yz + xw);
  const m22 = -x2 - y2 + z2 + w2;
  result[0] = m00 * scaleX;
  result[1] = m10 * scaleX;
  result[2] = m20 * scaleX;
  result[3] = 0;
  result[4] = m01 * scaleY;
  result[5] = m11 * scaleY;
  result[6] = m21 * scaleY;
  result[7] = 0;
  result[8] = m02 * scaleZ;
  result[9] = m12 * scaleZ;
  result[10] = m22 * scaleZ;
  result[11] = 0;
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = 1;
  return result;
};
Matrix4.fromTranslationRotationScale = function(translationRotationScale, result) {
  Check_default.typeOf.object("translationRotationScale", translationRotationScale);
  return Matrix4.fromTranslationQuaternionRotationScale(
    translationRotationScale.translation,
    translationRotationScale.rotation,
    translationRotationScale.scale,
    result
  );
};
Matrix4.fromTranslation = function(translation, result) {
  Check_default.typeOf.object("translation", translation);
  return Matrix4.fromRotationTranslation(Matrix3_default.IDENTITY, translation, result);
};
Matrix4.fromScale = function(scale, result) {
  Check_default.typeOf.object("scale", scale);
  if (!defined_default(result)) {
    return new Matrix4(
      scale.x,
      0,
      0,
      0,
      0,
      scale.y,
      0,
      0,
      0,
      0,
      scale.z,
      0,
      0,
      0,
      0,
      1
    );
  }
  result[0] = scale.x;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = scale.y;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = scale.z;
  result[11] = 0;
  result[12] = 0;
  result[13] = 0;
  result[14] = 0;
  result[15] = 1;
  return result;
};
Matrix4.fromUniformScale = function(scale, result) {
  Check_default.typeOf.number("scale", scale);
  if (!defined_default(result)) {
    return new Matrix4(
      scale,
      0,
      0,
      0,
      0,
      scale,
      0,
      0,
      0,
      0,
      scale,
      0,
      0,
      0,
      0,
      1
    );
  }
  result[0] = scale;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = scale;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = scale;
  result[11] = 0;
  result[12] = 0;
  result[13] = 0;
  result[14] = 0;
  result[15] = 1;
  return result;
};
Matrix4.fromRotation = function(rotation, result) {
  Check_default.typeOf.object("rotation", rotation);
  if (!defined_default(result)) {
    result = new Matrix4();
  }
  result[0] = rotation[0];
  result[1] = rotation[1];
  result[2] = rotation[2];
  result[3] = 0;
  result[4] = rotation[3];
  result[5] = rotation[4];
  result[6] = rotation[5];
  result[7] = 0;
  result[8] = rotation[6];
  result[9] = rotation[7];
  result[10] = rotation[8];
  result[11] = 0;
  result[12] = 0;
  result[13] = 0;
  result[14] = 0;
  result[15] = 1;
  return result;
};
var fromCameraF = new Cartesian3_default();
var fromCameraR = new Cartesian3_default();
var fromCameraU = new Cartesian3_default();
Matrix4.fromCamera = function(camera, result) {
  Check_default.typeOf.object("camera", camera);
  const position = camera.position;
  const direction = camera.direction;
  const up = camera.up;
  Check_default.typeOf.object("camera.position", position);
  Check_default.typeOf.object("camera.direction", direction);
  Check_default.typeOf.object("camera.up", up);
  Cartesian3_default.normalize(direction, fromCameraF);
  Cartesian3_default.normalize(
    Cartesian3_default.cross(fromCameraF, up, fromCameraR),
    fromCameraR
  );
  Cartesian3_default.normalize(
    Cartesian3_default.cross(fromCameraR, fromCameraF, fromCameraU),
    fromCameraU
  );
  const sX = fromCameraR.x;
  const sY = fromCameraR.y;
  const sZ = fromCameraR.z;
  const fX = fromCameraF.x;
  const fY = fromCameraF.y;
  const fZ = fromCameraF.z;
  const uX = fromCameraU.x;
  const uY = fromCameraU.y;
  const uZ = fromCameraU.z;
  const positionX = position.x;
  const positionY = position.y;
  const positionZ = position.z;
  const t0 = sX * -positionX + sY * -positionY + sZ * -positionZ;
  const t1 = uX * -positionX + uY * -positionY + uZ * -positionZ;
  const t2 = fX * positionX + fY * positionY + fZ * positionZ;
  if (!defined_default(result)) {
    return new Matrix4(
      sX,
      sY,
      sZ,
      t0,
      uX,
      uY,
      uZ,
      t1,
      -fX,
      -fY,
      -fZ,
      t2,
      0,
      0,
      0,
      1
    );
  }
  result[0] = sX;
  result[1] = uX;
  result[2] = -fX;
  result[3] = 0;
  result[4] = sY;
  result[5] = uY;
  result[6] = -fY;
  result[7] = 0;
  result[8] = sZ;
  result[9] = uZ;
  result[10] = -fZ;
  result[11] = 0;
  result[12] = t0;
  result[13] = t1;
  result[14] = t2;
  result[15] = 1;
  return result;
};
Matrix4.computePerspectiveFieldOfView = function(fovY, aspectRatio, near, far, result) {
  Check_default.typeOf.number.greaterThan("fovY", fovY, 0);
  Check_default.typeOf.number.lessThan("fovY", fovY, Math.PI);
  Check_default.typeOf.number.greaterThan("near", near, 0);
  Check_default.typeOf.number.greaterThan("far", far, 0);
  Check_default.typeOf.object("result", result);
  const bottom = Math.tan(fovY * 0.5);
  const column1Row1 = 1 / bottom;
  const column0Row0 = column1Row1 / aspectRatio;
  const column2Row2 = (far + near) / (near - far);
  const column3Row2 = 2 * far * near / (near - far);
  result[0] = column0Row0;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = column1Row1;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = column2Row2;
  result[11] = -1;
  result[12] = 0;
  result[13] = 0;
  result[14] = column3Row2;
  result[15] = 0;
  return result;
};
Matrix4.computeOrthographicOffCenter = function(left, right, bottom, top, near, far, result) {
  Check_default.typeOf.number("left", left);
  Check_default.typeOf.number("right", right);
  Check_default.typeOf.number("bottom", bottom);
  Check_default.typeOf.number("top", top);
  Check_default.typeOf.number("near", near);
  Check_default.typeOf.number("far", far);
  Check_default.typeOf.object("result", result);
  let a = 1 / (right - left);
  let b = 1 / (top - bottom);
  let c = 1 / (far - near);
  const tx = -(right + left) * a;
  const ty = -(top + bottom) * b;
  const tz = -(far + near) * c;
  a *= 2;
  b *= 2;
  c *= -2;
  result[0] = a;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = b;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = c;
  result[11] = 0;
  result[12] = tx;
  result[13] = ty;
  result[14] = tz;
  result[15] = 1;
  return result;
};
Matrix4.computePerspectiveOffCenter = function(left, right, bottom, top, near, far, result) {
  Check_default.typeOf.number("left", left);
  Check_default.typeOf.number("right", right);
  Check_default.typeOf.number("bottom", bottom);
  Check_default.typeOf.number("top", top);
  Check_default.typeOf.number("near", near);
  Check_default.typeOf.number("far", far);
  Check_default.typeOf.object("result", result);
  const column0Row0 = 2 * near / (right - left);
  const column1Row1 = 2 * near / (top - bottom);
  const column2Row0 = (right + left) / (right - left);
  const column2Row1 = (top + bottom) / (top - bottom);
  const column2Row2 = -(far + near) / (far - near);
  const column2Row3 = -1;
  const column3Row2 = -2 * far * near / (far - near);
  result[0] = column0Row0;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = column1Row1;
  result[6] = 0;
  result[7] = 0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = 0;
  result[13] = 0;
  result[14] = column3Row2;
  result[15] = 0;
  return result;
};
Matrix4.computeInfinitePerspectiveOffCenter = function(left, right, bottom, top, near, result) {
  Check_default.typeOf.number("left", left);
  Check_default.typeOf.number("right", right);
  Check_default.typeOf.number("bottom", bottom);
  Check_default.typeOf.number("top", top);
  Check_default.typeOf.number("near", near);
  Check_default.typeOf.object("result", result);
  const column0Row0 = 2 * near / (right - left);
  const column1Row1 = 2 * near / (top - bottom);
  const column2Row0 = (right + left) / (right - left);
  const column2Row1 = (top + bottom) / (top - bottom);
  const column2Row2 = -1;
  const column2Row3 = -1;
  const column3Row2 = -2 * near;
  result[0] = column0Row0;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = column1Row1;
  result[6] = 0;
  result[7] = 0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = 0;
  result[13] = 0;
  result[14] = column3Row2;
  result[15] = 0;
  return result;
};
Matrix4.computeViewportTransformation = function(viewport, nearDepthRange, farDepthRange, result) {
  if (!defined_default(result)) {
    result = new Matrix4();
  }
  viewport = defaultValue_default(viewport, defaultValue_default.EMPTY_OBJECT);
  const x = defaultValue_default(viewport.x, 0);
  const y = defaultValue_default(viewport.y, 0);
  const width = defaultValue_default(viewport.width, 0);
  const height = defaultValue_default(viewport.height, 0);
  nearDepthRange = defaultValue_default(nearDepthRange, 0);
  farDepthRange = defaultValue_default(farDepthRange, 1);
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const halfDepth = (farDepthRange - nearDepthRange) * 0.5;
  const column0Row0 = halfWidth;
  const column1Row1 = halfHeight;
  const column2Row2 = halfDepth;
  const column3Row0 = x + halfWidth;
  const column3Row1 = y + halfHeight;
  const column3Row2 = nearDepthRange + halfDepth;
  const column3Row3 = 1;
  result[0] = column0Row0;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = column1Row1;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = column2Row2;
  result[11] = 0;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = column3Row3;
  return result;
};
Matrix4.computeView = function(position, direction, up, right, result) {
  Check_default.typeOf.object("position", position);
  Check_default.typeOf.object("direction", direction);
  Check_default.typeOf.object("up", up);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = right.x;
  result[1] = up.x;
  result[2] = -direction.x;
  result[3] = 0;
  result[4] = right.y;
  result[5] = up.y;
  result[6] = -direction.y;
  result[7] = 0;
  result[8] = right.z;
  result[9] = up.z;
  result[10] = -direction.z;
  result[11] = 0;
  result[12] = -Cartesian3_default.dot(right, position);
  result[13] = -Cartesian3_default.dot(up, position);
  result[14] = Cartesian3_default.dot(direction, position);
  result[15] = 1;
  return result;
};
Matrix4.toArray = function(matrix, result) {
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
      matrix[8],
      matrix[9],
      matrix[10],
      matrix[11],
      matrix[12],
      matrix[13],
      matrix[14],
      matrix[15]
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
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.getElementIndex = function(column, row) {
  Check_default.typeOf.number.greaterThanOrEquals("row", row, 0);
  Check_default.typeOf.number.lessThanOrEquals("row", row, 3);
  Check_default.typeOf.number.greaterThanOrEquals("column", column, 0);
  Check_default.typeOf.number.lessThanOrEquals("column", column, 3);
  return column * 4 + row;
};
Matrix4.getColumn = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 3);
  Check_default.typeOf.object("result", result);
  const startIndex = index * 4;
  const x = matrix[startIndex];
  const y = matrix[startIndex + 1];
  const z = matrix[startIndex + 2];
  const w = matrix[startIndex + 3];
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Matrix4.setColumn = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 3);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix4.clone(matrix, result);
  const startIndex = index * 4;
  result[startIndex] = cartesian.x;
  result[startIndex + 1] = cartesian.y;
  result[startIndex + 2] = cartesian.z;
  result[startIndex + 3] = cartesian.w;
  return result;
};
Matrix4.getRow = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 3);
  Check_default.typeOf.object("result", result);
  const x = matrix[index];
  const y = matrix[index + 4];
  const z = matrix[index + 8];
  const w = matrix[index + 12];
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Matrix4.setRow = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 3);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix4.clone(matrix, result);
  result[index] = cartesian.x;
  result[index + 4] = cartesian.y;
  result[index + 8] = cartesian.z;
  result[index + 12] = cartesian.w;
  return result;
};
Matrix4.setTranslation = function(matrix, translation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("translation", translation);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = matrix[15];
  return result;
};
var scaleScratch1 = new Cartesian3_default();
Matrix4.setScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix4.getScale(matrix, scaleScratch1);
  const scaleRatioX = scale.x / existingScale.x;
  const scaleRatioY = scale.y / existingScale.y;
  const scaleRatioZ = scale.z / existingScale.z;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3];
  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioY;
  result[7] = matrix[7];
  result[8] = matrix[8] * scaleRatioZ;
  result[9] = matrix[9] * scaleRatioZ;
  result[10] = matrix[10] * scaleRatioZ;
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
var scaleScratch2 = new Cartesian3_default();
Matrix4.setUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix4.getScale(matrix, scaleScratch2);
  const scaleRatioX = scale / existingScale.x;
  const scaleRatioY = scale / existingScale.y;
  const scaleRatioZ = scale / existingScale.z;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3];
  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioY;
  result[7] = matrix[7];
  result[8] = matrix[8] * scaleRatioZ;
  result[9] = matrix[9] * scaleRatioZ;
  result[10] = matrix[10] * scaleRatioZ;
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
var scratchColumn = new Cartesian3_default();
Matrix4.getScale = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result.x = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn)
  );
  result.y = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[4], matrix[5], matrix[6], scratchColumn)
  );
  result.z = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[8], matrix[9], matrix[10], scratchColumn)
  );
  return result;
};
var scaleScratch3 = new Cartesian3_default();
Matrix4.getMaximumScale = function(matrix) {
  Matrix4.getScale(matrix, scaleScratch3);
  return Cartesian3_default.maximumComponent(scaleScratch3);
};
var scaleScratch4 = new Cartesian3_default();
Matrix4.setRotation = function(matrix, rotation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix4.getScale(matrix, scaleScratch4);
  result[0] = rotation[0] * scale.x;
  result[1] = rotation[1] * scale.x;
  result[2] = rotation[2] * scale.x;
  result[3] = matrix[3];
  result[4] = rotation[3] * scale.y;
  result[5] = rotation[4] * scale.y;
  result[6] = rotation[5] * scale.y;
  result[7] = matrix[7];
  result[8] = rotation[6] * scale.z;
  result[9] = rotation[7] * scale.z;
  result[10] = rotation[8] * scale.z;
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
var scaleScratch5 = new Cartesian3_default();
Matrix4.getRotation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix4.getScale(matrix, scaleScratch5);
  result[0] = matrix[0] / scale.x;
  result[1] = matrix[1] / scale.x;
  result[2] = matrix[2] / scale.x;
  result[3] = matrix[4] / scale.y;
  result[4] = matrix[5] / scale.y;
  result[5] = matrix[6] / scale.y;
  result[6] = matrix[8] / scale.z;
  result[7] = matrix[9] / scale.z;
  result[8] = matrix[10] / scale.z;
  return result;
};
Matrix4.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const left0 = left[0];
  const left1 = left[1];
  const left2 = left[2];
  const left3 = left[3];
  const left4 = left[4];
  const left5 = left[5];
  const left6 = left[6];
  const left7 = left[7];
  const left8 = left[8];
  const left9 = left[9];
  const left10 = left[10];
  const left11 = left[11];
  const left12 = left[12];
  const left13 = left[13];
  const left14 = left[14];
  const left15 = left[15];
  const right0 = right[0];
  const right1 = right[1];
  const right2 = right[2];
  const right3 = right[3];
  const right4 = right[4];
  const right5 = right[5];
  const right6 = right[6];
  const right7 = right[7];
  const right8 = right[8];
  const right9 = right[9];
  const right10 = right[10];
  const right11 = right[11];
  const right12 = right[12];
  const right13 = right[13];
  const right14 = right[14];
  const right15 = right[15];
  const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
  const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
  const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
  const column0Row3 = left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;
  const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
  const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
  const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
  const column1Row3 = left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;
  const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
  const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
  const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
  const column2Row3 = left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;
  const column3Row0 = left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
  const column3Row1 = left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
  const column3Row2 = left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
  const column3Row3 = left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15;
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = column0Row3;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = column1Row3;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = column3Row3;
  return result;
};
Matrix4.add = function(left, right, result) {
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
  result[9] = left[9] + right[9];
  result[10] = left[10] + right[10];
  result[11] = left[11] + right[11];
  result[12] = left[12] + right[12];
  result[13] = left[13] + right[13];
  result[14] = left[14] + right[14];
  result[15] = left[15] + right[15];
  return result;
};
Matrix4.subtract = function(left, right, result) {
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
  result[9] = left[9] - right[9];
  result[10] = left[10] - right[10];
  result[11] = left[11] - right[11];
  result[12] = left[12] - right[12];
  result[13] = left[13] - right[13];
  result[14] = left[14] - right[14];
  result[15] = left[15] - right[15];
  return result;
};
Matrix4.multiplyTransformation = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const left0 = left[0];
  const left1 = left[1];
  const left2 = left[2];
  const left4 = left[4];
  const left5 = left[5];
  const left6 = left[6];
  const left8 = left[8];
  const left9 = left[9];
  const left10 = left[10];
  const left12 = left[12];
  const left13 = left[13];
  const left14 = left[14];
  const right0 = right[0];
  const right1 = right[1];
  const right2 = right[2];
  const right4 = right[4];
  const right5 = right[5];
  const right6 = right[6];
  const right8 = right[8];
  const right9 = right[9];
  const right10 = right[10];
  const right12 = right[12];
  const right13 = right[13];
  const right14 = right[14];
  const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
  const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
  const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;
  const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
  const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
  const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;
  const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
  const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
  const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;
  const column3Row0 = left0 * right12 + left4 * right13 + left8 * right14 + left12;
  const column3Row1 = left1 * right12 + left5 * right13 + left9 * right14 + left13;
  const column3Row2 = left2 * right12 + left6 * right13 + left10 * right14 + left14;
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = 0;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = 0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = 0;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = 1;
  return result;
};
Matrix4.multiplyByMatrix3 = function(matrix, rotation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("rotation", rotation);
  Check_default.typeOf.object("result", result);
  const left0 = matrix[0];
  const left1 = matrix[1];
  const left2 = matrix[2];
  const left4 = matrix[4];
  const left5 = matrix[5];
  const left6 = matrix[6];
  const left8 = matrix[8];
  const left9 = matrix[9];
  const left10 = matrix[10];
  const right0 = rotation[0];
  const right1 = rotation[1];
  const right2 = rotation[2];
  const right4 = rotation[3];
  const right5 = rotation[4];
  const right6 = rotation[5];
  const right8 = rotation[6];
  const right9 = rotation[7];
  const right10 = rotation[8];
  const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
  const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
  const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;
  const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
  const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
  const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;
  const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
  const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
  const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = 0;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = 0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = 0;
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.multiplyByTranslation = function(matrix, translation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("translation", translation);
  Check_default.typeOf.object("result", result);
  const x = translation.x;
  const y = translation.y;
  const z = translation.z;
  const tx = x * matrix[0] + y * matrix[4] + z * matrix[8] + matrix[12];
  const ty = x * matrix[1] + y * matrix[5] + z * matrix[9] + matrix[13];
  const tz = x * matrix[2] + y * matrix[6] + z * matrix[10] + matrix[14];
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = tx;
  result[13] = ty;
  result[14] = tz;
  result[15] = matrix[15];
  return result;
};
Matrix4.multiplyByScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  const scaleX = scale.x;
  const scaleY = scale.y;
  const scaleZ = scale.z;
  if (scaleX === 1 && scaleY === 1 && scaleZ === 1) {
    return Matrix4.clone(matrix, result);
  }
  result[0] = scaleX * matrix[0];
  result[1] = scaleX * matrix[1];
  result[2] = scaleX * matrix[2];
  result[3] = matrix[3];
  result[4] = scaleY * matrix[4];
  result[5] = scaleY * matrix[5];
  result[6] = scaleY * matrix[6];
  result[7] = matrix[7];
  result[8] = scaleZ * matrix[8];
  result[9] = scaleZ * matrix[9];
  result[10] = scaleZ * matrix[10];
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.multiplyByUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale;
  result[1] = matrix[1] * scale;
  result[2] = matrix[2] * scale;
  result[3] = matrix[3];
  result[4] = matrix[4] * scale;
  result[5] = matrix[5] * scale;
  result[6] = matrix[6] * scale;
  result[7] = matrix[7];
  result[8] = matrix[8] * scale;
  result[9] = matrix[9] * scale;
  result[10] = matrix[10] * scale;
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.multiplyByVector = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const vW = cartesian.w;
  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
  const w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Matrix4.multiplyByPointAsVector = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ;
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ;
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ;
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix4.multiplyByPoint = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix4.multiplyByScalar = function(matrix, scalar, result) {
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
  result[9] = matrix[9] * scalar;
  result[10] = matrix[10] * scalar;
  result[11] = matrix[11] * scalar;
  result[12] = matrix[12] * scalar;
  result[13] = matrix[13] * scalar;
  result[14] = matrix[14] * scalar;
  result[15] = matrix[15] * scalar;
  return result;
};
Matrix4.negate = function(matrix, result) {
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
  result[9] = -matrix[9];
  result[10] = -matrix[10];
  result[11] = -matrix[11];
  result[12] = -matrix[12];
  result[13] = -matrix[13];
  result[14] = -matrix[14];
  result[15] = -matrix[15];
  return result;
};
Matrix4.transpose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const matrix1 = matrix[1];
  const matrix2 = matrix[2];
  const matrix3 = matrix[3];
  const matrix6 = matrix[6];
  const matrix7 = matrix[7];
  const matrix11 = matrix[11];
  result[0] = matrix[0];
  result[1] = matrix[4];
  result[2] = matrix[8];
  result[3] = matrix[12];
  result[4] = matrix1;
  result[5] = matrix[5];
  result[6] = matrix[9];
  result[7] = matrix[13];
  result[8] = matrix2;
  result[9] = matrix6;
  result[10] = matrix[10];
  result[11] = matrix[14];
  result[12] = matrix3;
  result[13] = matrix7;
  result[14] = matrix11;
  result[15] = matrix[15];
  return result;
};
Matrix4.abs = function(matrix, result) {
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
  result[9] = Math.abs(matrix[9]);
  result[10] = Math.abs(matrix[10]);
  result[11] = Math.abs(matrix[11]);
  result[12] = Math.abs(matrix[12]);
  result[13] = Math.abs(matrix[13]);
  result[14] = Math.abs(matrix[14]);
  result[15] = Math.abs(matrix[15]);
  return result;
};
Matrix4.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && // Translation
  left[12] === right[12] && left[13] === right[13] && left[14] === right[14] && // Rotation/scale
  left[0] === right[0] && left[1] === right[1] && left[2] === right[2] && left[4] === right[4] && left[5] === right[5] && left[6] === right[6] && left[8] === right[8] && left[9] === right[9] && left[10] === right[10] && // Bottom row
  left[3] === right[3] && left[7] === right[7] && left[11] === right[11] && left[15] === right[15];
};
Matrix4.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon && Math.abs(left[2] - right[2]) <= epsilon && Math.abs(left[3] - right[3]) <= epsilon && Math.abs(left[4] - right[4]) <= epsilon && Math.abs(left[5] - right[5]) <= epsilon && Math.abs(left[6] - right[6]) <= epsilon && Math.abs(left[7] - right[7]) <= epsilon && Math.abs(left[8] - right[8]) <= epsilon && Math.abs(left[9] - right[9]) <= epsilon && Math.abs(left[10] - right[10]) <= epsilon && Math.abs(left[11] - right[11]) <= epsilon && Math.abs(left[12] - right[12]) <= epsilon && Math.abs(left[13] - right[13]) <= epsilon && Math.abs(left[14] - right[14]) <= epsilon && Math.abs(left[15] - right[15]) <= epsilon;
};
Matrix4.getTranslation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result.x = matrix[12];
  result.y = matrix[13];
  result.z = matrix[14];
  return result;
};
Matrix4.getMatrix3 = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[4];
  result[4] = matrix[5];
  result[5] = matrix[6];
  result[6] = matrix[8];
  result[7] = matrix[9];
  result[8] = matrix[10];
  return result;
};
var scratchInverseRotation = new Matrix3_default();
var scratchMatrix3Zero = new Matrix3_default();
var scratchBottomRow = new Cartesian4_default();
var scratchExpectedBottomRow = new Cartesian4_default(0, 0, 0, 1);
Matrix4.inverse = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const src0 = matrix[0];
  const src1 = matrix[4];
  const src2 = matrix[8];
  const src3 = matrix[12];
  const src4 = matrix[1];
  const src5 = matrix[5];
  const src6 = matrix[9];
  const src7 = matrix[13];
  const src8 = matrix[2];
  const src9 = matrix[6];
  const src10 = matrix[10];
  const src11 = matrix[14];
  const src12 = matrix[3];
  const src13 = matrix[7];
  const src14 = matrix[11];
  const src15 = matrix[15];
  let tmp0 = src10 * src15;
  let tmp1 = src11 * src14;
  let tmp2 = src9 * src15;
  let tmp3 = src11 * src13;
  let tmp4 = src9 * src14;
  let tmp5 = src10 * src13;
  let tmp6 = src8 * src15;
  let tmp7 = src11 * src12;
  let tmp8 = src8 * src14;
  let tmp9 = src10 * src12;
  let tmp10 = src8 * src13;
  let tmp11 = src9 * src12;
  const dst0 = tmp0 * src5 + tmp3 * src6 + tmp4 * src7 - (tmp1 * src5 + tmp2 * src6 + tmp5 * src7);
  const dst1 = tmp1 * src4 + tmp6 * src6 + tmp9 * src7 - (tmp0 * src4 + tmp7 * src6 + tmp8 * src7);
  const dst2 = tmp2 * src4 + tmp7 * src5 + tmp10 * src7 - (tmp3 * src4 + tmp6 * src5 + tmp11 * src7);
  const dst3 = tmp5 * src4 + tmp8 * src5 + tmp11 * src6 - (tmp4 * src4 + tmp9 * src5 + tmp10 * src6);
  const dst4 = tmp1 * src1 + tmp2 * src2 + tmp5 * src3 - (tmp0 * src1 + tmp3 * src2 + tmp4 * src3);
  const dst5 = tmp0 * src0 + tmp7 * src2 + tmp8 * src3 - (tmp1 * src0 + tmp6 * src2 + tmp9 * src3);
  const dst6 = tmp3 * src0 + tmp6 * src1 + tmp11 * src3 - (tmp2 * src0 + tmp7 * src1 + tmp10 * src3);
  const dst7 = tmp4 * src0 + tmp9 * src1 + tmp10 * src2 - (tmp5 * src0 + tmp8 * src1 + tmp11 * src2);
  tmp0 = src2 * src7;
  tmp1 = src3 * src6;
  tmp2 = src1 * src7;
  tmp3 = src3 * src5;
  tmp4 = src1 * src6;
  tmp5 = src2 * src5;
  tmp6 = src0 * src7;
  tmp7 = src3 * src4;
  tmp8 = src0 * src6;
  tmp9 = src2 * src4;
  tmp10 = src0 * src5;
  tmp11 = src1 * src4;
  const dst8 = tmp0 * src13 + tmp3 * src14 + tmp4 * src15 - (tmp1 * src13 + tmp2 * src14 + tmp5 * src15);
  const dst9 = tmp1 * src12 + tmp6 * src14 + tmp9 * src15 - (tmp0 * src12 + tmp7 * src14 + tmp8 * src15);
  const dst10 = tmp2 * src12 + tmp7 * src13 + tmp10 * src15 - (tmp3 * src12 + tmp6 * src13 + tmp11 * src15);
  const dst11 = tmp5 * src12 + tmp8 * src13 + tmp11 * src14 - (tmp4 * src12 + tmp9 * src13 + tmp10 * src14);
  const dst12 = tmp2 * src10 + tmp5 * src11 + tmp1 * src9 - (tmp4 * src11 + tmp0 * src9 + tmp3 * src10);
  const dst13 = tmp8 * src11 + tmp0 * src8 + tmp7 * src10 - (tmp6 * src10 + tmp9 * src11 + tmp1 * src8);
  const dst14 = tmp6 * src9 + tmp11 * src11 + tmp3 * src8 - (tmp10 * src11 + tmp2 * src8 + tmp7 * src9);
  const dst15 = tmp10 * src10 + tmp4 * src8 + tmp9 * src9 - (tmp8 * src9 + tmp11 * src10 + tmp5 * src8);
  let det = src0 * dst0 + src1 * dst1 + src2 * dst2 + src3 * dst3;
  if (Math.abs(det) < Math_default.EPSILON21) {
    if (Matrix3_default.equalsEpsilon(
      Matrix4.getMatrix3(matrix, scratchInverseRotation),
      scratchMatrix3Zero,
      Math_default.EPSILON7
    ) && Cartesian4_default.equals(
      Matrix4.getRow(matrix, 3, scratchBottomRow),
      scratchExpectedBottomRow
    )) {
      result[0] = 0;
      result[1] = 0;
      result[2] = 0;
      result[3] = 0;
      result[4] = 0;
      result[5] = 0;
      result[6] = 0;
      result[7] = 0;
      result[8] = 0;
      result[9] = 0;
      result[10] = 0;
      result[11] = 0;
      result[12] = -matrix[12];
      result[13] = -matrix[13];
      result[14] = -matrix[14];
      result[15] = 1;
      return result;
    }
    throw new RuntimeError_default(
      "matrix is not invertible because its determinate is zero."
    );
  }
  det = 1 / det;
  result[0] = dst0 * det;
  result[1] = dst1 * det;
  result[2] = dst2 * det;
  result[3] = dst3 * det;
  result[4] = dst4 * det;
  result[5] = dst5 * det;
  result[6] = dst6 * det;
  result[7] = dst7 * det;
  result[8] = dst8 * det;
  result[9] = dst9 * det;
  result[10] = dst10 * det;
  result[11] = dst11 * det;
  result[12] = dst12 * det;
  result[13] = dst13 * det;
  result[14] = dst14 * det;
  result[15] = dst15 * det;
  return result;
};
Matrix4.inverseTransformation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const matrix0 = matrix[0];
  const matrix1 = matrix[1];
  const matrix2 = matrix[2];
  const matrix4 = matrix[4];
  const matrix5 = matrix[5];
  const matrix6 = matrix[6];
  const matrix8 = matrix[8];
  const matrix9 = matrix[9];
  const matrix10 = matrix[10];
  const vX = matrix[12];
  const vY = matrix[13];
  const vZ = matrix[14];
  const x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
  const y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
  const z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;
  result[0] = matrix0;
  result[1] = matrix4;
  result[2] = matrix8;
  result[3] = 0;
  result[4] = matrix1;
  result[5] = matrix5;
  result[6] = matrix9;
  result[7] = 0;
  result[8] = matrix2;
  result[9] = matrix6;
  result[10] = matrix10;
  result[11] = 0;
  result[12] = x;
  result[13] = y;
  result[14] = z;
  result[15] = 1;
  return result;
};
var scratchTransposeMatrix = new Matrix4();
Matrix4.inverseTranspose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  return Matrix4.inverse(
    Matrix4.transpose(matrix, scratchTransposeMatrix),
    result
  );
};
Matrix4.IDENTITY = Object.freeze(
  new Matrix4(
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  )
);
Matrix4.ZERO = Object.freeze(
  new Matrix4(
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  )
);
Matrix4.COLUMN0ROW0 = 0;
Matrix4.COLUMN0ROW1 = 1;
Matrix4.COLUMN0ROW2 = 2;
Matrix4.COLUMN0ROW3 = 3;
Matrix4.COLUMN1ROW0 = 4;
Matrix4.COLUMN1ROW1 = 5;
Matrix4.COLUMN1ROW2 = 6;
Matrix4.COLUMN1ROW3 = 7;
Matrix4.COLUMN2ROW0 = 8;
Matrix4.COLUMN2ROW1 = 9;
Matrix4.COLUMN2ROW2 = 10;
Matrix4.COLUMN2ROW3 = 11;
Matrix4.COLUMN3ROW0 = 12;
Matrix4.COLUMN3ROW1 = 13;
Matrix4.COLUMN3ROW2 = 14;
Matrix4.COLUMN3ROW3 = 15;
Object.defineProperties(Matrix4.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof Matrix4.prototype
   *
   * @type {number}
   */
  length: {
    get: function() {
      return Matrix4.packedLength;
    }
  }
});
Matrix4.prototype.clone = function(result) {
  return Matrix4.clone(this, result);
};
Matrix4.prototype.equals = function(right) {
  return Matrix4.equals(this, right);
};
Matrix4.equalsArray = function(matrix, array, offset) {
  return matrix[0] === array[offset] && matrix[1] === array[offset + 1] && matrix[2] === array[offset + 2] && matrix[3] === array[offset + 3] && matrix[4] === array[offset + 4] && matrix[5] === array[offset + 5] && matrix[6] === array[offset + 6] && matrix[7] === array[offset + 7] && matrix[8] === array[offset + 8] && matrix[9] === array[offset + 9] && matrix[10] === array[offset + 10] && matrix[11] === array[offset + 11] && matrix[12] === array[offset + 12] && matrix[13] === array[offset + 13] && matrix[14] === array[offset + 14] && matrix[15] === array[offset + 15];
};
Matrix4.prototype.equalsEpsilon = function(right, epsilon) {
  return Matrix4.equalsEpsilon(this, right, epsilon);
};
Matrix4.prototype.toString = function() {
  return `(${this[0]}, ${this[4]}, ${this[8]}, ${this[12]})
(${this[1]}, ${this[5]}, ${this[9]}, ${this[13]})
(${this[2]}, ${this[6]}, ${this[10]}, ${this[14]})
(${this[3]}, ${this[7]}, ${this[11]}, ${this[15]})`;
};
var Matrix4_default = Matrix4;

// packages/engine/Source/Core/Rectangle.js
function Rectangle(west, south, east, north) {
  this.west = defaultValue_default(west, 0);
  this.south = defaultValue_default(south, 0);
  this.east = defaultValue_default(east, 0);
  this.north = defaultValue_default(north, 0);
}
Object.defineProperties(Rectangle.prototype, {
  /**
   * Gets the width of the rectangle in radians.
   * @memberof Rectangle.prototype
   * @type {number}
   * @readonly
   */
  width: {
    get: function() {
      return Rectangle.computeWidth(this);
    }
  },
  /**
   * Gets the height of the rectangle in radians.
   * @memberof Rectangle.prototype
   * @type {number}
   * @readonly
   */
  height: {
    get: function() {
      return Rectangle.computeHeight(this);
    }
  }
});
Rectangle.packedLength = 4;
Rectangle.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.west;
  array[startingIndex++] = value.south;
  array[startingIndex++] = value.east;
  array[startingIndex] = value.north;
  return array;
};
Rectangle.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Rectangle();
  }
  result.west = array[startingIndex++];
  result.south = array[startingIndex++];
  result.east = array[startingIndex++];
  result.north = array[startingIndex];
  return result;
};
Rectangle.computeWidth = function(rectangle) {
  Check_default.typeOf.object("rectangle", rectangle);
  let east = rectangle.east;
  const west = rectangle.west;
  if (east < west) {
    east += Math_default.TWO_PI;
  }
  return east - west;
};
Rectangle.computeHeight = function(rectangle) {
  Check_default.typeOf.object("rectangle", rectangle);
  return rectangle.north - rectangle.south;
};
Rectangle.fromDegrees = function(west, south, east, north, result) {
  west = Math_default.toRadians(defaultValue_default(west, 0));
  south = Math_default.toRadians(defaultValue_default(south, 0));
  east = Math_default.toRadians(defaultValue_default(east, 0));
  north = Math_default.toRadians(defaultValue_default(north, 0));
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.fromRadians = function(west, south, east, north, result) {
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = defaultValue_default(west, 0);
  result.south = defaultValue_default(south, 0);
  result.east = defaultValue_default(east, 0);
  result.north = defaultValue_default(north, 0);
  return result;
};
Rectangle.fromCartographicArray = function(cartographics, result) {
  Check_default.defined("cartographics", cartographics);
  let west = Number.MAX_VALUE;
  let east = -Number.MAX_VALUE;
  let westOverIDL = Number.MAX_VALUE;
  let eastOverIDL = -Number.MAX_VALUE;
  let south = Number.MAX_VALUE;
  let north = -Number.MAX_VALUE;
  for (let i = 0, len = cartographics.length; i < len; i++) {
    const position = cartographics[i];
    west = Math.min(west, position.longitude);
    east = Math.max(east, position.longitude);
    south = Math.min(south, position.latitude);
    north = Math.max(north, position.latitude);
    const lonAdjusted = position.longitude >= 0 ? position.longitude : position.longitude + Math_default.TWO_PI;
    westOverIDL = Math.min(westOverIDL, lonAdjusted);
    eastOverIDL = Math.max(eastOverIDL, lonAdjusted);
  }
  if (east - west > eastOverIDL - westOverIDL) {
    west = westOverIDL;
    east = eastOverIDL;
    if (east > Math_default.PI) {
      east = east - Math_default.TWO_PI;
    }
    if (west > Math_default.PI) {
      west = west - Math_default.TWO_PI;
    }
  }
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.fromCartesianArray = function(cartesians, ellipsoid, result) {
  Check_default.defined("cartesians", cartesians);
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  let west = Number.MAX_VALUE;
  let east = -Number.MAX_VALUE;
  let westOverIDL = Number.MAX_VALUE;
  let eastOverIDL = -Number.MAX_VALUE;
  let south = Number.MAX_VALUE;
  let north = -Number.MAX_VALUE;
  for (let i = 0, len = cartesians.length; i < len; i++) {
    const position = ellipsoid.cartesianToCartographic(cartesians[i]);
    west = Math.min(west, position.longitude);
    east = Math.max(east, position.longitude);
    south = Math.min(south, position.latitude);
    north = Math.max(north, position.latitude);
    const lonAdjusted = position.longitude >= 0 ? position.longitude : position.longitude + Math_default.TWO_PI;
    westOverIDL = Math.min(westOverIDL, lonAdjusted);
    eastOverIDL = Math.max(eastOverIDL, lonAdjusted);
  }
  if (east - west > eastOverIDL - westOverIDL) {
    west = westOverIDL;
    east = eastOverIDL;
    if (east > Math_default.PI) {
      east = east - Math_default.TWO_PI;
    }
    if (west > Math_default.PI) {
      west = west - Math_default.TWO_PI;
    }
  }
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.clone = function(rectangle, result) {
  if (!defined_default(rectangle)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Rectangle(
      rectangle.west,
      rectangle.south,
      rectangle.east,
      rectangle.north
    );
  }
  result.west = rectangle.west;
  result.south = rectangle.south;
  result.east = rectangle.east;
  result.north = rectangle.north;
  return result;
};
Rectangle.equalsEpsilon = function(left, right, absoluteEpsilon) {
  absoluteEpsilon = defaultValue_default(absoluteEpsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left.west - right.west) <= absoluteEpsilon && Math.abs(left.south - right.south) <= absoluteEpsilon && Math.abs(left.east - right.east) <= absoluteEpsilon && Math.abs(left.north - right.north) <= absoluteEpsilon;
};
Rectangle.prototype.clone = function(result) {
  return Rectangle.clone(this, result);
};
Rectangle.prototype.equals = function(other) {
  return Rectangle.equals(this, other);
};
Rectangle.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.west === right.west && left.south === right.south && left.east === right.east && left.north === right.north;
};
Rectangle.prototype.equalsEpsilon = function(other, epsilon) {
  return Rectangle.equalsEpsilon(this, other, epsilon);
};
Rectangle.validate = function(rectangle) {
  Check_default.typeOf.object("rectangle", rectangle);
  const north = rectangle.north;
  Check_default.typeOf.number.greaterThanOrEquals(
    "north",
    north,
    -Math_default.PI_OVER_TWO
  );
  Check_default.typeOf.number.lessThanOrEquals("north", north, Math_default.PI_OVER_TWO);
  const south = rectangle.south;
  Check_default.typeOf.number.greaterThanOrEquals(
    "south",
    south,
    -Math_default.PI_OVER_TWO
  );
  Check_default.typeOf.number.lessThanOrEquals("south", south, Math_default.PI_OVER_TWO);
  const west = rectangle.west;
  Check_default.typeOf.number.greaterThanOrEquals("west", west, -Math.PI);
  Check_default.typeOf.number.lessThanOrEquals("west", west, Math.PI);
  const east = rectangle.east;
  Check_default.typeOf.number.greaterThanOrEquals("east", east, -Math.PI);
  Check_default.typeOf.number.lessThanOrEquals("east", east, Math.PI);
};
Rectangle.southwest = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  if (!defined_default(result)) {
    return new Cartographic_default(rectangle.west, rectangle.south);
  }
  result.longitude = rectangle.west;
  result.latitude = rectangle.south;
  result.height = 0;
  return result;
};
Rectangle.northwest = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  if (!defined_default(result)) {
    return new Cartographic_default(rectangle.west, rectangle.north);
  }
  result.longitude = rectangle.west;
  result.latitude = rectangle.north;
  result.height = 0;
  return result;
};
Rectangle.northeast = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  if (!defined_default(result)) {
    return new Cartographic_default(rectangle.east, rectangle.north);
  }
  result.longitude = rectangle.east;
  result.latitude = rectangle.north;
  result.height = 0;
  return result;
};
Rectangle.southeast = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  if (!defined_default(result)) {
    return new Cartographic_default(rectangle.east, rectangle.south);
  }
  result.longitude = rectangle.east;
  result.latitude = rectangle.south;
  result.height = 0;
  return result;
};
Rectangle.center = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  let east = rectangle.east;
  const west = rectangle.west;
  if (east < west) {
    east += Math_default.TWO_PI;
  }
  const longitude = Math_default.negativePiToPi((west + east) * 0.5);
  const latitude = (rectangle.south + rectangle.north) * 0.5;
  if (!defined_default(result)) {
    return new Cartographic_default(longitude, latitude);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = 0;
  return result;
};
Rectangle.intersection = function(rectangle, otherRectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("otherRectangle", otherRectangle);
  let rectangleEast = rectangle.east;
  let rectangleWest = rectangle.west;
  let otherRectangleEast = otherRectangle.east;
  let otherRectangleWest = otherRectangle.west;
  if (rectangleEast < rectangleWest && otherRectangleEast > 0) {
    rectangleEast += Math_default.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0) {
    otherRectangleEast += Math_default.TWO_PI;
  }
  if (rectangleEast < rectangleWest && otherRectangleWest < 0) {
    otherRectangleWest += Math_default.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0) {
    rectangleWest += Math_default.TWO_PI;
  }
  const west = Math_default.negativePiToPi(
    Math.max(rectangleWest, otherRectangleWest)
  );
  const east = Math_default.negativePiToPi(
    Math.min(rectangleEast, otherRectangleEast)
  );
  if ((rectangle.west < rectangle.east || otherRectangle.west < otherRectangle.east) && east <= west) {
    return void 0;
  }
  const south = Math.max(rectangle.south, otherRectangle.south);
  const north = Math.min(rectangle.north, otherRectangle.north);
  if (south >= north) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.simpleIntersection = function(rectangle, otherRectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("otherRectangle", otherRectangle);
  const west = Math.max(rectangle.west, otherRectangle.west);
  const south = Math.max(rectangle.south, otherRectangle.south);
  const east = Math.min(rectangle.east, otherRectangle.east);
  const north = Math.min(rectangle.north, otherRectangle.north);
  if (south >= north || west >= east) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.union = function(rectangle, otherRectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("otherRectangle", otherRectangle);
  if (!defined_default(result)) {
    result = new Rectangle();
  }
  let rectangleEast = rectangle.east;
  let rectangleWest = rectangle.west;
  let otherRectangleEast = otherRectangle.east;
  let otherRectangleWest = otherRectangle.west;
  if (rectangleEast < rectangleWest && otherRectangleEast > 0) {
    rectangleEast += Math_default.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0) {
    otherRectangleEast += Math_default.TWO_PI;
  }
  if (rectangleEast < rectangleWest && otherRectangleWest < 0) {
    otherRectangleWest += Math_default.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0) {
    rectangleWest += Math_default.TWO_PI;
  }
  const west = Math_default.negativePiToPi(
    Math.min(rectangleWest, otherRectangleWest)
  );
  const east = Math_default.negativePiToPi(
    Math.max(rectangleEast, otherRectangleEast)
  );
  result.west = west;
  result.south = Math.min(rectangle.south, otherRectangle.south);
  result.east = east;
  result.north = Math.max(rectangle.north, otherRectangle.north);
  return result;
};
Rectangle.expand = function(rectangle, cartographic, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("cartographic", cartographic);
  if (!defined_default(result)) {
    result = new Rectangle();
  }
  result.west = Math.min(rectangle.west, cartographic.longitude);
  result.south = Math.min(rectangle.south, cartographic.latitude);
  result.east = Math.max(rectangle.east, cartographic.longitude);
  result.north = Math.max(rectangle.north, cartographic.latitude);
  return result;
};
Rectangle.contains = function(rectangle, cartographic) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("cartographic", cartographic);
  let longitude = cartographic.longitude;
  const latitude = cartographic.latitude;
  const west = rectangle.west;
  let east = rectangle.east;
  if (east < west) {
    east += Math_default.TWO_PI;
    if (longitude < 0) {
      longitude += Math_default.TWO_PI;
    }
  }
  return (longitude > west || Math_default.equalsEpsilon(longitude, west, Math_default.EPSILON14)) && (longitude < east || Math_default.equalsEpsilon(longitude, east, Math_default.EPSILON14)) && latitude >= rectangle.south && latitude <= rectangle.north;
};
var subsampleLlaScratch = new Cartographic_default();
Rectangle.subsample = function(rectangle, ellipsoid, surfaceHeight, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  surfaceHeight = defaultValue_default(surfaceHeight, 0);
  if (!defined_default(result)) {
    result = [];
  }
  let length = 0;
  const north = rectangle.north;
  const south = rectangle.south;
  const east = rectangle.east;
  const west = rectangle.west;
  const lla = subsampleLlaScratch;
  lla.height = surfaceHeight;
  lla.longitude = west;
  lla.latitude = north;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;
  lla.longitude = east;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;
  lla.latitude = south;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;
  lla.longitude = west;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;
  if (north < 0) {
    lla.latitude = north;
  } else if (south > 0) {
    lla.latitude = south;
  } else {
    lla.latitude = 0;
  }
  for (let i = 1; i < 8; ++i) {
    lla.longitude = -Math.PI + i * Math_default.PI_OVER_TWO;
    if (Rectangle.contains(rectangle, lla)) {
      result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
      length++;
    }
  }
  if (lla.latitude === 0) {
    lla.longitude = west;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;
    lla.longitude = east;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;
  }
  result.length = length;
  return result;
};
Rectangle.subsection = function(rectangle, westLerp, southLerp, eastLerp, northLerp, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.number.greaterThanOrEquals("westLerp", westLerp, 0);
  Check_default.typeOf.number.lessThanOrEquals("westLerp", westLerp, 1);
  Check_default.typeOf.number.greaterThanOrEquals("southLerp", southLerp, 0);
  Check_default.typeOf.number.lessThanOrEquals("southLerp", southLerp, 1);
  Check_default.typeOf.number.greaterThanOrEquals("eastLerp", eastLerp, 0);
  Check_default.typeOf.number.lessThanOrEquals("eastLerp", eastLerp, 1);
  Check_default.typeOf.number.greaterThanOrEquals("northLerp", northLerp, 0);
  Check_default.typeOf.number.lessThanOrEquals("northLerp", northLerp, 1);
  Check_default.typeOf.number.lessThanOrEquals("westLerp", westLerp, eastLerp);
  Check_default.typeOf.number.lessThanOrEquals("southLerp", southLerp, northLerp);
  if (!defined_default(result)) {
    result = new Rectangle();
  }
  if (rectangle.west <= rectangle.east) {
    const width = rectangle.east - rectangle.west;
    result.west = rectangle.west + westLerp * width;
    result.east = rectangle.west + eastLerp * width;
  } else {
    const width = Math_default.TWO_PI + rectangle.east - rectangle.west;
    result.west = Math_default.negativePiToPi(rectangle.west + westLerp * width);
    result.east = Math_default.negativePiToPi(rectangle.west + eastLerp * width);
  }
  const height = rectangle.north - rectangle.south;
  result.south = rectangle.south + southLerp * height;
  result.north = rectangle.south + northLerp * height;
  if (westLerp === 1) {
    result.west = rectangle.east;
  }
  if (eastLerp === 1) {
    result.east = rectangle.east;
  }
  if (southLerp === 1) {
    result.south = rectangle.north;
  }
  if (northLerp === 1) {
    result.north = rectangle.north;
  }
  return result;
};
Rectangle.MAX_VALUE = Object.freeze(
  new Rectangle(
    -Math.PI,
    -Math_default.PI_OVER_TWO,
    Math.PI,
    Math_default.PI_OVER_TWO
  )
);
var Rectangle_default = Rectangle;

// packages/engine/Source/Core/Cartesian2.js
function Cartesian2(x, y) {
  this.x = defaultValue_default(x, 0);
  this.y = defaultValue_default(y, 0);
}
Cartesian2.fromElements = function(x, y, result) {
  if (!defined_default(result)) {
    return new Cartesian2(x, y);
  }
  result.x = x;
  result.y = y;
  return result;
};
Cartesian2.clone = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Cartesian2(cartesian.x, cartesian.y);
  }
  result.x = cartesian.x;
  result.y = cartesian.y;
  return result;
};
Cartesian2.fromCartesian3 = Cartesian2.clone;
Cartesian2.fromCartesian4 = Cartesian2.clone;
Cartesian2.packedLength = 2;
Cartesian2.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.x;
  array[startingIndex] = value.y;
  return array;
};
Cartesian2.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Cartesian2();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex];
  return result;
};
Cartesian2.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 2;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 2 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Cartesian2.pack(array[i], result, i * 2);
  }
  return result;
};
Cartesian2.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 2);
  if (array.length % 2 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 2.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 2);
  } else {
    result.length = length / 2;
  }
  for (let i = 0; i < length; i += 2) {
    const index = i / 2;
    result[index] = Cartesian2.unpack(array, i, result[index]);
  }
  return result;
};
Cartesian2.fromArray = Cartesian2.unpack;
Cartesian2.maximumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.max(cartesian.x, cartesian.y);
};
Cartesian2.minimumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.min(cartesian.x, cartesian.y);
};
Cartesian2.minimumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.min(first.x, second.x);
  result.y = Math.min(first.y, second.y);
  return result;
};
Cartesian2.maximumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.max(first.x, second.x);
  result.y = Math.max(first.y, second.y);
  return result;
};
Cartesian2.clamp = function(value, min, max, result) {
  Check_default.typeOf.object("value", value);
  Check_default.typeOf.object("min", min);
  Check_default.typeOf.object("max", max);
  Check_default.typeOf.object("result", result);
  const x = Math_default.clamp(value.x, min.x, max.x);
  const y = Math_default.clamp(value.y, min.y, max.y);
  result.x = x;
  result.y = y;
  return result;
};
Cartesian2.magnitudeSquared = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return cartesian.x * cartesian.x + cartesian.y * cartesian.y;
};
Cartesian2.magnitude = function(cartesian) {
  return Math.sqrt(Cartesian2.magnitudeSquared(cartesian));
};
var distanceScratch2 = new Cartesian2();
Cartesian2.distance = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian2.subtract(left, right, distanceScratch2);
  return Cartesian2.magnitude(distanceScratch2);
};
Cartesian2.distanceSquared = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian2.subtract(left, right, distanceScratch2);
  return Cartesian2.magnitudeSquared(distanceScratch2);
};
Cartesian2.normalize = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const magnitude = Cartesian2.magnitude(cartesian);
  result.x = cartesian.x / magnitude;
  result.y = cartesian.y / magnitude;
  if (isNaN(result.x) || isNaN(result.y)) {
    throw new DeveloperError_default("normalized result is not a number");
  }
  return result;
};
Cartesian2.dot = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.x + left.y * right.y;
};
Cartesian2.cross = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.y - left.y * right.x;
};
Cartesian2.multiplyComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x * right.x;
  result.y = left.y * right.y;
  return result;
};
Cartesian2.divideComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x / right.x;
  result.y = left.y / right.y;
  return result;
};
Cartesian2.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x + right.x;
  result.y = left.y + right.y;
  return result;
};
Cartesian2.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x - right.x;
  result.y = left.y - right.y;
  return result;
};
Cartesian2.multiplyByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x * scalar;
  result.y = cartesian.y * scalar;
  return result;
};
Cartesian2.divideByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x / scalar;
  result.y = cartesian.y / scalar;
  return result;
};
Cartesian2.negate = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = -cartesian.x;
  result.y = -cartesian.y;
  return result;
};
Cartesian2.abs = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = Math.abs(cartesian.x);
  result.y = Math.abs(cartesian.y);
  return result;
};
var lerpScratch2 = new Cartesian2();
Cartesian2.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  Cartesian2.multiplyByScalar(end, t, lerpScratch2);
  result = Cartesian2.multiplyByScalar(start, 1 - t, result);
  return Cartesian2.add(lerpScratch2, result, result);
};
var angleBetweenScratch = new Cartesian2();
var angleBetweenScratch2 = new Cartesian2();
Cartesian2.angleBetween = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian2.normalize(left, angleBetweenScratch);
  Cartesian2.normalize(right, angleBetweenScratch2);
  return Math_default.acosClamped(
    Cartesian2.dot(angleBetweenScratch, angleBetweenScratch2)
  );
};
var mostOrthogonalAxisScratch2 = new Cartesian2();
Cartesian2.mostOrthogonalAxis = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const f = Cartesian2.normalize(cartesian, mostOrthogonalAxisScratch2);
  Cartesian2.abs(f, f);
  if (f.x <= f.y) {
    result = Cartesian2.clone(Cartesian2.UNIT_X, result);
  } else {
    result = Cartesian2.clone(Cartesian2.UNIT_Y, result);
  }
  return result;
};
Cartesian2.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.x === right.x && left.y === right.y;
};
Cartesian2.equalsArray = function(cartesian, array, offset) {
  return cartesian.x === array[offset] && cartesian.y === array[offset + 1];
};
Cartesian2.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
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
  );
};
Cartesian2.ZERO = Object.freeze(new Cartesian2(0, 0));
Cartesian2.ONE = Object.freeze(new Cartesian2(1, 1));
Cartesian2.UNIT_X = Object.freeze(new Cartesian2(1, 0));
Cartesian2.UNIT_Y = Object.freeze(new Cartesian2(0, 1));
Cartesian2.prototype.clone = function(result) {
  return Cartesian2.clone(this, result);
};
Cartesian2.prototype.equals = function(right) {
  return Cartesian2.equals(this, right);
};
Cartesian2.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
  return Cartesian2.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian2.prototype.toString = function() {
  return `(${this.x}, ${this.y})`;
};
var Cartesian2_default = Cartesian2;

// packages/engine/Source/Core/Matrix2.js
function Matrix2(column0Row0, column1Row0, column0Row1, column1Row1) {
  this[0] = defaultValue_default(column0Row0, 0);
  this[1] = defaultValue_default(column0Row1, 0);
  this[2] = defaultValue_default(column1Row0, 0);
  this[3] = defaultValue_default(column1Row1, 0);
}
Matrix2.packedLength = 4;
Matrix2.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value[0];
  array[startingIndex++] = value[1];
  array[startingIndex++] = value[2];
  array[startingIndex++] = value[3];
  return array;
};
Matrix2.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Matrix2();
  }
  result[0] = array[startingIndex++];
  result[1] = array[startingIndex++];
  result[2] = array[startingIndex++];
  result[3] = array[startingIndex++];
  return result;
};
Matrix2.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 4;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 4 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Matrix2.pack(array[i], result, i * 4);
  }
  return result;
};
Matrix2.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
  if (array.length % 4 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 4.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 4);
  } else {
    result.length = length / 4;
  }
  for (let i = 0; i < length; i += 4) {
    const index = i / 4;
    result[index] = Matrix2.unpack(array, i, result[index]);
  }
  return result;
};
Matrix2.clone = function(matrix, result) {
  if (!defined_default(matrix)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Matrix2(matrix[0], matrix[2], matrix[1], matrix[3]);
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  return result;
};
Matrix2.fromArray = Matrix2.unpack;
Matrix2.fromColumnMajorArray = function(values, result) {
  Check_default.defined("values", values);
  return Matrix2.clone(values, result);
};
Matrix2.fromRowMajorArray = function(values, result) {
  Check_default.defined("values", values);
  if (!defined_default(result)) {
    return new Matrix2(values[0], values[1], values[2], values[3]);
  }
  result[0] = values[0];
  result[1] = values[2];
  result[2] = values[1];
  result[3] = values[3];
  return result;
};
Matrix2.fromScale = function(scale, result) {
  Check_default.typeOf.object("scale", scale);
  if (!defined_default(result)) {
    return new Matrix2(scale.x, 0, 0, scale.y);
  }
  result[0] = scale.x;
  result[1] = 0;
  result[2] = 0;
  result[3] = scale.y;
  return result;
};
Matrix2.fromUniformScale = function(scale, result) {
  Check_default.typeOf.number("scale", scale);
  if (!defined_default(result)) {
    return new Matrix2(scale, 0, 0, scale);
  }
  result[0] = scale;
  result[1] = 0;
  result[2] = 0;
  result[3] = scale;
  return result;
};
Matrix2.fromRotation = function(angle, result) {
  Check_default.typeOf.number("angle", angle);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  if (!defined_default(result)) {
    return new Matrix2(cosAngle, -sinAngle, sinAngle, cosAngle);
  }
  result[0] = cosAngle;
  result[1] = sinAngle;
  result[2] = -sinAngle;
  result[3] = cosAngle;
  return result;
};
Matrix2.toArray = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  if (!defined_default(result)) {
    return [matrix[0], matrix[1], matrix[2], matrix[3]];
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  return result;
};
Matrix2.getElementIndex = function(column, row) {
  Check_default.typeOf.number.greaterThanOrEquals("row", row, 0);
  Check_default.typeOf.number.lessThanOrEquals("row", row, 1);
  Check_default.typeOf.number.greaterThanOrEquals("column", column, 0);
  Check_default.typeOf.number.lessThanOrEquals("column", column, 1);
  return column * 2 + row;
};
Matrix2.getColumn = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 1);
  Check_default.typeOf.object("result", result);
  const startIndex = index * 2;
  const x = matrix[startIndex];
  const y = matrix[startIndex + 1];
  result.x = x;
  result.y = y;
  return result;
};
Matrix2.setColumn = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 1);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix2.clone(matrix, result);
  const startIndex = index * 2;
  result[startIndex] = cartesian.x;
  result[startIndex + 1] = cartesian.y;
  return result;
};
Matrix2.getRow = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 1);
  Check_default.typeOf.object("result", result);
  const x = matrix[index];
  const y = matrix[index + 2];
  result.x = x;
  result.y = y;
  return result;
};
Matrix2.setRow = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 1);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix2.clone(matrix, result);
  result[index] = cartesian.x;
  result[index + 2] = cartesian.y;
  return result;
};
var scaleScratch12 = new Cartesian2_default();
Matrix2.setScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix2.getScale(matrix, scaleScratch12);
  const scaleRatioX = scale.x / existingScale.x;
  const scaleRatioY = scale.y / existingScale.y;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioY;
  result[3] = matrix[3] * scaleRatioY;
  return result;
};
var scaleScratch22 = new Cartesian2_default();
Matrix2.setUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix2.getScale(matrix, scaleScratch22);
  const scaleRatioX = scale / existingScale.x;
  const scaleRatioY = scale / existingScale.y;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioY;
  result[3] = matrix[3] * scaleRatioY;
  return result;
};
var scratchColumn2 = new Cartesian2_default();
Matrix2.getScale = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result.x = Cartesian2_default.magnitude(
    Cartesian2_default.fromElements(matrix[0], matrix[1], scratchColumn2)
  );
  result.y = Cartesian2_default.magnitude(
    Cartesian2_default.fromElements(matrix[2], matrix[3], scratchColumn2)
  );
  return result;
};
var scaleScratch32 = new Cartesian2_default();
Matrix2.getMaximumScale = function(matrix) {
  Matrix2.getScale(matrix, scaleScratch32);
  return Cartesian2_default.maximumComponent(scaleScratch32);
};
var scaleScratch42 = new Cartesian2_default();
Matrix2.setRotation = function(matrix, rotation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix2.getScale(matrix, scaleScratch42);
  result[0] = rotation[0] * scale.x;
  result[1] = rotation[1] * scale.x;
  result[2] = rotation[2] * scale.y;
  result[3] = rotation[3] * scale.y;
  return result;
};
var scaleScratch52 = new Cartesian2_default();
Matrix2.getRotation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix2.getScale(matrix, scaleScratch52);
  result[0] = matrix[0] / scale.x;
  result[1] = matrix[1] / scale.x;
  result[2] = matrix[2] / scale.y;
  result[3] = matrix[3] / scale.y;
  return result;
};
Matrix2.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const column0Row0 = left[0] * right[0] + left[2] * right[1];
  const column1Row0 = left[0] * right[2] + left[2] * right[3];
  const column0Row1 = left[1] * right[0] + left[3] * right[1];
  const column1Row1 = left[1] * right[2] + left[3] * right[3];
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column1Row0;
  result[3] = column1Row1;
  return result;
};
Matrix2.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] + right[0];
  result[1] = left[1] + right[1];
  result[2] = left[2] + right[2];
  result[3] = left[3] + right[3];
  return result;
};
Matrix2.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] - right[0];
  result[1] = left[1] - right[1];
  result[2] = left[2] - right[2];
  result[3] = left[3] - right[3];
  return result;
};
Matrix2.multiplyByVector = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const x = matrix[0] * cartesian.x + matrix[2] * cartesian.y;
  const y = matrix[1] * cartesian.x + matrix[3] * cartesian.y;
  result.x = x;
  result.y = y;
  return result;
};
Matrix2.multiplyByScalar = function(matrix, scalar, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scalar;
  result[1] = matrix[1] * scalar;
  result[2] = matrix[2] * scalar;
  result[3] = matrix[3] * scalar;
  return result;
};
Matrix2.multiplyByScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale.x;
  result[1] = matrix[1] * scale.x;
  result[2] = matrix[2] * scale.y;
  result[3] = matrix[3] * scale.y;
  return result;
};
Matrix2.multiplyByUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale;
  result[1] = matrix[1] * scale;
  result[2] = matrix[2] * scale;
  result[3] = matrix[3] * scale;
  return result;
};
Matrix2.negate = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = -matrix[0];
  result[1] = -matrix[1];
  result[2] = -matrix[2];
  result[3] = -matrix[3];
  return result;
};
Matrix2.transpose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const column0Row0 = matrix[0];
  const column0Row1 = matrix[2];
  const column1Row0 = matrix[1];
  const column1Row1 = matrix[3];
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column1Row0;
  result[3] = column1Row1;
  return result;
};
Matrix2.abs = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = Math.abs(matrix[0]);
  result[1] = Math.abs(matrix[1]);
  result[2] = Math.abs(matrix[2]);
  result[3] = Math.abs(matrix[3]);
  return result;
};
Matrix2.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left[0] === right[0] && left[1] === right[1] && left[2] === right[2] && left[3] === right[3];
};
Matrix2.equalsArray = function(matrix, array, offset) {
  return matrix[0] === array[offset] && matrix[1] === array[offset + 1] && matrix[2] === array[offset + 2] && matrix[3] === array[offset + 3];
};
Matrix2.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon && Math.abs(left[2] - right[2]) <= epsilon && Math.abs(left[3] - right[3]) <= epsilon;
};
Matrix2.IDENTITY = Object.freeze(new Matrix2(1, 0, 0, 1));
Matrix2.ZERO = Object.freeze(new Matrix2(0, 0, 0, 0));
Matrix2.COLUMN0ROW0 = 0;
Matrix2.COLUMN0ROW1 = 1;
Matrix2.COLUMN1ROW0 = 2;
Matrix2.COLUMN1ROW1 = 3;
Object.defineProperties(Matrix2.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof Matrix2.prototype
   *
   * @type {number}
   */
  length: {
    get: function() {
      return Matrix2.packedLength;
    }
  }
});
Matrix2.prototype.clone = function(result) {
  return Matrix2.clone(this, result);
};
Matrix2.prototype.equals = function(right) {
  return Matrix2.equals(this, right);
};
Matrix2.prototype.equalsEpsilon = function(right, epsilon) {
  return Matrix2.equalsEpsilon(this, right, epsilon);
};
Matrix2.prototype.toString = function() {
  return `(${this[0]}, ${this[2]})
(${this[1]}, ${this[3]})`;
};
var Matrix2_default = Matrix2;

export {
  Cartesian4_default,
  Matrix4_default,
  Rectangle_default,
  Cartesian2_default,
  Matrix2_default
};
