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

define(['./when-54335d57', './Cartesian2-e7502022', './arrayRemoveDuplicates-9c2d98df', './BoundingRectangle-3d639308', './Transforms-1ede5d55', './ComponentDatatype-cac6b6fa', './PolylineVolumeGeometryLibrary-ef607c2a', './Check-24483042', './GeometryAttribute-66bc2a8a', './GeometryAttributes-caa08d6c', './IndexDatatype-a6fe1d66', './Math-34872ab7', './PolygonPipeline-86c5bccd', './RuntimeError-88a32665', './WebGLConstants-95ceb4e9', './EllipsoidTangentPlane-6385da14', './IntersectionTests-94f3c1ad', './Plane-e75c0031', './PolylinePipeline-4a6a3d2d', './EllipsoidGeodesic-d29959d5', './EllipsoidRhumbLine-be131462'], function (when, Cartesian2, arrayRemoveDuplicates, BoundingRectangle, Transforms, ComponentDatatype, PolylineVolumeGeometryLibrary, Check, GeometryAttribute, GeometryAttributes, IndexDatatype, _Math, PolygonPipeline, RuntimeError, WebGLConstants, EllipsoidTangentPlane, IntersectionTests, Plane, PolylinePipeline, EllipsoidGeodesic, EllipsoidRhumbLine) { 'use strict';

  function computeAttributes(positions, shape) {
    var attributes = new GeometryAttributes.GeometryAttributes();
    attributes.position = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    });

    var shapeLength = shape.length;
    var vertexCount = attributes.position.values.length / 3;
    var positionLength = positions.length / 3;
    var shapeCount = positionLength / shapeLength;
    var indices = IndexDatatype.IndexDatatype.createTypedArray(
      vertexCount,
      2 * shapeLength * (shapeCount + 1)
    );
    var i, j;
    var index = 0;
    i = 0;
    var offset = i * shapeLength;
    for (j = 0; j < shapeLength - 1; j++) {
      indices[index++] = j + offset;
      indices[index++] = j + offset + 1;
    }
    indices[index++] = shapeLength - 1 + offset;
    indices[index++] = offset;

    i = shapeCount - 1;
    offset = i * shapeLength;
    for (j = 0; j < shapeLength - 1; j++) {
      indices[index++] = j + offset;
      indices[index++] = j + offset + 1;
    }
    indices[index++] = shapeLength - 1 + offset;
    indices[index++] = offset;

    for (i = 0; i < shapeCount - 1; i++) {
      var firstOffset = shapeLength * i;
      var secondOffset = firstOffset + shapeLength;
      for (j = 0; j < shapeLength; j++) {
        indices[index++] = j + firstOffset;
        indices[index++] = j + secondOffset;
      }
    }

    var geometry = new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: IndexDatatype.IndexDatatype.createTypedArray(vertexCount, indices),
      boundingSphere: Transforms.BoundingSphere.fromVertices(positions),
      primitiveType: GeometryAttribute.PrimitiveType.LINES,
    });

    return geometry;
  }

  /**
   * A description of a polyline with a volume (a 2D shape extruded along a polyline).
   *
   * @alias PolylineVolumeOutlineGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.polylinePositions An array of positions that define the center of the polyline volume.
   * @param {Cartesian2[]} options.shapePositions An array of positions that define the shape to be extruded along the polyline
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
   *
   * @see PolylineVolumeOutlineGeometry#createGeometry
   *
   * @example
   * function computeCircle(radius) {
   *   var positions = [];
   *   for (var i = 0; i < 360; i++) {
   *     var radians = Cesium.Math.toRadians(i);
   *     positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
   *   }
   *   return positions;
   * }
   *
   * var volumeOutline = new Cesium.PolylineVolumeOutlineGeometry({
   *   polylinePositions : Cesium.Cartesian3.fromDegreesArray([
   *     -72.0, 40.0,
   *     -70.0, 35.0
   *   ]),
   *   shapePositions : computeCircle(100000.0)
   * });
   */
  function PolylineVolumeOutlineGeometry(options) {
    options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);
    var positions = options.polylinePositions;
    var shape = options.shapePositions;

    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(positions)) {
      throw new Check.DeveloperError("options.polylinePositions is required.");
    }
    if (!when.defined(shape)) {
      throw new Check.DeveloperError("options.shapePositions is required.");
    }
    //>>includeEnd('debug');

    this._positions = positions;
    this._shape = shape;
    this._ellipsoid = Cartesian2.Ellipsoid.clone(
      when.defaultValue(options.ellipsoid, Cartesian2.Ellipsoid.WGS84)
    );
    this._cornerType = when.defaultValue(options.cornerType, PolylineVolumeGeometryLibrary.CornerType.ROUNDED);
    this._granularity = when.defaultValue(
      options.granularity,
      _Math.CesiumMath.RADIANS_PER_DEGREE
    );
    this._workerName = "createPolylineVolumeOutlineGeometry";

    var numComponents = 1 + positions.length * Cartesian2.Cartesian3.packedLength;
    numComponents += 1 + shape.length * Cartesian2.Cartesian2.packedLength;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength = numComponents + Cartesian2.Ellipsoid.packedLength + 2;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PolylineVolumeOutlineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  PolylineVolumeOutlineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(value)) {
      throw new Check.DeveloperError("value is required");
    }
    if (!when.defined(array)) {
      throw new Check.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    var i;

    var positions = value._positions;
    var length = positions.length;
    array[startingIndex++] = length;

    for (i = 0; i < length; ++i, startingIndex += Cartesian2.Cartesian3.packedLength) {
      Cartesian2.Cartesian3.pack(positions[i], array, startingIndex);
    }

    var shape = value._shape;
    length = shape.length;
    array[startingIndex++] = length;

    for (i = 0; i < length; ++i, startingIndex += Cartesian2.Cartesian2.packedLength) {
      Cartesian2.Cartesian2.pack(shape[i], array, startingIndex);
    }

    Cartesian2.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Cartesian2.Ellipsoid.packedLength;

    array[startingIndex++] = value._cornerType;
    array[startingIndex] = value._granularity;

    return array;
  };

  var scratchEllipsoid = Cartesian2.Ellipsoid.clone(Cartesian2.Ellipsoid.UNIT_SPHERE);
  var scratchOptions = {
    polylinePositions: undefined,
    shapePositions: undefined,
    ellipsoid: scratchEllipsoid,
    height: undefined,
    cornerType: undefined,
    granularity: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PolylineVolumeOutlineGeometry} [result] The object into which to store the result.
   * @returns {PolylineVolumeOutlineGeometry} The modified result parameter or a new PolylineVolumeOutlineGeometry instance if one was not provided.
   */
  PolylineVolumeOutlineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(array)) {
      throw new Check.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = when.defaultValue(startingIndex, 0);

    var i;

    var length = array[startingIndex++];
    var positions = new Array(length);

    for (i = 0; i < length; ++i, startingIndex += Cartesian2.Cartesian3.packedLength) {
      positions[i] = Cartesian2.Cartesian3.unpack(array, startingIndex);
    }

    length = array[startingIndex++];
    var shape = new Array(length);

    for (i = 0; i < length; ++i, startingIndex += Cartesian2.Cartesian2.packedLength) {
      shape[i] = Cartesian2.Cartesian2.unpack(array, startingIndex);
    }

    var ellipsoid = Cartesian2.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Cartesian2.Ellipsoid.packedLength;

    var cornerType = array[startingIndex++];
    var granularity = array[startingIndex];

    if (!when.defined(result)) {
      scratchOptions.polylinePositions = positions;
      scratchOptions.shapePositions = shape;
      scratchOptions.cornerType = cornerType;
      scratchOptions.granularity = granularity;
      return new PolylineVolumeOutlineGeometry(scratchOptions);
    }

    result._positions = positions;
    result._shape = shape;
    result._ellipsoid = Cartesian2.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._cornerType = cornerType;
    result._granularity = granularity;

    return result;
  };

  var brScratch = new BoundingRectangle.BoundingRectangle();

  /**
   * Computes the geometric representation of the outline of a polyline with a volume, including its vertices, indices, and a bounding sphere.
   *
   * @param {PolylineVolumeOutlineGeometry} polylineVolumeOutlineGeometry A description of the polyline volume outline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  PolylineVolumeOutlineGeometry.createGeometry = function (
    polylineVolumeOutlineGeometry
  ) {
    var positions = polylineVolumeOutlineGeometry._positions;
    var cleanPositions = arrayRemoveDuplicates.arrayRemoveDuplicates(
      positions,
      Cartesian2.Cartesian3.equalsEpsilon
    );
    var shape2D = polylineVolumeOutlineGeometry._shape;
    shape2D = PolylineVolumeGeometryLibrary.PolylineVolumeGeometryLibrary.removeDuplicatesFromShape(shape2D);

    if (cleanPositions.length < 2 || shape2D.length < 3) {
      return undefined;
    }

    if (
      PolygonPipeline.PolygonPipeline.computeWindingOrder2D(shape2D) === PolygonPipeline.WindingOrder.CLOCKWISE
    ) {
      shape2D.reverse();
    }
    var boundingRectangle = BoundingRectangle.BoundingRectangle.fromPoints(shape2D, brScratch);

    var computedPositions = PolylineVolumeGeometryLibrary.PolylineVolumeGeometryLibrary.computePositions(
      cleanPositions,
      shape2D,
      boundingRectangle,
      polylineVolumeOutlineGeometry,
      false
    );
    return computeAttributes(computedPositions, shape2D);
  };

  function createPolylineVolumeOutlineGeometry(
    polylineVolumeOutlineGeometry,
    offset
  ) {
    if (when.defined(offset)) {
      polylineVolumeOutlineGeometry = PolylineVolumeOutlineGeometry.unpack(
        polylineVolumeOutlineGeometry,
        offset
      );
    }
    polylineVolumeOutlineGeometry._ellipsoid = Cartesian2.Ellipsoid.clone(
      polylineVolumeOutlineGeometry._ellipsoid
    );
    return PolylineVolumeOutlineGeometry.createGeometry(
      polylineVolumeOutlineGeometry
    );
  }

  return createPolylineVolumeOutlineGeometry;

});
//# sourceMappingURL=createPolylineVolumeOutlineGeometry.js.map
