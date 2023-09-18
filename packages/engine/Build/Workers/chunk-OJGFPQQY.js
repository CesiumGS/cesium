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
  PolylinePipeline_default
} from "./chunk-H6UV4PJF.js";
import {
  EllipsoidTangentPlane_default
} from "./chunk-LATQ4URD.js";
import {
  Quaternion_default,
  Transforms_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default,
  Cartesian4_default,
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Matrix3_default
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

// packages/engine/Source/Core/CornerType.js
var CornerType = {
  /**
   * <img src="Images/CornerTypeRounded.png" style="vertical-align: middle;" width="186" height="189" />
   *
   * Corner has a smooth edge.
   * @type {number}
   * @constant
   */
  ROUNDED: 0,
  /**
   * <img src="Images/CornerTypeMitered.png" style="vertical-align: middle;" width="186" height="189" />
   *
   * Corner point is the intersection of adjacent edges.
   * @type {number}
   * @constant
   */
  MITERED: 1,
  /**
   * <img src="Images/CornerTypeBeveled.png" style="vertical-align: middle;" width="186" height="189" />
   *
   * Corner is clipped.
   * @type {number}
   * @constant
   */
  BEVELED: 2
};
var CornerType_default = Object.freeze(CornerType);

// packages/engine/Source/Core/oneTimeWarning.js
var warnings = {};
function oneTimeWarning(identifier, message) {
  if (!defined_default(identifier)) {
    throw new DeveloperError_default("identifier is required.");
  }
  if (!defined_default(warnings[identifier])) {
    warnings[identifier] = true;
    console.warn(defaultValue_default(message, identifier));
  }
}
oneTimeWarning.geometryOutlines = "Entity geometry outlines are unsupported on terrain. Outlines will be disabled. To enable outlines, disable geometry terrain clamping by explicitly setting height to 0.";
oneTimeWarning.geometryZIndex = "Entity geometry with zIndex are unsupported when height or extrudedHeight are defined.  zIndex will be ignored";
oneTimeWarning.geometryHeightReference = "Entity corridor, ellipse, polygon or rectangle with heightReference must also have a defined height.  heightReference will be ignored";
oneTimeWarning.geometryExtrudedHeightReference = "Entity corridor, ellipse, polygon or rectangle with extrudedHeightReference must also have a defined extrudedHeight.  extrudedHeightReference will be ignored";
var oneTimeWarning_default = oneTimeWarning;

// packages/engine/Source/Core/PolylineVolumeGeometryLibrary.js
var scratch2Array = [new Cartesian3_default(), new Cartesian3_default()];
var scratchCartesian1 = new Cartesian3_default();
var scratchCartesian2 = new Cartesian3_default();
var scratchCartesian3 = new Cartesian3_default();
var scratchCartesian4 = new Cartesian3_default();
var scratchCartesian5 = new Cartesian3_default();
var scratchCartesian6 = new Cartesian3_default();
var scratchCartesian7 = new Cartesian3_default();
var scratchCartesian8 = new Cartesian3_default();
var scratchCartesian9 = new Cartesian3_default();
var scratch1 = new Cartesian3_default();
var scratch2 = new Cartesian3_default();
var PolylineVolumeGeometryLibrary = {};
var cartographic = new Cartographic_default();
function scaleToSurface(positions, ellipsoid) {
  const heights = new Array(positions.length);
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    cartographic = ellipsoid.cartesianToCartographic(pos, cartographic);
    heights[i] = cartographic.height;
    positions[i] = ellipsoid.scaleToGeodeticSurface(pos, pos);
  }
  return heights;
}
function subdivideHeights(points, h0, h1, granularity) {
  const p0 = points[0];
  const p1 = points[1];
  const angleBetween = Cartesian3_default.angleBetween(p0, p1);
  const numPoints = Math.ceil(angleBetween / granularity);
  const heights = new Array(numPoints);
  let i;
  if (h0 === h1) {
    for (i = 0; i < numPoints; i++) {
      heights[i] = h0;
    }
    heights.push(h1);
    return heights;
  }
  const dHeight = h1 - h0;
  const heightPerVertex = dHeight / numPoints;
  for (i = 1; i < numPoints; i++) {
    const h = h0 + i * heightPerVertex;
    heights[i] = h;
  }
  heights[0] = h0;
  heights.push(h1);
  return heights;
}
var nextScratch = new Cartesian3_default();
var prevScratch = new Cartesian3_default();
function computeRotationAngle(start, end, position, ellipsoid) {
  const tangentPlane = new EllipsoidTangentPlane_default(position, ellipsoid);
  const next = tangentPlane.projectPointOntoPlane(
    Cartesian3_default.add(position, start, nextScratch),
    nextScratch
  );
  const prev = tangentPlane.projectPointOntoPlane(
    Cartesian3_default.add(position, end, prevScratch),
    prevScratch
  );
  const angle = Cartesian2_default.angleBetween(next, prev);
  return prev.x * next.y - prev.y * next.x >= 0 ? -angle : angle;
}
var negativeX = new Cartesian3_default(-1, 0, 0);
var transform = new Matrix4_default();
var translation = new Matrix4_default();
var rotationZ = new Matrix3_default();
var scaleMatrix = Matrix3_default.IDENTITY.clone();
var westScratch = new Cartesian3_default();
var finalPosScratch = new Cartesian4_default();
var heightCartesian = new Cartesian3_default();
function addPosition(center, left, shape, finalPositions, ellipsoid, height, xScalar, repeat) {
  let west = westScratch;
  let finalPosition = finalPosScratch;
  transform = Transforms_default.eastNorthUpToFixedFrame(center, ellipsoid, transform);
  west = Matrix4_default.multiplyByPointAsVector(transform, negativeX, west);
  west = Cartesian3_default.normalize(west, west);
  const angle = computeRotationAngle(west, left, center, ellipsoid);
  rotationZ = Matrix3_default.fromRotationZ(angle, rotationZ);
  heightCartesian.z = height;
  transform = Matrix4_default.multiplyTransformation(
    transform,
    Matrix4_default.fromRotationTranslation(rotationZ, heightCartesian, translation),
    transform
  );
  const scale = scaleMatrix;
  scale[0] = xScalar;
  for (let j = 0; j < repeat; j++) {
    for (let i = 0; i < shape.length; i += 3) {
      finalPosition = Cartesian3_default.fromArray(shape, i, finalPosition);
      finalPosition = Matrix3_default.multiplyByVector(
        scale,
        finalPosition,
        finalPosition
      );
      finalPosition = Matrix4_default.multiplyByPoint(
        transform,
        finalPosition,
        finalPosition
      );
      finalPositions.push(finalPosition.x, finalPosition.y, finalPosition.z);
    }
  }
  return finalPositions;
}
var centerScratch = new Cartesian3_default();
function addPositions(centers, left, shape, finalPositions, ellipsoid, heights, xScalar) {
  for (let i = 0; i < centers.length; i += 3) {
    const center = Cartesian3_default.fromArray(centers, i, centerScratch);
    finalPositions = addPosition(
      center,
      left,
      shape,
      finalPositions,
      ellipsoid,
      heights[i / 3],
      xScalar,
      1
    );
  }
  return finalPositions;
}
function convertShapeTo3DDuplicate(shape2D, boundingRectangle) {
  const length = shape2D.length;
  const shape = new Array(length * 6);
  let index = 0;
  const xOffset = boundingRectangle.x + boundingRectangle.width / 2;
  const yOffset = boundingRectangle.y + boundingRectangle.height / 2;
  let point = shape2D[0];
  shape[index++] = point.x - xOffset;
  shape[index++] = 0;
  shape[index++] = point.y - yOffset;
  for (let i = 1; i < length; i++) {
    point = shape2D[i];
    const x = point.x - xOffset;
    const z = point.y - yOffset;
    shape[index++] = x;
    shape[index++] = 0;
    shape[index++] = z;
    shape[index++] = x;
    shape[index++] = 0;
    shape[index++] = z;
  }
  point = shape2D[0];
  shape[index++] = point.x - xOffset;
  shape[index++] = 0;
  shape[index++] = point.y - yOffset;
  return shape;
}
function convertShapeTo3D(shape2D, boundingRectangle) {
  const length = shape2D.length;
  const shape = new Array(length * 3);
  let index = 0;
  const xOffset = boundingRectangle.x + boundingRectangle.width / 2;
  const yOffset = boundingRectangle.y + boundingRectangle.height / 2;
  for (let i = 0; i < length; i++) {
    shape[index++] = shape2D[i].x - xOffset;
    shape[index++] = 0;
    shape[index++] = shape2D[i].y - yOffset;
  }
  return shape;
}
var quaterion = new Quaternion_default();
var startPointScratch = new Cartesian3_default();
var rotMatrix = new Matrix3_default();
function computeRoundCorner(pivot, startPoint, endPoint, cornerType, leftIsOutside, ellipsoid, finalPositions, shape, height, duplicatePoints) {
  const angle = Cartesian3_default.angleBetween(
    Cartesian3_default.subtract(startPoint, pivot, scratch1),
    Cartesian3_default.subtract(endPoint, pivot, scratch2)
  );
  const granularity = cornerType === CornerType_default.BEVELED ? 0 : Math.ceil(angle / Math_default.toRadians(5));
  let m;
  if (leftIsOutside) {
    m = Matrix3_default.fromQuaternion(
      Quaternion_default.fromAxisAngle(
        Cartesian3_default.negate(pivot, scratch1),
        angle / (granularity + 1),
        quaterion
      ),
      rotMatrix
    );
  } else {
    m = Matrix3_default.fromQuaternion(
      Quaternion_default.fromAxisAngle(pivot, angle / (granularity + 1), quaterion),
      rotMatrix
    );
  }
  let left;
  let surfacePoint;
  startPoint = Cartesian3_default.clone(startPoint, startPointScratch);
  if (granularity > 0) {
    const repeat = duplicatePoints ? 2 : 1;
    for (let i = 0; i < granularity; i++) {
      startPoint = Matrix3_default.multiplyByVector(m, startPoint, startPoint);
      left = Cartesian3_default.subtract(startPoint, pivot, scratch1);
      left = Cartesian3_default.normalize(left, left);
      if (!leftIsOutside) {
        left = Cartesian3_default.negate(left, left);
      }
      surfacePoint = ellipsoid.scaleToGeodeticSurface(startPoint, scratch2);
      finalPositions = addPosition(
        surfacePoint,
        left,
        shape,
        finalPositions,
        ellipsoid,
        height,
        1,
        repeat
      );
    }
  } else {
    left = Cartesian3_default.subtract(startPoint, pivot, scratch1);
    left = Cartesian3_default.normalize(left, left);
    if (!leftIsOutside) {
      left = Cartesian3_default.negate(left, left);
    }
    surfacePoint = ellipsoid.scaleToGeodeticSurface(startPoint, scratch2);
    finalPositions = addPosition(
      surfacePoint,
      left,
      shape,
      finalPositions,
      ellipsoid,
      height,
      1,
      1
    );
    endPoint = Cartesian3_default.clone(endPoint, startPointScratch);
    left = Cartesian3_default.subtract(endPoint, pivot, scratch1);
    left = Cartesian3_default.normalize(left, left);
    if (!leftIsOutside) {
      left = Cartesian3_default.negate(left, left);
    }
    surfacePoint = ellipsoid.scaleToGeodeticSurface(endPoint, scratch2);
    finalPositions = addPosition(
      surfacePoint,
      left,
      shape,
      finalPositions,
      ellipsoid,
      height,
      1,
      1
    );
  }
  return finalPositions;
}
PolylineVolumeGeometryLibrary.removeDuplicatesFromShape = function(shapePositions) {
  const length = shapePositions.length;
  const cleanedPositions = [];
  for (let i0 = length - 1, i1 = 0; i1 < length; i0 = i1++) {
    const v0 = shapePositions[i0];
    const v1 = shapePositions[i1];
    if (!Cartesian2_default.equals(v0, v1)) {
      cleanedPositions.push(v1);
    }
  }
  return cleanedPositions;
};
PolylineVolumeGeometryLibrary.angleIsGreaterThanPi = function(forward, backward, position, ellipsoid) {
  const tangentPlane = new EllipsoidTangentPlane_default(position, ellipsoid);
  const next = tangentPlane.projectPointOntoPlane(
    Cartesian3_default.add(position, forward, nextScratch),
    nextScratch
  );
  const prev = tangentPlane.projectPointOntoPlane(
    Cartesian3_default.add(position, backward, prevScratch),
    prevScratch
  );
  return prev.x * next.y - prev.y * next.x >= 0;
};
var scratchForwardProjection = new Cartesian3_default();
var scratchBackwardProjection = new Cartesian3_default();
PolylineVolumeGeometryLibrary.computePositions = function(positions, shape2D, boundingRectangle, geometry, duplicatePoints) {
  const ellipsoid = geometry._ellipsoid;
  const heights = scaleToSurface(positions, ellipsoid);
  const granularity = geometry._granularity;
  const cornerType = geometry._cornerType;
  const shapeForSides = duplicatePoints ? convertShapeTo3DDuplicate(shape2D, boundingRectangle) : convertShapeTo3D(shape2D, boundingRectangle);
  const shapeForEnds = duplicatePoints ? convertShapeTo3D(shape2D, boundingRectangle) : void 0;
  const heightOffset = boundingRectangle.height / 2;
  const width = boundingRectangle.width / 2;
  let length = positions.length;
  let finalPositions = [];
  let ends = duplicatePoints ? [] : void 0;
  let forward = scratchCartesian1;
  let backward = scratchCartesian2;
  let cornerDirection = scratchCartesian3;
  let surfaceNormal = scratchCartesian4;
  let pivot = scratchCartesian5;
  let start = scratchCartesian6;
  let end = scratchCartesian7;
  let left = scratchCartesian8;
  let previousPosition = scratchCartesian9;
  let position = positions[0];
  let nextPosition = positions[1];
  surfaceNormal = ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);
  forward = Cartesian3_default.subtract(nextPosition, position, forward);
  forward = Cartesian3_default.normalize(forward, forward);
  left = Cartesian3_default.cross(surfaceNormal, forward, left);
  left = Cartesian3_default.normalize(left, left);
  let h0 = heights[0];
  let h1 = heights[1];
  if (duplicatePoints) {
    ends = addPosition(
      position,
      left,
      shapeForEnds,
      ends,
      ellipsoid,
      h0 + heightOffset,
      1,
      1
    );
  }
  previousPosition = Cartesian3_default.clone(position, previousPosition);
  position = nextPosition;
  backward = Cartesian3_default.negate(forward, backward);
  let subdividedHeights;
  let subdividedPositions;
  for (let i = 1; i < length - 1; i++) {
    const repeat = duplicatePoints ? 2 : 1;
    nextPosition = positions[i + 1];
    if (position.equals(nextPosition)) {
      oneTimeWarning_default(
        "Positions are too close and are considered equivalent with rounding error."
      );
      continue;
    }
    forward = Cartesian3_default.subtract(nextPosition, position, forward);
    forward = Cartesian3_default.normalize(forward, forward);
    cornerDirection = Cartesian3_default.add(forward, backward, cornerDirection);
    cornerDirection = Cartesian3_default.normalize(cornerDirection, cornerDirection);
    surfaceNormal = ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);
    const forwardProjection = Cartesian3_default.multiplyByScalar(
      surfaceNormal,
      Cartesian3_default.dot(forward, surfaceNormal),
      scratchForwardProjection
    );
    Cartesian3_default.subtract(forward, forwardProjection, forwardProjection);
    Cartesian3_default.normalize(forwardProjection, forwardProjection);
    const backwardProjection = Cartesian3_default.multiplyByScalar(
      surfaceNormal,
      Cartesian3_default.dot(backward, surfaceNormal),
      scratchBackwardProjection
    );
    Cartesian3_default.subtract(backward, backwardProjection, backwardProjection);
    Cartesian3_default.normalize(backwardProjection, backwardProjection);
    const doCorner = !Math_default.equalsEpsilon(
      Math.abs(Cartesian3_default.dot(forwardProjection, backwardProjection)),
      1,
      Math_default.EPSILON7
    );
    if (doCorner) {
      cornerDirection = Cartesian3_default.cross(
        cornerDirection,
        surfaceNormal,
        cornerDirection
      );
      cornerDirection = Cartesian3_default.cross(
        surfaceNormal,
        cornerDirection,
        cornerDirection
      );
      cornerDirection = Cartesian3_default.normalize(cornerDirection, cornerDirection);
      const scalar = 1 / Math.max(
        0.25,
        Cartesian3_default.magnitude(
          Cartesian3_default.cross(cornerDirection, backward, scratch1)
        )
      );
      const leftIsOutside = PolylineVolumeGeometryLibrary.angleIsGreaterThanPi(
        forward,
        backward,
        position,
        ellipsoid
      );
      if (leftIsOutside) {
        pivot = Cartesian3_default.add(
          position,
          Cartesian3_default.multiplyByScalar(
            cornerDirection,
            scalar * width,
            cornerDirection
          ),
          pivot
        );
        start = Cartesian3_default.add(
          pivot,
          Cartesian3_default.multiplyByScalar(left, width, start),
          start
        );
        scratch2Array[0] = Cartesian3_default.clone(previousPosition, scratch2Array[0]);
        scratch2Array[1] = Cartesian3_default.clone(start, scratch2Array[1]);
        subdividedHeights = subdivideHeights(
          scratch2Array,
          h0 + heightOffset,
          h1 + heightOffset,
          granularity
        );
        subdividedPositions = PolylinePipeline_default.generateArc({
          positions: scratch2Array,
          granularity,
          ellipsoid
        });
        finalPositions = addPositions(
          subdividedPositions,
          left,
          shapeForSides,
          finalPositions,
          ellipsoid,
          subdividedHeights,
          1
        );
        left = Cartesian3_default.cross(surfaceNormal, forward, left);
        left = Cartesian3_default.normalize(left, left);
        end = Cartesian3_default.add(
          pivot,
          Cartesian3_default.multiplyByScalar(left, width, end),
          end
        );
        if (cornerType === CornerType_default.ROUNDED || cornerType === CornerType_default.BEVELED) {
          computeRoundCorner(
            pivot,
            start,
            end,
            cornerType,
            leftIsOutside,
            ellipsoid,
            finalPositions,
            shapeForSides,
            h1 + heightOffset,
            duplicatePoints
          );
        } else {
          cornerDirection = Cartesian3_default.negate(cornerDirection, cornerDirection);
          finalPositions = addPosition(
            position,
            cornerDirection,
            shapeForSides,
            finalPositions,
            ellipsoid,
            h1 + heightOffset,
            scalar,
            repeat
          );
        }
        previousPosition = Cartesian3_default.clone(end, previousPosition);
      } else {
        pivot = Cartesian3_default.add(
          position,
          Cartesian3_default.multiplyByScalar(
            cornerDirection,
            scalar * width,
            cornerDirection
          ),
          pivot
        );
        start = Cartesian3_default.add(
          pivot,
          Cartesian3_default.multiplyByScalar(left, -width, start),
          start
        );
        scratch2Array[0] = Cartesian3_default.clone(previousPosition, scratch2Array[0]);
        scratch2Array[1] = Cartesian3_default.clone(start, scratch2Array[1]);
        subdividedHeights = subdivideHeights(
          scratch2Array,
          h0 + heightOffset,
          h1 + heightOffset,
          granularity
        );
        subdividedPositions = PolylinePipeline_default.generateArc({
          positions: scratch2Array,
          granularity,
          ellipsoid
        });
        finalPositions = addPositions(
          subdividedPositions,
          left,
          shapeForSides,
          finalPositions,
          ellipsoid,
          subdividedHeights,
          1
        );
        left = Cartesian3_default.cross(surfaceNormal, forward, left);
        left = Cartesian3_default.normalize(left, left);
        end = Cartesian3_default.add(
          pivot,
          Cartesian3_default.multiplyByScalar(left, -width, end),
          end
        );
        if (cornerType === CornerType_default.ROUNDED || cornerType === CornerType_default.BEVELED) {
          computeRoundCorner(
            pivot,
            start,
            end,
            cornerType,
            leftIsOutside,
            ellipsoid,
            finalPositions,
            shapeForSides,
            h1 + heightOffset,
            duplicatePoints
          );
        } else {
          finalPositions = addPosition(
            position,
            cornerDirection,
            shapeForSides,
            finalPositions,
            ellipsoid,
            h1 + heightOffset,
            scalar,
            repeat
          );
        }
        previousPosition = Cartesian3_default.clone(end, previousPosition);
      }
      backward = Cartesian3_default.negate(forward, backward);
    } else {
      finalPositions = addPosition(
        previousPosition,
        left,
        shapeForSides,
        finalPositions,
        ellipsoid,
        h0 + heightOffset,
        1,
        1
      );
      previousPosition = position;
    }
    h0 = h1;
    h1 = heights[i + 1];
    position = nextPosition;
  }
  scratch2Array[0] = Cartesian3_default.clone(previousPosition, scratch2Array[0]);
  scratch2Array[1] = Cartesian3_default.clone(position, scratch2Array[1]);
  subdividedHeights = subdivideHeights(
    scratch2Array,
    h0 + heightOffset,
    h1 + heightOffset,
    granularity
  );
  subdividedPositions = PolylinePipeline_default.generateArc({
    positions: scratch2Array,
    granularity,
    ellipsoid
  });
  finalPositions = addPositions(
    subdividedPositions,
    left,
    shapeForSides,
    finalPositions,
    ellipsoid,
    subdividedHeights,
    1
  );
  if (duplicatePoints) {
    ends = addPosition(
      position,
      left,
      shapeForEnds,
      ends,
      ellipsoid,
      h1 + heightOffset,
      1,
      1
    );
  }
  length = finalPositions.length;
  const posLength = duplicatePoints ? length + ends.length : length;
  const combinedPositions = new Float64Array(posLength);
  combinedPositions.set(finalPositions);
  if (duplicatePoints) {
    combinedPositions.set(ends, length);
  }
  return combinedPositions;
};
var PolylineVolumeGeometryLibrary_default = PolylineVolumeGeometryLibrary;

export {
  CornerType_default,
  oneTimeWarning_default,
  PolylineVolumeGeometryLibrary_default
};
