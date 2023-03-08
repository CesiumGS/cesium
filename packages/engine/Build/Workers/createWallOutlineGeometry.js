define(['./defaultValue-0a909f67', './Matrix3-315394f6', './Transforms-26539bce', './ComponentDatatype-f7b11d02', './Check-666ab1a0', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './IndexDatatype-a55ceaa1', './Math-2dbd6b93', './WallGeometryLibrary-6167b0fc', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './WebGLConstants-a8cc3e8c', './arrayRemoveDuplicates-c2038105', './PolylinePipeline-d8e6bd9b', './EllipsoidGeodesic-98c62a56', './EllipsoidRhumbLine-19756602', './IntersectionTests-a93d3de9', './Plane-900aa728'], (function (defaultValue, Matrix3, Transforms, ComponentDatatype, Check, GeometryAttribute, GeometryAttributes, IndexDatatype, Math, WallGeometryLibrary, Matrix2, RuntimeError, combine, WebGLConstants, arrayRemoveDuplicates, PolylinePipeline, EllipsoidGeodesic, EllipsoidRhumbLine, IntersectionTests, Plane) { 'use strict';

  const scratchCartesian3Position1 = new Matrix3.Cartesian3();
  const scratchCartesian3Position2 = new Matrix3.Cartesian3();

  /**
   * A description of a wall outline. A wall is defined by a series of points,
   * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
   *
   * @alias WallOutlineGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Number[]} [options.maximumHeights] An array parallel to <code>positions</code> that give the maximum height of the
   *        wall at <code>positions</code>. If undefined, the height of each position in used.
   * @param {Number[]} [options.minimumHeights] An array parallel to <code>positions</code> that give the minimum height of the
   *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
   *
   * @exception {DeveloperError} positions length must be greater than or equal to 2.
   * @exception {DeveloperError} positions and maximumHeights must have the same length.
   * @exception {DeveloperError} positions and minimumHeights must have the same length.
   *
   * @see WallGeometry#createGeometry
   * @see WallGeometry#fromConstantHeight
   *
   * @example
   * // create a wall outline that spans from ground level to 10000 meters
   * const wall = new Cesium.WallOutlineGeometry({
   *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
   *     19.0, 47.0, 10000.0,
   *     19.0, 48.0, 10000.0,
   *     20.0, 48.0, 10000.0,
   *     20.0, 47.0, 10000.0,
   *     19.0, 47.0, 10000.0
   *   ])
   * });
   * const geometry = Cesium.WallOutlineGeometry.createGeometry(wall);
   */
  function WallOutlineGeometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    const wallPositions = options.positions;
    const maximumHeights = options.maximumHeights;
    const minimumHeights = options.minimumHeights;

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(wallPositions)) {
      throw new Check.DeveloperError("options.positions is required.");
    }
    if (
      defaultValue.defined(maximumHeights) &&
      maximumHeights.length !== wallPositions.length
    ) {
      throw new Check.DeveloperError(
        "options.positions and options.maximumHeights must have the same length."
      );
    }
    if (
      defaultValue.defined(minimumHeights) &&
      minimumHeights.length !== wallPositions.length
    ) {
      throw new Check.DeveloperError(
        "options.positions and options.minimumHeights must have the same length."
      );
    }
    //>>includeEnd('debug');

    const granularity = defaultValue.defaultValue(
      options.granularity,
      Math.CesiumMath.RADIANS_PER_DEGREE
    );
    const ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix3.Ellipsoid.WGS84);

    this._positions = wallPositions;
    this._minimumHeights = minimumHeights;
    this._maximumHeights = maximumHeights;
    this._granularity = granularity;
    this._ellipsoid = Matrix3.Ellipsoid.clone(ellipsoid);
    this._workerName = "createWallOutlineGeometry";

    let numComponents = 1 + wallPositions.length * Matrix3.Cartesian3.packedLength + 2;
    if (defaultValue.defined(minimumHeights)) {
      numComponents += minimumHeights.length;
    }
    if (defaultValue.defined(maximumHeights)) {
      numComponents += maximumHeights.length;
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength = numComponents + Matrix3.Ellipsoid.packedLength + 1;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {WallOutlineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  WallOutlineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(value)) {
      throw new Check.DeveloperError("value is required");
    }
    if (!defaultValue.defined(array)) {
      throw new Check.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    let i;

    const positions = value._positions;
    let length = positions.length;
    array[startingIndex++] = length;

    for (i = 0; i < length; ++i, startingIndex += Matrix3.Cartesian3.packedLength) {
      Matrix3.Cartesian3.pack(positions[i], array, startingIndex);
    }

    const minimumHeights = value._minimumHeights;
    length = defaultValue.defined(minimumHeights) ? minimumHeights.length : 0;
    array[startingIndex++] = length;

    if (defaultValue.defined(minimumHeights)) {
      for (i = 0; i < length; ++i) {
        array[startingIndex++] = minimumHeights[i];
      }
    }

    const maximumHeights = value._maximumHeights;
    length = defaultValue.defined(maximumHeights) ? maximumHeights.length : 0;
    array[startingIndex++] = length;

    if (defaultValue.defined(maximumHeights)) {
      for (i = 0; i < length; ++i) {
        array[startingIndex++] = maximumHeights[i];
      }
    }

    Matrix3.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Matrix3.Ellipsoid.packedLength;

    array[startingIndex] = value._granularity;

    return array;
  };

  const scratchEllipsoid = Matrix3.Ellipsoid.clone(Matrix3.Ellipsoid.UNIT_SPHERE);
  const scratchOptions = {
    positions: undefined,
    minimumHeights: undefined,
    maximumHeights: undefined,
    ellipsoid: scratchEllipsoid,
    granularity: undefined,
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {WallOutlineGeometry} [result] The object into which to store the result.
   * @returns {WallOutlineGeometry} The modified result parameter or a new WallOutlineGeometry instance if one was not provided.
   */
  WallOutlineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(array)) {
      throw new Check.DeveloperError("array is required");
    }
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    let i;

    let length = array[startingIndex++];
    const positions = new Array(length);

    for (i = 0; i < length; ++i, startingIndex += Matrix3.Cartesian3.packedLength) {
      positions[i] = Matrix3.Cartesian3.unpack(array, startingIndex);
    }

    length = array[startingIndex++];
    let minimumHeights;

    if (length > 0) {
      minimumHeights = new Array(length);
      for (i = 0; i < length; ++i) {
        minimumHeights[i] = array[startingIndex++];
      }
    }

    length = array[startingIndex++];
    let maximumHeights;

    if (length > 0) {
      maximumHeights = new Array(length);
      for (i = 0; i < length; ++i) {
        maximumHeights[i] = array[startingIndex++];
      }
    }

    const ellipsoid = Matrix3.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Matrix3.Ellipsoid.packedLength;

    const granularity = array[startingIndex];

    if (!defaultValue.defined(result)) {
      scratchOptions.positions = positions;
      scratchOptions.minimumHeights = minimumHeights;
      scratchOptions.maximumHeights = maximumHeights;
      scratchOptions.granularity = granularity;
      return new WallOutlineGeometry(scratchOptions);
    }

    result._positions = positions;
    result._minimumHeights = minimumHeights;
    result._maximumHeights = maximumHeights;
    result._ellipsoid = Matrix3.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._granularity = granularity;

    return result;
  };

  /**
   * A description of a walloutline. A wall is defined by a series of points,
   * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
   * @param {Number} [options.maximumHeight] A constant that defines the maximum height of the
   *        wall at <code>positions</code>. If undefined, the height of each position in used.
   * @param {Number} [options.minimumHeight] A constant that defines the minimum height of the
   *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
   * @returns {WallOutlineGeometry}
   *
   *
   * @example
   * // create a wall that spans from 10000 meters to 20000 meters
   * const wall = Cesium.WallOutlineGeometry.fromConstantHeights({
   *   positions : Cesium.Cartesian3.fromDegreesArray([
   *     19.0, 47.0,
   *     19.0, 48.0,
   *     20.0, 48.0,
   *     20.0, 47.0,
   *     19.0, 47.0,
   *   ]),
   *   minimumHeight : 20000.0,
   *   maximumHeight : 10000.0
   * });
   * const geometry = Cesium.WallOutlineGeometry.createGeometry(wall);
   *
   * @see WallOutlineGeometry#createGeometry
   */
  WallOutlineGeometry.fromConstantHeights = function (options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);
    const positions = options.positions;

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(positions)) {
      throw new Check.DeveloperError("options.positions is required.");
    }
    //>>includeEnd('debug');

    let minHeights;
    let maxHeights;

    const min = options.minimumHeight;
    const max = options.maximumHeight;

    const doMin = defaultValue.defined(min);
    const doMax = defaultValue.defined(max);
    if (doMin || doMax) {
      const length = positions.length;
      minHeights = doMin ? new Array(length) : undefined;
      maxHeights = doMax ? new Array(length) : undefined;

      for (let i = 0; i < length; ++i) {
        if (doMin) {
          minHeights[i] = min;
        }

        if (doMax) {
          maxHeights[i] = max;
        }
      }
    }

    const newOptions = {
      positions: positions,
      maximumHeights: maxHeights,
      minimumHeights: minHeights,
      ellipsoid: options.ellipsoid,
    };
    return new WallOutlineGeometry(newOptions);
  };

  /**
   * Computes the geometric representation of a wall outline, including its vertices, indices, and a bounding sphere.
   *
   * @param {WallOutlineGeometry} wallGeometry A description of the wall outline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  WallOutlineGeometry.createGeometry = function (wallGeometry) {
    const wallPositions = wallGeometry._positions;
    const minimumHeights = wallGeometry._minimumHeights;
    const maximumHeights = wallGeometry._maximumHeights;
    const granularity = wallGeometry._granularity;
    const ellipsoid = wallGeometry._ellipsoid;

    const pos = WallGeometryLibrary.WallGeometryLibrary.computePositions(
      ellipsoid,
      wallPositions,
      maximumHeights,
      minimumHeights,
      granularity,
      false
    );
    if (!defaultValue.defined(pos)) {
      return;
    }

    const bottomPositions = pos.bottomPositions;
    const topPositions = pos.topPositions;

    let length = topPositions.length;
    let size = length * 2;

    const positions = new Float64Array(size);
    let positionIndex = 0;

    // add lower and upper points one after the other, lower
    // points being even and upper points being odd
    length /= 3;
    let i;
    for (i = 0; i < length; ++i) {
      const i3 = i * 3;
      const topPosition = Matrix3.Cartesian3.fromArray(
        topPositions,
        i3,
        scratchCartesian3Position1
      );
      const bottomPosition = Matrix3.Cartesian3.fromArray(
        bottomPositions,
        i3,
        scratchCartesian3Position2
      );

      // insert the lower point
      positions[positionIndex++] = bottomPosition.x;
      positions[positionIndex++] = bottomPosition.y;
      positions[positionIndex++] = bottomPosition.z;

      // insert the upper point
      positions[positionIndex++] = topPosition.x;
      positions[positionIndex++] = topPosition.y;
      positions[positionIndex++] = topPosition.z;
    }

    const attributes = new GeometryAttributes.GeometryAttributes({
      position: new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: positions,
      }),
    });

    const numVertices = size / 3;
    size = 2 * numVertices - 4 + numVertices;
    const indices = IndexDatatype.IndexDatatype.createTypedArray(numVertices, size);

    let edgeIndex = 0;
    for (i = 0; i < numVertices - 2; i += 2) {
      const LL = i;
      const LR = i + 2;
      const pl = Matrix3.Cartesian3.fromArray(
        positions,
        LL * 3,
        scratchCartesian3Position1
      );
      const pr = Matrix3.Cartesian3.fromArray(
        positions,
        LR * 3,
        scratchCartesian3Position2
      );
      if (Matrix3.Cartesian3.equalsEpsilon(pl, pr, Math.CesiumMath.EPSILON10)) {
        continue;
      }
      const UL = i + 1;
      const UR = i + 3;

      indices[edgeIndex++] = UL;
      indices[edgeIndex++] = LL;
      indices[edgeIndex++] = UL;
      indices[edgeIndex++] = UR;
      indices[edgeIndex++] = LL;
      indices[edgeIndex++] = LR;
    }

    indices[edgeIndex++] = numVertices - 2;
    indices[edgeIndex++] = numVertices - 1;

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.LINES,
      boundingSphere: new Transforms.BoundingSphere.fromVertices(positions),
    });
  };

  function createWallOutlineGeometry(wallGeometry, offset) {
    if (defaultValue.defined(offset)) {
      wallGeometry = WallOutlineGeometry.unpack(wallGeometry, offset);
    }
    wallGeometry._ellipsoid = Matrix3.Ellipsoid.clone(wallGeometry._ellipsoid);
    return WallOutlineGeometry.createGeometry(wallGeometry);
  }

  return createWallOutlineGeometry;

}));
