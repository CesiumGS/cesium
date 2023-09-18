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
  GeographicProjection_default
} from "./chunk-FS4DCO6P.js";
import {
  Matrix2_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartesian3_default,
  Cartographic_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/RectangleGeometryLibrary.js
var cos = Math.cos;
var sin = Math.sin;
var sqrt = Math.sqrt;
var RectangleGeometryLibrary = {};
RectangleGeometryLibrary.computePosition = function(computedOptions, ellipsoid, computeST, row, col, position, st) {
  const radiiSquared = ellipsoid.radiiSquared;
  const nwCorner = computedOptions.nwCorner;
  const rectangle = computedOptions.boundingRectangle;
  let stLatitude = nwCorner.latitude - computedOptions.granYCos * row + col * computedOptions.granXSin;
  const cosLatitude = cos(stLatitude);
  const nZ = sin(stLatitude);
  const kZ = radiiSquared.z * nZ;
  let stLongitude = nwCorner.longitude + row * computedOptions.granYSin + col * computedOptions.granXCos;
  const nX = cosLatitude * cos(stLongitude);
  const nY = cosLatitude * sin(stLongitude);
  const kX = radiiSquared.x * nX;
  const kY = radiiSquared.y * nY;
  const gamma = sqrt(kX * nX + kY * nY + kZ * nZ);
  position.x = kX / gamma;
  position.y = kY / gamma;
  position.z = kZ / gamma;
  if (computeST) {
    const stNwCorner = computedOptions.stNwCorner;
    if (defined_default(stNwCorner)) {
      stLatitude = stNwCorner.latitude - computedOptions.stGranYCos * row + col * computedOptions.stGranXSin;
      stLongitude = stNwCorner.longitude + row * computedOptions.stGranYSin + col * computedOptions.stGranXCos;
      st.x = (stLongitude - computedOptions.stWest) * computedOptions.lonScalar;
      st.y = (stLatitude - computedOptions.stSouth) * computedOptions.latScalar;
    } else {
      st.x = (stLongitude - rectangle.west) * computedOptions.lonScalar;
      st.y = (stLatitude - rectangle.south) * computedOptions.latScalar;
    }
  }
};
var rotationMatrixScratch = new Matrix2_default();
var nwCartesian = new Cartesian3_default();
var centerScratch = new Cartographic_default();
var centerCartesian = new Cartesian3_default();
var proj = new GeographicProjection_default();
function getRotationOptions(nwCorner, rotation, granularityX, granularityY, center, width, height) {
  const cosRotation = Math.cos(rotation);
  const granYCos = granularityY * cosRotation;
  const granXCos = granularityX * cosRotation;
  const sinRotation = Math.sin(rotation);
  const granYSin = granularityY * sinRotation;
  const granXSin = granularityX * sinRotation;
  nwCartesian = proj.project(nwCorner, nwCartesian);
  nwCartesian = Cartesian3_default.subtract(nwCartesian, centerCartesian, nwCartesian);
  const rotationMatrix = Matrix2_default.fromRotation(rotation, rotationMatrixScratch);
  nwCartesian = Matrix2_default.multiplyByVector(
    rotationMatrix,
    nwCartesian,
    nwCartesian
  );
  nwCartesian = Cartesian3_default.add(nwCartesian, centerCartesian, nwCartesian);
  nwCorner = proj.unproject(nwCartesian, nwCorner);
  width -= 1;
  height -= 1;
  const latitude = nwCorner.latitude;
  const latitude0 = latitude + width * granXSin;
  const latitude1 = latitude - granYCos * height;
  const latitude2 = latitude - granYCos * height + width * granXSin;
  const north = Math.max(latitude, latitude0, latitude1, latitude2);
  const south = Math.min(latitude, latitude0, latitude1, latitude2);
  const longitude = nwCorner.longitude;
  const longitude0 = longitude + width * granXCos;
  const longitude1 = longitude + height * granYSin;
  const longitude2 = longitude + height * granYSin + width * granXCos;
  const east = Math.max(longitude, longitude0, longitude1, longitude2);
  const west = Math.min(longitude, longitude0, longitude1, longitude2);
  return {
    north,
    south,
    east,
    west,
    granYCos,
    granYSin,
    granXCos,
    granXSin,
    nwCorner
  };
}
RectangleGeometryLibrary.computeOptions = function(rectangle, granularity, rotation, stRotation, boundingRectangleScratch, nwCornerResult, stNwCornerResult) {
  let east = rectangle.east;
  let west = rectangle.west;
  let north = rectangle.north;
  let south = rectangle.south;
  let northCap = false;
  let southCap = false;
  if (north === Math_default.PI_OVER_TWO) {
    northCap = true;
  }
  if (south === -Math_default.PI_OVER_TWO) {
    southCap = true;
  }
  let dx;
  const dy = north - south;
  if (west > east) {
    dx = Math_default.TWO_PI - west + east;
  } else {
    dx = east - west;
  }
  const width = Math.ceil(dx / granularity) + 1;
  const height = Math.ceil(dy / granularity) + 1;
  const granularityX = dx / (width - 1);
  const granularityY = dy / (height - 1);
  const nwCorner = Rectangle_default.northwest(rectangle, nwCornerResult);
  const center = Rectangle_default.center(rectangle, centerScratch);
  if (rotation !== 0 || stRotation !== 0) {
    if (center.longitude < nwCorner.longitude) {
      center.longitude += Math_default.TWO_PI;
    }
    centerCartesian = proj.project(center, centerCartesian);
  }
  const granYCos = granularityY;
  const granXCos = granularityX;
  const granYSin = 0;
  const granXSin = 0;
  const boundingRectangle = Rectangle_default.clone(
    rectangle,
    boundingRectangleScratch
  );
  const computedOptions = {
    granYCos,
    granYSin,
    granXCos,
    granXSin,
    nwCorner,
    boundingRectangle,
    width,
    height,
    northCap,
    southCap
  };
  if (rotation !== 0) {
    const rotationOptions = getRotationOptions(
      nwCorner,
      rotation,
      granularityX,
      granularityY,
      center,
      width,
      height
    );
    north = rotationOptions.north;
    south = rotationOptions.south;
    east = rotationOptions.east;
    west = rotationOptions.west;
    if (north < -Math_default.PI_OVER_TWO || north > Math_default.PI_OVER_TWO || south < -Math_default.PI_OVER_TWO || south > Math_default.PI_OVER_TWO) {
      throw new DeveloperError_default(
        "Rotated rectangle is invalid.  It crosses over either the north or south pole."
      );
    }
    computedOptions.granYCos = rotationOptions.granYCos;
    computedOptions.granYSin = rotationOptions.granYSin;
    computedOptions.granXCos = rotationOptions.granXCos;
    computedOptions.granXSin = rotationOptions.granXSin;
    boundingRectangle.north = north;
    boundingRectangle.south = south;
    boundingRectangle.east = east;
    boundingRectangle.west = west;
  }
  if (stRotation !== 0) {
    rotation = rotation - stRotation;
    const stNwCorner = Rectangle_default.northwest(boundingRectangle, stNwCornerResult);
    const stRotationOptions = getRotationOptions(
      stNwCorner,
      rotation,
      granularityX,
      granularityY,
      center,
      width,
      height
    );
    computedOptions.stGranYCos = stRotationOptions.granYCos;
    computedOptions.stGranXCos = stRotationOptions.granXCos;
    computedOptions.stGranYSin = stRotationOptions.granYSin;
    computedOptions.stGranXSin = stRotationOptions.granXSin;
    computedOptions.stNwCorner = stNwCorner;
    computedOptions.stWest = stRotationOptions.west;
    computedOptions.stSouth = stRotationOptions.south;
  }
  return computedOptions;
};
var RectangleGeometryLibrary_default = RectangleGeometryLibrary;

export {
  RectangleGeometryLibrary_default
};
