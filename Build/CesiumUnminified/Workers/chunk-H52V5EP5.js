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
  Quaternion_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian3_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";

// packages/engine/Source/Core/EllipseGeometryLibrary.js
var EllipseGeometryLibrary = {};
var rotAxis = new Cartesian3_default();
var tempVec = new Cartesian3_default();
var unitQuat = new Quaternion_default();
var rotMtx = new Matrix3_default();
function pointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, result) {
  const azimuth = theta + rotation;
  Cartesian3_default.multiplyByScalar(eastVec, Math.cos(azimuth), rotAxis);
  Cartesian3_default.multiplyByScalar(northVec, Math.sin(azimuth), tempVec);
  Cartesian3_default.add(rotAxis, tempVec, rotAxis);
  let cosThetaSquared = Math.cos(theta);
  cosThetaSquared = cosThetaSquared * cosThetaSquared;
  let sinThetaSquared = Math.sin(theta);
  sinThetaSquared = sinThetaSquared * sinThetaSquared;
  const radius = ab / Math.sqrt(bSqr * cosThetaSquared + aSqr * sinThetaSquared);
  const angle = radius / mag;
  Quaternion_default.fromAxisAngle(rotAxis, angle, unitQuat);
  Matrix3_default.fromQuaternion(unitQuat, rotMtx);
  Matrix3_default.multiplyByVector(rotMtx, unitPos, result);
  Cartesian3_default.normalize(result, result);
  Cartesian3_default.multiplyByScalar(result, mag, result);
  return result;
}
var scratchCartesian1 = new Cartesian3_default();
var scratchCartesian2 = new Cartesian3_default();
var scratchCartesian3 = new Cartesian3_default();
var scratchNormal = new Cartesian3_default();
EllipseGeometryLibrary.raisePositionsToHeight = function(positions, options, extrude) {
  const ellipsoid = options.ellipsoid;
  const height = options.height;
  const extrudedHeight = options.extrudedHeight;
  const size = extrude ? positions.length / 3 * 2 : positions.length / 3;
  const finalPositions = new Float64Array(size * 3);
  const length = positions.length;
  const bottomOffset = extrude ? length : 0;
  for (let i = 0; i < length; i += 3) {
    const i1 = i + 1;
    const i2 = i + 2;
    const position = Cartesian3_default.fromArray(positions, i, scratchCartesian1);
    ellipsoid.scaleToGeodeticSurface(position, position);
    const extrudedPosition = Cartesian3_default.clone(position, scratchCartesian2);
    const normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
    const scaledNormal = Cartesian3_default.multiplyByScalar(
      normal,
      height,
      scratchCartesian3
    );
    Cartesian3_default.add(position, scaledNormal, position);
    if (extrude) {
      Cartesian3_default.multiplyByScalar(normal, extrudedHeight, scaledNormal);
      Cartesian3_default.add(extrudedPosition, scaledNormal, extrudedPosition);
      finalPositions[i + bottomOffset] = extrudedPosition.x;
      finalPositions[i1 + bottomOffset] = extrudedPosition.y;
      finalPositions[i2 + bottomOffset] = extrudedPosition.z;
    }
    finalPositions[i] = position.x;
    finalPositions[i1] = position.y;
    finalPositions[i2] = position.z;
  }
  return finalPositions;
};
var unitPosScratch = new Cartesian3_default();
var eastVecScratch = new Cartesian3_default();
var northVecScratch = new Cartesian3_default();
EllipseGeometryLibrary.computeEllipsePositions = function(options, addFillPositions, addEdgePositions) {
  const semiMinorAxis = options.semiMinorAxis;
  const semiMajorAxis = options.semiMajorAxis;
  const rotation = options.rotation;
  const center = options.center;
  const granularity = options.granularity * 8;
  const aSqr = semiMinorAxis * semiMinorAxis;
  const bSqr = semiMajorAxis * semiMajorAxis;
  const ab = semiMajorAxis * semiMinorAxis;
  const mag = Cartesian3_default.magnitude(center);
  const unitPos = Cartesian3_default.normalize(center, unitPosScratch);
  let eastVec = Cartesian3_default.cross(Cartesian3_default.UNIT_Z, center, eastVecScratch);
  eastVec = Cartesian3_default.normalize(eastVec, eastVec);
  const northVec = Cartesian3_default.cross(unitPos, eastVec, northVecScratch);
  let numPts = 1 + Math.ceil(Math_default.PI_OVER_TWO / granularity);
  const deltaTheta = Math_default.PI_OVER_TWO / (numPts - 1);
  let theta = Math_default.PI_OVER_TWO - numPts * deltaTheta;
  if (theta < 0) {
    numPts -= Math.ceil(Math.abs(theta) / deltaTheta);
  }
  const size = 2 * (numPts * (numPts + 2));
  const positions = addFillPositions ? new Array(size * 3) : void 0;
  let positionIndex = 0;
  let position = scratchCartesian1;
  let reflectedPosition = scratchCartesian2;
  const outerPositionsLength = numPts * 4 * 3;
  let outerRightIndex = outerPositionsLength - 1;
  let outerLeftIndex = 0;
  const outerPositions = addEdgePositions ? new Array(outerPositionsLength) : void 0;
  let i;
  let j;
  let numInterior;
  let t;
  let interiorPosition;
  theta = Math_default.PI_OVER_TWO;
  position = pointOnEllipsoid(
    theta,
    rotation,
    northVec,
    eastVec,
    aSqr,
    ab,
    bSqr,
    mag,
    unitPos,
    position
  );
  if (addFillPositions) {
    positions[positionIndex++] = position.x;
    positions[positionIndex++] = position.y;
    positions[positionIndex++] = position.z;
  }
  if (addEdgePositions) {
    outerPositions[outerRightIndex--] = position.z;
    outerPositions[outerRightIndex--] = position.y;
    outerPositions[outerRightIndex--] = position.x;
  }
  theta = Math_default.PI_OVER_TWO - deltaTheta;
  for (i = 1; i < numPts + 1; ++i) {
    position = pointOnEllipsoid(
      theta,
      rotation,
      northVec,
      eastVec,
      aSqr,
      ab,
      bSqr,
      mag,
      unitPos,
      position
    );
    reflectedPosition = pointOnEllipsoid(
      Math.PI - theta,
      rotation,
      northVec,
      eastVec,
      aSqr,
      ab,
      bSqr,
      mag,
      unitPos,
      reflectedPosition
    );
    if (addFillPositions) {
      positions[positionIndex++] = position.x;
      positions[positionIndex++] = position.y;
      positions[positionIndex++] = position.z;
      numInterior = 2 * i + 2;
      for (j = 1; j < numInterior - 1; ++j) {
        t = j / (numInterior - 1);
        interiorPosition = Cartesian3_default.lerp(
          position,
          reflectedPosition,
          t,
          scratchCartesian3
        );
        positions[positionIndex++] = interiorPosition.x;
        positions[positionIndex++] = interiorPosition.y;
        positions[positionIndex++] = interiorPosition.z;
      }
      positions[positionIndex++] = reflectedPosition.x;
      positions[positionIndex++] = reflectedPosition.y;
      positions[positionIndex++] = reflectedPosition.z;
    }
    if (addEdgePositions) {
      outerPositions[outerRightIndex--] = position.z;
      outerPositions[outerRightIndex--] = position.y;
      outerPositions[outerRightIndex--] = position.x;
      outerPositions[outerLeftIndex++] = reflectedPosition.x;
      outerPositions[outerLeftIndex++] = reflectedPosition.y;
      outerPositions[outerLeftIndex++] = reflectedPosition.z;
    }
    theta = Math_default.PI_OVER_TWO - (i + 1) * deltaTheta;
  }
  for (i = numPts; i > 1; --i) {
    theta = Math_default.PI_OVER_TWO - (i - 1) * deltaTheta;
    position = pointOnEllipsoid(
      -theta,
      rotation,
      northVec,
      eastVec,
      aSqr,
      ab,
      bSqr,
      mag,
      unitPos,
      position
    );
    reflectedPosition = pointOnEllipsoid(
      theta + Math.PI,
      rotation,
      northVec,
      eastVec,
      aSqr,
      ab,
      bSqr,
      mag,
      unitPos,
      reflectedPosition
    );
    if (addFillPositions) {
      positions[positionIndex++] = position.x;
      positions[positionIndex++] = position.y;
      positions[positionIndex++] = position.z;
      numInterior = 2 * (i - 1) + 2;
      for (j = 1; j < numInterior - 1; ++j) {
        t = j / (numInterior - 1);
        interiorPosition = Cartesian3_default.lerp(
          position,
          reflectedPosition,
          t,
          scratchCartesian3
        );
        positions[positionIndex++] = interiorPosition.x;
        positions[positionIndex++] = interiorPosition.y;
        positions[positionIndex++] = interiorPosition.z;
      }
      positions[positionIndex++] = reflectedPosition.x;
      positions[positionIndex++] = reflectedPosition.y;
      positions[positionIndex++] = reflectedPosition.z;
    }
    if (addEdgePositions) {
      outerPositions[outerRightIndex--] = position.z;
      outerPositions[outerRightIndex--] = position.y;
      outerPositions[outerRightIndex--] = position.x;
      outerPositions[outerLeftIndex++] = reflectedPosition.x;
      outerPositions[outerLeftIndex++] = reflectedPosition.y;
      outerPositions[outerLeftIndex++] = reflectedPosition.z;
    }
  }
  theta = Math_default.PI_OVER_TWO;
  position = pointOnEllipsoid(
    -theta,
    rotation,
    northVec,
    eastVec,
    aSqr,
    ab,
    bSqr,
    mag,
    unitPos,
    position
  );
  const r = {};
  if (addFillPositions) {
    positions[positionIndex++] = position.x;
    positions[positionIndex++] = position.y;
    positions[positionIndex++] = position.z;
    r.positions = positions;
    r.numPts = numPts;
  }
  if (addEdgePositions) {
    outerPositions[outerRightIndex--] = position.z;
    outerPositions[outerRightIndex--] = position.y;
    outerPositions[outerRightIndex--] = position.x;
    r.outerPositions = outerPositions;
  }
  return r;
};
var EllipseGeometryLibrary_default = EllipseGeometryLibrary;

export {
  EllipseGeometryLibrary_default
};
