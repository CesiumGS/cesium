/**
 * Cesium - https://github.com/CesiumGS/cesium
 *
 * Copyright 2011-2020 Cesium Contributors
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
 * See https://github.com/CesiumGS/cesium/blob/master/LICENSE.md for full licensing details.
 */

define(['exports', './Cartesian2-e7502022', './Check-24483042', './Transforms-1ede5d55', './OrientedBoundingBox-5c59eedb'], function (exports, Cartesian2, Check, Transforms, OrientedBoundingBox) { 'use strict';

  /**
   * @private
   */
  var CoplanarPolygonGeometryLibrary = {};

  var scratchIntersectionPoint = new Cartesian2.Cartesian3();
  var scratchXAxis = new Cartesian2.Cartesian3();
  var scratchYAxis = new Cartesian2.Cartesian3();
  var scratchZAxis = new Cartesian2.Cartesian3();
  var obbScratch = new OrientedBoundingBox.OrientedBoundingBox();

  CoplanarPolygonGeometryLibrary.validOutline = function (positions) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("positions", positions);
    //>>includeEnd('debug');

    var orientedBoundingBox = OrientedBoundingBox.OrientedBoundingBox.fromPoints(
      positions,
      obbScratch
    );
    var halfAxes = orientedBoundingBox.halfAxes;
    var xAxis = Transforms.Matrix3.getColumn(halfAxes, 0, scratchXAxis);
    var yAxis = Transforms.Matrix3.getColumn(halfAxes, 1, scratchYAxis);
    var zAxis = Transforms.Matrix3.getColumn(halfAxes, 2, scratchZAxis);

    var xMag = Cartesian2.Cartesian3.magnitude(xAxis);
    var yMag = Cartesian2.Cartesian3.magnitude(yAxis);
    var zMag = Cartesian2.Cartesian3.magnitude(zAxis);

    // If all the points are on a line return undefined because we can't draw a polygon
    return !(
      (xMag === 0 && (yMag === 0 || zMag === 0)) ||
      (yMag === 0 && zMag === 0)
    );
  };

  // call after removeDuplicates
  CoplanarPolygonGeometryLibrary.computeProjectTo2DArguments = function (
    positions,
    centerResult,
    planeAxis1Result,
    planeAxis2Result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("positions", positions);
    Check.Check.defined("centerResult", centerResult);
    Check.Check.defined("planeAxis1Result", planeAxis1Result);
    Check.Check.defined("planeAxis2Result", planeAxis2Result);
    //>>includeEnd('debug');

    var orientedBoundingBox = OrientedBoundingBox.OrientedBoundingBox.fromPoints(
      positions,
      obbScratch
    );
    var halfAxes = orientedBoundingBox.halfAxes;
    var xAxis = Transforms.Matrix3.getColumn(halfAxes, 0, scratchXAxis);
    var yAxis = Transforms.Matrix3.getColumn(halfAxes, 1, scratchYAxis);
    var zAxis = Transforms.Matrix3.getColumn(halfAxes, 2, scratchZAxis);

    var xMag = Cartesian2.Cartesian3.magnitude(xAxis);
    var yMag = Cartesian2.Cartesian3.magnitude(yAxis);
    var zMag = Cartesian2.Cartesian3.magnitude(zAxis);
    var min = Math.min(xMag, yMag, zMag);

    // If all the points are on a line return undefined because we can't draw a polygon
    if (
      (xMag === 0 && (yMag === 0 || zMag === 0)) ||
      (yMag === 0 && zMag === 0)
    ) {
      return false;
    }

    var planeAxis1;
    var planeAxis2;

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

    Cartesian2.Cartesian3.normalize(planeAxis1, planeAxis1Result);
    Cartesian2.Cartesian3.normalize(planeAxis2, planeAxis2Result);
    Cartesian2.Cartesian3.clone(orientedBoundingBox.center, centerResult);
    return true;
  };

  function projectTo2D(position, center, axis1, axis2, result) {
    var v = Cartesian2.Cartesian3.subtract(position, center, scratchIntersectionPoint);
    var x = Cartesian2.Cartesian3.dot(axis1, v);
    var y = Cartesian2.Cartesian3.dot(axis2, v);

    return Cartesian2.Cartesian2.fromElements(x, y, result);
  }

  CoplanarPolygonGeometryLibrary.createProjectPointsTo2DFunction = function (
    center,
    axis1,
    axis2
  ) {
    return function (positions) {
      var positionResults = new Array(positions.length);
      for (var i = 0; i < positions.length; i++) {
        positionResults[i] = projectTo2D(positions[i], center, axis1, axis2);
      }

      return positionResults;
    };
  };

  CoplanarPolygonGeometryLibrary.createProjectPointTo2DFunction = function (
    center,
    axis1,
    axis2
  ) {
    return function (position, result) {
      return projectTo2D(position, center, axis1, axis2, result);
    };
  };

  exports.CoplanarPolygonGeometryLibrary = CoplanarPolygonGeometryLibrary;

});
//# sourceMappingURL=CoplanarPolygonGeometryLibrary-3a7eed52.js.map
