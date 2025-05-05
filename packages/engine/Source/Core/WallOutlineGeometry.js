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
import WallGeometryLibrary from "./WallGeometryLibrary.js";

const scratchCartesian3Position1 = new Cartesian3();
const scratchCartesian3Position2 = new Cartesian3();

/**
 * A description of a wall outline. A wall is defined by a series of points,
 * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
 *
 * @alias WallOutlineGeometry
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
 * @param {number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
 * @param {number[]} [options.maximumHeights] An array parallel to <code>positions</code> that give the maximum height of the
 *        wall at <code>positions</code>. If undefined, the height of each position in used.
 * @param {number[]} [options.minimumHeights] An array parallel to <code>positions</code> that give the minimum height of the
 *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid for coordinate manipulation
 *
 * @exception {DeveloperError} positions length must be greater than or equal to 2.
 * @exception {DeveloperError} positions and maximumHeights must have the same length.
 * @exception {DeveloperError} positions and minimumHeights must have the same length.
 *
 * @see WallGeometry#createGeometry
 * @see WallGeometry#fromConstantHeight
 *
 * @example
 * // create a wall outline that spans from ground level to 10000 meters
 * const wall = new Cesium.WallOutlineGeometry({
 *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
 *     19.0, 47.0, 10000.0,
 *     19.0, 48.0, 10000.0,
 *     20.0, 48.0, 10000.0,
 *     20.0, 47.0, 10000.0,
 *     19.0, 47.0, 10000.0
 *   ])
 * });
 * const geometry = Cesium.WallOutlineGeometry.createGeometry(wall);
 */
function WallOutlineGeometry(options) {
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
      "options.positions and options.maximumHeights must have the same length.",
    );
  }
  if (
    defined(minimumHeights) &&
    minimumHeights.length !== wallPositions.length
  ) {
    throw new DeveloperError(
      "options.positions and options.minimumHeights must have the same length.",
    );
  }
  //>>includeEnd('debug');

  const granularity = defaultValue(
    options.granularity,
    CesiumMath.RADIANS_PER_DEGREE,
  );
  const ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.default);

  this._positions = wallPositions;
  this._minimumHeights = minimumHeights;
  this._maximumHeights = maximumHeights;
  this._granularity = granularity;
  this._ellipsoid = Ellipsoid.clone(ellipsoid);
  this._workerName = "createWallOutlineGeometry";

  let numComponents = 1 + wallPositions.length * Cartesian3.packedLength + 2;
  if (defined(minimumHeights)) {
    numComponents += minimumHeights.length;
  }
  if (defined(maximumHeights)) {
    numComponents += maximumHeights.length;
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {number}
   */
  this.packedLength = numComponents + Ellipsoid.packedLength + 1;
}

/**
 * Stores the provided instance into the provided array.
 *
 * @param {WallOutlineGeometry} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
WallOutlineGeometry.pack = function (value, array, startingIndex) {
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

  array[startingIndex] = value._granularity;

  return array;
};

const scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
const scratchOptions = {
  positions: undefined,
  minimumHeights: undefined,
  maximumHeights: undefined,
  ellipsoid: scratchEllipsoid,
  granularity: undefined,
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {WallOutlineGeometry} [result] The object into which to store the result.
 * @returns {WallOutlineGeometry} The modified result parameter or a new WallOutlineGeometry instance if one was not provided.
 */
WallOutlineGeometry.unpack = function (array, startingIndex, result) {
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

  const granularity = array[startingIndex];

  if (!defined(result)) {
    scratchOptions.positions = positions;
    scratchOptions.minimumHeights = minimumHeights;
    scratchOptions.maximumHeights = maximumHeights;
    scratchOptions.granularity = granularity;
    return new WallOutlineGeometry(scratchOptions);
  }

  result._positions = positions;
  result._minimumHeights = minimumHeights;
  result._maximumHeights = maximumHeights;
  result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
  result._granularity = granularity;

  return result;
};

/**
 * A description of a walloutline. A wall is defined by a series of points,
 * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
 *
 * @param {object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
 * @param {number} [options.maximumHeight] A constant that defines the maximum height of the
 *        wall at <code>positions</code>. If undefined, the height of each position in used.
 * @param {number} [options.minimumHeight] A constant that defines the minimum height of the
 *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid for coordinate manipulation
 * @returns {WallOutlineGeometry}
 *
 *
 * @example
 * // create a wall that spans from 10000 meters to 20000 meters
 * const wall = Cesium.WallOutlineGeometry.fromConstantHeights({
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
 * const geometry = Cesium.WallOutlineGeometry.createGeometry(wall);
 *
 * @see WallOutlineGeometry#createGeometry
 */
WallOutlineGeometry.fromConstantHeights = function (options) {
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
  };
  return new WallOutlineGeometry(newOptions);
};

/**
 * Computes the geometric representation of a wall outline, including its vertices, indices, and a bounding sphere.
 *
 * @param {WallOutlineGeometry} wallGeometry A description of the wall outline.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
WallOutlineGeometry.createGeometry = function (wallGeometry) {
  const wallPositions = wallGeometry._positions;
  const minimumHeights = wallGeometry._minimumHeights;
  const maximumHeights = wallGeometry._maximumHeights;
  const granularity = wallGeometry._granularity;
  const ellipsoid = wallGeometry._ellipsoid;

  const pos = WallGeometryLibrary.computePositions(
    ellipsoid,
    wallPositions,
    maximumHeights,
    minimumHeights,
    granularity,
    false,
  );
  if (!defined(pos)) {
    return;
  }

  const bottomPositions = pos.bottomPositions;
  const topPositions = pos.topPositions;

  let length = topPositions.length;
  let size = length * 2;

  const positions = new Float64Array(size);
  let positionIndex = 0;

  // add lower and upper points one after the other, lower
  // points being even and upper points being odd
  length /= 3;
  let i;
  for (i = 0; i < length; ++i) {
    const i3 = i * 3;
    const topPosition = Cartesian3.fromArray(
      topPositions,
      i3,
      scratchCartesian3Position1,
    );
    const bottomPosition = Cartesian3.fromArray(
      bottomPositions,
      i3,
      scratchCartesian3Position2,
    );

    // insert the lower point
    positions[positionIndex++] = bottomPosition.x;
    positions[positionIndex++] = bottomPosition.y;
    positions[positionIndex++] = bottomPosition.z;

    // insert the upper point
    positions[positionIndex++] = topPosition.x;
    positions[positionIndex++] = topPosition.y;
    positions[positionIndex++] = topPosition.z;
  }

  const attributes = new GeometryAttributes({
    position: new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    }),
  });

  const numVertices = size / 3;
  size = 2 * numVertices - 4 + numVertices;
  const indices = IndexDatatype.createTypedArray(numVertices, size);

  let edgeIndex = 0;
  for (i = 0; i < numVertices - 2; i += 2) {
    const LL = i;
    const LR = i + 2;
    const pl = Cartesian3.fromArray(
      positions,
      LL * 3,
      scratchCartesian3Position1,
    );
    const pr = Cartesian3.fromArray(
      positions,
      LR * 3,
      scratchCartesian3Position2,
    );
    if (Cartesian3.equalsEpsilon(pl, pr, CesiumMath.EPSILON10)) {
      continue;
    }
    const UL = i + 1;
    const UR = i + 3;

    indices[edgeIndex++] = UL;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = UL;
    indices[edgeIndex++] = UR;
    indices[edgeIndex++] = LL;
    indices[edgeIndex++] = LR;
  }

  indices[edgeIndex++] = numVertices - 2;
  indices[edgeIndex++] = numVertices - 1;

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.LINES,
    boundingSphere: new BoundingSphere.fromVertices(positions),
  });
};
export default WallOutlineGeometry;
