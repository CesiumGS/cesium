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
  EllipseGeometry_default
} from "./chunk-DUFRECPI.js";
import "./chunk-HTA435WF.js";
import "./chunk-TKWJES7L.js";
import "./chunk-UYD7VKLC.js";
import "./chunk-H2LNVRQK.js";
import "./chunk-2JFYCC4M.js";
import "./chunk-QPIJCFV5.js";
import "./chunk-NK6OBUQA.js";
import "./chunk-BV4EB65S.js";
import "./chunk-P7OMCKJ5.js";
import "./chunk-QWYE75PG.js";
import "./chunk-EQPKKCOB.js";
import "./chunk-YMBYIWRS.js";
import "./chunk-JFRY2XUS.js";
import "./chunk-IKEVZXU4.js";
import "./chunk-RQMS6UV3.js";
import {
  Cartesian3_default,
  Ellipsoid_default
} from "./chunk-FIBS72KH.js";
import "./chunk-HOXR7V6R.js";
import "./chunk-ZYWSMCFH.js";
import "./chunk-I3VEM5YN.js";
import "./chunk-SWIXUPD2.js";
import "./chunk-L7PKE5VE.js";
import {
  defined_default
} from "./chunk-D3NRMS7O.js";

// packages/engine/Source/Workers/createEllipseGeometry.js
function createEllipseGeometry(ellipseGeometry, offset) {
  if (defined_default(offset)) {
    ellipseGeometry = EllipseGeometry_default.unpack(ellipseGeometry, offset);
  }
  ellipseGeometry._center = Cartesian3_default.clone(ellipseGeometry._center);
  ellipseGeometry._ellipsoid = Ellipsoid_default.clone(ellipseGeometry._ellipsoid);
  return EllipseGeometry_default.createGeometry(ellipseGeometry);
}
var createEllipseGeometry_default = createEllipseGeometry;
export {
  createEllipseGeometry_default as default
};
