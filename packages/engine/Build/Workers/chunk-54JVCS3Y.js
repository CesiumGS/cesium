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
  Cartesian3_default
} from "./chunk-A7FTZEKI.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/EncodedCartesian3.js
function EncodedCartesian3() {
  this.high = Cartesian3_default.clone(Cartesian3_default.ZERO);
  this.low = Cartesian3_default.clone(Cartesian3_default.ZERO);
}
EncodedCartesian3.encode = function(value, result) {
  Check_default.typeOf.number("value", value);
  if (!defined_default(result)) {
    result = {
      high: 0,
      low: 0
    };
  }
  let doubleHigh;
  if (value >= 0) {
    doubleHigh = Math.floor(value / 65536) * 65536;
    result.high = doubleHigh;
    result.low = value - doubleHigh;
  } else {
    doubleHigh = Math.floor(-value / 65536) * 65536;
    result.high = -doubleHigh;
    result.low = value + doubleHigh;
  }
  return result;
};
var scratchEncode = {
  high: 0,
  low: 0
};
EncodedCartesian3.fromCartesian = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  if (!defined_default(result)) {
    result = new EncodedCartesian3();
  }
  const high = result.high;
  const low = result.low;
  EncodedCartesian3.encode(cartesian.x, scratchEncode);
  high.x = scratchEncode.high;
  low.x = scratchEncode.low;
  EncodedCartesian3.encode(cartesian.y, scratchEncode);
  high.y = scratchEncode.high;
  low.y = scratchEncode.low;
  EncodedCartesian3.encode(cartesian.z, scratchEncode);
  high.z = scratchEncode.high;
  low.z = scratchEncode.low;
  return result;
};
var encodedP = new EncodedCartesian3();
EncodedCartesian3.writeElements = function(cartesian, cartesianArray, index) {
  Check_default.defined("cartesianArray", cartesianArray);
  Check_default.typeOf.number("index", index);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  EncodedCartesian3.fromCartesian(cartesian, encodedP);
  const high = encodedP.high;
  const low = encodedP.low;
  cartesianArray[index] = high.x;
  cartesianArray[index + 1] = high.y;
  cartesianArray[index + 2] = high.z;
  cartesianArray[index + 3] = low.x;
  cartesianArray[index + 4] = low.y;
  cartesianArray[index + 5] = low.z;
};
var EncodedCartesian3_default = EncodedCartesian3;

export {
  EncodedCartesian3_default
};
