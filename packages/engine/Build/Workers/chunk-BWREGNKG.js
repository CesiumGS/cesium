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
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/WebMercatorProjection.js
function WebMercatorProjection(ellipsoid) {
  this._ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  this._semimajorAxis = this._ellipsoid.maximumRadius;
  this._oneOverSemimajorAxis = 1 / this._semimajorAxis;
}
Object.defineProperties(WebMercatorProjection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof WebMercatorProjection.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function() {
      return this._ellipsoid;
    }
  }
});
WebMercatorProjection.mercatorAngleToGeodeticLatitude = function(mercatorAngle) {
  return Math_default.PI_OVER_TWO - 2 * Math.atan(Math.exp(-mercatorAngle));
};
WebMercatorProjection.geodeticLatitudeToMercatorAngle = function(latitude) {
  if (latitude > WebMercatorProjection.MaximumLatitude) {
    latitude = WebMercatorProjection.MaximumLatitude;
  } else if (latitude < -WebMercatorProjection.MaximumLatitude) {
    latitude = -WebMercatorProjection.MaximumLatitude;
  }
  const sinLatitude = Math.sin(latitude);
  return 0.5 * Math.log((1 + sinLatitude) / (1 - sinLatitude));
};
WebMercatorProjection.MaximumLatitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(
  Math.PI
);
WebMercatorProjection.prototype.project = function(cartographic, result) {
  const semimajorAxis = this._semimajorAxis;
  const x = cartographic.longitude * semimajorAxis;
  const y = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
    cartographic.latitude
  ) * semimajorAxis;
  const z = cartographic.height;
  if (!defined_default(result)) {
    return new Cartesian3_default(x, y, z);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
WebMercatorProjection.prototype.unproject = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    throw new DeveloperError_default("cartesian is required");
  }
  const oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
  const longitude = cartesian.x * oneOverEarthSemimajorAxis;
  const latitude = WebMercatorProjection.mercatorAngleToGeodeticLatitude(
    cartesian.y * oneOverEarthSemimajorAxis
  );
  const height = cartesian.z;
  if (!defined_default(result)) {
    return new Cartographic_default(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
var WebMercatorProjection_default = WebMercatorProjection;

export {
  WebMercatorProjection_default
};
