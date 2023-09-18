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
  Cartesian2_default,
  Cartesian4_default,
  Matrix2_default,
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Matrix3_default
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

// packages/engine/Source/Scene/AttributeType.js
var AttributeType = {
  /**
   * The attribute is a single component.
   *
   * @type {string}
   * @constant
   */
  SCALAR: "SCALAR",
  /**
   * The attribute is a two-component vector.
   *
   * @type {string}
   * @constant
   */
  VEC2: "VEC2",
  /**
   * The attribute is a three-component vector.
   *
   * @type {string}
   * @constant
   */
  VEC3: "VEC3",
  /**
   * The attribute is a four-component vector.
   *
   * @type {string}
   * @constant
   */
  VEC4: "VEC4",
  /**
   * The attribute is a 2x2 matrix.
   *
   * @type {string}
   * @constant
   */
  MAT2: "MAT2",
  /**
   * The attribute is a 3x3 matrix.
   *
   * @type {string}
   * @constant
   */
  MAT3: "MAT3",
  /**
   * The attribute is a 4x4 matrix.
   *
   * @type {string}
   * @constant
   */
  MAT4: "MAT4"
};
AttributeType.getMathType = function(attributeType) {
  switch (attributeType) {
    case AttributeType.SCALAR:
      return Number;
    case AttributeType.VEC2:
      return Cartesian2_default;
    case AttributeType.VEC3:
      return Cartesian3_default;
    case AttributeType.VEC4:
      return Cartesian4_default;
    case AttributeType.MAT2:
      return Matrix2_default;
    case AttributeType.MAT3:
      return Matrix3_default;
    case AttributeType.MAT4:
      return Matrix4_default;
    default:
      throw new DeveloperError_default("attributeType is not a valid value.");
  }
};
AttributeType.getNumberOfComponents = function(attributeType) {
  switch (attributeType) {
    case AttributeType.SCALAR:
      return 1;
    case AttributeType.VEC2:
      return 2;
    case AttributeType.VEC3:
      return 3;
    case AttributeType.VEC4:
    case AttributeType.MAT2:
      return 4;
    case AttributeType.MAT3:
      return 9;
    case AttributeType.MAT4:
      return 16;
    default:
      throw new DeveloperError_default("attributeType is not a valid value.");
  }
};
AttributeType.getAttributeLocationCount = function(attributeType) {
  switch (attributeType) {
    case AttributeType.SCALAR:
    case AttributeType.VEC2:
    case AttributeType.VEC3:
    case AttributeType.VEC4:
      return 1;
    case AttributeType.MAT2:
      return 2;
    case AttributeType.MAT3:
      return 3;
    case AttributeType.MAT4:
      return 4;
    default:
      throw new DeveloperError_default("attributeType is not a valid value.");
  }
};
AttributeType.getGlslType = function(attributeType) {
  Check_default.typeOf.string("attributeType", attributeType);
  switch (attributeType) {
    case AttributeType.SCALAR:
      return "float";
    case AttributeType.VEC2:
      return "vec2";
    case AttributeType.VEC3:
      return "vec3";
    case AttributeType.VEC4:
      return "vec4";
    case AttributeType.MAT2:
      return "mat2";
    case AttributeType.MAT3:
      return "mat3";
    case AttributeType.MAT4:
      return "mat4";
    default:
      throw new DeveloperError_default("attributeType is not a valid value.");
  }
};
var AttributeType_default = Object.freeze(AttributeType);

// packages/engine/Source/Core/AttributeCompression.js
var RIGHT_SHIFT = 1 / 256;
var LEFT_SHIFT = 256;
var AttributeCompression = {};
AttributeCompression.octEncodeInRange = function(vector, rangeMax, result) {
  Check_default.defined("vector", vector);
  Check_default.defined("result", result);
  const magSquared = Cartesian3_default.magnitudeSquared(vector);
  if (Math.abs(magSquared - 1) > Math_default.EPSILON6) {
    throw new DeveloperError_default("vector must be normalized.");
  }
  result.x = vector.x / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
  result.y = vector.y / (Math.abs(vector.x) + Math.abs(vector.y) + Math.abs(vector.z));
  if (vector.z < 0) {
    const x = result.x;
    const y = result.y;
    result.x = (1 - Math.abs(y)) * Math_default.signNotZero(x);
    result.y = (1 - Math.abs(x)) * Math_default.signNotZero(y);
  }
  result.x = Math_default.toSNorm(result.x, rangeMax);
  result.y = Math_default.toSNorm(result.y, rangeMax);
  return result;
};
AttributeCompression.octEncode = function(vector, result) {
  return AttributeCompression.octEncodeInRange(vector, 255, result);
};
var octEncodeScratch = new Cartesian2_default();
var uint8ForceArray = new Uint8Array(1);
function forceUint8(value) {
  uint8ForceArray[0] = value;
  return uint8ForceArray[0];
}
AttributeCompression.octEncodeToCartesian4 = function(vector, result) {
  AttributeCompression.octEncodeInRange(vector, 65535, octEncodeScratch);
  result.x = forceUint8(octEncodeScratch.x * RIGHT_SHIFT);
  result.y = forceUint8(octEncodeScratch.x);
  result.z = forceUint8(octEncodeScratch.y * RIGHT_SHIFT);
  result.w = forceUint8(octEncodeScratch.y);
  return result;
};
AttributeCompression.octDecodeInRange = function(x, y, rangeMax, result) {
  Check_default.defined("result", result);
  if (x < 0 || x > rangeMax || y < 0 || y > rangeMax) {
    throw new DeveloperError_default(
      `x and y must be unsigned normalized integers between 0 and ${rangeMax}`
    );
  }
  result.x = Math_default.fromSNorm(x, rangeMax);
  result.y = Math_default.fromSNorm(y, rangeMax);
  result.z = 1 - (Math.abs(result.x) + Math.abs(result.y));
  if (result.z < 0) {
    const oldVX = result.x;
    result.x = (1 - Math.abs(result.y)) * Math_default.signNotZero(oldVX);
    result.y = (1 - Math.abs(oldVX)) * Math_default.signNotZero(result.y);
  }
  return Cartesian3_default.normalize(result, result);
};
AttributeCompression.octDecode = function(x, y, result) {
  return AttributeCompression.octDecodeInRange(x, y, 255, result);
};
AttributeCompression.octDecodeFromCartesian4 = function(encoded, result) {
  Check_default.typeOf.object("encoded", encoded);
  Check_default.typeOf.object("result", result);
  const x = encoded.x;
  const y = encoded.y;
  const z = encoded.z;
  const w = encoded.w;
  if (x < 0 || x > 255 || y < 0 || y > 255 || z < 0 || z > 255 || w < 0 || w > 255) {
    throw new DeveloperError_default(
      "x, y, z, and w must be unsigned normalized integers between 0 and 255"
    );
  }
  const xOct16 = x * LEFT_SHIFT + y;
  const yOct16 = z * LEFT_SHIFT + w;
  return AttributeCompression.octDecodeInRange(xOct16, yOct16, 65535, result);
};
AttributeCompression.octPackFloat = function(encoded) {
  Check_default.defined("encoded", encoded);
  return 256 * encoded.x + encoded.y;
};
var scratchEncodeCart2 = new Cartesian2_default();
AttributeCompression.octEncodeFloat = function(vector) {
  AttributeCompression.octEncode(vector, scratchEncodeCart2);
  return AttributeCompression.octPackFloat(scratchEncodeCart2);
};
AttributeCompression.octDecodeFloat = function(value, result) {
  Check_default.defined("value", value);
  const temp = value / 256;
  const x = Math.floor(temp);
  const y = (temp - x) * 256;
  return AttributeCompression.octDecode(x, y, result);
};
AttributeCompression.octPack = function(v1, v2, v3, result) {
  Check_default.defined("v1", v1);
  Check_default.defined("v2", v2);
  Check_default.defined("v3", v3);
  Check_default.defined("result", result);
  const encoded1 = AttributeCompression.octEncodeFloat(v1);
  const encoded2 = AttributeCompression.octEncodeFloat(v2);
  const encoded3 = AttributeCompression.octEncode(v3, scratchEncodeCart2);
  result.x = 65536 * encoded3.x + encoded1;
  result.y = 65536 * encoded3.y + encoded2;
  return result;
};
AttributeCompression.octUnpack = function(packed, v1, v2, v3) {
  Check_default.defined("packed", packed);
  Check_default.defined("v1", v1);
  Check_default.defined("v2", v2);
  Check_default.defined("v3", v3);
  let temp = packed.x / 65536;
  const x = Math.floor(temp);
  const encodedFloat1 = (temp - x) * 65536;
  temp = packed.y / 65536;
  const y = Math.floor(temp);
  const encodedFloat2 = (temp - y) * 65536;
  AttributeCompression.octDecodeFloat(encodedFloat1, v1);
  AttributeCompression.octDecodeFloat(encodedFloat2, v2);
  AttributeCompression.octDecode(x, y, v3);
};
AttributeCompression.compressTextureCoordinates = function(textureCoordinates) {
  Check_default.defined("textureCoordinates", textureCoordinates);
  const x = textureCoordinates.x * 4095 | 0;
  const y = textureCoordinates.y * 4095 | 0;
  return 4096 * x + y;
};
AttributeCompression.decompressTextureCoordinates = function(compressed, result) {
  Check_default.defined("compressed", compressed);
  Check_default.defined("result", result);
  const temp = compressed / 4096;
  const xZeroTo4095 = Math.floor(temp);
  result.x = xZeroTo4095 / 4095;
  result.y = (compressed - xZeroTo4095 * 4096) / 4095;
  return result;
};
function zigZagDecode(value) {
  return value >> 1 ^ -(value & 1);
}
AttributeCompression.zigZagDeltaDecode = function(uBuffer, vBuffer, heightBuffer) {
  Check_default.defined("uBuffer", uBuffer);
  Check_default.defined("vBuffer", vBuffer);
  Check_default.typeOf.number.equals(
    "uBuffer.length",
    "vBuffer.length",
    uBuffer.length,
    vBuffer.length
  );
  if (defined_default(heightBuffer)) {
    Check_default.typeOf.number.equals(
      "uBuffer.length",
      "heightBuffer.length",
      uBuffer.length,
      heightBuffer.length
    );
  }
  const count = uBuffer.length;
  let u = 0;
  let v = 0;
  let height = 0;
  for (let i = 0; i < count; ++i) {
    u += zigZagDecode(uBuffer[i]);
    v += zigZagDecode(vBuffer[i]);
    uBuffer[i] = u;
    vBuffer[i] = v;
    if (defined_default(heightBuffer)) {
      height += zigZagDecode(heightBuffer[i]);
      heightBuffer[i] = height;
    }
  }
};
AttributeCompression.dequantize = function(typedArray, componentDatatype, type, count) {
  Check_default.defined("typedArray", typedArray);
  Check_default.defined("componentDatatype", componentDatatype);
  Check_default.defined("type", type);
  Check_default.defined("count", count);
  const componentsPerAttribute = AttributeType_default.getNumberOfComponents(type);
  let divisor;
  switch (componentDatatype) {
    case ComponentDatatype_default.BYTE:
      divisor = 127;
      break;
    case ComponentDatatype_default.UNSIGNED_BYTE:
      divisor = 255;
      break;
    case ComponentDatatype_default.SHORT:
      divisor = 32767;
      break;
    case ComponentDatatype_default.UNSIGNED_SHORT:
      divisor = 65535;
      break;
    case ComponentDatatype_default.INT:
      divisor = 2147483647;
      break;
    case ComponentDatatype_default.UNSIGNED_INT:
      divisor = 4294967295;
      break;
    default:
      throw new DeveloperError_default(
        `Cannot dequantize component datatype: ${componentDatatype}`
      );
  }
  const dequantizedTypedArray = new Float32Array(
    count * componentsPerAttribute
  );
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < componentsPerAttribute; j++) {
      const index = i * componentsPerAttribute + j;
      dequantizedTypedArray[index] = Math.max(
        typedArray[index] / divisor,
        -1
      );
    }
  }
  return dequantizedTypedArray;
};
AttributeCompression.decodeRGB565 = function(typedArray, result) {
  Check_default.defined("typedArray", typedArray);
  const expectedLength = typedArray.length * 3;
  if (defined_default(result)) {
    Check_default.typeOf.number.equals(
      "result.length",
      "typedArray.length * 3",
      result.length,
      expectedLength
    );
  }
  const count = typedArray.length;
  if (!defined_default(result)) {
    result = new Float32Array(count * 3);
  }
  const mask5 = (1 << 5) - 1;
  const mask6 = (1 << 6) - 1;
  const normalize5 = 1 / 31;
  const normalize6 = 1 / 63;
  for (let i = 0; i < count; i++) {
    const value = typedArray[i];
    const red = value >> 11;
    const green = value >> 5 & mask6;
    const blue = value & mask5;
    const offset = 3 * i;
    result[offset] = red * normalize5;
    result[offset + 1] = green * normalize6;
    result[offset + 2] = blue * normalize5;
  }
  return result;
};
var AttributeCompression_default = AttributeCompression;

export {
  AttributeCompression_default
};
