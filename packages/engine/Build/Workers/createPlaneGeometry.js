define(['./defaultValue-0a909f67', './Transforms-26539bce', './Matrix3-315394f6', './Check-666ab1a0', './ComponentDatatype-f7b11d02', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './VertexFormat-6b480673', './Math-2dbd6b93', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './WebGLConstants-a8cc3e8c'], (function (defaultValue, Transforms, Matrix3, Check, ComponentDatatype, GeometryAttribute, GeometryAttributes, VertexFormat, Math$1, Matrix2, RuntimeError, combine, WebGLConstants) { 'use strict';

  /**
   * Describes geometry representing a plane centered at the origin, with a unit width and length.
   *
   * @alias PlaneGeometry
   * @constructor
   *
   * @param {Object} [options] Object with the following properties:
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   *
   * @example
   * const planeGeometry = new Cesium.PlaneGeometry({
   *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY
   * });
   */
  function PlaneGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    const vertexFormat = defaultValue.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT);

    this._vertexFormat = vertexFormat;
    this._workerName = "createPlaneGeometry";
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  PlaneGeometry.packedLength = VertexFormat.VertexFormat.packedLength;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PlaneGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  PlaneGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);

    return array;
  };

  const scratchVertexFormat = new VertexFormat.VertexFormat();
  const scratchOptions = {
    vertexFormat: scratchVertexFormat,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PlaneGeometry} [result] The object into which to store the result.
   * @returns {PlaneGeometry} The modified result parameter or a new PlaneGeometry instance if one was not provided.
   */
  PlaneGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const vertexFormat = VertexFormat.VertexFormat.unpack(
      array,
      startingIndex,
      scratchVertexFormat
    );

    if (!defaultValue.defined(result)) {
      return new PlaneGeometry(scratchOptions);
    }

    result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);

    return result;
  };

  const min = new Matrix3.Cartesian3(-0.5, -0.5, 0.0);
  const max = new Matrix3.Cartesian3(0.5, 0.5, 0.0);

  /**
   * Computes the geometric representation of a plane, including its vertices, indices, and a bounding sphere.
   *
   * @param {PlaneGeometry} planeGeometry A description of the plane.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  PlaneGeometry.createGeometry = function (planeGeometry) {
    const vertexFormat = planeGeometry._vertexFormat;

    const attributes = new GeometryAttributes.GeometryAttributes();
    let indices;
    let positions;

    if (vertexFormat.position) {
      // 4 corner points.  Duplicated 3 times each for each incident edge/face.
      positions = new Float64Array(4 * 3);

      // +z face
      positions[0] = min.x;
      positions[1] = min.y;
      positions[2] = 0.0;
      positions[3] = max.x;
      positions[4] = min.y;
      positions[5] = 0.0;
      positions[6] = max.x;
      positions[7] = max.y;
      positions[8] = 0.0;
      positions[9] = min.x;
      positions[10] = max.y;
      positions[11] = 0.0;

      attributes.position = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: positions,
      });

      if (vertexFormat.normal) {
        const normals = new Float32Array(4 * 3);

        // +z face
        normals[0] = 0.0;
        normals[1] = 0.0;
        normals[2] = 1.0;
        normals[3] = 0.0;
        normals[4] = 0.0;
        normals[5] = 1.0;
        normals[6] = 0.0;
        normals[7] = 0.0;
        normals[8] = 1.0;
        normals[9] = 0.0;
        normals[10] = 0.0;
        normals[11] = 1.0;

        attributes.normal = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: normals,
        });
      }

      if (vertexFormat.st) {
        const texCoords = new Float32Array(4 * 2);

        // +z face
        texCoords[0] = 0.0;
        texCoords[1] = 0.0;
        texCoords[2] = 1.0;
        texCoords[3] = 0.0;
        texCoords[4] = 1.0;
        texCoords[5] = 1.0;
        texCoords[6] = 0.0;
        texCoords[7] = 1.0;

        attributes.st = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: texCoords,
        });
      }

      if (vertexFormat.tangent) {
        const tangents = new Float32Array(4 * 3);

        // +z face
        tangents[0] = 1.0;
        tangents[1] = 0.0;
        tangents[2] = 0.0;
        tangents[3] = 1.0;
        tangents[4] = 0.0;
        tangents[5] = 0.0;
        tangents[6] = 1.0;
        tangents[7] = 0.0;
        tangents[8] = 0.0;
        tangents[9] = 1.0;
        tangents[10] = 0.0;
        tangents[11] = 0.0;

        attributes.tangent = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: tangents,
        });
      }

      if (vertexFormat.bitangent) {
        const bitangents = new Float32Array(4 * 3);

        // +z face
        bitangents[0] = 0.0;
        bitangents[1] = 1.0;
        bitangents[2] = 0.0;
        bitangents[3] = 0.0;
        bitangents[4] = 1.0;
        bitangents[5] = 0.0;
        bitangents[6] = 0.0;
        bitangents[7] = 1.0;
        bitangents[8] = 0.0;
        bitangents[9] = 0.0;
        bitangents[10] = 1.0;
        bitangents[11] = 0.0;

        attributes.bitangent = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: bitangents,
        });
      }

      // 2 triangles
      indices = new Uint16Array(2 * 3);

      // +z face
      indices[0] = 0;
      indices[1] = 1;
      indices[2] = 2;
      indices[3] = 0;
      indices[4] = 2;
      indices[5] = 3;
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      boundingSphere: new Transforms.BoundingSphere(Matrix3.Cartesian3.ZERO, Math.sqrt(2.0)),
    });
  };

  function createPlaneGeometry(planeGeometry, offset) {
    if (defaultValue.defined(offset)) {
      planeGeometry = PlaneGeometry.unpack(planeGeometry, offset);
    }
    return PlaneGeometry.createGeometry(planeGeometry);
  }

  return createPlaneGeometry;

}));
