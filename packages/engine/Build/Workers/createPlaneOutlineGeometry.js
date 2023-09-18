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
import "./chunk-63W23YZY.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/PlaneOutlineGeometry.js
function PlaneOutlineGeometry() {
  this._workerName = "createPlaneOutlineGeometry";
}
PlaneOutlineGeometry.packedLength = 0;
PlaneOutlineGeometry.pack = function(value, array) {
  Check_default.defined("value", value);
  Check_default.defined("array", array);
  return array;
};
PlaneOutlineGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  if (!defined_default(result)) {
    return new PlaneOutlineGeometry();
  }
  return result;
};
var min = new Cartesian3_default(-0.5, -0.5, 0);
var max = new Cartesian3_default(0.5, 0.5, 0);
PlaneOutlineGeometry.createGeometry = function() {
  const attributes = new GeometryAttributes_default();
  const indices = new Uint16Array(4 * 2);
  const positions = new Float64Array(4 * 3);
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
  attributes.position = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: positions
  });
  indices[0] = 0;
  indices[1] = 1;
  indices[2] = 1;
  indices[3] = 2;
  indices[4] = 2;
  indices[5] = 3;
  indices[6] = 3;
  indices[7] = 0;
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.LINES,
    boundingSphere: new BoundingSphere_default(Cartesian3_default.ZERO, Math.sqrt(2))
  });
};
var PlaneOutlineGeometry_default = PlaneOutlineGeometry;

// packages/engine/Source/Workers/createPlaneOutlineGeometry.js
function createPlaneOutlineGeometry(planeGeometry, offset) {
  if (defined_default(offset)) {
    planeGeometry = PlaneOutlineGeometry_default.unpack(planeGeometry, offset);
  }
  return PlaneOutlineGeometry_default.createGeometry(planeGeometry);
}
var createPlaneOutlineGeometry_default = createPlaneOutlineGeometry;
export {
  createPlaneOutlineGeometry_default as default
};
