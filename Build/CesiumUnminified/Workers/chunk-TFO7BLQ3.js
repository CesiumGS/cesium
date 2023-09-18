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
  CornerType_default,
  PolylineVolumeGeometryLibrary_default
} from "./chunk-OJGFPQQY.js";
import {
  PolylinePipeline_default
} from "./chunk-H6UV4PJF.js";
import {
  Quaternion_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian3_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/CorridorGeometryLibrary.js
var CorridorGeometryLibrary = {};
var scratch1 = new Cartesian3_default();
var scratch2 = new Cartesian3_default();
var scratch3 = new Cartesian3_default();
var scratch4 = new Cartesian3_default();
var scaleArray2 = [new Cartesian3_default(), new Cartesian3_default()];
var cartesian1 = new Cartesian3_default();
var cartesian2 = new Cartesian3_default();
var cartesian3 = new Cartesian3_default();
var cartesian4 = new Cartesian3_default();
var cartesian5 = new Cartesian3_default();
var cartesian6 = new Cartesian3_default();
var cartesian7 = new Cartesian3_default();
var cartesian8 = new Cartesian3_default();
var cartesian9 = new Cartesian3_default();
var cartesian10 = new Cartesian3_default();
var quaterion = new Quaternion_default();
var rotMatrix = new Matrix3_default();
function computeRoundCorner(cornerPoint, startPoint, endPoint, cornerType, leftIsOutside) {
  const angle = Cartesian3_default.angleBetween(
    Cartesian3_default.subtract(startPoint, cornerPoint, scratch1),
    Cartesian3_default.subtract(endPoint, cornerPoint, scratch2)
  );
  const granularity = cornerType === CornerType_default.BEVELED ? 1 : Math.ceil(angle / Math_default.toRadians(5)) + 1;
  const size = granularity * 3;
  const array = new Array(size);
  array[size - 3] = endPoint.x;
  array[size - 2] = endPoint.y;
  array[size - 1] = endPoint.z;
  let m;
  if (leftIsOutside) {
    m = Matrix3_default.fromQuaternion(
      Quaternion_default.fromAxisAngle(
        Cartesian3_default.negate(cornerPoint, scratch1),
        angle / granularity,
        quaterion
      ),
      rotMatrix
    );
  } else {
    m = Matrix3_default.fromQuaternion(
      Quaternion_default.fromAxisAngle(cornerPoint, angle / granularity, quaterion),
      rotMatrix
    );
  }
  let index = 0;
  startPoint = Cartesian3_default.clone(startPoint, scratch1);
  for (let i = 0; i < granularity; i++) {
    startPoint = Matrix3_default.multiplyByVector(m, startPoint, startPoint);
    array[index++] = startPoint.x;
    array[index++] = startPoint.y;
    array[index++] = startPoint.z;
  }
  return array;
}
function addEndCaps(calculatedPositions) {
  let cornerPoint = cartesian1;
  let startPoint = cartesian2;
  let endPoint = cartesian3;
  let leftEdge = calculatedPositions[1];
  startPoint = Cartesian3_default.fromArray(
    calculatedPositions[1],
    leftEdge.length - 3,
    startPoint
  );
  endPoint = Cartesian3_default.fromArray(calculatedPositions[0], 0, endPoint);
  cornerPoint = Cartesian3_default.midpoint(startPoint, endPoint, cornerPoint);
  const firstEndCap = computeRoundCorner(
    cornerPoint,
    startPoint,
    endPoint,
    CornerType_default.ROUNDED,
    false
  );
  const length = calculatedPositions.length - 1;
  const rightEdge = calculatedPositions[length - 1];
  leftEdge = calculatedPositions[length];
  startPoint = Cartesian3_default.fromArray(
    rightEdge,
    rightEdge.length - 3,
    startPoint
  );
  endPoint = Cartesian3_default.fromArray(leftEdge, 0, endPoint);
  cornerPoint = Cartesian3_default.midpoint(startPoint, endPoint, cornerPoint);
  const lastEndCap = computeRoundCorner(
    cornerPoint,
    startPoint,
    endPoint,
    CornerType_default.ROUNDED,
    false
  );
  return [firstEndCap, lastEndCap];
}
function computeMiteredCorner(position, leftCornerDirection, lastPoint, leftIsOutside) {
  let cornerPoint = scratch1;
  if (leftIsOutside) {
    cornerPoint = Cartesian3_default.add(position, leftCornerDirection, cornerPoint);
  } else {
    leftCornerDirection = Cartesian3_default.negate(
      leftCornerDirection,
      leftCornerDirection
    );
    cornerPoint = Cartesian3_default.add(position, leftCornerDirection, cornerPoint);
  }
  return [
    cornerPoint.x,
    cornerPoint.y,
    cornerPoint.z,
    lastPoint.x,
    lastPoint.y,
    lastPoint.z
  ];
}
function addShiftedPositions(positions, left, scalar, calculatedPositions) {
  const rightPositions = new Array(positions.length);
  const leftPositions = new Array(positions.length);
  const scaledLeft = Cartesian3_default.multiplyByScalar(left, scalar, scratch1);
  const scaledRight = Cartesian3_default.negate(scaledLeft, scratch2);
  let rightIndex = 0;
  let leftIndex = positions.length - 1;
  for (let i = 0; i < positions.length; i += 3) {
    const pos = Cartesian3_default.fromArray(positions, i, scratch3);
    const rightPos = Cartesian3_default.add(pos, scaledRight, scratch4);
    rightPositions[rightIndex++] = rightPos.x;
    rightPositions[rightIndex++] = rightPos.y;
    rightPositions[rightIndex++] = rightPos.z;
    const leftPos = Cartesian3_default.add(pos, scaledLeft, scratch4);
    leftPositions[leftIndex--] = leftPos.z;
    leftPositions[leftIndex--] = leftPos.y;
    leftPositions[leftIndex--] = leftPos.x;
  }
  calculatedPositions.push(rightPositions, leftPositions);
  return calculatedPositions;
}
CorridorGeometryLibrary.addAttribute = function(attribute, value, front, back) {
  const x = value.x;
  const y = value.y;
  const z = value.z;
  if (defined_default(front)) {
    attribute[front] = x;
    attribute[front + 1] = y;
    attribute[front + 2] = z;
  }
  if (defined_default(back)) {
    attribute[back] = z;
    attribute[back - 1] = y;
    attribute[back - 2] = x;
  }
};
var scratchForwardProjection = new Cartesian3_default();
var scratchBackwardProjection = new Cartesian3_default();
CorridorGeometryLibrary.computePositions = function(params) {
  const granularity = params.granularity;
  const positions = params.positions;
  const ellipsoid = params.ellipsoid;
  const width = params.width / 2;
  const cornerType = params.cornerType;
  const saveAttributes = params.saveAttributes;
  let normal = cartesian1;
  let forward = cartesian2;
  let backward = cartesian3;
  let left = cartesian4;
  let cornerDirection = cartesian5;
  let startPoint = cartesian6;
  let previousPos = cartesian7;
  let rightPos = cartesian8;
  let leftPos = cartesian9;
  let center = cartesian10;
  let calculatedPositions = [];
  const calculatedLefts = saveAttributes ? [] : void 0;
  const calculatedNormals = saveAttributes ? [] : void 0;
  let position = positions[0];
  let nextPosition = positions[1];
  forward = Cartesian3_default.normalize(
    Cartesian3_default.subtract(nextPosition, position, forward),
    forward
  );
  normal = ellipsoid.geodeticSurfaceNormal(position, normal);
  left = Cartesian3_default.normalize(Cartesian3_default.cross(normal, forward, left), left);
  if (saveAttributes) {
    calculatedLefts.push(left.x, left.y, left.z);
    calculatedNormals.push(normal.x, normal.y, normal.z);
  }
  previousPos = Cartesian3_default.clone(position, previousPos);
  position = nextPosition;
  backward = Cartesian3_default.negate(forward, backward);
  let subdividedPositions;
  const corners = [];
  let i;
  const length = positions.length;
  for (i = 1; i < length - 1; i++) {
    normal = ellipsoid.geodeticSurfaceNormal(position, normal);
    nextPosition = positions[i + 1];
    forward = Cartesian3_default.normalize(
      Cartesian3_default.subtract(nextPosition, position, forward),
      forward
    );
    cornerDirection = Cartesian3_default.normalize(
      Cartesian3_default.add(forward, backward, cornerDirection),
      cornerDirection
    );
    const forwardProjection = Cartesian3_default.multiplyByScalar(
      normal,
      Cartesian3_default.dot(forward, normal),
      scratchForwardProjection
    );
    Cartesian3_default.subtract(forward, forwardProjection, forwardProjection);
    Cartesian3_default.normalize(forwardProjection, forwardProjection);
    const backwardProjection = Cartesian3_default.multiplyByScalar(
      normal,
      Cartesian3_default.dot(backward, normal),
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
        normal,
        cornerDirection
      );
      cornerDirection = Cartesian3_default.cross(
        normal,
        cornerDirection,
        cornerDirection
      );
      cornerDirection = Cartesian3_default.normalize(cornerDirection, cornerDirection);
      const scalar = width / Math.max(
        0.25,
        Cartesian3_default.magnitude(
          Cartesian3_default.cross(cornerDirection, backward, scratch1)
        )
      );
      const leftIsOutside = PolylineVolumeGeometryLibrary_default.angleIsGreaterThanPi(
        forward,
        backward,
        position,
        ellipsoid
      );
      cornerDirection = Cartesian3_default.multiplyByScalar(
        cornerDirection,
        scalar,
        cornerDirection
      );
      if (leftIsOutside) {
        rightPos = Cartesian3_default.add(position, cornerDirection, rightPos);
        center = Cartesian3_default.add(
          rightPos,
          Cartesian3_default.multiplyByScalar(left, width, center),
          center
        );
        leftPos = Cartesian3_default.add(
          rightPos,
          Cartesian3_default.multiplyByScalar(left, width * 2, leftPos),
          leftPos
        );
        scaleArray2[0] = Cartesian3_default.clone(previousPos, scaleArray2[0]);
        scaleArray2[1] = Cartesian3_default.clone(center, scaleArray2[1]);
        subdividedPositions = PolylinePipeline_default.generateArc({
          positions: scaleArray2,
          granularity,
          ellipsoid
        });
        calculatedPositions = addShiftedPositions(
          subdividedPositions,
          left,
          width,
          calculatedPositions
        );
        if (saveAttributes) {
          calculatedLefts.push(left.x, left.y, left.z);
          calculatedNormals.push(normal.x, normal.y, normal.z);
        }
        startPoint = Cartesian3_default.clone(leftPos, startPoint);
        left = Cartesian3_default.normalize(
          Cartesian3_default.cross(normal, forward, left),
          left
        );
        leftPos = Cartesian3_default.add(
          rightPos,
          Cartesian3_default.multiplyByScalar(left, width * 2, leftPos),
          leftPos
        );
        previousPos = Cartesian3_default.add(
          rightPos,
          Cartesian3_default.multiplyByScalar(left, width, previousPos),
          previousPos
        );
        if (cornerType === CornerType_default.ROUNDED || cornerType === CornerType_default.BEVELED) {
          corners.push({
            leftPositions: computeRoundCorner(
              rightPos,
              startPoint,
              leftPos,
              cornerType,
              leftIsOutside
            )
          });
        } else {
          corners.push({
            leftPositions: computeMiteredCorner(
              position,
              Cartesian3_default.negate(cornerDirection, cornerDirection),
              leftPos,
              leftIsOutside
            )
          });
        }
      } else {
        leftPos = Cartesian3_default.add(position, cornerDirection, leftPos);
        center = Cartesian3_default.add(
          leftPos,
          Cartesian3_default.negate(
            Cartesian3_default.multiplyByScalar(left, width, center),
            center
          ),
          center
        );
        rightPos = Cartesian3_default.add(
          leftPos,
          Cartesian3_default.negate(
            Cartesian3_default.multiplyByScalar(left, width * 2, rightPos),
            rightPos
          ),
          rightPos
        );
        scaleArray2[0] = Cartesian3_default.clone(previousPos, scaleArray2[0]);
        scaleArray2[1] = Cartesian3_default.clone(center, scaleArray2[1]);
        subdividedPositions = PolylinePipeline_default.generateArc({
          positions: scaleArray2,
          granularity,
          ellipsoid
        });
        calculatedPositions = addShiftedPositions(
          subdividedPositions,
          left,
          width,
          calculatedPositions
        );
        if (saveAttributes) {
          calculatedLefts.push(left.x, left.y, left.z);
          calculatedNormals.push(normal.x, normal.y, normal.z);
        }
        startPoint = Cartesian3_default.clone(rightPos, startPoint);
        left = Cartesian3_default.normalize(
          Cartesian3_default.cross(normal, forward, left),
          left
        );
        rightPos = Cartesian3_default.add(
          leftPos,
          Cartesian3_default.negate(
            Cartesian3_default.multiplyByScalar(left, width * 2, rightPos),
            rightPos
          ),
          rightPos
        );
        previousPos = Cartesian3_default.add(
          leftPos,
          Cartesian3_default.negate(
            Cartesian3_default.multiplyByScalar(left, width, previousPos),
            previousPos
          ),
          previousPos
        );
        if (cornerType === CornerType_default.ROUNDED || cornerType === CornerType_default.BEVELED) {
          corners.push({
            rightPositions: computeRoundCorner(
              leftPos,
              startPoint,
              rightPos,
              cornerType,
              leftIsOutside
            )
          });
        } else {
          corners.push({
            rightPositions: computeMiteredCorner(
              position,
              cornerDirection,
              rightPos,
              leftIsOutside
            )
          });
        }
      }
      backward = Cartesian3_default.negate(forward, backward);
    }
    position = nextPosition;
  }
  normal = ellipsoid.geodeticSurfaceNormal(position, normal);
  scaleArray2[0] = Cartesian3_default.clone(previousPos, scaleArray2[0]);
  scaleArray2[1] = Cartesian3_default.clone(position, scaleArray2[1]);
  subdividedPositions = PolylinePipeline_default.generateArc({
    positions: scaleArray2,
    granularity,
    ellipsoid
  });
  calculatedPositions = addShiftedPositions(
    subdividedPositions,
    left,
    width,
    calculatedPositions
  );
  if (saveAttributes) {
    calculatedLefts.push(left.x, left.y, left.z);
    calculatedNormals.push(normal.x, normal.y, normal.z);
  }
  let endPositions;
  if (cornerType === CornerType_default.ROUNDED) {
    endPositions = addEndCaps(calculatedPositions);
  }
  return {
    positions: calculatedPositions,
    corners,
    lefts: calculatedLefts,
    normals: calculatedNormals,
    endPositions
  };
};
var CorridorGeometryLibrary_default = CorridorGeometryLibrary;

export {
  CorridorGeometryLibrary_default
};
