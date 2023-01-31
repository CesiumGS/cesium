import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Check from "./Check.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import Matrix3 from "./Matrix3.js";
import Matrix4 from "./Matrix4.js";
import OrthographicFrustum from "./OrthographicFrustum.js";
import PerspectiveFrustum from "./PerspectiveFrustum.js";
import PrimitiveType from "./PrimitiveType.js";
import Quaternion from "./Quaternion.js";
import VertexFormat from "./VertexFormat.js";

var PERSPECTIVE = 0;
var ORTHOGRAPHIC = 1;

/**
 * Describes a frustum at the given the origin and orientation.
 *
 * @alias FrustumGeometry
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {PerspectiveFrustum|OrthographicFrustum} options.frustum The frustum.
 * @param {Cartesian3} options.origin The origin of the frustum.
 * @param {Quaternion} options.orientation The orientation of the frustum.
 * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
 */
function FrustumGeometry(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.object("options.frustum", options.frustum);
  Check.typeOf.object("options.origin", options.origin);
  Check.typeOf.object("options.orientation", options.orientation);
  //>>includeEnd('debug');

  var frustum = options.frustum;
  var orientation = options.orientation;
  var origin = options.origin;
  var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

  // This is private because it is used by DebugCameraPrimitive to draw a multi-frustum by
  // creating multiple FrustumGeometrys. This way the near plane of one frustum doesn't overlap
  // the far plane of another.
  var drawNearPlane = defaultValue(options._drawNearPlane, true);

  var frustumType;
  var frustumPackedLength;
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
  this._vertexFormat = vertexFormat;
  this._workerName = "createFrustumGeometry";

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  this.packedLength =
    2 +
    frustumPackedLength +
    Cartesian3.packedLength +
    Quaternion.packedLength +
    VertexFormat.packedLength;
}

/**
 * Stores the provided instance into the provided array.
 *
 * @param {FrustumGeometry} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
FrustumGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  var frustumType = value._frustumType;
  var frustum = value._frustum;

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
  VertexFormat.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat.packedLength;
  array[startingIndex] = value._drawNearPlane ? 1.0 : 0.0;

  return array;
};

var scratchPackPerspective = new PerspectiveFrustum();
var scratchPackOrthographic = new OrthographicFrustum();
var scratchPackQuaternion = new Quaternion();
var scratchPackorigin = new Cartesian3();
var scratchVertexFormat = new VertexFormat();

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {FrustumGeometry} [result] The object into which to store the result.
 */
FrustumGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  var frustumType = array[startingIndex++];

  var frustum;
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

  var origin = Cartesian3.unpack(array, startingIndex, scratchPackorigin);
  startingIndex += Cartesian3.packedLength;
  var orientation = Quaternion.unpack(
    array,
    startingIndex,
    scratchPackQuaternion
  );
  startingIndex += Quaternion.packedLength;
  var vertexFormat = VertexFormat.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat.packedLength;
  var drawNearPlane = array[startingIndex] === 1.0;

  if (!defined(result)) {
    return new FrustumGeometry({
      frustum: frustum,
      origin: origin,
      orientation: orientation,
      vertexFormat: vertexFormat,
      _drawNearPlane: drawNearPlane,
    });
  }

  var frustumResult =
    frustumType === result._frustumType ? result._frustum : undefined;
  result._frustum = frustum.clone(frustumResult);

  result._frustumType = frustumType;
  result._origin = Cartesian3.clone(origin, result._origin);
  result._orientation = Quaternion.clone(orientation, result._orientation);
  result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
  result._drawNearPlane = drawNearPlane;

  return result;
};

function getAttributes(
  offset,
  normals,
  tangents,
  bitangents,
  st,
  normal,
  tangent,
  bitangent
) {
  var stOffset = (offset / 3) * 2;

  for (var i = 0; i < 4; ++i) {
    if (defined(normals)) {
      normals[offset] = normal.x;
      normals[offset + 1] = normal.y;
      normals[offset + 2] = normal.z;
    }
    if (defined(tangents)) {
      tangents[offset] = tangent.x;
      tangents[offset + 1] = tangent.y;
      tangents[offset + 2] = tangent.z;
    }
    if (defined(bitangents)) {
      bitangents[offset] = bitangent.x;
      bitangents[offset + 1] = bitangent.y;
      bitangents[offset + 2] = bitangent.z;
    }
    offset += 3;
  }

  st[stOffset] = 0.0;
  st[stOffset + 1] = 0.0;
  st[stOffset + 2] = 1.0;
  st[stOffset + 3] = 0.0;
  st[stOffset + 4] = 1.0;
  st[stOffset + 5] = 1.0;
  st[stOffset + 6] = 0.0;
  st[stOffset + 7] = 1.0;
}

var scratchRotationMatrix = new Matrix3();
var scratchViewMatrix = new Matrix4();
var scratchInverseMatrix = new Matrix4();

var scratchXDirection = new Cartesian3();
var scratchYDirection = new Cartesian3();
var scratchZDirection = new Cartesian3();
var scratchNegativeX = new Cartesian3();
var scratchNegativeY = new Cartesian3();
var scratchNegativeZ = new Cartesian3();

var frustumSplits = new Array(3);

var frustumCornersNDC = new Array(4);
frustumCornersNDC[0] = new Cartesian4(-1.0, -1.0, 1.0, 1.0);
frustumCornersNDC[1] = new Cartesian4(1.0, -1.0, 1.0, 1.0);
frustumCornersNDC[2] = new Cartesian4(1.0, 1.0, 1.0, 1.0);
frustumCornersNDC[3] = new Cartesian4(-1.0, 1.0, 1.0, 1.0);

var scratchFrustumCorners = new Array(4);
for (var i = 0; i < 4; ++i) {
  scratchFrustumCorners[i] = new Cartesian4();
}

FrustumGeometry._computeNearFarPlanes = function (
  origin,
  orientation,
  frustumType,
  frustum,
  positions,
  xDirection,
  yDirection,
  zDirection
) {
  var rotationMatrix = Matrix3.fromQuaternion(
    orientation,
    scratchRotationMatrix
  );
  var x = defaultValue(xDirection, scratchXDirection);
  var y = defaultValue(yDirection, scratchYDirection);
  var z = defaultValue(zDirection, scratchZDirection);

  x = Matrix3.getColumn(rotationMatrix, 0, x);
  y = Matrix3.getColumn(rotationMatrix, 1, y);
  z = Matrix3.getColumn(rotationMatrix, 2, z);

  Cartesian3.normalize(x, x);
  Cartesian3.normalize(y, y);
  Cartesian3.normalize(z, z);

  Cartesian3.negate(x, x);

  var view = Matrix4.computeView(origin, z, y, x, scratchViewMatrix);

  var inverseView;
  var inverseViewProjection;
  if (frustumType === PERSPECTIVE) {
    var projection = frustum.projectionMatrix;
    var viewProjection = Matrix4.multiply(
      projection,
      view,
      scratchInverseMatrix
    );
    inverseViewProjection = Matrix4.inverse(
      viewProjection,
      scratchInverseMatrix
    );
  } else {
    inverseView = Matrix4.inverseTransformation(view, scratchInverseMatrix);
  }

  if (defined(inverseViewProjection)) {
    frustumSplits[0] = frustum.near;
    frustumSplits[1] = frustum.far;
  } else {
    frustumSplits[0] = 0.0;
    frustumSplits[1] = frustum.near;
    frustumSplits[2] = frustum.far;
  }

  for (var i = 0; i < 2; ++i) {
    for (var j = 0; j < 4; ++j) {
      var corner = Cartesian4.clone(
        frustumCornersNDC[j],
        scratchFrustumCorners[j]
      );

      if (!defined(inverseViewProjection)) {
        if (defined(frustum._offCenterFrustum)) {
          frustum = frustum._offCenterFrustum;
        }

        var near = frustumSplits[i];
        var far = frustumSplits[i + 1];

        corner.x =
          (corner.x * (frustum.right - frustum.left) +
            frustum.left +
            frustum.right) *
          0.5;
        corner.y =
          (corner.y * (frustum.top - frustum.bottom) +
            frustum.bottom +
            frustum.top) *
          0.5;
        corner.z = (corner.z * (near - far) - near - far) * 0.5;
        corner.w = 1.0;

        Matrix4.multiplyByVector(inverseView, corner, corner);
      } else {
        corner = Matrix4.multiplyByVector(
          inverseViewProjection,
          corner,
          corner
        );

        // Reverse perspective divide
        var w = 1.0 / corner.w;
        Cartesian3.multiplyByScalar(corner, w, corner);

        Cartesian3.subtract(corner, origin, corner);
        Cartesian3.normalize(corner, corner);

        var fac = Cartesian3.dot(z, corner);
        Cartesian3.multiplyByScalar(corner, frustumSplits[i] / fac, corner);
        Cartesian3.add(corner, origin, corner);
      }

      positions[12 * i + j * 3] = corner.x;
      positions[12 * i + j * 3 + 1] = corner.y;
      positions[12 * i + j * 3 + 2] = corner.z;
    }
  }
};

/**
 * Computes the geometric representation of a frustum, including its vertices, indices, and a bounding sphere.
 *
 * @param {FrustumGeometry} frustumGeometry A description of the frustum.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
FrustumGeometry.createGeometry = function (frustumGeometry) {
  var frustumType = frustumGeometry._frustumType;
  var frustum = frustumGeometry._frustum;
  var origin = frustumGeometry._origin;
  var orientation = frustumGeometry._orientation;
  var drawNearPlane = frustumGeometry._drawNearPlane;
  var vertexFormat = frustumGeometry._vertexFormat;

  var numberOfPlanes = drawNearPlane ? 6 : 5;
  var positions = new Float64Array(3 * 4 * 6);
  FrustumGeometry._computeNearFarPlanes(
    origin,
    orientation,
    frustumType,
    frustum,
    positions
  );

  // -x plane
  var offset = 3 * 4 * 2;
  positions[offset] = positions[3 * 4];
  positions[offset + 1] = positions[3 * 4 + 1];
  positions[offset + 2] = positions[3 * 4 + 2];
  positions[offset + 3] = positions[0];
  positions[offset + 4] = positions[1];
  positions[offset + 5] = positions[2];
  positions[offset + 6] = positions[3 * 3];
  positions[offset + 7] = positions[3 * 3 + 1];
  positions[offset + 8] = positions[3 * 3 + 2];
  positions[offset + 9] = positions[3 * 7];
  positions[offset + 10] = positions[3 * 7 + 1];
  positions[offset + 11] = positions[3 * 7 + 2];

  // -y plane
  offset += 3 * 4;
  positions[offset] = positions[3 * 5];
  positions[offset + 1] = positions[3 * 5 + 1];
  positions[offset + 2] = positions[3 * 5 + 2];
  positions[offset + 3] = positions[3];
  positions[offset + 4] = positions[3 + 1];
  positions[offset + 5] = positions[3 + 2];
  positions[offset + 6] = positions[0];
  positions[offset + 7] = positions[1];
  positions[offset + 8] = positions[2];
  positions[offset + 9] = positions[3 * 4];
  positions[offset + 10] = positions[3 * 4 + 1];
  positions[offset + 11] = positions[3 * 4 + 2];

  // +x plane
  offset += 3 * 4;
  positions[offset] = positions[3];
  positions[offset + 1] = positions[3 + 1];
  positions[offset + 2] = positions[3 + 2];
  positions[offset + 3] = positions[3 * 5];
  positions[offset + 4] = positions[3 * 5 + 1];
  positions[offset + 5] = positions[3 * 5 + 2];
  positions[offset + 6] = positions[3 * 6];
  positions[offset + 7] = positions[3 * 6 + 1];
  positions[offset + 8] = positions[3 * 6 + 2];
  positions[offset + 9] = positions[3 * 2];
  positions[offset + 10] = positions[3 * 2 + 1];
  positions[offset + 11] = positions[3 * 2 + 2];

  // +y plane
  offset += 3 * 4;
  positions[offset] = positions[3 * 2];
  positions[offset + 1] = positions[3 * 2 + 1];
  positions[offset + 2] = positions[3 * 2 + 2];
  positions[offset + 3] = positions[3 * 6];
  positions[offset + 4] = positions[3 * 6 + 1];
  positions[offset + 5] = positions[3 * 6 + 2];
  positions[offset + 6] = positions[3 * 7];
  positions[offset + 7] = positions[3 * 7 + 1];
  positions[offset + 8] = positions[3 * 7 + 2];
  positions[offset + 9] = positions[3 * 3];
  positions[offset + 10] = positions[3 * 3 + 1];
  positions[offset + 11] = positions[3 * 3 + 2];

  if (!drawNearPlane) {
    positions = positions.subarray(3 * 4);
  }

  var attributes = new GeometryAttributes({
    position: new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    }),
  });

  if (
    defined(vertexFormat.normal) ||
    defined(vertexFormat.tangent) ||
    defined(vertexFormat.bitangent) ||
    defined(vertexFormat.st)
  ) {
    var normals = defined(vertexFormat.normal)
      ? new Float32Array(3 * 4 * numberOfPlanes)
      : undefined;
    var tangents = defined(vertexFormat.tangent)
      ? new Float32Array(3 * 4 * numberOfPlanes)
      : undefined;
    var bitangents = defined(vertexFormat.bitangent)
      ? new Float32Array(3 * 4 * numberOfPlanes)
      : undefined;
    var st = defined(vertexFormat.st)
      ? new Float32Array(2 * 4 * numberOfPlanes)
      : undefined;

    var x = scratchXDirection;
    var y = scratchYDirection;
    var z = scratchZDirection;

    var negativeX = Cartesian3.negate(x, scratchNegativeX);
    var negativeY = Cartesian3.negate(y, scratchNegativeY);
    var negativeZ = Cartesian3.negate(z, scratchNegativeZ);

    offset = 0;
    if (drawNearPlane) {
      getAttributes(offset, normals, tangents, bitangents, st, negativeZ, x, y); // near
      offset += 3 * 4;
    }
    getAttributes(offset, normals, tangents, bitangents, st, z, negativeX, y); // far
    offset += 3 * 4;
    getAttributes(
      offset,
      normals,
      tangents,
      bitangents,
      st,
      negativeX,
      negativeZ,
      y
    ); // -x
    offset += 3 * 4;
    getAttributes(
      offset,
      normals,
      tangents,
      bitangents,
      st,
      negativeY,
      negativeZ,
      negativeX
    ); // -y
    offset += 3 * 4;
    getAttributes(offset, normals, tangents, bitangents, st, x, z, y); // +x
    offset += 3 * 4;
    getAttributes(offset, normals, tangents, bitangents, st, y, z, negativeX); // +y

    if (defined(normals)) {
      attributes.normal = new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: normals,
      });
    }
    if (defined(tangents)) {
      attributes.tangent = new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: tangents,
      });
    }
    if (defined(bitangents)) {
      attributes.bitangent = new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: bitangents,
      });
    }
    if (defined(st)) {
      attributes.st = new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: st,
      });
    }
  }

  var indices = new Uint16Array(6 * numberOfPlanes);
  for (var i = 0; i < numberOfPlanes; ++i) {
    var indexOffset = i * 6;
    var index = i * 4;

    indices[indexOffset] = index;
    indices[indexOffset + 1] = index + 1;
    indices[indexOffset + 2] = index + 2;
    indices[indexOffset + 3] = index;
    indices[indexOffset + 4] = index + 2;
    indices[indexOffset + 5] = index + 3;
  }

  return new Geometry({
    attributes: attributes,
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
    boundingSphere: BoundingSphere.fromVertices(positions),
  });
};
export default FrustumGeometry;
