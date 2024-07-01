import ArcType from "./ArcType.js";
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
import IndexDatatype from "./IndexDatatype.js";
import CesiumMath from "./Math.js";
import PolylinePipeline from "./PolylinePipeline.js";
import PrimitiveType from "./PrimitiveType.js";

function interpolateColors(p0, p1, color0, color1, minDistance, array, offset) {
  const numPoints = PolylinePipeline.numberOfPoints(p0, p1, minDistance);
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
      array[offset++] = Color.floatToByte(r0);
      array[offset++] = Color.floatToByte(g0);
      array[offset++] = Color.floatToByte(b0);
      array[offset++] = Color.floatToByte(a0);
    }
    return offset;
  }

  const redPerVertex = (r1 - r0) / numPoints;
  const greenPerVertex = (g1 - g0) / numPoints;
  const bluePerVertex = (b1 - b0) / numPoints;
  const alphaPerVertex = (a1 - a0) / numPoints;

  let index = offset;
  for (i = 0; i < numPoints; i++) {
    array[index++] = Color.floatToByte(r0 + i * redPerVertex);
    array[index++] = Color.floatToByte(g0 + i * greenPerVertex);
    array[index++] = Color.floatToByte(b0 + i * bluePerVertex);
    array[index++] = Color.floatToByte(a0 + i * alphaPerVertex);
  }

  return index;
}

/**
 * A description of a polyline modeled as a line strip; the first two positions define a line segment,
 * and each additional position defines a line segment from the previous position.
 *
 * @alias SimplePolylineGeometry
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of {@link Cartesian3} defining the positions in the polyline as a line strip.
 * @param {Color[]} [options.colors] An Array of {@link Color} defining the per vertex or per segment colors.
 * @param {boolean} [options.colorsPerVertex=false] A boolean that determines whether the colors will be flat across each segment of the line or interpolated across the vertices.
 * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polyline segments must follow.
 * @param {number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude if options.arcType is not ArcType.NONE. Determines the number of positions in the buffer.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid to be used as a reference.
 *
 * @exception {DeveloperError} At least two positions are required.
 * @exception {DeveloperError} colors has an invalid length.
 *
 * @see SimplePolylineGeometry#createGeometry
 *
 * @example
 * // A polyline with two connected line segments
 * const polyline = new Cesium.SimplePolylineGeometry({
 *   positions : Cesium.Cartesian3.fromDegreesArray([
 *     0.0, 0.0,
 *     5.0, 0.0,
 *     5.0, 5.0
 *   ])
 * });
 * const geometry = Cesium.SimplePolylineGeometry.createGeometry(polyline);
 */
function SimplePolylineGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const positions = options.positions;
  const colors = options.colors;
  const colorsPerVertex = defaultValue(options.colorsPerVertex, false);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(positions) || positions.length < 2) {
    throw new DeveloperError("At least two positions are required.");
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
  this._colorsPerVertex = colorsPerVertex;

  this._arcType = defaultValue(options.arcType, ArcType.GEODESIC);
  this._granularity = defaultValue(
    options.granularity,
    CesiumMath.RADIANS_PER_DEGREE
  );
  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.default);
  this._workerName = "createSimplePolylineGeometry";

  let numComponents = 1 + positions.length * Cartesian3.packedLength;
  numComponents += defined(colors) ? 1 + colors.length * Color.packedLength : 1;

  /**
   * The number of elements used to pack the object into an array.
   * @type {number}
   */
  this.packedLength = numComponents + Ellipsoid.packedLength + 3;
}

/**
 * Stores the provided instance into the provided array.
 *
 * @param {SimplePolylineGeometry} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
SimplePolylineGeometry.pack = function (value, array, startingIndex) {
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

  array[startingIndex++] = value._colorsPerVertex ? 1.0 : 0.0;
  array[startingIndex++] = value._arcType;
  array[startingIndex] = value._granularity;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {SimplePolylineGeometry} [result] The object into which to store the result.
 * @returns {SimplePolylineGeometry} The modified result parameter or a new SimplePolylineGeometry instance if one was not provided.
 */
SimplePolylineGeometry.unpack = function (array, startingIndex, result) {
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

  const ellipsoid = Ellipsoid.unpack(array, startingIndex);
  startingIndex += Ellipsoid.packedLength;

  const colorsPerVertex = array[startingIndex++] === 1.0;
  const arcType = array[startingIndex++];
  const granularity = array[startingIndex];

  if (!defined(result)) {
    return new SimplePolylineGeometry({
      positions: positions,
      colors: colors,
      ellipsoid: ellipsoid,
      colorsPerVertex: colorsPerVertex,
      arcType: arcType,
      granularity: granularity,
    });
  }

  result._positions = positions;
  result._colors = colors;
  result._ellipsoid = ellipsoid;
  result._colorsPerVertex = colorsPerVertex;
  result._arcType = arcType;
  result._granularity = granularity;

  return result;
};

const scratchArray1 = new Array(2);
const scratchArray2 = new Array(2);
const generateArcOptionsScratch = {
  positions: scratchArray1,
  height: scratchArray2,
  ellipsoid: undefined,
  minDistance: undefined,
  granularity: undefined,
};

/**
 * Computes the geometric representation of a simple polyline, including its vertices, indices, and a bounding sphere.
 *
 * @param {SimplePolylineGeometry} simplePolylineGeometry A description of the polyline.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
SimplePolylineGeometry.createGeometry = function (simplePolylineGeometry) {
  const positions = simplePolylineGeometry._positions;
  const colors = simplePolylineGeometry._colors;
  const colorsPerVertex = simplePolylineGeometry._colorsPerVertex;
  const arcType = simplePolylineGeometry._arcType;
  const granularity = simplePolylineGeometry._granularity;
  const ellipsoid = simplePolylineGeometry._ellipsoid;

  const minDistance = CesiumMath.chordLength(
    granularity,
    ellipsoid.maximumRadius
  );
  const perSegmentColors = defined(colors) && !colorsPerVertex;

  let i;
  const length = positions.length;

  let positionValues;
  let numberOfPositions;
  let colorValues;
  let color;
  let offset = 0;

  if (arcType === ArcType.GEODESIC || arcType === ArcType.RHUMB) {
    let subdivisionSize;
    let numberOfPointsFunction;
    let generateArcFunction;
    if (arcType === ArcType.GEODESIC) {
      subdivisionSize = CesiumMath.chordLength(
        granularity,
        ellipsoid.maximumRadius
      );
      numberOfPointsFunction = PolylinePipeline.numberOfPoints;
      generateArcFunction = PolylinePipeline.generateArc;
    } else {
      subdivisionSize = granularity;
      numberOfPointsFunction = PolylinePipeline.numberOfPointsRhumbLine;
      generateArcFunction = PolylinePipeline.generateRhumbArc;
    }

    const heights = PolylinePipeline.extractHeights(positions, ellipsoid);

    const generateArcOptions = generateArcOptionsScratch;
    if (arcType === ArcType.GEODESIC) {
      generateArcOptions.minDistance = minDistance;
    } else {
      generateArcOptions.granularity = granularity;
    }
    generateArcOptions.ellipsoid = ellipsoid;

    if (perSegmentColors) {
      let positionCount = 0;
      for (i = 0; i < length - 1; i++) {
        positionCount +=
          numberOfPointsFunction(
            positions[i],
            positions[i + 1],
            subdivisionSize
          ) + 1;
      }

      positionValues = new Float64Array(positionCount * 3);
      colorValues = new Uint8Array(positionCount * 4);

      generateArcOptions.positions = scratchArray1;
      generateArcOptions.height = scratchArray2;

      let ci = 0;
      for (i = 0; i < length - 1; ++i) {
        scratchArray1[0] = positions[i];
        scratchArray1[1] = positions[i + 1];

        scratchArray2[0] = heights[i];
        scratchArray2[1] = heights[i + 1];

        const pos = generateArcFunction(generateArcOptions);

        if (defined(colors)) {
          const segLen = pos.length / 3;
          color = colors[i];
          for (let k = 0; k < segLen; ++k) {
            colorValues[ci++] = Color.floatToByte(color.red);
            colorValues[ci++] = Color.floatToByte(color.green);
            colorValues[ci++] = Color.floatToByte(color.blue);
            colorValues[ci++] = Color.floatToByte(color.alpha);
          }
        }

        positionValues.set(pos, offset);
        offset += pos.length;
      }
    } else {
      generateArcOptions.positions = positions;
      generateArcOptions.height = heights;
      positionValues = new Float64Array(
        generateArcFunction(generateArcOptions)
      );

      if (defined(colors)) {
        colorValues = new Uint8Array((positionValues.length / 3) * 4);

        for (i = 0; i < length - 1; ++i) {
          const p0 = positions[i];
          const p1 = positions[i + 1];
          const c0 = colors[i];
          const c1 = colors[i + 1];
          offset = interpolateColors(
            p0,
            p1,
            c0,
            c1,
            minDistance,
            colorValues,
            offset
          );
        }

        const lastColor = colors[length - 1];
        colorValues[offset++] = Color.floatToByte(lastColor.red);
        colorValues[offset++] = Color.floatToByte(lastColor.green);
        colorValues[offset++] = Color.floatToByte(lastColor.blue);
        colorValues[offset++] = Color.floatToByte(lastColor.alpha);
      }
    }
  } else {
    numberOfPositions = perSegmentColors ? length * 2 - 2 : length;
    positionValues = new Float64Array(numberOfPositions * 3);
    colorValues = defined(colors)
      ? new Uint8Array(numberOfPositions * 4)
      : undefined;

    let positionIndex = 0;
    let colorIndex = 0;

    for (i = 0; i < length; ++i) {
      const p = positions[i];

      if (perSegmentColors && i > 0) {
        Cartesian3.pack(p, positionValues, positionIndex);
        positionIndex += 3;

        color = colors[i - 1];
        colorValues[colorIndex++] = Color.floatToByte(color.red);
        colorValues[colorIndex++] = Color.floatToByte(color.green);
        colorValues[colorIndex++] = Color.floatToByte(color.blue);
        colorValues[colorIndex++] = Color.floatToByte(color.alpha);
      }

      if (perSegmentColors && i === length - 1) {
        break;
      }

      Cartesian3.pack(p, positionValues, positionIndex);
      positionIndex += 3;

      if (defined(colors)) {
        color = colors[i];
        colorValues[colorIndex++] = Color.floatToByte(color.red);
        colorValues[colorIndex++] = Color.floatToByte(color.green);
        colorValues[colorIndex++] = Color.floatToByte(color.blue);
        colorValues[colorIndex++] = Color.floatToByte(color.alpha);
      }
    }
  }

  const attributes = new GeometryAttributes();
  attributes.position = new GeometryAttribute({
    componentDatatype: ComponentDatatype.DOUBLE,
    componentsPerAttribute: 3,
    values: positionValues,
  });

  if (defined(colors)) {
    attributes.color = new GeometryAttribute({
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      componentsPerAttribute: 4,
      values: colorValues,
      normalize: true,
    });
  }

  numberOfPositions = positionValues.length / 3;
  const numberOfIndices = (numberOfPositions - 1) * 2;
  const indices = IndexDatatype.createTypedArray(
    numberOfPositions,
    numberOfIndices
  );

  let index = 0;
  for (i = 0; i < numberOfPositions - 1; ++i) {
    indices[index++] = i;
    indices[index++] = i + 1;
  }

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.LINES,
    boundingSphere: BoundingSphere.fromPoints(positions),
  });
};
export default SimplePolylineGeometry;
