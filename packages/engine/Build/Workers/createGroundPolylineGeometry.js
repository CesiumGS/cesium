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
  WebMercatorProjection_default
} from "./chunk-BWREGNKG.js";
import {
  ArcType_default
} from "./chunk-7ZN7OZXO.js";
import {
  EncodedCartesian3_default
} from "./chunk-54JVCS3Y.js";
import {
  EllipsoidGeodesic_default
} from "./chunk-DAY2RGWJ.js";
import {
  arrayRemoveDuplicates_default
} from "./chunk-PZS6RNLR.js";
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
  GeometryAttribute_default,
  Geometry_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default,
  GeographicProjection_default,
  Quaternion_default,
  Resource_default,
  buildModuleUrl_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import {
  Cartesian2_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
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

// packages/engine/Source/Core/GeographicTilingScheme.js
function GeographicTilingScheme(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this._ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  this._rectangle = defaultValue_default(options.rectangle, Rectangle_default.MAX_VALUE);
  this._projection = new GeographicProjection_default(this._ellipsoid);
  this._numberOfLevelZeroTilesX = defaultValue_default(
    options.numberOfLevelZeroTilesX,
    2
  );
  this._numberOfLevelZeroTilesY = defaultValue_default(
    options.numberOfLevelZeroTilesY,
    1
  );
}
Object.defineProperties(GeographicTilingScheme.prototype, {
  /**
   * Gets the ellipsoid that is tiled by this tiling scheme.
   * @memberof GeographicTilingScheme.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function() {
      return this._ellipsoid;
    }
  },
  /**
   * Gets the rectangle, in radians, covered by this tiling scheme.
   * @memberof GeographicTilingScheme.prototype
   * @type {Rectangle}
   */
  rectangle: {
    get: function() {
      return this._rectangle;
    }
  },
  /**
   * Gets the map projection used by this tiling scheme.
   * @memberof GeographicTilingScheme.prototype
   * @type {MapProjection}
   */
  projection: {
    get: function() {
      return this._projection;
    }
  }
});
GeographicTilingScheme.prototype.getNumberOfXTilesAtLevel = function(level) {
  return this._numberOfLevelZeroTilesX << level;
};
GeographicTilingScheme.prototype.getNumberOfYTilesAtLevel = function(level) {
  return this._numberOfLevelZeroTilesY << level;
};
GeographicTilingScheme.prototype.rectangleToNativeRectangle = function(rectangle, result) {
  Check_default.defined("rectangle", rectangle);
  const west = Math_default.toDegrees(rectangle.west);
  const south = Math_default.toDegrees(rectangle.south);
  const east = Math_default.toDegrees(rectangle.east);
  const north = Math_default.toDegrees(rectangle.north);
  if (!defined_default(result)) {
    return new Rectangle_default(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
GeographicTilingScheme.prototype.tileXYToNativeRectangle = function(x, y, level, result) {
  const rectangleRadians = this.tileXYToRectangle(x, y, level, result);
  rectangleRadians.west = Math_default.toDegrees(rectangleRadians.west);
  rectangleRadians.south = Math_default.toDegrees(rectangleRadians.south);
  rectangleRadians.east = Math_default.toDegrees(rectangleRadians.east);
  rectangleRadians.north = Math_default.toDegrees(rectangleRadians.north);
  return rectangleRadians;
};
GeographicTilingScheme.prototype.tileXYToRectangle = function(x, y, level, result) {
  const rectangle = this._rectangle;
  const xTiles = this.getNumberOfXTilesAtLevel(level);
  const yTiles = this.getNumberOfYTilesAtLevel(level);
  const xTileWidth = rectangle.width / xTiles;
  const west = x * xTileWidth + rectangle.west;
  const east = (x + 1) * xTileWidth + rectangle.west;
  const yTileHeight = rectangle.height / yTiles;
  const north = rectangle.north - y * yTileHeight;
  const south = rectangle.north - (y + 1) * yTileHeight;
  if (!defined_default(result)) {
    result = new Rectangle_default(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
GeographicTilingScheme.prototype.positionToTileXY = function(position, level, result) {
  const rectangle = this._rectangle;
  if (!Rectangle_default.contains(rectangle, position)) {
    return void 0;
  }
  const xTiles = this.getNumberOfXTilesAtLevel(level);
  const yTiles = this.getNumberOfYTilesAtLevel(level);
  const xTileWidth = rectangle.width / xTiles;
  const yTileHeight = rectangle.height / yTiles;
  let longitude = position.longitude;
  if (rectangle.east < rectangle.west) {
    longitude += Math_default.TWO_PI;
  }
  let xTileCoordinate = (longitude - rectangle.west) / xTileWidth | 0;
  if (xTileCoordinate >= xTiles) {
    xTileCoordinate = xTiles - 1;
  }
  let yTileCoordinate = (rectangle.north - position.latitude) / yTileHeight | 0;
  if (yTileCoordinate >= yTiles) {
    yTileCoordinate = yTiles - 1;
  }
  if (!defined_default(result)) {
    return new Cartesian2_default(xTileCoordinate, yTileCoordinate);
  }
  result.x = xTileCoordinate;
  result.y = yTileCoordinate;
  return result;
};
var GeographicTilingScheme_default = GeographicTilingScheme;

// packages/engine/Source/Core/ApproximateTerrainHeights.js
var scratchDiagonalCartesianNE = new Cartesian3_default();
var scratchDiagonalCartesianSW = new Cartesian3_default();
var scratchDiagonalCartographic = new Cartographic_default();
var scratchCenterCartesian = new Cartesian3_default();
var scratchSurfaceCartesian = new Cartesian3_default();
var scratchBoundingSphere = new BoundingSphere_default();
var tilingScheme = new GeographicTilingScheme_default();
var scratchCorners = [
  new Cartographic_default(),
  new Cartographic_default(),
  new Cartographic_default(),
  new Cartographic_default()
];
var scratchTileXY = new Cartesian2_default();
var ApproximateTerrainHeights = {};
ApproximateTerrainHeights.initialize = function() {
  let initPromise = ApproximateTerrainHeights._initPromise;
  if (defined_default(initPromise)) {
    return initPromise;
  }
  initPromise = Resource_default.fetchJson(
    buildModuleUrl_default("Assets/approximateTerrainHeights.json")
  ).then(function(json) {
    ApproximateTerrainHeights._terrainHeights = json;
  });
  ApproximateTerrainHeights._initPromise = initPromise;
  return initPromise;
};
ApproximateTerrainHeights.getMinimumMaximumHeights = function(rectangle, ellipsoid) {
  Check_default.defined("rectangle", rectangle);
  if (!defined_default(ApproximateTerrainHeights._terrainHeights)) {
    throw new DeveloperError_default(
      "You must call ApproximateTerrainHeights.initialize and wait for the promise to resolve before using this function"
    );
  }
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  const xyLevel = getTileXYLevel(rectangle);
  let minTerrainHeight = ApproximateTerrainHeights._defaultMinTerrainHeight;
  let maxTerrainHeight = ApproximateTerrainHeights._defaultMaxTerrainHeight;
  if (defined_default(xyLevel)) {
    const key = `${xyLevel.level}-${xyLevel.x}-${xyLevel.y}`;
    const heights = ApproximateTerrainHeights._terrainHeights[key];
    if (defined_default(heights)) {
      minTerrainHeight = heights[0];
      maxTerrainHeight = heights[1];
    }
    ellipsoid.cartographicToCartesian(
      Rectangle_default.northeast(rectangle, scratchDiagonalCartographic),
      scratchDiagonalCartesianNE
    );
    ellipsoid.cartographicToCartesian(
      Rectangle_default.southwest(rectangle, scratchDiagonalCartographic),
      scratchDiagonalCartesianSW
    );
    Cartesian3_default.midpoint(
      scratchDiagonalCartesianSW,
      scratchDiagonalCartesianNE,
      scratchCenterCartesian
    );
    const surfacePosition = ellipsoid.scaleToGeodeticSurface(
      scratchCenterCartesian,
      scratchSurfaceCartesian
    );
    if (defined_default(surfacePosition)) {
      const distance = Cartesian3_default.distance(
        scratchCenterCartesian,
        surfacePosition
      );
      minTerrainHeight = Math.min(minTerrainHeight, -distance);
    } else {
      minTerrainHeight = ApproximateTerrainHeights._defaultMinTerrainHeight;
    }
  }
  minTerrainHeight = Math.max(
    ApproximateTerrainHeights._defaultMinTerrainHeight,
    minTerrainHeight
  );
  return {
    minimumTerrainHeight: minTerrainHeight,
    maximumTerrainHeight: maxTerrainHeight
  };
};
ApproximateTerrainHeights.getBoundingSphere = function(rectangle, ellipsoid) {
  Check_default.defined("rectangle", rectangle);
  if (!defined_default(ApproximateTerrainHeights._terrainHeights)) {
    throw new DeveloperError_default(
      "You must call ApproximateTerrainHeights.initialize and wait for the promise to resolve before using this function"
    );
  }
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  const xyLevel = getTileXYLevel(rectangle);
  let maxTerrainHeight = ApproximateTerrainHeights._defaultMaxTerrainHeight;
  if (defined_default(xyLevel)) {
    const key = `${xyLevel.level}-${xyLevel.x}-${xyLevel.y}`;
    const heights = ApproximateTerrainHeights._terrainHeights[key];
    if (defined_default(heights)) {
      maxTerrainHeight = heights[1];
    }
  }
  const result = BoundingSphere_default.fromRectangle3D(rectangle, ellipsoid, 0);
  BoundingSphere_default.fromRectangle3D(
    rectangle,
    ellipsoid,
    maxTerrainHeight,
    scratchBoundingSphere
  );
  return BoundingSphere_default.union(result, scratchBoundingSphere, result);
};
function getTileXYLevel(rectangle) {
  Cartographic_default.fromRadians(
    rectangle.east,
    rectangle.north,
    0,
    scratchCorners[0]
  );
  Cartographic_default.fromRadians(
    rectangle.west,
    rectangle.north,
    0,
    scratchCorners[1]
  );
  Cartographic_default.fromRadians(
    rectangle.east,
    rectangle.south,
    0,
    scratchCorners[2]
  );
  Cartographic_default.fromRadians(
    rectangle.west,
    rectangle.south,
    0,
    scratchCorners[3]
  );
  let lastLevelX = 0, lastLevelY = 0;
  let currentX = 0, currentY = 0;
  const maxLevel = ApproximateTerrainHeights._terrainHeightsMaxLevel;
  let i;
  for (i = 0; i <= maxLevel; ++i) {
    let failed = false;
    for (let j = 0; j < 4; ++j) {
      const corner = scratchCorners[j];
      tilingScheme.positionToTileXY(corner, i, scratchTileXY);
      if (j === 0) {
        currentX = scratchTileXY.x;
        currentY = scratchTileXY.y;
      } else if (currentX !== scratchTileXY.x || currentY !== scratchTileXY.y) {
        failed = true;
        break;
      }
    }
    if (failed) {
      break;
    }
    lastLevelX = currentX;
    lastLevelY = currentY;
  }
  if (i === 0) {
    return void 0;
  }
  return {
    x: lastLevelX,
    y: lastLevelY,
    level: i > maxLevel ? maxLevel : i - 1
  };
}
ApproximateTerrainHeights._terrainHeightsMaxLevel = 6;
ApproximateTerrainHeights._defaultMaxTerrainHeight = 9e3;
ApproximateTerrainHeights._defaultMinTerrainHeight = -1e5;
ApproximateTerrainHeights._terrainHeights = void 0;
ApproximateTerrainHeights._initPromise = void 0;
Object.defineProperties(ApproximateTerrainHeights, {
  /**
   * Determines if the terrain heights are initialized and ready to use. To initialize the terrain heights,
   * call {@link ApproximateTerrainHeights#initialize} and wait for the returned promise to resolve.
   * @type {boolean}
   * @readonly
   * @memberof ApproximateTerrainHeights
   */
  initialized: {
    get: function() {
      return defined_default(ApproximateTerrainHeights._terrainHeights);
    }
  }
});
var ApproximateTerrainHeights_default = ApproximateTerrainHeights;

// packages/engine/Source/Core/GroundPolylineGeometry.js
var PROJECTIONS = [GeographicProjection_default, WebMercatorProjection_default];
var PROJECTION_COUNT = PROJECTIONS.length;
var MITER_BREAK_SMALL = Math.cos(Math_default.toRadians(30));
var MITER_BREAK_LARGE = Math.cos(Math_default.toRadians(150));
var WALL_INITIAL_MIN_HEIGHT = 0;
var WALL_INITIAL_MAX_HEIGHT = 1e3;
function GroundPolylineGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const positions = options.positions;
  if (!defined_default(positions) || positions.length < 2) {
    throw new DeveloperError_default("At least two positions are required.");
  }
  if (defined_default(options.arcType) && options.arcType !== ArcType_default.GEODESIC && options.arcType !== ArcType_default.RHUMB) {
    throw new DeveloperError_default(
      "Valid options for arcType are ArcType.GEODESIC and ArcType.RHUMB."
    );
  }
  this.width = defaultValue_default(options.width, 1);
  this._positions = positions;
  this.granularity = defaultValue_default(options.granularity, 9999);
  this.loop = defaultValue_default(options.loop, false);
  this.arcType = defaultValue_default(options.arcType, ArcType_default.GEODESIC);
  this._ellipsoid = Ellipsoid_default.WGS84;
  this._projectionIndex = 0;
  this._workerName = "createGroundPolylineGeometry";
  this._scene3DOnly = false;
}
Object.defineProperties(GroundPolylineGeometry.prototype, {
  /**
   * The number of elements used to pack the object into an array.
   * @memberof GroundPolylineGeometry.prototype
   * @type {number}
   * @readonly
   * @private
   */
  packedLength: {
    get: function() {
      return 1 + this._positions.length * 3 + 1 + 1 + 1 + Ellipsoid_default.packedLength + 1 + 1;
    }
  }
});
GroundPolylineGeometry.setProjectionAndEllipsoid = function(groundPolylineGeometry, mapProjection) {
  let projectionIndex = 0;
  for (let i = 0; i < PROJECTION_COUNT; i++) {
    if (mapProjection instanceof PROJECTIONS[i]) {
      projectionIndex = i;
      break;
    }
  }
  groundPolylineGeometry._projectionIndex = projectionIndex;
  groundPolylineGeometry._ellipsoid = mapProjection.ellipsoid;
};
var cart3Scratch1 = new Cartesian3_default();
var cart3Scratch2 = new Cartesian3_default();
var cart3Scratch3 = new Cartesian3_default();
function computeRightNormal(start, end, maxHeight, ellipsoid, result) {
  const startBottom = getPosition(ellipsoid, start, 0, cart3Scratch1);
  const startTop = getPosition(ellipsoid, start, maxHeight, cart3Scratch2);
  const endBottom = getPosition(ellipsoid, end, 0, cart3Scratch3);
  const up = direction(startTop, startBottom, cart3Scratch2);
  const forward = direction(endBottom, startBottom, cart3Scratch3);
  Cartesian3_default.cross(forward, up, result);
  return Cartesian3_default.normalize(result, result);
}
var interpolatedCartographicScratch = new Cartographic_default();
var interpolatedBottomScratch = new Cartesian3_default();
var interpolatedTopScratch = new Cartesian3_default();
var interpolatedNormalScratch = new Cartesian3_default();
function interpolateSegment(start, end, minHeight, maxHeight, granularity, arcType, ellipsoid, normalsArray, bottomPositionsArray, topPositionsArray, cartographicsArray) {
  if (granularity === 0) {
    return;
  }
  let ellipsoidLine;
  if (arcType === ArcType_default.GEODESIC) {
    ellipsoidLine = new EllipsoidGeodesic_default(start, end, ellipsoid);
  } else if (arcType === ArcType_default.RHUMB) {
    ellipsoidLine = new EllipsoidRhumbLine_default(start, end, ellipsoid);
  }
  const surfaceDistance = ellipsoidLine.surfaceDistance;
  if (surfaceDistance < granularity) {
    return;
  }
  const interpolatedNormal = computeRightNormal(
    start,
    end,
    maxHeight,
    ellipsoid,
    interpolatedNormalScratch
  );
  const segments = Math.ceil(surfaceDistance / granularity);
  const interpointDistance = surfaceDistance / segments;
  let distanceFromStart = interpointDistance;
  const pointsToAdd = segments - 1;
  let packIndex = normalsArray.length;
  for (let i = 0; i < pointsToAdd; i++) {
    const interpolatedCartographic = ellipsoidLine.interpolateUsingSurfaceDistance(
      distanceFromStart,
      interpolatedCartographicScratch
    );
    const interpolatedBottom = getPosition(
      ellipsoid,
      interpolatedCartographic,
      minHeight,
      interpolatedBottomScratch
    );
    const interpolatedTop = getPosition(
      ellipsoid,
      interpolatedCartographic,
      maxHeight,
      interpolatedTopScratch
    );
    Cartesian3_default.pack(interpolatedNormal, normalsArray, packIndex);
    Cartesian3_default.pack(interpolatedBottom, bottomPositionsArray, packIndex);
    Cartesian3_default.pack(interpolatedTop, topPositionsArray, packIndex);
    cartographicsArray.push(interpolatedCartographic.latitude);
    cartographicsArray.push(interpolatedCartographic.longitude);
    packIndex += 3;
    distanceFromStart += interpointDistance;
  }
}
var heightlessCartographicScratch = new Cartographic_default();
function getPosition(ellipsoid, cartographic, height, result) {
  Cartographic_default.clone(cartographic, heightlessCartographicScratch);
  heightlessCartographicScratch.height = height;
  return Cartographic_default.toCartesian(
    heightlessCartographicScratch,
    ellipsoid,
    result
  );
}
GroundPolylineGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  let index = defaultValue_default(startingIndex, 0);
  const positions = value._positions;
  const positionsLength = positions.length;
  array[index++] = positionsLength;
  for (let i = 0; i < positionsLength; ++i) {
    const cartesian = positions[i];
    Cartesian3_default.pack(cartesian, array, index);
    index += 3;
  }
  array[index++] = value.granularity;
  array[index++] = value.loop ? 1 : 0;
  array[index++] = value.arcType;
  Ellipsoid_default.pack(value._ellipsoid, array, index);
  index += Ellipsoid_default.packedLength;
  array[index++] = value._projectionIndex;
  array[index++] = value._scene3DOnly ? 1 : 0;
  return array;
};
GroundPolylineGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  let index = defaultValue_default(startingIndex, 0);
  const positionsLength = array[index++];
  const positions = new Array(positionsLength);
  for (let i = 0; i < positionsLength; i++) {
    positions[i] = Cartesian3_default.unpack(array, index);
    index += 3;
  }
  const granularity = array[index++];
  const loop = array[index++] === 1;
  const arcType = array[index++];
  const ellipsoid = Ellipsoid_default.unpack(array, index);
  index += Ellipsoid_default.packedLength;
  const projectionIndex = array[index++];
  const scene3DOnly = array[index++] === 1;
  if (!defined_default(result)) {
    result = new GroundPolylineGeometry({
      positions
    });
  }
  result._positions = positions;
  result.granularity = granularity;
  result.loop = loop;
  result.arcType = arcType;
  result._ellipsoid = ellipsoid;
  result._projectionIndex = projectionIndex;
  result._scene3DOnly = scene3DOnly;
  return result;
};
function direction(target, origin, result) {
  Cartesian3_default.subtract(target, origin, result);
  Cartesian3_default.normalize(result, result);
  return result;
}
function tangentDirection(target, origin, up, result) {
  result = direction(target, origin, result);
  result = Cartesian3_default.cross(result, up, result);
  result = Cartesian3_default.normalize(result, result);
  result = Cartesian3_default.cross(up, result, result);
  return result;
}
var toPreviousScratch = new Cartesian3_default();
var toNextScratch = new Cartesian3_default();
var forwardScratch = new Cartesian3_default();
var vertexUpScratch = new Cartesian3_default();
var cosine90 = 0;
var cosine180 = -1;
function computeVertexMiterNormal(previousBottom, vertexBottom, vertexTop, nextBottom, result) {
  const up = direction(vertexTop, vertexBottom, vertexUpScratch);
  const toPrevious = tangentDirection(
    previousBottom,
    vertexBottom,
    up,
    toPreviousScratch
  );
  const toNext = tangentDirection(nextBottom, vertexBottom, up, toNextScratch);
  if (Math_default.equalsEpsilon(
    Cartesian3_default.dot(toPrevious, toNext),
    cosine180,
    Math_default.EPSILON5
  )) {
    result = Cartesian3_default.cross(up, toPrevious, result);
    result = Cartesian3_default.normalize(result, result);
    return result;
  }
  result = Cartesian3_default.add(toNext, toPrevious, result);
  result = Cartesian3_default.normalize(result, result);
  const forward = Cartesian3_default.cross(up, result, forwardScratch);
  if (Cartesian3_default.dot(toNext, forward) < cosine90) {
    result = Cartesian3_default.negate(result, result);
  }
  return result;
}
var XZ_PLANE = Plane_default.fromPointNormal(Cartesian3_default.ZERO, Cartesian3_default.UNIT_Y);
var previousBottomScratch = new Cartesian3_default();
var vertexBottomScratch = new Cartesian3_default();
var vertexTopScratch = new Cartesian3_default();
var nextBottomScratch = new Cartesian3_default();
var vertexNormalScratch = new Cartesian3_default();
var intersectionScratch = new Cartesian3_default();
var cartographicScratch0 = new Cartographic_default();
var cartographicScratch1 = new Cartographic_default();
var cartographicIntersectionScratch = new Cartographic_default();
GroundPolylineGeometry.createGeometry = function(groundPolylineGeometry) {
  const compute2dAttributes = !groundPolylineGeometry._scene3DOnly;
  let loop = groundPolylineGeometry.loop;
  const ellipsoid = groundPolylineGeometry._ellipsoid;
  const granularity = groundPolylineGeometry.granularity;
  const arcType = groundPolylineGeometry.arcType;
  const projection = new PROJECTIONS[groundPolylineGeometry._projectionIndex](
    ellipsoid
  );
  const minHeight = WALL_INITIAL_MIN_HEIGHT;
  const maxHeight = WALL_INITIAL_MAX_HEIGHT;
  let index;
  let i;
  const positions = groundPolylineGeometry._positions;
  const positionsLength = positions.length;
  if (positionsLength === 2) {
    loop = false;
  }
  let p0;
  let p1;
  let c0;
  let c1;
  const rhumbLine = new EllipsoidRhumbLine_default(void 0, void 0, ellipsoid);
  let intersection;
  let intersectionCartographic;
  let intersectionLongitude;
  const splitPositions = [positions[0]];
  for (i = 0; i < positionsLength - 1; i++) {
    p0 = positions[i];
    p1 = positions[i + 1];
    intersection = IntersectionTests_default.lineSegmentPlane(
      p0,
      p1,
      XZ_PLANE,
      intersectionScratch
    );
    if (defined_default(intersection) && !Cartesian3_default.equalsEpsilon(intersection, p0, Math_default.EPSILON7) && !Cartesian3_default.equalsEpsilon(intersection, p1, Math_default.EPSILON7)) {
      if (groundPolylineGeometry.arcType === ArcType_default.GEODESIC) {
        splitPositions.push(Cartesian3_default.clone(intersection));
      } else if (groundPolylineGeometry.arcType === ArcType_default.RHUMB) {
        intersectionLongitude = ellipsoid.cartesianToCartographic(
          intersection,
          cartographicScratch0
        ).longitude;
        c0 = ellipsoid.cartesianToCartographic(p0, cartographicScratch0);
        c1 = ellipsoid.cartesianToCartographic(p1, cartographicScratch1);
        rhumbLine.setEndPoints(c0, c1);
        intersectionCartographic = rhumbLine.findIntersectionWithLongitude(
          intersectionLongitude,
          cartographicIntersectionScratch
        );
        intersection = ellipsoid.cartographicToCartesian(
          intersectionCartographic,
          intersectionScratch
        );
        if (defined_default(intersection) && !Cartesian3_default.equalsEpsilon(intersection, p0, Math_default.EPSILON7) && !Cartesian3_default.equalsEpsilon(intersection, p1, Math_default.EPSILON7)) {
          splitPositions.push(Cartesian3_default.clone(intersection));
        }
      }
    }
    splitPositions.push(p1);
  }
  if (loop) {
    p0 = positions[positionsLength - 1];
    p1 = positions[0];
    intersection = IntersectionTests_default.lineSegmentPlane(
      p0,
      p1,
      XZ_PLANE,
      intersectionScratch
    );
    if (defined_default(intersection) && !Cartesian3_default.equalsEpsilon(intersection, p0, Math_default.EPSILON7) && !Cartesian3_default.equalsEpsilon(intersection, p1, Math_default.EPSILON7)) {
      if (groundPolylineGeometry.arcType === ArcType_default.GEODESIC) {
        splitPositions.push(Cartesian3_default.clone(intersection));
      } else if (groundPolylineGeometry.arcType === ArcType_default.RHUMB) {
        intersectionLongitude = ellipsoid.cartesianToCartographic(
          intersection,
          cartographicScratch0
        ).longitude;
        c0 = ellipsoid.cartesianToCartographic(p0, cartographicScratch0);
        c1 = ellipsoid.cartesianToCartographic(p1, cartographicScratch1);
        rhumbLine.setEndPoints(c0, c1);
        intersectionCartographic = rhumbLine.findIntersectionWithLongitude(
          intersectionLongitude,
          cartographicIntersectionScratch
        );
        intersection = ellipsoid.cartographicToCartesian(
          intersectionCartographic,
          intersectionScratch
        );
        if (defined_default(intersection) && !Cartesian3_default.equalsEpsilon(intersection, p0, Math_default.EPSILON7) && !Cartesian3_default.equalsEpsilon(intersection, p1, Math_default.EPSILON7)) {
          splitPositions.push(Cartesian3_default.clone(intersection));
        }
      }
    }
  }
  let cartographicsLength = splitPositions.length;
  let cartographics = new Array(cartographicsLength);
  for (i = 0; i < cartographicsLength; i++) {
    const cartographic = Cartographic_default.fromCartesian(
      splitPositions[i],
      ellipsoid
    );
    cartographic.height = 0;
    cartographics[i] = cartographic;
  }
  cartographics = arrayRemoveDuplicates_default(
    cartographics,
    Cartographic_default.equalsEpsilon
  );
  cartographicsLength = cartographics.length;
  if (cartographicsLength < 2) {
    return void 0;
  }
  const cartographicsArray = [];
  const normalsArray = [];
  const bottomPositionsArray = [];
  const topPositionsArray = [];
  let previousBottom = previousBottomScratch;
  let vertexBottom = vertexBottomScratch;
  let vertexTop = vertexTopScratch;
  let nextBottom = nextBottomScratch;
  let vertexNormal = vertexNormalScratch;
  const startCartographic = cartographics[0];
  const nextCartographic = cartographics[1];
  const prestartCartographic = cartographics[cartographicsLength - 1];
  previousBottom = getPosition(
    ellipsoid,
    prestartCartographic,
    minHeight,
    previousBottom
  );
  nextBottom = getPosition(ellipsoid, nextCartographic, minHeight, nextBottom);
  vertexBottom = getPosition(
    ellipsoid,
    startCartographic,
    minHeight,
    vertexBottom
  );
  vertexTop = getPosition(ellipsoid, startCartographic, maxHeight, vertexTop);
  if (loop) {
    vertexNormal = computeVertexMiterNormal(
      previousBottom,
      vertexBottom,
      vertexTop,
      nextBottom,
      vertexNormal
    );
  } else {
    vertexNormal = computeRightNormal(
      startCartographic,
      nextCartographic,
      maxHeight,
      ellipsoid,
      vertexNormal
    );
  }
  Cartesian3_default.pack(vertexNormal, normalsArray, 0);
  Cartesian3_default.pack(vertexBottom, bottomPositionsArray, 0);
  Cartesian3_default.pack(vertexTop, topPositionsArray, 0);
  cartographicsArray.push(startCartographic.latitude);
  cartographicsArray.push(startCartographic.longitude);
  interpolateSegment(
    startCartographic,
    nextCartographic,
    minHeight,
    maxHeight,
    granularity,
    arcType,
    ellipsoid,
    normalsArray,
    bottomPositionsArray,
    topPositionsArray,
    cartographicsArray
  );
  for (i = 1; i < cartographicsLength - 1; ++i) {
    previousBottom = Cartesian3_default.clone(vertexBottom, previousBottom);
    vertexBottom = Cartesian3_default.clone(nextBottom, vertexBottom);
    const vertexCartographic = cartographics[i];
    getPosition(ellipsoid, vertexCartographic, maxHeight, vertexTop);
    getPosition(ellipsoid, cartographics[i + 1], minHeight, nextBottom);
    computeVertexMiterNormal(
      previousBottom,
      vertexBottom,
      vertexTop,
      nextBottom,
      vertexNormal
    );
    index = normalsArray.length;
    Cartesian3_default.pack(vertexNormal, normalsArray, index);
    Cartesian3_default.pack(vertexBottom, bottomPositionsArray, index);
    Cartesian3_default.pack(vertexTop, topPositionsArray, index);
    cartographicsArray.push(vertexCartographic.latitude);
    cartographicsArray.push(vertexCartographic.longitude);
    interpolateSegment(
      cartographics[i],
      cartographics[i + 1],
      minHeight,
      maxHeight,
      granularity,
      arcType,
      ellipsoid,
      normalsArray,
      bottomPositionsArray,
      topPositionsArray,
      cartographicsArray
    );
  }
  const endCartographic = cartographics[cartographicsLength - 1];
  const preEndCartographic = cartographics[cartographicsLength - 2];
  vertexBottom = getPosition(
    ellipsoid,
    endCartographic,
    minHeight,
    vertexBottom
  );
  vertexTop = getPosition(ellipsoid, endCartographic, maxHeight, vertexTop);
  if (loop) {
    const postEndCartographic = cartographics[0];
    previousBottom = getPosition(
      ellipsoid,
      preEndCartographic,
      minHeight,
      previousBottom
    );
    nextBottom = getPosition(
      ellipsoid,
      postEndCartographic,
      minHeight,
      nextBottom
    );
    vertexNormal = computeVertexMiterNormal(
      previousBottom,
      vertexBottom,
      vertexTop,
      nextBottom,
      vertexNormal
    );
  } else {
    vertexNormal = computeRightNormal(
      preEndCartographic,
      endCartographic,
      maxHeight,
      ellipsoid,
      vertexNormal
    );
  }
  index = normalsArray.length;
  Cartesian3_default.pack(vertexNormal, normalsArray, index);
  Cartesian3_default.pack(vertexBottom, bottomPositionsArray, index);
  Cartesian3_default.pack(vertexTop, topPositionsArray, index);
  cartographicsArray.push(endCartographic.latitude);
  cartographicsArray.push(endCartographic.longitude);
  if (loop) {
    interpolateSegment(
      endCartographic,
      startCartographic,
      minHeight,
      maxHeight,
      granularity,
      arcType,
      ellipsoid,
      normalsArray,
      bottomPositionsArray,
      topPositionsArray,
      cartographicsArray
    );
    index = normalsArray.length;
    for (i = 0; i < 3; ++i) {
      normalsArray[index + i] = normalsArray[i];
      bottomPositionsArray[index + i] = bottomPositionsArray[i];
      topPositionsArray[index + i] = topPositionsArray[i];
    }
    cartographicsArray.push(startCartographic.latitude);
    cartographicsArray.push(startCartographic.longitude);
  }
  return generateGeometryAttributes(
    loop,
    projection,
    bottomPositionsArray,
    topPositionsArray,
    normalsArray,
    cartographicsArray,
    compute2dAttributes
  );
};
var lineDirectionScratch = new Cartesian3_default();
var matrix3Scratch = new Matrix3_default();
var quaternionScratch = new Quaternion_default();
function breakMiter(endGeometryNormal, startBottom, endBottom, endTop) {
  const lineDirection = direction(endBottom, startBottom, lineDirectionScratch);
  const dot = Cartesian3_default.dot(lineDirection, endGeometryNormal);
  if (dot > MITER_BREAK_SMALL || dot < MITER_BREAK_LARGE) {
    const vertexUp = direction(endTop, endBottom, vertexUpScratch);
    const angle = dot < MITER_BREAK_LARGE ? Math_default.PI_OVER_TWO : -Math_default.PI_OVER_TWO;
    const quaternion = Quaternion_default.fromAxisAngle(
      vertexUp,
      angle,
      quaternionScratch
    );
    const rotationMatrix = Matrix3_default.fromQuaternion(quaternion, matrix3Scratch);
    Matrix3_default.multiplyByVector(
      rotationMatrix,
      endGeometryNormal,
      endGeometryNormal
    );
    return true;
  }
  return false;
}
var endPosCartographicScratch = new Cartographic_default();
var normalStartpointScratch = new Cartesian3_default();
var normalEndpointScratch = new Cartesian3_default();
function projectNormal(projection, cartographic, normal, projectedPosition, result) {
  const position = Cartographic_default.toCartesian(
    cartographic,
    projection._ellipsoid,
    normalStartpointScratch
  );
  let normalEndpoint = Cartesian3_default.add(position, normal, normalEndpointScratch);
  let flipNormal = false;
  const ellipsoid = projection._ellipsoid;
  let normalEndpointCartographic = ellipsoid.cartesianToCartographic(
    normalEndpoint,
    endPosCartographicScratch
  );
  if (Math.abs(cartographic.longitude - normalEndpointCartographic.longitude) > Math_default.PI_OVER_TWO) {
    flipNormal = true;
    normalEndpoint = Cartesian3_default.subtract(
      position,
      normal,
      normalEndpointScratch
    );
    normalEndpointCartographic = ellipsoid.cartesianToCartographic(
      normalEndpoint,
      endPosCartographicScratch
    );
  }
  normalEndpointCartographic.height = 0;
  const normalEndpointProjected = projection.project(
    normalEndpointCartographic,
    result
  );
  result = Cartesian3_default.subtract(
    normalEndpointProjected,
    projectedPosition,
    result
  );
  result.z = 0;
  result = Cartesian3_default.normalize(result, result);
  if (flipNormal) {
    Cartesian3_default.negate(result, result);
  }
  return result;
}
var adjustHeightNormalScratch = new Cartesian3_default();
var adjustHeightOffsetScratch = new Cartesian3_default();
function adjustHeights(bottom, top, minHeight, maxHeight, adjustHeightBottom, adjustHeightTop) {
  const adjustHeightNormal = Cartesian3_default.subtract(
    top,
    bottom,
    adjustHeightNormalScratch
  );
  Cartesian3_default.normalize(adjustHeightNormal, adjustHeightNormal);
  const distanceForBottom = minHeight - WALL_INITIAL_MIN_HEIGHT;
  let adjustHeightOffset = Cartesian3_default.multiplyByScalar(
    adjustHeightNormal,
    distanceForBottom,
    adjustHeightOffsetScratch
  );
  Cartesian3_default.add(bottom, adjustHeightOffset, adjustHeightBottom);
  const distanceForTop = maxHeight - WALL_INITIAL_MAX_HEIGHT;
  adjustHeightOffset = Cartesian3_default.multiplyByScalar(
    adjustHeightNormal,
    distanceForTop,
    adjustHeightOffsetScratch
  );
  Cartesian3_default.add(top, adjustHeightOffset, adjustHeightTop);
}
var nudgeDirectionScratch = new Cartesian3_default();
function nudgeXZ(start, end) {
  const startToXZdistance = Plane_default.getPointDistance(XZ_PLANE, start);
  const endToXZdistance = Plane_default.getPointDistance(XZ_PLANE, end);
  let offset = nudgeDirectionScratch;
  if (Math_default.equalsEpsilon(startToXZdistance, 0, Math_default.EPSILON2)) {
    offset = direction(end, start, offset);
    Cartesian3_default.multiplyByScalar(offset, Math_default.EPSILON2, offset);
    Cartesian3_default.add(start, offset, start);
  } else if (Math_default.equalsEpsilon(endToXZdistance, 0, Math_default.EPSILON2)) {
    offset = direction(start, end, offset);
    Cartesian3_default.multiplyByScalar(offset, Math_default.EPSILON2, offset);
    Cartesian3_default.add(end, offset, end);
  }
}
function nudgeCartographic(start, end) {
  const absStartLon = Math.abs(start.longitude);
  const absEndLon = Math.abs(end.longitude);
  if (Math_default.equalsEpsilon(absStartLon, Math_default.PI, Math_default.EPSILON11)) {
    const endSign = Math_default.sign(end.longitude);
    start.longitude = endSign * (absStartLon - Math_default.EPSILON11);
    return 1;
  } else if (Math_default.equalsEpsilon(absEndLon, Math_default.PI, Math_default.EPSILON11)) {
    const startSign = Math_default.sign(start.longitude);
    end.longitude = startSign * (absEndLon - Math_default.EPSILON11);
    return 2;
  }
  return 0;
}
var startCartographicScratch = new Cartographic_default();
var endCartographicScratch = new Cartographic_default();
var segmentStartTopScratch = new Cartesian3_default();
var segmentEndTopScratch = new Cartesian3_default();
var segmentStartBottomScratch = new Cartesian3_default();
var segmentEndBottomScratch = new Cartesian3_default();
var segmentStartNormalScratch = new Cartesian3_default();
var segmentEndNormalScratch = new Cartesian3_default();
var getHeightCartographics = [
  startCartographicScratch,
  endCartographicScratch
];
var getHeightRectangleScratch = new Rectangle_default();
var adjustHeightStartTopScratch = new Cartesian3_default();
var adjustHeightEndTopScratch = new Cartesian3_default();
var adjustHeightStartBottomScratch = new Cartesian3_default();
var adjustHeightEndBottomScratch = new Cartesian3_default();
var segmentStart2DScratch = new Cartesian3_default();
var segmentEnd2DScratch = new Cartesian3_default();
var segmentStartNormal2DScratch = new Cartesian3_default();
var segmentEndNormal2DScratch = new Cartesian3_default();
var offsetScratch = new Cartesian3_default();
var startUpScratch = new Cartesian3_default();
var endUpScratch = new Cartesian3_default();
var rightScratch = new Cartesian3_default();
var startPlaneNormalScratch = new Cartesian3_default();
var endPlaneNormalScratch = new Cartesian3_default();
var encodeScratch = new EncodedCartesian3_default();
var encodeScratch2D = new EncodedCartesian3_default();
var forwardOffset2DScratch = new Cartesian3_default();
var right2DScratch = new Cartesian3_default();
var normalNudgeScratch = new Cartesian3_default();
var scratchBoundingSpheres = [new BoundingSphere_default(), new BoundingSphere_default()];
var REFERENCE_INDICES = [
  0,
  2,
  1,
  0,
  3,
  2,
  // right
  0,
  7,
  3,
  0,
  4,
  7,
  // start
  0,
  5,
  4,
  0,
  1,
  5,
  // bottom
  5,
  7,
  4,
  5,
  6,
  7,
  // left
  5,
  2,
  6,
  5,
  1,
  2,
  // end
  3,
  6,
  2,
  3,
  7,
  6
  // top
];
var REFERENCE_INDICES_LENGTH = REFERENCE_INDICES.length;
function generateGeometryAttributes(loop, projection, bottomPositionsArray, topPositionsArray, normalsArray, cartographicsArray, compute2dAttributes) {
  let i;
  let index;
  const ellipsoid = projection._ellipsoid;
  const segmentCount = bottomPositionsArray.length / 3 - 1;
  const vertexCount = segmentCount * 8;
  const arraySizeVec4 = vertexCount * 4;
  const indexCount = segmentCount * 36;
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  const positionsArray = new Float64Array(vertexCount * 3);
  const startHiAndForwardOffsetX = new Float32Array(arraySizeVec4);
  const startLoAndForwardOffsetY = new Float32Array(arraySizeVec4);
  const startNormalAndForwardOffsetZ = new Float32Array(arraySizeVec4);
  const endNormalAndTextureCoordinateNormalizationX = new Float32Array(
    arraySizeVec4
  );
  const rightNormalAndTextureCoordinateNormalizationY = new Float32Array(
    arraySizeVec4
  );
  let startHiLo2D;
  let offsetAndRight2D;
  let startEndNormals2D;
  let texcoordNormalization2D;
  if (compute2dAttributes) {
    startHiLo2D = new Float32Array(arraySizeVec4);
    offsetAndRight2D = new Float32Array(arraySizeVec4);
    startEndNormals2D = new Float32Array(arraySizeVec4);
    texcoordNormalization2D = new Float32Array(vertexCount * 2);
  }
  const cartographicsLength = cartographicsArray.length / 2;
  let length2D = 0;
  const startCartographic = startCartographicScratch;
  startCartographic.height = 0;
  const endCartographic = endCartographicScratch;
  endCartographic.height = 0;
  let segmentStartCartesian = segmentStartTopScratch;
  let segmentEndCartesian = segmentEndTopScratch;
  if (compute2dAttributes) {
    index = 0;
    for (i = 1; i < cartographicsLength; i++) {
      startCartographic.latitude = cartographicsArray[index];
      startCartographic.longitude = cartographicsArray[index + 1];
      endCartographic.latitude = cartographicsArray[index + 2];
      endCartographic.longitude = cartographicsArray[index + 3];
      segmentStartCartesian = projection.project(
        startCartographic,
        segmentStartCartesian
      );
      segmentEndCartesian = projection.project(
        endCartographic,
        segmentEndCartesian
      );
      length2D += Cartesian3_default.distance(
        segmentStartCartesian,
        segmentEndCartesian
      );
      index += 2;
    }
  }
  const positionsLength = topPositionsArray.length / 3;
  segmentEndCartesian = Cartesian3_default.unpack(
    topPositionsArray,
    0,
    segmentEndCartesian
  );
  let length3D = 0;
  index = 3;
  for (i = 1; i < positionsLength; i++) {
    segmentStartCartesian = Cartesian3_default.clone(
      segmentEndCartesian,
      segmentStartCartesian
    );
    segmentEndCartesian = Cartesian3_default.unpack(
      topPositionsArray,
      index,
      segmentEndCartesian
    );
    length3D += Cartesian3_default.distance(segmentStartCartesian, segmentEndCartesian);
    index += 3;
  }
  let j;
  index = 3;
  let cartographicsIndex = 0;
  let vec2sWriteIndex = 0;
  let vec3sWriteIndex = 0;
  let vec4sWriteIndex = 0;
  let miterBroken = false;
  let endBottom = Cartesian3_default.unpack(
    bottomPositionsArray,
    0,
    segmentEndBottomScratch
  );
  let endTop = Cartesian3_default.unpack(topPositionsArray, 0, segmentEndTopScratch);
  let endGeometryNormal = Cartesian3_default.unpack(
    normalsArray,
    0,
    segmentEndNormalScratch
  );
  if (loop) {
    const preEndBottom = Cartesian3_default.unpack(
      bottomPositionsArray,
      bottomPositionsArray.length - 6,
      segmentStartBottomScratch
    );
    if (breakMiter(endGeometryNormal, preEndBottom, endBottom, endTop)) {
      endGeometryNormal = Cartesian3_default.negate(
        endGeometryNormal,
        endGeometryNormal
      );
    }
  }
  let lengthSoFar3D = 0;
  let lengthSoFar2D = 0;
  let sumHeights = 0;
  for (i = 0; i < segmentCount; i++) {
    const startBottom = Cartesian3_default.clone(endBottom, segmentStartBottomScratch);
    const startTop = Cartesian3_default.clone(endTop, segmentStartTopScratch);
    let startGeometryNormal = Cartesian3_default.clone(
      endGeometryNormal,
      segmentStartNormalScratch
    );
    if (miterBroken) {
      startGeometryNormal = Cartesian3_default.negate(
        startGeometryNormal,
        startGeometryNormal
      );
    }
    endBottom = Cartesian3_default.unpack(
      bottomPositionsArray,
      index,
      segmentEndBottomScratch
    );
    endTop = Cartesian3_default.unpack(topPositionsArray, index, segmentEndTopScratch);
    endGeometryNormal = Cartesian3_default.unpack(
      normalsArray,
      index,
      segmentEndNormalScratch
    );
    miterBroken = breakMiter(endGeometryNormal, startBottom, endBottom, endTop);
    startCartographic.latitude = cartographicsArray[cartographicsIndex];
    startCartographic.longitude = cartographicsArray[cartographicsIndex + 1];
    endCartographic.latitude = cartographicsArray[cartographicsIndex + 2];
    endCartographic.longitude = cartographicsArray[cartographicsIndex + 3];
    let start2D;
    let end2D;
    let startGeometryNormal2D;
    let endGeometryNormal2D;
    if (compute2dAttributes) {
      const nudgeResult = nudgeCartographic(startCartographic, endCartographic);
      start2D = projection.project(startCartographic, segmentStart2DScratch);
      end2D = projection.project(endCartographic, segmentEnd2DScratch);
      const direction2D = direction(end2D, start2D, forwardOffset2DScratch);
      direction2D.y = Math.abs(direction2D.y);
      startGeometryNormal2D = segmentStartNormal2DScratch;
      endGeometryNormal2D = segmentEndNormal2DScratch;
      if (nudgeResult === 0 || Cartesian3_default.dot(direction2D, Cartesian3_default.UNIT_Y) > MITER_BREAK_SMALL) {
        startGeometryNormal2D = projectNormal(
          projection,
          startCartographic,
          startGeometryNormal,
          start2D,
          segmentStartNormal2DScratch
        );
        endGeometryNormal2D = projectNormal(
          projection,
          endCartographic,
          endGeometryNormal,
          end2D,
          segmentEndNormal2DScratch
        );
      } else if (nudgeResult === 1) {
        endGeometryNormal2D = projectNormal(
          projection,
          endCartographic,
          endGeometryNormal,
          end2D,
          segmentEndNormal2DScratch
        );
        startGeometryNormal2D.x = 0;
        startGeometryNormal2D.y = Math_default.sign(
          startCartographic.longitude - Math.abs(endCartographic.longitude)
        );
        startGeometryNormal2D.z = 0;
      } else {
        startGeometryNormal2D = projectNormal(
          projection,
          startCartographic,
          startGeometryNormal,
          start2D,
          segmentStartNormal2DScratch
        );
        endGeometryNormal2D.x = 0;
        endGeometryNormal2D.y = Math_default.sign(
          startCartographic.longitude - endCartographic.longitude
        );
        endGeometryNormal2D.z = 0;
      }
    }
    const segmentLength3D = Cartesian3_default.distance(startTop, endTop);
    const encodedStart = EncodedCartesian3_default.fromCartesian(
      startBottom,
      encodeScratch
    );
    const forwardOffset = Cartesian3_default.subtract(
      endBottom,
      startBottom,
      offsetScratch
    );
    const forward = Cartesian3_default.normalize(forwardOffset, rightScratch);
    let startUp = Cartesian3_default.subtract(startTop, startBottom, startUpScratch);
    startUp = Cartesian3_default.normalize(startUp, startUp);
    let rightNormal = Cartesian3_default.cross(forward, startUp, rightScratch);
    rightNormal = Cartesian3_default.normalize(rightNormal, rightNormal);
    let startPlaneNormal = Cartesian3_default.cross(
      startUp,
      startGeometryNormal,
      startPlaneNormalScratch
    );
    startPlaneNormal = Cartesian3_default.normalize(startPlaneNormal, startPlaneNormal);
    let endUp = Cartesian3_default.subtract(endTop, endBottom, endUpScratch);
    endUp = Cartesian3_default.normalize(endUp, endUp);
    let endPlaneNormal = Cartesian3_default.cross(
      endGeometryNormal,
      endUp,
      endPlaneNormalScratch
    );
    endPlaneNormal = Cartesian3_default.normalize(endPlaneNormal, endPlaneNormal);
    const texcoordNormalization3DX = segmentLength3D / length3D;
    const texcoordNormalization3DY = lengthSoFar3D / length3D;
    let segmentLength2D = 0;
    let encodedStart2D;
    let forwardOffset2D;
    let right2D;
    let texcoordNormalization2DX = 0;
    let texcoordNormalization2DY = 0;
    if (compute2dAttributes) {
      segmentLength2D = Cartesian3_default.distance(start2D, end2D);
      encodedStart2D = EncodedCartesian3_default.fromCartesian(
        start2D,
        encodeScratch2D
      );
      forwardOffset2D = Cartesian3_default.subtract(
        end2D,
        start2D,
        forwardOffset2DScratch
      );
      right2D = Cartesian3_default.normalize(forwardOffset2D, right2DScratch);
      const swap = right2D.x;
      right2D.x = right2D.y;
      right2D.y = -swap;
      texcoordNormalization2DX = segmentLength2D / length2D;
      texcoordNormalization2DY = lengthSoFar2D / length2D;
    }
    for (j = 0; j < 8; j++) {
      const vec4Index = vec4sWriteIndex + j * 4;
      const vec2Index = vec2sWriteIndex + j * 2;
      const wIndex = vec4Index + 3;
      const rightPlaneSide = j < 4 ? 1 : -1;
      const topBottomSide = j === 2 || j === 3 || j === 6 || j === 7 ? 1 : -1;
      Cartesian3_default.pack(encodedStart.high, startHiAndForwardOffsetX, vec4Index);
      startHiAndForwardOffsetX[wIndex] = forwardOffset.x;
      Cartesian3_default.pack(encodedStart.low, startLoAndForwardOffsetY, vec4Index);
      startLoAndForwardOffsetY[wIndex] = forwardOffset.y;
      Cartesian3_default.pack(
        startPlaneNormal,
        startNormalAndForwardOffsetZ,
        vec4Index
      );
      startNormalAndForwardOffsetZ[wIndex] = forwardOffset.z;
      Cartesian3_default.pack(
        endPlaneNormal,
        endNormalAndTextureCoordinateNormalizationX,
        vec4Index
      );
      endNormalAndTextureCoordinateNormalizationX[wIndex] = texcoordNormalization3DX * rightPlaneSide;
      Cartesian3_default.pack(
        rightNormal,
        rightNormalAndTextureCoordinateNormalizationY,
        vec4Index
      );
      let texcoordNormalization = texcoordNormalization3DY * topBottomSide;
      if (texcoordNormalization === 0 && topBottomSide < 0) {
        texcoordNormalization = 9;
      }
      rightNormalAndTextureCoordinateNormalizationY[wIndex] = texcoordNormalization;
      if (compute2dAttributes) {
        startHiLo2D[vec4Index] = encodedStart2D.high.x;
        startHiLo2D[vec4Index + 1] = encodedStart2D.high.y;
        startHiLo2D[vec4Index + 2] = encodedStart2D.low.x;
        startHiLo2D[vec4Index + 3] = encodedStart2D.low.y;
        startEndNormals2D[vec4Index] = -startGeometryNormal2D.y;
        startEndNormals2D[vec4Index + 1] = startGeometryNormal2D.x;
        startEndNormals2D[vec4Index + 2] = endGeometryNormal2D.y;
        startEndNormals2D[vec4Index + 3] = -endGeometryNormal2D.x;
        offsetAndRight2D[vec4Index] = forwardOffset2D.x;
        offsetAndRight2D[vec4Index + 1] = forwardOffset2D.y;
        offsetAndRight2D[vec4Index + 2] = right2D.x;
        offsetAndRight2D[vec4Index + 3] = right2D.y;
        texcoordNormalization2D[vec2Index] = texcoordNormalization2DX * rightPlaneSide;
        texcoordNormalization = texcoordNormalization2DY * topBottomSide;
        if (texcoordNormalization === 0 && topBottomSide < 0) {
          texcoordNormalization = 9;
        }
        texcoordNormalization2D[vec2Index + 1] = texcoordNormalization;
      }
    }
    const adjustHeightStartBottom = adjustHeightStartBottomScratch;
    const adjustHeightEndBottom = adjustHeightEndBottomScratch;
    const adjustHeightStartTop = adjustHeightStartTopScratch;
    const adjustHeightEndTop = adjustHeightEndTopScratch;
    const getHeightsRectangle = Rectangle_default.fromCartographicArray(
      getHeightCartographics,
      getHeightRectangleScratch
    );
    const minMaxHeights = ApproximateTerrainHeights_default.getMinimumMaximumHeights(
      getHeightsRectangle,
      ellipsoid
    );
    const minHeight = minMaxHeights.minimumTerrainHeight;
    const maxHeight = minMaxHeights.maximumTerrainHeight;
    sumHeights += Math.abs(minHeight);
    sumHeights += Math.abs(maxHeight);
    adjustHeights(
      startBottom,
      startTop,
      minHeight,
      maxHeight,
      adjustHeightStartBottom,
      adjustHeightStartTop
    );
    adjustHeights(
      endBottom,
      endTop,
      minHeight,
      maxHeight,
      adjustHeightEndBottom,
      adjustHeightEndTop
    );
    let normalNudge = Cartesian3_default.multiplyByScalar(
      rightNormal,
      Math_default.EPSILON5,
      normalNudgeScratch
    );
    Cartesian3_default.add(
      adjustHeightStartBottom,
      normalNudge,
      adjustHeightStartBottom
    );
    Cartesian3_default.add(adjustHeightEndBottom, normalNudge, adjustHeightEndBottom);
    Cartesian3_default.add(adjustHeightStartTop, normalNudge, adjustHeightStartTop);
    Cartesian3_default.add(adjustHeightEndTop, normalNudge, adjustHeightEndTop);
    nudgeXZ(adjustHeightStartBottom, adjustHeightEndBottom);
    nudgeXZ(adjustHeightStartTop, adjustHeightEndTop);
    Cartesian3_default.pack(adjustHeightStartBottom, positionsArray, vec3sWriteIndex);
    Cartesian3_default.pack(adjustHeightEndBottom, positionsArray, vec3sWriteIndex + 3);
    Cartesian3_default.pack(adjustHeightEndTop, positionsArray, vec3sWriteIndex + 6);
    Cartesian3_default.pack(adjustHeightStartTop, positionsArray, vec3sWriteIndex + 9);
    normalNudge = Cartesian3_default.multiplyByScalar(
      rightNormal,
      -2 * Math_default.EPSILON5,
      normalNudgeScratch
    );
    Cartesian3_default.add(
      adjustHeightStartBottom,
      normalNudge,
      adjustHeightStartBottom
    );
    Cartesian3_default.add(adjustHeightEndBottom, normalNudge, adjustHeightEndBottom);
    Cartesian3_default.add(adjustHeightStartTop, normalNudge, adjustHeightStartTop);
    Cartesian3_default.add(adjustHeightEndTop, normalNudge, adjustHeightEndTop);
    nudgeXZ(adjustHeightStartBottom, adjustHeightEndBottom);
    nudgeXZ(adjustHeightStartTop, adjustHeightEndTop);
    Cartesian3_default.pack(
      adjustHeightStartBottom,
      positionsArray,
      vec3sWriteIndex + 12
    );
    Cartesian3_default.pack(
      adjustHeightEndBottom,
      positionsArray,
      vec3sWriteIndex + 15
    );
    Cartesian3_default.pack(adjustHeightEndTop, positionsArray, vec3sWriteIndex + 18);
    Cartesian3_default.pack(adjustHeightStartTop, positionsArray, vec3sWriteIndex + 21);
    cartographicsIndex += 2;
    index += 3;
    vec2sWriteIndex += 16;
    vec3sWriteIndex += 24;
    vec4sWriteIndex += 32;
    lengthSoFar3D += segmentLength3D;
    lengthSoFar2D += segmentLength2D;
  }
  index = 0;
  let indexOffset = 0;
  for (i = 0; i < segmentCount; i++) {
    for (j = 0; j < REFERENCE_INDICES_LENGTH; j++) {
      indices[index + j] = REFERENCE_INDICES[j] + indexOffset;
    }
    indexOffset += 8;
    index += REFERENCE_INDICES_LENGTH;
  }
  const boundingSpheres = scratchBoundingSpheres;
  BoundingSphere_default.fromVertices(
    bottomPositionsArray,
    Cartesian3_default.ZERO,
    3,
    boundingSpheres[0]
  );
  BoundingSphere_default.fromVertices(
    topPositionsArray,
    Cartesian3_default.ZERO,
    3,
    boundingSpheres[1]
  );
  const boundingSphere = BoundingSphere_default.fromBoundingSpheres(boundingSpheres);
  boundingSphere.radius += sumHeights / (segmentCount * 2);
  const attributes = {
    position: new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      normalize: false,
      values: positionsArray
    }),
    startHiAndForwardOffsetX: getVec4GeometryAttribute(
      startHiAndForwardOffsetX
    ),
    startLoAndForwardOffsetY: getVec4GeometryAttribute(
      startLoAndForwardOffsetY
    ),
    startNormalAndForwardOffsetZ: getVec4GeometryAttribute(
      startNormalAndForwardOffsetZ
    ),
    endNormalAndTextureCoordinateNormalizationX: getVec4GeometryAttribute(
      endNormalAndTextureCoordinateNormalizationX
    ),
    rightNormalAndTextureCoordinateNormalizationY: getVec4GeometryAttribute(
      rightNormalAndTextureCoordinateNormalizationY
    )
  };
  if (compute2dAttributes) {
    attributes.startHiLo2D = getVec4GeometryAttribute(startHiLo2D);
    attributes.offsetAndRight2D = getVec4GeometryAttribute(offsetAndRight2D);
    attributes.startEndNormals2D = getVec4GeometryAttribute(startEndNormals2D);
    attributes.texcoordNormalization2D = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      normalize: false,
      values: texcoordNormalization2D
    });
  }
  return new Geometry_default({
    attributes,
    indices,
    boundingSphere
  });
}
function getVec4GeometryAttribute(typedArray) {
  return new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute: 4,
    normalize: false,
    values: typedArray
  });
}
GroundPolylineGeometry._projectNormal = projectNormal;
var GroundPolylineGeometry_default = GroundPolylineGeometry;

// packages/engine/Source/Workers/createGroundPolylineGeometry.js
function createGroundPolylineGeometry(groundPolylineGeometry, offset) {
  return ApproximateTerrainHeights_default.initialize().then(function() {
    if (defined_default(offset)) {
      groundPolylineGeometry = GroundPolylineGeometry_default.unpack(
        groundPolylineGeometry,
        offset
      );
    }
    return GroundPolylineGeometry_default.createGeometry(groundPolylineGeometry);
  });
}
var createGroundPolylineGeometry_default = createGroundPolylineGeometry;
export {
  createGroundPolylineGeometry_default as default
};
