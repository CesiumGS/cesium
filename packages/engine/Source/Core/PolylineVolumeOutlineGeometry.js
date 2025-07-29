import arrayRemoveDuplicates from "./arrayRemoveDuplicates.js";
import BoundingRectangle from "./BoundingRectangle.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import ComponentDatatype from "./ComponentDatatype.js";
import CornerType from "./CornerType.js";
import Frozen from "./Frozen.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import IndexDatatype from "./IndexDatatype.js";
import CesiumMath from "./Math.js";
import PolygonPipeline from "./PolygonPipeline.js";
import PolylineVolumeGeometryLibrary from "./PolylineVolumeGeometryLibrary.js";
import PrimitiveType from "./PrimitiveType.js";
import WindingOrder from "./WindingOrder.js";

function computeAttributes(positions, shape) {
  const attributes = new GeometryAttributes();
  attributes.position = new GeometryAttribute({
    componentDatatype: ComponentDatatype.DOUBLE,
    componentsPerAttribute: 3,
    values: positions,
  });

  const shapeLength = shape.length;
  const vertexCount = attributes.position.values.length / 3;
  const positionLength = positions.length / 3;
  const shapeCount = positionLength / shapeLength;
  const indices = IndexDatatype.createTypedArray(
    vertexCount,
    2 * shapeLength * (shapeCount + 1),
  );
  let i, j;
  let index = 0;
  i = 0;
  let offset = i * shapeLength;
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
    const firstOffset = shapeLength * i;
    const secondOffset = firstOffset + shapeLength;
    for (j = 0; j < shapeLength; j++) {
      indices[index++] = j + firstOffset;
      indices[index++] = j + secondOffset;
    }
  }

  const geometry = new Geometry({
    attributes: attributes,
    indices: IndexDatatype.createTypedArray(vertexCount, indices),
    boundingSphere: BoundingSphere.fromVertices(positions),
    primitiveType: PrimitiveType.LINES,
  });

  return geometry;
}

/**
 * A description of a polyline with a volume (a 2D shape extruded along a polyline).
 *
 * @alias PolylineVolumeOutlineGeometry
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Cartesian3[]} options.polylinePositions An array of positions that define the center of the polyline volume.
 * @param {Cartesian2[]} options.shapePositions An array of positions that define the shape to be extruded along the polyline
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid to be used as a reference.
 * @param {number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
 * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
 *
 * @see PolylineVolumeOutlineGeometry#createGeometry
 *
 * @example
 * function computeCircle(radius) {
 *   const positions = [];
 *   for (let i = 0; i < 360; i++) {
 *     const radians = Cesium.Math.toRadians(i);
 *     positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
 *   }
 *   return positions;
 * }
 *
 * const volumeOutline = new Cesium.PolylineVolumeOutlineGeometry({
 *   polylinePositions : Cesium.Cartesian3.fromDegreesArray([
 *     -72.0, 40.0,
 *     -70.0, 35.0
 *   ]),
 *   shapePositions : computeCircle(100000.0)
 * });
 */
function PolylineVolumeOutlineGeometry(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const positions = options.polylinePositions;
  const shape = options.shapePositions;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(positions)) {
    throw new DeveloperError("options.polylinePositions is required.");
  }
  if (!defined(shape)) {
    throw new DeveloperError("options.shapePositions is required.");
  }
  //>>includeEnd('debug');

  this._positions = positions;
  this._shape = shape;
  this._ellipsoid = Ellipsoid.clone(options.ellipsoid ?? Ellipsoid.default);
  this._cornerType = options.cornerType ?? CornerType.ROUNDED;
  this._granularity = options.granularity ?? CesiumMath.RADIANS_PER_DEGREE;
  this._workerName = "createPolylineVolumeOutlineGeometry";

  let numComponents = 1 + positions.length * Cartesian3.packedLength;
  numComponents += 1 + shape.length * Cartesian2.packedLength;

  /**
   * The number of elements used to pack the object into an array.
   * @type {number}
   */
  this.packedLength = numComponents + Ellipsoid.packedLength + 2;
}

/**
 * Stores the provided instance into the provided array.
 *
 * @param {PolylineVolumeOutlineGeometry} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
PolylineVolumeOutlineGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required");
  }
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = startingIndex ?? 0;

  let i;

  const positions = value._positions;
  let length = positions.length;
  array[startingIndex++] = length;

  for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    Cartesian3.pack(positions[i], array, startingIndex);
  }

  const shape = value._shape;
  length = shape.length;
  array[startingIndex++] = length;

  for (i = 0; i < length; ++i, startingIndex += Cartesian2.packedLength) {
    Cartesian2.pack(shape[i], array, startingIndex);
  }

  Ellipsoid.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid.packedLength;

  array[startingIndex++] = value._cornerType;
  array[startingIndex] = value._granularity;

  return array;
};

const scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
const scratchOptions = {
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
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {PolylineVolumeOutlineGeometry} [result] The object into which to store the result.
 * @returns {PolylineVolumeOutlineGeometry} The modified result parameter or a new PolylineVolumeOutlineGeometry instance if one was not provided.
 */
PolylineVolumeOutlineGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = startingIndex ?? 0;

  let i;

  let length = array[startingIndex++];
  const positions = new Array(length);

  for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
    positions[i] = Cartesian3.unpack(array, startingIndex);
  }

  length = array[startingIndex++];
  const shape = new Array(length);

  for (i = 0; i < length; ++i, startingIndex += Cartesian2.packedLength) {
    shape[i] = Cartesian2.unpack(array, startingIndex);
  }

  const ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid.packedLength;

  const cornerType = array[startingIndex++];
  const granularity = array[startingIndex];

  if (!defined(result)) {
    scratchOptions.polylinePositions = positions;
    scratchOptions.shapePositions = shape;
    scratchOptions.cornerType = cornerType;
    scratchOptions.granularity = granularity;
    return new PolylineVolumeOutlineGeometry(scratchOptions);
  }

  result._positions = positions;
  result._shape = shape;
  result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
  result._cornerType = cornerType;
  result._granularity = granularity;

  return result;
};

const brScratch = new BoundingRectangle();

/**
 * Computes the geometric representation of the outline of a polyline with a volume, including its vertices, indices, and a bounding sphere.
 *
 * @param {PolylineVolumeOutlineGeometry} polylineVolumeOutlineGeometry A description of the polyline volume outline.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
PolylineVolumeOutlineGeometry.createGeometry = function (
  polylineVolumeOutlineGeometry,
) {
  const positions = polylineVolumeOutlineGeometry._positions;
  const cleanPositions = arrayRemoveDuplicates(
    positions,
    Cartesian3.equalsEpsilon,
  );
  let shape2D = polylineVolumeOutlineGeometry._shape;
  shape2D = PolylineVolumeGeometryLibrary.removeDuplicatesFromShape(shape2D);

  if (cleanPositions.length < 2 || shape2D.length < 3) {
    return undefined;
  }

  if (
    PolygonPipeline.computeWindingOrder2D(shape2D) === WindingOrder.CLOCKWISE
  ) {
    shape2D.reverse();
  }
  const boundingRectangle = BoundingRectangle.fromPoints(shape2D, brScratch);

  const computedPositions = PolylineVolumeGeometryLibrary.computePositions(
    cleanPositions,
    shape2D,
    boundingRectangle,
    polylineVolumeOutlineGeometry,
    false,
  );
  return computeAttributes(computedPositions, shape2D);
};
export default PolylineVolumeOutlineGeometry;
