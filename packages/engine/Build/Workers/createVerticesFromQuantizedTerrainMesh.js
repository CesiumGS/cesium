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
  EllipsoidalOccluder_default,
  TerrainEncoding_default
} from "./chunk-UAOWJZRD.js";
import {
  createTaskProcessorWorker_default
} from "./chunk-V2Y7GTNU.js";
import {
  WebMercatorProjection_default
} from "./chunk-BWREGNKG.js";
import "./chunk-IJT7RSPE.js";
import {
  AxisAlignedBoundingBox_default
} from "./chunk-IYKFKVQR.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  Transforms_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import {
  Cartesian2_default,
  Matrix4_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
import "./chunk-63W23YZY.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/TerrainProvider.js
function TerrainProvider() {
  DeveloperError_default.throwInstantiationError();
}
Object.defineProperties(TerrainProvider.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof TerrainProvider.prototype
   * @type {Event<TerrainProvider.ErrorEvent>}
   * @readonly
   */
  errorEvent: {
    get: DeveloperError_default.throwInstantiationError
  },
  /**
   * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
   * the source of the terrain.
   * @memberof TerrainProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: DeveloperError_default.throwInstantiationError
  },
  /**
   * Gets the tiling scheme used by the provider.
   * @memberof TerrainProvider.prototype
   * @type {TilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: DeveloperError_default.throwInstantiationError
  },
  /**
   * Gets a value indicating whether or not the provider includes a water mask.  The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.
   * @memberof TerrainProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasWaterMask: {
    get: DeveloperError_default.throwInstantiationError
  },
  /**
   * Gets a value indicating whether or not the requested tiles include vertex normals.
   * @memberof TerrainProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasVertexNormals: {
    get: DeveloperError_default.throwInstantiationError
  },
  /**
   * Gets an object that can be used to determine availability of terrain from this provider, such as
   * at points and in rectangles. This property may be undefined if availability
   * information is not available.
   * @memberof TerrainProvider.prototype
   * @type {TileAvailability}
   * @readonly
   */
  availability: {
    get: DeveloperError_default.throwInstantiationError
  }
});
var regularGridIndicesCache = [];
TerrainProvider.getRegularGridIndices = function(width, height) {
  if (width * height >= Math_default.FOUR_GIGABYTES) {
    throw new DeveloperError_default(
      "The total number of vertices (width * height) must be less than 4,294,967,296."
    );
  }
  let byWidth = regularGridIndicesCache[width];
  if (!defined_default(byWidth)) {
    regularGridIndicesCache[width] = byWidth = [];
  }
  let indices = byWidth[height];
  if (!defined_default(indices)) {
    if (width * height < Math_default.SIXTY_FOUR_KILOBYTES) {
      indices = byWidth[height] = new Uint16Array(
        (width - 1) * (height - 1) * 6
      );
    } else {
      indices = byWidth[height] = new Uint32Array(
        (width - 1) * (height - 1) * 6
      );
    }
    addRegularGridIndices(width, height, indices, 0);
  }
  return indices;
};
var regularGridAndEdgeIndicesCache = [];
TerrainProvider.getRegularGridIndicesAndEdgeIndices = function(width, height) {
  if (width * height >= Math_default.FOUR_GIGABYTES) {
    throw new DeveloperError_default(
      "The total number of vertices (width * height) must be less than 4,294,967,296."
    );
  }
  let byWidth = regularGridAndEdgeIndicesCache[width];
  if (!defined_default(byWidth)) {
    regularGridAndEdgeIndicesCache[width] = byWidth = [];
  }
  let indicesAndEdges = byWidth[height];
  if (!defined_default(indicesAndEdges)) {
    const indices = TerrainProvider.getRegularGridIndices(width, height);
    const edgeIndices = getEdgeIndices(width, height);
    const westIndicesSouthToNorth = edgeIndices.westIndicesSouthToNorth;
    const southIndicesEastToWest = edgeIndices.southIndicesEastToWest;
    const eastIndicesNorthToSouth = edgeIndices.eastIndicesNorthToSouth;
    const northIndicesWestToEast = edgeIndices.northIndicesWestToEast;
    indicesAndEdges = byWidth[height] = {
      indices,
      westIndicesSouthToNorth,
      southIndicesEastToWest,
      eastIndicesNorthToSouth,
      northIndicesWestToEast
    };
  }
  return indicesAndEdges;
};
var regularGridAndSkirtAndEdgeIndicesCache = [];
TerrainProvider.getRegularGridAndSkirtIndicesAndEdgeIndices = function(width, height) {
  if (width * height >= Math_default.FOUR_GIGABYTES) {
    throw new DeveloperError_default(
      "The total number of vertices (width * height) must be less than 4,294,967,296."
    );
  }
  let byWidth = regularGridAndSkirtAndEdgeIndicesCache[width];
  if (!defined_default(byWidth)) {
    regularGridAndSkirtAndEdgeIndicesCache[width] = byWidth = [];
  }
  let indicesAndEdges = byWidth[height];
  if (!defined_default(indicesAndEdges)) {
    const gridVertexCount = width * height;
    const gridIndexCount = (width - 1) * (height - 1) * 6;
    const edgeVertexCount = width * 2 + height * 2;
    const edgeIndexCount = Math.max(0, edgeVertexCount - 4) * 6;
    const vertexCount = gridVertexCount + edgeVertexCount;
    const indexCount = gridIndexCount + edgeIndexCount;
    const edgeIndices = getEdgeIndices(width, height);
    const westIndicesSouthToNorth = edgeIndices.westIndicesSouthToNorth;
    const southIndicesEastToWest = edgeIndices.southIndicesEastToWest;
    const eastIndicesNorthToSouth = edgeIndices.eastIndicesNorthToSouth;
    const northIndicesWestToEast = edgeIndices.northIndicesWestToEast;
    const indices = IndexDatatype_default.createTypedArray(vertexCount, indexCount);
    addRegularGridIndices(width, height, indices, 0);
    TerrainProvider.addSkirtIndices(
      westIndicesSouthToNorth,
      southIndicesEastToWest,
      eastIndicesNorthToSouth,
      northIndicesWestToEast,
      gridVertexCount,
      indices,
      gridIndexCount
    );
    indicesAndEdges = byWidth[height] = {
      indices,
      westIndicesSouthToNorth,
      southIndicesEastToWest,
      eastIndicesNorthToSouth,
      northIndicesWestToEast,
      indexCountWithoutSkirts: gridIndexCount
    };
  }
  return indicesAndEdges;
};
TerrainProvider.addSkirtIndices = function(westIndicesSouthToNorth, southIndicesEastToWest, eastIndicesNorthToSouth, northIndicesWestToEast, vertexCount, indices, offset) {
  let vertexIndex = vertexCount;
  offset = addSkirtIndices(
    westIndicesSouthToNorth,
    vertexIndex,
    indices,
    offset
  );
  vertexIndex += westIndicesSouthToNorth.length;
  offset = addSkirtIndices(
    southIndicesEastToWest,
    vertexIndex,
    indices,
    offset
  );
  vertexIndex += southIndicesEastToWest.length;
  offset = addSkirtIndices(
    eastIndicesNorthToSouth,
    vertexIndex,
    indices,
    offset
  );
  vertexIndex += eastIndicesNorthToSouth.length;
  addSkirtIndices(northIndicesWestToEast, vertexIndex, indices, offset);
};
function getEdgeIndices(width, height) {
  const westIndicesSouthToNorth = new Array(height);
  const southIndicesEastToWest = new Array(width);
  const eastIndicesNorthToSouth = new Array(height);
  const northIndicesWestToEast = new Array(width);
  let i;
  for (i = 0; i < width; ++i) {
    northIndicesWestToEast[i] = i;
    southIndicesEastToWest[i] = width * height - 1 - i;
  }
  for (i = 0; i < height; ++i) {
    eastIndicesNorthToSouth[i] = (i + 1) * width - 1;
    westIndicesSouthToNorth[i] = (height - i - 1) * width;
  }
  return {
    westIndicesSouthToNorth,
    southIndicesEastToWest,
    eastIndicesNorthToSouth,
    northIndicesWestToEast
  };
}
function addRegularGridIndices(width, height, indices, offset) {
  let index = 0;
  for (let j = 0; j < height - 1; ++j) {
    for (let i = 0; i < width - 1; ++i) {
      const upperLeft = index;
      const lowerLeft = upperLeft + width;
      const lowerRight = lowerLeft + 1;
      const upperRight = upperLeft + 1;
      indices[offset++] = upperLeft;
      indices[offset++] = lowerLeft;
      indices[offset++] = upperRight;
      indices[offset++] = upperRight;
      indices[offset++] = lowerLeft;
      indices[offset++] = lowerRight;
      ++index;
    }
    ++index;
  }
}
function addSkirtIndices(edgeIndices, vertexIndex, indices, offset) {
  let previousIndex = edgeIndices[0];
  const length = edgeIndices.length;
  for (let i = 1; i < length; ++i) {
    const index = edgeIndices[i];
    indices[offset++] = previousIndex;
    indices[offset++] = index;
    indices[offset++] = vertexIndex;
    indices[offset++] = vertexIndex;
    indices[offset++] = index;
    indices[offset++] = vertexIndex + 1;
    previousIndex = index;
    ++vertexIndex;
  }
  return offset;
}
TerrainProvider.heightmapTerrainQuality = 0.25;
TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap = function(ellipsoid, tileImageWidth, numberOfTilesAtLevelZero) {
  return ellipsoid.maximumRadius * 2 * Math.PI * TerrainProvider.heightmapTerrainQuality / (tileImageWidth * numberOfTilesAtLevelZero);
};
TerrainProvider.prototype.requestTileGeometry = DeveloperError_default.throwInstantiationError;
TerrainProvider.prototype.getLevelMaximumGeometricError = DeveloperError_default.throwInstantiationError;
TerrainProvider.prototype.getTileDataAvailable = DeveloperError_default.throwInstantiationError;
TerrainProvider.prototype.loadTileDataAvailability = DeveloperError_default.throwInstantiationError;
var TerrainProvider_default = TerrainProvider;

// packages/engine/Source/Workers/createVerticesFromQuantizedTerrainMesh.js
var maxShort = 32767;
var cartesian3Scratch = new Cartesian3_default();
var scratchMinimum = new Cartesian3_default();
var scratchMaximum = new Cartesian3_default();
var cartographicScratch = new Cartographic_default();
var toPack = new Cartesian2_default();
function createVerticesFromQuantizedTerrainMesh(parameters, transferableObjects) {
  const quantizedVertices = parameters.quantizedVertices;
  const quantizedVertexCount = quantizedVertices.length / 3;
  const octEncodedNormals = parameters.octEncodedNormals;
  const edgeVertexCount = parameters.westIndices.length + parameters.eastIndices.length + parameters.southIndices.length + parameters.northIndices.length;
  const includeWebMercatorT = parameters.includeWebMercatorT;
  const exaggeration = parameters.exaggeration;
  const exaggerationRelativeHeight = parameters.exaggerationRelativeHeight;
  const hasExaggeration = exaggeration !== 1;
  const includeGeodeticSurfaceNormals = hasExaggeration;
  const rectangle = Rectangle_default.clone(parameters.rectangle);
  const west = rectangle.west;
  const south = rectangle.south;
  const east = rectangle.east;
  const north = rectangle.north;
  const ellipsoid = Ellipsoid_default.clone(parameters.ellipsoid);
  const minimumHeight = parameters.minimumHeight;
  const maximumHeight = parameters.maximumHeight;
  const center = parameters.relativeToCenter;
  const fromENU = Transforms_default.eastNorthUpToFixedFrame(center, ellipsoid);
  const toENU = Matrix4_default.inverseTransformation(fromENU, new Matrix4_default());
  let southMercatorY;
  let oneOverMercatorHeight;
  if (includeWebMercatorT) {
    southMercatorY = WebMercatorProjection_default.geodeticLatitudeToMercatorAngle(
      south
    );
    oneOverMercatorHeight = 1 / (WebMercatorProjection_default.geodeticLatitudeToMercatorAngle(north) - southMercatorY);
  }
  const uBuffer = quantizedVertices.subarray(0, quantizedVertexCount);
  const vBuffer = quantizedVertices.subarray(
    quantizedVertexCount,
    2 * quantizedVertexCount
  );
  const heightBuffer = quantizedVertices.subarray(
    quantizedVertexCount * 2,
    3 * quantizedVertexCount
  );
  const hasVertexNormals = defined_default(octEncodedNormals);
  const uvs = new Array(quantizedVertexCount);
  const heights = new Array(quantizedVertexCount);
  const positions = new Array(quantizedVertexCount);
  const webMercatorTs = includeWebMercatorT ? new Array(quantizedVertexCount) : [];
  const geodeticSurfaceNormals = includeGeodeticSurfaceNormals ? new Array(quantizedVertexCount) : [];
  const minimum = scratchMinimum;
  minimum.x = Number.POSITIVE_INFINITY;
  minimum.y = Number.POSITIVE_INFINITY;
  minimum.z = Number.POSITIVE_INFINITY;
  const maximum = scratchMaximum;
  maximum.x = Number.NEGATIVE_INFINITY;
  maximum.y = Number.NEGATIVE_INFINITY;
  maximum.z = Number.NEGATIVE_INFINITY;
  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < quantizedVertexCount; ++i) {
    const rawU = uBuffer[i];
    const rawV = vBuffer[i];
    const u = rawU / maxShort;
    const v = rawV / maxShort;
    const height = Math_default.lerp(
      minimumHeight,
      maximumHeight,
      heightBuffer[i] / maxShort
    );
    cartographicScratch.longitude = Math_default.lerp(west, east, u);
    cartographicScratch.latitude = Math_default.lerp(south, north, v);
    cartographicScratch.height = height;
    minLongitude = Math.min(cartographicScratch.longitude, minLongitude);
    maxLongitude = Math.max(cartographicScratch.longitude, maxLongitude);
    minLatitude = Math.min(cartographicScratch.latitude, minLatitude);
    maxLatitude = Math.max(cartographicScratch.latitude, maxLatitude);
    const position = ellipsoid.cartographicToCartesian(cartographicScratch);
    uvs[i] = new Cartesian2_default(u, v);
    heights[i] = height;
    positions[i] = position;
    if (includeWebMercatorT) {
      webMercatorTs[i] = (WebMercatorProjection_default.geodeticLatitudeToMercatorAngle(
        cartographicScratch.latitude
      ) - southMercatorY) * oneOverMercatorHeight;
    }
    if (includeGeodeticSurfaceNormals) {
      geodeticSurfaceNormals[i] = ellipsoid.geodeticSurfaceNormal(position);
    }
    Matrix4_default.multiplyByPoint(toENU, position, cartesian3Scratch);
    Cartesian3_default.minimumByComponent(cartesian3Scratch, minimum, minimum);
    Cartesian3_default.maximumByComponent(cartesian3Scratch, maximum, maximum);
  }
  const westIndicesSouthToNorth = copyAndSort(parameters.westIndices, function(a, b) {
    return uvs[a].y - uvs[b].y;
  });
  const eastIndicesNorthToSouth = copyAndSort(parameters.eastIndices, function(a, b) {
    return uvs[b].y - uvs[a].y;
  });
  const southIndicesEastToWest = copyAndSort(parameters.southIndices, function(a, b) {
    return uvs[b].x - uvs[a].x;
  });
  const northIndicesWestToEast = copyAndSort(parameters.northIndices, function(a, b) {
    return uvs[a].x - uvs[b].x;
  });
  let occludeePointInScaledSpace;
  if (minimumHeight < 0) {
    const occluder = new EllipsoidalOccluder_default(ellipsoid);
    occludeePointInScaledSpace = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
      center,
      positions,
      minimumHeight
    );
  }
  let hMin = minimumHeight;
  hMin = Math.min(
    hMin,
    findMinMaxSkirts(
      parameters.westIndices,
      parameters.westSkirtHeight,
      heights,
      uvs,
      rectangle,
      ellipsoid,
      toENU,
      minimum,
      maximum
    )
  );
  hMin = Math.min(
    hMin,
    findMinMaxSkirts(
      parameters.southIndices,
      parameters.southSkirtHeight,
      heights,
      uvs,
      rectangle,
      ellipsoid,
      toENU,
      minimum,
      maximum
    )
  );
  hMin = Math.min(
    hMin,
    findMinMaxSkirts(
      parameters.eastIndices,
      parameters.eastSkirtHeight,
      heights,
      uvs,
      rectangle,
      ellipsoid,
      toENU,
      minimum,
      maximum
    )
  );
  hMin = Math.min(
    hMin,
    findMinMaxSkirts(
      parameters.northIndices,
      parameters.northSkirtHeight,
      heights,
      uvs,
      rectangle,
      ellipsoid,
      toENU,
      minimum,
      maximum
    )
  );
  const aaBox = new AxisAlignedBoundingBox_default(minimum, maximum, center);
  const encoding = new TerrainEncoding_default(
    center,
    aaBox,
    hMin,
    maximumHeight,
    fromENU,
    hasVertexNormals,
    includeWebMercatorT,
    includeGeodeticSurfaceNormals,
    exaggeration,
    exaggerationRelativeHeight
  );
  const vertexStride = encoding.stride;
  const size = quantizedVertexCount * vertexStride + edgeVertexCount * vertexStride;
  const vertexBuffer = new Float32Array(size);
  let bufferIndex = 0;
  for (let j = 0; j < quantizedVertexCount; ++j) {
    if (hasVertexNormals) {
      const n = j * 2;
      toPack.x = octEncodedNormals[n];
      toPack.y = octEncodedNormals[n + 1];
    }
    bufferIndex = encoding.encode(
      vertexBuffer,
      bufferIndex,
      positions[j],
      uvs[j],
      heights[j],
      toPack,
      webMercatorTs[j],
      geodeticSurfaceNormals[j]
    );
  }
  const edgeTriangleCount = Math.max(0, (edgeVertexCount - 4) * 2);
  const indexBufferLength = parameters.indices.length + edgeTriangleCount * 3;
  const indexBuffer = IndexDatatype_default.createTypedArray(
    quantizedVertexCount + edgeVertexCount,
    indexBufferLength
  );
  indexBuffer.set(parameters.indices, 0);
  const percentage = 1e-4;
  const lonOffset = (maxLongitude - minLongitude) * percentage;
  const latOffset = (maxLatitude - minLatitude) * percentage;
  const westLongitudeOffset = -lonOffset;
  const westLatitudeOffset = 0;
  const eastLongitudeOffset = lonOffset;
  const eastLatitudeOffset = 0;
  const northLongitudeOffset = 0;
  const northLatitudeOffset = latOffset;
  const southLongitudeOffset = 0;
  const southLatitudeOffset = -latOffset;
  let vertexBufferIndex = quantizedVertexCount * vertexStride;
  addSkirt(
    vertexBuffer,
    vertexBufferIndex,
    westIndicesSouthToNorth,
    encoding,
    heights,
    uvs,
    octEncodedNormals,
    ellipsoid,
    rectangle,
    parameters.westSkirtHeight,
    southMercatorY,
    oneOverMercatorHeight,
    westLongitudeOffset,
    westLatitudeOffset
  );
  vertexBufferIndex += parameters.westIndices.length * vertexStride;
  addSkirt(
    vertexBuffer,
    vertexBufferIndex,
    southIndicesEastToWest,
    encoding,
    heights,
    uvs,
    octEncodedNormals,
    ellipsoid,
    rectangle,
    parameters.southSkirtHeight,
    southMercatorY,
    oneOverMercatorHeight,
    southLongitudeOffset,
    southLatitudeOffset
  );
  vertexBufferIndex += parameters.southIndices.length * vertexStride;
  addSkirt(
    vertexBuffer,
    vertexBufferIndex,
    eastIndicesNorthToSouth,
    encoding,
    heights,
    uvs,
    octEncodedNormals,
    ellipsoid,
    rectangle,
    parameters.eastSkirtHeight,
    southMercatorY,
    oneOverMercatorHeight,
    eastLongitudeOffset,
    eastLatitudeOffset
  );
  vertexBufferIndex += parameters.eastIndices.length * vertexStride;
  addSkirt(
    vertexBuffer,
    vertexBufferIndex,
    northIndicesWestToEast,
    encoding,
    heights,
    uvs,
    octEncodedNormals,
    ellipsoid,
    rectangle,
    parameters.northSkirtHeight,
    southMercatorY,
    oneOverMercatorHeight,
    northLongitudeOffset,
    northLatitudeOffset
  );
  TerrainProvider_default.addSkirtIndices(
    westIndicesSouthToNorth,
    southIndicesEastToWest,
    eastIndicesNorthToSouth,
    northIndicesWestToEast,
    quantizedVertexCount,
    indexBuffer,
    parameters.indices.length
  );
  transferableObjects.push(vertexBuffer.buffer, indexBuffer.buffer);
  return {
    vertices: vertexBuffer.buffer,
    indices: indexBuffer.buffer,
    westIndicesSouthToNorth,
    southIndicesEastToWest,
    eastIndicesNorthToSouth,
    northIndicesWestToEast,
    vertexStride,
    center,
    minimumHeight,
    maximumHeight,
    occludeePointInScaledSpace,
    encoding,
    indexCountWithoutSkirts: parameters.indices.length
  };
}
function findMinMaxSkirts(edgeIndices, edgeHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum) {
  let hMin = Number.POSITIVE_INFINITY;
  const north = rectangle.north;
  const south = rectangle.south;
  let east = rectangle.east;
  const west = rectangle.west;
  if (east < west) {
    east += Math_default.TWO_PI;
  }
  const length = edgeIndices.length;
  for (let i = 0; i < length; ++i) {
    const index = edgeIndices[i];
    const h = heights[index];
    const uv = uvs[index];
    cartographicScratch.longitude = Math_default.lerp(west, east, uv.x);
    cartographicScratch.latitude = Math_default.lerp(south, north, uv.y);
    cartographicScratch.height = h - edgeHeight;
    const position = ellipsoid.cartographicToCartesian(
      cartographicScratch,
      cartesian3Scratch
    );
    Matrix4_default.multiplyByPoint(toENU, position, position);
    Cartesian3_default.minimumByComponent(position, minimum, minimum);
    Cartesian3_default.maximumByComponent(position, maximum, maximum);
    hMin = Math.min(hMin, cartographicScratch.height);
  }
  return hMin;
}
function addSkirt(vertexBuffer, vertexBufferIndex, edgeVertices, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, skirtLength, southMercatorY, oneOverMercatorHeight, longitudeOffset, latitudeOffset) {
  const hasVertexNormals = defined_default(octEncodedNormals);
  const north = rectangle.north;
  const south = rectangle.south;
  let east = rectangle.east;
  const west = rectangle.west;
  if (east < west) {
    east += Math_default.TWO_PI;
  }
  const length = edgeVertices.length;
  for (let i = 0; i < length; ++i) {
    const index = edgeVertices[i];
    const h = heights[index];
    const uv = uvs[index];
    cartographicScratch.longitude = Math_default.lerp(west, east, uv.x) + longitudeOffset;
    cartographicScratch.latitude = Math_default.lerp(south, north, uv.y) + latitudeOffset;
    cartographicScratch.height = h - skirtLength;
    const position = ellipsoid.cartographicToCartesian(
      cartographicScratch,
      cartesian3Scratch
    );
    if (hasVertexNormals) {
      const n = index * 2;
      toPack.x = octEncodedNormals[n];
      toPack.y = octEncodedNormals[n + 1];
    }
    let webMercatorT;
    if (encoding.hasWebMercatorT) {
      webMercatorT = (WebMercatorProjection_default.geodeticLatitudeToMercatorAngle(
        cartographicScratch.latitude
      ) - southMercatorY) * oneOverMercatorHeight;
    }
    let geodeticSurfaceNormal;
    if (encoding.hasGeodeticSurfaceNormals) {
      geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(position);
    }
    vertexBufferIndex = encoding.encode(
      vertexBuffer,
      vertexBufferIndex,
      position,
      uv,
      cartographicScratch.height,
      toPack,
      webMercatorT,
      geodeticSurfaceNormal
    );
  }
}
function copyAndSort(typedArray, comparator) {
  let copy;
  if (typeof typedArray.slice === "function") {
    copy = typedArray.slice();
    if (typeof copy.sort !== "function") {
      copy = void 0;
    }
  }
  if (!defined_default(copy)) {
    copy = Array.prototype.slice.call(typedArray);
  }
  copy.sort(comparator);
  return copy;
}
var createVerticesFromQuantizedTerrainMesh_default = createTaskProcessorWorker_default(
  createVerticesFromQuantizedTerrainMesh
);
export {
  createVerticesFromQuantizedTerrainMesh_default as default
};
