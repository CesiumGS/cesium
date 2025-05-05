import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import EllipseGeometryLibrary from "./EllipseGeometryLibrary.js";
import Ellipsoid from "./Ellipsoid.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import GeometryOffsetAttribute from "./GeometryOffsetAttribute.js";
import IndexDatatype from "./IndexDatatype.js";
import CesiumMath from "./Math.js";
import PrimitiveType from "./PrimitiveType.js";

const scratchCartesian1 = new Cartesian3();
let boundingSphereCenter = new Cartesian3();

function computeEllipse(options) {
  const center = options.center;
  boundingSphereCenter = Cartesian3.multiplyByScalar(
    options.ellipsoid.geodeticSurfaceNormal(center, boundingSphereCenter),
    options.height,
    boundingSphereCenter,
  );
  boundingSphereCenter = Cartesian3.add(
    center,
    boundingSphereCenter,
    boundingSphereCenter,
  );
  const boundingSphere = new BoundingSphere(
    boundingSphereCenter,
    options.semiMajorAxis,
  );
  const positions = EllipseGeometryLibrary.computeEllipsePositions(
    options,
    false,
    true,
  ).outerPositions;

  const attributes = new GeometryAttributes({
    position: new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: EllipseGeometryLibrary.raisePositionsToHeight(
        positions,
        options,
        false,
      ),
    }),
  });

  const length = positions.length / 3;
  const indices = IndexDatatype.createTypedArray(length, length * 2);
  let index = 0;
  for (let i = 0; i < length; ++i) {
    indices[index++] = i;
    indices[index++] = (i + 1) % length;
  }

  return {
    boundingSphere: boundingSphere,
    attributes: attributes,
    indices: indices,
  };
}

const topBoundingSphere = new BoundingSphere();
const bottomBoundingSphere = new BoundingSphere();
function computeExtrudedEllipse(options) {
  const center = options.center;
  const ellipsoid = options.ellipsoid;
  const semiMajorAxis = options.semiMajorAxis;
  let scaledNormal = Cartesian3.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center, scratchCartesian1),
    options.height,
    scratchCartesian1,
  );
  topBoundingSphere.center = Cartesian3.add(
    center,
    scaledNormal,
    topBoundingSphere.center,
  );
  topBoundingSphere.radius = semiMajorAxis;

  scaledNormal = Cartesian3.multiplyByScalar(
    ellipsoid.geodeticSurfaceNormal(center, scaledNormal),
    options.extrudedHeight,
    scaledNormal,
  );
  bottomBoundingSphere.center = Cartesian3.add(
    center,
    scaledNormal,
    bottomBoundingSphere.center,
  );
  bottomBoundingSphere.radius = semiMajorAxis;

  let positions = EllipseGeometryLibrary.computeEllipsePositions(
    options,
    false,
    true,
  ).outerPositions;
  const attributes = new GeometryAttributes({
    position: new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: EllipseGeometryLibrary.raisePositionsToHeight(
        positions,
        options,
        true,
      ),
    }),
  });

  positions = attributes.position.values;
  const boundingSphere = BoundingSphere.union(
    topBoundingSphere,
    bottomBoundingSphere,
  );
  let length = positions.length / 3;

  if (defined(options.offsetAttribute)) {
    let applyOffset = new Uint8Array(length);
    if (options.offsetAttribute === GeometryOffsetAttribute.TOP) {
      applyOffset = applyOffset.fill(1, 0, length / 2);
    } else {
      const offsetValue =
        options.offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
      applyOffset = applyOffset.fill(offsetValue);
    }

    attributes.applyOffset = new GeometryAttribute({
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset,
    });
  }

  let numberOfVerticalLines = defaultValue(options.numberOfVerticalLines, 16);
  numberOfVerticalLines = CesiumMath.clamp(
    numberOfVerticalLines,
    0,
    length / 2,
  );

  const indices = IndexDatatype.createTypedArray(
    length,
    length * 2 + numberOfVerticalLines * 2,
  );

  length /= 2;
  let index = 0;
  let i;
  for (i = 0; i < length; ++i) {
    indices[index++] = i;
    indices[index++] = (i + 1) % length;
    indices[index++] = i + length;
    indices[index++] = ((i + 1) % length) + length;
  }

  let numSide;
  if (numberOfVerticalLines > 0) {
    const numSideLines = Math.min(numberOfVerticalLines, length);
    numSide = Math.round(length / numSideLines);

    const maxI = Math.min(numSide * numberOfVerticalLines, length);
    for (i = 0; i < maxI; i += numSide) {
      indices[index++] = i;
      indices[index++] = i + length;
    }
  }

  return {
    boundingSphere: boundingSphere,
    attributes: attributes,
    indices: indices,
  };
}

/**
 * A description of the outline of an ellipse on an ellipsoid.
 *
 * @alias EllipseOutlineGeometry
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Cartesian3} options.center The ellipse's center point in the fixed frame.
 * @param {number} options.semiMajorAxis The length of the ellipse's semi-major axis in meters.
 * @param {number} options.semiMinorAxis The length of the ellipse's semi-minor axis in meters.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The ellipsoid the ellipse will be on.
 * @param {number} [options.height=0.0] The distance in meters between the ellipse and the ellipsoid surface.
 * @param {number} [options.extrudedHeight] The distance in meters between the ellipse's extruded face and the ellipsoid surface.
 * @param {number} [options.rotation=0.0] The angle from north (counter-clockwise) in radians.
 * @param {number} [options.granularity=0.02] The angular distance between points on the ellipse in radians.
 * @param {number} [options.numberOfVerticalLines=16] Number of lines to draw between the top and bottom surface of an extruded ellipse.
 *
 * @exception {DeveloperError} semiMajorAxis and semiMinorAxis must be greater than zero.
 * @exception {DeveloperError} semiMajorAxis must be greater than or equal to the semiMinorAxis.
 * @exception {DeveloperError} granularity must be greater than zero.
 *
 * @see EllipseOutlineGeometry.createGeometry
 *
 * @example
 * const ellipse = new Cesium.EllipseOutlineGeometry({
 *   center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
 *   semiMajorAxis : 500000.0,
 *   semiMinorAxis : 300000.0,
 *   rotation : Cesium.Math.toRadians(60.0)
 * });
 * const geometry = Cesium.EllipseOutlineGeometry.createGeometry(ellipse);
 */
function EllipseOutlineGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const center = options.center;
  const ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.default);
  const semiMajorAxis = options.semiMajorAxis;
  const semiMinorAxis = options.semiMinorAxis;
  const granularity = defaultValue(
    options.granularity,
    CesiumMath.RADIANS_PER_DEGREE,
  );

  //>>includeStart('debug', pragmas.debug);
  if (!defined(center)) {
    throw new DeveloperError("center is required.");
  }
  if (!defined(semiMajorAxis)) {
    throw new DeveloperError("semiMajorAxis is required.");
  }
  if (!defined(semiMinorAxis)) {
    throw new DeveloperError("semiMinorAxis is required.");
  }
  if (semiMajorAxis < semiMinorAxis) {
    throw new DeveloperError(
      "semiMajorAxis must be greater than or equal to the semiMinorAxis.",
    );
  }
  if (granularity <= 0.0) {
    throw new DeveloperError("granularity must be greater than zero.");
  }
  //>>includeEnd('debug');

  const height = defaultValue(options.height, 0.0);
  const extrudedHeight = defaultValue(options.extrudedHeight, height);

  this._center = Cartesian3.clone(center);
  this._semiMajorAxis = semiMajorAxis;
  this._semiMinorAxis = semiMinorAxis;
  this._ellipsoid = Ellipsoid.clone(ellipsoid);
  this._rotation = defaultValue(options.rotation, 0.0);
  this._height = Math.max(extrudedHeight, height);
  this._granularity = granularity;
  this._extrudedHeight = Math.min(extrudedHeight, height);
  this._numberOfVerticalLines = Math.max(
    defaultValue(options.numberOfVerticalLines, 16),
    0,
  );
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createEllipseOutlineGeometry";
}

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
EllipseOutlineGeometry.packedLength =
  Cartesian3.packedLength + Ellipsoid.packedLength + 8;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {EllipseOutlineGeometry} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
EllipseOutlineGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required");
  }
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  Cartesian3.pack(value._center, array, startingIndex);
  startingIndex += Cartesian3.packedLength;

  Ellipsoid.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid.packedLength;

  array[startingIndex++] = value._semiMajorAxis;
  array[startingIndex++] = value._semiMinorAxis;
  array[startingIndex++] = value._rotation;
  array[startingIndex++] = value._height;
  array[startingIndex++] = value._granularity;
  array[startingIndex++] = value._extrudedHeight;
  array[startingIndex++] = value._numberOfVerticalLines;
  array[startingIndex] = defaultValue(value._offsetAttribute, -1);

  return array;
};

const scratchCenter = new Cartesian3();
const scratchEllipsoid = new Ellipsoid();
const scratchOptions = {
  center: scratchCenter,
  ellipsoid: scratchEllipsoid,
  semiMajorAxis: undefined,
  semiMinorAxis: undefined,
  rotation: undefined,
  height: undefined,
  granularity: undefined,
  extrudedHeight: undefined,
  numberOfVerticalLines: undefined,
  offsetAttribute: undefined,
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {EllipseOutlineGeometry} [result] The object into which to store the result.
 * @returns {EllipseOutlineGeometry} The modified result parameter or a new EllipseOutlineGeometry instance if one was not provided.
 */
EllipseOutlineGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  const center = Cartesian3.unpack(array, startingIndex, scratchCenter);
  startingIndex += Cartesian3.packedLength;

  const ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid.packedLength;

  const semiMajorAxis = array[startingIndex++];
  const semiMinorAxis = array[startingIndex++];
  const rotation = array[startingIndex++];
  const height = array[startingIndex++];
  const granularity = array[startingIndex++];
  const extrudedHeight = array[startingIndex++];
  const numberOfVerticalLines = array[startingIndex++];
  const offsetAttribute = array[startingIndex];

  if (!defined(result)) {
    scratchOptions.height = height;
    scratchOptions.extrudedHeight = extrudedHeight;
    scratchOptions.granularity = granularity;
    scratchOptions.rotation = rotation;
    scratchOptions.semiMajorAxis = semiMajorAxis;
    scratchOptions.semiMinorAxis = semiMinorAxis;
    scratchOptions.numberOfVerticalLines = numberOfVerticalLines;
    scratchOptions.offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;

    return new EllipseOutlineGeometry(scratchOptions);
  }

  result._center = Cartesian3.clone(center, result._center);
  result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
  result._semiMajorAxis = semiMajorAxis;
  result._semiMinorAxis = semiMinorAxis;
  result._rotation = rotation;
  result._height = height;
  result._granularity = granularity;
  result._extrudedHeight = extrudedHeight;
  result._numberOfVerticalLines = numberOfVerticalLines;
  result._offsetAttribute =
    offsetAttribute === -1 ? undefined : offsetAttribute;

  return result;
};

/**
 * Computes the geometric representation of an outline of an ellipse on an ellipsoid, including its vertices, indices, and a bounding sphere.
 *
 * @param {EllipseOutlineGeometry} ellipseGeometry A description of the ellipse.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
EllipseOutlineGeometry.createGeometry = function (ellipseGeometry) {
  if (
    ellipseGeometry._semiMajorAxis <= 0.0 ||
    ellipseGeometry._semiMinorAxis <= 0.0
  ) {
    return;
  }

  const height = ellipseGeometry._height;
  const extrudedHeight = ellipseGeometry._extrudedHeight;
  const extrude = !CesiumMath.equalsEpsilon(
    height,
    extrudedHeight,
    0,
    CesiumMath.EPSILON2,
  );

  ellipseGeometry._center = ellipseGeometry._ellipsoid.scaleToGeodeticSurface(
    ellipseGeometry._center,
    ellipseGeometry._center,
  );
  const options = {
    center: ellipseGeometry._center,
    semiMajorAxis: ellipseGeometry._semiMajorAxis,
    semiMinorAxis: ellipseGeometry._semiMinorAxis,
    ellipsoid: ellipseGeometry._ellipsoid,
    rotation: ellipseGeometry._rotation,
    height: height,
    granularity: ellipseGeometry._granularity,
    numberOfVerticalLines: ellipseGeometry._numberOfVerticalLines,
  };
  let geometry;
  if (extrude) {
    options.extrudedHeight = extrudedHeight;
    options.offsetAttribute = ellipseGeometry._offsetAttribute;
    geometry = computeExtrudedEllipse(options);
  } else {
    geometry = computeEllipse(options);

    if (defined(ellipseGeometry._offsetAttribute)) {
      const length = geometry.attributes.position.values.length;
      const offsetValue =
        ellipseGeometry._offsetAttribute === GeometryOffsetAttribute.NONE
          ? 0
          : 1;
      const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
      geometry.attributes.applyOffset = new GeometryAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: applyOffset,
      });
    }
  }

  return new Geometry({
    attributes: geometry.attributes,
    indices: geometry.indices,
    primitiveType: PrimitiveType.LINES,
    boundingSphere: geometry.boundingSphere,
    offsetAttribute: ellipseGeometry._offsetAttribute,
  });
};
export default EllipseOutlineGeometry;
