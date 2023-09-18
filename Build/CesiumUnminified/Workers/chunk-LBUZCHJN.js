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
  Quaternion_default,
  Transforms_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default,
  Matrix2_default,
  Matrix4_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  WebGLConstants_default
} from "./chunk-LSF6MAVT.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/GeometryType.js
var GeometryType = {
  NONE: 0,
  TRIANGLES: 1,
  LINES: 2,
  POLYLINES: 3
};
var GeometryType_default = Object.freeze(GeometryType);

// packages/engine/Source/Core/PrimitiveType.js
var PrimitiveType = {
  /**
   * Points primitive where each vertex (or index) is a separate point.
   *
   * @type {number}
   * @constant
   */
  POINTS: WebGLConstants_default.POINTS,
  /**
   * Lines primitive where each two vertices (or indices) is a line segment.  Line segments are not necessarily connected.
   *
   * @type {number}
   * @constant
   */
  LINES: WebGLConstants_default.LINES,
  /**
   * Line loop primitive where each vertex (or index) after the first connects a line to
   * the previous vertex, and the last vertex implicitly connects to the first.
   *
   * @type {number}
   * @constant
   */
  LINE_LOOP: WebGLConstants_default.LINE_LOOP,
  /**
   * Line strip primitive where each vertex (or index) after the first connects a line to the previous vertex.
   *
   * @type {number}
   * @constant
   */
  LINE_STRIP: WebGLConstants_default.LINE_STRIP,
  /**
   * Triangles primitive where each three vertices (or indices) is a triangle.  Triangles do not necessarily share edges.
   *
   * @type {number}
   * @constant
   */
  TRIANGLES: WebGLConstants_default.TRIANGLES,
  /**
   * Triangle strip primitive where each vertex (or index) after the first two connect to
   * the previous two vertices forming a triangle.  For example, this can be used to model a wall.
   *
   * @type {number}
   * @constant
   */
  TRIANGLE_STRIP: WebGLConstants_default.TRIANGLE_STRIP,
  /**
   * Triangle fan primitive where each vertex (or index) after the first two connect to
   * the previous vertex and the first vertex forming a triangle.  For example, this can be used
   * to model a cone or circle.
   *
   * @type {number}
   * @constant
   */
  TRIANGLE_FAN: WebGLConstants_default.TRIANGLE_FAN
};
PrimitiveType.isLines = function(primitiveType) {
  return primitiveType === PrimitiveType.LINES || primitiveType === PrimitiveType.LINE_LOOP || primitiveType === PrimitiveType.LINE_STRIP;
};
PrimitiveType.isTriangles = function(primitiveType) {
  return primitiveType === PrimitiveType.TRIANGLES || primitiveType === PrimitiveType.TRIANGLE_STRIP || primitiveType === PrimitiveType.TRIANGLE_FAN;
};
PrimitiveType.validate = function(primitiveType) {
  return primitiveType === PrimitiveType.POINTS || primitiveType === PrimitiveType.LINES || primitiveType === PrimitiveType.LINE_LOOP || primitiveType === PrimitiveType.LINE_STRIP || primitiveType === PrimitiveType.TRIANGLES || primitiveType === PrimitiveType.TRIANGLE_STRIP || primitiveType === PrimitiveType.TRIANGLE_FAN;
};
var PrimitiveType_default = Object.freeze(PrimitiveType);

// packages/engine/Source/Core/Geometry.js
function Geometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.typeOf.object("options.attributes", options.attributes);
  this.attributes = options.attributes;
  this.indices = options.indices;
  this.primitiveType = defaultValue_default(
    options.primitiveType,
    PrimitiveType_default.TRIANGLES
  );
  this.boundingSphere = options.boundingSphere;
  this.geometryType = defaultValue_default(options.geometryType, GeometryType_default.NONE);
  this.boundingSphereCV = options.boundingSphereCV;
  this.offsetAttribute = options.offsetAttribute;
}
Geometry.computeNumberOfVertices = function(geometry) {
  Check_default.typeOf.object("geometry", geometry);
  let numberOfVertices = -1;
  for (const property in geometry.attributes) {
    if (geometry.attributes.hasOwnProperty(property) && defined_default(geometry.attributes[property]) && defined_default(geometry.attributes[property].values)) {
      const attribute = geometry.attributes[property];
      const num = attribute.values.length / attribute.componentsPerAttribute;
      if (numberOfVertices !== num && numberOfVertices !== -1) {
        throw new DeveloperError_default(
          "All attribute lists must have the same number of attributes."
        );
      }
      numberOfVertices = num;
    }
  }
  return numberOfVertices;
};
var rectangleCenterScratch = new Cartographic_default();
var enuCenterScratch = new Cartesian3_default();
var fixedFrameToEnuScratch = new Matrix4_default();
var boundingRectanglePointsCartographicScratch = [
  new Cartographic_default(),
  new Cartographic_default(),
  new Cartographic_default()
];
var boundingRectanglePointsEnuScratch = [
  new Cartesian2_default(),
  new Cartesian2_default(),
  new Cartesian2_default()
];
var points2DScratch = [new Cartesian2_default(), new Cartesian2_default(), new Cartesian2_default()];
var pointEnuScratch = new Cartesian3_default();
var enuRotationScratch = new Quaternion_default();
var enuRotationMatrixScratch = new Matrix4_default();
var rotation2DScratch = new Matrix2_default();
Geometry._textureCoordinateRotationPoints = function(positions, stRotation, ellipsoid, boundingRectangle) {
  let i;
  const rectangleCenter = Rectangle_default.center(
    boundingRectangle,
    rectangleCenterScratch
  );
  const enuCenter = Cartographic_default.toCartesian(
    rectangleCenter,
    ellipsoid,
    enuCenterScratch
  );
  const enuToFixedFrame = Transforms_default.eastNorthUpToFixedFrame(
    enuCenter,
    ellipsoid,
    fixedFrameToEnuScratch
  );
  const fixedFrameToEnu = Matrix4_default.inverse(
    enuToFixedFrame,
    fixedFrameToEnuScratch
  );
  const boundingPointsEnu = boundingRectanglePointsEnuScratch;
  const boundingPointsCarto = boundingRectanglePointsCartographicScratch;
  boundingPointsCarto[0].longitude = boundingRectangle.west;
  boundingPointsCarto[0].latitude = boundingRectangle.south;
  boundingPointsCarto[1].longitude = boundingRectangle.west;
  boundingPointsCarto[1].latitude = boundingRectangle.north;
  boundingPointsCarto[2].longitude = boundingRectangle.east;
  boundingPointsCarto[2].latitude = boundingRectangle.south;
  let posEnu = pointEnuScratch;
  for (i = 0; i < 3; i++) {
    Cartographic_default.toCartesian(boundingPointsCarto[i], ellipsoid, posEnu);
    posEnu = Matrix4_default.multiplyByPointAsVector(fixedFrameToEnu, posEnu, posEnu);
    boundingPointsEnu[i].x = posEnu.x;
    boundingPointsEnu[i].y = posEnu.y;
  }
  const rotation = Quaternion_default.fromAxisAngle(
    Cartesian3_default.UNIT_Z,
    -stRotation,
    enuRotationScratch
  );
  const textureMatrix = Matrix3_default.fromQuaternion(
    rotation,
    enuRotationMatrixScratch
  );
  const positionsLength = positions.length;
  let enuMinX = Number.POSITIVE_INFINITY;
  let enuMinY = Number.POSITIVE_INFINITY;
  let enuMaxX = Number.NEGATIVE_INFINITY;
  let enuMaxY = Number.NEGATIVE_INFINITY;
  for (i = 0; i < positionsLength; i++) {
    posEnu = Matrix4_default.multiplyByPointAsVector(
      fixedFrameToEnu,
      positions[i],
      posEnu
    );
    posEnu = Matrix3_default.multiplyByVector(textureMatrix, posEnu, posEnu);
    enuMinX = Math.min(enuMinX, posEnu.x);
    enuMinY = Math.min(enuMinY, posEnu.y);
    enuMaxX = Math.max(enuMaxX, posEnu.x);
    enuMaxY = Math.max(enuMaxY, posEnu.y);
  }
  const toDesiredInComputed = Matrix2_default.fromRotation(
    stRotation,
    rotation2DScratch
  );
  const points2D = points2DScratch;
  points2D[0].x = enuMinX;
  points2D[0].y = enuMinY;
  points2D[1].x = enuMinX;
  points2D[1].y = enuMaxY;
  points2D[2].x = enuMaxX;
  points2D[2].y = enuMinY;
  const boundingEnuMin = boundingPointsEnu[0];
  const boundingPointsWidth = boundingPointsEnu[2].x - boundingEnuMin.x;
  const boundingPointsHeight = boundingPointsEnu[1].y - boundingEnuMin.y;
  for (i = 0; i < 3; i++) {
    const point2D = points2D[i];
    Matrix2_default.multiplyByVector(toDesiredInComputed, point2D, point2D);
    point2D.x = (point2D.x - boundingEnuMin.x) / boundingPointsWidth;
    point2D.y = (point2D.y - boundingEnuMin.y) / boundingPointsHeight;
  }
  const minXYCorner = points2D[0];
  const maxYCorner = points2D[1];
  const maxXCorner = points2D[2];
  const result = new Array(6);
  Cartesian2_default.pack(minXYCorner, result);
  Cartesian2_default.pack(maxYCorner, result, 2);
  Cartesian2_default.pack(maxXCorner, result, 4);
  return result;
};
var Geometry_default = Geometry;

// packages/engine/Source/Core/GeometryAttribute.js
function GeometryAttribute(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  if (!defined_default(options.componentDatatype)) {
    throw new DeveloperError_default("options.componentDatatype is required.");
  }
  if (!defined_default(options.componentsPerAttribute)) {
    throw new DeveloperError_default("options.componentsPerAttribute is required.");
  }
  if (options.componentsPerAttribute < 1 || options.componentsPerAttribute > 4) {
    throw new DeveloperError_default(
      "options.componentsPerAttribute must be between 1 and 4."
    );
  }
  if (!defined_default(options.values)) {
    throw new DeveloperError_default("options.values is required.");
  }
  this.componentDatatype = options.componentDatatype;
  this.componentsPerAttribute = options.componentsPerAttribute;
  this.normalize = defaultValue_default(options.normalize, false);
  this.values = options.values;
}
var GeometryAttribute_default = GeometryAttribute;

export {
  GeometryType_default,
  PrimitiveType_default,
  Geometry_default,
  GeometryAttribute_default
};
