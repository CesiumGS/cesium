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


// packages/engine/Source/Core/ArcType.js
var ArcType = {
  /**
   * Straight line that does not conform to the surface of the ellipsoid.
   *
   * @type {number}
   * @constant
   */
  NONE: 0,
  /**
   * Follow geodesic path.
   *
   * @type {number}
   * @constant
   */
  GEODESIC: 1,
  /**
   * Follow rhumb or loxodrome path.
   *
   * @type {number}
   * @constant
   */
  RHUMB: 2
};
var ArcType_default = Object.freeze(ArcType);

export {
  ArcType_default
};
