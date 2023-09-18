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
  OrientedBoundingBox_default
} from "./chunk-YQGUKCJO.js";
import {
  AttributeCompression_default
} from "./chunk-IJT7RSPE.js";
import "./chunk-LATQ4URD.js";
import "./chunk-IYKFKVQR.js";
import "./chunk-MKJM6R4K.js";
import "./chunk-PY3JQBWU.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  BoundingSphere_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import {
  Cartesian2_default,
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
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/Intersections2D.js
var Intersections2D = {};
Intersections2D.clipTriangleAtAxisAlignedThreshold = function(threshold, keepAbove, u0, u1, u2, result) {
  if (!defined_default(threshold)) {
    throw new DeveloperError_default("threshold is required.");
  }
  if (!defined_default(keepAbove)) {
    throw new DeveloperError_default("keepAbove is required.");
  }
  if (!defined_default(u0)) {
    throw new DeveloperError_default("u0 is required.");
  }
  if (!defined_default(u1)) {
    throw new DeveloperError_default("u1 is required.");
  }
  if (!defined_default(u2)) {
    throw new DeveloperError_default("u2 is required.");
  }
  if (!defined_default(result)) {
    result = [];
  } else {
    result.length = 0;
  }
  let u0Behind;
  let u1Behind;
  let u2Behind;
  if (keepAbove) {
    u0Behind = u0 < threshold;
    u1Behind = u1 < threshold;
    u2Behind = u2 < threshold;
  } else {
    u0Behind = u0 > threshold;
    u1Behind = u1 > threshold;
    u2Behind = u2 > threshold;
  }
  const numBehind = u0Behind + u1Behind + u2Behind;
  let u01Ratio;
  let u02Ratio;
  let u12Ratio;
  let u10Ratio;
  let u20Ratio;
  let u21Ratio;
  if (numBehind === 1) {
    if (u0Behind) {
      u01Ratio = (threshold - u0) / (u1 - u0);
      u02Ratio = (threshold - u0) / (u2 - u0);
      result.push(1);
      result.push(2);
      if (u02Ratio !== 1) {
        result.push(-1);
        result.push(0);
        result.push(2);
        result.push(u02Ratio);
      }
      if (u01Ratio !== 1) {
        result.push(-1);
        result.push(0);
        result.push(1);
        result.push(u01Ratio);
      }
    } else if (u1Behind) {
      u12Ratio = (threshold - u1) / (u2 - u1);
      u10Ratio = (threshold - u1) / (u0 - u1);
      result.push(2);
      result.push(0);
      if (u10Ratio !== 1) {
        result.push(-1);
        result.push(1);
        result.push(0);
        result.push(u10Ratio);
      }
      if (u12Ratio !== 1) {
        result.push(-1);
        result.push(1);
        result.push(2);
        result.push(u12Ratio);
      }
    } else if (u2Behind) {
      u20Ratio = (threshold - u2) / (u0 - u2);
      u21Ratio = (threshold - u2) / (u1 - u2);
      result.push(0);
      result.push(1);
      if (u21Ratio !== 1) {
        result.push(-1);
        result.push(2);
        result.push(1);
        result.push(u21Ratio);
      }
      if (u20Ratio !== 1) {
        result.push(-1);
        result.push(2);
        result.push(0);
        result.push(u20Ratio);
      }
    }
  } else if (numBehind === 2) {
    if (!u0Behind && u0 !== threshold) {
      u10Ratio = (threshold - u1) / (u0 - u1);
      u20Ratio = (threshold - u2) / (u0 - u2);
      result.push(0);
      result.push(-1);
      result.push(1);
      result.push(0);
      result.push(u10Ratio);
      result.push(-1);
      result.push(2);
      result.push(0);
      result.push(u20Ratio);
    } else if (!u1Behind && u1 !== threshold) {
      u21Ratio = (threshold - u2) / (u1 - u2);
      u01Ratio = (threshold - u0) / (u1 - u0);
      result.push(1);
      result.push(-1);
      result.push(2);
      result.push(1);
      result.push(u21Ratio);
      result.push(-1);
      result.push(0);
      result.push(1);
      result.push(u01Ratio);
    } else if (!u2Behind && u2 !== threshold) {
      u02Ratio = (threshold - u0) / (u2 - u0);
      u12Ratio = (threshold - u1) / (u2 - u1);
      result.push(2);
      result.push(-1);
      result.push(0);
      result.push(2);
      result.push(u02Ratio);
      result.push(-1);
      result.push(1);
      result.push(2);
      result.push(u12Ratio);
    }
  } else if (numBehind !== 3) {
    result.push(0);
    result.push(1);
    result.push(2);
  }
  return result;
};
Intersections2D.computeBarycentricCoordinates = function(x, y, x1, y1, x2, y2, x3, y3, result) {
  if (!defined_default(x)) {
    throw new DeveloperError_default("x is required.");
  }
  if (!defined_default(y)) {
    throw new DeveloperError_default("y is required.");
  }
  if (!defined_default(x1)) {
    throw new DeveloperError_default("x1 is required.");
  }
  if (!defined_default(y1)) {
    throw new DeveloperError_default("y1 is required.");
  }
  if (!defined_default(x2)) {
    throw new DeveloperError_default("x2 is required.");
  }
  if (!defined_default(y2)) {
    throw new DeveloperError_default("y2 is required.");
  }
  if (!defined_default(x3)) {
    throw new DeveloperError_default("x3 is required.");
  }
  if (!defined_default(y3)) {
    throw new DeveloperError_default("y3 is required.");
  }
  const x1mx3 = x1 - x3;
  const x3mx2 = x3 - x2;
  const y2my3 = y2 - y3;
  const y1my3 = y1 - y3;
  const inverseDeterminant = 1 / (y2my3 * x1mx3 + x3mx2 * y1my3);
  const ymy3 = y - y3;
  const xmx3 = x - x3;
  const l1 = (y2my3 * xmx3 + x3mx2 * ymy3) * inverseDeterminant;
  const l2 = (-y1my3 * xmx3 + x1mx3 * ymy3) * inverseDeterminant;
  const l3 = 1 - l1 - l2;
  if (defined_default(result)) {
    result.x = l1;
    result.y = l2;
    result.z = l3;
    return result;
  }
  return new Cartesian3_default(l1, l2, l3);
};
Intersections2D.computeLineSegmentLineSegmentIntersection = function(x00, y00, x01, y01, x10, y10, x11, y11, result) {
  Check_default.typeOf.number("x00", x00);
  Check_default.typeOf.number("y00", y00);
  Check_default.typeOf.number("x01", x01);
  Check_default.typeOf.number("y01", y01);
  Check_default.typeOf.number("x10", x10);
  Check_default.typeOf.number("y10", y10);
  Check_default.typeOf.number("x11", x11);
  Check_default.typeOf.number("y11", y11);
  const numerator1A = (x11 - x10) * (y00 - y10) - (y11 - y10) * (x00 - x10);
  const numerator1B = (x01 - x00) * (y00 - y10) - (y01 - y00) * (x00 - x10);
  const denominator1 = (y11 - y10) * (x01 - x00) - (x11 - x10) * (y01 - y00);
  if (denominator1 === 0) {
    return;
  }
  const ua1 = numerator1A / denominator1;
  const ub1 = numerator1B / denominator1;
  if (ua1 >= 0 && ua1 <= 1 && ub1 >= 0 && ub1 <= 1) {
    if (!defined_default(result)) {
      result = new Cartesian2_default();
    }
    result.x = x00 + ua1 * (x01 - x00);
    result.y = y00 + ua1 * (y01 - y00);
    return result;
  }
};
var Intersections2D_default = Intersections2D;

// packages/engine/Source/Workers/upsampleQuantizedTerrainMesh.js
var maxShort = 32767;
var halfMaxShort = maxShort / 2 | 0;
var clipScratch = [];
var clipScratch2 = [];
var verticesScratch = [];
var cartographicScratch = new Cartographic_default();
var cartesian3Scratch = new Cartesian3_default();
var uScratch = [];
var vScratch = [];
var heightScratch = [];
var indicesScratch = [];
var normalsScratch = [];
var horizonOcclusionPointScratch = new Cartesian3_default();
var boundingSphereScratch = new BoundingSphere_default();
var orientedBoundingBoxScratch = new OrientedBoundingBox_default();
var decodeTexCoordsScratch = new Cartesian2_default();
var octEncodedNormalScratch = new Cartesian3_default();
function upsampleQuantizedTerrainMesh(parameters, transferableObjects) {
  const isEastChild = parameters.isEastChild;
  const isNorthChild = parameters.isNorthChild;
  const minU = isEastChild ? halfMaxShort : 0;
  const maxU = isEastChild ? maxShort : halfMaxShort;
  const minV = isNorthChild ? halfMaxShort : 0;
  const maxV = isNorthChild ? maxShort : halfMaxShort;
  const uBuffer = uScratch;
  const vBuffer = vScratch;
  const heightBuffer = heightScratch;
  const normalBuffer = normalsScratch;
  uBuffer.length = 0;
  vBuffer.length = 0;
  heightBuffer.length = 0;
  normalBuffer.length = 0;
  const indices = indicesScratch;
  indices.length = 0;
  const vertexMap = {};
  const parentVertices = parameters.vertices;
  let parentIndices = parameters.indices;
  parentIndices = parentIndices.subarray(0, parameters.indexCountWithoutSkirts);
  const encoding = TerrainEncoding_default.clone(parameters.encoding);
  const hasVertexNormals = encoding.hasVertexNormals;
  let vertexCount = 0;
  const quantizedVertexCount = parameters.vertexCountWithoutSkirts;
  const parentMinimumHeight = parameters.minimumHeight;
  const parentMaximumHeight = parameters.maximumHeight;
  const parentUBuffer = new Array(quantizedVertexCount);
  const parentVBuffer = new Array(quantizedVertexCount);
  const parentHeightBuffer = new Array(quantizedVertexCount);
  const parentNormalBuffer = hasVertexNormals ? new Array(quantizedVertexCount * 2) : void 0;
  const threshold = 20;
  let height;
  let i, n;
  let u, v;
  for (i = 0, n = 0; i < quantizedVertexCount; ++i, n += 2) {
    const texCoords = encoding.decodeTextureCoordinates(
      parentVertices,
      i,
      decodeTexCoordsScratch
    );
    height = encoding.decodeHeight(parentVertices, i);
    u = Math_default.clamp(texCoords.x * maxShort | 0, 0, maxShort);
    v = Math_default.clamp(texCoords.y * maxShort | 0, 0, maxShort);
    parentHeightBuffer[i] = Math_default.clamp(
      (height - parentMinimumHeight) / (parentMaximumHeight - parentMinimumHeight) * maxShort | 0,
      0,
      maxShort
    );
    if (u < threshold) {
      u = 0;
    }
    if (v < threshold) {
      v = 0;
    }
    if (maxShort - u < threshold) {
      u = maxShort;
    }
    if (maxShort - v < threshold) {
      v = maxShort;
    }
    parentUBuffer[i] = u;
    parentVBuffer[i] = v;
    if (hasVertexNormals) {
      const encodedNormal = encoding.getOctEncodedNormal(
        parentVertices,
        i,
        octEncodedNormalScratch
      );
      parentNormalBuffer[n] = encodedNormal.x;
      parentNormalBuffer[n + 1] = encodedNormal.y;
    }
    if ((isEastChild && u >= halfMaxShort || !isEastChild && u <= halfMaxShort) && (isNorthChild && v >= halfMaxShort || !isNorthChild && v <= halfMaxShort)) {
      vertexMap[i] = vertexCount;
      uBuffer.push(u);
      vBuffer.push(v);
      heightBuffer.push(parentHeightBuffer[i]);
      if (hasVertexNormals) {
        normalBuffer.push(parentNormalBuffer[n]);
        normalBuffer.push(parentNormalBuffer[n + 1]);
      }
      ++vertexCount;
    }
  }
  const triangleVertices = [];
  triangleVertices.push(new Vertex());
  triangleVertices.push(new Vertex());
  triangleVertices.push(new Vertex());
  const clippedTriangleVertices = [];
  clippedTriangleVertices.push(new Vertex());
  clippedTriangleVertices.push(new Vertex());
  clippedTriangleVertices.push(new Vertex());
  let clippedIndex;
  let clipped2;
  for (i = 0; i < parentIndices.length; i += 3) {
    const i0 = parentIndices[i];
    const i1 = parentIndices[i + 1];
    const i2 = parentIndices[i + 2];
    const u0 = parentUBuffer[i0];
    const u1 = parentUBuffer[i1];
    const u2 = parentUBuffer[i2];
    triangleVertices[0].initializeIndexed(
      parentUBuffer,
      parentVBuffer,
      parentHeightBuffer,
      parentNormalBuffer,
      i0
    );
    triangleVertices[1].initializeIndexed(
      parentUBuffer,
      parentVBuffer,
      parentHeightBuffer,
      parentNormalBuffer,
      i1
    );
    triangleVertices[2].initializeIndexed(
      parentUBuffer,
      parentVBuffer,
      parentHeightBuffer,
      parentNormalBuffer,
      i2
    );
    const clipped = Intersections2D_default.clipTriangleAtAxisAlignedThreshold(
      halfMaxShort,
      isEastChild,
      u0,
      u1,
      u2,
      clipScratch
    );
    clippedIndex = 0;
    if (clippedIndex >= clipped.length) {
      continue;
    }
    clippedIndex = clippedTriangleVertices[0].initializeFromClipResult(
      clipped,
      clippedIndex,
      triangleVertices
    );
    if (clippedIndex >= clipped.length) {
      continue;
    }
    clippedIndex = clippedTriangleVertices[1].initializeFromClipResult(
      clipped,
      clippedIndex,
      triangleVertices
    );
    if (clippedIndex >= clipped.length) {
      continue;
    }
    clippedIndex = clippedTriangleVertices[2].initializeFromClipResult(
      clipped,
      clippedIndex,
      triangleVertices
    );
    clipped2 = Intersections2D_default.clipTriangleAtAxisAlignedThreshold(
      halfMaxShort,
      isNorthChild,
      clippedTriangleVertices[0].getV(),
      clippedTriangleVertices[1].getV(),
      clippedTriangleVertices[2].getV(),
      clipScratch2
    );
    addClippedPolygon(
      uBuffer,
      vBuffer,
      heightBuffer,
      normalBuffer,
      indices,
      vertexMap,
      clipped2,
      clippedTriangleVertices,
      hasVertexNormals
    );
    if (clippedIndex < clipped.length) {
      clippedTriangleVertices[2].clone(clippedTriangleVertices[1]);
      clippedTriangleVertices[2].initializeFromClipResult(
        clipped,
        clippedIndex,
        triangleVertices
      );
      clipped2 = Intersections2D_default.clipTriangleAtAxisAlignedThreshold(
        halfMaxShort,
        isNorthChild,
        clippedTriangleVertices[0].getV(),
        clippedTriangleVertices[1].getV(),
        clippedTriangleVertices[2].getV(),
        clipScratch2
      );
      addClippedPolygon(
        uBuffer,
        vBuffer,
        heightBuffer,
        normalBuffer,
        indices,
        vertexMap,
        clipped2,
        clippedTriangleVertices,
        hasVertexNormals
      );
    }
  }
  const uOffset = isEastChild ? -maxShort : 0;
  const vOffset = isNorthChild ? -maxShort : 0;
  const westIndices = [];
  const southIndices = [];
  const eastIndices = [];
  const northIndices = [];
  let minimumHeight = Number.MAX_VALUE;
  let maximumHeight = -minimumHeight;
  const cartesianVertices = verticesScratch;
  cartesianVertices.length = 0;
  const ellipsoid = Ellipsoid_default.clone(parameters.ellipsoid);
  const rectangle = Rectangle_default.clone(parameters.childRectangle);
  const north = rectangle.north;
  const south = rectangle.south;
  let east = rectangle.east;
  const west = rectangle.west;
  if (east < west) {
    east += Math_default.TWO_PI;
  }
  for (i = 0; i < uBuffer.length; ++i) {
    u = Math.round(uBuffer[i]);
    if (u <= minU) {
      westIndices.push(i);
      u = 0;
    } else if (u >= maxU) {
      eastIndices.push(i);
      u = maxShort;
    } else {
      u = u * 2 + uOffset;
    }
    uBuffer[i] = u;
    v = Math.round(vBuffer[i]);
    if (v <= minV) {
      southIndices.push(i);
      v = 0;
    } else if (v >= maxV) {
      northIndices.push(i);
      v = maxShort;
    } else {
      v = v * 2 + vOffset;
    }
    vBuffer[i] = v;
    height = Math_default.lerp(
      parentMinimumHeight,
      parentMaximumHeight,
      heightBuffer[i] / maxShort
    );
    if (height < minimumHeight) {
      minimumHeight = height;
    }
    if (height > maximumHeight) {
      maximumHeight = height;
    }
    heightBuffer[i] = height;
    cartographicScratch.longitude = Math_default.lerp(west, east, u / maxShort);
    cartographicScratch.latitude = Math_default.lerp(south, north, v / maxShort);
    cartographicScratch.height = height;
    ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);
    cartesianVertices.push(cartesian3Scratch.x);
    cartesianVertices.push(cartesian3Scratch.y);
    cartesianVertices.push(cartesian3Scratch.z);
  }
  const boundingSphere = BoundingSphere_default.fromVertices(
    cartesianVertices,
    Cartesian3_default.ZERO,
    3,
    boundingSphereScratch
  );
  const orientedBoundingBox = OrientedBoundingBox_default.fromRectangle(
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid,
    orientedBoundingBoxScratch
  );
  const occluder = new EllipsoidalOccluder_default(ellipsoid);
  const horizonOcclusionPoint = occluder.computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid(
    boundingSphere.center,
    cartesianVertices,
    3,
    boundingSphere.center,
    minimumHeight,
    horizonOcclusionPointScratch
  );
  const heightRange = maximumHeight - minimumHeight;
  const vertices = new Uint16Array(
    uBuffer.length + vBuffer.length + heightBuffer.length
  );
  for (i = 0; i < uBuffer.length; ++i) {
    vertices[i] = uBuffer[i];
  }
  let start = uBuffer.length;
  for (i = 0; i < vBuffer.length; ++i) {
    vertices[start + i] = vBuffer[i];
  }
  start += vBuffer.length;
  for (i = 0; i < heightBuffer.length; ++i) {
    vertices[start + i] = maxShort * (heightBuffer[i] - minimumHeight) / heightRange;
  }
  const indicesTypedArray = IndexDatatype_default.createTypedArray(
    uBuffer.length,
    indices
  );
  let encodedNormals;
  if (hasVertexNormals) {
    const normalArray = new Uint8Array(normalBuffer);
    transferableObjects.push(
      vertices.buffer,
      indicesTypedArray.buffer,
      normalArray.buffer
    );
    encodedNormals = normalArray.buffer;
  } else {
    transferableObjects.push(vertices.buffer, indicesTypedArray.buffer);
  }
  return {
    vertices: vertices.buffer,
    encodedNormals,
    indices: indicesTypedArray.buffer,
    minimumHeight,
    maximumHeight,
    westIndices,
    southIndices,
    eastIndices,
    northIndices,
    boundingSphere,
    orientedBoundingBox,
    horizonOcclusionPoint
  };
}
function Vertex() {
  this.vertexBuffer = void 0;
  this.index = void 0;
  this.first = void 0;
  this.second = void 0;
  this.ratio = void 0;
}
Vertex.prototype.clone = function(result) {
  if (!defined_default(result)) {
    result = new Vertex();
  }
  result.uBuffer = this.uBuffer;
  result.vBuffer = this.vBuffer;
  result.heightBuffer = this.heightBuffer;
  result.normalBuffer = this.normalBuffer;
  result.index = this.index;
  result.first = this.first;
  result.second = this.second;
  result.ratio = this.ratio;
  return result;
};
Vertex.prototype.initializeIndexed = function(uBuffer, vBuffer, heightBuffer, normalBuffer, index) {
  this.uBuffer = uBuffer;
  this.vBuffer = vBuffer;
  this.heightBuffer = heightBuffer;
  this.normalBuffer = normalBuffer;
  this.index = index;
  this.first = void 0;
  this.second = void 0;
  this.ratio = void 0;
};
Vertex.prototype.initializeFromClipResult = function(clipResult, index, vertices) {
  let nextIndex = index + 1;
  if (clipResult[index] !== -1) {
    vertices[clipResult[index]].clone(this);
  } else {
    this.vertexBuffer = void 0;
    this.index = void 0;
    this.first = vertices[clipResult[nextIndex]];
    ++nextIndex;
    this.second = vertices[clipResult[nextIndex]];
    ++nextIndex;
    this.ratio = clipResult[nextIndex];
    ++nextIndex;
  }
  return nextIndex;
};
Vertex.prototype.getKey = function() {
  if (this.isIndexed()) {
    return this.index;
  }
  return JSON.stringify({
    first: this.first.getKey(),
    second: this.second.getKey(),
    ratio: this.ratio
  });
};
Vertex.prototype.isIndexed = function() {
  return defined_default(this.index);
};
Vertex.prototype.getH = function() {
  if (defined_default(this.index)) {
    return this.heightBuffer[this.index];
  }
  return Math_default.lerp(this.first.getH(), this.second.getH(), this.ratio);
};
Vertex.prototype.getU = function() {
  if (defined_default(this.index)) {
    return this.uBuffer[this.index];
  }
  return Math_default.lerp(this.first.getU(), this.second.getU(), this.ratio);
};
Vertex.prototype.getV = function() {
  if (defined_default(this.index)) {
    return this.vBuffer[this.index];
  }
  return Math_default.lerp(this.first.getV(), this.second.getV(), this.ratio);
};
var encodedScratch = new Cartesian2_default();
var depth = -1;
var cartesianScratch1 = [new Cartesian3_default(), new Cartesian3_default()];
var cartesianScratch2 = [new Cartesian3_default(), new Cartesian3_default()];
function lerpOctEncodedNormal(vertex, result) {
  ++depth;
  let first = cartesianScratch1[depth];
  let second = cartesianScratch2[depth];
  first = AttributeCompression_default.octDecode(
    vertex.first.getNormalX(),
    vertex.first.getNormalY(),
    first
  );
  second = AttributeCompression_default.octDecode(
    vertex.second.getNormalX(),
    vertex.second.getNormalY(),
    second
  );
  cartesian3Scratch = Cartesian3_default.lerp(
    first,
    second,
    vertex.ratio,
    cartesian3Scratch
  );
  Cartesian3_default.normalize(cartesian3Scratch, cartesian3Scratch);
  AttributeCompression_default.octEncode(cartesian3Scratch, result);
  --depth;
  return result;
}
Vertex.prototype.getNormalX = function() {
  if (defined_default(this.index)) {
    return this.normalBuffer[this.index * 2];
  }
  encodedScratch = lerpOctEncodedNormal(this, encodedScratch);
  return encodedScratch.x;
};
Vertex.prototype.getNormalY = function() {
  if (defined_default(this.index)) {
    return this.normalBuffer[this.index * 2 + 1];
  }
  encodedScratch = lerpOctEncodedNormal(this, encodedScratch);
  return encodedScratch.y;
};
var polygonVertices = [];
polygonVertices.push(new Vertex());
polygonVertices.push(new Vertex());
polygonVertices.push(new Vertex());
polygonVertices.push(new Vertex());
function addClippedPolygon(uBuffer, vBuffer, heightBuffer, normalBuffer, indices, vertexMap, clipped, triangleVertices, hasVertexNormals) {
  if (clipped.length === 0) {
    return;
  }
  let numVertices = 0;
  let clippedIndex = 0;
  while (clippedIndex < clipped.length) {
    clippedIndex = polygonVertices[numVertices++].initializeFromClipResult(
      clipped,
      clippedIndex,
      triangleVertices
    );
  }
  for (let i = 0; i < numVertices; ++i) {
    const polygonVertex = polygonVertices[i];
    if (!polygonVertex.isIndexed()) {
      const key = polygonVertex.getKey();
      if (defined_default(vertexMap[key])) {
        polygonVertex.newIndex = vertexMap[key];
      } else {
        const newIndex = uBuffer.length;
        uBuffer.push(polygonVertex.getU());
        vBuffer.push(polygonVertex.getV());
        heightBuffer.push(polygonVertex.getH());
        if (hasVertexNormals) {
          normalBuffer.push(polygonVertex.getNormalX());
          normalBuffer.push(polygonVertex.getNormalY());
        }
        polygonVertex.newIndex = newIndex;
        vertexMap[key] = newIndex;
      }
    } else {
      polygonVertex.newIndex = vertexMap[polygonVertex.index];
      polygonVertex.uBuffer = uBuffer;
      polygonVertex.vBuffer = vBuffer;
      polygonVertex.heightBuffer = heightBuffer;
      if (hasVertexNormals) {
        polygonVertex.normalBuffer = normalBuffer;
      }
    }
  }
  if (numVertices === 3) {
    indices.push(polygonVertices[0].newIndex);
    indices.push(polygonVertices[1].newIndex);
    indices.push(polygonVertices[2].newIndex);
  } else if (numVertices === 4) {
    indices.push(polygonVertices[0].newIndex);
    indices.push(polygonVertices[1].newIndex);
    indices.push(polygonVertices[2].newIndex);
    indices.push(polygonVertices[0].newIndex);
    indices.push(polygonVertices[2].newIndex);
    indices.push(polygonVertices[3].newIndex);
  }
}
var upsampleQuantizedTerrainMesh_default = createTaskProcessorWorker_default(upsampleQuantizedTerrainMesh);
export {
  upsampleQuantizedTerrainMesh_default as default
};
