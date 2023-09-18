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
  GeometryOffsetAttribute_default
} from "./chunk-DXQTOATV.js";
import {
  GeometryAttributes_default
} from "./chunk-CHKMKWJP.js";
import {
  GeometryAttribute_default,
  Geometry_default,
  PrimitiveType_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default
} from "./chunk-A7FTZEKI.js";
import "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
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

// packages/engine/Source/Core/BoxOutlineGeometry.js
var diffScratch = new Cartesian3_default();
function BoxOutlineGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const min = options.minimum;
  const max = options.maximum;
  Check_default.typeOf.object("min", min);
  Check_default.typeOf.object("max", max);
  if (defined_default(options.offsetAttribute) && options.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
    throw new DeveloperError_default(
      "GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry."
    );
  }
  this._min = Cartesian3_default.clone(min);
  this._max = Cartesian3_default.clone(max);
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createBoxOutlineGeometry";
}
BoxOutlineGeometry.fromDimensions = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const dimensions = options.dimensions;
  Check_default.typeOf.object("dimensions", dimensions);
  Check_default.typeOf.number.greaterThanOrEquals("dimensions.x", dimensions.x, 0);
  Check_default.typeOf.number.greaterThanOrEquals("dimensions.y", dimensions.y, 0);
  Check_default.typeOf.number.greaterThanOrEquals("dimensions.z", dimensions.z, 0);
  const corner = Cartesian3_default.multiplyByScalar(dimensions, 0.5, new Cartesian3_default());
  return new BoxOutlineGeometry({
    minimum: Cartesian3_default.negate(corner, new Cartesian3_default()),
    maximum: corner,
    offsetAttribute: options.offsetAttribute
  });
};
BoxOutlineGeometry.fromAxisAlignedBoundingBox = function(boundingBox) {
  Check_default.typeOf.object("boundindBox", boundingBox);
  return new BoxOutlineGeometry({
    minimum: boundingBox.minimum,
    maximum: boundingBox.maximum
  });
};
BoxOutlineGeometry.packedLength = 2 * Cartesian3_default.packedLength + 1;
BoxOutlineGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  Cartesian3_default.pack(value._min, array, startingIndex);
  Cartesian3_default.pack(value._max, array, startingIndex + Cartesian3_default.packedLength);
  array[startingIndex + Cartesian3_default.packedLength * 2] = defaultValue_default(
    value._offsetAttribute,
    -1
  );
  return array;
};
var scratchMin = new Cartesian3_default();
var scratchMax = new Cartesian3_default();
var scratchOptions = {
  minimum: scratchMin,
  maximum: scratchMax,
  offsetAttribute: void 0
};
BoxOutlineGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const min = Cartesian3_default.unpack(array, startingIndex, scratchMin);
  const max = Cartesian3_default.unpack(
    array,
    startingIndex + Cartesian3_default.packedLength,
    scratchMax
  );
  const offsetAttribute = array[startingIndex + Cartesian3_default.packedLength * 2];
  if (!defined_default(result)) {
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new BoxOutlineGeometry(scratchOptions);
  }
  result._min = Cartesian3_default.clone(min, result._min);
  result._max = Cartesian3_default.clone(max, result._max);
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
BoxOutlineGeometry.createGeometry = function(boxGeometry) {
  const min = boxGeometry._min;
  const max = boxGeometry._max;
  if (Cartesian3_default.equals(min, max)) {
    return;
  }
  const attributes = new GeometryAttributes_default();
  const indices = new Uint16Array(12 * 2);
  const positions = new Float64Array(8 * 3);
  positions[0] = min.x;
  positions[1] = min.y;
  positions[2] = min.z;
  positions[3] = max.x;
  positions[4] = min.y;
  positions[5] = min.z;
  positions[6] = max.x;
  positions[7] = max.y;
  positions[8] = min.z;
  positions[9] = min.x;
  positions[10] = max.y;
  positions[11] = min.z;
  positions[12] = min.x;
  positions[13] = min.y;
  positions[14] = max.z;
  positions[15] = max.x;
  positions[16] = min.y;
  positions[17] = max.z;
  positions[18] = max.x;
  positions[19] = max.y;
  positions[20] = max.z;
  positions[21] = min.x;
  positions[22] = max.y;
  positions[23] = max.z;
  attributes.position = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: positions
  });
  indices[0] = 4;
  indices[1] = 5;
  indices[2] = 5;
  indices[3] = 6;
  indices[4] = 6;
  indices[5] = 7;
  indices[6] = 7;
  indices[7] = 4;
  indices[8] = 0;
  indices[9] = 1;
  indices[10] = 1;
  indices[11] = 2;
  indices[12] = 2;
  indices[13] = 3;
  indices[14] = 3;
  indices[15] = 0;
  indices[16] = 0;
  indices[17] = 4;
  indices[18] = 1;
  indices[19] = 5;
  indices[20] = 2;
  indices[21] = 6;
  indices[22] = 3;
  indices[23] = 7;
  const diff = Cartesian3_default.subtract(max, min, diffScratch);
  const radius = Cartesian3_default.magnitude(diff) * 0.5;
  if (defined_default(boxGeometry._offsetAttribute)) {
    const length = positions.length;
    const offsetValue = boxGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
    const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
    attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset
    });
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.LINES,
    boundingSphere: new BoundingSphere_default(Cartesian3_default.ZERO, radius),
    offsetAttribute: boxGeometry._offsetAttribute
  });
};
var BoxOutlineGeometry_default = BoxOutlineGeometry;

// packages/engine/Source/Workers/createBoxOutlineGeometry.js
function createBoxOutlineGeometry(boxGeometry, offset) {
  if (defined_default(offset)) {
    boxGeometry = BoxOutlineGeometry_default.unpack(boxGeometry, offset);
  }
  return BoxOutlineGeometry_default.createGeometry(boxGeometry);
}
var createBoxOutlineGeometry_default = createBoxOutlineGeometry;
export {
  createBoxOutlineGeometry_default as default
};
