define(['./defaultValue-0a909f67', './Transforms-26539bce', './Matrix3-315394f6', './Check-666ab1a0', './ComponentDatatype-f7b11d02', './FrustumGeometry-c5754412', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './Math-2dbd6b93', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './WebGLConstants-a8cc3e8c', './Plane-900aa728', './VertexFormat-6b480673'], (function (defaultValue, Transforms, Matrix3, Check, ComponentDatatype, FrustumGeometry, GeometryAttribute, GeometryAttributes, Math, Matrix2, RuntimeError, combine, WebGLConstants, Plane, VertexFormat) { 'use strict';

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
    Check.Check.typeOf.object("options", options);
    Check.Check.typeOf.object("options.frustum", options.frustum);
    Check.Check.typeOf.object("options.origin", options.origin);
    Check.Check.typeOf.object("options.orientation", options.orientation);
    //>>includeEnd('debug');

    const frustum = options.frustum;
    const orientation = options.orientation;
    const origin = options.origin;

    // This is private because it is used by DebugCameraPrimitive to draw a multi-frustum by
    // creating multiple FrustumOutlineGeometrys. This way the near plane of one frustum doesn't overlap
    // the far plane of another.
    const drawNearPlane = defaultValue.defaultValue(options._drawNearPlane, true);

    let frustumType;
    let frustumPackedLength;
    if (frustum instanceof FrustumGeometry.PerspectiveFrustum) {
      frustumType = PERSPECTIVE;
      frustumPackedLength = FrustumGeometry.PerspectiveFrustum.packedLength;
    } else if (frustum instanceof FrustumGeometry.OrthographicFrustum) {
      frustumType = ORTHOGRAPHIC;
      frustumPackedLength = FrustumGeometry.OrthographicFrustum.packedLength;
    }

    this._frustumType = frustumType;
    this._frustum = frustum.clone();
    this._origin = Matrix3.Cartesian3.clone(origin);
    this._orientation = Transforms.Quaternion.clone(orientation);
    this._drawNearPlane = drawNearPlane;
    this._workerName = "createFrustumOutlineGeometry";

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength =
      2 + frustumPackedLength + Matrix3.Cartesian3.packedLength + Transforms.Quaternion.packedLength;
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
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const frustumType = value._frustumType;
    const frustum = value._frustum;

    array[startingIndex++] = frustumType;

    if (frustumType === PERSPECTIVE) {
      FrustumGeometry.PerspectiveFrustum.pack(frustum, array, startingIndex);
      startingIndex += FrustumGeometry.PerspectiveFrustum.packedLength;
    } else {
      FrustumGeometry.OrthographicFrustum.pack(frustum, array, startingIndex);
      startingIndex += FrustumGeometry.OrthographicFrustum.packedLength;
    }

    Matrix3.Cartesian3.pack(value._origin, array, startingIndex);
    startingIndex += Matrix3.Cartesian3.packedLength;
    Transforms.Quaternion.pack(value._orientation, array, startingIndex);
    startingIndex += Transforms.Quaternion.packedLength;
    array[startingIndex] = value._drawNearPlane ? 1.0 : 0.0;

    return array;
  };

  const scratchPackPerspective = new FrustumGeometry.PerspectiveFrustum();
  const scratchPackOrthographic = new FrustumGeometry.OrthographicFrustum();
  const scratchPackQuaternion = new Transforms.Quaternion();
  const scratchPackorigin = new Matrix3.Cartesian3();

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {FrustumOutlineGeometry} [result] The object into which to store the result.
   */
  FrustumOutlineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const frustumType = array[startingIndex++];

    let frustum;
    if (frustumType === PERSPECTIVE) {
      frustum = FrustumGeometry.PerspectiveFrustum.unpack(
        array,
        startingIndex,
        scratchPackPerspective
      );
      startingIndex += FrustumGeometry.PerspectiveFrustum.packedLength;
    } else {
      frustum = FrustumGeometry.OrthographicFrustum.unpack(
        array,
        startingIndex,
        scratchPackOrthographic
      );
      startingIndex += FrustumGeometry.OrthographicFrustum.packedLength;
    }

    const origin = Matrix3.Cartesian3.unpack(array, startingIndex, scratchPackorigin);
    startingIndex += Matrix3.Cartesian3.packedLength;
    const orientation = Transforms.Quaternion.unpack(
      array,
      startingIndex,
      scratchPackQuaternion
    );
    startingIndex += Transforms.Quaternion.packedLength;
    const drawNearPlane = array[startingIndex] === 1.0;

    if (!defaultValue.defined(result)) {
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
    result._origin = Matrix3.Cartesian3.clone(origin, result._origin);
    result._orientation = Transforms.Quaternion.clone(orientation, result._orientation);
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
    FrustumGeometry.FrustumGeometry._computeNearFarPlanes(
      origin,
      orientation,
      frustumType,
      frustum,
      positions
    );

    const attributes = new GeometryAttributes.GeometryAttributes({
      position: new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
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

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.LINES,
      boundingSphere: Transforms.BoundingSphere.fromVertices(positions),
    });
  };

  function createFrustumOutlineGeometry(frustumGeometry, offset) {
    if (defaultValue.defined(offset)) {
      frustumGeometry = FrustumOutlineGeometry.unpack(frustumGeometry, offset);
    }
    return FrustumOutlineGeometry.createGeometry(frustumGeometry);
  }

  return createFrustumOutlineGeometry;

}));
