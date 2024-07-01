import ArcType from "./ArcType.js";
import arrayRemoveDuplicates from "./arrayRemoveDuplicates.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import Color from "./Color.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import GeometryType from "./GeometryType.js";
import IndexDatatype from "./IndexDatatype.js";
import CesiumMath from "./Math.js";
import PolylinePipeline from "./PolylinePipeline.js";
import PrimitiveType from "./PrimitiveType.js";
import VertexFormat from "./VertexFormat.js";

const scratchInterpolateColorsArray = [];

function interpolateColors(p0, p1, color0, color1, numPoints) {
  const colors = scratchInterpolateColorsArray;
  colors.length = numPoints;
  let i;

  const r0 = color0.red;
  const g0 = color0.green;
  const b0 = color0.blue;
  const a0 = color0.alpha;

  const r1 = color1.red;
  const g1 = color1.green;
  const b1 = color1.blue;
  const a1 = color1.alpha;

  if (Color.equals(color0, color1)) {
    for (i = 0; i < numPoints; i++) {
      colors[i] = Color.clone(color0);
    }
    return colors;
  }

  const redPerVertex = (r1 - r0) / numPoints;
  const greenPerVertex = (g1 - g0) / numPoints;
  const bluePerVertex = (b1 - b0) / numPoints;
  const alphaPerVertex = (a1 - a0) / numPoints;

  for (i = 0; i < numPoints; i++) {
    colors[i] = new Color(
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
 * @param {object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of {@link Cartesian3} defining the positions in the polyline as a line strip.
 * @param {number} [options.width=1.0] The width in pixels.
 * @param {Color[]} [options.colors] An Array of {@link Color} defining the per vertex or per segment colors.
 * @param {boolean} [options.colorsPerVertex=false] A boolean that determines whether the colors will be flat across each segment of the line or interpolated across the vertices.
 * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polyline segments must follow.
 * @param {number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude if options.arcType is not ArcType.NONE. Determines the number of positions in the buffer.
 * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid to be used as a reference.
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
 * const polyline = new Cesium.PolylineGeometry({
 *   positions : Cesium.Cartesian3.fromDegreesArray([
 *     0.0, 0.0,
 *     5.0, 0.0,
 *     5.0, 5.0
 *   ]),
 *   width : 10.0
 * });
 * const geometry = Cesium.PolylineGeometry.createGeometry(polyline);
 */
function PolylineGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const positions = options.positions;
  const colors = options.colors;
  const width = defaultValue(options.width, 1.0);
  const colorsPerVertex = defaultValue(options.colorsPerVertex, false);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(positions) || positions.length < 2) {
    throw new DeveloperError("At least two positions are required.");
  }
  if (typeof width !== "number") {
    throw new DeveloperError("width must be a number");
  }
  if (
    defined(colors) &&
    ((colorsPerVertex && colors.length < positions.length) ||
      (!colorsPerVertex && colors.length < positions.length - 1))
  ) {
    throw new DeveloperError("colors has an invalid length.");
  }
  //>>includeEnd('debug');

  this._positions = positions;
  this._colors = colors;
  this._width = width;
  this._colorsPerVertex = colorsPerVertex;
  this._vertexFormat = VertexFormat.clone(
    defaultValue(options.vertexFormat, VertexFormat.DEFAULT)
  );

  this._arcType = defaultValue(options.arcType, ArcType.GEODESIC);
  this._granularity = defaultValue(
    options.granularity,
    CesiumMath.RADIANS_PER_DEGREE
  );
  this._ellipsoid = Ellipsoid.clone(
    defaultValue(options.ellipsoid, Ellipsoid.default)
  );
  this._workerName = "createPolylineGeometry";

  let numComponents = 1 + positions.length * Cartesian3.packedLength;
  numComponents += defined(colors) ? 1 + colors.length * Color.packedLength : 1;

  /**
   * The number of elements used to pack the object into an array.
   * @type {number}
   */
  this.packedLength =
    numComponents + Ellipsoid.packedLength + VertexFormat.packedLength + 4;
}

/**
 * Stores the provided instance into the provided array.
 *
 * @param {PolylineGeometry} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
PolylineGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required");
  }
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  let i;

  const positions = value._positions;
  let length = positions.length;
  array[startingIndex++] = length;

  for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    Cartesian3.pack(positions[i], array, startingIndex);
  }

  const colors = value._colors;
  length = defined(colors) ? colors.length : 0.0;
  array[startingIndex++] = length;

  for (i = 0; i < length; ++i, startingIndex += Color.packedLength) {
    Color.pack(colors[i], array, startingIndex);
  }

  Ellipsoid.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid.packedLength;

  VertexFormat.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat.packedLength;

  array[startingIndex++] = value._width;
  array[startingIndex++] = value._colorsPerVertex ? 1.0 : 0.0;
  array[startingIndex++] = value._arcType;
  array[startingIndex] = value._granularity;

  return array;
};

const scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
const scratchVertexFormat = new VertexFormat();
const scratchOptions = {
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
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {PolylineGeometry} [result] The object into which to store the result.
 * @returns {PolylineGeometry} The modified result parameter or a new PolylineGeometry instance if one was not provided.
 */
PolylineGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  let i;

  let length = array[startingIndex++];
  const positions = new Array(length);

  for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    positions[i] = Cartesian3.unpack(array, startingIndex);
  }

  length = array[startingIndex++];
  const colors = length > 0 ? new Array(length) : undefined;

  for (i = 0; i < length; ++i, startingIndex += Color.packedLength) {
    colors[i] = Color.unpack(array, startingIndex);
  }

  const ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid.packedLength;

  const vertexFormat = VertexFormat.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat.packedLength;

  const width = array[startingIndex++];
  const colorsPerVertex = array[startingIndex++] === 1.0;
  const arcType = array[startingIndex++];
  const granularity = array[startingIndex];

  if (!defined(result)) {
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
  result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
  result._width = width;
  result._colorsPerVertex = colorsPerVertex;
  result._arcType = arcType;
  result._granularity = granularity;

  return result;
};

const scratchCartesian3 = new Cartesian3();
const scratchPosition = new Cartesian3();
const scratchPrevPosition = new Cartesian3();
const scratchNextPosition = new Cartesian3();

/**
 * Computes the geometric representation of a polyline, including its vertices, indices, and a bounding sphere.
 *
 * @param {PolylineGeometry} polylineGeometry A description of the polyline.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
PolylineGeometry.createGeometry = function (polylineGeometry) {
  const width = polylineGeometry._width;
  const vertexFormat = polylineGeometry._vertexFormat;
  let colors = polylineGeometry._colors;
  const colorsPerVertex = polylineGeometry._colorsPerVertex;
  const arcType = polylineGeometry._arcType;
  const granularity = polylineGeometry._granularity;
  const ellipsoid = polylineGeometry._ellipsoid;

  let i;
  let j;
  let k;

  const removedIndices = [];
  let positions = arrayRemoveDuplicates(
    polylineGeometry._positions,
    Cartesian3.equalsEpsilon,
    false,
    removedIndices
  );

  if (defined(colors) && removedIndices.length > 0) {
    let removedArrayIndex = 0;
    let nextRemovedIndex = removedIndices[0];
    colors = colors.filter(function (color, index) {
      let remove = false;
      if (colorsPerVertex) {
        remove =
          index === nextRemovedIndex || (index === 0 && nextRemovedIndex === 1);
      } else {
        remove = index + 1 === nextRemovedIndex;
      }

      if (remove) {
        removedArrayIndex++;
        nextRemovedIndex = removedIndices[removedArrayIndex];
        return false;
      }
      return true;
    });
  }

  let positionsLength = positions.length;

  // A width of a pixel or less is not a valid geometry, but in order to support external data
  // that may have errors we treat this as an empty geometry.
  if (positionsLength < 2 || width <= 0.0) {
    return undefined;
  }

  if (arcType === ArcType.GEODESIC || arcType === ArcType.RHUMB) {
    let subdivisionSize;
    let numberOfPointsFunction;
    if (arcType === ArcType.GEODESIC) {
      subdivisionSize = CesiumMath.chordLength(
        granularity,
        ellipsoid.maximumRadius
      );
      numberOfPointsFunction = PolylinePipeline.numberOfPoints;
    } else {
      subdivisionSize = granularity;
      numberOfPointsFunction = PolylinePipeline.numberOfPointsRhumbLine;
    }

    const heights = PolylinePipeline.extractHeights(positions, ellipsoid);

    if (defined(colors)) {
      let colorLength = 1;
      for (i = 0; i < positionsLength - 1; ++i) {
        colorLength += numberOfPointsFunction(
          positions[i],
          positions[i + 1],
          subdivisionSize
        );
      }

      const newColors = new Array(colorLength);
      let newColorIndex = 0;

      for (i = 0; i < positionsLength - 1; ++i) {
        const p0 = positions[i];
        const p1 = positions[i + 1];
        const c0 = colors[i];

        const numColors = numberOfPointsFunction(p0, p1, subdivisionSize);
        if (colorsPerVertex && i < colorLength) {
          const c1 = colors[i + 1];
          const interpolatedColors = interpolateColors(
            p0,
            p1,
            c0,
            c1,
            numColors
          );
          const interpolatedColorsLength = interpolatedColors.length;
          for (j = 0; j < interpolatedColorsLength; ++j) {
            newColors[newColorIndex++] = interpolatedColors[j];
          }
        } else {
          for (j = 0; j < numColors; ++j) {
            newColors[newColorIndex++] = Color.clone(c0);
          }
        }
      }

      newColors[newColorIndex] = Color.clone(colors[colors.length - 1]);
      colors = newColors;

      scratchInterpolateColorsArray.length = 0;
    }

    if (arcType === ArcType.GEODESIC) {
      positions = PolylinePipeline.generateCartesianArc({
        positions: positions,
        minDistance: subdivisionSize,
        ellipsoid: ellipsoid,
        height: heights,
      });
    } else {
      positions = PolylinePipeline.generateCartesianRhumbArc({
        positions: positions,
        granularity: subdivisionSize,
        ellipsoid: ellipsoid,
        height: heights,
      });
    }
  }

  positionsLength = positions.length;
  const size = positionsLength * 4.0 - 4.0;

  const finalPositions = new Float64Array(size * 3);
  const prevPositions = new Float64Array(size * 3);
  const nextPositions = new Float64Array(size * 3);
  const expandAndWidth = new Float32Array(size * 2);
  const st = vertexFormat.st ? new Float32Array(size * 2) : undefined;
  const finalColors = defined(colors) ? new Uint8Array(size * 4) : undefined;

  let positionIndex = 0;
  let expandAndWidthIndex = 0;
  let stIndex = 0;
  let colorIndex = 0;
  let position;

  for (j = 0; j < positionsLength; ++j) {
    if (j === 0) {
      position = scratchCartesian3;
      Cartesian3.subtract(positions[0], positions[1], position);
      Cartesian3.add(positions[0], position, position);
    } else {
      position = positions[j - 1];
    }

    Cartesian3.clone(position, scratchPrevPosition);
    Cartesian3.clone(positions[j], scratchPosition);

    if (j === positionsLength - 1) {
      position = scratchCartesian3;
      Cartesian3.subtract(
        positions[positionsLength - 1],
        positions[positionsLength - 2],
        position
      );
      Cartesian3.add(positions[positionsLength - 1], position, position);
    } else {
      position = positions[j + 1];
    }

    Cartesian3.clone(position, scratchNextPosition);

    let color0, color1;
    if (defined(finalColors)) {
      if (j !== 0 && !colorsPerVertex) {
        color0 = colors[j - 1];
      } else {
        color0 = colors[j];
      }

      if (j !== positionsLength - 1) {
        color1 = colors[j];
      }
    }

    const startK = j === 0 ? 2 : 0;
    const endK = j === positionsLength - 1 ? 2 : 4;

    for (k = startK; k < endK; ++k) {
      Cartesian3.pack(scratchPosition, finalPositions, positionIndex);
      Cartesian3.pack(scratchPrevPosition, prevPositions, positionIndex);
      Cartesian3.pack(scratchNextPosition, nextPositions, positionIndex);
      positionIndex += 3;

      const direction = k - 2 < 0 ? -1.0 : 1.0;
      expandAndWidth[expandAndWidthIndex++] = 2 * (k % 2) - 1; // expand direction
      expandAndWidth[expandAndWidthIndex++] = direction * width;

      if (vertexFormat.st) {
        st[stIndex++] = j / (positionsLength - 1);
        st[stIndex++] = Math.max(expandAndWidth[expandAndWidthIndex - 2], 0.0);
      }

      if (defined(finalColors)) {
        const color = k < 2 ? color0 : color1;

        finalColors[colorIndex++] = Color.floatToByte(color.red);
        finalColors[colorIndex++] = Color.floatToByte(color.green);
        finalColors[colorIndex++] = Color.floatToByte(color.blue);
        finalColors[colorIndex++] = Color.floatToByte(color.alpha);
      }
    }
  }

  const attributes = new GeometryAttributes();

  attributes.position = new GeometryAttribute({
    componentDatatype: ComponentDatatype.DOUBLE,
    componentsPerAttribute: 3,
    values: finalPositions,
  });

  attributes.prevPosition = new GeometryAttribute({
    componentDatatype: ComponentDatatype.DOUBLE,
    componentsPerAttribute: 3,
    values: prevPositions,
  });

  attributes.nextPosition = new GeometryAttribute({
    componentDatatype: ComponentDatatype.DOUBLE,
    componentsPerAttribute: 3,
    values: nextPositions,
  });

  attributes.expandAndWidth = new GeometryAttribute({
    componentDatatype: ComponentDatatype.FLOAT,
    componentsPerAttribute: 2,
    values: expandAndWidth,
  });

  if (vertexFormat.st) {
    attributes.st = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 2,
      values: st,
    });
  }

  if (defined(finalColors)) {
    attributes.color = new GeometryAttribute({
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      componentsPerAttribute: 4,
      values: finalColors,
      normalize: true,
    });
  }

  const indices = IndexDatatype.createTypedArray(size, positionsLength * 6 - 6);
  let index = 0;
  let indicesIndex = 0;
  const length = positionsLength - 1.0;
  for (j = 0; j < length; ++j) {
    indices[indicesIndex++] = index;
    indices[indicesIndex++] = index + 2;
    indices[indicesIndex++] = index + 1;

    indices[indicesIndex++] = index + 1;
    indices[indicesIndex++] = index + 2;
    indices[indicesIndex++] = index + 3;

    index += 4;
  }

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
    boundingSphere: BoundingSphere.fromPoints(positions),
    geometryType: GeometryType.POLYLINES,
  });
};
export default PolylineGeometry;
