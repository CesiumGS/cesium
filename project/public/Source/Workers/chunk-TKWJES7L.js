/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.120
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
  Matrix4_default
} from "./chunk-IKEVZXU4.js";
import {
  defaultValue_default
} from "./chunk-SWIXUPD2.js";
import {
  DeveloperError_default
} from "./chunk-L7PKE5VE.js";
import {
  defined_default
} from "./chunk-D3NRMS7O.js";

// packages/engine/Source/Core/GeometryInstance.js
function GeometryInstance(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  if (!defined_default(options.geometry)) {
    throw new DeveloperError_default("options.geometry is required.");
  }
  this.geometry = options.geometry;
  this.modelMatrix = Matrix4_default.clone(
    defaultValue_default(options.modelMatrix, Matrix4_default.IDENTITY)
  );
  this.id = options.id;
  this.pickPrimitive = options.pickPrimitive;
  this.attributes = defaultValue_default(options.attributes, {});
  this.westHemisphereGeometry = void 0;
  this.eastHemisphereGeometry = void 0;
}
var GeometryInstance_default = GeometryInstance;

export {
  GeometryInstance_default
};
