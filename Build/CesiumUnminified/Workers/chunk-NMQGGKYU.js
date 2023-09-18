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
  ArcType_default
} from "./chunk-7ZN7OZXO.js";
import {
  GeometryPipeline_default
} from "./chunk-NMEDZZL7.js";
import {
  PolygonPipeline_default,
  WindingOrder_default
} from "./chunk-3DTYZXHQ.js";
import {
  arrayRemoveDuplicates_default
} from "./chunk-PZS6RNLR.js";
import {
  EllipsoidRhumbLine_default
} from "./chunk-RSJG3PFO.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  GeometryAttributes_default
} from "./chunk-CHKMKWJP.js";
import {
  GeometryAttribute_default,
  Geometry_default,
  PrimitiveType_default
} from "./chunk-LBUZCHJN.js";
import {
  Quaternion_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default
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
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/Queue.js
function Queue() {
  this._array = [];
  this._offset = 0;
  this._length = 0;
}
Object.defineProperties(Queue.prototype, {
  /**
   * The length of the queue.
   *
   * @memberof Queue.prototype
   *
   * @type {number}
   * @readonly
   */
  length: {
    get: function() {
      return this._length;
    }
  }
});
Queue.prototype.enqueue = function(item) {
  this._array.push(item);
  this._length++;
};
Queue.prototype.dequeue = function() {
  if (this._length === 0) {
    return void 0;
  }
  const array = this._array;
  let offset = this._offset;
  const item = array[offset];
  array[offset] = void 0;
  offset++;
  if (offset > 10 && offset * 2 > array.length) {
    this._array = array.slice(offset);
    offset = 0;
  }
  this._offset = offset;
  this._length--;
  return item;
};
Queue.prototype.peek = function() {
  if (this._length === 0) {
    return void 0;
  }
  return this._array[this._offset];
};
Queue.prototype.contains = function(item) {
  return this._array.indexOf(item) !== -1;
};
Queue.prototype.clear = function() {
  this._array.length = this._offset = this._length = 0;
};
Queue.prototype.sort = function(compareFunction) {
  if (this._offset > 0) {
    this._array = this._array.slice(this._offset);
    this._offset = 0;
  }
  this._array.sort(compareFunction);
};
var Queue_default = Queue;

// packages/engine/Source/Core/PolygonGeometryLibrary.js
var PolygonGeometryLibrary = {};
PolygonGeometryLibrary.computeHierarchyPackedLength = function(polygonHierarchy, CartesianX) {
  let numComponents = 0;
  const stack = [polygonHierarchy];
  while (stack.length > 0) {
    const hierarchy = stack.pop();
    if (!defined_default(hierarchy)) {
      continue;
    }
    numComponents += 2;
    const positions = hierarchy.positions;
    const holes = hierarchy.holes;
    if (defined_default(positions) && positions.length > 0) {
      numComponents += positions.length * CartesianX.packedLength;
    }
    if (defined_default(holes)) {
      const length = holes.length;
      for (let i = 0; i < length; ++i) {
        stack.push(holes[i]);
      }
    }
  }
  return numComponents;
};
PolygonGeometryLibrary.packPolygonHierarchy = function(polygonHierarchy, array, startingIndex, CartesianX) {
  const stack = [polygonHierarchy];
  while (stack.length > 0) {
    const hierarchy = stack.pop();
    if (!defined_default(hierarchy)) {
      continue;
    }
    const positions = hierarchy.positions;
    const holes = hierarchy.holes;
    array[startingIndex++] = defined_default(positions) ? positions.length : 0;
    array[startingIndex++] = defined_default(holes) ? holes.length : 0;
    if (defined_default(positions)) {
      const positionsLength = positions.length;
      for (let i = 0; i < positionsLength; ++i, startingIndex += CartesianX.packedLength) {
        CartesianX.pack(positions[i], array, startingIndex);
      }
    }
    if (defined_default(holes)) {
      const holesLength = holes.length;
      for (let j = 0; j < holesLength; ++j) {
        stack.push(holes[j]);
      }
    }
  }
  return startingIndex;
};
PolygonGeometryLibrary.unpackPolygonHierarchy = function(array, startingIndex, CartesianX) {
  const positionsLength = array[startingIndex++];
  const holesLength = array[startingIndex++];
  const positions = new Array(positionsLength);
  const holes = holesLength > 0 ? new Array(holesLength) : void 0;
  for (let i = 0; i < positionsLength; ++i, startingIndex += CartesianX.packedLength) {
    positions[i] = CartesianX.unpack(array, startingIndex);
  }
  for (let j = 0; j < holesLength; ++j) {
    holes[j] = PolygonGeometryLibrary.unpackPolygonHierarchy(
      array,
      startingIndex,
      CartesianX
    );
    startingIndex = holes[j].startingIndex;
    delete holes[j].startingIndex;
  }
  return {
    positions,
    holes,
    startingIndex
  };
};
var distance2DScratch = new Cartesian2_default();
function getPointAtDistance2D(p0, p1, distance, length) {
  Cartesian2_default.subtract(p1, p0, distance2DScratch);
  Cartesian2_default.multiplyByScalar(
    distance2DScratch,
    distance / length,
    distance2DScratch
  );
  Cartesian2_default.add(p0, distance2DScratch, distance2DScratch);
  return [distance2DScratch.x, distance2DScratch.y];
}
var distanceScratch = new Cartesian3_default();
function getPointAtDistance(p0, p1, distance, length) {
  Cartesian3_default.subtract(p1, p0, distanceScratch);
  Cartesian3_default.multiplyByScalar(
    distanceScratch,
    distance / length,
    distanceScratch
  );
  Cartesian3_default.add(p0, distanceScratch, distanceScratch);
  return [distanceScratch.x, distanceScratch.y, distanceScratch.z];
}
PolygonGeometryLibrary.subdivideLineCount = function(p0, p1, minDistance) {
  const distance = Cartesian3_default.distance(p0, p1);
  const n = distance / minDistance;
  const countDivide = Math.max(0, Math.ceil(Math_default.log2(n)));
  return Math.pow(2, countDivide);
};
var scratchCartographic0 = new Cartographic_default();
var scratchCartographic1 = new Cartographic_default();
var scratchCartographic2 = new Cartographic_default();
var scratchCartesian0 = new Cartesian3_default();
var scratchRhumbLine = new EllipsoidRhumbLine_default();
PolygonGeometryLibrary.subdivideRhumbLineCount = function(ellipsoid, p0, p1, minDistance) {
  const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
  const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
  const rhumb = new EllipsoidRhumbLine_default(c0, c1, ellipsoid);
  const n = rhumb.surfaceDistance / minDistance;
  const countDivide = Math.max(0, Math.ceil(Math_default.log2(n)));
  return Math.pow(2, countDivide);
};
PolygonGeometryLibrary.subdivideTexcoordLine = function(t0, t1, p0, p1, minDistance, result) {
  const subdivisions = PolygonGeometryLibrary.subdivideLineCount(
    p0,
    p1,
    minDistance
  );
  const length2D = Cartesian2_default.distance(t0, t1);
  const distanceBetweenCoords = length2D / subdivisions;
  const texcoords = result;
  texcoords.length = subdivisions * 2;
  let index = 0;
  for (let i = 0; i < subdivisions; i++) {
    const t = getPointAtDistance2D(t0, t1, i * distanceBetweenCoords, length2D);
    texcoords[index++] = t[0];
    texcoords[index++] = t[1];
  }
  return texcoords;
};
PolygonGeometryLibrary.subdivideLine = function(p0, p1, minDistance, result) {
  const numVertices = PolygonGeometryLibrary.subdivideLineCount(
    p0,
    p1,
    minDistance
  );
  const length = Cartesian3_default.distance(p0, p1);
  const distanceBetweenVertices = length / numVertices;
  if (!defined_default(result)) {
    result = [];
  }
  const positions = result;
  positions.length = numVertices * 3;
  let index = 0;
  for (let i = 0; i < numVertices; i++) {
    const p = getPointAtDistance(p0, p1, i * distanceBetweenVertices, length);
    positions[index++] = p[0];
    positions[index++] = p[1];
    positions[index++] = p[2];
  }
  return positions;
};
PolygonGeometryLibrary.subdivideTexcoordRhumbLine = function(t0, t1, ellipsoid, p0, p1, minDistance, result) {
  const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
  const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
  scratchRhumbLine.setEndPoints(c0, c1);
  const n = scratchRhumbLine.surfaceDistance / minDistance;
  const countDivide = Math.max(0, Math.ceil(Math_default.log2(n)));
  const subdivisions = Math.pow(2, countDivide);
  const length2D = Cartesian2_default.distance(t0, t1);
  const distanceBetweenCoords = length2D / subdivisions;
  const texcoords = result;
  texcoords.length = subdivisions * 2;
  let index = 0;
  for (let i = 0; i < subdivisions; i++) {
    const t = getPointAtDistance2D(t0, t1, i * distanceBetweenCoords, length2D);
    texcoords[index++] = t[0];
    texcoords[index++] = t[1];
  }
  return texcoords;
};
PolygonGeometryLibrary.subdivideRhumbLine = function(ellipsoid, p0, p1, minDistance, result) {
  const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
  const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
  const rhumb = new EllipsoidRhumbLine_default(c0, c1, ellipsoid);
  const n = rhumb.surfaceDistance / minDistance;
  const countDivide = Math.max(0, Math.ceil(Math_default.log2(n)));
  const numVertices = Math.pow(2, countDivide);
  const distanceBetweenVertices = rhumb.surfaceDistance / numVertices;
  if (!defined_default(result)) {
    result = [];
  }
  const positions = result;
  positions.length = numVertices * 3;
  let index = 0;
  for (let i = 0; i < numVertices; i++) {
    const c = rhumb.interpolateUsingSurfaceDistance(
      i * distanceBetweenVertices,
      scratchCartographic2
    );
    const p = ellipsoid.cartographicToCartesian(c, scratchCartesian0);
    positions[index++] = p.x;
    positions[index++] = p.y;
    positions[index++] = p.z;
  }
  return positions;
};
var scaleToGeodeticHeightN1 = new Cartesian3_default();
var scaleToGeodeticHeightN2 = new Cartesian3_default();
var scaleToGeodeticHeightP1 = new Cartesian3_default();
var scaleToGeodeticHeightP2 = new Cartesian3_default();
PolygonGeometryLibrary.scaleToGeodeticHeightExtruded = function(geometry, maxHeight, minHeight, ellipsoid, perPositionHeight) {
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  const n1 = scaleToGeodeticHeightN1;
  let n2 = scaleToGeodeticHeightN2;
  const p = scaleToGeodeticHeightP1;
  let p2 = scaleToGeodeticHeightP2;
  if (defined_default(geometry) && defined_default(geometry.attributes) && defined_default(geometry.attributes.position)) {
    const positions = geometry.attributes.position.values;
    const length = positions.length / 2;
    for (let i = 0; i < length; i += 3) {
      Cartesian3_default.fromArray(positions, i, p);
      ellipsoid.geodeticSurfaceNormal(p, n1);
      p2 = ellipsoid.scaleToGeodeticSurface(p, p2);
      n2 = Cartesian3_default.multiplyByScalar(n1, minHeight, n2);
      n2 = Cartesian3_default.add(p2, n2, n2);
      positions[i + length] = n2.x;
      positions[i + 1 + length] = n2.y;
      positions[i + 2 + length] = n2.z;
      if (perPositionHeight) {
        p2 = Cartesian3_default.clone(p, p2);
      }
      n2 = Cartesian3_default.multiplyByScalar(n1, maxHeight, n2);
      n2 = Cartesian3_default.add(p2, n2, n2);
      positions[i] = n2.x;
      positions[i + 1] = n2.y;
      positions[i + 2] = n2.z;
    }
  }
  return geometry;
};
PolygonGeometryLibrary.polygonOutlinesFromHierarchy = function(polygonHierarchy, scaleToEllipsoidSurface, ellipsoid) {
  const polygons = [];
  const queue = new Queue_default();
  queue.enqueue(polygonHierarchy);
  let i;
  let j;
  let length;
  while (queue.length !== 0) {
    const outerNode = queue.dequeue();
    let outerRing = outerNode.positions;
    if (scaleToEllipsoidSurface) {
      length = outerRing.length;
      for (i = 0; i < length; i++) {
        ellipsoid.scaleToGeodeticSurface(outerRing[i], outerRing[i]);
      }
    }
    outerRing = arrayRemoveDuplicates_default(
      outerRing,
      Cartesian3_default.equalsEpsilon,
      true
    );
    if (outerRing.length < 3) {
      continue;
    }
    const numChildren = outerNode.holes ? outerNode.holes.length : 0;
    for (i = 0; i < numChildren; i++) {
      const hole = outerNode.holes[i];
      let holePositions = hole.positions;
      if (scaleToEllipsoidSurface) {
        length = holePositions.length;
        for (j = 0; j < length; ++j) {
          ellipsoid.scaleToGeodeticSurface(holePositions[j], holePositions[j]);
        }
      }
      holePositions = arrayRemoveDuplicates_default(
        holePositions,
        Cartesian3_default.equalsEpsilon,
        true
      );
      if (holePositions.length < 3) {
        continue;
      }
      polygons.push(holePositions);
      let numGrandchildren = 0;
      if (defined_default(hole.holes)) {
        numGrandchildren = hole.holes.length;
      }
      for (j = 0; j < numGrandchildren; j++) {
        queue.enqueue(hole.holes[j]);
      }
    }
    polygons.push(outerRing);
  }
  return polygons;
};
PolygonGeometryLibrary.polygonsFromHierarchy = function(polygonHierarchy, keepDuplicates, projectPointsTo2D, scaleToEllipsoidSurface, ellipsoid) {
  const hierarchy = [];
  const polygons = [];
  const queue = new Queue_default();
  queue.enqueue(polygonHierarchy);
  while (queue.length !== 0) {
    const outerNode = queue.dequeue();
    let outerRing = outerNode.positions;
    const holes = outerNode.holes;
    let i;
    let length;
    if (scaleToEllipsoidSurface) {
      length = outerRing.length;
      for (i = 0; i < length; i++) {
        ellipsoid.scaleToGeodeticSurface(outerRing[i], outerRing[i]);
      }
    }
    if (!keepDuplicates) {
      outerRing = arrayRemoveDuplicates_default(
        outerRing,
        Cartesian3_default.equalsEpsilon,
        true
      );
    }
    if (outerRing.length < 3) {
      continue;
    }
    let positions2D = projectPointsTo2D(outerRing);
    if (!defined_default(positions2D)) {
      continue;
    }
    const holeIndices = [];
    let originalWindingOrder = PolygonPipeline_default.computeWindingOrder2D(
      positions2D
    );
    if (originalWindingOrder === WindingOrder_default.CLOCKWISE) {
      positions2D.reverse();
      outerRing = outerRing.slice().reverse();
    }
    let positions = outerRing.slice();
    const numChildren = defined_default(holes) ? holes.length : 0;
    const polygonHoles = [];
    let j;
    for (i = 0; i < numChildren; i++) {
      const hole = holes[i];
      let holePositions = hole.positions;
      if (scaleToEllipsoidSurface) {
        length = holePositions.length;
        for (j = 0; j < length; ++j) {
          ellipsoid.scaleToGeodeticSurface(holePositions[j], holePositions[j]);
        }
      }
      if (!keepDuplicates) {
        holePositions = arrayRemoveDuplicates_default(
          holePositions,
          Cartesian3_default.equalsEpsilon,
          true
        );
      }
      if (holePositions.length < 3) {
        continue;
      }
      const holePositions2D = projectPointsTo2D(holePositions);
      if (!defined_default(holePositions2D)) {
        continue;
      }
      originalWindingOrder = PolygonPipeline_default.computeWindingOrder2D(
        holePositions2D
      );
      if (originalWindingOrder === WindingOrder_default.CLOCKWISE) {
        holePositions2D.reverse();
        holePositions = holePositions.slice().reverse();
      }
      polygonHoles.push(holePositions);
      holeIndices.push(positions.length);
      positions = positions.concat(holePositions);
      positions2D = positions2D.concat(holePositions2D);
      let numGrandchildren = 0;
      if (defined_default(hole.holes)) {
        numGrandchildren = hole.holes.length;
      }
      for (j = 0; j < numGrandchildren; j++) {
        queue.enqueue(hole.holes[j]);
      }
    }
    hierarchy.push({
      outerRing,
      holes: polygonHoles
    });
    polygons.push({
      positions,
      positions2D,
      holes: holeIndices
    });
  }
  return {
    hierarchy,
    polygons
  };
};
var computeBoundingRectangleCartesian2 = new Cartesian2_default();
var computeBoundingRectangleCartesian3 = new Cartesian3_default();
var computeBoundingRectangleQuaternion = new Quaternion_default();
var computeBoundingRectangleMatrix3 = new Matrix3_default();
PolygonGeometryLibrary.computeBoundingRectangle = function(planeNormal, projectPointTo2D, positions, angle, result) {
  const rotation = Quaternion_default.fromAxisAngle(
    planeNormal,
    angle,
    computeBoundingRectangleQuaternion
  );
  const textureMatrix = Matrix3_default.fromQuaternion(
    rotation,
    computeBoundingRectangleMatrix3
  );
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const length = positions.length;
  for (let i = 0; i < length; ++i) {
    const p = Cartesian3_default.clone(
      positions[i],
      computeBoundingRectangleCartesian3
    );
    Matrix3_default.multiplyByVector(textureMatrix, p, p);
    const st = projectPointTo2D(p, computeBoundingRectangleCartesian2);
    if (defined_default(st)) {
      minX = Math.min(minX, st.x);
      maxX = Math.max(maxX, st.x);
      minY = Math.min(minY, st.y);
      maxY = Math.max(maxY, st.y);
    }
  }
  result.x = minX;
  result.y = minY;
  result.width = maxX - minX;
  result.height = maxY - minY;
  return result;
};
PolygonGeometryLibrary.createGeometryFromPositions = function(ellipsoid, polygon, textureCoordinates, granularity, perPositionHeight, vertexFormat, arcType) {
  let indices = PolygonPipeline_default.triangulate(polygon.positions2D, polygon.holes);
  if (indices.length < 3) {
    indices = [0, 1, 2];
  }
  const positions = polygon.positions;
  const hasTexcoords = defined_default(textureCoordinates);
  const texcoords = hasTexcoords ? textureCoordinates.positions : void 0;
  if (perPositionHeight) {
    const length = positions.length;
    const flattenedPositions = new Array(length * 3);
    let index = 0;
    for (let i = 0; i < length; i++) {
      const p = positions[i];
      flattenedPositions[index++] = p.x;
      flattenedPositions[index++] = p.y;
      flattenedPositions[index++] = p.z;
    }
    const geometryOptions = {
      attributes: {
        position: new GeometryAttribute_default({
          componentDatatype: ComponentDatatype_default.DOUBLE,
          componentsPerAttribute: 3,
          values: flattenedPositions
        })
      },
      indices,
      primitiveType: PrimitiveType_default.TRIANGLES
    };
    if (hasTexcoords) {
      geometryOptions.attributes.st = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 2,
        values: Cartesian2_default.packArray(texcoords)
      });
    }
    const geometry = new Geometry_default(geometryOptions);
    if (vertexFormat.normal) {
      return GeometryPipeline_default.computeNormal(geometry);
    }
    return geometry;
  }
  if (arcType === ArcType_default.GEODESIC) {
    return PolygonPipeline_default.computeSubdivision(
      ellipsoid,
      positions,
      indices,
      texcoords,
      granularity
    );
  } else if (arcType === ArcType_default.RHUMB) {
    return PolygonPipeline_default.computeRhumbLineSubdivision(
      ellipsoid,
      positions,
      indices,
      texcoords,
      granularity
    );
  }
};
var computeWallTexcoordsSubdivided = [];
var computeWallIndicesSubdivided = [];
var p1Scratch = new Cartesian3_default();
var p2Scratch = new Cartesian3_default();
PolygonGeometryLibrary.computeWallGeometry = function(positions, textureCoordinates, ellipsoid, granularity, perPositionHeight, arcType) {
  let edgePositions;
  let topEdgeLength;
  let i;
  let p1;
  let p2;
  let t1;
  let t2;
  let edgeTexcoords;
  let topEdgeTexcoordLength;
  let length = positions.length;
  let index = 0;
  let textureIndex = 0;
  const hasTexcoords = defined_default(textureCoordinates);
  const texcoords = hasTexcoords ? textureCoordinates.positions : void 0;
  if (!perPositionHeight) {
    const minDistance = Math_default.chordLength(
      granularity,
      ellipsoid.maximumRadius
    );
    let numVertices = 0;
    if (arcType === ArcType_default.GEODESIC) {
      for (i = 0; i < length; i++) {
        numVertices += PolygonGeometryLibrary.subdivideLineCount(
          positions[i],
          positions[(i + 1) % length],
          minDistance
        );
      }
    } else if (arcType === ArcType_default.RHUMB) {
      for (i = 0; i < length; i++) {
        numVertices += PolygonGeometryLibrary.subdivideRhumbLineCount(
          ellipsoid,
          positions[i],
          positions[(i + 1) % length],
          minDistance
        );
      }
    }
    topEdgeLength = (numVertices + length) * 3;
    edgePositions = new Array(topEdgeLength * 2);
    if (hasTexcoords) {
      topEdgeTexcoordLength = (numVertices + length) * 2;
      edgeTexcoords = new Array(topEdgeTexcoordLength * 2);
    }
    for (i = 0; i < length; i++) {
      p1 = positions[i];
      p2 = positions[(i + 1) % length];
      let tempPositions;
      let tempTexcoords;
      if (hasTexcoords) {
        t1 = texcoords[i];
        t2 = texcoords[(i + 1) % length];
      }
      if (arcType === ArcType_default.GEODESIC) {
        tempPositions = PolygonGeometryLibrary.subdivideLine(
          p1,
          p2,
          minDistance,
          computeWallIndicesSubdivided
        );
        if (hasTexcoords) {
          tempTexcoords = PolygonGeometryLibrary.subdivideTexcoordLine(
            t1,
            t2,
            p1,
            p2,
            minDistance,
            computeWallTexcoordsSubdivided
          );
        }
      } else if (arcType === ArcType_default.RHUMB) {
        tempPositions = PolygonGeometryLibrary.subdivideRhumbLine(
          ellipsoid,
          p1,
          p2,
          minDistance,
          computeWallIndicesSubdivided
        );
        if (hasTexcoords) {
          tempTexcoords = PolygonGeometryLibrary.subdivideTexcoordRhumbLine(
            t1,
            t2,
            ellipsoid,
            p1,
            p2,
            minDistance,
            computeWallTexcoordsSubdivided
          );
        }
      }
      const tempPositionsLength = tempPositions.length;
      for (let j = 0; j < tempPositionsLength; ++j, ++index) {
        edgePositions[index] = tempPositions[j];
        edgePositions[index + topEdgeLength] = tempPositions[j];
      }
      edgePositions[index] = p2.x;
      edgePositions[index + topEdgeLength] = p2.x;
      ++index;
      edgePositions[index] = p2.y;
      edgePositions[index + topEdgeLength] = p2.y;
      ++index;
      edgePositions[index] = p2.z;
      edgePositions[index + topEdgeLength] = p2.z;
      ++index;
      if (hasTexcoords) {
        const tempTexcoordsLength = tempTexcoords.length;
        for (let k = 0; k < tempTexcoordsLength; ++k, ++textureIndex) {
          edgeTexcoords[textureIndex] = tempTexcoords[k];
          edgeTexcoords[textureIndex + topEdgeTexcoordLength] = tempTexcoords[k];
        }
        edgeTexcoords[textureIndex] = t2.x;
        edgeTexcoords[textureIndex + topEdgeTexcoordLength] = t2.x;
        ++textureIndex;
        edgeTexcoords[textureIndex] = t2.y;
        edgeTexcoords[textureIndex + topEdgeTexcoordLength] = t2.y;
        ++textureIndex;
      }
    }
  } else {
    topEdgeLength = length * 3 * 2;
    edgePositions = new Array(topEdgeLength * 2);
    if (hasTexcoords) {
      topEdgeTexcoordLength = length * 2 * 2;
      edgeTexcoords = new Array(topEdgeTexcoordLength * 2);
    }
    for (i = 0; i < length; i++) {
      p1 = positions[i];
      p2 = positions[(i + 1) % length];
      edgePositions[index] = edgePositions[index + topEdgeLength] = p1.x;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p1.y;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p1.z;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p2.x;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p2.y;
      ++index;
      edgePositions[index] = edgePositions[index + topEdgeLength] = p2.z;
      ++index;
      if (hasTexcoords) {
        t1 = texcoords[i];
        t2 = texcoords[(i + 1) % length];
        edgeTexcoords[textureIndex] = edgeTexcoords[textureIndex + topEdgeTexcoordLength] = t1.x;
        ++textureIndex;
        edgeTexcoords[textureIndex] = edgeTexcoords[textureIndex + topEdgeTexcoordLength] = t1.y;
        ++textureIndex;
        edgeTexcoords[textureIndex] = edgeTexcoords[textureIndex + topEdgeTexcoordLength] = t2.x;
        ++textureIndex;
        edgeTexcoords[textureIndex] = edgeTexcoords[textureIndex + topEdgeTexcoordLength] = t2.y;
        ++textureIndex;
      }
    }
  }
  length = edgePositions.length;
  const indices = IndexDatatype_default.createTypedArray(
    length / 3,
    length - positions.length * 6
  );
  let edgeIndex = 0;
  length /= 6;
  for (i = 0; i < length; i++) {
    const UL = i;
    const UR = UL + 1;
    const LL = UL + length;
    const LR = LL + 1;
    p1 = Cartesian3_default.fromArray(edgePositions, UL * 3, p1Scratch);
    p2 = Cartesian3_default.fromArray(edgePositions, UR * 3, p2Scratch);
    if (Cartesian3_default.equalsEpsilon(
      p1,
      p2,
      Math_default.EPSILON10,
      Math_default.EPSILON10
    )) {
      continue;
    }
    indices[edgeIndex++] = UL;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = LR;
  }
  const geometryOptions = {
    attributes: new GeometryAttributes_default({
      position: new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.DOUBLE,
        componentsPerAttribute: 3,
        values: edgePositions
      })
    }),
    indices,
    primitiveType: PrimitiveType_default.TRIANGLES
  };
  if (hasTexcoords) {
    geometryOptions.attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: edgeTexcoords
    });
  }
  const geometry = new Geometry_default(geometryOptions);
  return geometry;
};
var PolygonGeometryLibrary_default = PolygonGeometryLibrary;

export {
  PolygonGeometryLibrary_default
};
