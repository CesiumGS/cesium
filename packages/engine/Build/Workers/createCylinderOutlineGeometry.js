define(['./Transforms-26539bce', './Matrix2-13178034', './Matrix3-315394f6', './Check-666ab1a0', './ComponentDatatype-f7b11d02', './CylinderGeometryLibrary-372c07d8', './defaultValue-0a909f67', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryOffsetAttribute-04332ce7', './IndexDatatype-a55ceaa1', './Math-2dbd6b93', './combine-ca22a614', './RuntimeError-06c93819', './WebGLConstants-a8cc3e8c'], (function (Transforms, Matrix2, Matrix3, Check, ComponentDatatype, CylinderGeometryLibrary, defaultValue, GeometryAttribute, GeometryAttributes, GeometryOffsetAttribute, IndexDatatype, Math$1, combine, RuntimeError, WebGLConstants) { 'use strict';

  const radiusScratch = new Matrix2.Cartesian2();

  /**
   * A description of the outline of a cylinder.
   *
   * @alias CylinderOutlineGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Number} options.length The length of the cylinder.
   * @param {Number} options.topRadius The radius of the top of the cylinder.
   * @param {Number} options.bottomRadius The radius of the bottom of the cylinder.
   * @param {Number} [options.slices=128] The number of edges around the perimeter of the cylinder.
   * @param {Number} [options.numberOfVerticalLines=16] Number of lines to draw between the top and bottom surfaces of the cylinder.
   *
   * @exception {DeveloperError} options.length must be greater than 0.
   * @exception {DeveloperError} options.topRadius must be greater than 0.
   * @exception {DeveloperError} options.bottomRadius must be greater than 0.
   * @exception {DeveloperError} bottomRadius and topRadius cannot both equal 0.
   * @exception {DeveloperError} options.slices must be greater than or equal to 3.
   *
   * @see CylinderOutlineGeometry.createGeometry
   *
   * @example
   * // create cylinder geometry
   * const cylinder = new Cesium.CylinderOutlineGeometry({
   *     length: 200000,
   *     topRadius: 80000,
   *     bottomRadius: 200000,
   * });
   * const geometry = Cesium.CylinderOutlineGeometry.createGeometry(cylinder);
   */
  function CylinderOutlineGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    const length = options.length;
    const topRadius = options.topRadius;
    const bottomRadius = options.bottomRadius;
    const slices = defaultValue.defaultValue(options.slices, 128);
    const numberOfVerticalLines = Math.max(
      defaultValue.defaultValue(options.numberOfVerticalLines, 16),
      0
    );

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("options.positions", length);
    Check.Check.typeOf.number("options.topRadius", topRadius);
    Check.Check.typeOf.number("options.bottomRadius", bottomRadius);
    Check.Check.typeOf.number.greaterThanOrEquals("options.slices", slices, 3);
    if (
      defaultValue.defined(options.offsetAttribute) &&
      options.offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.TOP
    ) {
      throw new Check.DeveloperError(
        "GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry."
      );
    }
    //>>includeEnd('debug');

    this._length = length;
    this._topRadius = topRadius;
    this._bottomRadius = bottomRadius;
    this._slices = slices;
    this._numberOfVerticalLines = numberOfVerticalLines;
    this._offsetAttribute = options.offsetAttribute;
    this._workerName = "createCylinderOutlineGeometry";
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  CylinderOutlineGeometry.packedLength = 6;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {CylinderOutlineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  CylinderOutlineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value._length;
    array[startingIndex++] = value._topRadius;
    array[startingIndex++] = value._bottomRadius;
    array[startingIndex++] = value._slices;
    array[startingIndex++] = value._numberOfVerticalLines;
    array[startingIndex] = defaultValue.defaultValue(value._offsetAttribute, -1);

    return array;
  };

  const scratchOptions = {
    length: undefined,
    topRadius: undefined,
    bottomRadius: undefined,
    slices: undefined,
    numberOfVerticalLines: undefined,
    offsetAttribute: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {CylinderOutlineGeometry} [result] The object into which to store the result.
   * @returns {CylinderOutlineGeometry} The modified result parameter or a new CylinderOutlineGeometry instance if one was not provided.
   */
  CylinderOutlineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const length = array[startingIndex++];
    const topRadius = array[startingIndex++];
    const bottomRadius = array[startingIndex++];
    const slices = array[startingIndex++];
    const numberOfVerticalLines = array[startingIndex++];
    const offsetAttribute = array[startingIndex];

    if (!defaultValue.defined(result)) {
      scratchOptions.length = length;
      scratchOptions.topRadius = topRadius;
      scratchOptions.bottomRadius = bottomRadius;
      scratchOptions.slices = slices;
      scratchOptions.numberOfVerticalLines = numberOfVerticalLines;
      scratchOptions.offsetAttribute =
        offsetAttribute === -1 ? undefined : offsetAttribute;
      return new CylinderOutlineGeometry(scratchOptions);
    }

    result._length = length;
    result._topRadius = topRadius;
    result._bottomRadius = bottomRadius;
    result._slices = slices;
    result._numberOfVerticalLines = numberOfVerticalLines;
    result._offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;

    return result;
  };

  /**
   * Computes the geometric representation of an outline of a cylinder, including its vertices, indices, and a bounding sphere.
   *
   * @param {CylinderOutlineGeometry} cylinderGeometry A description of the cylinder outline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  CylinderOutlineGeometry.createGeometry = function (cylinderGeometry) {
    let length = cylinderGeometry._length;
    const topRadius = cylinderGeometry._topRadius;
    const bottomRadius = cylinderGeometry._bottomRadius;
    const slices = cylinderGeometry._slices;
    const numberOfVerticalLines = cylinderGeometry._numberOfVerticalLines;

    if (
      length <= 0 ||
      topRadius < 0 ||
      bottomRadius < 0 ||
      (topRadius === 0 && bottomRadius === 0)
    ) {
      return;
    }

    const numVertices = slices * 2;

    const positions = CylinderGeometryLibrary.CylinderGeometryLibrary.computePositions(
      length,
      topRadius,
      bottomRadius,
      slices,
      false
    );
    let numIndices = slices * 2;
    let numSide;
    if (numberOfVerticalLines > 0) {
      const numSideLines = Math.min(numberOfVerticalLines, slices);
      numSide = Math.round(slices / numSideLines);
      numIndices += numSideLines;
    }

    const indices = IndexDatatype.IndexDatatype.createTypedArray(numVertices, numIndices * 2);
    let index = 0;
    let i;
    for (i = 0; i < slices - 1; i++) {
      indices[index++] = i;
      indices[index++] = i + 1;
      indices[index++] = i + slices;
      indices[index++] = i + 1 + slices;
    }

    indices[index++] = slices - 1;
    indices[index++] = 0;
    indices[index++] = slices + slices - 1;
    indices[index++] = slices;

    if (numberOfVerticalLines > 0) {
      for (i = 0; i < slices; i += numSide) {
        indices[index++] = i;
        indices[index++] = i + slices;
      }
    }

    const attributes = new GeometryAttributes.GeometryAttributes();
    attributes.position = new GeometryAttribute.GeometryAttribute({
      componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positions,
    });

    radiusScratch.x = length * 0.5;
    radiusScratch.y = Math.max(bottomRadius, topRadius);

    const boundingSphere = new Transforms.BoundingSphere(
      Matrix3.Cartesian3.ZERO,
      Matrix2.Cartesian2.magnitude(radiusScratch)
    );

    if (defaultValue.defined(cylinderGeometry._offsetAttribute)) {
      length = positions.length;
      const offsetValue =
        cylinderGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE
          ? 0
          : 1;
      const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
      attributes.applyOffset = new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: applyOffset,
      });
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.LINES,
      boundingSphere: boundingSphere,
      offsetAttribute: cylinderGeometry._offsetAttribute,
    });
  };

  function createCylinderOutlineGeometry(cylinderGeometry, offset) {
    if (defaultValue.defined(offset)) {
      cylinderGeometry = CylinderOutlineGeometry.unpack(cylinderGeometry, offset);
    }
    return CylinderOutlineGeometry.createGeometry(cylinderGeometry);
  }

  return createCylinderOutlineGeometry;

}));
