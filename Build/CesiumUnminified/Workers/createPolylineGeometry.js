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

define(['./when-54335d57', './Cartesian2-e7502022', './ArcType-2b58731c', './arrayRemoveDuplicates-9c2d98df', './Transforms-1ede5d55', './Color-088e7e31', './ComponentDatatype-cac6b6fa', './Check-24483042', './GeometryAttribute-66bc2a8a', './GeometryAttributes-caa08d6c', './IndexDatatype-a6fe1d66', './Math-34872ab7', './PolylinePipeline-4a6a3d2d', './VertexFormat-525c7b79', './RuntimeError-88a32665', './WebGLConstants-95ceb4e9', './EllipsoidGeodesic-d29959d5', './EllipsoidRhumbLine-be131462', './IntersectionTests-94f3c1ad', './Plane-e75c0031'], function (when, Cartesian2, ArcType, arrayRemoveDuplicates, Transforms, Color, ComponentDatatype, Check, GeometryAttribute, GeometryAttributes, IndexDatatype, _Math, PolylinePipeline, VertexFormat, RuntimeError, WebGLConstants, EllipsoidGeodesic, EllipsoidRhumbLine, IntersectionTests, Plane) { 'use strict';

  var scratchInterpolateColorsArray = [];

  function interpolateColors(p0, p1, color0, color1, numPoints) {
    var colors = scratchInterpolateColorsArray;
    colors.length = numPoints;
    var i;

    var r0 = color0.red;
    var g0 = color0.green;
    var b0 = color0.blue;
    var a0 = color0.alpha;

    var r1 = color1.red;
    var g1 = color1.green;
    var b1 = color1.blue;
    var a1 = color1.alpha;

    if (Color.Color.equals(color0, color1)) {
      for (i = 0; i < numPoints; i++) {
        colors[i] = Color.Color.clone(color0);
      }
      return colors;
    }

    var redPerVertex = (r1 - r0) / numPoints;
    var greenPerVertex = (g1 - g0) / numPoints;
    var bluePerVertex = (b1 - b0) / numPoints;
    var alphaPerVertex = (a1 - a0) / numPoints;

    for (i = 0; i < numPoints; i++) {
      colors[i] = new Color.Color(
        r0 + i * redPerVertex,
        g0 + i * greenPerVertex,
        b0 + i * bluePerVertex,
        a0 + i * alphaPerVertex
      );
    }

    return colors;
  }

  /**
   * A description of a polyline modeled as a line strip; the first two positions define a line segment,
   * and each additional position defines a line segment from the previous position. The polyline is capable of
   * displaying with a material.
   *
   * @alias PolylineGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.positions An array of {@link Cartesian3} defining the positions in the polyline as a line strip.
   * @param {Number} [options.width=1.0] The width in pixels.
   * @param {Color[]} [options.colors] An Array of {@link Color} defining the per vertex or per segment colors.
   * @param {Boolean} [options.colorsPerVertex=false] A boolean that determines whether the colors will be flat across each segment of the line or interpolated across the vertices.
   * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polyline segments must follow.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude if options.arcType is not ArcType.NONE. Determines the number of positions in the buffer.
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   *
   * @exception {DeveloperError} At least two positions are required.
   * @exception {DeveloperError} width must be greater than or equal to one.
   * @exception {DeveloperError} colors has an invalid length.
   *
   * @see PolylineGeometry#createGeometry
   *
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Polyline.html|Cesium Sandcastle Polyline Demo}
   *
   * @example
   * // A polyline with two connected line segments
   * var polyline = new Cesium.PolylineGeometry({
   *   positions : Cesium.Cartesian3.fromDegreesArray([
   *     0.0, 0.0,
   *     5.0, 0.0,
   *     5.0, 5.0
   *   ]),
   *   width : 10.0
   * });
   * var geometry = Cesium.PolylineGeometry.createGeometry(polyline);
   */
  function PolylineGeometry(options) {
    options = when.defaultValue(options, when.defaultValue.EMPTY_OBJECT);
    var positions = options.positions;
    var colors = options.colors;
    var width = when.defaultValue(options.width, 1.0);
    var colorsPerVertex = when.defaultValue(options.colorsPerVertex, false);

    //>>includeStart('debug', pragmas.debug);
    if (!when.defined(positions) || positions.length < 2) {
      throw new Check.DeveloperError("At least two positions are required.");
    }
    if (typeof width !== "number") {
      throw new Check.DeveloperError("width must be a number");
    }
    if (
      when.defined(colors) &&
      ((colorsPerVertex && colors.length < positions.length) ||
        (!colorsPerVertex && colors.length < positions.length - 1))
    ) {
      throw new Check.DeveloperError("colors has an invalid length.");
    }
    //>>includeEnd('debug');

    this._positions = positions;
    this._colors = colors;
    this._width = width;
    this._colorsPerVertex = colorsPerVertex;
    this._vertexFormat = VertexFormat.VertexFormat.clone(
      when.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT)
    );

    this._arcType = when.defaultValue(options.arcType, ArcType.ArcType.GEODESIC);
    this._granularity = when.defaultValue(
      options.granularity,
      _Math.CesiumMath.RADIANS_PER_DEGREE
    );
    this._ellipsoid = Cartesian2.Ellipsoid.clone(
      when.defaultValue(options.ellipsoid, Cartesian2.Ellipsoid.WGS84)
    );
    this._workerName = "createPolylineGeometry";

    var numComponents = 1 + positions.length * Cartesian2.Cartesian3.packedLength;
    numComponents += when.defined(colors) ? 1 + colors.length * Color.Color.packedLength : 1;

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength =
      numComponents + Cartesian2.Ellipsoid.packedLength + VertexFormat.VertexFormat.packedLength + 4;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PolylineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  PolylineGeometry.pack = function (value, array, startingIndex) {
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

    var colors = value._colors;
    length = when.defined(colors) ? colors.length : 0.0;
    array[startingIndex++] = length;

    for (i = 0; i < length; ++i, startingIndex += Color.Color.packedLength) {
      Color.Color.pack(colors[i], array, startingIndex);
    }

    Cartesian2.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Cartesian2.Ellipsoid.packedLength;

    VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);
    startingIndex += VertexFormat.VertexFormat.packedLength;

    array[startingIndex++] = value._width;
    array[startingIndex++] = value._colorsPerVertex ? 1.0 : 0.0;
    array[startingIndex++] = value._arcType;
    array[startingIndex] = value._granularity;

    return array;
  };

  var scratchEllipsoid = Cartesian2.Ellipsoid.clone(Cartesian2.Ellipsoid.UNIT_SPHERE);
  var scratchVertexFormat = new VertexFormat.VertexFormat();
  var scratchOptions = {
    positions: undefined,
    colors: undefined,
    ellipsoid: scratchEllipsoid,
    vertexFormat: scratchVertexFormat,
    width: undefined,
    colorsPerVertex: undefined,
    arcType: undefined,
    granularity: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PolylineGeometry} [result] The object into which to store the result.
   * @returns {PolylineGeometry} The modified result parameter or a new PolylineGeometry instance if one was not provided.
   */
  PolylineGeometry.unpack = function (array, startingIndex, result) {
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
    var colors = length > 0 ? new Array(length) : undefined;

    for (i = 0; i < length; ++i, startingIndex += Color.Color.packedLength) {
      colors[i] = Color.Color.unpack(array, startingIndex);
    }

    var ellipsoid = Cartesian2.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Cartesian2.Ellipsoid.packedLength;

    var vertexFormat = VertexFormat.VertexFormat.unpack(
      array,
      startingIndex,
      scratchVertexFormat
    );
    startingIndex += VertexFormat.VertexFormat.packedLength;

    var width = array[startingIndex++];
    var colorsPerVertex = array[startingIndex++] === 1.0;
    var arcType = array[startingIndex++];
    var granularity = array[startingIndex];

    if (!when.defined(result)) {
      scratchOptions.positions = positions;
      scratchOptions.colors = colors;
      scratchOptions.width = width;
      scratchOptions.colorsPerVertex = colorsPerVertex;
      scratchOptions.arcType = arcType;
      scratchOptions.granularity = granularity;
      return new PolylineGeometry(scratchOptions);
    }

    result._positions = positions;
    result._colors = colors;
    result._ellipsoid = Cartesian2.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);
    result._width = width;
    result._colorsPerVertex = colorsPerVertex;
    result._arcType = arcType;
    result._granularity = granularity;

    return result;
  };

  var scratchCartesian3 = new Cartesian2.Cartesian3();
  var scratchPosition = new Cartesian2.Cartesian3();
  var scratchPrevPosition = new Cartesian2.Cartesian3();
  var scratchNextPosition = new Cartesian2.Cartesian3();

  /**
   * Computes the geometric representation of a polyline, including its vertices, indices, and a bounding sphere.
   *
   * @param {PolylineGeometry} polylineGeometry A description of the polyline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  PolylineGeometry.createGeometry = function (polylineGeometry) {
    var width = polylineGeometry._width;
    var vertexFormat = polylineGeometry._vertexFormat;
    var colors = polylineGeometry._colors;
    var colorsPerVertex = polylineGeometry._colorsPerVertex;
    var arcType = polylineGeometry._arcType;
    var granularity = polylineGeometry._granularity;
    var ellipsoid = polylineGeometry._ellipsoid;

    var i;
    var j;
    var k;

    var positions = arrayRemoveDuplicates.arrayRemoveDuplicates(
      polylineGeometry._positions,
      Cartesian2.Cartesian3.equalsEpsilon
    );
    var positionsLength = positions.length;

    // A width of a pixel or less is not a valid geometry, but in order to support external data
    // that may have errors we treat this as an empty geometry.
    if (positionsLength < 2 || width <= 0.0) {
      return undefined;
    }

    if (arcType === ArcType.ArcType.GEODESIC || arcType === ArcType.ArcType.RHUMB) {
      var subdivisionSize;
      var numberOfPointsFunction;
      if (arcType === ArcType.ArcType.GEODESIC) {
        subdivisionSize = _Math.CesiumMath.chordLength(
          granularity,
          ellipsoid.maximumRadius
        );
        numberOfPointsFunction = PolylinePipeline.PolylinePipeline.numberOfPoints;
      } else {
        subdivisionSize = granularity;
        numberOfPointsFunction = PolylinePipeline.PolylinePipeline.numberOfPointsRhumbLine;
      }

      var heights = PolylinePipeline.PolylinePipeline.extractHeights(positions, ellipsoid);

      if (when.defined(colors)) {
        var colorLength = 1;
        for (i = 0; i < positionsLength - 1; ++i) {
          colorLength += numberOfPointsFunction(
            positions[i],
            positions[i + 1],
            subdivisionSize
          );
        }

        var newColors = new Array(colorLength);
        var newColorIndex = 0;

        for (i = 0; i < positionsLength - 1; ++i) {
          var p0 = positions[i];
          var p1 = positions[i + 1];
          var c0 = colors[i];

          var numColors = numberOfPointsFunction(p0, p1, subdivisionSize);
          if (colorsPerVertex && i < colorLength) {
            var c1 = colors[i + 1];
            var interpolatedColors = interpolateColors(p0, p1, c0, c1, numColors);
            var interpolatedColorsLength = interpolatedColors.length;
            for (j = 0; j < interpolatedColorsLength; ++j) {
              newColors[newColorIndex++] = interpolatedColors[j];
            }
          } else {
            for (j = 0; j < numColors; ++j) {
              newColors[newColorIndex++] = Color.Color.clone(c0);
            }
          }
        }

        newColors[newColorIndex] = Color.Color.clone(colors[colors.length - 1]);
        colors = newColors;

        scratchInterpolateColorsArray.length = 0;
      }

      if (arcType === ArcType.ArcType.GEODESIC) {
        positions = PolylinePipeline.PolylinePipeline.generateCartesianArc({
          positions: positions,
          minDistance: subdivisionSize,
          ellipsoid: ellipsoid,
          height: heights,
        });
      } else {
        positions = PolylinePipeline.PolylinePipeline.generateCartesianRhumbArc({
          positions: positions,
          granularity: subdivisionSize,
          ellipsoid: ellipsoid,
          height: heights,
        });
      }
    }

    positionsLength = positions.length;
    var size = positionsLength * 4.0 - 4.0;

    var finalPositions = new Float64Array(size * 3);
    var prevPositions = new Float64Array(size * 3);
    var nextPositions = new Float64Array(size * 3);
    var expandAndWidth = new Float32Array(size * 2);
    var st = vertexFormat.st ? new Float32Array(size * 2) : undefined;
    var finalColors = when.defined(colors) ? new Uint8Array(size * 4) : undefined;

    var positionIndex = 0;
    var expandAndWidthIndex = 0;
    var stIndex = 0;
    var colorIndex = 0;
    var position;

    for (j = 0; j < positionsLength; ++j) {
      if (j === 0) {
        position = scratchCartesian3;
        Cartesian2.Cartesian3.subtract(positions[0], positions[1], position);
        Cartesian2.Cartesian3.add(positions[0], position, position);
      } else {
        position = positions[j - 1];
      }

      Cartesian2.Cartesian3.clone(position, scratchPrevPosition);
      Cartesian2.Cartesian3.clone(positions[j], scratchPosition);

      if (j === positionsLength - 1) {
        position = scratchCartesian3;
        Cartesian2.Cartesian3.subtract(
          positions[positionsLength - 1],
          positions[positionsLength - 2],
          position
        );
        Cartesian2.Cartesian3.add(positions[positionsLength - 1], position, position);
      } else {
        position = positions[j + 1];
      }

      Cartesian2.Cartesian3.clone(position, scratchNextPosition);

      var color0, color1;
      if (when.defined(finalColors)) {
        if (j !== 0 && !colorsPerVertex) {
          color0 = colors[j - 1];
        } else {
          color0 = colors[j];
        }

        if (j !== positionsLength - 1) {
          color1 = colors[j];
        }
      }

      var startK = j === 0 ? 2 : 0;
      var endK = j === positionsLength - 1 ? 2 : 4;

      for (k = startK; k < endK; ++k) {
        Cartesian2.Cartesian3.pack(scratchPosition, finalPositions, positionIndex);
        Cartesian2.Cartesian3.pack(scratchPrevPosition, prevPositions, positionIndex);
        Cartesian2.Cartesian3.pack(scratchNextPosition, nextPositions, positionIndex);
        positionIndex += 3;

        var direction = k - 2 < 0 ? -1.0 : 1.0;
        expandAndWidth[expandAndWidthIndex++] = 2 * (k % 2) - 1; // expand direction
        expandAndWidth[expandAndWidthIndex++] = direction * width;

        if (vertexFormat.st) {
          st[stIndex++] = j / (positionsLength - 1);
          st[stIndex++] = Math.max(expandAndWidth[expandAndWidthIndex - 2], 0.0);
        }

        if (when.defined(finalColors)) {
          var color = k < 2 ? color0 : color1;

          finalColors[colorIndex++] = Color.Color.floatToByte(color.red);
          finalColors[colorIndex++] = Color.Color.floatToByte(color.green);
          finalColors[colorIndex++] = Color.Color.floatToByte(color.blue);
          finalColors[colorIndex++] = Color.Color.floatToByte(color.alpha);
        }
      }
    }

    var attributes = new GeometryAttributes.GeometryAttributes();

    attributes.position = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: finalPositions,
    });

    attributes.prevPosition = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: prevPositions,
    });

    attributes.nextPosition = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: nextPositions,
    });

    attributes.expandAndWidth = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
      componentsPerAttribute: 2,
      values: expandAndWidth,
    });

    if (vertexFormat.st) {
      attributes.st = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: st,
      });
    }

    if (when.defined(finalColors)) {
      attributes.color = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 4,
        values: finalColors,
        normalize: true,
      });
    }

    var indices = IndexDatatype.IndexDatatype.createTypedArray(size, positionsLength * 6 - 6);
    var index = 0;
    var indicesIndex = 0;
    var length = positionsLength - 1.0;
    for (j = 0; j < length; ++j) {
      indices[indicesIndex++] = index;
      indices[indicesIndex++] = index + 2;
      indices[indicesIndex++] = index + 1;

      indices[indicesIndex++] = index + 1;
      indices[indicesIndex++] = index + 2;
      indices[indicesIndex++] = index + 3;

      index += 4;
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      boundingSphere: Transforms.BoundingSphere.fromPoints(positions),
      geometryType: GeometryAttribute.GeometryType.POLYLINES,
    });
  };

  function createPolylineGeometry(polylineGeometry, offset) {
    if (when.defined(offset)) {
      polylineGeometry = PolylineGeometry.unpack(polylineGeometry, offset);
    }
    polylineGeometry._ellipsoid = Cartesian2.Ellipsoid.clone(polylineGeometry._ellipsoid);
    return PolylineGeometry.createGeometry(polylineGeometry);
  }

  return createPolylineGeometry;

});
//# sourceMappingURL=createPolylineGeometry.js.map
