define(['exports', './Transforms-26539bce', './Matrix2-13178034', './Matrix3-315394f6', './Check-666ab1a0', './defaultValue-0a909f67', './EllipsoidTangentPlane-cfb50678', './Math-2dbd6b93', './Plane-900aa728'], (function (exports, Transforms, Matrix2, Matrix3, Check, defaultValue, EllipsoidTangentPlane, Math$1, Plane) { 'use strict';

  /**
   * Creates an instance of an OrientedBoundingBox.
   * An OrientedBoundingBox of some object is a closed and convex rectangular cuboid. It can provide a tighter bounding volume than {@link BoundingSphere} or {@link AxisAlignedBoundingBox} in many cases.
   * @alias OrientedBoundingBox
   * @constructor
   *
   * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the box.
   * @param {Matrix3} [halfAxes=Matrix3.ZERO] The three orthogonal half-axes of the bounding box.
   *                                          Equivalently, the transformation matrix, to rotate and scale a 1x1x1
   *                                          cube centered at the origin.
   *
   *
   * @example
   * // Create an OrientedBoundingBox using a transformation matrix, a position where the box will be translated, and a scale.
   * const center = new Cesium.Cartesian3(1.0, 0.0, 0.0);
   * const halfAxes = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(1.0, 3.0, 2.0), new Cesium.Matrix3());
   *
   * const obb = new Cesium.OrientedBoundingBox(center, halfAxes);
   *
   * @see BoundingSphere
   * @see BoundingRectangle
   */
  function OrientedBoundingBox(center, halfAxes) {
    /**
     * The center of the box.
     * @type {Cartesian3}
     * @default {@link Cartesian3.ZERO}
     */
    this.center = Matrix3.Cartesian3.clone(defaultValue.defaultValue(center, Matrix3.Cartesian3.ZERO));
    /**
     * The transformation matrix, to rotate the box to the right position.
     * @type {Matrix3}
     * @default {@link Matrix3.ZERO}
     */
    this.halfAxes = Matrix3.Matrix3.clone(defaultValue.defaultValue(halfAxes, Matrix3.Matrix3.ZERO));
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  OrientedBoundingBox.packedLength =
    Matrix3.Cartesian3.packedLength + Matrix3.Matrix3.packedLength;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {OrientedBoundingBox} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  OrientedBoundingBox.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    Matrix3.Cartesian3.pack(value.center, array, startingIndex);
    Matrix3.Matrix3.pack(value.halfAxes, array, startingIndex + Matrix3.Cartesian3.packedLength);

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {OrientedBoundingBox} [result] The object into which to store the result.
   * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
   */
  OrientedBoundingBox.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new OrientedBoundingBox();
    }

    Matrix3.Cartesian3.unpack(array, startingIndex, result.center);
    Matrix3.Matrix3.unpack(
      array,
      startingIndex + Matrix3.Cartesian3.packedLength,
      result.halfAxes
    );
    return result;
  };

  const scratchCartesian1 = new Matrix3.Cartesian3();
  const scratchCartesian2 = new Matrix3.Cartesian3();
  const scratchCartesian3 = new Matrix3.Cartesian3();
  const scratchCartesian4 = new Matrix3.Cartesian3();
  const scratchCartesian5 = new Matrix3.Cartesian3();
  const scratchCartesian6 = new Matrix3.Cartesian3();
  const scratchCovarianceResult = new Matrix3.Matrix3();
  const scratchEigenResult = {
    unitary: new Matrix3.Matrix3(),
    diagonal: new Matrix3.Matrix3(),
  };

  /**
   * Computes an instance of an OrientedBoundingBox of the given positions.
   * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
   * Reference: http://gamma.cs.unc.edu/users/gottschalk/main.pdf
   *
   * @param {Cartesian3[]} [positions] List of {@link Cartesian3} points that the bounding box will enclose.
   * @param {OrientedBoundingBox} [result] The object onto which to store the result.
   * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
   *
   * @example
   * // Compute an object oriented bounding box enclosing two points.
   * const box = Cesium.OrientedBoundingBox.fromPoints([new Cesium.Cartesian3(2, 0, 0), new Cesium.Cartesian3(-2, 0, 0)]);
   */
  OrientedBoundingBox.fromPoints = function (positions, result) {
    if (!defaultValue.defined(result)) {
      result = new OrientedBoundingBox();
    }

    if (!defaultValue.defined(positions) || positions.length === 0) {
      result.halfAxes = Matrix3.Matrix3.ZERO;
      result.center = Matrix3.Cartesian3.ZERO;
      return result;
    }

    let i;
    const length = positions.length;

    const meanPoint = Matrix3.Cartesian3.clone(positions[0], scratchCartesian1);
    for (i = 1; i < length; i++) {
      Matrix3.Cartesian3.add(meanPoint, positions[i], meanPoint);
    }
    const invLength = 1.0 / length;
    Matrix3.Cartesian3.multiplyByScalar(meanPoint, invLength, meanPoint);

    let exx = 0.0;
    let exy = 0.0;
    let exz = 0.0;
    let eyy = 0.0;
    let eyz = 0.0;
    let ezz = 0.0;
    let p;

    for (i = 0; i < length; i++) {
      p = Matrix3.Cartesian3.subtract(positions[i], meanPoint, scratchCartesian2);
      exx += p.x * p.x;
      exy += p.x * p.y;
      exz += p.x * p.z;
      eyy += p.y * p.y;
      eyz += p.y * p.z;
      ezz += p.z * p.z;
    }

    exx *= invLength;
    exy *= invLength;
    exz *= invLength;
    eyy *= invLength;
    eyz *= invLength;
    ezz *= invLength;

    const covarianceMatrix = scratchCovarianceResult;
    covarianceMatrix[0] = exx;
    covarianceMatrix[1] = exy;
    covarianceMatrix[2] = exz;
    covarianceMatrix[3] = exy;
    covarianceMatrix[4] = eyy;
    covarianceMatrix[5] = eyz;
    covarianceMatrix[6] = exz;
    covarianceMatrix[7] = eyz;
    covarianceMatrix[8] = ezz;

    const eigenDecomposition = Matrix3.Matrix3.computeEigenDecomposition(
      covarianceMatrix,
      scratchEigenResult
    );
    const rotation = Matrix3.Matrix3.clone(eigenDecomposition.unitary, result.halfAxes);

    let v1 = Matrix3.Matrix3.getColumn(rotation, 0, scratchCartesian4);
    let v2 = Matrix3.Matrix3.getColumn(rotation, 1, scratchCartesian5);
    let v3 = Matrix3.Matrix3.getColumn(rotation, 2, scratchCartesian6);

    let u1 = -Number.MAX_VALUE;
    let u2 = -Number.MAX_VALUE;
    let u3 = -Number.MAX_VALUE;
    let l1 = Number.MAX_VALUE;
    let l2 = Number.MAX_VALUE;
    let l3 = Number.MAX_VALUE;

    for (i = 0; i < length; i++) {
      p = positions[i];
      u1 = Math.max(Matrix3.Cartesian3.dot(v1, p), u1);
      u2 = Math.max(Matrix3.Cartesian3.dot(v2, p), u2);
      u3 = Math.max(Matrix3.Cartesian3.dot(v3, p), u3);

      l1 = Math.min(Matrix3.Cartesian3.dot(v1, p), l1);
      l2 = Math.min(Matrix3.Cartesian3.dot(v2, p), l2);
      l3 = Math.min(Matrix3.Cartesian3.dot(v3, p), l3);
    }

    v1 = Matrix3.Cartesian3.multiplyByScalar(v1, 0.5 * (l1 + u1), v1);
    v2 = Matrix3.Cartesian3.multiplyByScalar(v2, 0.5 * (l2 + u2), v2);
    v3 = Matrix3.Cartesian3.multiplyByScalar(v3, 0.5 * (l3 + u3), v3);

    const center = Matrix3.Cartesian3.add(v1, v2, result.center);
    Matrix3.Cartesian3.add(center, v3, center);

    const scale = scratchCartesian3;
    scale.x = u1 - l1;
    scale.y = u2 - l2;
    scale.z = u3 - l3;
    Matrix3.Cartesian3.multiplyByScalar(scale, 0.5, scale);
    Matrix3.Matrix3.multiplyByScale(result.halfAxes, scale, result.halfAxes);

    return result;
  };

  const scratchOffset = new Matrix3.Cartesian3();
  const scratchScale = new Matrix3.Cartesian3();
  function fromPlaneExtents(
    planeOrigin,
    planeXAxis,
    planeYAxis,
    planeZAxis,
    minimumX,
    maximumX,
    minimumY,
    maximumY,
    minimumZ,
    maximumZ,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (
      !defaultValue.defined(minimumX) ||
      !defaultValue.defined(maximumX) ||
      !defaultValue.defined(minimumY) ||
      !defaultValue.defined(maximumY) ||
      !defaultValue.defined(minimumZ) ||
      !defaultValue.defined(maximumZ)
    ) {
      throw new Check.DeveloperError(
        "all extents (minimum/maximum X/Y/Z) are required."
      );
    }
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new OrientedBoundingBox();
    }

    const halfAxes = result.halfAxes;
    Matrix3.Matrix3.setColumn(halfAxes, 0, planeXAxis, halfAxes);
    Matrix3.Matrix3.setColumn(halfAxes, 1, planeYAxis, halfAxes);
    Matrix3.Matrix3.setColumn(halfAxes, 2, planeZAxis, halfAxes);

    let centerOffset = scratchOffset;
    centerOffset.x = (minimumX + maximumX) / 2.0;
    centerOffset.y = (minimumY + maximumY) / 2.0;
    centerOffset.z = (minimumZ + maximumZ) / 2.0;

    const scale = scratchScale;
    scale.x = (maximumX - minimumX) / 2.0;
    scale.y = (maximumY - minimumY) / 2.0;
    scale.z = (maximumZ - minimumZ) / 2.0;

    const center = result.center;
    centerOffset = Matrix3.Matrix3.multiplyByVector(halfAxes, centerOffset, centerOffset);
    Matrix3.Cartesian3.add(planeOrigin, centerOffset, center);
    Matrix3.Matrix3.multiplyByScale(halfAxes, scale, halfAxes);

    return result;
  }

  const scratchRectangleCenterCartographic = new Matrix3.Cartographic();
  const scratchRectangleCenter = new Matrix3.Cartesian3();
  const scratchPerimeterCartographicNC = new Matrix3.Cartographic();
  const scratchPerimeterCartographicNW = new Matrix3.Cartographic();
  const scratchPerimeterCartographicCW = new Matrix3.Cartographic();
  const scratchPerimeterCartographicSW = new Matrix3.Cartographic();
  const scratchPerimeterCartographicSC = new Matrix3.Cartographic();
  const scratchPerimeterCartesianNC = new Matrix3.Cartesian3();
  const scratchPerimeterCartesianNW = new Matrix3.Cartesian3();
  const scratchPerimeterCartesianCW = new Matrix3.Cartesian3();
  const scratchPerimeterCartesianSW = new Matrix3.Cartesian3();
  const scratchPerimeterCartesianSC = new Matrix3.Cartesian3();
  const scratchPerimeterProjectedNC = new Matrix2.Cartesian2();
  const scratchPerimeterProjectedNW = new Matrix2.Cartesian2();
  const scratchPerimeterProjectedCW = new Matrix2.Cartesian2();
  const scratchPerimeterProjectedSW = new Matrix2.Cartesian2();
  const scratchPerimeterProjectedSC = new Matrix2.Cartesian2();

  const scratchPlaneOrigin = new Matrix3.Cartesian3();
  const scratchPlaneNormal = new Matrix3.Cartesian3();
  const scratchPlaneXAxis = new Matrix3.Cartesian3();
  const scratchHorizonCartesian = new Matrix3.Cartesian3();
  const scratchHorizonProjected = new Matrix2.Cartesian2();
  const scratchMaxY = new Matrix3.Cartesian3();
  const scratchMinY = new Matrix3.Cartesian3();
  const scratchZ = new Matrix3.Cartesian3();
  const scratchPlane = new Plane.Plane(Matrix3.Cartesian3.UNIT_X, 0.0);

  /**
   * Computes an OrientedBoundingBox that bounds a {@link Rectangle} on the surface of an {@link Ellipsoid}.
   * There are no guarantees about the orientation of the bounding box.
   *
   * @param {Rectangle} rectangle The cartographic rectangle on the surface of the ellipsoid.
   * @param {Number} [minimumHeight=0.0] The minimum height (elevation) within the tile.
   * @param {Number} [maximumHeight=0.0] The maximum height (elevation) within the tile.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle is defined.
   * @param {OrientedBoundingBox} [result] The object onto which to store the result.
   * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided.
   *
   * @exception {DeveloperError} rectangle.width must be between 0 and 2 * pi.
   * @exception {DeveloperError} rectangle.height must be between 0 and pi.
   * @exception {DeveloperError} ellipsoid must be an ellipsoid of revolution (<code>radii.x == radii.y</code>)
   */
  OrientedBoundingBox.fromRectangle = function (
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(rectangle)) {
      throw new Check.DeveloperError("rectangle is required");
    }
    if (rectangle.width < 0.0 || rectangle.width > Math$1.CesiumMath.TWO_PI) {
      throw new Check.DeveloperError("Rectangle width must be between 0 and 2 * pi");
    }
    if (rectangle.height < 0.0 || rectangle.height > Math$1.CesiumMath.PI) {
      throw new Check.DeveloperError("Rectangle height must be between 0 and pi");
    }
    if (
      defaultValue.defined(ellipsoid) &&
      !Math$1.CesiumMath.equalsEpsilon(
        ellipsoid.radii.x,
        ellipsoid.radii.y,
        Math$1.CesiumMath.EPSILON15
      )
    ) {
      throw new Check.DeveloperError(
        "Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)"
      );
    }
    //>>includeEnd('debug');

    minimumHeight = defaultValue.defaultValue(minimumHeight, 0.0);
    maximumHeight = defaultValue.defaultValue(maximumHeight, 0.0);
    ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);

    let minX, maxX, minY, maxY, minZ, maxZ, plane;

    if (rectangle.width <= Math$1.CesiumMath.PI) {
      // The bounding box will be aligned with the tangent plane at the center of the rectangle.
      const tangentPointCartographic = Matrix2.Rectangle.center(
        rectangle,
        scratchRectangleCenterCartographic
      );
      const tangentPoint = ellipsoid.cartographicToCartesian(
        tangentPointCartographic,
        scratchRectangleCenter
      );
      const tangentPlane = new EllipsoidTangentPlane.EllipsoidTangentPlane(tangentPoint, ellipsoid);
      plane = tangentPlane.plane;

      // If the rectangle spans the equator, CW is instead aligned with the equator (because it sticks out the farthest at the equator).
      const lonCenter = tangentPointCartographic.longitude;
      const latCenter =
        rectangle.south < 0.0 && rectangle.north > 0.0
          ? 0.0
          : tangentPointCartographic.latitude;

      // Compute XY extents using the rectangle at maximum height
      const perimeterCartographicNC = Matrix3.Cartographic.fromRadians(
        lonCenter,
        rectangle.north,
        maximumHeight,
        scratchPerimeterCartographicNC
      );
      const perimeterCartographicNW = Matrix3.Cartographic.fromRadians(
        rectangle.west,
        rectangle.north,
        maximumHeight,
        scratchPerimeterCartographicNW
      );
      const perimeterCartographicCW = Matrix3.Cartographic.fromRadians(
        rectangle.west,
        latCenter,
        maximumHeight,
        scratchPerimeterCartographicCW
      );
      const perimeterCartographicSW = Matrix3.Cartographic.fromRadians(
        rectangle.west,
        rectangle.south,
        maximumHeight,
        scratchPerimeterCartographicSW
      );
      const perimeterCartographicSC = Matrix3.Cartographic.fromRadians(
        lonCenter,
        rectangle.south,
        maximumHeight,
        scratchPerimeterCartographicSC
      );

      const perimeterCartesianNC = ellipsoid.cartographicToCartesian(
        perimeterCartographicNC,
        scratchPerimeterCartesianNC
      );
      let perimeterCartesianNW = ellipsoid.cartographicToCartesian(
        perimeterCartographicNW,
        scratchPerimeterCartesianNW
      );
      const perimeterCartesianCW = ellipsoid.cartographicToCartesian(
        perimeterCartographicCW,
        scratchPerimeterCartesianCW
      );
      let perimeterCartesianSW = ellipsoid.cartographicToCartesian(
        perimeterCartographicSW,
        scratchPerimeterCartesianSW
      );
      const perimeterCartesianSC = ellipsoid.cartographicToCartesian(
        perimeterCartographicSC,
        scratchPerimeterCartesianSC
      );

      const perimeterProjectedNC = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianNC,
        scratchPerimeterProjectedNC
      );
      const perimeterProjectedNW = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianNW,
        scratchPerimeterProjectedNW
      );
      const perimeterProjectedCW = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianCW,
        scratchPerimeterProjectedCW
      );
      const perimeterProjectedSW = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianSW,
        scratchPerimeterProjectedSW
      );
      const perimeterProjectedSC = tangentPlane.projectPointToNearestOnPlane(
        perimeterCartesianSC,
        scratchPerimeterProjectedSC
      );

      minX = Math.min(
        perimeterProjectedNW.x,
        perimeterProjectedCW.x,
        perimeterProjectedSW.x
      );
      maxX = -minX; // symmetrical

      maxY = Math.max(perimeterProjectedNW.y, perimeterProjectedNC.y);
      minY = Math.min(perimeterProjectedSW.y, perimeterProjectedSC.y);

      // Compute minimum Z using the rectangle at minimum height, since it will be deeper than the maximum height
      perimeterCartographicNW.height = perimeterCartographicSW.height = minimumHeight;
      perimeterCartesianNW = ellipsoid.cartographicToCartesian(
        perimeterCartographicNW,
        scratchPerimeterCartesianNW
      );
      perimeterCartesianSW = ellipsoid.cartographicToCartesian(
        perimeterCartographicSW,
        scratchPerimeterCartesianSW
      );

      minZ = Math.min(
        Plane.Plane.getPointDistance(plane, perimeterCartesianNW),
        Plane.Plane.getPointDistance(plane, perimeterCartesianSW)
      );
      maxZ = maximumHeight; // Since the tangent plane touches the surface at height = 0, this is okay

      return fromPlaneExtents(
        tangentPlane.origin,
        tangentPlane.xAxis,
        tangentPlane.yAxis,
        tangentPlane.zAxis,
        minX,
        maxX,
        minY,
        maxY,
        minZ,
        maxZ,
        result
      );
    }

    // Handle the case where rectangle width is greater than PI (wraps around more than half the ellipsoid).
    const fullyAboveEquator = rectangle.south > 0.0;
    const fullyBelowEquator = rectangle.north < 0.0;
    const latitudeNearestToEquator = fullyAboveEquator
      ? rectangle.south
      : fullyBelowEquator
      ? rectangle.north
      : 0.0;
    const centerLongitude = Matrix2.Rectangle.center(
      rectangle,
      scratchRectangleCenterCartographic
    ).longitude;

    // Plane is located at the rectangle's center longitude and the rectangle's latitude that is closest to the equator. It rotates around the Z axis.
    // This results in a better fit than the obb approach for smaller rectangles, which orients with the rectangle's center normal.
    const planeOrigin = Matrix3.Cartesian3.fromRadians(
      centerLongitude,
      latitudeNearestToEquator,
      maximumHeight,
      ellipsoid,
      scratchPlaneOrigin
    );
    planeOrigin.z = 0.0; // center the plane on the equator to simpify plane normal calculation
    const isPole =
      Math.abs(planeOrigin.x) < Math$1.CesiumMath.EPSILON10 &&
      Math.abs(planeOrigin.y) < Math$1.CesiumMath.EPSILON10;
    const planeNormal = !isPole
      ? Matrix3.Cartesian3.normalize(planeOrigin, scratchPlaneNormal)
      : Matrix3.Cartesian3.UNIT_X;
    const planeYAxis = Matrix3.Cartesian3.UNIT_Z;
    const planeXAxis = Matrix3.Cartesian3.cross(
      planeNormal,
      planeYAxis,
      scratchPlaneXAxis
    );
    plane = Plane.Plane.fromPointNormal(planeOrigin, planeNormal, scratchPlane);

    // Get the horizon point relative to the center. This will be the farthest extent in the plane's X dimension.
    const horizonCartesian = Matrix3.Cartesian3.fromRadians(
      centerLongitude + Math$1.CesiumMath.PI_OVER_TWO,
      latitudeNearestToEquator,
      maximumHeight,
      ellipsoid,
      scratchHorizonCartesian
    );
    maxX = Matrix3.Cartesian3.dot(
      Plane.Plane.projectPointOntoPlane(
        plane,
        horizonCartesian,
        scratchHorizonProjected
      ),
      planeXAxis
    );
    minX = -maxX; // symmetrical

    // Get the min and max Y, using the height that will give the largest extent
    maxY = Matrix3.Cartesian3.fromRadians(
      0.0,
      rectangle.north,
      fullyBelowEquator ? minimumHeight : maximumHeight,
      ellipsoid,
      scratchMaxY
    ).z;
    minY = Matrix3.Cartesian3.fromRadians(
      0.0,
      rectangle.south,
      fullyAboveEquator ? minimumHeight : maximumHeight,
      ellipsoid,
      scratchMinY
    ).z;

    const farZ = Matrix3.Cartesian3.fromRadians(
      rectangle.east,
      latitudeNearestToEquator,
      maximumHeight,
      ellipsoid,
      scratchZ
    );
    minZ = Plane.Plane.getPointDistance(plane, farZ);
    maxZ = 0.0; // plane origin starts at maxZ already

    // min and max are local to the plane axes
    return fromPlaneExtents(
      planeOrigin,
      planeXAxis,
      planeYAxis,
      planeNormal,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      result
    );
  };

  /**
   * Computes an OrientedBoundingBox that bounds an affine transformation.
   *
   * @param {Matrix4} transformation The affine transformation.
   * @param {OrientedBoundingBox} [result] The object onto which to store the result.
   * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided.
   */
  OrientedBoundingBox.fromTransformation = function (transformation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("transformation", transformation);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new OrientedBoundingBox();
    }

    result.center = Matrix2.Matrix4.getTranslation(transformation, result.center);
    result.halfAxes = Matrix2.Matrix4.getMatrix3(transformation, result.halfAxes);
    result.halfAxes = Matrix3.Matrix3.multiplyByScalar(
      result.halfAxes,
      0.5,
      result.halfAxes
    );
    return result;
  };

  /**
   * Duplicates a OrientedBoundingBox instance.
   *
   * @param {OrientedBoundingBox} box The bounding box to duplicate.
   * @param {OrientedBoundingBox} [result] The object onto which to store the result.
   * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided. (Returns undefined if box is undefined)
   */
  OrientedBoundingBox.clone = function (box, result) {
    if (!defaultValue.defined(box)) {
      return undefined;
    }

    if (!defaultValue.defined(result)) {
      return new OrientedBoundingBox(box.center, box.halfAxes);
    }

    Matrix3.Cartesian3.clone(box.center, result.center);
    Matrix3.Matrix3.clone(box.halfAxes, result.halfAxes);

    return result;
  };

  /**
   * Determines which side of a plane the oriented bounding box is located.
   *
   * @param {OrientedBoundingBox} box The oriented bounding box to test.
   * @param {Plane} plane The plane to test against.
   * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
   *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
   *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
   *                      intersects the plane.
   */
  OrientedBoundingBox.intersectPlane = function (box, plane) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(box)) {
      throw new Check.DeveloperError("box is required.");
    }

    if (!defaultValue.defined(plane)) {
      throw new Check.DeveloperError("plane is required.");
    }
    //>>includeEnd('debug');

    const center = box.center;
    const normal = plane.normal;
    const halfAxes = box.halfAxes;
    const normalX = normal.x,
      normalY = normal.y,
      normalZ = normal.z;
    // plane is used as if it is its normal; the first three components are assumed to be normalized
    const radEffective =
      Math.abs(
        normalX * halfAxes[Matrix3.Matrix3.COLUMN0ROW0] +
          normalY * halfAxes[Matrix3.Matrix3.COLUMN0ROW1] +
          normalZ * halfAxes[Matrix3.Matrix3.COLUMN0ROW2]
      ) +
      Math.abs(
        normalX * halfAxes[Matrix3.Matrix3.COLUMN1ROW0] +
          normalY * halfAxes[Matrix3.Matrix3.COLUMN1ROW1] +
          normalZ * halfAxes[Matrix3.Matrix3.COLUMN1ROW2]
      ) +
      Math.abs(
        normalX * halfAxes[Matrix3.Matrix3.COLUMN2ROW0] +
          normalY * halfAxes[Matrix3.Matrix3.COLUMN2ROW1] +
          normalZ * halfAxes[Matrix3.Matrix3.COLUMN2ROW2]
      );
    const distanceToPlane = Matrix3.Cartesian3.dot(normal, center) + plane.distance;

    if (distanceToPlane <= -radEffective) {
      // The entire box is on the negative side of the plane normal
      return Transforms.Intersect.OUTSIDE;
    } else if (distanceToPlane >= radEffective) {
      // The entire box is on the positive side of the plane normal
      return Transforms.Intersect.INSIDE;
    }
    return Transforms.Intersect.INTERSECTING;
  };

  const scratchCartesianU = new Matrix3.Cartesian3();
  const scratchCartesianV = new Matrix3.Cartesian3();
  const scratchCartesianW = new Matrix3.Cartesian3();
  const scratchValidAxis2 = new Matrix3.Cartesian3();
  const scratchValidAxis3 = new Matrix3.Cartesian3();
  const scratchPPrime = new Matrix3.Cartesian3();

  /**
   * Computes the estimated distance squared from the closest point on a bounding box to a point.
   *
   * @param {OrientedBoundingBox} box The box.
   * @param {Cartesian3} cartesian The point
   * @returns {Number} The distance squared from the oriented bounding box to the point. Returns 0 if the point is inside the box.
   *
   * @example
   * // Sort bounding boxes from back to front
   * boxes.sort(function(a, b) {
   *     return Cesium.OrientedBoundingBox.distanceSquaredTo(b, camera.positionWC) - Cesium.OrientedBoundingBox.distanceSquaredTo(a, camera.positionWC);
   * });
   */
  OrientedBoundingBox.distanceSquaredTo = function (box, cartesian) {
    // See Geometric Tools for Computer Graphics 10.4.2

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(box)) {
      throw new Check.DeveloperError("box is required.");
    }
    if (!defaultValue.defined(cartesian)) {
      throw new Check.DeveloperError("cartesian is required.");
    }
    //>>includeEnd('debug');

    const offset = Matrix3.Cartesian3.subtract(cartesian, box.center, scratchOffset);

    const halfAxes = box.halfAxes;
    let u = Matrix3.Matrix3.getColumn(halfAxes, 0, scratchCartesianU);
    let v = Matrix3.Matrix3.getColumn(halfAxes, 1, scratchCartesianV);
    let w = Matrix3.Matrix3.getColumn(halfAxes, 2, scratchCartesianW);

    const uHalf = Matrix3.Cartesian3.magnitude(u);
    const vHalf = Matrix3.Cartesian3.magnitude(v);
    const wHalf = Matrix3.Cartesian3.magnitude(w);

    let uValid = true;
    let vValid = true;
    let wValid = true;

    if (uHalf > 0) {
      Matrix3.Cartesian3.divideByScalar(u, uHalf, u);
    } else {
      uValid = false;
    }

    if (vHalf > 0) {
      Matrix3.Cartesian3.divideByScalar(v, vHalf, v);
    } else {
      vValid = false;
    }

    if (wHalf > 0) {
      Matrix3.Cartesian3.divideByScalar(w, wHalf, w);
    } else {
      wValid = false;
    }

    const numberOfDegenerateAxes = !uValid + !vValid + !wValid;
    let validAxis1;
    let validAxis2;
    let validAxis3;

    if (numberOfDegenerateAxes === 1) {
      let degenerateAxis = u;
      validAxis1 = v;
      validAxis2 = w;
      if (!vValid) {
        degenerateAxis = v;
        validAxis1 = u;
      } else if (!wValid) {
        degenerateAxis = w;
        validAxis2 = u;
      }

      validAxis3 = Matrix3.Cartesian3.cross(validAxis1, validAxis2, scratchValidAxis3);

      if (degenerateAxis === u) {
        u = validAxis3;
      } else if (degenerateAxis === v) {
        v = validAxis3;
      } else if (degenerateAxis === w) {
        w = validAxis3;
      }
    } else if (numberOfDegenerateAxes === 2) {
      validAxis1 = u;
      if (vValid) {
        validAxis1 = v;
      } else if (wValid) {
        validAxis1 = w;
      }

      let crossVector = Matrix3.Cartesian3.UNIT_Y;
      if (crossVector.equalsEpsilon(validAxis1, Math$1.CesiumMath.EPSILON3)) {
        crossVector = Matrix3.Cartesian3.UNIT_X;
      }

      validAxis2 = Matrix3.Cartesian3.cross(validAxis1, crossVector, scratchValidAxis2);
      Matrix3.Cartesian3.normalize(validAxis2, validAxis2);
      validAxis3 = Matrix3.Cartesian3.cross(validAxis1, validAxis2, scratchValidAxis3);
      Matrix3.Cartesian3.normalize(validAxis3, validAxis3);

      if (validAxis1 === u) {
        v = validAxis2;
        w = validAxis3;
      } else if (validAxis1 === v) {
        w = validAxis2;
        u = validAxis3;
      } else if (validAxis1 === w) {
        u = validAxis2;
        v = validAxis3;
      }
    } else if (numberOfDegenerateAxes === 3) {
      u = Matrix3.Cartesian3.UNIT_X;
      v = Matrix3.Cartesian3.UNIT_Y;
      w = Matrix3.Cartesian3.UNIT_Z;
    }

    const pPrime = scratchPPrime;
    pPrime.x = Matrix3.Cartesian3.dot(offset, u);
    pPrime.y = Matrix3.Cartesian3.dot(offset, v);
    pPrime.z = Matrix3.Cartesian3.dot(offset, w);

    let distanceSquared = 0.0;
    let d;

    if (pPrime.x < -uHalf) {
      d = pPrime.x + uHalf;
      distanceSquared += d * d;
    } else if (pPrime.x > uHalf) {
      d = pPrime.x - uHalf;
      distanceSquared += d * d;
    }

    if (pPrime.y < -vHalf) {
      d = pPrime.y + vHalf;
      distanceSquared += d * d;
    } else if (pPrime.y > vHalf) {
      d = pPrime.y - vHalf;
      distanceSquared += d * d;
    }

    if (pPrime.z < -wHalf) {
      d = pPrime.z + wHalf;
      distanceSquared += d * d;
    } else if (pPrime.z > wHalf) {
      d = pPrime.z - wHalf;
      distanceSquared += d * d;
    }

    return distanceSquared;
  };

  const scratchCorner = new Matrix3.Cartesian3();
  const scratchToCenter = new Matrix3.Cartesian3();

  /**
   * The distances calculated by the vector from the center of the bounding box to position projected onto direction.
   * <br>
   * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
   * closest and farthest planes from position that intersect the bounding box.
   *
   * @param {OrientedBoundingBox} box The bounding box to calculate the distance to.
   * @param {Cartesian3} position The position to calculate the distance from.
   * @param {Cartesian3} direction The direction from position.
   * @param {Interval} [result] A Interval to store the nearest and farthest distances.
   * @returns {Interval} The nearest and farthest distances on the bounding box from position in direction.
   */
  OrientedBoundingBox.computePlaneDistances = function (
    box,
    position,
    direction,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(box)) {
      throw new Check.DeveloperError("box is required.");
    }

    if (!defaultValue.defined(position)) {
      throw new Check.DeveloperError("position is required.");
    }

    if (!defaultValue.defined(direction)) {
      throw new Check.DeveloperError("direction is required.");
    }
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Transforms.Interval();
    }

    let minDist = Number.POSITIVE_INFINITY;
    let maxDist = Number.NEGATIVE_INFINITY;

    const center = box.center;
    const halfAxes = box.halfAxes;

    const u = Matrix3.Matrix3.getColumn(halfAxes, 0, scratchCartesianU);
    const v = Matrix3.Matrix3.getColumn(halfAxes, 1, scratchCartesianV);
    const w = Matrix3.Matrix3.getColumn(halfAxes, 2, scratchCartesianW);

    // project first corner
    const corner = Matrix3.Cartesian3.add(u, v, scratchCorner);
    Matrix3.Cartesian3.add(corner, w, corner);
    Matrix3.Cartesian3.add(corner, center, corner);

    const toCenter = Matrix3.Cartesian3.subtract(corner, position, scratchToCenter);
    let mag = Matrix3.Cartesian3.dot(direction, toCenter);

    minDist = Math.min(mag, minDist);
    maxDist = Math.max(mag, maxDist);

    // project second corner
    Matrix3.Cartesian3.add(center, u, corner);
    Matrix3.Cartesian3.add(corner, v, corner);
    Matrix3.Cartesian3.subtract(corner, w, corner);

    Matrix3.Cartesian3.subtract(corner, position, toCenter);
    mag = Matrix3.Cartesian3.dot(direction, toCenter);

    minDist = Math.min(mag, minDist);
    maxDist = Math.max(mag, maxDist);

    // project third corner
    Matrix3.Cartesian3.add(center, u, corner);
    Matrix3.Cartesian3.subtract(corner, v, corner);
    Matrix3.Cartesian3.add(corner, w, corner);

    Matrix3.Cartesian3.subtract(corner, position, toCenter);
    mag = Matrix3.Cartesian3.dot(direction, toCenter);

    minDist = Math.min(mag, minDist);
    maxDist = Math.max(mag, maxDist);

    // project fourth corner
    Matrix3.Cartesian3.add(center, u, corner);
    Matrix3.Cartesian3.subtract(corner, v, corner);
    Matrix3.Cartesian3.subtract(corner, w, corner);

    Matrix3.Cartesian3.subtract(corner, position, toCenter);
    mag = Matrix3.Cartesian3.dot(direction, toCenter);

    minDist = Math.min(mag, minDist);
    maxDist = Math.max(mag, maxDist);

    // project fifth corner
    Matrix3.Cartesian3.subtract(center, u, corner);
    Matrix3.Cartesian3.add(corner, v, corner);
    Matrix3.Cartesian3.add(corner, w, corner);

    Matrix3.Cartesian3.subtract(corner, position, toCenter);
    mag = Matrix3.Cartesian3.dot(direction, toCenter);

    minDist = Math.min(mag, minDist);
    maxDist = Math.max(mag, maxDist);

    // project sixth corner
    Matrix3.Cartesian3.subtract(center, u, corner);
    Matrix3.Cartesian3.add(corner, v, corner);
    Matrix3.Cartesian3.subtract(corner, w, corner);

    Matrix3.Cartesian3.subtract(corner, position, toCenter);
    mag = Matrix3.Cartesian3.dot(direction, toCenter);

    minDist = Math.min(mag, minDist);
    maxDist = Math.max(mag, maxDist);

    // project seventh corner
    Matrix3.Cartesian3.subtract(center, u, corner);
    Matrix3.Cartesian3.subtract(corner, v, corner);
    Matrix3.Cartesian3.add(corner, w, corner);

    Matrix3.Cartesian3.subtract(corner, position, toCenter);
    mag = Matrix3.Cartesian3.dot(direction, toCenter);

    minDist = Math.min(mag, minDist);
    maxDist = Math.max(mag, maxDist);

    // project eighth corner
    Matrix3.Cartesian3.subtract(center, u, corner);
    Matrix3.Cartesian3.subtract(corner, v, corner);
    Matrix3.Cartesian3.subtract(corner, w, corner);

    Matrix3.Cartesian3.subtract(corner, position, toCenter);
    mag = Matrix3.Cartesian3.dot(direction, toCenter);

    minDist = Math.min(mag, minDist);
    maxDist = Math.max(mag, maxDist);

    result.start = minDist;
    result.stop = maxDist;
    return result;
  };

  const scratchXAxis = new Matrix3.Cartesian3();
  const scratchYAxis = new Matrix3.Cartesian3();
  const scratchZAxis = new Matrix3.Cartesian3();

  /**
   * Computes the eight corners of an oriented bounding box. The corners are ordered by (-X, -Y, -Z), (-X, -Y, +Z), (-X, +Y, -Z), (-X, +Y, +Z), (+X, -Y, -Z), (+X, -Y, +Z), (+X, +Y, -Z), (+X, +Y, +Z).
   *
   * @param {OrientedBoundingBox} box The oriented bounding box.
   * @param {Cartesian3[]} [result] An array of eight {@link Cartesian3} instances onto which to store the corners.
   * @returns {Cartesian3[]} The modified result parameter or a new array if none was provided.
   */
  OrientedBoundingBox.computeCorners = function (box, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("box", box);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = [
        new Matrix3.Cartesian3(),
        new Matrix3.Cartesian3(),
        new Matrix3.Cartesian3(),
        new Matrix3.Cartesian3(),
        new Matrix3.Cartesian3(),
        new Matrix3.Cartesian3(),
        new Matrix3.Cartesian3(),
        new Matrix3.Cartesian3(),
      ];
    }

    const center = box.center;
    const halfAxes = box.halfAxes;
    const xAxis = Matrix3.Matrix3.getColumn(halfAxes, 0, scratchXAxis);
    const yAxis = Matrix3.Matrix3.getColumn(halfAxes, 1, scratchYAxis);
    const zAxis = Matrix3.Matrix3.getColumn(halfAxes, 2, scratchZAxis);

    Matrix3.Cartesian3.clone(center, result[0]);
    Matrix3.Cartesian3.subtract(result[0], xAxis, result[0]);
    Matrix3.Cartesian3.subtract(result[0], yAxis, result[0]);
    Matrix3.Cartesian3.subtract(result[0], zAxis, result[0]);

    Matrix3.Cartesian3.clone(center, result[1]);
    Matrix3.Cartesian3.subtract(result[1], xAxis, result[1]);
    Matrix3.Cartesian3.subtract(result[1], yAxis, result[1]);
    Matrix3.Cartesian3.add(result[1], zAxis, result[1]);

    Matrix3.Cartesian3.clone(center, result[2]);
    Matrix3.Cartesian3.subtract(result[2], xAxis, result[2]);
    Matrix3.Cartesian3.add(result[2], yAxis, result[2]);
    Matrix3.Cartesian3.subtract(result[2], zAxis, result[2]);

    Matrix3.Cartesian3.clone(center, result[3]);
    Matrix3.Cartesian3.subtract(result[3], xAxis, result[3]);
    Matrix3.Cartesian3.add(result[3], yAxis, result[3]);
    Matrix3.Cartesian3.add(result[3], zAxis, result[3]);

    Matrix3.Cartesian3.clone(center, result[4]);
    Matrix3.Cartesian3.add(result[4], xAxis, result[4]);
    Matrix3.Cartesian3.subtract(result[4], yAxis, result[4]);
    Matrix3.Cartesian3.subtract(result[4], zAxis, result[4]);

    Matrix3.Cartesian3.clone(center, result[5]);
    Matrix3.Cartesian3.add(result[5], xAxis, result[5]);
    Matrix3.Cartesian3.subtract(result[5], yAxis, result[5]);
    Matrix3.Cartesian3.add(result[5], zAxis, result[5]);

    Matrix3.Cartesian3.clone(center, result[6]);
    Matrix3.Cartesian3.add(result[6], xAxis, result[6]);
    Matrix3.Cartesian3.add(result[6], yAxis, result[6]);
    Matrix3.Cartesian3.subtract(result[6], zAxis, result[6]);

    Matrix3.Cartesian3.clone(center, result[7]);
    Matrix3.Cartesian3.add(result[7], xAxis, result[7]);
    Matrix3.Cartesian3.add(result[7], yAxis, result[7]);
    Matrix3.Cartesian3.add(result[7], zAxis, result[7]);

    return result;
  };

  const scratchRotationScale = new Matrix3.Matrix3();

  /**
   * Computes a transformation matrix from an oriented bounding box.
   *
   * @param {OrientedBoundingBox} box The oriented bounding box.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new {@link Matrix4} instance if none was provided.
   */
  OrientedBoundingBox.computeTransformation = function (box, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("box", box);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Matrix2.Matrix4();
    }

    const translation = box.center;
    const rotationScale = Matrix3.Matrix3.multiplyByUniformScale(
      box.halfAxes,
      2.0,
      scratchRotationScale
    );
    return Matrix2.Matrix4.fromRotationTranslation(rotationScale, translation, result);
  };

  const scratchBoundingSphere = new Transforms.BoundingSphere();

  /**
   * Determines whether or not a bounding box is hidden from view by the occluder.
   *
   * @param {OrientedBoundingBox} box The bounding box surrounding the occludee object.
   * @param {Occluder} occluder The occluder.
   * @returns {Boolean} <code>true</code> if the box is not visible; otherwise <code>false</code>.
   */
  OrientedBoundingBox.isOccluded = function (box, occluder) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(box)) {
      throw new Check.DeveloperError("box is required.");
    }
    if (!defaultValue.defined(occluder)) {
      throw new Check.DeveloperError("occluder is required.");
    }
    //>>includeEnd('debug');

    const sphere = Transforms.BoundingSphere.fromOrientedBoundingBox(
      box,
      scratchBoundingSphere
    );

    return !occluder.isBoundingSphereVisible(sphere);
  };

  /**
   * Determines which side of a plane the oriented bounding box is located.
   *
   * @param {Plane} plane The plane to test against.
   * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
   *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
   *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
   *                      intersects the plane.
   */
  OrientedBoundingBox.prototype.intersectPlane = function (plane) {
    return OrientedBoundingBox.intersectPlane(this, plane);
  };

  /**
   * Computes the estimated distance squared from the closest point on a bounding box to a point.
   *
   * @param {Cartesian3} cartesian The point
   * @returns {Number} The estimated distance squared from the bounding sphere to the point.
   *
   * @example
   * // Sort bounding boxes from back to front
   * boxes.sort(function(a, b) {
   *     return b.distanceSquaredTo(camera.positionWC) - a.distanceSquaredTo(camera.positionWC);
   * });
   */
  OrientedBoundingBox.prototype.distanceSquaredTo = function (cartesian) {
    return OrientedBoundingBox.distanceSquaredTo(this, cartesian);
  };

  /**
   * The distances calculated by the vector from the center of the bounding box to position projected onto direction.
   * <br>
   * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
   * closest and farthest planes from position that intersect the bounding box.
   *
   * @param {Cartesian3} position The position to calculate the distance from.
   * @param {Cartesian3} direction The direction from position.
   * @param {Interval} [result] A Interval to store the nearest and farthest distances.
   * @returns {Interval} The nearest and farthest distances on the bounding box from position in direction.
   */
  OrientedBoundingBox.prototype.computePlaneDistances = function (
    position,
    direction,
    result
  ) {
    return OrientedBoundingBox.computePlaneDistances(
      this,
      position,
      direction,
      result
    );
  };

  /**
   * Computes the eight corners of an oriented bounding box. The corners are ordered by (-X, -Y, -Z), (-X, -Y, +Z), (-X, +Y, -Z), (-X, +Y, +Z), (+X, -Y, -Z), (+X, -Y, +Z), (+X, +Y, -Z), (+X, +Y, +Z).
   *
   * @param {Cartesian3[]} [result] An array of eight {@link Cartesian3} instances onto which to store the corners.
   * @returns {Cartesian3[]} The modified result parameter or a new array if none was provided.
   */
  OrientedBoundingBox.prototype.computeCorners = function (result) {
    return OrientedBoundingBox.computeCorners(this, result);
  };

  /**
   * Computes a transformation matrix from an oriented bounding box.
   *
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new {@link Matrix4} instance if none was provided.
   */
  OrientedBoundingBox.prototype.computeTransformation = function (result) {
    return OrientedBoundingBox.computeTransformation(this, result);
  };

  /**
   * Determines whether or not a bounding box is hidden from view by the occluder.
   *
   * @param {Occluder} occluder The occluder.
   * @returns {Boolean} <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
   */
  OrientedBoundingBox.prototype.isOccluded = function (occluder) {
    return OrientedBoundingBox.isOccluded(this, occluder);
  };

  /**
   * Compares the provided OrientedBoundingBox componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {OrientedBoundingBox} left The first OrientedBoundingBox.
   * @param {OrientedBoundingBox} right The second OrientedBoundingBox.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  OrientedBoundingBox.equals = function (left, right) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        Matrix3.Cartesian3.equals(left.center, right.center) &&
        Matrix3.Matrix3.equals(left.halfAxes, right.halfAxes))
    );
  };

  /**
   * Duplicates this OrientedBoundingBox instance.
   *
   * @param {OrientedBoundingBox} [result] The object onto which to store the result.
   * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
   */
  OrientedBoundingBox.prototype.clone = function (result) {
    return OrientedBoundingBox.clone(this, result);
  };

  /**
   * Compares this OrientedBoundingBox against the provided OrientedBoundingBox componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {OrientedBoundingBox} [right] The right hand side OrientedBoundingBox.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  OrientedBoundingBox.prototype.equals = function (right) {
    return OrientedBoundingBox.equals(this, right);
  };

  exports.OrientedBoundingBox = OrientedBoundingBox;

}));
