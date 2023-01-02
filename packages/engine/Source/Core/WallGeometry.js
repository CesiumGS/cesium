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

const scratchCartesian3Position1 = new Cartesian3();
const scratchCartesian3Position2 = new Cartesian3();
const scratchCartesian3Position4 = new Cartesian3();
const scratchCartesian3Position5 = new Cartesian3();
const scratchBitangent = new Cartesian3();
const scratchTangent = new Cartesian3();
const scratchNormal = new Cartesian3();

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
 * const wall = new Cesium.WallGeometry({
 *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
 *     19.0, 47.0, 10000.0,
 *     19.0, 48.0, 10000.0,
 *     20.0, 48.0, 10000.0,
 *     20.0, 47.0, 10000.0,
 *     19.0, 47.0, 10000.0
 *   ])
 * });
 * const geometry = Cesium.WallGeometry.createGeometry(wall);
 */
function WallGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const wallPositions = options.positions;
  const maximumHeights = options.maximumHeights;
  const minimumHeights = options.minimumHeights;

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

  const vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
  const granularity = defaultValue(
    options.granularity,
    CesiumMath.RADIANS_PER_DEGREE
  );
  const ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

  this._positions = wallPositions;
  this._minimumHeights = minimumHeights;
  this._maximumHeights = maximumHeights;
  this._vertexFormat = VertexFormat.clone(vertexFormat);
  this._granularity = granularity;
  this._ellipsoid = Ellipsoid.clone(ellipsoid);
  this._workerName = "createWallGeometry";

  let numComponents = 1 + wallPositions.length * Cartesian3.packedLength + 2;
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

  let i;

  const positions = value._positions;
  let length = positions.length;
  array[startingIndex++] = length;

  for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    Cartesian3.pack(positions[i], array, startingIndex);
  }

  const minimumHeights = value._minimumHeights;
  length = defined(minimumHeights) ? minimumHeights.length : 0;
  array[startingIndex++] = length;

  if (defined(minimumHeights)) {
    for (i = 0; i < length; ++i) {
      array[startingIndex++] = minimumHeights[i];
    }
  }

  const maximumHeights = value._maximumHeights;
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

const scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
const scratchVertexFormat = new VertexFormat();
const scratchOptions = {
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

  let i;

  let length = array[startingIndex++];
  const positions = new Array(length);

  for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    positions[i] = Cartesian3.unpack(array, startingIndex);
  }

  length = array[startingIndex++];
  let minimumHeights;

  if (length > 0) {
    minimumHeights = new Array(length);
    for (i = 0; i < length; ++i) {
      minimumHeights[i] = array[startingIndex++];
    }
  }

  length = array[startingIndex++];
  let maximumHeights;

  if (length > 0) {
    maximumHeights = new Array(length);
    for (i = 0; i < length; ++i) {
      maximumHeights[i] = array[startingIndex++];
    }
  }

  const ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid.packedLength;

  const vertexFormat = VertexFormat.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat.packedLength;

  const granularity = array[startingIndex];

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
 * const wall = Cesium.WallGeometry.fromConstantHeights({
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
 * const geometry = Cesium.WallGeometry.createGeometry(wall);
 *
 * @see WallGeometry#createGeometry
 */
WallGeometry.fromConstantHeights = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const positions = options.positions;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(positions)) {
    throw new DeveloperError("options.positions is required.");
  }
  //>>includeEnd('debug');

  let minHeights;
  let maxHeights;

  const min = options.minimumHeight;
  const max = options.maximumHeight;

  const doMin = defined(min);
  const doMax = defined(max);
  if (doMin || doMax) {
    const length = positions.length;
    minHeights = doMin ? new Array(length) : undefined;
    maxHeights = doMax ? new Array(length) : undefined;

    for (let i = 0; i < length; ++i) {
      if (doMin) {
        minHeights[i] = min;
      }

      if (doMax) {
        maxHeights[i] = max;
      }
    }
  }

  const newOptions = {
    positions: positions,
    maximumHeights: maxHeights,
    minimumHeights: minHeights,
    ellipsoid: options.ellipsoid,
    vertexFormat: options.vertexFormat,
  };
  return new WallGeometry(newOptions);
};

/**
 * Computes the geometric representation of a wall, including its vertices, indices, and a bounding sphere.
 *
 * @param {WallGeometry} wallGeometry A description of the wall.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
WallGeometry.createGeometry = function (wallGeometry) {
  const wallPositions = wallGeometry._positions;
  const minimumHeights = wallGeometry._minimumHeights;
  const maximumHeights = wallGeometry._maximumHeights;
  const vertexFormat = wallGeometry._vertexFormat;
  const granularity = wallGeometry._granularity;
  const ellipsoid = wallGeometry._ellipsoid;

  const pos = WallGeometryLibrary.computePositions(
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

  const bottomPositions = pos.bottomPositions;
  const topPositions = pos.topPositions;
  const numCorners = pos.numCorners;

  let length = topPositions.length;
  let size = length * 2;

  const positions = vertexFormat.position ? new Float64Array(size) : undefined;
  const normals = vertexFormat.normal ? new Float32Array(size) : undefined;
  const tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
  const bitangents = vertexFormat.bitangent
    ? new Float32Array(size)
    : undefined;
  const textureCoordinates = vertexFormat.st
    ? new Float32Array((size / 3) * 2)
    : undefined;

  let positionIndex = 0;
  let normalIndex = 0;
  let bitangentIndex = 0;
  let tangentIndex = 0;
  let stIndex = 0;

  // add lower and upper points one after the other, lower
  // points being even and upper points being odd
  let normal = scratchNormal;
  let tangent = scratchTangent;
  let bitangent = scratchBitangent;
  let recomputeNormal = true;
  length /= 3;
  let i;
  let s = 0;
  const ds = 1 / (length - numCorners - 1);
  for (i = 0; i < length; ++i) {
    const i3 = i * 3;
    const topPosition = Cartesian3.fromArray(
      topPositions,
      i3,
      scratchCartesian3Position1
    );
    const bottomPosition = Cartesian3.fromArray(
      bottomPositions,
      i3,
      scratchCartesian3Position2
    );
    if (vertexFormat.position) {
      // insert the lower point
      positions[positionIndex++] = bottomPosition.x;
      positions[positionIndex++] = bottomPosition.y;
      positions[positionIndex++] = bottomPosition.z;

      // insert the upper point
      positions[positionIndex++] = topPosition.x;
      positions[positionIndex++] = topPosition.y;
      positions[positionIndex++] = topPosition.z;
    }

    if (vertexFormat.st) {
      textureCoordinates[stIndex++] = s;
      textureCoordinates[stIndex++] = 0.0;

      textureCoordinates[stIndex++] = s;
      textureCoordinates[stIndex++] = 1.0;
    }

    if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
      let nextTop = Cartesian3.clone(
        Cartesian3.ZERO,
        scratchCartesian3Position5
      );
      const groundPosition = Cartesian3.subtract(
        topPosition,
        ellipsoid.geodeticSurfaceNormal(
          topPosition,
          scratchCartesian3Position2
        ),
        scratchCartesian3Position2
      );
      if (i + 1 < length) {
        nextTop = Cartesian3.fromArray(
          topPositions,
          i3 + 3,
          scratchCartesian3Position5
        );
      }

      if (recomputeNormal) {
        const scalednextPosition = Cartesian3.subtract(
          nextTop,
          topPosition,
          scratchCartesian3Position4
        );
        const scaledGroundPosition = Cartesian3.subtract(
          groundPosition,
          topPosition,
          scratchCartesian3Position1
        );
        normal = Cartesian3.normalize(
          Cartesian3.cross(scaledGroundPosition, scalednextPosition, normal),
          normal
        );
        recomputeNormal = false;
      }

      if (
        Cartesian3.equalsEpsilon(topPosition, nextTop, CesiumMath.EPSILON10)
      ) {
        recomputeNormal = true;
      } else {
        s += ds;
        if (vertexFormat.tangent) {
          tangent = Cartesian3.normalize(
            Cartesian3.subtract(nextTop, topPosition, tangent),
            tangent
          );
        }
        if (vertexFormat.bitangent) {
          bitangent = Cartesian3.normalize(
            Cartesian3.cross(normal, tangent, bitangent),
            bitangent
          );
        }
      }

      if (vertexFormat.normal) {
        normals[normalIndex++] = normal.x;
        normals[normalIndex++] = normal.y;
        normals[normalIndex++] = normal.z;

        normals[normalIndex++] = normal.x;
        normals[normalIndex++] = normal.y;
        normals[normalIndex++] = normal.z;
      }

      if (vertexFormat.tangent) {
        tangents[tangentIndex++] = tangent.x;
        tangents[tangentIndex++] = tangent.y;
        tangents[tangentIndex++] = tangent.z;

        tangents[tangentIndex++] = tangent.x;
        tangents[tangentIndex++] = tangent.y;
        tangents[tangentIndex++] = tangent.z;
      }

      if (vertexFormat.bitangent) {
        bitangents[bitangentIndex++] = bitangent.x;
        bitangents[bitangentIndex++] = bitangent.y;
        bitangents[bitangentIndex++] = bitangent.z;

        bitangents[bitangentIndex++] = bitangent.x;
        bitangents[bitangentIndex++] = bitangent.y;
        bitangents[bitangentIndex++] = bitangent.z;
      }
    }
  }

  const attributes = new GeometryAttributes();

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

  const numVertices = size / 3;
  size -= 6 * (numCorners + 1);
  const indices = IndexDatatype.createTypedArray(numVertices, size);

  let edgeIndex = 0;
  for (i = 0; i < numVertices - 2; i += 2) {
    const LL = i;
    const LR = i + 2;
    const pl = Cartesian3.fromArray(
      positions,
      LL * 3,
      scratchCartesian3Position1
    );
    const pr = Cartesian3.fromArray(
      positions,
      LR * 3,
      scratchCartesian3Position2
    );
    if (Cartesian3.equalsEpsilon(pl, pr, CesiumMath.EPSILON10)) {
      continue;
    }
    const UL = i + 1;
    const UR = i + 3;

    indices[edgeIndex++] = UL;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = LR;
  }

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
    boundingSphere: new BoundingSphere.fromVertices(positions),
  });
};
export default WallGeometry;
