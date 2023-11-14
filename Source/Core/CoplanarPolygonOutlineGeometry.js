import arrayRemoveDuplicates from "./arrayRemoveDuplicates.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import ComponentDatatype from "./ComponentDatatype.js";
import CoplanarPolygonGeometryLibrary from "./CoplanarPolygonGeometryLibrary.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import GeometryInstance from "./GeometryInstance.js";
import GeometryPipeline from "./GeometryPipeline.js";
import IndexDatatype from "./IndexDatatype.js";
import PolygonGeometryLibrary from "./PolygonGeometryLibrary.js";
import PrimitiveType from "./PrimitiveType.js";

function createGeometryFromPositions(positions) {
  const length = positions.length;
  const flatPositions = new Float64Array(length * 3);
  const indices = IndexDatatype.createTypedArray(length, length * 2);

  let positionIndex = 0;
  let index = 0;

  for (let i = 0; i < length; i++) {
    const position = positions[i];
    flatPositions[positionIndex++] = position.x;
    flatPositions[positionIndex++] = position.y;
    flatPositions[positionIndex++] = position.z;

    indices[index++] = i;
    indices[index++] = (i + 1) % length;
  }

  const attributes = new GeometryAttributes({
    position: new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: flatPositions,
    }),
  });

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.LINES,
  });
}

/**
 * A description of the outline of a polygon composed of arbitrary coplanar positions.
 *
 * @alias CoplanarPolygonOutlineGeometry
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
 *
 * @see CoplanarPolygonOutlineGeometry.createGeometry
 *
 * @example
 * const polygonOutline = new Cesium.CoplanarPolygonOutlineGeometry({
 *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
 *      -90.0, 30.0, 0.0,
 *      -90.0, 30.0, 1000.0,
 *      -80.0, 30.0, 1000.0,
 *      -80.0, 30.0, 0.0
 *   ])
 * });
 * const geometry = Cesium.CoplanarPolygonOutlineGeometry.createGeometry(polygonOutline);
 */
function CoplanarPolygonOutlineGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const polygonHierarchy = options.polygonHierarchy;
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.polygonHierarchy", polygonHierarchy);
  //>>includeEnd('debug');

  this._polygonHierarchy = polygonHierarchy;
  this._workerName = "createCoplanarPolygonOutlineGeometry";

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  this.packedLength =
    PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) + 1;
}

/**
 * A description of a coplanar polygon outline from an array of positions.
 *
 * @param {Object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
 * @returns {CoplanarPolygonOutlineGeometry}
 */
CoplanarPolygonOutlineGeometry.fromPositions = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.positions", options.positions);
  //>>includeEnd('debug');

  const newOptions = {
    polygonHierarchy: {
      positions: options.positions,
    },
  };
  return new CoplanarPolygonOutlineGeometry(newOptions);
};

/**
 * Stores the provided instance into the provided array.
 *
 * @param {CoplanarPolygonOutlineGeometry} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
CoplanarPolygonOutlineGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  startingIndex = PolygonGeometryLibrary.packPolygonHierarchy(
    value._polygonHierarchy,
    array,
    startingIndex
  );

  array[startingIndex] = value.packedLength;

  return array;
};

const scratchOptions = {
  polygonHierarchy: {},
};
/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {CoplanarPolygonOutlineGeometry} [result] The object into which to store the result.
 * @returns {CoplanarPolygonOutlineGeometry} The modified result parameter or a new CoplanarPolygonOutlineGeometry instance if one was not provided.
 */
CoplanarPolygonOutlineGeometry.unpack = function (
  array,
  startingIndex,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  const polygonHierarchy = PolygonGeometryLibrary.unpackPolygonHierarchy(
    array,
    startingIndex
  );
  startingIndex = polygonHierarchy.startingIndex;
  delete polygonHierarchy.startingIndex;
  const packedLength = array[startingIndex];

  if (!defined(result)) {
    result = new CoplanarPolygonOutlineGeometry(scratchOptions);
  }

  result._polygonHierarchy = polygonHierarchy;
  result.packedLength = packedLength;

  return result;
};

/**
 * Computes the geometric representation of an arbitrary coplanar polygon, including its vertices, indices, and a bounding sphere.
 *
 * @param {CoplanarPolygonOutlineGeometry} polygonGeometry A description of the polygon.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
CoplanarPolygonOutlineGeometry.createGeometry = function (polygonGeometry) {
  const polygonHierarchy = polygonGeometry._polygonHierarchy;

  let outerPositions = polygonHierarchy.positions;
  outerPositions = arrayRemoveDuplicates(
    outerPositions,
    Cartesian3.equalsEpsilon,
    true
  );
  if (outerPositions.length < 3) {
    return;
  }
  const isValid = CoplanarPolygonGeometryLibrary.validOutline(outerPositions);
  if (!isValid) {
    return undefined;
  }

  const polygons = PolygonGeometryLibrary.polygonOutlinesFromHierarchy(
    polygonHierarchy,
    false
  );

  if (polygons.length === 0) {
    return undefined;
  }

  const geometries = [];

  for (let i = 0; i < polygons.length; i++) {
    const geometryInstance = new GeometryInstance({
      geometry: createGeometryFromPositions(polygons[i]),
    });
    geometries.push(geometryInstance);
  }

  const geometry = GeometryPipeline.combineInstances(geometries)[0];
  const boundingSphere = BoundingSphere.fromPoints(polygonHierarchy.positions);

  return new Geometry({
    attributes: geometry.attributes,
    indices: geometry.indices,
    primitiveType: geometry.primitiveType,
    boundingSphere: boundingSphere,
  });
};
export default CoplanarPolygonOutlineGeometry;
