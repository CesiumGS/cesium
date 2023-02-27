import BoundingSphere from "./BoundingSphere.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import ComponentDatatype from "./ComponentDatatype.js";
import CylinderGeometryLibrary from "./CylinderGeometryLibrary.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import GeometryOffsetAttribute from "./GeometryOffsetAttribute.js";
import IndexDatatype from "./IndexDatatype.js";
import CesiumMath from "./Math.js";
import PrimitiveType from "./PrimitiveType.js";
import VertexFormat from "./VertexFormat.js";

const radiusScratch = new Cartesian2();
const normalScratch = new Cartesian3();
const bitangentScratch = new Cartesian3();
const tangentScratch = new Cartesian3();
const positionScratch = new Cartesian3();

/**
 * A description of a cylinder.
 *
 * @alias CylinderGeometry
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {number} options.length The length of the cylinder.
 * @param {number} options.topRadius The radius of the top of the cylinder.
 * @param {number} options.bottomRadius The radius of the bottom of the cylinder.
 * @param {number} [options.slices=128] The number of edges around the perimeter of the cylinder.
 * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
 *
 * @exception {DeveloperError} options.slices must be greater than or equal to 3.
 *
 * @see CylinderGeometry.createGeometry
 *
 * @example
 * // create cylinder geometry
 * const cylinder = new Cesium.CylinderGeometry({
 *     length: 200000,
 *     topRadius: 80000,
 *     bottomRadius: 200000,
 * });
 * const geometry = Cesium.CylinderGeometry.createGeometry(cylinder);
 */
function CylinderGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const length = options.length;
  const topRadius = options.topRadius;
  const bottomRadius = options.bottomRadius;
  const vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
  const slices = defaultValue(options.slices, 128);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(length)) {
    throw new DeveloperError("options.length must be defined.");
  }
  if (!defined(topRadius)) {
    throw new DeveloperError("options.topRadius must be defined.");
  }
  if (!defined(bottomRadius)) {
    throw new DeveloperError("options.bottomRadius must be defined.");
  }
  if (slices < 3) {
    throw new DeveloperError(
      "options.slices must be greater than or equal to 3."
    );
  }
  if (
    defined(options.offsetAttribute) &&
    options.offsetAttribute === GeometryOffsetAttribute.TOP
  ) {
    throw new DeveloperError(
      "GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry."
    );
  }
  //>>includeEnd('debug');

  this._length = length;
  this._topRadius = topRadius;
  this._bottomRadius = bottomRadius;
  this._vertexFormat = VertexFormat.clone(vertexFormat);
  this._slices = slices;
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createCylinderGeometry";
}

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
CylinderGeometry.packedLength = VertexFormat.packedLength + 5;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {CylinderGeometry} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
CylinderGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required");
  }
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  VertexFormat.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat.packedLength;

  array[startingIndex++] = value._length;
  array[startingIndex++] = value._topRadius;
  array[startingIndex++] = value._bottomRadius;
  array[startingIndex++] = value._slices;
  array[startingIndex] = defaultValue(value._offsetAttribute, -1);

  return array;
};

const scratchVertexFormat = new VertexFormat();
const scratchOptions = {
  vertexFormat: scratchVertexFormat,
  length: undefined,
  topRadius: undefined,
  bottomRadius: undefined,
  slices: undefined,
  offsetAttribute: undefined,
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {CylinderGeometry} [result] The object into which to store the result.
 * @returns {CylinderGeometry} The modified result parameter or a new CylinderGeometry instance if one was not provided.
 */
CylinderGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  const vertexFormat = VertexFormat.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat.packedLength;

  const length = array[startingIndex++];
  const topRadius = array[startingIndex++];
  const bottomRadius = array[startingIndex++];
  const slices = array[startingIndex++];
  const offsetAttribute = array[startingIndex];

  if (!defined(result)) {
    scratchOptions.length = length;
    scratchOptions.topRadius = topRadius;
    scratchOptions.bottomRadius = bottomRadius;
    scratchOptions.slices = slices;
    scratchOptions.offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;
    return new CylinderGeometry(scratchOptions);
  }

  result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
  result._length = length;
  result._topRadius = topRadius;
  result._bottomRadius = bottomRadius;
  result._slices = slices;
  result._offsetAttribute =
    offsetAttribute === -1 ? undefined : offsetAttribute;

  return result;
};

/**
 * Computes the geometric representation of a cylinder, including its vertices, indices, and a bounding sphere.
 *
 * @param {CylinderGeometry} cylinderGeometry A description of the cylinder.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
CylinderGeometry.createGeometry = function (cylinderGeometry) {
  let length = cylinderGeometry._length;
  const topRadius = cylinderGeometry._topRadius;
  const bottomRadius = cylinderGeometry._bottomRadius;
  const vertexFormat = cylinderGeometry._vertexFormat;
  const slices = cylinderGeometry._slices;

  if (
    length <= 0 ||
    topRadius < 0 ||
    bottomRadius < 0 ||
    (topRadius === 0 && bottomRadius === 0)
  ) {
    return;
  }

  const twoSlices = slices + slices;
  const threeSlices = slices + twoSlices;
  const numVertices = twoSlices + twoSlices;

  const positions = CylinderGeometryLibrary.computePositions(
    length,
    topRadius,
    bottomRadius,
    slices,
    true
  );

  const st = vertexFormat.st ? new Float32Array(numVertices * 2) : undefined;
  const normals = vertexFormat.normal
    ? new Float32Array(numVertices * 3)
    : undefined;
  const tangents = vertexFormat.tangent
    ? new Float32Array(numVertices * 3)
    : undefined;
  const bitangents = vertexFormat.bitangent
    ? new Float32Array(numVertices * 3)
    : undefined;

  let i;
  const computeNormal =
    vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent;

  if (computeNormal) {
    const computeTangent = vertexFormat.tangent || vertexFormat.bitangent;

    let normalIndex = 0;
    let tangentIndex = 0;
    let bitangentIndex = 0;

    const theta = Math.atan2(bottomRadius - topRadius, length);
    const normal = normalScratch;
    normal.z = Math.sin(theta);
    const normalScale = Math.cos(theta);
    let tangent = tangentScratch;
    let bitangent = bitangentScratch;

    for (i = 0; i < slices; i++) {
      const angle = (i / slices) * CesiumMath.TWO_PI;
      const x = normalScale * Math.cos(angle);
      const y = normalScale * Math.sin(angle);
      if (computeNormal) {
        normal.x = x;
        normal.y = y;

        if (computeTangent) {
          tangent = Cartesian3.normalize(
            Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent),
            tangent
          );
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
          bitangent = Cartesian3.normalize(
            Cartesian3.cross(normal, tangent, bitangent),
            bitangent
          );
          bitangents[bitangentIndex++] = bitangent.x;
          bitangents[bitangentIndex++] = bitangent.y;
          bitangents[bitangentIndex++] = bitangent.z;
          bitangents[bitangentIndex++] = bitangent.x;
          bitangents[bitangentIndex++] = bitangent.y;
          bitangents[bitangentIndex++] = bitangent.z;
        }
      }
    }

    for (i = 0; i < slices; i++) {
      if (vertexFormat.normal) {
        normals[normalIndex++] = 0;
        normals[normalIndex++] = 0;
        normals[normalIndex++] = -1;
      }
      if (vertexFormat.tangent) {
        tangents[tangentIndex++] = 1;
        tangents[tangentIndex++] = 0;
        tangents[tangentIndex++] = 0;
      }
      if (vertexFormat.bitangent) {
        bitangents[bitangentIndex++] = 0;
        bitangents[bitangentIndex++] = -1;
        bitangents[bitangentIndex++] = 0;
      }
    }

    for (i = 0; i < slices; i++) {
      if (vertexFormat.normal) {
        normals[normalIndex++] = 0;
        normals[normalIndex++] = 0;
        normals[normalIndex++] = 1;
      }
      if (vertexFormat.tangent) {
        tangents[tangentIndex++] = 1;
        tangents[tangentIndex++] = 0;
        tangents[tangentIndex++] = 0;
      }
      if (vertexFormat.bitangent) {
        bitangents[bitangentIndex++] = 0;
        bitangents[bitangentIndex++] = 1;
        bitangents[bitangentIndex++] = 0;
      }
    }
  }

  const numIndices = 12 * slices - 12;
  const indices = IndexDatatype.createTypedArray(numVertices, numIndices);
  let index = 0;
  let j = 0;
  for (i = 0; i < slices - 1; i++) {
    indices[index++] = j;
    indices[index++] = j + 2;
    indices[index++] = j + 3;

    indices[index++] = j;
    indices[index++] = j + 3;
    indices[index++] = j + 1;

    j += 2;
  }

  indices[index++] = twoSlices - 2;
  indices[index++] = 0;
  indices[index++] = 1;
  indices[index++] = twoSlices - 2;
  indices[index++] = 1;
  indices[index++] = twoSlices - 1;

  for (i = 1; i < slices - 1; i++) {
    indices[index++] = twoSlices + i + 1;
    indices[index++] = twoSlices + i;
    indices[index++] = twoSlices;
  }

  for (i = 1; i < slices - 1; i++) {
    indices[index++] = threeSlices;
    indices[index++] = threeSlices + i;
    indices[index++] = threeSlices + i + 1;
  }

  let textureCoordIndex = 0;
  if (vertexFormat.st) {
    const rad = Math.max(topRadius, bottomRadius);
    for (i = 0; i < numVertices; i++) {
      const position = Cartesian3.fromArray(positions, i * 3, positionScratch);
      st[textureCoordIndex++] = (position.x + rad) / (2.0 * rad);
      st[textureCoordIndex++] = (position.y + rad) / (2.0 * rad);
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
      values: st,
    });
  }

  radiusScratch.x = length * 0.5;
  radiusScratch.y = Math.max(bottomRadius, topRadius);

  const boundingSphere = new BoundingSphere(
    Cartesian3.ZERO,
    Cartesian2.magnitude(radiusScratch)
  );

  if (defined(cylinderGeometry._offsetAttribute)) {
    length = positions.length;
    const offsetValue =
      cylinderGeometry._offsetAttribute === GeometryOffsetAttribute.NONE
        ? 0
        : 1;
    const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
    attributes.applyOffset = new GeometryAttribute({
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset,
    });
  }

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
    boundingSphere: boundingSphere,
    offsetAttribute: cylinderGeometry._offsetAttribute,
  });
};

let unitCylinderGeometry;

/**
 * Returns the geometric representation of a unit cylinder, including its vertices, indices, and a bounding sphere.
 * @returns {Geometry} The computed vertices and indices.
 *
 * @private
 */
CylinderGeometry.getUnitCylinder = function () {
  if (!defined(unitCylinderGeometry)) {
    unitCylinderGeometry = CylinderGeometry.createGeometry(
      new CylinderGeometry({
        topRadius: 1.0,
        bottomRadius: 1.0,
        length: 1.0,
        vertexFormat: VertexFormat.POSITION_ONLY,
      })
    );
  }
  return unitCylinderGeometry;
};
export default CylinderGeometry;
