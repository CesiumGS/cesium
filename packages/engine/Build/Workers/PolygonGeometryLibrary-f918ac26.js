define(['exports', './ArcType-ce2e50ab', './arrayRemoveDuplicates-c2038105', './Matrix2-13178034', './Matrix3-315394f6', './ComponentDatatype-f7b11d02', './defaultValue-0a909f67', './EllipsoidRhumbLine-19756602', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryPipeline-0166905d', './IndexDatatype-a55ceaa1', './Math-2dbd6b93', './PolygonPipeline-f59a8f0a', './Transforms-26539bce'], (function (exports, ArcType, arrayRemoveDuplicates, Matrix2, Matrix3, ComponentDatatype, defaultValue, EllipsoidRhumbLine, GeometryAttribute, GeometryAttributes, GeometryPipeline, IndexDatatype, Math$1, PolygonPipeline, Transforms) { 'use strict';

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

    const array = this._array;
    let offset = this._offset;
    const item = array[offset];
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
  const PolygonGeometryLibrary = {};

  PolygonGeometryLibrary.computeHierarchyPackedLength = function (
    polygonHierarchy,
    CartesianX
  ) {
    let numComponents = 0;
    const stack = [polygonHierarchy];
    while (stack.length > 0) {
      const hierarchy = stack.pop();
      if (!defaultValue.defined(hierarchy)) {
        continue;
      }

      numComponents += 2;

      const positions = hierarchy.positions;
      const holes = hierarchy.holes;

      if (defaultValue.defined(positions) && positions.length > 0) {
        numComponents += positions.length * CartesianX.packedLength;
      }

      if (defaultValue.defined(holes)) {
        const length = holes.length;
        for (let i = 0; i < length; ++i) {
          stack.push(holes[i]);
        }
      }
    }

    return numComponents;
  };

  PolygonGeometryLibrary.packPolygonHierarchy = function (
    polygonHierarchy,
    array,
    startingIndex,
    CartesianX
  ) {
    const stack = [polygonHierarchy];
    while (stack.length > 0) {
      const hierarchy = stack.pop();
      if (!defaultValue.defined(hierarchy)) {
        continue;
      }

      const positions = hierarchy.positions;
      const holes = hierarchy.holes;

      array[startingIndex++] = defaultValue.defined(positions) ? positions.length : 0;
      array[startingIndex++] = defaultValue.defined(holes) ? holes.length : 0;

      if (defaultValue.defined(positions)) {
        const positionsLength = positions.length;
        for (
          let i = 0;
          i < positionsLength;
          ++i, startingIndex += CartesianX.packedLength
        ) {
          CartesianX.pack(positions[i], array, startingIndex);
        }
      }

      if (defaultValue.defined(holes)) {
        const holesLength = holes.length;
        for (let j = 0; j < holesLength; ++j) {
          stack.push(holes[j]);
        }
      }
    }

    return startingIndex;
  };

  PolygonGeometryLibrary.unpackPolygonHierarchy = function (
    array,
    startingIndex,
    CartesianX
  ) {
    const positionsLength = array[startingIndex++];
    const holesLength = array[startingIndex++];

    const positions = new Array(positionsLength);
    const holes = holesLength > 0 ? new Array(holesLength) : undefined;

    for (
      let i = 0;
      i < positionsLength;
      ++i, startingIndex += CartesianX.packedLength
    ) {
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
      positions: positions,
      holes: holes,
      startingIndex: startingIndex,
    };
  };

  const distance2DScratch = new Matrix2.Cartesian2();
  function getPointAtDistance2D(p0, p1, distance, length) {
    Matrix2.Cartesian2.subtract(p1, p0, distance2DScratch);
    Matrix2.Cartesian2.multiplyByScalar(
      distance2DScratch,
      distance / length,
      distance2DScratch
    );
    Matrix2.Cartesian2.add(p0, distance2DScratch, distance2DScratch);
    return [distance2DScratch.x, distance2DScratch.y];
  }

  const distanceScratch = new Matrix3.Cartesian3();
  function getPointAtDistance(p0, p1, distance, length) {
    Matrix3.Cartesian3.subtract(p1, p0, distanceScratch);
    Matrix3.Cartesian3.multiplyByScalar(
      distanceScratch,
      distance / length,
      distanceScratch
    );
    Matrix3.Cartesian3.add(p0, distanceScratch, distanceScratch);
    return [distanceScratch.x, distanceScratch.y, distanceScratch.z];
  }

  PolygonGeometryLibrary.subdivideLineCount = function (p0, p1, minDistance) {
    const distance = Matrix3.Cartesian3.distance(p0, p1);
    const n = distance / minDistance;
    const countDivide = Math.max(0, Math.ceil(Math$1.CesiumMath.log2(n)));
    return Math.pow(2, countDivide);
  };

  const scratchCartographic0 = new Matrix3.Cartographic();
  const scratchCartographic1 = new Matrix3.Cartographic();
  const scratchCartographic2 = new Matrix3.Cartographic();
  const scratchCartesian0 = new Matrix3.Cartesian3();
  const scratchRhumbLine = new EllipsoidRhumbLine.EllipsoidRhumbLine();
  PolygonGeometryLibrary.subdivideRhumbLineCount = function (
    ellipsoid,
    p0,
    p1,
    minDistance
  ) {
    const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
    const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
    const rhumb = new EllipsoidRhumbLine.EllipsoidRhumbLine(c0, c1, ellipsoid);
    const n = rhumb.surfaceDistance / minDistance;
    const countDivide = Math.max(0, Math.ceil(Math$1.CesiumMath.log2(n)));
    return Math.pow(2, countDivide);
  };

  /**
   * Subdivides texture coordinates based on the subdivision of the associated world positions.
   *
   * @param {Cartesian2} t0 First texture coordinate.
   * @param {Cartesian2} t1 Second texture coordinate.
   * @param {Cartesian3} p0 First world position.
   * @param {Cartesian3} p1 Second world position.
   * @param {Number} minDistance Minimum distance for a segment.
   * @param {Array<Cartesian2>} result The subdivided texture coordinates.
   *
   * @private
   */
  PolygonGeometryLibrary.subdivideTexcoordLine = function (
    t0,
    t1,
    p0,
    p1,
    minDistance,
    result
  ) {
    // Compute the number of subdivisions.
    const subdivisions = PolygonGeometryLibrary.subdivideLineCount(
      p0,
      p1,
      minDistance
    );

    // Compute the distance between each subdivided point.
    const length2D = Matrix2.Cartesian2.distance(t0, t1);
    const distanceBetweenCoords = length2D / subdivisions;

    // Resize the result array.
    const texcoords = result;
    texcoords.length = subdivisions * 2;

    // Compute texture coordinates using linear interpolation.
    let index = 0;
    for (let i = 0; i < subdivisions; i++) {
      const t = getPointAtDistance2D(t0, t1, i * distanceBetweenCoords, length2D);
      texcoords[index++] = t[0];
      texcoords[index++] = t[1];
    }

    return texcoords;
  };

  PolygonGeometryLibrary.subdivideLine = function (p0, p1, minDistance, result) {
    const numVertices = PolygonGeometryLibrary.subdivideLineCount(
      p0,
      p1,
      minDistance
    );
    const length = Matrix3.Cartesian3.distance(p0, p1);
    const distanceBetweenVertices = length / numVertices;

    if (!defaultValue.defined(result)) {
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

  /**
   * Subdivides texture coordinates based on the subdivision of the associated world positions using a rhumb line.
   *
   * @param {Cartesian2} t0 First texture coordinate.
   * @param {Cartesian2} t1 Second texture coordinate.
   * @param {Ellipsoid} ellipsoid The ellipsoid.
   * @param {Cartesian3} p0 First world position.
   * @param {Cartesian3} p1 Second world position.
   * @param {Number} minDistance Minimum distance for a segment.
   * @param {Array<Cartesian2>} result The subdivided texture coordinates.
   *
   * @private
   */
  PolygonGeometryLibrary.subdivideTexcoordRhumbLine = function (
    t0,
    t1,
    ellipsoid,
    p0,
    p1,
    minDistance,
    result
  ) {
    // Compute the surface distance.
    const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
    const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
    scratchRhumbLine.setEndPoints(c0, c1);
    const n = scratchRhumbLine.surfaceDistance / minDistance;

    // Compute the number of subdivisions.
    const countDivide = Math.max(0, Math.ceil(Math$1.CesiumMath.log2(n)));
    const subdivisions = Math.pow(2, countDivide);

    // Compute the distance between each subdivided point.
    const length2D = Matrix2.Cartesian2.distance(t0, t1);
    const distanceBetweenCoords = length2D / subdivisions;

    // Resize the result array.
    const texcoords = result;
    texcoords.length = subdivisions * 2;

    // Compute texture coordinates using linear interpolation.
    let index = 0;
    for (let i = 0; i < subdivisions; i++) {
      const t = getPointAtDistance2D(t0, t1, i * distanceBetweenCoords, length2D);
      texcoords[index++] = t[0];
      texcoords[index++] = t[1];
    }

    return texcoords;
  };

  PolygonGeometryLibrary.subdivideRhumbLine = function (
    ellipsoid,
    p0,
    p1,
    minDistance,
    result
  ) {
    const c0 = ellipsoid.cartesianToCartographic(p0, scratchCartographic0);
    const c1 = ellipsoid.cartesianToCartographic(p1, scratchCartographic1);
    const rhumb = new EllipsoidRhumbLine.EllipsoidRhumbLine(c0, c1, ellipsoid);

    const n = rhumb.surfaceDistance / minDistance;
    const countDivide = Math.max(0, Math.ceil(Math$1.CesiumMath.log2(n)));
    const numVertices = Math.pow(2, countDivide);
    const distanceBetweenVertices = rhumb.surfaceDistance / numVertices;

    if (!defaultValue.defined(result)) {
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

  const scaleToGeodeticHeightN1 = new Matrix3.Cartesian3();
  const scaleToGeodeticHeightN2 = new Matrix3.Cartesian3();
  const scaleToGeodeticHeightP1 = new Matrix3.Cartesian3();
  const scaleToGeodeticHeightP2 = new Matrix3.Cartesian3();

  PolygonGeometryLibrary.scaleToGeodeticHeightExtruded = function (
    geometry,
    maxHeight,
    minHeight,
    ellipsoid,
    perPositionHeight
  ) {
    ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);

    const n1 = scaleToGeodeticHeightN1;
    let n2 = scaleToGeodeticHeightN2;
    const p = scaleToGeodeticHeightP1;
    let p2 = scaleToGeodeticHeightP2;

    if (
      defaultValue.defined(geometry) &&
      defaultValue.defined(geometry.attributes) &&
      defaultValue.defined(geometry.attributes.position)
    ) {
      const positions = geometry.attributes.position.values;
      const length = positions.length / 2;

      for (let i = 0; i < length; i += 3) {
        Matrix3.Cartesian3.fromArray(positions, i, p);

        ellipsoid.geodeticSurfaceNormal(p, n1);
        p2 = ellipsoid.scaleToGeodeticSurface(p, p2);
        n2 = Matrix3.Cartesian3.multiplyByScalar(n1, minHeight, n2);
        n2 = Matrix3.Cartesian3.add(p2, n2, n2);
        positions[i + length] = n2.x;
        positions[i + 1 + length] = n2.y;
        positions[i + 2 + length] = n2.z;

        if (perPositionHeight) {
          p2 = Matrix3.Cartesian3.clone(p, p2);
        }
        n2 = Matrix3.Cartesian3.multiplyByScalar(n1, maxHeight, n2);
        n2 = Matrix3.Cartesian3.add(p2, n2, n2);
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
    const polygons = [];
    const queue = new Queue();
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
      outerRing = arrayRemoveDuplicates.arrayRemoveDuplicates(
        outerRing,
        Matrix3.Cartesian3.equalsEpsilon,
        true
      );
      if (outerRing.length < 3) {
        continue;
      }

      const numChildren = outerNode.holes ? outerNode.holes.length : 0;
      // The outer polygon contains inner polygons
      for (i = 0; i < numChildren; i++) {
        const hole = outerNode.holes[i];
        let holePositions = hole.positions;
        if (scaleToEllipsoidSurface) {
          length = holePositions.length;
          for (j = 0; j < length; ++j) {
            ellipsoid.scaleToGeodeticSurface(holePositions[j], holePositions[j]);
          }
        }
        holePositions = arrayRemoveDuplicates.arrayRemoveDuplicates(
          holePositions,
          Matrix3.Cartesian3.equalsEpsilon,
          true
        );
        if (holePositions.length < 3) {
          continue;
        }
        polygons.push(holePositions);

        let numGrandchildren = 0;
        if (defaultValue.defined(hole.holes)) {
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
    keepDuplicates,
    projectPointsTo2D,
    scaleToEllipsoidSurface,
    ellipsoid
  ) {
    // create from a polygon hierarchy
    // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
    const hierarchy = [];
    const polygons = [];

    const queue = new Queue();
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
        outerRing = arrayRemoveDuplicates.arrayRemoveDuplicates(
          outerRing,
          Matrix3.Cartesian3.equalsEpsilon,
          true
        );
      }
      if (outerRing.length < 3) {
        continue;
      }

      let positions2D = projectPointsTo2D(outerRing);
      if (!defaultValue.defined(positions2D)) {
        continue;
      }
      const holeIndices = [];

      let originalWindingOrder = PolygonPipeline.PolygonPipeline.computeWindingOrder2D(
        positions2D
      );
      if (originalWindingOrder === PolygonPipeline.WindingOrder.CLOCKWISE) {
        positions2D.reverse();
        outerRing = outerRing.slice().reverse();
      }

      let positions = outerRing.slice();
      const numChildren = defaultValue.defined(holes) ? holes.length : 0;
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
          holePositions = arrayRemoveDuplicates.arrayRemoveDuplicates(
            holePositions,
            Matrix3.Cartesian3.equalsEpsilon,
            true
          );
        }
        if (holePositions.length < 3) {
          continue;
        }

        const holePositions2D = projectPointsTo2D(holePositions);
        if (!defaultValue.defined(holePositions2D)) {
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

        let numGrandchildren = 0;
        if (defaultValue.defined(hole.holes)) {
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

  const computeBoundingRectangleCartesian2 = new Matrix2.Cartesian2();
  const computeBoundingRectangleCartesian3 = new Matrix3.Cartesian3();
  const computeBoundingRectangleQuaternion = new Transforms.Quaternion();
  const computeBoundingRectangleMatrix3 = new Matrix3.Matrix3();
  PolygonGeometryLibrary.computeBoundingRectangle = function (
    planeNormal,
    projectPointTo2D,
    positions,
    angle,
    result
  ) {
    const rotation = Transforms.Quaternion.fromAxisAngle(
      planeNormal,
      angle,
      computeBoundingRectangleQuaternion
    );
    const textureMatrix = Matrix3.Matrix3.fromQuaternion(
      rotation,
      computeBoundingRectangleMatrix3
    );

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    const length = positions.length;
    for (let i = 0; i < length; ++i) {
      const p = Matrix3.Cartesian3.clone(
        positions[i],
        computeBoundingRectangleCartesian3
      );
      Matrix3.Matrix3.multiplyByVector(textureMatrix, p, p);
      const st = projectPointTo2D(p, computeBoundingRectangleCartesian2);

      if (defaultValue.defined(st)) {
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
    textureCoordinates,
    granularity,
    perPositionHeight,
    vertexFormat,
    arcType
  ) {
    let indices = PolygonPipeline.PolygonPipeline.triangulate(polygon.positions2D, polygon.holes);

    /* If polygon is completely unrenderable, just use the first three vertices */
    if (indices.length < 3) {
      indices = [0, 1, 2];
    }

    const positions = polygon.positions;

    const hasTexcoords = defaultValue.defined(textureCoordinates);
    const texcoords = hasTexcoords ? textureCoordinates.positions : undefined;

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
          position: new GeometryAttribute.GeometryAttribute({
            componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: flattenedPositions,
          }),
        },
        indices: indices,
        primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      };

      if (hasTexcoords) {
        geometryOptions.attributes.st = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: Matrix2.Cartesian2.packArray(texcoords),
        });
      }

      const geometry = new GeometryAttribute.Geometry(geometryOptions);

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
        texcoords,
        granularity
      );
    } else if (arcType === ArcType.ArcType.RHUMB) {
      return PolygonPipeline.PolygonPipeline.computeRhumbLineSubdivision(
        ellipsoid,
        positions,
        indices,
        texcoords,
        granularity
      );
    }
  };

  const computeWallTexcoordsSubdivided = [];
  const computeWallIndicesSubdivided = [];
  const p1Scratch = new Matrix3.Cartesian3();
  const p2Scratch = new Matrix3.Cartesian3();

  PolygonGeometryLibrary.computeWallGeometry = function (
    positions,
    textureCoordinates,
    ellipsoid,
    granularity,
    perPositionHeight,
    arcType
  ) {
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

    const hasTexcoords = defaultValue.defined(textureCoordinates);
    const texcoords = hasTexcoords ? textureCoordinates.positions : undefined;

    if (!perPositionHeight) {
      const minDistance = Math$1.CesiumMath.chordLength(
        granularity,
        ellipsoid.maximumRadius
      );

      let numVertices = 0;
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

        if (arcType === ArcType.ArcType.GEODESIC) {
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
        } else if (arcType === ArcType.ArcType.RHUMB) {
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
            edgeTexcoords[textureIndex + topEdgeTexcoordLength] =
              tempTexcoords[k];
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
          edgeTexcoords[textureIndex] = edgeTexcoords[
            textureIndex + topEdgeTexcoordLength
          ] = t1.x;
          ++textureIndex;
          edgeTexcoords[textureIndex] = edgeTexcoords[
            textureIndex + topEdgeTexcoordLength
          ] = t1.y;
          ++textureIndex;
          edgeTexcoords[textureIndex] = edgeTexcoords[
            textureIndex + topEdgeTexcoordLength
          ] = t2.x;
          ++textureIndex;
          edgeTexcoords[textureIndex] = edgeTexcoords[
            textureIndex + topEdgeTexcoordLength
          ] = t2.y;
          ++textureIndex;
        }
      }
    }

    length = edgePositions.length;
    const indices = IndexDatatype.IndexDatatype.createTypedArray(
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

      p1 = Matrix3.Cartesian3.fromArray(edgePositions, UL * 3, p1Scratch);
      p2 = Matrix3.Cartesian3.fromArray(edgePositions, UR * 3, p2Scratch);
      if (
        Matrix3.Cartesian3.equalsEpsilon(
          p1,
          p2,
          Math$1.CesiumMath.EPSILON10,
          Math$1.CesiumMath.EPSILON10
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

    const geometryOptions = {
      attributes: new GeometryAttributes.GeometryAttributes({
        position: new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: edgePositions,
        }),
      }),
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
    };

    if (hasTexcoords) {
      geometryOptions.attributes.st = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: edgeTexcoords,
      });
    }

    const geometry = new GeometryAttribute.Geometry(geometryOptions);

    return geometry;
  };
  var PolygonGeometryLibrary$1 = PolygonGeometryLibrary;

  exports.PolygonGeometryLibrary = PolygonGeometryLibrary$1;

}));
