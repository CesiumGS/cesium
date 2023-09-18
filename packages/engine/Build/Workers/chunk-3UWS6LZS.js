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
  WebGLConstants_default
} from "./chunk-LSF6MAVT.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/ComponentDatatype.js
var ComponentDatatype = {
  /**
   * 8-bit signed byte corresponding to <code>gl.BYTE</code> and the type
   * of an element in <code>Int8Array</code>.
   *
   * @type {number}
   * @constant
   */
  BYTE: WebGLConstants_default.BYTE,
  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_BYTE: WebGLConstants_default.UNSIGNED_BYTE,
  /**
   * 16-bit signed short corresponding to <code>SHORT</code> and the type
   * of an element in <code>Int16Array</code>.
   *
   * @type {number}
   * @constant
   */
  SHORT: WebGLConstants_default.SHORT,
  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_SHORT: WebGLConstants_default.UNSIGNED_SHORT,
  /**
   * 32-bit signed int corresponding to <code>INT</code> and the type
   * of an element in <code>Int32Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {number}
   * @constant
   */
  INT: WebGLConstants_default.INT,
  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_INT: WebGLConstants_default.UNSIGNED_INT,
  /**
   * 32-bit floating-point corresponding to <code>FLOAT</code> and the type
   * of an element in <code>Float32Array</code>.
   *
   * @type {number}
   * @constant
   */
  FLOAT: WebGLConstants_default.FLOAT,
  /**
   * 64-bit floating-point corresponding to <code>gl.DOUBLE</code> (in Desktop OpenGL;
   * this is not supported in WebGL, and is emulated in Cesium via {@link GeometryPipeline.encodeAttribute})
   * and the type of an element in <code>Float64Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {number}
   * @constant
   * @default 0x140A
   */
  DOUBLE: WebGLConstants_default.DOUBLE
};
ComponentDatatype.getSizeInBytes = function(componentDatatype) {
  if (!defined_default(componentDatatype)) {
    throw new DeveloperError_default("value is required.");
  }
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return Int8Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.UNSIGNED_BYTE:
      return Uint8Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.SHORT:
      return Int16Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.UNSIGNED_SHORT:
      return Uint16Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.INT:
      return Int32Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.UNSIGNED_INT:
      return Uint32Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.FLOAT:
      return Float32Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.DOUBLE:
      return Float64Array.BYTES_PER_ELEMENT;
    default:
      throw new DeveloperError_default("componentDatatype is not a valid value.");
  }
};
ComponentDatatype.fromTypedArray = function(array) {
  if (array instanceof Int8Array) {
    return ComponentDatatype.BYTE;
  }
  if (array instanceof Uint8Array) {
    return ComponentDatatype.UNSIGNED_BYTE;
  }
  if (array instanceof Int16Array) {
    return ComponentDatatype.SHORT;
  }
  if (array instanceof Uint16Array) {
    return ComponentDatatype.UNSIGNED_SHORT;
  }
  if (array instanceof Int32Array) {
    return ComponentDatatype.INT;
  }
  if (array instanceof Uint32Array) {
    return ComponentDatatype.UNSIGNED_INT;
  }
  if (array instanceof Float32Array) {
    return ComponentDatatype.FLOAT;
  }
  if (array instanceof Float64Array) {
    return ComponentDatatype.DOUBLE;
  }
  throw new DeveloperError_default(
    "array must be an Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, or Float64Array."
  );
};
ComponentDatatype.validate = function(componentDatatype) {
  return defined_default(componentDatatype) && (componentDatatype === ComponentDatatype.BYTE || componentDatatype === ComponentDatatype.UNSIGNED_BYTE || componentDatatype === ComponentDatatype.SHORT || componentDatatype === ComponentDatatype.UNSIGNED_SHORT || componentDatatype === ComponentDatatype.INT || componentDatatype === ComponentDatatype.UNSIGNED_INT || componentDatatype === ComponentDatatype.FLOAT || componentDatatype === ComponentDatatype.DOUBLE);
};
ComponentDatatype.createTypedArray = function(componentDatatype, valuesOrLength) {
  if (!defined_default(componentDatatype)) {
    throw new DeveloperError_default("componentDatatype is required.");
  }
  if (!defined_default(valuesOrLength)) {
    throw new DeveloperError_default("valuesOrLength is required.");
  }
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return new Int8Array(valuesOrLength);
    case ComponentDatatype.UNSIGNED_BYTE:
      return new Uint8Array(valuesOrLength);
    case ComponentDatatype.SHORT:
      return new Int16Array(valuesOrLength);
    case ComponentDatatype.UNSIGNED_SHORT:
      return new Uint16Array(valuesOrLength);
    case ComponentDatatype.INT:
      return new Int32Array(valuesOrLength);
    case ComponentDatatype.UNSIGNED_INT:
      return new Uint32Array(valuesOrLength);
    case ComponentDatatype.FLOAT:
      return new Float32Array(valuesOrLength);
    case ComponentDatatype.DOUBLE:
      return new Float64Array(valuesOrLength);
    default:
      throw new DeveloperError_default("componentDatatype is not a valid value.");
  }
};
ComponentDatatype.createArrayBufferView = function(componentDatatype, buffer, byteOffset, length) {
  if (!defined_default(componentDatatype)) {
    throw new DeveloperError_default("componentDatatype is required.");
  }
  if (!defined_default(buffer)) {
    throw new DeveloperError_default("buffer is required.");
  }
  byteOffset = defaultValue_default(byteOffset, 0);
  length = defaultValue_default(
    length,
    (buffer.byteLength - byteOffset) / ComponentDatatype.getSizeInBytes(componentDatatype)
  );
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return new Int8Array(buffer, byteOffset, length);
    case ComponentDatatype.UNSIGNED_BYTE:
      return new Uint8Array(buffer, byteOffset, length);
    case ComponentDatatype.SHORT:
      return new Int16Array(buffer, byteOffset, length);
    case ComponentDatatype.UNSIGNED_SHORT:
      return new Uint16Array(buffer, byteOffset, length);
    case ComponentDatatype.INT:
      return new Int32Array(buffer, byteOffset, length);
    case ComponentDatatype.UNSIGNED_INT:
      return new Uint32Array(buffer, byteOffset, length);
    case ComponentDatatype.FLOAT:
      return new Float32Array(buffer, byteOffset, length);
    case ComponentDatatype.DOUBLE:
      return new Float64Array(buffer, byteOffset, length);
    default:
      throw new DeveloperError_default("componentDatatype is not a valid value.");
  }
};
ComponentDatatype.fromName = function(name) {
  switch (name) {
    case "BYTE":
      return ComponentDatatype.BYTE;
    case "UNSIGNED_BYTE":
      return ComponentDatatype.UNSIGNED_BYTE;
    case "SHORT":
      return ComponentDatatype.SHORT;
    case "UNSIGNED_SHORT":
      return ComponentDatatype.UNSIGNED_SHORT;
    case "INT":
      return ComponentDatatype.INT;
    case "UNSIGNED_INT":
      return ComponentDatatype.UNSIGNED_INT;
    case "FLOAT":
      return ComponentDatatype.FLOAT;
    case "DOUBLE":
      return ComponentDatatype.DOUBLE;
    default:
      throw new DeveloperError_default("name is not a valid value.");
  }
};
var ComponentDatatype_default = Object.freeze(ComponentDatatype);

export {
  ComponentDatatype_default
};
