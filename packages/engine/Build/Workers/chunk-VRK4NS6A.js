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
  GeographicProjection_default,
  Intersect_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartographic_default
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

// packages/engine/Source/Core/BoundingRectangle.js
function BoundingRectangle(x, y, width, height) {
  this.x = defaultValue_default(x, 0);
  this.y = defaultValue_default(y, 0);
  this.width = defaultValue_default(width, 0);
  this.height = defaultValue_default(height, 0);
}
BoundingRectangle.packedLength = 4;
BoundingRectangle.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex++] = value.width;
  array[startingIndex] = value.height;
  return array;
};
BoundingRectangle.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new BoundingRectangle();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex++];
  result.width = array[startingIndex++];
  result.height = array[startingIndex];
  return result;
};
BoundingRectangle.fromPoints = function(positions, result) {
  if (!defined_default(result)) {
    result = new BoundingRectangle();
  }
  if (!defined_default(positions) || positions.length === 0) {
    result.x = 0;
    result.y = 0;
    result.width = 0;
    result.height = 0;
    return result;
  }
  const length = positions.length;
  let minimumX = positions[0].x;
  let minimumY = positions[0].y;
  let maximumX = positions[0].x;
  let maximumY = positions[0].y;
  for (let i = 1; i < length; i++) {
    const p = positions[i];
    const x = p.x;
    const y = p.y;
    minimumX = Math.min(x, minimumX);
    maximumX = Math.max(x, maximumX);
    minimumY = Math.min(y, minimumY);
    maximumY = Math.max(y, maximumY);
  }
  result.x = minimumX;
  result.y = minimumY;
  result.width = maximumX - minimumX;
  result.height = maximumY - minimumY;
  return result;
};
var defaultProjection = new GeographicProjection_default();
var fromRectangleLowerLeft = new Cartographic_default();
var fromRectangleUpperRight = new Cartographic_default();
BoundingRectangle.fromRectangle = function(rectangle, projection, result) {
  if (!defined_default(result)) {
    result = new BoundingRectangle();
  }
  if (!defined_default(rectangle)) {
    result.x = 0;
    result.y = 0;
    result.width = 0;
    result.height = 0;
    return result;
  }
  projection = defaultValue_default(projection, defaultProjection);
  const lowerLeft = projection.project(
    Rectangle_default.southwest(rectangle, fromRectangleLowerLeft)
  );
  const upperRight = projection.project(
    Rectangle_default.northeast(rectangle, fromRectangleUpperRight)
  );
  Cartesian2_default.subtract(upperRight, lowerLeft, upperRight);
  result.x = lowerLeft.x;
  result.y = lowerLeft.y;
  result.width = upperRight.x;
  result.height = upperRight.y;
  return result;
};
BoundingRectangle.clone = function(rectangle, result) {
  if (!defined_default(rectangle)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new BoundingRectangle(
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height
    );
  }
  result.x = rectangle.x;
  result.y = rectangle.y;
  result.width = rectangle.width;
  result.height = rectangle.height;
  return result;
};
BoundingRectangle.union = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  if (!defined_default(result)) {
    result = new BoundingRectangle();
  }
  const lowerLeftX = Math.min(left.x, right.x);
  const lowerLeftY = Math.min(left.y, right.y);
  const upperRightX = Math.max(left.x + left.width, right.x + right.width);
  const upperRightY = Math.max(left.y + left.height, right.y + right.height);
  result.x = lowerLeftX;
  result.y = lowerLeftY;
  result.width = upperRightX - lowerLeftX;
  result.height = upperRightY - lowerLeftY;
  return result;
};
BoundingRectangle.expand = function(rectangle, point, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("point", point);
  result = BoundingRectangle.clone(rectangle, result);
  const width = point.x - result.x;
  const height = point.y - result.y;
  if (width > result.width) {
    result.width = width;
  } else if (width < 0) {
    result.width -= width;
    result.x = point.x;
  }
  if (height > result.height) {
    result.height = height;
  } else if (height < 0) {
    result.height -= height;
    result.y = point.y;
  }
  return result;
};
BoundingRectangle.intersect = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  const leftX = left.x;
  const leftY = left.y;
  const rightX = right.x;
  const rightY = right.y;
  if (!(leftX > rightX + right.width || leftX + left.width < rightX || leftY + left.height < rightY || leftY > rightY + right.height)) {
    return Intersect_default.INTERSECTING;
  }
  return Intersect_default.OUTSIDE;
};
BoundingRectangle.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height;
};
BoundingRectangle.prototype.clone = function(result) {
  return BoundingRectangle.clone(this, result);
};
BoundingRectangle.prototype.intersect = function(right) {
  return BoundingRectangle.intersect(this, right);
};
BoundingRectangle.prototype.equals = function(right) {
  return BoundingRectangle.equals(this, right);
};
var BoundingRectangle_default = BoundingRectangle;

export {
  BoundingRectangle_default
};
