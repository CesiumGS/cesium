/**
 * Cesium - https://github.com/CesiumGS/cesium
 *
 * Copyright 2011-2020 Cesium Contributors
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
 * See https://github.com/CesiumGS/cesium/blob/master/LICENSE.md for full licensing details.
 */

define(['exports', './ArcType-2b58731c', './arrayRemoveDuplicates-9c2d98df', './Cartesian2-e7502022', './ComponentDatatype-cac6b6fa', './when-54335d57', './EllipsoidRhumbLine-be131462', './GeometryAttribute-66bc2a8a', './GeometryAttributes-caa08d6c', './GeometryPipeline-3c039123', './IndexDatatype-a6fe1d66', './Math-34872ab7', './Transforms-1ede5d55', './PolygonPipeline-86c5bccd'], function (exports, ArcType, arrayRemoveDuplicates, Cartesian2, ComponentDatatype, when, EllipsoidRhumbLine, GeometryAttribute, GeometryAttributes, GeometryPipeline, IndexDatatype, _Math, Transforms, PolygonPipeline) { 'use strict';

  /**
   * A queue that can enqueue items at the end, and dequeue items from the front.
   *
   * @alias Queue
   * @constructor
   */
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
     * @type {Number}
     * @readonly
     */
    length: {
      get: function () {
        return this._length;
      },
    },
  });

  /**
   * Enqueues the specified item.
   *
   * @param {*} item The item to enqueue.
   */
  Queue.prototype.enqueue = function (item) {
    this._array.push(item);
    this._length++;
  };

  /**
   * Dequeues an item.  Returns undefined if the queue is empty.
   *
   * @returns {*} The the dequeued item.
   */
  Queue.prototype.dequeue = function () {
    if (this._length === 0) {
      return undefined;
    }

    var array = this._array;
    var offset = this._offset;
    var item = array[offset];
    array[offset] = undefined;

    offset++;
    if (offset > 10 && offset * 2 > array.length) {
      //compact array
      this._array = array.slice(offset);
      offset = 0;
    }

    this._offset = offset;
    this._length--;

    return item;
  };

  /**
   * Returns the item at the front of the queue.  Returns undefined if the queue is empty.
   *
   * @returns {*} The item at the front of the queue.
   */
  Queue.prototype.peek = function () {
    if (this._length === 0) {
      return undefined;
    }

    return this._array[this._offset];
  };

  /**
   * Check whether this queue contains the specified item.
   *
   * @param {*} item The item to search for.
   */
  Queue.prototype.contains = function (item) {
    return this._array.indexOf(item) !== -1;
  };

  /**
   * Remove all items from the queue.
   */
  Queue.prototype.clear = function () {
    this._array.length = this._offset = this._length = 0;
  };

  /**
   * Sort the items in the queue in-place.
   *
   * @param {Queue.Comparator} compareFunction A function that defines the sort order.
   */
  Queue.prototype.sort = function (compareFunction) {
    if (this._offset > 0) {
      //compact array
      this._array = this._array.slice(this._offset);
      this._offset = 0;
    }

    this._array.sort(compareFunction);
  };

  /**
   * @private
   */
  var PolygonGeometryLibrary = {};

  PolygonGeometryLibrary.computeHierarchyPackedLength = function (
    polygonHierarchy
  ) {
    var numComponents = 0;
    var stack = [polygonHierarchy];
    while (stack.length > 0) {
      var hierarchy = stack.pop();
      if (!when.defined(hierarchy)) {
        continue;
      }

      numComponents += 2;

      var positions = hierarchy.positions;
      var holes = hierarchy.holes;

      if (when.defined(positions)) {
        numComponents += positions.length * Cartesian2.Cartesian3.packedLength;
      }

      if (when.defined(holes)) {
        var length = holes.length;
        for (var i = 0; i < length; ++i) {
          stack.push(holes[i]);
        }
      }
    }

    return numComponents;
  };

  PolygonGeometryLibrary.packPolygonHierarchy = function (
    polygonHierarchy,
    array,
    startingIndex
  ) {
    var stack = [polygonHierarchy];
    while (stack.length > 0) {
      var hierarchy = stack.pop();
      if (!when.defined(hierarchy)) {
        continue;
      }

      var positions = hierarchy.positions;
      var holes = hierarchy.holes;

      array[startingIndex++] = when.defined(positions) ? positions.length : 0;
      array[startingIndex++] = when.defined(holes) ? holes.length : 0;

      if (when.defined(positions)) {
        var positionsLength = positions.length;
        for (var i = 0; i < positionsLength; ++i, startingIndex += 3) {
          Cartesian2.Cartesian3.pack(positions[i], array, startingIndex);
        }
      }

      if (when.defined(holes)) {
        var holesLength = holes.length;
        for (var j = 0; j < holesLength; ++j) {
          stack.push(holes[j]);
        }
      }
    }

    return startingIndex;
  };

  PolygonGeometryLibrary.unpackPolygonHierarchy = function (
    array,
    startingIndex
  ) {
    var positionsLength = array[startingIndex++];
    var holesLength = array[startingIndex++];

    var positions = new Array(positionsLength);
    var holes = holesLength > 0 ? new Array(holesLength) : undefined;

    for (
      var i = 0;
      i < positionsLength;
      ++i, startingIndex += Cartesian2.Cartesian3.packedLength
    ) {
      positions[i] = Cartesian2.Cartesian3.unpack(array, startingIndex);
    }

    for (var j = 0; j < holesLength; ++j) {
      holes[j] = PolygonGeometryLibrary.unpackPolygonHierarchy(
        array,
        startingIndex
      );
      startingIndex = holes[j].startingIndex;
      delete holes[j].startingIndex;
    }

    return {
      positions: positions,
      holes: holes,
      startingIndex: startingIndex,
    };
  };

  var distanceScratch = new Cartesian2.Cartesian3();
  function getPointAtDistance(p0, p1, distance, length) {
    Cartesian2.Cartesian3.subtract(p1, p0, distanceScratch);
    Cartesian2.Cartesian3.multiplyByScalar(
      distanceScratch,
      distance / length,
      distanceScratch
    );
    Cartesian2.Cartesian3.add(p0, distanceScratch, distanceScratch);
    return [distanceScratch.x, distanceScratch.y, distanceScratch.z];
  }

  PolygonGeometryLibrary.subdivideLineCount = function (p0, p1, minDistance) {
    var distance = Cartesian2.Cartesian3.distance(p0, p1);
    var n = distance / minDistance;
    var countDivide = Math.max(0, Math.ceil(_Math.CesiumMath.log2(n)));
    return Math.pow(2, countDivide);
  };

  var scratchCartographic0 = new Cartesian2.Cartographic();
  var scratchCartographic1 = new Cartesian2.Cartographic();
  var scratchCartographic2 = new Cartesian2.Cartographic();
  var scratchCartesian0 = new Cartesian2.Cartesian3();
  PolygonGeometryLibrary.subdivideRhumbLineCount = function (
    ellipsoid,
    p0,
    p1,
    minDistance
  ) {
    var c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
    var c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
    var rhumb = new EllipsoidRhumbLine.EllipsoidRhumbLine(c0, c1, ellipsoid);
    var n = rhumb.surfaceDistance / minDistance;
    var countDivide = Math.max(0, Math.ceil(_Math.CesiumMath.log2(n)));
    return Math.pow(2, countDivide);
  };

  PolygonGeometryLibrary.subdivideLine = function (p0, p1, minDistance, result) {
    var numVertices = PolygonGeometryLibrary.subdivideLineCount(
      p0,
      p1,
      minDistance
    );
    var length = Cartesian2.Cartesian3.distance(p0, p1);
    var distanceBetweenVertices = length / numVertices;

    if (!when.defined(result)) {
      result = [];
    }

    var positions = result;
    positions.length = numVertices * 3;

    var index = 0;
    for (var i = 0; i < numVertices; i++) {
      var p = getPointAtDistance(p0, p1, i * distanceBetweenVertices, length);
      positions[index++] = p[0];
      positions[index++] = p[1];
      positions[index++] = p[2];
    }

    return positions;
  };

  PolygonGeometryLibrary.subdivideRhumbLine = function (
    ellipsoid,
    p0,
    p1,
    minDistance,
    result
  ) {
    var c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
    var c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
    var rhumb = new EllipsoidRhumbLine.EllipsoidRhumbLine(c0, c1, ellipsoid);

    var n = rhumb.surfaceDistance / minDistance;
    var countDivide = Math.max(0, Math.ceil(_Math.CesiumMath.log2(n)));
    var numVertices = Math.pow(2, countDivide);
    var distanceBetweenVertices = rhumb.surfaceDistance / numVertices;

    if (!when.defined(result)) {
      result = [];
    }

    var positions = result;
    positions.length = numVertices * 3;

    var index = 0;
    for (var i = 0; i < numVertices; i++) {
      var c = rhumb.interpolateUsingSurfaceDistance(
        i * distanceBetweenVertices,
        scratchCartographic2
      );
      var p = ellipsoid.cartographicToCartesian(c, scratchCartesian0);
      positions[index++] = p.x;
      positions[index++] = p.y;
      positions[index++] = p.z;
    }

    return positions;
  };

  var scaleToGeodeticHeightN1 = new Cartesian2.Cartesian3();
  var scaleToGeodeticHeightN2 = new Cartesian2.Cartesian3();
  var scaleToGeodeticHeightP1 = new Cartesian2.Cartesian3();
  var scaleToGeodeticHeightP2 = new Cartesian2.Cartesian3();

  PolygonGeometryLibrary.scaleToGeodeticHeightExtruded = function (
    geometry,
    maxHeight,
    minHeight,
    ellipsoid,
    perPositionHeight
  ) {
    ellipsoid = when.defaultValue(ellipsoid, Cartesian2.Ellipsoid.WGS84);

    var n1 = scaleToGeodeticHeightN1;
    var n2 = scaleToGeodeticHeightN2;
    var p = scaleToGeodeticHeightP1;
    var p2 = scaleToGeodeticHeightP2;

    if (
      when.defined(geometry) &&
      when.defined(geometry.attributes) &&
      when.defined(geometry.attributes.position)
    ) {
      var positions = geometry.attributes.position.values;
      var length = positions.length / 2;

      for (var i = 0; i < length; i += 3) {
        Cartesian2.Cartesian3.fromArray(positions, i, p);

        ellipsoid.geodeticSurfaceNormal(p, n1);
        p2 = ellipsoid.scaleToGeodeticSurface(p, p2);
        n2 = Cartesian2.Cartesian3.multiplyByScalar(n1, minHeight, n2);
        n2 = Cartesian2.Cartesian3.add(p2, n2, n2);
        positions[i + length] = n2.x;
        positions[i + 1 + length] = n2.y;
        positions[i + 2 + length] = n2.z;

        if (perPositionHeight) {
          p2 = Cartesian2.Cartesian3.clone(p, p2);
        }
        n2 = Cartesian2.Cartesian3.multiplyByScalar(n1, maxHeight, n2);
        n2 = Cartesian2.Cartesian3.add(p2, n2, n2);
        positions[i] = n2.x;
        positions[i + 1] = n2.y;
        positions[i + 2] = n2.z;
      }
    }
    return geometry;
  };

  PolygonGeometryLibrary.polygonOutlinesFromHierarchy = function (
    polygonHierarchy,
    scaleToEllipsoidSurface,
    ellipsoid
  ) {
    // create from a polygon hierarchy
    // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
    var polygons = [];
    var queue = new Queue();
    queue.enqueue(polygonHierarchy);
    var i;
    var j;
    var length;
    while (queue.length !== 0) {
      var outerNode = queue.dequeue();
      var outerRing = outerNode.positions;
      if (scaleToEllipsoidSurface) {
        length = outerRing.length;
        for (i = 0; i < length; i++) {
          ellipsoid.scaleToGeodeticSurface(outerRing[i], outerRing[i]);
        }
      }
      outerRing = arrayRemoveDuplicates.arrayRemoveDuplicates(
        outerRing,
        Cartesian2.Cartesian3.equalsEpsilon,
        true
      );
      if (outerRing.length < 3) {
        continue;
      }

      var numChildren = outerNode.holes ? outerNode.holes.length : 0;
      // The outer polygon contains inner polygons
      for (i = 0; i < numChildren; i++) {
        var hole = outerNode.holes[i];
        var holePositions = hole.positions;
        if (scaleToEllipsoidSurface) {
          length = holePositions.length;
          for (j = 0; j < length; ++j) {
            ellipsoid.scaleToGeodeticSurface(holePositions[j], holePositions[j]);
          }
        }
        holePositions = arrayRemoveDuplicates.arrayRemoveDuplicates(
          holePositions,
          Cartesian2.Cartesian3.equalsEpsilon,
          true
        );
        if (holePositions.length < 3) {
          continue;
        }
        polygons.push(holePositions);

        var numGrandchildren = 0;
        if (when.defined(hole.holes)) {
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

  PolygonGeometryLibrary.polygonsFromHierarchy = function (
    polygonHierarchy,
    projectPointsTo2D,
    scaleToEllipsoidSurface,
    ellipsoid
  ) {
    // create from a polygon hierarchy
    // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
    var hierarchy = [];
    var polygons = [];

    var queue = new Queue();
    queue.enqueue(polygonHierarchy);

    while (queue.length !== 0) {
      var outerNode = queue.dequeue();
      var outerRing = outerNode.positions;
      var holes = outerNode.holes;

      var i;
      var length;
      if (scaleToEllipsoidSurface) {
        length = outerRing.length;
        for (i = 0; i < length; i++) {
          ellipsoid.scaleToGeodeticSurface(outerRing[i], outerRing[i]);
        }
      }

      outerRing = arrayRemoveDuplicates.arrayRemoveDuplicates(
        outerRing,
        Cartesian2.Cartesian3.equalsEpsilon,
        true
      );
      if (outerRing.length < 3) {
        continue;
      }

      var positions2D = projectPointsTo2D(outerRing);
      if (!when.defined(positions2D)) {
        continue;
      }
      var holeIndices = [];

      var originalWindingOrder = PolygonPipeline.PolygonPipeline.computeWindingOrder2D(
        positions2D
      );
      if (originalWindingOrder === PolygonPipeline.WindingOrder.CLOCKWISE) {
        positions2D.reverse();
        outerRing = outerRing.slice().reverse();
      }

      var positions = outerRing.slice();
      var numChildren = when.defined(holes) ? holes.length : 0;
      var polygonHoles = [];
      var j;

      for (i = 0; i < numChildren; i++) {
        var hole = holes[i];
        var holePositions = hole.positions;
        if (scaleToEllipsoidSurface) {
          length = holePositions.length;
          for (j = 0; j < length; ++j) {
            ellipsoid.scaleToGeodeticSurface(holePositions[j], holePositions[j]);
          }
        }

        holePositions = arrayRemoveDuplicates.arrayRemoveDuplicates(
          holePositions,
          Cartesian2.Cartesian3.equalsEpsilon,
          true
        );
        if (holePositions.length < 3) {
          continue;
        }

        var holePositions2D = projectPointsTo2D(holePositions);
        if (!when.defined(holePositions2D)) {
          continue;
        }

        originalWindingOrder = PolygonPipeline.PolygonPipeline.computeWindingOrder2D(
          holePositions2D
        );
        if (originalWindingOrder === PolygonPipeline.WindingOrder.CLOCKWISE) {
          holePositions2D.reverse();
          holePositions = holePositions.slice().reverse();
        }

        polygonHoles.push(holePositions);
        holeIndices.push(positions.length);
        positions = positions.concat(holePositions);
        positions2D = positions2D.concat(holePositions2D);

        var numGrandchildren = 0;
        if (when.defined(hole.holes)) {
          numGrandchildren = hole.holes.length;
        }

        for (j = 0; j < numGrandchildren; j++) {
          queue.enqueue(hole.holes[j]);
        }
      }

      hierarchy.push({
        outerRing: outerRing,
        holes: polygonHoles,
      });
      polygons.push({
        positions: positions,
        positions2D: positions2D,
        holes: holeIndices,
      });
    }

    return {
      hierarchy: hierarchy,
      polygons: polygons,
    };
  };

  var computeBoundingRectangleCartesian2 = new Cartesian2.Cartesian2();
  var computeBoundingRectangleCartesian3 = new Cartesian2.Cartesian3();
  var computeBoundingRectangleQuaternion = new Transforms.Quaternion();
  var computeBoundingRectangleMatrix3 = new Transforms.Matrix3();
  PolygonGeometryLibrary.computeBoundingRectangle = function (
    planeNormal,
    projectPointTo2D,
    positions,
    angle,
    result
  ) {
    var rotation = Transforms.Quaternion.fromAxisAngle(
      planeNormal,
      angle,
      computeBoundingRectangleQuaternion
    );
    var textureMatrix = Transforms.Matrix3.fromQuaternion(
      rotation,
      computeBoundingRectangleMatrix3
    );

    var minX = Number.POSITIVE_INFINITY;
    var maxX = Number.NEGATIVE_INFINITY;
    var minY = Number.POSITIVE_INFINITY;
    var maxY = Number.NEGATIVE_INFINITY;

    var length = positions.length;
    for (var i = 0; i < length; ++i) {
      var p = Cartesian2.Cartesian3.clone(positions[i], computeBoundingRectangleCartesian3);
      Transforms.Matrix3.multiplyByVector(textureMatrix, p, p);
      var st = projectPointTo2D(p, computeBoundingRectangleCartesian2);

      if (when.defined(st)) {
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

  PolygonGeometryLibrary.createGeometryFromPositions = function (
    ellipsoid,
    polygon,
    granularity,
    perPositionHeight,
    vertexFormat,
    arcType
  ) {
    var indices = PolygonPipeline.PolygonPipeline.triangulate(polygon.positions2D, polygon.holes);

    /* If polygon is completely unrenderable, just use the first three vertices */
    if (indices.length < 3) {
      indices = [0, 1, 2];
    }

    var positions = polygon.positions;

    if (perPositionHeight) {
      var length = positions.length;
      var flattenedPositions = new Array(length * 3);
      var index = 0;
      for (var i = 0; i < length; i++) {
        var p = positions[i];
        flattenedPositions[index++] = p.x;
        flattenedPositions[index++] = p.y;
        flattenedPositions[index++] = p.z;
      }
      var geometry = new GeometryAttribute.Geometry({
        attributes: {
          position: new GeometryAttribute.GeometryAttribute({
            componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: flattenedPositions,
          }),
        },
        indices: indices,
        primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      });

      if (vertexFormat.normal) {
        return GeometryPipeline.GeometryPipeline.computeNormal(geometry);
      }

      return geometry;
    }

    if (arcType === ArcType.ArcType.GEODESIC) {
      return PolygonPipeline.PolygonPipeline.computeSubdivision(
        ellipsoid,
        positions,
        indices,
        granularity
      );
    } else if (arcType === ArcType.ArcType.RHUMB) {
      return PolygonPipeline.PolygonPipeline.computeRhumbLineSubdivision(
        ellipsoid,
        positions,
        indices,
        granularity
      );
    }
  };

  var computeWallIndicesSubdivided = [];
  var p1Scratch = new Cartesian2.Cartesian3();
  var p2Scratch = new Cartesian2.Cartesian3();

  PolygonGeometryLibrary.computeWallGeometry = function (
    positions,
    ellipsoid,
    granularity,
    perPositionHeight,
    arcType
  ) {
    var edgePositions;
    var topEdgeLength;
    var i;
    var p1;
    var p2;

    var length = positions.length;
    var index = 0;

    if (!perPositionHeight) {
      var minDistance = _Math.CesiumMath.chordLength(
        granularity,
        ellipsoid.maximumRadius
      );

      var numVertices = 0;
      if (arcType === ArcType.ArcType.GEODESIC) {
        for (i = 0; i < length; i++) {
          numVertices += PolygonGeometryLibrary.subdivideLineCount(
            positions[i],
            positions[(i + 1) % length],
            minDistance
          );
        }
      } else if (arcType === ArcType.ArcType.RHUMB) {
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
      for (i = 0; i < length; i++) {
        p1 = positions[i];
        p2 = positions[(i + 1) % length];

        var tempPositions;
        if (arcType === ArcType.ArcType.GEODESIC) {
          tempPositions = PolygonGeometryLibrary.subdivideLine(
            p1,
            p2,
            minDistance,
            computeWallIndicesSubdivided
          );
        } else if (arcType === ArcType.ArcType.RHUMB) {
          tempPositions = PolygonGeometryLibrary.subdivideRhumbLine(
            ellipsoid,
            p1,
            p2,
            minDistance,
            computeWallIndicesSubdivided
          );
        }
        var tempPositionsLength = tempPositions.length;
        for (var j = 0; j < tempPositionsLength; ++j, ++index) {
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
      }
    } else {
      topEdgeLength = length * 3 * 2;
      edgePositions = new Array(topEdgeLength * 2);
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
      }
    }

    length = edgePositions.length;
    var indices = IndexDatatype.IndexDatatype.createTypedArray(
      length / 3,
      length - positions.length * 6
    );
    var edgeIndex = 0;
    length /= 6;

    for (i = 0; i < length; i++) {
      var UL = i;
      var UR = UL + 1;
      var LL = UL + length;
      var LR = LL + 1;

      p1 = Cartesian2.Cartesian3.fromArray(edgePositions, UL * 3, p1Scratch);
      p2 = Cartesian2.Cartesian3.fromArray(edgePositions, UR * 3, p2Scratch);
      if (
        Cartesian2.Cartesian3.equalsEpsilon(
          p1,
          p2,
          _Math.CesiumMath.EPSILON10,
          _Math.CesiumMath.EPSILON10
        )
      ) {
        //skip corner
        continue;
      }

      indices[edgeIndex++] = UL;
      indices[edgeIndex++] = LL;
      indices[edgeIndex++] = UR;
      indices[edgeIndex++] = UR;
      indices[edgeIndex++] = LL;
      indices[edgeIndex++] = LR;
    }

    return new GeometryAttribute.Geometry({
      attributes: new GeometryAttributes.GeometryAttributes({
        position: new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: edgePositions,
        }),
      }),
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
    });
  };

  exports.PolygonGeometryLibrary = PolygonGeometryLibrary;

});
//# sourceMappingURL=PolygonGeometryLibrary-aa6e9320.js.map
