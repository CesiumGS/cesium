import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import FrustumGeometry from "./FrustumGeometry.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import OrthographicFrustum from "./OrthographicFrustum.js";
import PerspectiveFrustum from "./PerspectiveFrustum.js";
import PrimitiveType from "./PrimitiveType.js";
import Quaternion from "./Quaternion.js";

const PERSPECTIVE = 0;
const ORTHOGRAPHIC = 1;

/**
 * A description of the outline of a frustum with the given the origin and orientation.
 *
 * @alias FrustumOutlineGeometry
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {PerspectiveFrustum|OrthographicFrustum} options.frustum The frustum.
 * @param {Cartesian3} options.origin The origin of the frustum.
 * @param {Quaternion} options.orientation The orientation of the frustum.
 */
function FrustumOutlineGeometry(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.object("options.frustum", options.frustum);
  Check.typeOf.object("options.origin", options.origin);
  Check.typeOf.object("options.orientation", options.orientation);
  //>>includeEnd('debug');

  const frustum = options.frustum;
  const orientation = options.orientation;
  const origin = options.origin;

  // This is private because it is used by DebugCameraPrimitive to draw a multi-frustum by
  // creating multiple FrustumOutlineGeometrys. This way the near plane of one frustum doesn't overlap
  // the far plane of another.
  const drawNearPlane = defaultValue(options._drawNearPlane, true);

  let frustumType;
  let frustumPackedLength;
  if (frustum instanceof PerspectiveFrustum) {
    frustumType = PERSPECTIVE;
    frustumPackedLength = PerspectiveFrustum.packedLength;
  } else if (frustum instanceof OrthographicFrustum) {
    frustumType = ORTHOGRAPHIC;
    frustumPackedLength = OrthographicFrustum.packedLength;
  }

  this._frustumType = frustumType;
  this._frustum = frustum.clone();
  this._origin = Cartesian3.clone(origin);
  this._orientation = Quaternion.clone(orientation);
  this._drawNearPlane = drawNearPlane;
  this._workerName = "createFrustumOutlineGeometry";

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  this.packedLength =
    2 + frustumPackedLength + Cartesian3.packedLength + Quaternion.packedLength;
}

/**
 * Stores the provided instance into the provided array.
 *
 * @param {FrustumOutlineGeometry} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
FrustumOutlineGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  const frustumType = value._frustumType;
  const frustum = value._frustum;

  array[startingIndex++] = frustumType;

  if (frustumType === PERSPECTIVE) {
    PerspectiveFrustum.pack(frustum, array, startingIndex);
    startingIndex += PerspectiveFrustum.packedLength;
  } else {
    OrthographicFrustum.pack(frustum, array, startingIndex);
    startingIndex += OrthographicFrustum.packedLength;
  }

  Cartesian3.pack(value._origin, array, startingIndex);
  startingIndex += Cartesian3.packedLength;
  Quaternion.pack(value._orientation, array, startingIndex);
  startingIndex += Quaternion.packedLength;
  array[startingIndex] = value._drawNearPlane ? 1.0 : 0.0;

  return array;
};

const scratchPackPerspective = new PerspectiveFrustum();
const scratchPackOrthographic = new OrthographicFrustum();
const scratchPackQuaternion = new Quaternion();
const scratchPackorigin = new Cartesian3();

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {FrustumOutlineGeometry} [result] The object into which to store the result.
 */
FrustumOutlineGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  const frustumType = array[startingIndex++];

  let frustum;
  if (frustumType === PERSPECTIVE) {
    frustum = PerspectiveFrustum.unpack(
      array,
      startingIndex,
      scratchPackPerspective
    );
    startingIndex += PerspectiveFrustum.packedLength;
  } else {
    frustum = OrthographicFrustum.unpack(
      array,
      startingIndex,
      scratchPackOrthographic
    );
    startingIndex += OrthographicFrustum.packedLength;
  }

  const origin = Cartesian3.unpack(array, startingIndex, scratchPackorigin);
  startingIndex += Cartesian3.packedLength;
  const orientation = Quaternion.unpack(
    array,
    startingIndex,
    scratchPackQuaternion
  );
  startingIndex += Quaternion.packedLength;
  const drawNearPlane = array[startingIndex] === 1.0;

  if (!defined(result)) {
    return new FrustumOutlineGeometry({
      frustum: frustum,
      origin: origin,
      orientation: orientation,
      _drawNearPlane: drawNearPlane,
    });
  }

  const frustumResult =
    frustumType === result._frustumType ? result._frustum : undefined;
  result._frustum = frustum.clone(frustumResult);

  result._frustumType = frustumType;
  result._origin = Cartesian3.clone(origin, result._origin);
  result._orientation = Quaternion.clone(orientation, result._orientation);
  result._drawNearPlane = drawNearPlane;

  return result;
};

/**
 * Computes the geometric representation of a frustum outline, including its vertices, indices, and a bounding sphere.
 *
 * @param {FrustumOutlineGeometry} frustumGeometry A description of the frustum.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
FrustumOutlineGeometry.createGeometry = function (frustumGeometry) {
  const frustumType = frustumGeometry._frustumType;
  const frustum = frustumGeometry._frustum;
  const origin = frustumGeometry._origin;
  const orientation = frustumGeometry._orientation;
  const drawNearPlane = frustumGeometry._drawNearPlane;

  const positions = new Float64Array(3 * 4 * 2);
  FrustumGeometry._computeNearFarPlanes(
    origin,
    orientation,
    frustumType,
    frustum,
    positions
  );

  const attributes = new GeometryAttributes({
    position: new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    }),
  });

  let offset;
  let index;

  const numberOfPlanes = drawNearPlane ? 2 : 1;
  const indices = new Uint16Array(8 * (numberOfPlanes + 1));

  // Build the near/far planes
  let i = drawNearPlane ? 0 : 1;
  for (; i < 2; ++i) {
    offset = drawNearPlane ? i * 8 : 0;
    index = i * 4;

    indices[offset] = index;
    indices[offset + 1] = index + 1;
    indices[offset + 2] = index + 1;
    indices[offset + 3] = index + 2;
    indices[offset + 4] = index + 2;
    indices[offset + 5] = index + 3;
    indices[offset + 6] = index + 3;
    indices[offset + 7] = index;
  }

  // Build the sides of the frustums
  for (i = 0; i < 2; ++i) {
    offset = (numberOfPlanes + i) * 8;
    index = i * 4;

    indices[offset] = index;
    indices[offset + 1] = index + 4;
    indices[offset + 2] = index + 1;
    indices[offset + 3] = index + 5;
    indices[offset + 4] = index + 2;
    indices[offset + 5] = index + 6;
    indices[offset + 6] = index + 3;
    indices[offset + 7] = index + 7;
  }

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.LINES,
    boundingSphere: BoundingSphere.fromVertices(positions),
  });
};
export default FrustumOutlineGeometry;
