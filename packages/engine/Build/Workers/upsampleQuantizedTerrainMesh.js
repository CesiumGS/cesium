define(['./AttributeCompression-b646d393', './Transforms-26539bce', './Matrix2-13178034', './Matrix3-315394f6', './defaultValue-0a909f67', './TerrainEncoding-06470d7f', './IndexDatatype-a55ceaa1', './Check-666ab1a0', './Math-2dbd6b93', './OrientedBoundingBox-b450cb61', './createTaskProcessorWorker', './ComponentDatatype-f7b11d02', './WebGLConstants-a8cc3e8c', './combine-ca22a614', './RuntimeError-06c93819', './EllipsoidTangentPlane-cfb50678', './AxisAlignedBoundingBox-a4321399', './IntersectionTests-a93d3de9', './Plane-900aa728'], (function (AttributeCompression, Transforms, Matrix2, Matrix3, defaultValue, TerrainEncoding, IndexDatatype, Check, Math$1, OrientedBoundingBox, createTaskProcessorWorker, ComponentDatatype, WebGLConstants, combine, RuntimeError, EllipsoidTangentPlane, AxisAlignedBoundingBox, IntersectionTests, Plane) { 'use strict';

  /**
   * Contains functions for operating on 2D triangles.
   *
   * @namespace Intersections2D
   */
  const Intersections2D = {};

  /**
   * Splits a 2D triangle at given axis-aligned threshold value and returns the resulting
   * polygon on a given side of the threshold.  The resulting polygon may have 0, 1, 2,
   * 3, or 4 vertices.
   *
   * @param {Number} threshold The threshold coordinate value at which to clip the triangle.
   * @param {Boolean} keepAbove true to keep the portion of the triangle above the threshold, or false
   *                            to keep the portion below.
   * @param {Number} u0 The coordinate of the first vertex in the triangle, in counter-clockwise order.
   * @param {Number} u1 The coordinate of the second vertex in the triangle, in counter-clockwise order.
   * @param {Number} u2 The coordinate of the third vertex in the triangle, in counter-clockwise order.
   * @param {Number[]} [result] The array into which to copy the result.  If this parameter is not supplied,
   *                            a new array is constructed and returned.
   * @returns {Number[]} The polygon that results after the clip, specified as a list of
   *                     vertices.  The vertices are specified in counter-clockwise order.
   *                     Each vertex is either an index from the existing list (identified as
   *                     a 0, 1, or 2) or -1 indicating a new vertex not in the original triangle.
   *                     For new vertices, the -1 is followed by three additional numbers: the
   *                     index of each of the two original vertices forming the line segment that
   *                     the new vertex lies on, and the fraction of the distance from the first
   *                     vertex to the second one.
   *
   * @example
   * const result = Cesium.Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, false, 0.2, 0.6, 0.4);
   * // result === [2, 0, -1, 1, 0, 0.25, -1, 1, 2, 0.5]
   */
  Intersections2D.clipTriangleAtAxisAlignedThreshold = function (
    threshold,
    keepAbove,
    u0,
    u1,
    u2,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(threshold)) {
      throw new Check.DeveloperError("threshold is required.");
    }
    if (!defaultValue.defined(keepAbove)) {
      throw new Check.DeveloperError("keepAbove is required.");
    }
    if (!defaultValue.defined(u0)) {
      throw new Check.DeveloperError("u0 is required.");
    }
    if (!defaultValue.defined(u1)) {
      throw new Check.DeveloperError("u1 is required.");
    }
    if (!defaultValue.defined(u2)) {
      throw new Check.DeveloperError("u2 is required.");
    }
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
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

        if (u02Ratio !== 1.0) {
          result.push(-1);
          result.push(0);
          result.push(2);
          result.push(u02Ratio);
        }

        if (u01Ratio !== 1.0) {
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

        if (u10Ratio !== 1.0) {
          result.push(-1);
          result.push(1);
          result.push(0);
          result.push(u10Ratio);
        }

        if (u12Ratio !== 1.0) {
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

        if (u21Ratio !== 1.0) {
          result.push(-1);
          result.push(2);
          result.push(1);
          result.push(u21Ratio);
        }

        if (u20Ratio !== 1.0) {
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
      // Completely in front of threshold
      result.push(0);
      result.push(1);
      result.push(2);
    }
    // else Completely behind threshold

    return result;
  };

  /**
   * Compute the barycentric coordinates of a 2D position within a 2D triangle.
   *
   * @param {Number} x The x coordinate of the position for which to find the barycentric coordinates.
   * @param {Number} y The y coordinate of the position for which to find the barycentric coordinates.
   * @param {Number} x1 The x coordinate of the triangle's first vertex.
   * @param {Number} y1 The y coordinate of the triangle's first vertex.
   * @param {Number} x2 The x coordinate of the triangle's second vertex.
   * @param {Number} y2 The y coordinate of the triangle's second vertex.
   * @param {Number} x3 The x coordinate of the triangle's third vertex.
   * @param {Number} y3 The y coordinate of the triangle's third vertex.
   * @param {Cartesian3} [result] The instance into to which to copy the result.  If this parameter
   *                     is undefined, a new instance is created and returned.
   * @returns {Cartesian3} The barycentric coordinates of the position within the triangle.
   *
   * @example
   * const result = Cesium.Intersections2D.computeBarycentricCoordinates(0.0, 0.0, 0.0, 1.0, -1, -0.5, 1, -0.5);
   * // result === new Cesium.Cartesian3(1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0);
   */
  Intersections2D.computeBarycentricCoordinates = function (
    x,
    y,
    x1,
    y1,
    x2,
    y2,
    x3,
    y3,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(x)) {
      throw new Check.DeveloperError("x is required.");
    }
    if (!defaultValue.defined(y)) {
      throw new Check.DeveloperError("y is required.");
    }
    if (!defaultValue.defined(x1)) {
      throw new Check.DeveloperError("x1 is required.");
    }
    if (!defaultValue.defined(y1)) {
      throw new Check.DeveloperError("y1 is required.");
    }
    if (!defaultValue.defined(x2)) {
      throw new Check.DeveloperError("x2 is required.");
    }
    if (!defaultValue.defined(y2)) {
      throw new Check.DeveloperError("y2 is required.");
    }
    if (!defaultValue.defined(x3)) {
      throw new Check.DeveloperError("x3 is required.");
    }
    if (!defaultValue.defined(y3)) {
      throw new Check.DeveloperError("y3 is required.");
    }
    //>>includeEnd('debug');

    const x1mx3 = x1 - x3;
    const x3mx2 = x3 - x2;
    const y2my3 = y2 - y3;
    const y1my3 = y1 - y3;
    const inverseDeterminant = 1.0 / (y2my3 * x1mx3 + x3mx2 * y1my3);
    const ymy3 = y - y3;
    const xmx3 = x - x3;
    const l1 = (y2my3 * xmx3 + x3mx2 * ymy3) * inverseDeterminant;
    const l2 = (-y1my3 * xmx3 + x1mx3 * ymy3) * inverseDeterminant;
    const l3 = 1.0 - l1 - l2;

    if (defaultValue.defined(result)) {
      result.x = l1;
      result.y = l2;
      result.z = l3;
      return result;
    }
    return new Matrix3.Cartesian3(l1, l2, l3);
  };

  /**
   * Compute the intersection between 2 line segments
   *
   * @param {Number} x00 The x coordinate of the first line's first vertex.
   * @param {Number} y00 The y coordinate of the first line's first vertex.
   * @param {Number} x01 The x coordinate of the first line's second vertex.
   * @param {Number} y01 The y coordinate of the first line's second vertex.
   * @param {Number} x10 The x coordinate of the second line's first vertex.
   * @param {Number} y10 The y coordinate of the second line's first vertex.
   * @param {Number} x11 The x coordinate of the second line's second vertex.
   * @param {Number} y11 The y coordinate of the second line's second vertex.
   * @param {Cartesian2} [result] The instance into to which to copy the result. If this parameter
   *                     is undefined, a new instance is created and returned.
   * @returns {Cartesian2} The intersection point, undefined if there is no intersection point or lines are coincident.
   *
   * @example
   * const result = Cesium.Intersections2D.computeLineSegmentLineSegmentIntersection(0.0, 0.0, 0.0, 2.0, -1, 1, 1, 1);
   * // result === new Cesium.Cartesian2(0.0, 1.0);
   */
  Intersections2D.computeLineSegmentLineSegmentIntersection = function (
    x00,
    y00,
    x01,
    y01,
    x10,
    y10,
    x11,
    y11,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("x00", x00);
    Check.Check.typeOf.number("y00", y00);
    Check.Check.typeOf.number("x01", x01);
    Check.Check.typeOf.number("y01", y01);
    Check.Check.typeOf.number("x10", x10);
    Check.Check.typeOf.number("y10", y10);
    Check.Check.typeOf.number("x11", x11);
    Check.Check.typeOf.number("y11", y11);
    //>>includeEnd('debug');

    const numerator1A = (x11 - x10) * (y00 - y10) - (y11 - y10) * (x00 - x10);
    const numerator1B = (x01 - x00) * (y00 - y10) - (y01 - y00) * (x00 - x10);
    const denominator1 = (y11 - y10) * (x01 - x00) - (x11 - x10) * (y01 - y00);

    // If denominator = 0, then lines are parallel. If denominator = 0 and both numerators are 0, then coincident
    if (denominator1 === 0) {
      return;
    }

    const ua1 = numerator1A / denominator1;
    const ub1 = numerator1B / denominator1;

    if (ua1 >= 0 && ua1 <= 1 && ub1 >= 0 && ub1 <= 1) {
      if (!defaultValue.defined(result)) {
        result = new Matrix2.Cartesian2();
      }

      result.x = x00 + ua1 * (x01 - x00);
      result.y = y00 + ua1 * (y01 - y00);

      return result;
    }
  };
  var Intersections2D$1 = Intersections2D;

  const maxShort = 32767;
  const halfMaxShort = (maxShort / 2) | 0;

  const clipScratch = [];
  const clipScratch2 = [];
  const verticesScratch = [];
  const cartographicScratch = new Matrix3.Cartographic();
  let cartesian3Scratch = new Matrix3.Cartesian3();
  const uScratch = [];
  const vScratch = [];
  const heightScratch = [];
  const indicesScratch = [];
  const normalsScratch = [];
  const horizonOcclusionPointScratch = new Matrix3.Cartesian3();
  const boundingSphereScratch = new Transforms.BoundingSphere();
  const orientedBoundingBoxScratch = new OrientedBoundingBox.OrientedBoundingBox();
  const decodeTexCoordsScratch = new Matrix2.Cartesian2();
  const octEncodedNormalScratch = new Matrix3.Cartesian3();

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

    const encoding = TerrainEncoding.TerrainEncoding.clone(parameters.encoding);
    const hasVertexNormals = encoding.hasVertexNormals;

    let vertexCount = 0;
    const quantizedVertexCount = parameters.vertexCountWithoutSkirts;

    const parentMinimumHeight = parameters.minimumHeight;
    const parentMaximumHeight = parameters.maximumHeight;

    const parentUBuffer = new Array(quantizedVertexCount);
    const parentVBuffer = new Array(quantizedVertexCount);
    const parentHeightBuffer = new Array(quantizedVertexCount);
    const parentNormalBuffer = hasVertexNormals
      ? new Array(quantizedVertexCount * 2)
      : undefined;

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

      u = Math$1.CesiumMath.clamp((texCoords.x * maxShort) | 0, 0, maxShort);
      v = Math$1.CesiumMath.clamp((texCoords.y * maxShort) | 0, 0, maxShort);
      parentHeightBuffer[i] = Math$1.CesiumMath.clamp(
        (((height - parentMinimumHeight) /
          (parentMaximumHeight - parentMinimumHeight)) *
          maxShort) |
          0,
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

      if (
        ((isEastChild && u >= halfMaxShort) ||
          (!isEastChild && u <= halfMaxShort)) &&
        ((isNorthChild && v >= halfMaxShort) ||
          (!isNorthChild && v <= halfMaxShort))
      ) {
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

      // Clip triangle on the east-west boundary.
      const clipped = Intersections2D$1.clipTriangleAtAxisAlignedThreshold(
        halfMaxShort,
        isEastChild,
        u0,
        u1,
        u2,
        clipScratch
      );

      // Get the first clipped triangle, if any.
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

      // Clip the triangle against the North-south boundary.
      clipped2 = Intersections2D$1.clipTriangleAtAxisAlignedThreshold(
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

      // If there's another vertex in the original clipped result,
      // it forms a second triangle.  Clip it as well.
      if (clippedIndex < clipped.length) {
        clippedTriangleVertices[2].clone(clippedTriangleVertices[1]);
        clippedTriangleVertices[2].initializeFromClipResult(
          clipped,
          clippedIndex,
          triangleVertices
        );

        clipped2 = Intersections2D$1.clipTriangleAtAxisAlignedThreshold(
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

    const ellipsoid = Matrix3.Ellipsoid.clone(parameters.ellipsoid);
    const rectangle = Matrix2.Rectangle.clone(parameters.childRectangle);

    const north = rectangle.north;
    const south = rectangle.south;
    let east = rectangle.east;
    const west = rectangle.west;

    if (east < west) {
      east += Math$1.CesiumMath.TWO_PI;
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

      height = Math$1.CesiumMath.lerp(
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

      cartographicScratch.longitude = Math$1.CesiumMath.lerp(west, east, u / maxShort);
      cartographicScratch.latitude = Math$1.CesiumMath.lerp(south, north, v / maxShort);
      cartographicScratch.height = height;

      ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);

      cartesianVertices.push(cartesian3Scratch.x);
      cartesianVertices.push(cartesian3Scratch.y);
      cartesianVertices.push(cartesian3Scratch.z);
    }

    const boundingSphere = Transforms.BoundingSphere.fromVertices(
      cartesianVertices,
      Matrix3.Cartesian3.ZERO,
      3,
      boundingSphereScratch
    );
    const orientedBoundingBox = OrientedBoundingBox.OrientedBoundingBox.fromRectangle(
      rectangle,
      minimumHeight,
      maximumHeight,
      ellipsoid,
      orientedBoundingBoxScratch
    );

    const occluder = new TerrainEncoding.EllipsoidalOccluder(ellipsoid);
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
      vertices[start + i] =
        (maxShort * (heightBuffer[i] - minimumHeight)) / heightRange;
    }

    const indicesTypedArray = IndexDatatype.IndexDatatype.createTypedArray(
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
      encodedNormals: encodedNormals,
      indices: indicesTypedArray.buffer,
      minimumHeight: minimumHeight,
      maximumHeight: maximumHeight,
      westIndices: westIndices,
      southIndices: southIndices,
      eastIndices: eastIndices,
      northIndices: northIndices,
      boundingSphere: boundingSphere,
      orientedBoundingBox: orientedBoundingBox,
      horizonOcclusionPoint: horizonOcclusionPoint,
    };
  }

  function Vertex() {
    this.vertexBuffer = undefined;
    this.index = undefined;
    this.first = undefined;
    this.second = undefined;
    this.ratio = undefined;
  }

  Vertex.prototype.clone = function (result) {
    if (!defaultValue.defined(result)) {
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

  Vertex.prototype.initializeIndexed = function (
    uBuffer,
    vBuffer,
    heightBuffer,
    normalBuffer,
    index
  ) {
    this.uBuffer = uBuffer;
    this.vBuffer = vBuffer;
    this.heightBuffer = heightBuffer;
    this.normalBuffer = normalBuffer;
    this.index = index;
    this.first = undefined;
    this.second = undefined;
    this.ratio = undefined;
  };

  Vertex.prototype.initializeFromClipResult = function (
    clipResult,
    index,
    vertices
  ) {
    let nextIndex = index + 1;

    if (clipResult[index] !== -1) {
      vertices[clipResult[index]].clone(this);
    } else {
      this.vertexBuffer = undefined;
      this.index = undefined;
      this.first = vertices[clipResult[nextIndex]];
      ++nextIndex;
      this.second = vertices[clipResult[nextIndex]];
      ++nextIndex;
      this.ratio = clipResult[nextIndex];
      ++nextIndex;
    }

    return nextIndex;
  };

  Vertex.prototype.getKey = function () {
    if (this.isIndexed()) {
      return this.index;
    }
    return JSON.stringify({
      first: this.first.getKey(),
      second: this.second.getKey(),
      ratio: this.ratio,
    });
  };

  Vertex.prototype.isIndexed = function () {
    return defaultValue.defined(this.index);
  };

  Vertex.prototype.getH = function () {
    if (defaultValue.defined(this.index)) {
      return this.heightBuffer[this.index];
    }
    return Math$1.CesiumMath.lerp(this.first.getH(), this.second.getH(), this.ratio);
  };

  Vertex.prototype.getU = function () {
    if (defaultValue.defined(this.index)) {
      return this.uBuffer[this.index];
    }
    return Math$1.CesiumMath.lerp(this.first.getU(), this.second.getU(), this.ratio);
  };

  Vertex.prototype.getV = function () {
    if (defaultValue.defined(this.index)) {
      return this.vBuffer[this.index];
    }
    return Math$1.CesiumMath.lerp(this.first.getV(), this.second.getV(), this.ratio);
  };

  let encodedScratch = new Matrix2.Cartesian2();
  // An upsampled triangle may be clipped twice before it is assigned an index
  // In this case, we need a buffer to handle the recursion of getNormalX() and getNormalY().
  let depth = -1;
  const cartesianScratch1 = [new Matrix3.Cartesian3(), new Matrix3.Cartesian3()];
  const cartesianScratch2 = [new Matrix3.Cartesian3(), new Matrix3.Cartesian3()];
  function lerpOctEncodedNormal(vertex, result) {
    ++depth;

    let first = cartesianScratch1[depth];
    let second = cartesianScratch2[depth];

    first = AttributeCompression.AttributeCompression.octDecode(
      vertex.first.getNormalX(),
      vertex.first.getNormalY(),
      first
    );
    second = AttributeCompression.AttributeCompression.octDecode(
      vertex.second.getNormalX(),
      vertex.second.getNormalY(),
      second
    );
    cartesian3Scratch = Matrix3.Cartesian3.lerp(
      first,
      second,
      vertex.ratio,
      cartesian3Scratch
    );
    Matrix3.Cartesian3.normalize(cartesian3Scratch, cartesian3Scratch);

    AttributeCompression.AttributeCompression.octEncode(cartesian3Scratch, result);

    --depth;

    return result;
  }

  Vertex.prototype.getNormalX = function () {
    if (defaultValue.defined(this.index)) {
      return this.normalBuffer[this.index * 2];
    }

    encodedScratch = lerpOctEncodedNormal(this, encodedScratch);
    return encodedScratch.x;
  };

  Vertex.prototype.getNormalY = function () {
    if (defaultValue.defined(this.index)) {
      return this.normalBuffer[this.index * 2 + 1];
    }

    encodedScratch = lerpOctEncodedNormal(this, encodedScratch);
    return encodedScratch.y;
  };

  const polygonVertices = [];
  polygonVertices.push(new Vertex());
  polygonVertices.push(new Vertex());
  polygonVertices.push(new Vertex());
  polygonVertices.push(new Vertex());

  function addClippedPolygon(
    uBuffer,
    vBuffer,
    heightBuffer,
    normalBuffer,
    indices,
    vertexMap,
    clipped,
    triangleVertices,
    hasVertexNormals
  ) {
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
        if (defaultValue.defined(vertexMap[key])) {
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
      // A triangle.
      indices.push(polygonVertices[0].newIndex);
      indices.push(polygonVertices[1].newIndex);
      indices.push(polygonVertices[2].newIndex);
    } else if (numVertices === 4) {
      // A quad - two triangles.
      indices.push(polygonVertices[0].newIndex);
      indices.push(polygonVertices[1].newIndex);
      indices.push(polygonVertices[2].newIndex);

      indices.push(polygonVertices[0].newIndex);
      indices.push(polygonVertices[2].newIndex);
      indices.push(polygonVertices[3].newIndex);
    }
  }
  var upsampleQuantizedTerrainMesh$1 = createTaskProcessorWorker(upsampleQuantizedTerrainMesh);

  return upsampleQuantizedTerrainMesh$1;

}));
