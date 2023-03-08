define(['./defaultValue-0a909f67', './Matrix3-315394f6', './Check-666ab1a0', './EllipsoidOutlineGeometry-3e8779bf', './Math-2dbd6b93', './Transforms-26539bce', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './ComponentDatatype-f7b11d02', './WebGLConstants-a8cc3e8c', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryOffsetAttribute-04332ce7', './IndexDatatype-a55ceaa1'], (function (defaultValue, Matrix3, Check, EllipsoidOutlineGeometry, Math, Transforms, Matrix2, RuntimeError, combine, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, GeometryOffsetAttribute, IndexDatatype) { 'use strict';

  /**
   * A description of the outline of a sphere.
   *
   * @alias SphereOutlineGeometry
   * @constructor
   *
   * @param {Object} [options] Object with the following properties:
   * @param {Number} [options.radius=1.0] The radius of the sphere.
   * @param {Number} [options.stackPartitions=10] The count of stacks for the sphere (1 greater than the number of parallel lines).
   * @param {Number} [options.slicePartitions=8] The count of slices for the sphere (Equal to the number of radial lines).
   * @param {Number} [options.subdivisions=200] The number of points per line, determining the granularity of the curvature .
   *
   * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
   * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
   * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
   *
   * @example
   * const sphere = new Cesium.SphereOutlineGeometry({
   *   radius : 100.0,
   *   stackPartitions : 6,
   *   slicePartitions: 5
   * });
   * const geometry = Cesium.SphereOutlineGeometry.createGeometry(sphere);
   */
  function SphereOutlineGeometry(options) {
    const radius = defaultValue.defaultValue(options.radius, 1.0);
    const radii = new Matrix3.Cartesian3(radius, radius, radius);
    const ellipsoidOptions = {
      radii: radii,
      stackPartitions: options.stackPartitions,
      slicePartitions: options.slicePartitions,
      subdivisions: options.subdivisions,
    };

    this._ellipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry(ellipsoidOptions);
    this._workerName = "createSphereOutlineGeometry";
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  SphereOutlineGeometry.packedLength = EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.packedLength;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {SphereOutlineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  SphereOutlineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    //>>includeEnd('debug');

    return EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.pack(
      value._ellipsoidGeometry,
      array,
      startingIndex
    );
  };

  const scratchEllipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry();
  const scratchOptions = {
    radius: undefined,
    radii: new Matrix3.Cartesian3(),
    stackPartitions: undefined,
    slicePartitions: undefined,
    subdivisions: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {SphereOutlineGeometry} [result] The object into which to store the result.
   * @returns {SphereOutlineGeometry} The modified result parameter or a new SphereOutlineGeometry instance if one was not provided.
   */
  SphereOutlineGeometry.unpack = function (array, startingIndex, result) {
    const ellipsoidGeometry = EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.unpack(
      array,
      startingIndex,
      scratchEllipsoidGeometry
    );
    scratchOptions.stackPartitions = ellipsoidGeometry._stackPartitions;
    scratchOptions.slicePartitions = ellipsoidGeometry._slicePartitions;
    scratchOptions.subdivisions = ellipsoidGeometry._subdivisions;

    if (!defaultValue.defined(result)) {
      scratchOptions.radius = ellipsoidGeometry._radii.x;
      return new SphereOutlineGeometry(scratchOptions);
    }

    Matrix3.Cartesian3.clone(ellipsoidGeometry._radii, scratchOptions.radii);
    result._ellipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry(scratchOptions);
    return result;
  };

  /**
   * Computes the geometric representation of an outline of a sphere, including its vertices, indices, and a bounding sphere.
   *
   * @param {SphereOutlineGeometry} sphereGeometry A description of the sphere outline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  SphereOutlineGeometry.createGeometry = function (sphereGeometry) {
    return EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.createGeometry(
      sphereGeometry._ellipsoidGeometry
    );
  };

  function createSphereOutlineGeometry(sphereGeometry, offset) {
    if (defaultValue.defined(offset)) {
      sphereGeometry = SphereOutlineGeometry.unpack(sphereGeometry, offset);
    }
    return SphereOutlineGeometry.createGeometry(sphereGeometry);
  }

  return createSphereOutlineGeometry;

}));
