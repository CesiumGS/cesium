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
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/arrayRemoveDuplicates.js
var removeDuplicatesEpsilon = Math_default.EPSILON10;
function arrayRemoveDuplicates(values, equalsEpsilon, wrapAround, removedIndices) {
  Check_default.defined("equalsEpsilon", equalsEpsilon);
  if (!defined_default(values)) {
    return void 0;
  }
  wrapAround = defaultValue_default(wrapAround, false);
  const storeRemovedIndices = defined_default(removedIndices);
  const length = values.length;
  if (length < 2) {
    return values;
  }
  let i;
  let v0 = values[0];
  let v1;
  let cleanedValues;
  let lastCleanIndex = 0;
  let removedIndexLCI = -1;
  for (i = 1; i < length; ++i) {
    v1 = values[i];
    if (equalsEpsilon(v0, v1, removeDuplicatesEpsilon)) {
      if (!defined_default(cleanedValues)) {
        cleanedValues = values.slice(0, i);
        lastCleanIndex = i - 1;
        removedIndexLCI = 0;
      }
      if (storeRemovedIndices) {
        removedIndices.push(i);
      }
    } else {
      if (defined_default(cleanedValues)) {
        cleanedValues.push(v1);
        lastCleanIndex = i;
        if (storeRemovedIndices) {
          removedIndexLCI = removedIndices.length;
        }
      }
      v0 = v1;
    }
  }
  if (wrapAround && equalsEpsilon(values[0], values[length - 1], removeDuplicatesEpsilon)) {
    if (storeRemovedIndices) {
      if (defined_default(cleanedValues)) {
        removedIndices.splice(removedIndexLCI, 0, lastCleanIndex);
      } else {
        removedIndices.push(length - 1);
      }
    }
    if (defined_default(cleanedValues)) {
      cleanedValues.length -= 1;
    } else {
      cleanedValues = values.slice(0, -1);
    }
  }
  return defined_default(cleanedValues) ? cleanedValues : values;
}
var arrayRemoveDuplicates_default = arrayRemoveDuplicates;

export {
  arrayRemoveDuplicates_default
};
