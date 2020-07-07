import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
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
import PrimitiveType from "./PrimitiveType.js";
import VertexFormat from "./VertexFormat.js";
import WallGeometryLibrary from "./WallGeometryLibrary.js";

/**
 * A description of a wall, which is similar to a KML line string. A wall is defined by a series of points,
 * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
 *
 * @alias WallGeometry
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
 * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
 * @param {Number[]} [options.maximumHeights] An array parallel to <code>positions</code> that give the maximum height of the
 *        wall at <code>positions</code>. If undefined, the height of each position in used.
 * @param {Number[]} [options.minimumHeights] An array parallel to <code>positions</code> that give the minimum height of the
 *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
 * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
 *
 * @exception {DeveloperError} positions length must be greater than or equal to 2.
 * @exception {DeveloperError} positions and maximumHeights must have the same length.
 * @exception {DeveloperError} positions and minimumHeights must have the same length.
 *
 * @see WallGeometry#createGeometry
 * @see WallGeometry#fromConstantHeight
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Wall.html|Cesium Sandcastle Wall Demo}
 *
 * @example
 * // create a wall that spans from ground level to 10000 meters
 * var wall = new Cesium.WallGeometry({
 *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
 *     19.0, 47.0, 10000.0,
 *     19.0, 48.0, 10000.0,
 *     20.0, 48.0, 10000.0,
 *     20.0, 47.0, 10000.0,
 *     19.0, 47.0, 10000.0
 *   ])
 * });
 * var geometry = Cesium.WallGeometry.createGeometry(wall);
 */
function WallGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var wallPositions = options.positions;
  var maximumHeights = options.maximumHeights;
  var minimumHeights = options.minimumHeights;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(wallPositions)) {
    throw new DeveloperError("options.positions is required.");
  }
  if (
    defined(maximumHeights) &&
    maximumHeights.length !== wallPositions.length
  ) {
    throw new DeveloperError(
      "options.positions and options.maximumHeights must have the same length."
    );
  }
  if (
    defined(minimumHeights) &&
    minimumHeights.length !== wallPositions.length
  ) {
    throw new DeveloperError(
      "options.positions and options.minimumHeights must have the same length."
    );
  }
  //>>includeEnd('debug');

  var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
  var granularity = defaultValue(
    options.granularity,
    CesiumMath.RADIANS_PER_DEGREE
  );
  var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

  this._positions = wallPositions;
  this._minimumHeights = minimumHeights;
  this._maximumHeights = maximumHeights;
  this._vertexFormat = VertexFormat.clone(vertexFormat);
  this._granularity = granularity;
  this._ellipsoid = Ellipsoid.clone(ellipsoid);
  this._workerName = "createWallGeometry";

  var numComponents = 1 + wallPositions.length * Cartesian3.packedLength + 2;
  if (defined(minimumHeights)) {
    numComponents += minimumHeights.length;
  }
  if (defined(maximumHeights)) {
    numComponents += maximumHeights.length;
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  this.packedLength =
    numComponents + Ellipsoid.packedLength + VertexFormat.packedLength + 1;
}

/**
 * Stores the provided instance into the provided array.
 *
 * @param {WallGeometry} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
WallGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required");
  }
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  var i;

  var positions = value._positions;
  var length = positions.length;
  array[startingIndex++] = length;

  for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    Cartesian3.pack(positions[i], array, startingIndex);
  }

  var minimumHeights = value._minimumHeights;
  length = defined(minimumHeights) ? minimumHeights.length : 0;
  array[startingIndex++] = length;

  if (defined(minimumHeights)) {
    for (i = 0; i < length; ++i) {
      array[startingIndex++] = minimumHeights[i];
    }
  }

  var maximumHeights = value._maximumHeights;
  length = defined(maximumHeights) ? maximumHeights.length : 0;
  array[startingIndex++] = length;

  if (defined(maximumHeights)) {
    for (i = 0; i < length; ++i) {
      array[startingIndex++] = maximumHeights[i];
    }
  }

  Ellipsoid.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid.packedLength;

  VertexFormat.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat.packedLength;

  array[startingIndex] = value._granularity;

  return array;
};

var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
var scratchVertexFormat = new VertexFormat();
var scratchOptions = {
  positions: undefined,
  minimumHeights: undefined,
  maximumHeights: undefined,
  ellipsoid: scratchEllipsoid,
  vertexFormat: scratchVertexFormat,
  granularity: undefined,
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {WallGeometry} [result] The object into which to store the result.
 * @returns {WallGeometry} The modified result parameter or a new WallGeometry instance if one was not provided.
 */
WallGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  var i;

  var length = array[startingIndex++];
  var positions = new Array(length);

  for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    positions[i] = Cartesian3.unpack(array, startingIndex);
  }

  length = array[startingIndex++];
  var minimumHeights;

  if (length > 0) {
    minimumHeights = new Array(length);
    for (i = 0; i < length; ++i) {
      minimumHeights[i] = array[startingIndex++];
    }
  }

  length = array[startingIndex++];
  var maximumHeights;

  if (length > 0) {
    maximumHeights = new Array(length);
    for (i = 0; i < length; ++i) {
      maximumHeights[i] = array[startingIndex++];
    }
  }

  var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid.packedLength;

  var vertexFormat = VertexFormat.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat.packedLength;

  var granularity = array[startingIndex];

  if (!defined(result)) {
    scratchOptions.positions = positions;
    scratchOptions.minimumHeights = minimumHeights;
    scratchOptions.maximumHeights = maximumHeights;
    scratchOptions.granularity = granularity;
    return new WallGeometry(scratchOptions);
  }

  result._positions = positions;
  result._minimumHeights = minimumHeights;
  result._maximumHeights = maximumHeights;
  result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
  result._granularity = granularity;

  return result;
};

/**
 * A description of a wall, which is similar to a KML line string. A wall is defined by a series of points,
 * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
 *
 * @param {Object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
 * @param {Number} [options.maximumHeight] A constant that defines the maximum height of the
 *        wall at <code>positions</code>. If undefined, the height of each position in used.
 * @param {Number} [options.minimumHeight] A constant that defines the minimum height of the
 *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
 * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
 * @returns {WallGeometry}
 *
 *
 * @example
 * // create a wall that spans from 10000 meters to 20000 meters
 * var wall = Cesium.WallGeometry.fromConstantHeights({
 *   positions : Cesium.Cartesian3.fromDegreesArray([
 *     19.0, 47.0,
 *     19.0, 48.0,
 *     20.0, 48.0,
 *     20.0, 47.0,
 *     19.0, 47.0,
 *   ]),
 *   minimumHeight : 20000.0,
 *   maximumHeight : 10000.0
 * });
 * var geometry = Cesium.WallGeometry.createGeometry(wall);
 *
 * @see WallGeometry#createGeometry
 */
WallGeometry.fromConstantHeights = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var positions = options.positions;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(positions)) {
    throw new DeveloperError("options.positions is required.");
  }
  //>>includeEnd('debug');

  var minHeights;
  var maxHeights;

  var min = options.minimumHeight;
  var max = options.maximumHeight;

  var doMin = defined(min);
  var doMax = defined(max);
  if (doMin || doMax) {
    var length = positions.length;
    minHeights = doMin ? new Array(length) : undefined;
    maxHeights = doMax ? new Array(length) : undefined;

    for (var i = 0; i < length; ++i) {
      if (doMin) {
        minHeights[i] = min;
      }

      if (doMax) {
        maxHeights[i] = max;
      }
    }
  }

  var newOptions = {
    positions: positions,
    maximumHeights: maxHeights,
    minimumHeights: minHeights,
    ellipsoid: options.ellipsoid,
    vertexFormat: options.vertexFormat,
  };
  return new WallGeometry(newOptions);
};

function calculateDirection(p0, p1, result) {
  if (Cartesian3.equalsEpsilon(p0, p1, CesiumMath.EPSILON10)) {
    return false;
  }

  result = Cartesian3.normalize(Cartesian3.subtract(p0, p1, result), result);
  return true;
}

function calculateNormal(p0, p1, p2, resultP10, resultP20, result) {
  if (!calculateDirection(p1, p0, resultP10)) {
    return false;
  }

  if (!calculateDirection(p2, p0, resultP20)) {
    return false;
  }

  var angle = Cartesian3.dot(resultP10, resultP20);
  if (CesiumMath.equalsEpsilon(Math.abs(angle), 1.0, CesiumMath.EPSILON10)) {
    return false;
  }

  result = Cartesian3.normalize(
    Cartesian3.cross(resultP10, resultP20, result),
    result
  );
  return true;
}

function calculateBitangent(normal, tangent, result) {
  result = Cartesian3.normalize(
    Cartesian3.cross(normal, tangent, result),
    result
  );
}

function createWallGeometryAttributes(
  vertexFormat,
  positions,
  normals,
  tangents,
  bitangents,
  textureCoordinates
) {
  var attributes = new GeometryAttributes();

  if (vertexFormat.position) {
    attributes.position = new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    });
  }

  if (vertexFormat.normal) {
    attributes.normal = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 3,
      values: normals,
    });
  }

  if (vertexFormat.tangent) {
    attributes.tangent = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 3,
      values: tangents,
    });
  }

  if (vertexFormat.bitangent) {
    attributes.bitangent = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 3,
      values: bitangents,
    });
  }

  if (vertexFormat.st) {
    attributes.st = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 2,
      values: textureCoordinates,
    });
  }

  return attributes;
}

function createWallGeometryIndices(positions, numCorners) {
  // prepare the side walls, two triangles for each wall
  //
  //    A (i+1)  B (i+3) E
  //    +--------+-------+
  //    |      / |      /|    triangles:  A C B
  //    |     /  |     / |                B C D
  //    |    /   |    /  |
  //    |   /    |   /   |
  //    |  /     |  /    |
  //    | /      | /     |
  //    +--------+-------+
  //    C (i)    D (i+2) F
  //
  var size = positions.length;
  var numVertices = size / 3;
  size -= 6 * (numCorners + 1);
  var indices = IndexDatatype.createTypedArray(numVertices, size);

  var scratchPosition1 = new Cartesian3();
  var scratchPosition2 = new Cartesian3();
  var edgeIndex = 0;
  for (var i = 0; i < numVertices - 2; i += 2) {
    var LL = i;
    var LR = i + 2;
    var pl = Cartesian3.fromArray(positions, LL * 3, scratchPosition1);
    var pr = Cartesian3.fromArray(positions, LR * 3, scratchPosition2);
    if (Cartesian3.equalsEpsilon(pl, pr, CesiumMath.EPSILON10)) {
      continue;
    }
    var UL = i + 1;
    var UR = i + 3;

    indices[edgeIndex++] = UL;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = LR;
  }

  return indices;
}

/**
 * Computes the geometric representation of a wall, including its vertices, indices, and a bounding sphere.
 *
 * @param {WallGeometry} wallGeometry A description of the wall.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
WallGeometry.createGeometry = function (wallGeometry) {
  var wallPositions = wallGeometry._positions;
  var minimumHeights = wallGeometry._minimumHeights;
  var maximumHeights = wallGeometry._maximumHeights;
  var vertexFormat = wallGeometry._vertexFormat;
  var granularity = wallGeometry._granularity;
  var ellipsoid = wallGeometry._ellipsoid;

  var pos = WallGeometryLibrary.computePositions(
    ellipsoid,
    wallPositions,
    maximumHeights,
    minimumHeights,
    granularity,
    true
  );
  if (!defined(pos)) {
    return;
  }

  var bottomPositions = pos.bottomPositions;
  var topPositions = pos.topPositions;
  var numCorners = pos.numCorners;

  var length = topPositions.length;
  var size = length * 2;

  var positions = vertexFormat.position ? new Float64Array(size) : undefined;
  var normals = vertexFormat.normal ? new Float32Array(size) : undefined;
  var tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
  var bitangents = vertexFormat.bitangent ? new Float32Array(size) : undefined;
  var textureCoordinates = vertexFormat.st
    ? new Float32Array((size / 3) * 2)
    : undefined;

  var positionIndex = 0;
  var normalIndex = 0;
  var bitangentIndex = 0;
  var tangentIndex = 0;
  var stIndex = 0;

  // add lower and upper points one after the other, lower
  // points being even and upper points being odd
  var topPosition = new Cartesian3();
  var bottomPosition = new Cartesian3();
  var nextTopPosition = new Cartesian3();
  var nextBottomPosition = new Cartesian3();
  var topToBottom = new Cartesian3();
  var topToNextTop = new Cartesian3();

  var normal = new Cartesian3(0.0, 1.0, 0.0);
  var tangent = new Cartesian3(1.0, 0.0, 0.0);
  var bitangent = new Cartesian3(0.0, 0.0, 1.0);

  var recomputeNormal = true;
  var s = 0;
  var ds = 1.0 / (length / 3.0 - wallPositions.length + 1.0);
  for (var i = 0; i < length; i += 3) {
    var curr = i;
    var next = i + 3;
    Cartesian3.fromArray(topPositions, curr, topPosition);
    Cartesian3.fromArray(bottomPositions, curr, bottomPosition);

    if (next < length) {
      Cartesian3.fromArray(topPositions, next, nextTopPosition);
      Cartesian3.fromArray(bottomPositions, next, nextBottomPosition);

      if (
        recomputeNormal &&
        (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent)
      ) {
        recomputeNormal = !calculateNormal(
          topPosition,
          bottomPosition,
          nextTopPosition,
          topToBottom,
          topToNextTop,
          normal
        );
      }

      if (
        !recomputeNormal &&
        (vertexFormat.tangent || vertexFormat.bitangent)
      ) {
        recomputeNormal = !calculateDirection(
          bottomPosition,
          nextBottomPosition,
          tangent
        );
      }

      if (!recomputeNormal && vertexFormat.bitangent) {
        calculateBitangent(normal, tangent, bitangent);
      }
    }

    if (vertexFormat.position) {
      Cartesian3.pack(bottomPosition, positions, positionIndex);
      Cartesian3.pack(topPosition, positions, positionIndex + 3);
      positionIndex += 6;
    }

    if (vertexFormat.normal) {
      Cartesian3.pack(normal, normals, normalIndex);
      Cartesian3.pack(normal, normals, normalIndex + 3);
      normalIndex += 6;
    }

    if (vertexFormat.tangent) {
      Cartesian3.pack(tangent, tangents, tangentIndex);
      Cartesian3.pack(tangent, tangents, tangentIndex + 3);
      tangentIndex += 6;
    }

    if (vertexFormat.bitangent) {
      Cartesian3.pack(bitangent, bitangents, bitangentIndex);
      Cartesian3.pack(bitangent, bitangents, bitangentIndex + 3);
      bitangentIndex += 6;
    }

    if (vertexFormat.st) {
      textureCoordinates[stIndex++] = s;
      textureCoordinates[stIndex++] = 0.0;

      textureCoordinates[stIndex++] = s;
      textureCoordinates[stIndex++] = 1.0;
    }

    if (!recomputeNormal && (vertexFormat.tangent || vertexFormat.bitangent)) {
      s += ds;
    }
  }

  var indices = createWallGeometryIndices(positions, numCorners);

  var attributes = createWallGeometryAttributes(
    vertexFormat,
    positions,
    normals,
    tangents,
    bitangents,
    textureCoordinates
  );

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
    boundingSphere: new BoundingSphere.fromVertices(positions),
  });
};
export default WallGeometry;
