/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.120
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
  Matrix4_default,
  Rectangle_default
} from "./chunk-IKEVZXU4.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
} from "./chunk-FIBS72KH.js";
import {
  Math_default
} from "./chunk-HOXR7V6R.js";
import {
  defaultValue_default
} from "./chunk-SWIXUPD2.js";
import {
  Check_default,
  DeveloperError_default
} from "./chunk-L7PKE5VE.js";
import {
  defined_default
} from "./chunk-D3NRMS7O.js";

// packages/engine/Source/Core/GeographicProjection.js
function GeographicProjection(ellipsoid) {
  this._ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.default);
  this._semimajorAxis = this._ellipsoid.maximumRadius;
  this._oneOverSemimajorAxis = 1 / this._semimajorAxis;
}
Object.defineProperties(GeographicProjection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof GeographicProjection.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function() {
      return this._ellipsoid;
    }
  }
});
GeographicProjection.prototype.project = function(cartographic, result) {
  const semimajorAxis = this._semimajorAxis;
  const x = cartographic.longitude * semimajorAxis;
  const y = cartographic.latitude * semimajorAxis;
  const z = cartographic.height;
  if (!defined_default(result)) {
    return new Cartesian3_default(x, y, z);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
GeographicProjection.prototype.unproject = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    throw new DeveloperError_default("cartesian is required");
  }
  const oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
  const longitude = cartesian.x * oneOverEarthSemimajorAxis;
  const latitude = cartesian.y * oneOverEarthSemimajorAxis;
  const height = cartesian.z;
  if (!defined_default(result)) {
    return new Cartographic_default(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
var GeographicProjection_default = GeographicProjection;

// packages/engine/Source/Core/Intersect.js
var Intersect = {
  /**
   * Represents that an object is not contained within the frustum.
   *
   * @type {number}
   * @constant
   */
  OUTSIDE: -1,
  /**
   * Represents that an object intersects one of the frustum's planes.
   *
   * @type {number}
   * @constant
   */
  INTERSECTING: 0,
  /**
   * Represents that an object is fully within the frustum.
   *
   * @type {number}
   * @constant
   */
  INSIDE: 1
};
var Intersect_default = Object.freeze(Intersect);

// packages/engine/Source/Core/Interval.js
function Interval(start, stop) {
  this.start = defaultValue_default(start, 0);
  this.stop = defaultValue_default(stop, 0);
}
var Interval_default = Interval;

// packages/engine/Source/Core/BoundingSphere.js
function BoundingSphere(center, radius) {
  this.center = Cartesian3_default.clone(defaultValue_default(center, Cartesian3_default.ZERO));
  this.radius = defaultValue_default(radius, 0);
}
var fromPointsXMin = new Cartesian3_default();
var fromPointsYMin = new Cartesian3_default();
var fromPointsZMin = new Cartesian3_default();
var fromPointsXMax = new Cartesian3_default();
var fromPointsYMax = new Cartesian3_default();
var fromPointsZMax = new Cartesian3_default();
var fromPointsCurrentPos = new Cartesian3_default();
var fromPointsScratch = new Cartesian3_default();
var fromPointsRitterCenter = new Cartesian3_default();
var fromPointsMinBoxPt = new Cartesian3_default();
var fromPointsMaxBoxPt = new Cartesian3_default();
var fromPointsNaiveCenterScratch = new Cartesian3_default();
var volumeConstant = 4 / 3 * Math_default.PI;
BoundingSphere.fromPoints = function(positions, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(positions) || positions.length === 0) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  const currentPos = Cartesian3_default.clone(positions[0], fromPointsCurrentPos);
  const xMin = Cartesian3_default.clone(currentPos, fromPointsXMin);
  const yMin = Cartesian3_default.clone(currentPos, fromPointsYMin);
  const zMin = Cartesian3_default.clone(currentPos, fromPointsZMin);
  const xMax = Cartesian3_default.clone(currentPos, fromPointsXMax);
  const yMax = Cartesian3_default.clone(currentPos, fromPointsYMax);
  const zMax = Cartesian3_default.clone(currentPos, fromPointsZMax);
  const numPositions = positions.length;
  let i;
  for (i = 1; i < numPositions; i++) {
    Cartesian3_default.clone(positions[i], currentPos);
    const x = currentPos.x;
    const y = currentPos.y;
    const z = currentPos.z;
    if (x < xMin.x) {
      Cartesian3_default.clone(currentPos, xMin);
    }
    if (x > xMax.x) {
      Cartesian3_default.clone(currentPos, xMax);
    }
    if (y < yMin.y) {
      Cartesian3_default.clone(currentPos, yMin);
    }
    if (y > yMax.y) {
      Cartesian3_default.clone(currentPos, yMax);
    }
    if (z < zMin.z) {
      Cartesian3_default.clone(currentPos, zMin);
    }
    if (z > zMax.z) {
      Cartesian3_default.clone(currentPos, zMax);
    }
  }
  const xSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(xMax, xMin, fromPointsScratch)
  );
  const ySpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(yMax, yMin, fromPointsScratch)
  );
  const zSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(zMax, zMin, fromPointsScratch)
  );
  let diameter1 = xMin;
  let diameter2 = xMax;
  let maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }
  const ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;
  let radiusSquared = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  let ritterRadius = Math.sqrt(radiusSquared);
  const minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;
  const maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;
  const naiveCenter = Cartesian3_default.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );
  let naiveRadius = 0;
  for (i = 0; i < numPositions; i++) {
    Cartesian3_default.clone(positions[i], currentPos);
    const r = Cartesian3_default.magnitude(
      Cartesian3_default.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }
    const oldCenterToPointSquared = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      const oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
      ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
      ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
    }
  }
  if (ritterRadius < naiveRadius) {
    Cartesian3_default.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3_default.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }
  return result;
};
var defaultProjection = new GeographicProjection_default();
var fromRectangle2DLowerLeft = new Cartesian3_default();
var fromRectangle2DUpperRight = new Cartesian3_default();
var fromRectangle2DSouthwest = new Cartographic_default();
var fromRectangle2DNortheast = new Cartographic_default();
BoundingSphere.fromRectangle2D = function(rectangle, projection, result) {
  return BoundingSphere.fromRectangleWithHeights2D(
    rectangle,
    projection,
    0,
    0,
    result
  );
};
BoundingSphere.fromRectangleWithHeights2D = function(rectangle, projection, minimumHeight, maximumHeight, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(rectangle)) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  defaultProjection._ellipsoid = Ellipsoid_default.default;
  projection = defaultValue_default(projection, defaultProjection);
  Rectangle_default.southwest(rectangle, fromRectangle2DSouthwest);
  fromRectangle2DSouthwest.height = minimumHeight;
  Rectangle_default.northeast(rectangle, fromRectangle2DNortheast);
  fromRectangle2DNortheast.height = maximumHeight;
  const lowerLeft = projection.project(
    fromRectangle2DSouthwest,
    fromRectangle2DLowerLeft
  );
  const upperRight = projection.project(
    fromRectangle2DNortheast,
    fromRectangle2DUpperRight
  );
  const width = upperRight.x - lowerLeft.x;
  const height = upperRight.y - lowerLeft.y;
  const elevation = upperRight.z - lowerLeft.z;
  result.radius = Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
  const center = result.center;
  center.x = lowerLeft.x + width * 0.5;
  center.y = lowerLeft.y + height * 0.5;
  center.z = lowerLeft.z + elevation * 0.5;
  return result;
};
var fromRectangle3DScratch = [];
BoundingSphere.fromRectangle3D = function(rectangle, ellipsoid, surfaceHeight, result) {
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.default);
  surfaceHeight = defaultValue_default(surfaceHeight, 0);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(rectangle)) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  const positions = Rectangle_default.subsample(
    rectangle,
    ellipsoid,
    surfaceHeight,
    fromRectangle3DScratch
  );
  return BoundingSphere.fromPoints(positions, result);
};
BoundingSphere.fromVertices = function(positions, center, stride, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(positions) || positions.length === 0) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  center = defaultValue_default(center, Cartesian3_default.ZERO);
  stride = defaultValue_default(stride, 3);
  Check_default.typeOf.number.greaterThanOrEquals("stride", stride, 3);
  const currentPos = fromPointsCurrentPos;
  currentPos.x = positions[0] + center.x;
  currentPos.y = positions[1] + center.y;
  currentPos.z = positions[2] + center.z;
  const xMin = Cartesian3_default.clone(currentPos, fromPointsXMin);
  const yMin = Cartesian3_default.clone(currentPos, fromPointsYMin);
  const zMin = Cartesian3_default.clone(currentPos, fromPointsZMin);
  const xMax = Cartesian3_default.clone(currentPos, fromPointsXMax);
  const yMax = Cartesian3_default.clone(currentPos, fromPointsYMax);
  const zMax = Cartesian3_default.clone(currentPos, fromPointsZMax);
  const numElements = positions.length;
  let i;
  for (i = 0; i < numElements; i += stride) {
    const x = positions[i] + center.x;
    const y = positions[i + 1] + center.y;
    const z = positions[i + 2] + center.z;
    currentPos.x = x;
    currentPos.y = y;
    currentPos.z = z;
    if (x < xMin.x) {
      Cartesian3_default.clone(currentPos, xMin);
    }
    if (x > xMax.x) {
      Cartesian3_default.clone(currentPos, xMax);
    }
    if (y < yMin.y) {
      Cartesian3_default.clone(currentPos, yMin);
    }
    if (y > yMax.y) {
      Cartesian3_default.clone(currentPos, yMax);
    }
    if (z < zMin.z) {
      Cartesian3_default.clone(currentPos, zMin);
    }
    if (z > zMax.z) {
      Cartesian3_default.clone(currentPos, zMax);
    }
  }
  const xSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(xMax, xMin, fromPointsScratch)
  );
  const ySpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(yMax, yMin, fromPointsScratch)
  );
  const zSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(zMax, zMin, fromPointsScratch)
  );
  let diameter1 = xMin;
  let diameter2 = xMax;
  let maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }
  const ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;
  let radiusSquared = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  let ritterRadius = Math.sqrt(radiusSquared);
  const minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;
  const maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;
  const naiveCenter = Cartesian3_default.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );
  let naiveRadius = 0;
  for (i = 0; i < numElements; i += stride) {
    currentPos.x = positions[i] + center.x;
    currentPos.y = positions[i + 1] + center.y;
    currentPos.z = positions[i + 2] + center.z;
    const r = Cartesian3_default.magnitude(
      Cartesian3_default.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }
    const oldCenterToPointSquared = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      const oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
      ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
      ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
    }
  }
  if (ritterRadius < naiveRadius) {
    Cartesian3_default.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3_default.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }
  return result;
};
BoundingSphere.fromEncodedCartesianVertices = function(positionsHigh, positionsLow, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(positionsHigh) || !defined_default(positionsLow) || positionsHigh.length !== positionsLow.length || positionsHigh.length === 0) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  const currentPos = fromPointsCurrentPos;
  currentPos.x = positionsHigh[0] + positionsLow[0];
  currentPos.y = positionsHigh[1] + positionsLow[1];
  currentPos.z = positionsHigh[2] + positionsLow[2];
  const xMin = Cartesian3_default.clone(currentPos, fromPointsXMin);
  const yMin = Cartesian3_default.clone(currentPos, fromPointsYMin);
  const zMin = Cartesian3_default.clone(currentPos, fromPointsZMin);
  const xMax = Cartesian3_default.clone(currentPos, fromPointsXMax);
  const yMax = Cartesian3_default.clone(currentPos, fromPointsYMax);
  const zMax = Cartesian3_default.clone(currentPos, fromPointsZMax);
  const numElements = positionsHigh.length;
  let i;
  for (i = 0; i < numElements; i += 3) {
    const x = positionsHigh[i] + positionsLow[i];
    const y = positionsHigh[i + 1] + positionsLow[i + 1];
    const z = positionsHigh[i + 2] + positionsLow[i + 2];
    currentPos.x = x;
    currentPos.y = y;
    currentPos.z = z;
    if (x < xMin.x) {
      Cartesian3_default.clone(currentPos, xMin);
    }
    if (x > xMax.x) {
      Cartesian3_default.clone(currentPos, xMax);
    }
    if (y < yMin.y) {
      Cartesian3_default.clone(currentPos, yMin);
    }
    if (y > yMax.y) {
      Cartesian3_default.clone(currentPos, yMax);
    }
    if (z < zMin.z) {
      Cartesian3_default.clone(currentPos, zMin);
    }
    if (z > zMax.z) {
      Cartesian3_default.clone(currentPos, zMax);
    }
  }
  const xSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(xMax, xMin, fromPointsScratch)
  );
  const ySpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(yMax, yMin, fromPointsScratch)
  );
  const zSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(zMax, zMin, fromPointsScratch)
  );
  let diameter1 = xMin;
  let diameter2 = xMax;
  let maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }
  const ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;
  let radiusSquared = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  let ritterRadius = Math.sqrt(radiusSquared);
  const minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;
  const maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;
  const naiveCenter = Cartesian3_default.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );
  let naiveRadius = 0;
  for (i = 0; i < numElements; i += 3) {
    currentPos.x = positionsHigh[i] + positionsLow[i];
    currentPos.y = positionsHigh[i + 1] + positionsLow[i + 1];
    currentPos.z = positionsHigh[i + 2] + positionsLow[i + 2];
    const r = Cartesian3_default.magnitude(
      Cartesian3_default.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }
    const oldCenterToPointSquared = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      const oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
      ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
      ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
    }
  }
  if (ritterRadius < naiveRadius) {
    Cartesian3_default.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3_default.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }
  return result;
};
BoundingSphere.fromCornerPoints = function(corner, oppositeCorner, result) {
  Check_default.typeOf.object("corner", corner);
  Check_default.typeOf.object("oppositeCorner", oppositeCorner);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const center = Cartesian3_default.midpoint(corner, oppositeCorner, result.center);
  result.radius = Cartesian3_default.distance(center, oppositeCorner);
  return result;
};
BoundingSphere.fromEllipsoid = function(ellipsoid, result) {
  Check_default.typeOf.object("ellipsoid", ellipsoid);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
  result.radius = ellipsoid.maximumRadius;
  return result;
};
var fromBoundingSpheresScratch = new Cartesian3_default();
BoundingSphere.fromBoundingSpheres = function(boundingSpheres, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(boundingSpheres) || boundingSpheres.length === 0) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  const length = boundingSpheres.length;
  if (length === 1) {
    return BoundingSphere.clone(boundingSpheres[0], result);
  }
  if (length === 2) {
    return BoundingSphere.union(boundingSpheres[0], boundingSpheres[1], result);
  }
  const positions = [];
  let i;
  for (i = 0; i < length; i++) {
    positions.push(boundingSpheres[i].center);
  }
  result = BoundingSphere.fromPoints(positions, result);
  const center = result.center;
  let radius = result.radius;
  for (i = 0; i < length; i++) {
    const tmp = boundingSpheres[i];
    radius = Math.max(
      radius,
      Cartesian3_default.distance(center, tmp.center, fromBoundingSpheresScratch) + tmp.radius
    );
  }
  result.radius = radius;
  return result;
};
var fromOrientedBoundingBoxScratchU = new Cartesian3_default();
var fromOrientedBoundingBoxScratchV = new Cartesian3_default();
var fromOrientedBoundingBoxScratchW = new Cartesian3_default();
BoundingSphere.fromOrientedBoundingBox = function(orientedBoundingBox, result) {
  Check_default.defined("orientedBoundingBox", orientedBoundingBox);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const halfAxes = orientedBoundingBox.halfAxes;
  const u = Matrix3_default.getColumn(halfAxes, 0, fromOrientedBoundingBoxScratchU);
  const v = Matrix3_default.getColumn(halfAxes, 1, fromOrientedBoundingBoxScratchV);
  const w = Matrix3_default.getColumn(halfAxes, 2, fromOrientedBoundingBoxScratchW);
  Cartesian3_default.add(u, v, u);
  Cartesian3_default.add(u, w, u);
  result.center = Cartesian3_default.clone(orientedBoundingBox.center, result.center);
  result.radius = Cartesian3_default.magnitude(u);
  return result;
};
var scratchFromTransformationCenter = new Cartesian3_default();
var scratchFromTransformationScale = new Cartesian3_default();
BoundingSphere.fromTransformation = function(transformation, result) {
  Check_default.typeOf.object("transformation", transformation);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const center = Matrix4_default.getTranslation(
    transformation,
    scratchFromTransformationCenter
  );
  const scale = Matrix4_default.getScale(
    transformation,
    scratchFromTransformationScale
  );
  const radius = 0.5 * Cartesian3_default.magnitude(scale);
  result.center = Cartesian3_default.clone(center, result.center);
  result.radius = radius;
  return result;
};
BoundingSphere.clone = function(sphere, result) {
  if (!defined_default(sphere)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new BoundingSphere(sphere.center, sphere.radius);
  }
  result.center = Cartesian3_default.clone(sphere.center, result.center);
  result.radius = sphere.radius;
  return result;
};
BoundingSphere.packedLength = 4;
BoundingSphere.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const center = value.center;
  array[startingIndex++] = center.x;
  array[startingIndex++] = center.y;
  array[startingIndex++] = center.z;
  array[startingIndex] = value.radius;
  return array;
};
BoundingSphere.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const center = result.center;
  center.x = array[startingIndex++];
  center.y = array[startingIndex++];
  center.z = array[startingIndex++];
  result.radius = array[startingIndex];
  return result;
};
var unionScratch = new Cartesian3_default();
var unionScratchCenter = new Cartesian3_default();
BoundingSphere.union = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const leftCenter = left.center;
  const leftRadius = left.radius;
  const rightCenter = right.center;
  const rightRadius = right.radius;
  const toRightCenter = Cartesian3_default.subtract(
    rightCenter,
    leftCenter,
    unionScratch
  );
  const centerSeparation = Cartesian3_default.magnitude(toRightCenter);
  if (leftRadius >= centerSeparation + rightRadius) {
    left.clone(result);
    return result;
  }
  if (rightRadius >= centerSeparation + leftRadius) {
    right.clone(result);
    return result;
  }
  const halfDistanceBetweenTangentPoints = (leftRadius + centerSeparation + rightRadius) * 0.5;
  const center = Cartesian3_default.multiplyByScalar(
    toRightCenter,
    (-leftRadius + halfDistanceBetweenTangentPoints) / centerSeparation,
    unionScratchCenter
  );
  Cartesian3_default.add(center, leftCenter, center);
  Cartesian3_default.clone(center, result.center);
  result.radius = halfDistanceBetweenTangentPoints;
  return result;
};
var expandScratch = new Cartesian3_default();
BoundingSphere.expand = function(sphere, point, result) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("point", point);
  result = BoundingSphere.clone(sphere, result);
  const radius = Cartesian3_default.magnitude(
    Cartesian3_default.subtract(point, result.center, expandScratch)
  );
  if (radius > result.radius) {
    result.radius = radius;
  }
  return result;
};
BoundingSphere.intersectPlane = function(sphere, plane) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("plane", plane);
  const center = sphere.center;
  const radius = sphere.radius;
  const normal = plane.normal;
  const distanceToPlane = Cartesian3_default.dot(normal, center) + plane.distance;
  if (distanceToPlane < -radius) {
    return Intersect_default.OUTSIDE;
  } else if (distanceToPlane < radius) {
    return Intersect_default.INTERSECTING;
  }
  return Intersect_default.INSIDE;
};
BoundingSphere.transform = function(sphere, transform, result) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("transform", transform);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  result.center = Matrix4_default.multiplyByPoint(
    transform,
    sphere.center,
    result.center
  );
  result.radius = Matrix4_default.getMaximumScale(transform) * sphere.radius;
  return result;
};
var distanceSquaredToScratch = new Cartesian3_default();
BoundingSphere.distanceSquaredTo = function(sphere, cartesian) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("cartesian", cartesian);
  const diff = Cartesian3_default.subtract(
    sphere.center,
    cartesian,
    distanceSquaredToScratch
  );
  const distance = Cartesian3_default.magnitude(diff) - sphere.radius;
  if (distance <= 0) {
    return 0;
  }
  return distance * distance;
};
BoundingSphere.transformWithoutScale = function(sphere, transform, result) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("transform", transform);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  result.center = Matrix4_default.multiplyByPoint(
    transform,
    sphere.center,
    result.center
  );
  result.radius = sphere.radius;
  return result;
};
var scratchCartesian3 = new Cartesian3_default();
BoundingSphere.computePlaneDistances = function(sphere, position, direction, result) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("position", position);
  Check_default.typeOf.object("direction", direction);
  if (!defined_default(result)) {
    result = new Interval_default();
  }
  const toCenter = Cartesian3_default.subtract(
    sphere.center,
    position,
    scratchCartesian3
  );
  const mag = Cartesian3_default.dot(direction, toCenter);
  result.start = mag - sphere.radius;
  result.stop = mag + sphere.radius;
  return result;
};
var projectTo2DNormalScratch = new Cartesian3_default();
var projectTo2DEastScratch = new Cartesian3_default();
var projectTo2DNorthScratch = new Cartesian3_default();
var projectTo2DWestScratch = new Cartesian3_default();
var projectTo2DSouthScratch = new Cartesian3_default();
var projectTo2DCartographicScratch = new Cartographic_default();
var projectTo2DPositionsScratch = new Array(8);
for (let n = 0; n < 8; ++n) {
  projectTo2DPositionsScratch[n] = new Cartesian3_default();
}
var projectTo2DProjection = new GeographicProjection_default();
BoundingSphere.projectTo2D = function(sphere, projection, result) {
  Check_default.typeOf.object("sphere", sphere);
  projectTo2DProjection._ellipsoid = Ellipsoid_default.default;
  projection = defaultValue_default(projection, projectTo2DProjection);
  const ellipsoid = projection.ellipsoid;
  let center = sphere.center;
  const radius = sphere.radius;
  let normal;
  if (Cartesian3_default.equals(center, Cartesian3_default.ZERO)) {
    normal = Cartesian3_default.clone(Cartesian3_default.UNIT_X, projectTo2DNormalScratch);
  } else {
    normal = ellipsoid.geodeticSurfaceNormal(center, projectTo2DNormalScratch);
  }
  const east = Cartesian3_default.cross(
    Cartesian3_default.UNIT_Z,
    normal,
    projectTo2DEastScratch
  );
  Cartesian3_default.normalize(east, east);
  const north = Cartesian3_default.cross(normal, east, projectTo2DNorthScratch);
  Cartesian3_default.normalize(north, north);
  Cartesian3_default.multiplyByScalar(normal, radius, normal);
  Cartesian3_default.multiplyByScalar(north, radius, north);
  Cartesian3_default.multiplyByScalar(east, radius, east);
  const south = Cartesian3_default.negate(north, projectTo2DSouthScratch);
  const west = Cartesian3_default.negate(east, projectTo2DWestScratch);
  const positions = projectTo2DPositionsScratch;
  let corner = positions[0];
  Cartesian3_default.add(normal, north, corner);
  Cartesian3_default.add(corner, east, corner);
  corner = positions[1];
  Cartesian3_default.add(normal, north, corner);
  Cartesian3_default.add(corner, west, corner);
  corner = positions[2];
  Cartesian3_default.add(normal, south, corner);
  Cartesian3_default.add(corner, west, corner);
  corner = positions[3];
  Cartesian3_default.add(normal, south, corner);
  Cartesian3_default.add(corner, east, corner);
  Cartesian3_default.negate(normal, normal);
  corner = positions[4];
  Cartesian3_default.add(normal, north, corner);
  Cartesian3_default.add(corner, east, corner);
  corner = positions[5];
  Cartesian3_default.add(normal, north, corner);
  Cartesian3_default.add(corner, west, corner);
  corner = positions[6];
  Cartesian3_default.add(normal, south, corner);
  Cartesian3_default.add(corner, west, corner);
  corner = positions[7];
  Cartesian3_default.add(normal, south, corner);
  Cartesian3_default.add(corner, east, corner);
  const length = positions.length;
  for (let i = 0; i < length; ++i) {
    const position = positions[i];
    Cartesian3_default.add(center, position, position);
    const cartographic = ellipsoid.cartesianToCartographic(
      position,
      projectTo2DCartographicScratch
    );
    projection.project(cartographic, position);
  }
  result = BoundingSphere.fromPoints(positions, result);
  center = result.center;
  const x = center.x;
  const y = center.y;
  const z = center.z;
  center.x = z;
  center.y = x;
  center.z = y;
  return result;
};
BoundingSphere.isOccluded = function(sphere, occluder) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("occluder", occluder);
  return !occluder.isBoundingSphereVisible(sphere);
};
BoundingSphere.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && Cartesian3_default.equals(left.center, right.center) && left.radius === right.radius;
};
BoundingSphere.prototype.intersectPlane = function(plane) {
  return BoundingSphere.intersectPlane(this, plane);
};
BoundingSphere.prototype.distanceSquaredTo = function(cartesian) {
  return BoundingSphere.distanceSquaredTo(this, cartesian);
};
BoundingSphere.prototype.computePlaneDistances = function(position, direction, result) {
  return BoundingSphere.computePlaneDistances(
    this,
    position,
    direction,
    result
  );
};
BoundingSphere.prototype.isOccluded = function(occluder) {
  return BoundingSphere.isOccluded(this, occluder);
};
BoundingSphere.prototype.equals = function(right) {
  return BoundingSphere.equals(this, right);
};
BoundingSphere.prototype.clone = function(result) {
  return BoundingSphere.clone(this, result);
};
BoundingSphere.prototype.volume = function() {
  const radius = this.radius;
  return volumeConstant * radius * radius * radius;
};
var BoundingSphere_default = BoundingSphere;

export {
  GeographicProjection_default,
  Intersect_default,
  Interval_default,
  BoundingSphere_default
};
