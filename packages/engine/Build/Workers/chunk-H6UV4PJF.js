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
  EllipsoidGeodesic_default
} from "./chunk-DAY2RGWJ.js";
import {
  EllipsoidRhumbLine_default
} from "./chunk-RSJG3PFO.js";
import {
  IntersectionTests_default
} from "./chunk-MKJM6R4K.js";
import {
  Plane_default
} from "./chunk-PY3JQBWU.js";
import {
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
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

// packages/engine/Source/Core/PolylinePipeline.js
var PolylinePipeline = {};
PolylinePipeline.numberOfPoints = function(p0, p1, minDistance) {
  const distance = Cartesian3_default.distance(p0, p1);
  return Math.ceil(distance / minDistance);
};
PolylinePipeline.numberOfPointsRhumbLine = function(p0, p1, granularity) {
  const radiansDistanceSquared = Math.pow(p0.longitude - p1.longitude, 2) + Math.pow(p0.latitude - p1.latitude, 2);
  return Math.max(
    1,
    Math.ceil(Math.sqrt(radiansDistanceSquared / (granularity * granularity)))
  );
};
var cartoScratch = new Cartographic_default();
PolylinePipeline.extractHeights = function(positions, ellipsoid) {
  const length = positions.length;
  const heights = new Array(length);
  for (let i = 0; i < length; i++) {
    const p = positions[i];
    heights[i] = ellipsoid.cartesianToCartographic(p, cartoScratch).height;
  }
  return heights;
};
var wrapLongitudeInversMatrix = new Matrix4_default();
var wrapLongitudeOrigin = new Cartesian3_default();
var wrapLongitudeXZNormal = new Cartesian3_default();
var wrapLongitudeXZPlane = new Plane_default(Cartesian3_default.UNIT_X, 0);
var wrapLongitudeYZNormal = new Cartesian3_default();
var wrapLongitudeYZPlane = new Plane_default(Cartesian3_default.UNIT_X, 0);
var wrapLongitudeIntersection = new Cartesian3_default();
var wrapLongitudeOffset = new Cartesian3_default();
var subdivideHeightsScratchArray = [];
function subdivideHeights(numPoints, h0, h1) {
  const heights = subdivideHeightsScratchArray;
  heights.length = numPoints;
  let i;
  if (h0 === h1) {
    for (i = 0; i < numPoints; i++) {
      heights[i] = h0;
    }
    return heights;
  }
  const dHeight = h1 - h0;
  const heightPerVertex = dHeight / numPoints;
  for (i = 0; i < numPoints; i++) {
    const h = h0 + i * heightPerVertex;
    heights[i] = h;
  }
  return heights;
}
var carto1 = new Cartographic_default();
var carto2 = new Cartographic_default();
var cartesian = new Cartesian3_default();
var scaleFirst = new Cartesian3_default();
var scaleLast = new Cartesian3_default();
var ellipsoidGeodesic = new EllipsoidGeodesic_default();
var ellipsoidRhumb = new EllipsoidRhumbLine_default();
function generateCartesianArc(p0, p1, minDistance, ellipsoid, h0, h1, array, offset) {
  const first = ellipsoid.scaleToGeodeticSurface(p0, scaleFirst);
  const last = ellipsoid.scaleToGeodeticSurface(p1, scaleLast);
  const numPoints = PolylinePipeline.numberOfPoints(p0, p1, minDistance);
  const start = ellipsoid.cartesianToCartographic(first, carto1);
  const end = ellipsoid.cartesianToCartographic(last, carto2);
  const heights = subdivideHeights(numPoints, h0, h1);
  ellipsoidGeodesic.setEndPoints(start, end);
  const surfaceDistanceBetweenPoints = ellipsoidGeodesic.surfaceDistance / numPoints;
  let index = offset;
  start.height = h0;
  let cart = ellipsoid.cartographicToCartesian(start, cartesian);
  Cartesian3_default.pack(cart, array, index);
  index += 3;
  for (let i = 1; i < numPoints; i++) {
    const carto = ellipsoidGeodesic.interpolateUsingSurfaceDistance(
      i * surfaceDistanceBetweenPoints,
      carto2
    );
    carto.height = heights[i];
    cart = ellipsoid.cartographicToCartesian(carto, cartesian);
    Cartesian3_default.pack(cart, array, index);
    index += 3;
  }
  return index;
}
function generateCartesianRhumbArc(p0, p1, granularity, ellipsoid, h0, h1, array, offset) {
  const start = ellipsoid.cartesianToCartographic(p0, carto1);
  const end = ellipsoid.cartesianToCartographic(p1, carto2);
  const numPoints = PolylinePipeline.numberOfPointsRhumbLine(
    start,
    end,
    granularity
  );
  start.height = 0;
  end.height = 0;
  const heights = subdivideHeights(numPoints, h0, h1);
  if (!ellipsoidRhumb.ellipsoid.equals(ellipsoid)) {
    ellipsoidRhumb = new EllipsoidRhumbLine_default(void 0, void 0, ellipsoid);
  }
  ellipsoidRhumb.setEndPoints(start, end);
  const surfaceDistanceBetweenPoints = ellipsoidRhumb.surfaceDistance / numPoints;
  let index = offset;
  start.height = h0;
  let cart = ellipsoid.cartographicToCartesian(start, cartesian);
  Cartesian3_default.pack(cart, array, index);
  index += 3;
  for (let i = 1; i < numPoints; i++) {
    const carto = ellipsoidRhumb.interpolateUsingSurfaceDistance(
      i * surfaceDistanceBetweenPoints,
      carto2
    );
    carto.height = heights[i];
    cart = ellipsoid.cartographicToCartesian(carto, cartesian);
    Cartesian3_default.pack(cart, array, index);
    index += 3;
  }
  return index;
}
PolylinePipeline.wrapLongitude = function(positions, modelMatrix) {
  const cartesians = [];
  const segments = [];
  if (defined_default(positions) && positions.length > 0) {
    modelMatrix = defaultValue_default(modelMatrix, Matrix4_default.IDENTITY);
    const inverseModelMatrix = Matrix4_default.inverseTransformation(
      modelMatrix,
      wrapLongitudeInversMatrix
    );
    const origin = Matrix4_default.multiplyByPoint(
      inverseModelMatrix,
      Cartesian3_default.ZERO,
      wrapLongitudeOrigin
    );
    const xzNormal = Cartesian3_default.normalize(
      Matrix4_default.multiplyByPointAsVector(
        inverseModelMatrix,
        Cartesian3_default.UNIT_Y,
        wrapLongitudeXZNormal
      ),
      wrapLongitudeXZNormal
    );
    const xzPlane = Plane_default.fromPointNormal(
      origin,
      xzNormal,
      wrapLongitudeXZPlane
    );
    const yzNormal = Cartesian3_default.normalize(
      Matrix4_default.multiplyByPointAsVector(
        inverseModelMatrix,
        Cartesian3_default.UNIT_X,
        wrapLongitudeYZNormal
      ),
      wrapLongitudeYZNormal
    );
    const yzPlane = Plane_default.fromPointNormal(
      origin,
      yzNormal,
      wrapLongitudeYZPlane
    );
    let count = 1;
    cartesians.push(Cartesian3_default.clone(positions[0]));
    let prev = cartesians[0];
    const length = positions.length;
    for (let i = 1; i < length; ++i) {
      const cur = positions[i];
      if (Plane_default.getPointDistance(yzPlane, prev) < 0 || Plane_default.getPointDistance(yzPlane, cur) < 0) {
        const intersection = IntersectionTests_default.lineSegmentPlane(
          prev,
          cur,
          xzPlane,
          wrapLongitudeIntersection
        );
        if (defined_default(intersection)) {
          const offset = Cartesian3_default.multiplyByScalar(
            xzNormal,
            5e-9,
            wrapLongitudeOffset
          );
          if (Plane_default.getPointDistance(xzPlane, prev) < 0) {
            Cartesian3_default.negate(offset, offset);
          }
          cartesians.push(
            Cartesian3_default.add(intersection, offset, new Cartesian3_default())
          );
          segments.push(count + 1);
          Cartesian3_default.negate(offset, offset);
          cartesians.push(
            Cartesian3_default.add(intersection, offset, new Cartesian3_default())
          );
          count = 1;
        }
      }
      cartesians.push(Cartesian3_default.clone(positions[i]));
      count++;
      prev = cur;
    }
    segments.push(count);
  }
  return {
    positions: cartesians,
    lengths: segments
  };
};
PolylinePipeline.generateArc = function(options) {
  if (!defined_default(options)) {
    options = {};
  }
  const positions = options.positions;
  if (!defined_default(positions)) {
    throw new DeveloperError_default("options.positions is required.");
  }
  const length = positions.length;
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  let height = defaultValue_default(options.height, 0);
  const hasHeightArray = Array.isArray(height);
  if (length < 1) {
    return [];
  } else if (length === 1) {
    const p = ellipsoid.scaleToGeodeticSurface(positions[0], scaleFirst);
    height = hasHeightArray ? height[0] : height;
    if (height !== 0) {
      const n = ellipsoid.geodeticSurfaceNormal(p, cartesian);
      Cartesian3_default.multiplyByScalar(n, height, n);
      Cartesian3_default.add(p, n, p);
    }
    return [p.x, p.y, p.z];
  }
  let minDistance = options.minDistance;
  if (!defined_default(minDistance)) {
    const granularity = defaultValue_default(
      options.granularity,
      Math_default.RADIANS_PER_DEGREE
    );
    minDistance = Math_default.chordLength(granularity, ellipsoid.maximumRadius);
  }
  let numPoints = 0;
  let i;
  for (i = 0; i < length - 1; i++) {
    numPoints += PolylinePipeline.numberOfPoints(
      positions[i],
      positions[i + 1],
      minDistance
    );
  }
  const arrayLength = (numPoints + 1) * 3;
  const newPositions = new Array(arrayLength);
  let offset = 0;
  for (i = 0; i < length - 1; i++) {
    const p0 = positions[i];
    const p1 = positions[i + 1];
    const h0 = hasHeightArray ? height[i] : height;
    const h1 = hasHeightArray ? height[i + 1] : height;
    offset = generateCartesianArc(
      p0,
      p1,
      minDistance,
      ellipsoid,
      h0,
      h1,
      newPositions,
      offset
    );
  }
  subdivideHeightsScratchArray.length = 0;
  const lastPoint = positions[length - 1];
  const carto = ellipsoid.cartesianToCartographic(lastPoint, carto1);
  carto.height = hasHeightArray ? height[length - 1] : height;
  const cart = ellipsoid.cartographicToCartesian(carto, cartesian);
  Cartesian3_default.pack(cart, newPositions, arrayLength - 3);
  return newPositions;
};
var scratchCartographic0 = new Cartographic_default();
var scratchCartographic1 = new Cartographic_default();
PolylinePipeline.generateRhumbArc = function(options) {
  if (!defined_default(options)) {
    options = {};
  }
  const positions = options.positions;
  if (!defined_default(positions)) {
    throw new DeveloperError_default("options.positions is required.");
  }
  const length = positions.length;
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  let height = defaultValue_default(options.height, 0);
  const hasHeightArray = Array.isArray(height);
  if (length < 1) {
    return [];
  } else if (length === 1) {
    const p = ellipsoid.scaleToGeodeticSurface(positions[0], scaleFirst);
    height = hasHeightArray ? height[0] : height;
    if (height !== 0) {
      const n = ellipsoid.geodeticSurfaceNormal(p, cartesian);
      Cartesian3_default.multiplyByScalar(n, height, n);
      Cartesian3_default.add(p, n, p);
    }
    return [p.x, p.y, p.z];
  }
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  let numPoints = 0;
  let i;
  let c0 = ellipsoid.cartesianToCartographic(
    positions[0],
    scratchCartographic0
  );
  let c1;
  for (i = 0; i < length - 1; i++) {
    c1 = ellipsoid.cartesianToCartographic(
      positions[i + 1],
      scratchCartographic1
    );
    numPoints += PolylinePipeline.numberOfPointsRhumbLine(c0, c1, granularity);
    c0 = Cartographic_default.clone(c1, scratchCartographic0);
  }
  const arrayLength = (numPoints + 1) * 3;
  const newPositions = new Array(arrayLength);
  let offset = 0;
  for (i = 0; i < length - 1; i++) {
    const p0 = positions[i];
    const p1 = positions[i + 1];
    const h0 = hasHeightArray ? height[i] : height;
    const h1 = hasHeightArray ? height[i + 1] : height;
    offset = generateCartesianRhumbArc(
      p0,
      p1,
      granularity,
      ellipsoid,
      h0,
      h1,
      newPositions,
      offset
    );
  }
  subdivideHeightsScratchArray.length = 0;
  const lastPoint = positions[length - 1];
  const carto = ellipsoid.cartesianToCartographic(lastPoint, carto1);
  carto.height = hasHeightArray ? height[length - 1] : height;
  const cart = ellipsoid.cartographicToCartesian(carto, cartesian);
  Cartesian3_default.pack(cart, newPositions, arrayLength - 3);
  return newPositions;
};
PolylinePipeline.generateCartesianArc = function(options) {
  const numberArray = PolylinePipeline.generateArc(options);
  const size = numberArray.length / 3;
  const newPositions = new Array(size);
  for (let i = 0; i < size; i++) {
    newPositions[i] = Cartesian3_default.unpack(numberArray, i * 3);
  }
  return newPositions;
};
PolylinePipeline.generateCartesianRhumbArc = function(options) {
  const numberArray = PolylinePipeline.generateRhumbArc(options);
  const size = numberArray.length / 3;
  const newPositions = new Array(size);
  for (let i = 0; i < size; i++) {
    newPositions[i] = Cartesian3_default.unpack(numberArray, i * 3);
  }
  return newPositions;
};
var PolylinePipeline_default = PolylinePipeline;

export {
  PolylinePipeline_default
};
