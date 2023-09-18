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
import {
  OrientedBoundingBox_default
} from "./chunk-YQGUKCJO.js";
import "./chunk-IJT7RSPE.js";
import "./chunk-LATQ4URD.js";
import {
  AxisAlignedBoundingBox_default
} from "./chunk-IYKFKVQR.js";
import "./chunk-MKJM6R4K.js";
import "./chunk-PY3JQBWU.js";
import {
  BoundingSphere_default,
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
import {
  RuntimeError_default
} from "./chunk-JQQW5OSU.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Workers/createVerticesFromGoogleEarthEnterpriseBuffer.js
var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
var sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
var sizeOfFloat = Float32Array.BYTES_PER_ELEMENT;
var sizeOfDouble = Float64Array.BYTES_PER_ELEMENT;
function indexOfEpsilon(arr, elem, elemType) {
  elemType = defaultValue_default(elemType, Math_default);
  const count = arr.length;
  for (let i = 0; i < count; ++i) {
    if (elemType.equalsEpsilon(arr[i], elem, Math_default.EPSILON12)) {
      return i;
    }
  }
  return -1;
}
function createVerticesFromGoogleEarthEnterpriseBuffer(parameters, transferableObjects) {
  parameters.ellipsoid = Ellipsoid_default.clone(parameters.ellipsoid);
  parameters.rectangle = Rectangle_default.clone(parameters.rectangle);
  const statistics = processBuffer(
    parameters.buffer,
    parameters.relativeToCenter,
    parameters.ellipsoid,
    parameters.rectangle,
    parameters.nativeRectangle,
    parameters.exaggeration,
    parameters.exaggerationRelativeHeight,
    parameters.skirtHeight,
    parameters.includeWebMercatorT,
    parameters.negativeAltitudeExponentBias,
    parameters.negativeElevationThreshold
  );
  const vertices = statistics.vertices;
  transferableObjects.push(vertices.buffer);
  const indices = statistics.indices;
  transferableObjects.push(indices.buffer);
  return {
    vertices: vertices.buffer,
    indices: indices.buffer,
    numberOfAttributes: statistics.encoding.stride,
    minimumHeight: statistics.minimumHeight,
    maximumHeight: statistics.maximumHeight,
    boundingSphere3D: statistics.boundingSphere3D,
    orientedBoundingBox: statistics.orientedBoundingBox,
    occludeePointInScaledSpace: statistics.occludeePointInScaledSpace,
    encoding: statistics.encoding,
    vertexCountWithoutSkirts: statistics.vertexCountWithoutSkirts,
    indexCountWithoutSkirts: statistics.indexCountWithoutSkirts,
    westIndicesSouthToNorth: statistics.westIndicesSouthToNorth,
    southIndicesEastToWest: statistics.southIndicesEastToWest,
    eastIndicesNorthToSouth: statistics.eastIndicesNorthToSouth,
    northIndicesWestToEast: statistics.northIndicesWestToEast
  };
}
var scratchCartographic = new Cartographic_default();
var scratchCartesian = new Cartesian3_default();
var minimumScratch = new Cartesian3_default();
var maximumScratch = new Cartesian3_default();
var matrix4Scratch = new Matrix4_default();
function processBuffer(buffer, relativeToCenter, ellipsoid, rectangle, nativeRectangle, exaggeration, exaggerationRelativeHeight, skirtHeight, includeWebMercatorT, negativeAltitudeExponentBias, negativeElevationThreshold) {
  let geographicWest;
  let geographicSouth;
  let geographicEast;
  let geographicNorth;
  let rectangleWidth, rectangleHeight;
  if (!defined_default(rectangle)) {
    geographicWest = Math_default.toRadians(nativeRectangle.west);
    geographicSouth = Math_default.toRadians(nativeRectangle.south);
    geographicEast = Math_default.toRadians(nativeRectangle.east);
    geographicNorth = Math_default.toRadians(nativeRectangle.north);
    rectangleWidth = Math_default.toRadians(rectangle.width);
    rectangleHeight = Math_default.toRadians(rectangle.height);
  } else {
    geographicWest = rectangle.west;
    geographicSouth = rectangle.south;
    geographicEast = rectangle.east;
    geographicNorth = rectangle.north;
    rectangleWidth = rectangle.width;
    rectangleHeight = rectangle.height;
  }
  const quadBorderLatitudes = [geographicSouth, geographicNorth];
  const quadBorderLongitudes = [geographicWest, geographicEast];
  const fromENU = Transforms_default.eastNorthUpToFixedFrame(
    relativeToCenter,
    ellipsoid
  );
  const toENU = Matrix4_default.inverseTransformation(fromENU, matrix4Scratch);
  let southMercatorY;
  let oneOverMercatorHeight;
  if (includeWebMercatorT) {
    southMercatorY = WebMercatorProjection_default.geodeticLatitudeToMercatorAngle(
      geographicSouth
    );
    oneOverMercatorHeight = 1 / (WebMercatorProjection_default.geodeticLatitudeToMercatorAngle(geographicNorth) - southMercatorY);
  }
  const hasExaggeration = exaggeration !== 1;
  const includeGeodeticSurfaceNormals = hasExaggeration;
  const dv = new DataView(buffer);
  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;
  const minimum = minimumScratch;
  minimum.x = Number.POSITIVE_INFINITY;
  minimum.y = Number.POSITIVE_INFINITY;
  minimum.z = Number.POSITIVE_INFINITY;
  const maximum = maximumScratch;
  maximum.x = Number.NEGATIVE_INFINITY;
  maximum.y = Number.NEGATIVE_INFINITY;
  maximum.z = Number.NEGATIVE_INFINITY;
  let offset = 0;
  let size = 0;
  let indicesSize = 0;
  let quadSize;
  let quad;
  for (quad = 0; quad < 4; ++quad) {
    let o = offset;
    quadSize = dv.getUint32(o, true);
    o += sizeOfUint32;
    const x = Math_default.toRadians(dv.getFloat64(o, true) * 180);
    o += sizeOfDouble;
    if (indexOfEpsilon(quadBorderLongitudes, x) === -1) {
      quadBorderLongitudes.push(x);
    }
    const y = Math_default.toRadians(dv.getFloat64(o, true) * 180);
    o += sizeOfDouble;
    if (indexOfEpsilon(quadBorderLatitudes, y) === -1) {
      quadBorderLatitudes.push(y);
    }
    o += 2 * sizeOfDouble;
    let c = dv.getInt32(o, true);
    o += sizeOfInt32;
    size += c;
    c = dv.getInt32(o, true);
    indicesSize += c * 3;
    offset += quadSize + sizeOfUint32;
  }
  const quadBorderPoints = [];
  const quadBorderIndices = [];
  const positions = new Array(size);
  const uvs = new Array(size);
  const heights = new Array(size);
  const webMercatorTs = includeWebMercatorT ? new Array(size) : [];
  const geodeticSurfaceNormals = includeGeodeticSurfaceNormals ? new Array(size) : [];
  const indices = new Array(indicesSize);
  const westBorder = [];
  const southBorder = [];
  const eastBorder = [];
  const northBorder = [];
  let pointOffset = 0;
  let indicesOffset = 0;
  offset = 0;
  for (quad = 0; quad < 4; ++quad) {
    quadSize = dv.getUint32(offset, true);
    offset += sizeOfUint32;
    const startQuad = offset;
    const originX = Math_default.toRadians(dv.getFloat64(offset, true) * 180);
    offset += sizeOfDouble;
    const originY = Math_default.toRadians(dv.getFloat64(offset, true) * 180);
    offset += sizeOfDouble;
    const stepX = Math_default.toRadians(dv.getFloat64(offset, true) * 180);
    const halfStepX = stepX * 0.5;
    offset += sizeOfDouble;
    const stepY = Math_default.toRadians(dv.getFloat64(offset, true) * 180);
    const halfStepY = stepY * 0.5;
    offset += sizeOfDouble;
    const numPoints = dv.getInt32(offset, true);
    offset += sizeOfInt32;
    const numFaces = dv.getInt32(offset, true);
    offset += sizeOfInt32;
    offset += sizeOfInt32;
    const indicesMapping = new Array(numPoints);
    for (let i = 0; i < numPoints; ++i) {
      const longitude = originX + dv.getUint8(offset++) * stepX;
      scratchCartographic.longitude = longitude;
      const latitude = originY + dv.getUint8(offset++) * stepY;
      scratchCartographic.latitude = latitude;
      let height = dv.getFloat32(offset, true);
      offset += sizeOfFloat;
      if (height !== 0 && height < negativeElevationThreshold) {
        height *= -Math.pow(2, negativeAltitudeExponentBias);
      }
      height *= 6371010;
      scratchCartographic.height = height;
      if (indexOfEpsilon(quadBorderLongitudes, longitude) !== -1 || indexOfEpsilon(quadBorderLatitudes, latitude) !== -1) {
        const index = indexOfEpsilon(
          quadBorderPoints,
          scratchCartographic,
          Cartographic_default
        );
        if (index === -1) {
          quadBorderPoints.push(Cartographic_default.clone(scratchCartographic));
          quadBorderIndices.push(pointOffset);
        } else {
          indicesMapping[i] = quadBorderIndices[index];
          continue;
        }
      }
      indicesMapping[i] = pointOffset;
      if (Math.abs(longitude - geographicWest) < halfStepX) {
        westBorder.push({
          index: pointOffset,
          cartographic: Cartographic_default.clone(scratchCartographic)
        });
      } else if (Math.abs(longitude - geographicEast) < halfStepX) {
        eastBorder.push({
          index: pointOffset,
          cartographic: Cartographic_default.clone(scratchCartographic)
        });
      } else if (Math.abs(latitude - geographicSouth) < halfStepY) {
        southBorder.push({
          index: pointOffset,
          cartographic: Cartographic_default.clone(scratchCartographic)
        });
      } else if (Math.abs(latitude - geographicNorth) < halfStepY) {
        northBorder.push({
          index: pointOffset,
          cartographic: Cartographic_default.clone(scratchCartographic)
        });
      }
      minHeight = Math.min(height, minHeight);
      maxHeight = Math.max(height, maxHeight);
      heights[pointOffset] = height;
      const pos = ellipsoid.cartographicToCartesian(scratchCartographic);
      positions[pointOffset] = pos;
      if (includeWebMercatorT) {
        webMercatorTs[pointOffset] = (WebMercatorProjection_default.geodeticLatitudeToMercatorAngle(latitude) - southMercatorY) * oneOverMercatorHeight;
      }
      if (includeGeodeticSurfaceNormals) {
        const normal = ellipsoid.geodeticSurfaceNormal(pos);
        geodeticSurfaceNormals[pointOffset] = normal;
      }
      Matrix4_default.multiplyByPoint(toENU, pos, scratchCartesian);
      Cartesian3_default.minimumByComponent(scratchCartesian, minimum, minimum);
      Cartesian3_default.maximumByComponent(scratchCartesian, maximum, maximum);
      let u = (longitude - geographicWest) / (geographicEast - geographicWest);
      u = Math_default.clamp(u, 0, 1);
      let v = (latitude - geographicSouth) / (geographicNorth - geographicSouth);
      v = Math_default.clamp(v, 0, 1);
      uvs[pointOffset] = new Cartesian2_default(u, v);
      ++pointOffset;
    }
    const facesElementCount = numFaces * 3;
    for (let j = 0; j < facesElementCount; ++j, ++indicesOffset) {
      indices[indicesOffset] = indicesMapping[dv.getUint16(offset, true)];
      offset += sizeOfUint16;
    }
    if (quadSize !== offset - startQuad) {
      throw new RuntimeError_default("Invalid terrain tile.");
    }
  }
  positions.length = pointOffset;
  uvs.length = pointOffset;
  heights.length = pointOffset;
  if (includeWebMercatorT) {
    webMercatorTs.length = pointOffset;
  }
  if (includeGeodeticSurfaceNormals) {
    geodeticSurfaceNormals.length = pointOffset;
  }
  const vertexCountWithoutSkirts = pointOffset;
  const indexCountWithoutSkirts = indicesOffset;
  const skirtOptions = {
    hMin: minHeight,
    lastBorderPoint: void 0,
    skirtHeight,
    toENU,
    ellipsoid,
    minimum,
    maximum
  };
  westBorder.sort(function(a, b) {
    return b.cartographic.latitude - a.cartographic.latitude;
  });
  southBorder.sort(function(a, b) {
    return a.cartographic.longitude - b.cartographic.longitude;
  });
  eastBorder.sort(function(a, b) {
    return a.cartographic.latitude - b.cartographic.latitude;
  });
  northBorder.sort(function(a, b) {
    return b.cartographic.longitude - a.cartographic.longitude;
  });
  const percentage = 1e-5;
  addSkirt(
    positions,
    heights,
    uvs,
    webMercatorTs,
    geodeticSurfaceNormals,
    indices,
    skirtOptions,
    westBorder,
    -percentage * rectangleWidth,
    true,
    -percentage * rectangleHeight
  );
  addSkirt(
    positions,
    heights,
    uvs,
    webMercatorTs,
    geodeticSurfaceNormals,
    indices,
    skirtOptions,
    southBorder,
    -percentage * rectangleHeight,
    false
  );
  addSkirt(
    positions,
    heights,
    uvs,
    webMercatorTs,
    geodeticSurfaceNormals,
    indices,
    skirtOptions,
    eastBorder,
    percentage * rectangleWidth,
    true,
    percentage * rectangleHeight
  );
  addSkirt(
    positions,
    heights,
    uvs,
    webMercatorTs,
    geodeticSurfaceNormals,
    indices,
    skirtOptions,
    northBorder,
    percentage * rectangleHeight,
    false
  );
  if (westBorder.length > 0 && northBorder.length > 0) {
    const firstBorderIndex = westBorder[0].index;
    const firstSkirtIndex = vertexCountWithoutSkirts;
    const lastBorderIndex = northBorder[northBorder.length - 1].index;
    const lastSkirtIndex = positions.length - 1;
    indices.push(
      lastBorderIndex,
      lastSkirtIndex,
      firstSkirtIndex,
      firstSkirtIndex,
      firstBorderIndex,
      lastBorderIndex
    );
  }
  size = positions.length;
  const boundingSphere3D = BoundingSphere_default.fromPoints(positions);
  let orientedBoundingBox;
  if (defined_default(rectangle)) {
    orientedBoundingBox = OrientedBoundingBox_default.fromRectangle(
      rectangle,
      minHeight,
      maxHeight,
      ellipsoid
    );
  }
  const occluder = new EllipsoidalOccluder_default(ellipsoid);
  const occludeePointInScaledSpace = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
    relativeToCenter,
    positions,
    minHeight
  );
  const aaBox = new AxisAlignedBoundingBox_default(minimum, maximum, relativeToCenter);
  const encoding = new TerrainEncoding_default(
    relativeToCenter,
    aaBox,
    skirtOptions.hMin,
    maxHeight,
    fromENU,
    false,
    includeWebMercatorT,
    includeGeodeticSurfaceNormals,
    exaggeration,
    exaggerationRelativeHeight
  );
  const vertices = new Float32Array(size * encoding.stride);
  let bufferIndex = 0;
  for (let k = 0; k < size; ++k) {
    bufferIndex = encoding.encode(
      vertices,
      bufferIndex,
      positions[k],
      uvs[k],
      heights[k],
      void 0,
      webMercatorTs[k],
      geodeticSurfaceNormals[k]
    );
  }
  const westIndicesSouthToNorth = westBorder.map(function(vertex) {
    return vertex.index;
  }).reverse();
  const southIndicesEastToWest = southBorder.map(function(vertex) {
    return vertex.index;
  }).reverse();
  const eastIndicesNorthToSouth = eastBorder.map(function(vertex) {
    return vertex.index;
  }).reverse();
  const northIndicesWestToEast = northBorder.map(function(vertex) {
    return vertex.index;
  }).reverse();
  southIndicesEastToWest.unshift(
    eastIndicesNorthToSouth[eastIndicesNorthToSouth.length - 1]
  );
  southIndicesEastToWest.push(westIndicesSouthToNorth[0]);
  northIndicesWestToEast.unshift(
    westIndicesSouthToNorth[westIndicesSouthToNorth.length - 1]
  );
  northIndicesWestToEast.push(eastIndicesNorthToSouth[0]);
  return {
    vertices,
    indices: new Uint16Array(indices),
    maximumHeight: maxHeight,
    minimumHeight: minHeight,
    encoding,
    boundingSphere3D,
    orientedBoundingBox,
    occludeePointInScaledSpace,
    vertexCountWithoutSkirts,
    indexCountWithoutSkirts,
    westIndicesSouthToNorth,
    southIndicesEastToWest,
    eastIndicesNorthToSouth,
    northIndicesWestToEast
  };
}
function addSkirt(positions, heights, uvs, webMercatorTs, geodeticSurfaceNormals, indices, skirtOptions, borderPoints, fudgeFactor, eastOrWest, cornerFudge) {
  const count = borderPoints.length;
  for (let j = 0; j < count; ++j) {
    const borderPoint = borderPoints[j];
    const borderCartographic = borderPoint.cartographic;
    const borderIndex = borderPoint.index;
    const currentIndex = positions.length;
    const longitude = borderCartographic.longitude;
    let latitude = borderCartographic.latitude;
    latitude = Math_default.clamp(
      latitude,
      -Math_default.PI_OVER_TWO,
      Math_default.PI_OVER_TWO
    );
    const height = borderCartographic.height - skirtOptions.skirtHeight;
    skirtOptions.hMin = Math.min(skirtOptions.hMin, height);
    Cartographic_default.fromRadians(longitude, latitude, height, scratchCartographic);
    if (eastOrWest) {
      scratchCartographic.longitude += fudgeFactor;
    }
    if (!eastOrWest) {
      scratchCartographic.latitude += fudgeFactor;
    } else if (j === count - 1) {
      scratchCartographic.latitude += cornerFudge;
    } else if (j === 0) {
      scratchCartographic.latitude -= cornerFudge;
    }
    const pos = skirtOptions.ellipsoid.cartographicToCartesian(
      scratchCartographic
    );
    positions.push(pos);
    heights.push(height);
    uvs.push(Cartesian2_default.clone(uvs[borderIndex]));
    if (webMercatorTs.length > 0) {
      webMercatorTs.push(webMercatorTs[borderIndex]);
    }
    if (geodeticSurfaceNormals.length > 0) {
      geodeticSurfaceNormals.push(geodeticSurfaceNormals[borderIndex]);
    }
    Matrix4_default.multiplyByPoint(skirtOptions.toENU, pos, scratchCartesian);
    const minimum = skirtOptions.minimum;
    const maximum = skirtOptions.maximum;
    Cartesian3_default.minimumByComponent(scratchCartesian, minimum, minimum);
    Cartesian3_default.maximumByComponent(scratchCartesian, maximum, maximum);
    const lastBorderPoint = skirtOptions.lastBorderPoint;
    if (defined_default(lastBorderPoint)) {
      const lastBorderIndex = lastBorderPoint.index;
      indices.push(
        lastBorderIndex,
        currentIndex - 1,
        currentIndex,
        currentIndex,
        borderIndex,
        lastBorderIndex
      );
    }
    skirtOptions.lastBorderPoint = borderPoint;
  }
}
var createVerticesFromGoogleEarthEnterpriseBuffer_default = createTaskProcessorWorker_default(
  createVerticesFromGoogleEarthEnterpriseBuffer
);
export {
  createVerticesFromGoogleEarthEnterpriseBuffer_default as default
};
