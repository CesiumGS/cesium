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
  EllipsoidTangentPlane_default
} from "./chunk-LATQ4URD.js";
import {
  Plane_default
} from "./chunk-PY3JQBWU.js";
import {
  BoundingSphere_default,
  Intersect_default,
  Interval_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default,
  Matrix4_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
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

// packages/engine/Source/Core/OrientedBoundingBox.js
function OrientedBoundingBox(center, halfAxes) {
  this.center = Cartesian3_default.clone(defaultValue_default(center, Cartesian3_default.ZERO));
  this.halfAxes = Matrix3_default.clone(defaultValue_default(halfAxes, Matrix3_default.ZERO));
}
OrientedBoundingBox.packedLength = Cartesian3_default.packedLength + Matrix3_default.packedLength;
OrientedBoundingBox.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  Cartesian3_default.pack(value.center, array, startingIndex);
  Matrix3_default.pack(value.halfAxes, array, startingIndex + Cartesian3_default.packedLength);
  return array;
};
OrientedBoundingBox.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new OrientedBoundingBox();
  }
  Cartesian3_default.unpack(array, startingIndex, result.center);
  Matrix3_default.unpack(
    array,
    startingIndex + Cartesian3_default.packedLength,
    result.halfAxes
  );
  return result;
};
var scratchCartesian1 = new Cartesian3_default();
var scratchCartesian2 = new Cartesian3_default();
var scratchCartesian3 = new Cartesian3_default();
var scratchCartesian4 = new Cartesian3_default();
var scratchCartesian5 = new Cartesian3_default();
var scratchCartesian6 = new Cartesian3_default();
var scratchCovarianceResult = new Matrix3_default();
var scratchEigenResult = {
  unitary: new Matrix3_default(),
  diagonal: new Matrix3_default()
};
OrientedBoundingBox.fromPoints = function(positions, result) {
  if (!defined_default(result)) {
    result = new OrientedBoundingBox();
  }
  if (!defined_default(positions) || positions.length === 0) {
    result.halfAxes = Matrix3_default.ZERO;
    result.center = Cartesian3_default.ZERO;
    return result;
  }
  let i;
  const length = positions.length;
  const meanPoint = Cartesian3_default.clone(positions[0], scratchCartesian1);
  for (i = 1; i < length; i++) {
    Cartesian3_default.add(meanPoint, positions[i], meanPoint);
  }
  const invLength = 1 / length;
  Cartesian3_default.multiplyByScalar(meanPoint, invLength, meanPoint);
  let exx = 0;
  let exy = 0;
  let exz = 0;
  let eyy = 0;
  let eyz = 0;
  let ezz = 0;
  let p;
  for (i = 0; i < length; i++) {
    p = Cartesian3_default.subtract(positions[i], meanPoint, scratchCartesian2);
    exx += p.x * p.x;
    exy += p.x * p.y;
    exz += p.x * p.z;
    eyy += p.y * p.y;
    eyz += p.y * p.z;
    ezz += p.z * p.z;
  }
  exx *= invLength;
  exy *= invLength;
  exz *= invLength;
  eyy *= invLength;
  eyz *= invLength;
  ezz *= invLength;
  const covarianceMatrix = scratchCovarianceResult;
  covarianceMatrix[0] = exx;
  covarianceMatrix[1] = exy;
  covarianceMatrix[2] = exz;
  covarianceMatrix[3] = exy;
  covarianceMatrix[4] = eyy;
  covarianceMatrix[5] = eyz;
  covarianceMatrix[6] = exz;
  covarianceMatrix[7] = eyz;
  covarianceMatrix[8] = ezz;
  const eigenDecomposition = Matrix3_default.computeEigenDecomposition(
    covarianceMatrix,
    scratchEigenResult
  );
  const rotation = Matrix3_default.clone(eigenDecomposition.unitary, result.halfAxes);
  let v1 = Matrix3_default.getColumn(rotation, 0, scratchCartesian4);
  let v2 = Matrix3_default.getColumn(rotation, 1, scratchCartesian5);
  let v3 = Matrix3_default.getColumn(rotation, 2, scratchCartesian6);
  let u1 = -Number.MAX_VALUE;
  let u2 = -Number.MAX_VALUE;
  let u3 = -Number.MAX_VALUE;
  let l1 = Number.MAX_VALUE;
  let l2 = Number.MAX_VALUE;
  let l3 = Number.MAX_VALUE;
  for (i = 0; i < length; i++) {
    p = positions[i];
    u1 = Math.max(Cartesian3_default.dot(v1, p), u1);
    u2 = Math.max(Cartesian3_default.dot(v2, p), u2);
    u3 = Math.max(Cartesian3_default.dot(v3, p), u3);
    l1 = Math.min(Cartesian3_default.dot(v1, p), l1);
    l2 = Math.min(Cartesian3_default.dot(v2, p), l2);
    l3 = Math.min(Cartesian3_default.dot(v3, p), l3);
  }
  v1 = Cartesian3_default.multiplyByScalar(v1, 0.5 * (l1 + u1), v1);
  v2 = Cartesian3_default.multiplyByScalar(v2, 0.5 * (l2 + u2), v2);
  v3 = Cartesian3_default.multiplyByScalar(v3, 0.5 * (l3 + u3), v3);
  const center = Cartesian3_default.add(v1, v2, result.center);
  Cartesian3_default.add(center, v3, center);
  const scale = scratchCartesian3;
  scale.x = u1 - l1;
  scale.y = u2 - l2;
  scale.z = u3 - l3;
  Cartesian3_default.multiplyByScalar(scale, 0.5, scale);
  Matrix3_default.multiplyByScale(result.halfAxes, scale, result.halfAxes);
  return result;
};
var scratchOffset = new Cartesian3_default();
var scratchScale = new Cartesian3_default();
function fromPlaneExtents(planeOrigin, planeXAxis, planeYAxis, planeZAxis, minimumX, maximumX, minimumY, maximumY, minimumZ, maximumZ, result) {
  if (!defined_default(minimumX) || !defined_default(maximumX) || !defined_default(minimumY) || !defined_default(maximumY) || !defined_default(minimumZ) || !defined_default(maximumZ)) {
    throw new DeveloperError_default(
      "all extents (minimum/maximum X/Y/Z) are required."
    );
  }
  if (!defined_default(result)) {
    result = new OrientedBoundingBox();
  }
  const halfAxes = result.halfAxes;
  Matrix3_default.setColumn(halfAxes, 0, planeXAxis, halfAxes);
  Matrix3_default.setColumn(halfAxes, 1, planeYAxis, halfAxes);
  Matrix3_default.setColumn(halfAxes, 2, planeZAxis, halfAxes);
  let centerOffset = scratchOffset;
  centerOffset.x = (minimumX + maximumX) / 2;
  centerOffset.y = (minimumY + maximumY) / 2;
  centerOffset.z = (minimumZ + maximumZ) / 2;
  const scale = scratchScale;
  scale.x = (maximumX - minimumX) / 2;
  scale.y = (maximumY - minimumY) / 2;
  scale.z = (maximumZ - minimumZ) / 2;
  const center = result.center;
  centerOffset = Matrix3_default.multiplyByVector(halfAxes, centerOffset, centerOffset);
  Cartesian3_default.add(planeOrigin, centerOffset, center);
  Matrix3_default.multiplyByScale(halfAxes, scale, halfAxes);
  return result;
}
var scratchRectangleCenterCartographic = new Cartographic_default();
var scratchRectangleCenter = new Cartesian3_default();
var scratchPerimeterCartographicNC = new Cartographic_default();
var scratchPerimeterCartographicNW = new Cartographic_default();
var scratchPerimeterCartographicCW = new Cartographic_default();
var scratchPerimeterCartographicSW = new Cartographic_default();
var scratchPerimeterCartographicSC = new Cartographic_default();
var scratchPerimeterCartesianNC = new Cartesian3_default();
var scratchPerimeterCartesianNW = new Cartesian3_default();
var scratchPerimeterCartesianCW = new Cartesian3_default();
var scratchPerimeterCartesianSW = new Cartesian3_default();
var scratchPerimeterCartesianSC = new Cartesian3_default();
var scratchPerimeterProjectedNC = new Cartesian2_default();
var scratchPerimeterProjectedNW = new Cartesian2_default();
var scratchPerimeterProjectedCW = new Cartesian2_default();
var scratchPerimeterProjectedSW = new Cartesian2_default();
var scratchPerimeterProjectedSC = new Cartesian2_default();
var scratchPlaneOrigin = new Cartesian3_default();
var scratchPlaneNormal = new Cartesian3_default();
var scratchPlaneXAxis = new Cartesian3_default();
var scratchHorizonCartesian = new Cartesian3_default();
var scratchHorizonProjected = new Cartesian2_default();
var scratchMaxY = new Cartesian3_default();
var scratchMinY = new Cartesian3_default();
var scratchZ = new Cartesian3_default();
var scratchPlane = new Plane_default(Cartesian3_default.UNIT_X, 0);
OrientedBoundingBox.fromRectangle = function(rectangle, minimumHeight, maximumHeight, ellipsoid, result) {
  if (!defined_default(rectangle)) {
    throw new DeveloperError_default("rectangle is required");
  }
  if (rectangle.width < 0 || rectangle.width > Math_default.TWO_PI) {
    throw new DeveloperError_default("Rectangle width must be between 0 and 2 * pi");
  }
  if (rectangle.height < 0 || rectangle.height > Math_default.PI) {
    throw new DeveloperError_default("Rectangle height must be between 0 and pi");
  }
  if (defined_default(ellipsoid) && !Math_default.equalsEpsilon(
    ellipsoid.radii.x,
    ellipsoid.radii.y,
    Math_default.EPSILON15
  )) {
    throw new DeveloperError_default(
      "Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)"
    );
  }
  minimumHeight = defaultValue_default(minimumHeight, 0);
  maximumHeight = defaultValue_default(maximumHeight, 0);
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  let minX, maxX, minY, maxY, minZ, maxZ, plane;
  if (rectangle.width <= Math_default.PI) {
    const tangentPointCartographic = Rectangle_default.center(
      rectangle,
      scratchRectangleCenterCartographic
    );
    const tangentPoint = ellipsoid.cartographicToCartesian(
      tangentPointCartographic,
      scratchRectangleCenter
    );
    const tangentPlane = new EllipsoidTangentPlane_default(tangentPoint, ellipsoid);
    plane = tangentPlane.plane;
    const lonCenter = tangentPointCartographic.longitude;
    const latCenter = rectangle.south < 0 && rectangle.north > 0 ? 0 : tangentPointCartographic.latitude;
    const perimeterCartographicNC = Cartographic_default.fromRadians(
      lonCenter,
      rectangle.north,
      maximumHeight,
      scratchPerimeterCartographicNC
    );
    const perimeterCartographicNW = Cartographic_default.fromRadians(
      rectangle.west,
      rectangle.north,
      maximumHeight,
      scratchPerimeterCartographicNW
    );
    const perimeterCartographicCW = Cartographic_default.fromRadians(
      rectangle.west,
      latCenter,
      maximumHeight,
      scratchPerimeterCartographicCW
    );
    const perimeterCartographicSW = Cartographic_default.fromRadians(
      rectangle.west,
      rectangle.south,
      maximumHeight,
      scratchPerimeterCartographicSW
    );
    const perimeterCartographicSC = Cartographic_default.fromRadians(
      lonCenter,
      rectangle.south,
      maximumHeight,
      scratchPerimeterCartographicSC
    );
    const perimeterCartesianNC = ellipsoid.cartographicToCartesian(
      perimeterCartographicNC,
      scratchPerimeterCartesianNC
    );
    let perimeterCartesianNW = ellipsoid.cartographicToCartesian(
      perimeterCartographicNW,
      scratchPerimeterCartesianNW
    );
    const perimeterCartesianCW = ellipsoid.cartographicToCartesian(
      perimeterCartographicCW,
      scratchPerimeterCartesianCW
    );
    let perimeterCartesianSW = ellipsoid.cartographicToCartesian(
      perimeterCartographicSW,
      scratchPerimeterCartesianSW
    );
    const perimeterCartesianSC = ellipsoid.cartographicToCartesian(
      perimeterCartographicSC,
      scratchPerimeterCartesianSC
    );
    const perimeterProjectedNC = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianNC,
      scratchPerimeterProjectedNC
    );
    const perimeterProjectedNW = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianNW,
      scratchPerimeterProjectedNW
    );
    const perimeterProjectedCW = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianCW,
      scratchPerimeterProjectedCW
    );
    const perimeterProjectedSW = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianSW,
      scratchPerimeterProjectedSW
    );
    const perimeterProjectedSC = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianSC,
      scratchPerimeterProjectedSC
    );
    minX = Math.min(
      perimeterProjectedNW.x,
      perimeterProjectedCW.x,
      perimeterProjectedSW.x
    );
    maxX = -minX;
    maxY = Math.max(perimeterProjectedNW.y, perimeterProjectedNC.y);
    minY = Math.min(perimeterProjectedSW.y, perimeterProjectedSC.y);
    perimeterCartographicNW.height = perimeterCartographicSW.height = minimumHeight;
    perimeterCartesianNW = ellipsoid.cartographicToCartesian(
      perimeterCartographicNW,
      scratchPerimeterCartesianNW
    );
    perimeterCartesianSW = ellipsoid.cartographicToCartesian(
      perimeterCartographicSW,
      scratchPerimeterCartesianSW
    );
    minZ = Math.min(
      Plane_default.getPointDistance(plane, perimeterCartesianNW),
      Plane_default.getPointDistance(plane, perimeterCartesianSW)
    );
    maxZ = maximumHeight;
    return fromPlaneExtents(
      tangentPlane.origin,
      tangentPlane.xAxis,
      tangentPlane.yAxis,
      tangentPlane.zAxis,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      result
    );
  }
  const fullyAboveEquator = rectangle.south > 0;
  const fullyBelowEquator = rectangle.north < 0;
  const latitudeNearestToEquator = fullyAboveEquator ? rectangle.south : fullyBelowEquator ? rectangle.north : 0;
  const centerLongitude = Rectangle_default.center(
    rectangle,
    scratchRectangleCenterCartographic
  ).longitude;
  const planeOrigin = Cartesian3_default.fromRadians(
    centerLongitude,
    latitudeNearestToEquator,
    maximumHeight,
    ellipsoid,
    scratchPlaneOrigin
  );
  planeOrigin.z = 0;
  const isPole = Math.abs(planeOrigin.x) < Math_default.EPSILON10 && Math.abs(planeOrigin.y) < Math_default.EPSILON10;
  const planeNormal = !isPole ? Cartesian3_default.normalize(planeOrigin, scratchPlaneNormal) : Cartesian3_default.UNIT_X;
  const planeYAxis = Cartesian3_default.UNIT_Z;
  const planeXAxis = Cartesian3_default.cross(
    planeNormal,
    planeYAxis,
    scratchPlaneXAxis
  );
  plane = Plane_default.fromPointNormal(planeOrigin, planeNormal, scratchPlane);
  const horizonCartesian = Cartesian3_default.fromRadians(
    centerLongitude + Math_default.PI_OVER_TWO,
    latitudeNearestToEquator,
    maximumHeight,
    ellipsoid,
    scratchHorizonCartesian
  );
  maxX = Cartesian3_default.dot(
    Plane_default.projectPointOntoPlane(
      plane,
      horizonCartesian,
      scratchHorizonProjected
    ),
    planeXAxis
  );
  minX = -maxX;
  maxY = Cartesian3_default.fromRadians(
    0,
    rectangle.north,
    fullyBelowEquator ? minimumHeight : maximumHeight,
    ellipsoid,
    scratchMaxY
  ).z;
  minY = Cartesian3_default.fromRadians(
    0,
    rectangle.south,
    fullyAboveEquator ? minimumHeight : maximumHeight,
    ellipsoid,
    scratchMinY
  ).z;
  const farZ = Cartesian3_default.fromRadians(
    rectangle.east,
    latitudeNearestToEquator,
    maximumHeight,
    ellipsoid,
    scratchZ
  );
  minZ = Plane_default.getPointDistance(plane, farZ);
  maxZ = 0;
  return fromPlaneExtents(
    planeOrigin,
    planeXAxis,
    planeYAxis,
    planeNormal,
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    result
  );
};
OrientedBoundingBox.fromTransformation = function(transformation, result) {
  Check_default.typeOf.object("transformation", transformation);
  if (!defined_default(result)) {
    result = new OrientedBoundingBox();
  }
  result.center = Matrix4_default.getTranslation(transformation, result.center);
  result.halfAxes = Matrix4_default.getMatrix3(transformation, result.halfAxes);
  result.halfAxes = Matrix3_default.multiplyByScalar(
    result.halfAxes,
    0.5,
    result.halfAxes
  );
  return result;
};
OrientedBoundingBox.clone = function(box, result) {
  if (!defined_default(box)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new OrientedBoundingBox(box.center, box.halfAxes);
  }
  Cartesian3_default.clone(box.center, result.center);
  Matrix3_default.clone(box.halfAxes, result.halfAxes);
  return result;
};
OrientedBoundingBox.intersectPlane = function(box, plane) {
  if (!defined_default(box)) {
    throw new DeveloperError_default("box is required.");
  }
  if (!defined_default(plane)) {
    throw new DeveloperError_default("plane is required.");
  }
  const center = box.center;
  const normal = plane.normal;
  const halfAxes = box.halfAxes;
  const normalX = normal.x, normalY = normal.y, normalZ = normal.z;
  const radEffective = Math.abs(
    normalX * halfAxes[Matrix3_default.COLUMN0ROW0] + normalY * halfAxes[Matrix3_default.COLUMN0ROW1] + normalZ * halfAxes[Matrix3_default.COLUMN0ROW2]
  ) + Math.abs(
    normalX * halfAxes[Matrix3_default.COLUMN1ROW0] + normalY * halfAxes[Matrix3_default.COLUMN1ROW1] + normalZ * halfAxes[Matrix3_default.COLUMN1ROW2]
  ) + Math.abs(
    normalX * halfAxes[Matrix3_default.COLUMN2ROW0] + normalY * halfAxes[Matrix3_default.COLUMN2ROW1] + normalZ * halfAxes[Matrix3_default.COLUMN2ROW2]
  );
  const distanceToPlane = Cartesian3_default.dot(normal, center) + plane.distance;
  if (distanceToPlane <= -radEffective) {
    return Intersect_default.OUTSIDE;
  } else if (distanceToPlane >= radEffective) {
    return Intersect_default.INSIDE;
  }
  return Intersect_default.INTERSECTING;
};
var scratchCartesianU = new Cartesian3_default();
var scratchCartesianV = new Cartesian3_default();
var scratchCartesianW = new Cartesian3_default();
var scratchValidAxis2 = new Cartesian3_default();
var scratchValidAxis3 = new Cartesian3_default();
var scratchPPrime = new Cartesian3_default();
OrientedBoundingBox.distanceSquaredTo = function(box, cartesian) {
  if (!defined_default(box)) {
    throw new DeveloperError_default("box is required.");
  }
  if (!defined_default(cartesian)) {
    throw new DeveloperError_default("cartesian is required.");
  }
  const offset = Cartesian3_default.subtract(cartesian, box.center, scratchOffset);
  const halfAxes = box.halfAxes;
  let u = Matrix3_default.getColumn(halfAxes, 0, scratchCartesianU);
  let v = Matrix3_default.getColumn(halfAxes, 1, scratchCartesianV);
  let w = Matrix3_default.getColumn(halfAxes, 2, scratchCartesianW);
  const uHalf = Cartesian3_default.magnitude(u);
  const vHalf = Cartesian3_default.magnitude(v);
  const wHalf = Cartesian3_default.magnitude(w);
  let uValid = true;
  let vValid = true;
  let wValid = true;
  if (uHalf > 0) {
    Cartesian3_default.divideByScalar(u, uHalf, u);
  } else {
    uValid = false;
  }
  if (vHalf > 0) {
    Cartesian3_default.divideByScalar(v, vHalf, v);
  } else {
    vValid = false;
  }
  if (wHalf > 0) {
    Cartesian3_default.divideByScalar(w, wHalf, w);
  } else {
    wValid = false;
  }
  const numberOfDegenerateAxes = !uValid + !vValid + !wValid;
  let validAxis1;
  let validAxis2;
  let validAxis3;
  if (numberOfDegenerateAxes === 1) {
    let degenerateAxis = u;
    validAxis1 = v;
    validAxis2 = w;
    if (!vValid) {
      degenerateAxis = v;
      validAxis1 = u;
    } else if (!wValid) {
      degenerateAxis = w;
      validAxis2 = u;
    }
    validAxis3 = Cartesian3_default.cross(validAxis1, validAxis2, scratchValidAxis3);
    if (degenerateAxis === u) {
      u = validAxis3;
    } else if (degenerateAxis === v) {
      v = validAxis3;
    } else if (degenerateAxis === w) {
      w = validAxis3;
    }
  } else if (numberOfDegenerateAxes === 2) {
    validAxis1 = u;
    if (vValid) {
      validAxis1 = v;
    } else if (wValid) {
      validAxis1 = w;
    }
    let crossVector = Cartesian3_default.UNIT_Y;
    if (crossVector.equalsEpsilon(validAxis1, Math_default.EPSILON3)) {
      crossVector = Cartesian3_default.UNIT_X;
    }
    validAxis2 = Cartesian3_default.cross(validAxis1, crossVector, scratchValidAxis2);
    Cartesian3_default.normalize(validAxis2, validAxis2);
    validAxis3 = Cartesian3_default.cross(validAxis1, validAxis2, scratchValidAxis3);
    Cartesian3_default.normalize(validAxis3, validAxis3);
    if (validAxis1 === u) {
      v = validAxis2;
      w = validAxis3;
    } else if (validAxis1 === v) {
      w = validAxis2;
      u = validAxis3;
    } else if (validAxis1 === w) {
      u = validAxis2;
      v = validAxis3;
    }
  } else if (numberOfDegenerateAxes === 3) {
    u = Cartesian3_default.UNIT_X;
    v = Cartesian3_default.UNIT_Y;
    w = Cartesian3_default.UNIT_Z;
  }
  const pPrime = scratchPPrime;
  pPrime.x = Cartesian3_default.dot(offset, u);
  pPrime.y = Cartesian3_default.dot(offset, v);
  pPrime.z = Cartesian3_default.dot(offset, w);
  let distanceSquared = 0;
  let d;
  if (pPrime.x < -uHalf) {
    d = pPrime.x + uHalf;
    distanceSquared += d * d;
  } else if (pPrime.x > uHalf) {
    d = pPrime.x - uHalf;
    distanceSquared += d * d;
  }
  if (pPrime.y < -vHalf) {
    d = pPrime.y + vHalf;
    distanceSquared += d * d;
  } else if (pPrime.y > vHalf) {
    d = pPrime.y - vHalf;
    distanceSquared += d * d;
  }
  if (pPrime.z < -wHalf) {
    d = pPrime.z + wHalf;
    distanceSquared += d * d;
  } else if (pPrime.z > wHalf) {
    d = pPrime.z - wHalf;
    distanceSquared += d * d;
  }
  return distanceSquared;
};
var scratchCorner = new Cartesian3_default();
var scratchToCenter = new Cartesian3_default();
OrientedBoundingBox.computePlaneDistances = function(box, position, direction, result) {
  if (!defined_default(box)) {
    throw new DeveloperError_default("box is required.");
  }
  if (!defined_default(position)) {
    throw new DeveloperError_default("position is required.");
  }
  if (!defined_default(direction)) {
    throw new DeveloperError_default("direction is required.");
  }
  if (!defined_default(result)) {
    result = new Interval_default();
  }
  let minDist = Number.POSITIVE_INFINITY;
  let maxDist = Number.NEGATIVE_INFINITY;
  const center = box.center;
  const halfAxes = box.halfAxes;
  const u = Matrix3_default.getColumn(halfAxes, 0, scratchCartesianU);
  const v = Matrix3_default.getColumn(halfAxes, 1, scratchCartesianV);
  const w = Matrix3_default.getColumn(halfAxes, 2, scratchCartesianW);
  const corner = Cartesian3_default.add(u, v, scratchCorner);
  Cartesian3_default.add(corner, w, corner);
  Cartesian3_default.add(corner, center, corner);
  const toCenter = Cartesian3_default.subtract(corner, position, scratchToCenter);
  let mag = Cartesian3_default.dot(direction, toCenter);
  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);
  Cartesian3_default.add(center, u, corner);
  Cartesian3_default.add(corner, v, corner);
  Cartesian3_default.subtract(corner, w, corner);
  Cartesian3_default.subtract(corner, position, toCenter);
  mag = Cartesian3_default.dot(direction, toCenter);
  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);
  Cartesian3_default.add(center, u, corner);
  Cartesian3_default.subtract(corner, v, corner);
  Cartesian3_default.add(corner, w, corner);
  Cartesian3_default.subtract(corner, position, toCenter);
  mag = Cartesian3_default.dot(direction, toCenter);
  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);
  Cartesian3_default.add(center, u, corner);
  Cartesian3_default.subtract(corner, v, corner);
  Cartesian3_default.subtract(corner, w, corner);
  Cartesian3_default.subtract(corner, position, toCenter);
  mag = Cartesian3_default.dot(direction, toCenter);
  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);
  Cartesian3_default.subtract(center, u, corner);
  Cartesian3_default.add(corner, v, corner);
  Cartesian3_default.add(corner, w, corner);
  Cartesian3_default.subtract(corner, position, toCenter);
  mag = Cartesian3_default.dot(direction, toCenter);
  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);
  Cartesian3_default.subtract(center, u, corner);
  Cartesian3_default.add(corner, v, corner);
  Cartesian3_default.subtract(corner, w, corner);
  Cartesian3_default.subtract(corner, position, toCenter);
  mag = Cartesian3_default.dot(direction, toCenter);
  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);
  Cartesian3_default.subtract(center, u, corner);
  Cartesian3_default.subtract(corner, v, corner);
  Cartesian3_default.add(corner, w, corner);
  Cartesian3_default.subtract(corner, position, toCenter);
  mag = Cartesian3_default.dot(direction, toCenter);
  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);
  Cartesian3_default.subtract(center, u, corner);
  Cartesian3_default.subtract(corner, v, corner);
  Cartesian3_default.subtract(corner, w, corner);
  Cartesian3_default.subtract(corner, position, toCenter);
  mag = Cartesian3_default.dot(direction, toCenter);
  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);
  result.start = minDist;
  result.stop = maxDist;
  return result;
};
var scratchXAxis = new Cartesian3_default();
var scratchYAxis = new Cartesian3_default();
var scratchZAxis = new Cartesian3_default();
OrientedBoundingBox.computeCorners = function(box, result) {
  Check_default.typeOf.object("box", box);
  if (!defined_default(result)) {
    result = [
      new Cartesian3_default(),
      new Cartesian3_default(),
      new Cartesian3_default(),
      new Cartesian3_default(),
      new Cartesian3_default(),
      new Cartesian3_default(),
      new Cartesian3_default(),
      new Cartesian3_default()
    ];
  }
  const center = box.center;
  const halfAxes = box.halfAxes;
  const xAxis = Matrix3_default.getColumn(halfAxes, 0, scratchXAxis);
  const yAxis = Matrix3_default.getColumn(halfAxes, 1, scratchYAxis);
  const zAxis = Matrix3_default.getColumn(halfAxes, 2, scratchZAxis);
  Cartesian3_default.clone(center, result[0]);
  Cartesian3_default.subtract(result[0], xAxis, result[0]);
  Cartesian3_default.subtract(result[0], yAxis, result[0]);
  Cartesian3_default.subtract(result[0], zAxis, result[0]);
  Cartesian3_default.clone(center, result[1]);
  Cartesian3_default.subtract(result[1], xAxis, result[1]);
  Cartesian3_default.subtract(result[1], yAxis, result[1]);
  Cartesian3_default.add(result[1], zAxis, result[1]);
  Cartesian3_default.clone(center, result[2]);
  Cartesian3_default.subtract(result[2], xAxis, result[2]);
  Cartesian3_default.add(result[2], yAxis, result[2]);
  Cartesian3_default.subtract(result[2], zAxis, result[2]);
  Cartesian3_default.clone(center, result[3]);
  Cartesian3_default.subtract(result[3], xAxis, result[3]);
  Cartesian3_default.add(result[3], yAxis, result[3]);
  Cartesian3_default.add(result[3], zAxis, result[3]);
  Cartesian3_default.clone(center, result[4]);
  Cartesian3_default.add(result[4], xAxis, result[4]);
  Cartesian3_default.subtract(result[4], yAxis, result[4]);
  Cartesian3_default.subtract(result[4], zAxis, result[4]);
  Cartesian3_default.clone(center, result[5]);
  Cartesian3_default.add(result[5], xAxis, result[5]);
  Cartesian3_default.subtract(result[5], yAxis, result[5]);
  Cartesian3_default.add(result[5], zAxis, result[5]);
  Cartesian3_default.clone(center, result[6]);
  Cartesian3_default.add(result[6], xAxis, result[6]);
  Cartesian3_default.add(result[6], yAxis, result[6]);
  Cartesian3_default.subtract(result[6], zAxis, result[6]);
  Cartesian3_default.clone(center, result[7]);
  Cartesian3_default.add(result[7], xAxis, result[7]);
  Cartesian3_default.add(result[7], yAxis, result[7]);
  Cartesian3_default.add(result[7], zAxis, result[7]);
  return result;
};
var scratchRotationScale = new Matrix3_default();
OrientedBoundingBox.computeTransformation = function(box, result) {
  Check_default.typeOf.object("box", box);
  if (!defined_default(result)) {
    result = new Matrix4_default();
  }
  const translation = box.center;
  const rotationScale = Matrix3_default.multiplyByUniformScale(
    box.halfAxes,
    2,
    scratchRotationScale
  );
  return Matrix4_default.fromRotationTranslation(rotationScale, translation, result);
};
var scratchBoundingSphere = new BoundingSphere_default();
OrientedBoundingBox.isOccluded = function(box, occluder) {
  if (!defined_default(box)) {
    throw new DeveloperError_default("box is required.");
  }
  if (!defined_default(occluder)) {
    throw new DeveloperError_default("occluder is required.");
  }
  const sphere = BoundingSphere_default.fromOrientedBoundingBox(
    box,
    scratchBoundingSphere
  );
  return !occluder.isBoundingSphereVisible(sphere);
};
OrientedBoundingBox.prototype.intersectPlane = function(plane) {
  return OrientedBoundingBox.intersectPlane(this, plane);
};
OrientedBoundingBox.prototype.distanceSquaredTo = function(cartesian) {
  return OrientedBoundingBox.distanceSquaredTo(this, cartesian);
};
OrientedBoundingBox.prototype.computePlaneDistances = function(position, direction, result) {
  return OrientedBoundingBox.computePlaneDistances(
    this,
    position,
    direction,
    result
  );
};
OrientedBoundingBox.prototype.computeCorners = function(result) {
  return OrientedBoundingBox.computeCorners(this, result);
};
OrientedBoundingBox.prototype.computeTransformation = function(result) {
  return OrientedBoundingBox.computeTransformation(this, result);
};
OrientedBoundingBox.prototype.isOccluded = function(occluder) {
  return OrientedBoundingBox.isOccluded(this, occluder);
};
OrientedBoundingBox.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && Cartesian3_default.equals(left.center, right.center) && Matrix3_default.equals(left.halfAxes, right.halfAxes);
};
OrientedBoundingBox.prototype.clone = function(result) {
  return OrientedBoundingBox.clone(this, result);
};
OrientedBoundingBox.prototype.equals = function(right) {
  return OrientedBoundingBox.equals(this, right);
};
var OrientedBoundingBox_default = OrientedBoundingBox;

export {
  OrientedBoundingBox_default
};
