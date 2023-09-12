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
  WebGLConstants_default
} from "./chunk-LSF6MAVT.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/IndexDatatype.js
var IndexDatatype = {
  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_BYTE: WebGLConstants_default.UNSIGNED_BYTE,
  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_SHORT: WebGLConstants_default.UNSIGNED_SHORT,
  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_INT: WebGLConstants_default.UNSIGNED_INT
};
IndexDatatype.getSizeInBytes = function(indexDatatype) {
  switch (indexDatatype) {
    case IndexDatatype.UNSIGNED_BYTE:
      return Uint8Array.BYTES_PER_ELEMENT;
    case IndexDatatype.UNSIGNED_SHORT:
      return Uint16Array.BYTES_PER_ELEMENT;
    case IndexDatatype.UNSIGNED_INT:
      return Uint32Array.BYTES_PER_ELEMENT;
  }
  throw new DeveloperError_default(
    "indexDatatype is required and must be a valid IndexDatatype constant."
  );
};
IndexDatatype.fromSizeInBytes = function(sizeInBytes) {
  switch (sizeInBytes) {
    case 2:
      return IndexDatatype.UNSIGNED_SHORT;
    case 4:
      return IndexDatatype.UNSIGNED_INT;
    case 1:
      return IndexDatatype.UNSIGNED_BYTE;
    default:
      throw new DeveloperError_default(
        "Size in bytes cannot be mapped to an IndexDatatype"
      );
  }
};
IndexDatatype.validate = function(indexDatatype) {
  return defined_default(indexDatatype) && (indexDatatype === IndexDatatype.UNSIGNED_BYTE || indexDatatype === IndexDatatype.UNSIGNED_SHORT || indexDatatype === IndexDatatype.UNSIGNED_INT);
};
IndexDatatype.createTypedArray = function(numberOfVertices, indicesLengthOrArray) {
  if (!defined_default(numberOfVertices)) {
    throw new DeveloperError_default("numberOfVertices is required.");
  }
  if (numberOfVertices >= Math_default.SIXTY_FOUR_KILOBYTES) {
    return new Uint32Array(indicesLengthOrArray);
  }
  return new Uint16Array(indicesLengthOrArray);
};
IndexDatatype.createTypedArrayFromArrayBuffer = function(numberOfVertices, sourceArray, byteOffset, length) {
  if (!defined_default(numberOfVertices)) {
    throw new DeveloperError_default("numberOfVertices is required.");
  }
  if (!defined_default(sourceArray)) {
    throw new DeveloperError_default("sourceArray is required.");
  }
  if (!defined_default(byteOffset)) {
    throw new DeveloperError_default("byteOffset is required.");
  }
  if (numberOfVertices >= Math_default.SIXTY_FOUR_KILOBYTES) {
    return new Uint32Array(sourceArray, byteOffset, length);
  }
  return new Uint16Array(sourceArray, byteOffset, length);
};
IndexDatatype.fromTypedArray = function(array) {
  if (array instanceof Uint8Array) {
    return IndexDatatype.UNSIGNED_BYTE;
  }
  if (array instanceof Uint16Array) {
    return IndexDatatype.UNSIGNED_SHORT;
  }
  if (array instanceof Uint32Array) {
    return IndexDatatype.UNSIGNED_INT;
  }
  throw new DeveloperError_default(
    "array must be a Uint8Array, Uint16Array, or Uint32Array."
  );
};
var IndexDatatype_default = Object.freeze(IndexDatatype);

export {
  IndexDatatype_default
};
