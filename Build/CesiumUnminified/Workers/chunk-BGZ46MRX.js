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
  OrientedBoundingBox_default
} from "./chunk-YQGUKCJO.js";
import {
  Cartesian2_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartesian3_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";

// packages/engine/Source/Core/CoplanarPolygonGeometryLibrary.js
var CoplanarPolygonGeometryLibrary = {};
var scratchIntersectionPoint = new Cartesian3_default();
var scratchXAxis = new Cartesian3_default();
var scratchYAxis = new Cartesian3_default();
var scratchZAxis = new Cartesian3_default();
var obbScratch = new OrientedBoundingBox_default();
CoplanarPolygonGeometryLibrary.validOutline = function(positions) {
  Check_default.defined("positions", positions);
  const orientedBoundingBox = OrientedBoundingBox_default.fromPoints(
    positions,
    obbScratch
  );
  const halfAxes = orientedBoundingBox.halfAxes;
  const xAxis = Matrix3_default.getColumn(halfAxes, 0, scratchXAxis);
  const yAxis = Matrix3_default.getColumn(halfAxes, 1, scratchYAxis);
  const zAxis = Matrix3_default.getColumn(halfAxes, 2, scratchZAxis);
  const xMag = Cartesian3_default.magnitude(xAxis);
  const yMag = Cartesian3_default.magnitude(yAxis);
  const zMag = Cartesian3_default.magnitude(zAxis);
  return !(xMag === 0 && (yMag === 0 || zMag === 0) || yMag === 0 && zMag === 0);
};
CoplanarPolygonGeometryLibrary.computeProjectTo2DArguments = function(positions, centerResult, planeAxis1Result, planeAxis2Result) {
  Check_default.defined("positions", positions);
  Check_default.defined("centerResult", centerResult);
  Check_default.defined("planeAxis1Result", planeAxis1Result);
  Check_default.defined("planeAxis2Result", planeAxis2Result);
  const orientedBoundingBox = OrientedBoundingBox_default.fromPoints(
    positions,
    obbScratch
  );
  const halfAxes = orientedBoundingBox.halfAxes;
  const xAxis = Matrix3_default.getColumn(halfAxes, 0, scratchXAxis);
  const yAxis = Matrix3_default.getColumn(halfAxes, 1, scratchYAxis);
  const zAxis = Matrix3_default.getColumn(halfAxes, 2, scratchZAxis);
  const xMag = Cartesian3_default.magnitude(xAxis);
  const yMag = Cartesian3_default.magnitude(yAxis);
  const zMag = Cartesian3_default.magnitude(zAxis);
  const min = Math.min(xMag, yMag, zMag);
  if (xMag === 0 && (yMag === 0 || zMag === 0) || yMag === 0 && zMag === 0) {
    return false;
  }
  let planeAxis1;
  let planeAxis2;
  if (min === yMag || min === zMag) {
    planeAxis1 = xAxis;
  }
  if (min === xMag) {
    planeAxis1 = yAxis;
  } else if (min === zMag) {
    planeAxis2 = yAxis;
  }
  if (min === xMag || min === yMag) {
    planeAxis2 = zAxis;
  }
  Cartesian3_default.normalize(planeAxis1, planeAxis1Result);
  Cartesian3_default.normalize(planeAxis2, planeAxis2Result);
  Cartesian3_default.clone(orientedBoundingBox.center, centerResult);
  return true;
};
function projectTo2D(position, center, axis1, axis2, result) {
  const v = Cartesian3_default.subtract(position, center, scratchIntersectionPoint);
  const x = Cartesian3_default.dot(axis1, v);
  const y = Cartesian3_default.dot(axis2, v);
  return Cartesian2_default.fromElements(x, y, result);
}
CoplanarPolygonGeometryLibrary.createProjectPointsTo2DFunction = function(center, axis1, axis2) {
  return function(positions) {
    const positionResults = new Array(positions.length);
    for (let i = 0; i < positions.length; i++) {
      positionResults[i] = projectTo2D(positions[i], center, axis1, axis2);
    }
    return positionResults;
  };
};
CoplanarPolygonGeometryLibrary.createProjectPointTo2DFunction = function(center, axis1, axis2) {
  return function(position, result) {
    return projectTo2D(position, center, axis1, axis2, result);
  };
};
var CoplanarPolygonGeometryLibrary_default = CoplanarPolygonGeometryLibrary;

export {
  CoplanarPolygonGeometryLibrary_default
};
