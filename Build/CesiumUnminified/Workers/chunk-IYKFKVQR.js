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
  Intersect_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian3_default
} from "./chunk-A7FTZEKI.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/AxisAlignedBoundingBox.js
function AxisAlignedBoundingBox(minimum, maximum, center) {
  this.minimum = Cartesian3_default.clone(defaultValue_default(minimum, Cartesian3_default.ZERO));
  this.maximum = Cartesian3_default.clone(defaultValue_default(maximum, Cartesian3_default.ZERO));
  if (!defined_default(center)) {
    center = Cartesian3_default.midpoint(this.minimum, this.maximum, new Cartesian3_default());
  } else {
    center = Cartesian3_default.clone(center);
  }
  this.center = center;
}
AxisAlignedBoundingBox.fromCorners = function(minimum, maximum, result) {
  Check_default.defined("minimum", minimum);
  Check_default.defined("maximum", maximum);
  if (!defined_default(result)) {
    result = new AxisAlignedBoundingBox();
  }
  result.minimum = Cartesian3_default.clone(minimum, result.minimum);
  result.maximum = Cartesian3_default.clone(maximum, result.maximum);
  result.center = Cartesian3_default.midpoint(minimum, maximum, result.center);
  return result;
};
AxisAlignedBoundingBox.fromPoints = function(positions, result) {
  if (!defined_default(result)) {
    result = new AxisAlignedBoundingBox();
  }
  if (!defined_default(positions) || positions.length === 0) {
    result.minimum = Cartesian3_default.clone(Cartesian3_default.ZERO, result.minimum);
    result.maximum = Cartesian3_default.clone(Cartesian3_default.ZERO, result.maximum);
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    return result;
  }
  let minimumX = positions[0].x;
  let minimumY = positions[0].y;
  let minimumZ = positions[0].z;
  let maximumX = positions[0].x;
  let maximumY = positions[0].y;
  let maximumZ = positions[0].z;
  const length = positions.length;
  for (let i = 1; i < length; i++) {
    const p = positions[i];
    const x = p.x;
    const y = p.y;
    const z = p.z;
    minimumX = Math.min(x, minimumX);
    maximumX = Math.max(x, maximumX);
    minimumY = Math.min(y, minimumY);
    maximumY = Math.max(y, maximumY);
    minimumZ = Math.min(z, minimumZ);
    maximumZ = Math.max(z, maximumZ);
  }
  const minimum = result.minimum;
  minimum.x = minimumX;
  minimum.y = minimumY;
  minimum.z = minimumZ;
  const maximum = result.maximum;
  maximum.x = maximumX;
  maximum.y = maximumY;
  maximum.z = maximumZ;
  result.center = Cartesian3_default.midpoint(minimum, maximum, result.center);
  return result;
};
AxisAlignedBoundingBox.clone = function(box, result) {
  if (!defined_default(box)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new AxisAlignedBoundingBox(box.minimum, box.maximum, box.center);
  }
  result.minimum = Cartesian3_default.clone(box.minimum, result.minimum);
  result.maximum = Cartesian3_default.clone(box.maximum, result.maximum);
  result.center = Cartesian3_default.clone(box.center, result.center);
  return result;
};
AxisAlignedBoundingBox.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && Cartesian3_default.equals(left.center, right.center) && Cartesian3_default.equals(left.minimum, right.minimum) && Cartesian3_default.equals(left.maximum, right.maximum);
};
var intersectScratch = new Cartesian3_default();
AxisAlignedBoundingBox.intersectPlane = function(box, plane) {
  Check_default.defined("box", box);
  Check_default.defined("plane", plane);
  intersectScratch = Cartesian3_default.subtract(
    box.maximum,
    box.minimum,
    intersectScratch
  );
  const h = Cartesian3_default.multiplyByScalar(
    intersectScratch,
    0.5,
    intersectScratch
  );
  const normal = plane.normal;
  const e = h.x * Math.abs(normal.x) + h.y * Math.abs(normal.y) + h.z * Math.abs(normal.z);
  const s = Cartesian3_default.dot(box.center, normal) + plane.distance;
  if (s - e > 0) {
    return Intersect_default.INSIDE;
  }
  if (s + e < 0) {
    return Intersect_default.OUTSIDE;
  }
  return Intersect_default.INTERSECTING;
};
AxisAlignedBoundingBox.prototype.clone = function(result) {
  return AxisAlignedBoundingBox.clone(this, result);
};
AxisAlignedBoundingBox.prototype.intersectPlane = function(plane) {
  return AxisAlignedBoundingBox.intersectPlane(this, plane);
};
AxisAlignedBoundingBox.prototype.equals = function(right) {
  return AxisAlignedBoundingBox.equals(this, right);
};
var AxisAlignedBoundingBox_default = AxisAlignedBoundingBox;

export {
  AxisAlignedBoundingBox_default
};
