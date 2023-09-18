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
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/VertexFormat.js
function VertexFormat(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this.position = defaultValue_default(options.position, false);
  this.normal = defaultValue_default(options.normal, false);
  this.st = defaultValue_default(options.st, false);
  this.bitangent = defaultValue_default(options.bitangent, false);
  this.tangent = defaultValue_default(options.tangent, false);
  this.color = defaultValue_default(options.color, false);
}
VertexFormat.POSITION_ONLY = Object.freeze(
  new VertexFormat({
    position: true
  })
);
VertexFormat.POSITION_AND_NORMAL = Object.freeze(
  new VertexFormat({
    position: true,
    normal: true
  })
);
VertexFormat.POSITION_NORMAL_AND_ST = Object.freeze(
  new VertexFormat({
    position: true,
    normal: true,
    st: true
  })
);
VertexFormat.POSITION_AND_ST = Object.freeze(
  new VertexFormat({
    position: true,
    st: true
  })
);
VertexFormat.POSITION_AND_COLOR = Object.freeze(
  new VertexFormat({
    position: true,
    color: true
  })
);
VertexFormat.ALL = Object.freeze(
  new VertexFormat({
    position: true,
    normal: true,
    st: true,
    tangent: true,
    bitangent: true
  })
);
VertexFormat.DEFAULT = VertexFormat.POSITION_NORMAL_AND_ST;
VertexFormat.packedLength = 6;
VertexFormat.pack = function(value, array, startingIndex) {
  if (!defined_default(value)) {
    throw new DeveloperError_default("value is required");
  }
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.position ? 1 : 0;
  array[startingIndex++] = value.normal ? 1 : 0;
  array[startingIndex++] = value.st ? 1 : 0;
  array[startingIndex++] = value.tangent ? 1 : 0;
  array[startingIndex++] = value.bitangent ? 1 : 0;
  array[startingIndex] = value.color ? 1 : 0;
  return array;
};
VertexFormat.unpack = function(array, startingIndex, result) {
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new VertexFormat();
  }
  result.position = array[startingIndex++] === 1;
  result.normal = array[startingIndex++] === 1;
  result.st = array[startingIndex++] === 1;
  result.tangent = array[startingIndex++] === 1;
  result.bitangent = array[startingIndex++] === 1;
  result.color = array[startingIndex] === 1;
  return result;
};
VertexFormat.clone = function(vertexFormat, result) {
  if (!defined_default(vertexFormat)) {
    return void 0;
  }
  if (!defined_default(result)) {
    result = new VertexFormat();
  }
  result.position = vertexFormat.position;
  result.normal = vertexFormat.normal;
  result.st = vertexFormat.st;
  result.tangent = vertexFormat.tangent;
  result.bitangent = vertexFormat.bitangent;
  result.color = vertexFormat.color;
  return result;
};
var VertexFormat_default = VertexFormat;

export {
  VertexFormat_default
};
