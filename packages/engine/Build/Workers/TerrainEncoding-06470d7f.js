define(['exports', './Transforms-26539bce', './Matrix3-315394f6', './Check-666ab1a0', './defaultValue-0a909f67', './Matrix2-13178034', './AttributeCompression-b646d393', './ComponentDatatype-f7b11d02', './Math-2dbd6b93'], (function (exports, Transforms, Matrix3, Check, defaultValue, Matrix2, AttributeCompression, ComponentDatatype, Math$1) { 'use strict';

  /**
   * Determine whether or not other objects are visible or hidden behind the visible horizon defined by
   * an {@link Ellipsoid} and a camera position.  The ellipsoid is assumed to be located at the
   * origin of the coordinate system.  This class uses the algorithm described in the
   * {@link https://cesium.com/blog/2013/04/25/Horizon-culling/|Horizon Culling} blog post.
   *
   * @alias EllipsoidalOccluder
   *
   * @param {Ellipsoid} ellipsoid The ellipsoid to use as an occluder.
   * @param {Cartesian3} [cameraPosition] The coordinate of the viewer/camera.  If this parameter is not
   *        specified, {@link EllipsoidalOccluder#cameraPosition} must be called before
   *        testing visibility.
   *
   * @constructor
   *
   * @example
   * // Construct an ellipsoidal occluder with radii 1.0, 1.1, and 0.9.
   * const cameraPosition = new Cesium.Cartesian3(5.0, 6.0, 7.0);
   * const occluderEllipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
   * const occluder = new Cesium.EllipsoidalOccluder(occluderEllipsoid, cameraPosition);
   *
   * @private
   */
  function EllipsoidalOccluder(ellipsoid, cameraPosition) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("ellipsoid", ellipsoid);
    //>>includeEnd('debug');

    this._ellipsoid = ellipsoid;
    this._cameraPosition = new Matrix3.Cartesian3();
    this._cameraPositionInScaledSpace = new Matrix3.Cartesian3();
    this._distanceToLimbInScaledSpaceSquared = 0.0;

    // cameraPosition fills in the above values
    if (defaultValue.defined(cameraPosition)) {
      this.cameraPosition = cameraPosition;
    }
  }

  Object.defineProperties(EllipsoidalOccluder.prototype, {
    /**
     * Gets the occluding ellipsoid.
     * @memberof EllipsoidalOccluder.prototype
     * @type {Ellipsoid}
     */
    ellipsoid: {
      get: function () {
        return this._ellipsoid;
      },
    },
    /**
     * Gets or sets the position of the camera.
     * @memberof EllipsoidalOccluder.prototype
     * @type {Cartesian3}
     */
    cameraPosition: {
      get: function () {
        return this._cameraPosition;
      },
      set: function (cameraPosition) {
        // See https://cesium.com/blog/2013/04/25/Horizon-culling/
        const ellipsoid = this._ellipsoid;
        const cv = ellipsoid.transformPositionToScaledSpace(
          cameraPosition,
          this._cameraPositionInScaledSpace
        );
        const vhMagnitudeSquared = Matrix3.Cartesian3.magnitudeSquared(cv) - 1.0;

        Matrix3.Cartesian3.clone(cameraPosition, this._cameraPosition);
        this._cameraPositionInScaledSpace = cv;
        this._distanceToLimbInScaledSpaceSquared = vhMagnitudeSquared;
      },
    },
  });

  const scratchCartesian = new Matrix3.Cartesian3();

  /**
   * Determines whether or not a point, the <code>occludee</code>, is hidden from view by the occluder.
   *
   * @param {Cartesian3} occludee The point to test for visibility.
   * @returns {Boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
   *
   * @example
   * const cameraPosition = new Cesium.Cartesian3(0, 0, 2.5);
   * const ellipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
   * const occluder = new Cesium.EllipsoidalOccluder(ellipsoid, cameraPosition);
   * const point = new Cesium.Cartesian3(0, -3, -3);
   * occluder.isPointVisible(point); //returns true
   */
  EllipsoidalOccluder.prototype.isPointVisible = function (occludee) {
    const ellipsoid = this._ellipsoid;
    const occludeeScaledSpacePosition = ellipsoid.transformPositionToScaledSpace(
      occludee,
      scratchCartesian
    );
    return isScaledSpacePointVisible(
      occludeeScaledSpacePosition,
      this._cameraPositionInScaledSpace,
      this._distanceToLimbInScaledSpaceSquared
    );
  };

  /**
   * Determines whether or not a point expressed in the ellipsoid scaled space, is hidden from view by the
   * occluder.  To transform a Cartesian X, Y, Z position in the coordinate system aligned with the ellipsoid
   * into the scaled space, call {@link Ellipsoid#transformPositionToScaledSpace}.
   *
   * @param {Cartesian3} occludeeScaledSpacePosition The point to test for visibility, represented in the scaled space.
   * @returns {Boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
   *
   * @example
   * const cameraPosition = new Cesium.Cartesian3(0, 0, 2.5);
   * const ellipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
   * const occluder = new Cesium.EllipsoidalOccluder(ellipsoid, cameraPosition);
   * const point = new Cesium.Cartesian3(0, -3, -3);
   * const scaledSpacePoint = ellipsoid.transformPositionToScaledSpace(point);
   * occluder.isScaledSpacePointVisible(scaledSpacePoint); //returns true
   */
  EllipsoidalOccluder.prototype.isScaledSpacePointVisible = function (
    occludeeScaledSpacePosition
  ) {
    return isScaledSpacePointVisible(
      occludeeScaledSpacePosition,
      this._cameraPositionInScaledSpace,
      this._distanceToLimbInScaledSpaceSquared
    );
  };

  const scratchCameraPositionInScaledSpaceShrunk = new Matrix3.Cartesian3();

  /**
   * Similar to {@link EllipsoidalOccluder#isScaledSpacePointVisible} except tests against an
   * ellipsoid that has been shrunk by the minimum height when the minimum height is below
   * the ellipsoid. This is intended to be used with points generated by
   * {@link EllipsoidalOccluder#computeHorizonCullingPointPossiblyUnderEllipsoid} or
   * {@link EllipsoidalOccluder#computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid}.
   *
   * @param {Cartesian3} occludeeScaledSpacePosition The point to test for visibility, represented in the scaled space of the possibly-shrunk ellipsoid.
   * @returns {Boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
   */
  EllipsoidalOccluder.prototype.isScaledSpacePointVisiblePossiblyUnderEllipsoid = function (
    occludeeScaledSpacePosition,
    minimumHeight
  ) {
    const ellipsoid = this._ellipsoid;
    let vhMagnitudeSquared;
    let cv;

    if (
      defaultValue.defined(minimumHeight) &&
      minimumHeight < 0.0 &&
      ellipsoid.minimumRadius > -minimumHeight
    ) {
      // This code is similar to the cameraPosition setter, but unrolled for performance because it will be called a lot.
      cv = scratchCameraPositionInScaledSpaceShrunk;
      cv.x = this._cameraPosition.x / (ellipsoid.radii.x + minimumHeight);
      cv.y = this._cameraPosition.y / (ellipsoid.radii.y + minimumHeight);
      cv.z = this._cameraPosition.z / (ellipsoid.radii.z + minimumHeight);
      vhMagnitudeSquared = cv.x * cv.x + cv.y * cv.y + cv.z * cv.z - 1.0;
    } else {
      cv = this._cameraPositionInScaledSpace;
      vhMagnitudeSquared = this._distanceToLimbInScaledSpaceSquared;
    }

    return isScaledSpacePointVisible(
      occludeeScaledSpacePosition,
      cv,
      vhMagnitudeSquared
    );
  };

  /**
   * Computes a point that can be used for horizon culling from a list of positions.  If the point is below
   * the horizon, all of the positions are guaranteed to be below the horizon as well.  The returned point
   * is expressed in the ellipsoid-scaled space and is suitable for use with
   * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
   *
   * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
   *                     A reasonable direction to use is the direction from the center of the ellipsoid to
   *                     the center of the bounding sphere computed from the positions.  The direction need not
   *                     be normalized.
   * @param {Cartesian3[]} positions The positions from which to compute the horizon culling point.  The positions
   *                       must be expressed in a reference frame centered at the ellipsoid and aligned with the
   *                       ellipsoid's axes.
   * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
   * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
   */
  EllipsoidalOccluder.prototype.computeHorizonCullingPoint = function (
    directionToPoint,
    positions,
    result
  ) {
    return computeHorizonCullingPointFromPositions(
      this._ellipsoid,
      directionToPoint,
      positions,
      result
    );
  };

  const scratchEllipsoidShrunk = Matrix3.Ellipsoid.clone(Matrix3.Ellipsoid.UNIT_SPHERE);

  /**
   * Similar to {@link EllipsoidalOccluder#computeHorizonCullingPoint} except computes the culling
   * point relative to an ellipsoid that has been shrunk by the minimum height when the minimum height is below
   * the ellipsoid. The returned point is expressed in the possibly-shrunk ellipsoid-scaled space and is suitable
   * for use with {@link EllipsoidalOccluder#isScaledSpacePointVisiblePossiblyUnderEllipsoid}.
   *
   * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
   *                     A reasonable direction to use is the direction from the center of the ellipsoid to
   *                     the center of the bounding sphere computed from the positions.  The direction need not
   *                     be normalized.
   * @param {Cartesian3[]} positions The positions from which to compute the horizon culling point.  The positions
   *                       must be expressed in a reference frame centered at the ellipsoid and aligned with the
   *                       ellipsoid's axes.
   * @param {Number} [minimumHeight] The minimum height of all positions. If this value is undefined, all positions are assumed to be above the ellipsoid.
   * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
   * @returns {Cartesian3} The computed horizon culling point, expressed in the possibly-shrunk ellipsoid-scaled space.
   */
  EllipsoidalOccluder.prototype.computeHorizonCullingPointPossiblyUnderEllipsoid = function (
    directionToPoint,
    positions,
    minimumHeight,
    result
  ) {
    const possiblyShrunkEllipsoid = getPossiblyShrunkEllipsoid(
      this._ellipsoid,
      minimumHeight,
      scratchEllipsoidShrunk
    );
    return computeHorizonCullingPointFromPositions(
      possiblyShrunkEllipsoid,
      directionToPoint,
      positions,
      result
    );
  };
  /**
   * Computes a point that can be used for horizon culling from a list of positions.  If the point is below
   * the horizon, all of the positions are guaranteed to be below the horizon as well.  The returned point
   * is expressed in the ellipsoid-scaled space and is suitable for use with
   * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
   *
   * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
   *                     A reasonable direction to use is the direction from the center of the ellipsoid to
   *                     the center of the bounding sphere computed from the positions.  The direction need not
   *                     be normalized.
   * @param {Number[]} vertices  The vertices from which to compute the horizon culling point.  The positions
   *                   must be expressed in a reference frame centered at the ellipsoid and aligned with the
   *                   ellipsoid's axes.
   * @param {Number} [stride=3]
   * @param {Cartesian3} [center=Cartesian3.ZERO]
   * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
   * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
   */
  EllipsoidalOccluder.prototype.computeHorizonCullingPointFromVertices = function (
    directionToPoint,
    vertices,
    stride,
    center,
    result
  ) {
    return computeHorizonCullingPointFromVertices(
      this._ellipsoid,
      directionToPoint,
      vertices,
      stride,
      center,
      result
    );
  };

  /**
   * Similar to {@link EllipsoidalOccluder#computeHorizonCullingPointFromVertices} except computes the culling
   * point relative to an ellipsoid that has been shrunk by the minimum height when the minimum height is below
   * the ellipsoid. The returned point is expressed in the possibly-shrunk ellipsoid-scaled space and is suitable
   * for use with {@link EllipsoidalOccluder#isScaledSpacePointVisiblePossiblyUnderEllipsoid}.
   *
   * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
   *                     A reasonable direction to use is the direction from the center of the ellipsoid to
   *                     the center of the bounding sphere computed from the positions.  The direction need not
   *                     be normalized.
   * @param {Number[]} vertices  The vertices from which to compute the horizon culling point.  The positions
   *                   must be expressed in a reference frame centered at the ellipsoid and aligned with the
   *                   ellipsoid's axes.
   * @param {Number} [stride=3]
   * @param {Cartesian3} [center=Cartesian3.ZERO]
   * @param {Number} [minimumHeight] The minimum height of all vertices. If this value is undefined, all vertices are assumed to be above the ellipsoid.
   * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
   * @returns {Cartesian3} The computed horizon culling point, expressed in the possibly-shrunk ellipsoid-scaled space.
   */
  EllipsoidalOccluder.prototype.computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid = function (
    directionToPoint,
    vertices,
    stride,
    center,
    minimumHeight,
    result
  ) {
    const possiblyShrunkEllipsoid = getPossiblyShrunkEllipsoid(
      this._ellipsoid,
      minimumHeight,
      scratchEllipsoidShrunk
    );
    return computeHorizonCullingPointFromVertices(
      possiblyShrunkEllipsoid,
      directionToPoint,
      vertices,
      stride,
      center,
      result
    );
  };

  const subsampleScratch = [];

  /**
   * Computes a point that can be used for horizon culling of a rectangle.  If the point is below
   * the horizon, the ellipsoid-conforming rectangle is guaranteed to be below the horizon as well.
   * The returned point is expressed in the ellipsoid-scaled space and is suitable for use with
   * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
   *
   * @param {Rectangle} rectangle The rectangle for which to compute the horizon culling point.
   * @param {Ellipsoid} ellipsoid The ellipsoid on which the rectangle is defined.  This may be different from
   *                    the ellipsoid used by this instance for occlusion testing.
   * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
   * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
   */
  EllipsoidalOccluder.prototype.computeHorizonCullingPointFromRectangle = function (
    rectangle,
    ellipsoid,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');

    const positions = Matrix2.Rectangle.subsample(
      rectangle,
      ellipsoid,
      0.0,
      subsampleScratch
    );
    const bs = Transforms.BoundingSphere.fromPoints(positions);

    // If the bounding sphere center is too close to the center of the occluder, it doesn't make
    // sense to try to horizon cull it.
    if (Matrix3.Cartesian3.magnitude(bs.center) < 0.1 * ellipsoid.minimumRadius) {
      return undefined;
    }

    return this.computeHorizonCullingPoint(bs.center, positions, result);
  };

  const scratchEllipsoidShrunkRadii = new Matrix3.Cartesian3();

  function getPossiblyShrunkEllipsoid(ellipsoid, minimumHeight, result) {
    if (
      defaultValue.defined(minimumHeight) &&
      minimumHeight < 0.0 &&
      ellipsoid.minimumRadius > -minimumHeight
    ) {
      const ellipsoidShrunkRadii = Matrix3.Cartesian3.fromElements(
        ellipsoid.radii.x + minimumHeight,
        ellipsoid.radii.y + minimumHeight,
        ellipsoid.radii.z + minimumHeight,
        scratchEllipsoidShrunkRadii
      );
      ellipsoid = Matrix3.Ellipsoid.fromCartesian3(ellipsoidShrunkRadii, result);
    }
    return ellipsoid;
  }

  function computeHorizonCullingPointFromPositions(
    ellipsoid,
    directionToPoint,
    positions,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("directionToPoint", directionToPoint);
    Check.Check.defined("positions", positions);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Matrix3.Cartesian3();
    }

    const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(
      ellipsoid,
      directionToPoint
    );
    let resultMagnitude = 0.0;

    for (let i = 0, len = positions.length; i < len; ++i) {
      const position = positions[i];
      const candidateMagnitude = computeMagnitude(
        ellipsoid,
        position,
        scaledSpaceDirectionToPoint
      );
      if (candidateMagnitude < 0.0) {
        // all points should face the same direction, but this one doesn't, so return undefined
        return undefined;
      }
      resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
    }

    return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result);
  }

  const positionScratch = new Matrix3.Cartesian3();

  function computeHorizonCullingPointFromVertices(
    ellipsoid,
    directionToPoint,
    vertices,
    stride,
    center,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("directionToPoint", directionToPoint);
    Check.Check.defined("vertices", vertices);
    Check.Check.typeOf.number("stride", stride);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Matrix3.Cartesian3();
    }

    stride = defaultValue.defaultValue(stride, 3);
    center = defaultValue.defaultValue(center, Matrix3.Cartesian3.ZERO);
    const scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(
      ellipsoid,
      directionToPoint
    );
    let resultMagnitude = 0.0;

    for (let i = 0, len = vertices.length; i < len; i += stride) {
      positionScratch.x = vertices[i] + center.x;
      positionScratch.y = vertices[i + 1] + center.y;
      positionScratch.z = vertices[i + 2] + center.z;

      const candidateMagnitude = computeMagnitude(
        ellipsoid,
        positionScratch,
        scaledSpaceDirectionToPoint
      );
      if (candidateMagnitude < 0.0) {
        // all points should face the same direction, but this one doesn't, so return undefined
        return undefined;
      }
      resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
    }

    return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result);
  }

  function isScaledSpacePointVisible(
    occludeeScaledSpacePosition,
    cameraPositionInScaledSpace,
    distanceToLimbInScaledSpaceSquared
  ) {
    // See https://cesium.com/blog/2013/04/25/Horizon-culling/
    const cv = cameraPositionInScaledSpace;
    const vhMagnitudeSquared = distanceToLimbInScaledSpaceSquared;
    const vt = Matrix3.Cartesian3.subtract(
      occludeeScaledSpacePosition,
      cv,
      scratchCartesian
    );
    const vtDotVc = -Matrix3.Cartesian3.dot(vt, cv);
    // If vhMagnitudeSquared < 0 then we are below the surface of the ellipsoid and
    // in this case, set the culling plane to be on V.
    const isOccluded =
      vhMagnitudeSquared < 0
        ? vtDotVc > 0
        : vtDotVc > vhMagnitudeSquared &&
          (vtDotVc * vtDotVc) / Matrix3.Cartesian3.magnitudeSquared(vt) >
            vhMagnitudeSquared;
    return !isOccluded;
  }

  const scaledSpaceScratch = new Matrix3.Cartesian3();
  const directionScratch = new Matrix3.Cartesian3();

  function computeMagnitude(ellipsoid, position, scaledSpaceDirectionToPoint) {
    const scaledSpacePosition = ellipsoid.transformPositionToScaledSpace(
      position,
      scaledSpaceScratch
    );
    let magnitudeSquared = Matrix3.Cartesian3.magnitudeSquared(scaledSpacePosition);
    let magnitude = Math.sqrt(magnitudeSquared);
    const direction = Matrix3.Cartesian3.divideByScalar(
      scaledSpacePosition,
      magnitude,
      directionScratch
    );

    // For the purpose of this computation, points below the ellipsoid are consider to be on it instead.
    magnitudeSquared = Math.max(1.0, magnitudeSquared);
    magnitude = Math.max(1.0, magnitude);

    const cosAlpha = Matrix3.Cartesian3.dot(direction, scaledSpaceDirectionToPoint);
    const sinAlpha = Matrix3.Cartesian3.magnitude(
      Matrix3.Cartesian3.cross(direction, scaledSpaceDirectionToPoint, direction)
    );
    const cosBeta = 1.0 / magnitude;
    const sinBeta = Math.sqrt(magnitudeSquared - 1.0) * cosBeta;

    return 1.0 / (cosAlpha * cosBeta - sinAlpha * sinBeta);
  }

  function magnitudeToPoint(
    scaledSpaceDirectionToPoint,
    resultMagnitude,
    result
  ) {
    // The horizon culling point is undefined if there were no positions from which to compute it,
    // the directionToPoint is pointing opposite all of the positions,  or if we computed NaN or infinity.
    if (
      resultMagnitude <= 0.0 ||
      resultMagnitude === 1.0 / 0.0 ||
      resultMagnitude !== resultMagnitude
    ) {
      return undefined;
    }

    return Matrix3.Cartesian3.multiplyByScalar(
      scaledSpaceDirectionToPoint,
      resultMagnitude,
      result
    );
  }

  const directionToPointScratch = new Matrix3.Cartesian3();

  function computeScaledSpaceDirectionToPoint(ellipsoid, directionToPoint) {
    if (Matrix3.Cartesian3.equals(directionToPoint, Matrix3.Cartesian3.ZERO)) {
      return directionToPoint;
    }

    ellipsoid.transformPositionToScaledSpace(
      directionToPoint,
      directionToPointScratch
    );
    return Matrix3.Cartesian3.normalize(directionToPointScratch, directionToPointScratch);
  }

  /**
   * @private
   */
  const TerrainExaggeration = {};

  /**
   * Scales a height relative to an offset.
   *
   * @param {Number} height The height.
   * @param {Number} scale A scalar used to exaggerate the terrain. If the value is 1.0 there will be no effect.
   * @param {Number} relativeHeight The height relative to which terrain is exaggerated. If the value is 0.0 terrain will be exaggerated relative to the ellipsoid surface.
   */
  TerrainExaggeration.getHeight = function (height, scale, relativeHeight) {
    return (height - relativeHeight) * scale + relativeHeight;
  };

  const scratchCartographic = new Matrix3.Cartesian3();

  /**
   * Scales a position by exaggeration.
   */
  TerrainExaggeration.getPosition = function (
    position,
    ellipsoid,
    terrainExaggeration,
    terrainExaggerationRelativeHeight,
    result
  ) {
    const cartographic = ellipsoid.cartesianToCartographic(
      position,
      scratchCartographic
    );
    const newHeight = TerrainExaggeration.getHeight(
      cartographic.height,
      terrainExaggeration,
      terrainExaggerationRelativeHeight
    );
    return Matrix3.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      newHeight,
      ellipsoid,
      result
    );
  };

  var TerrainExaggeration$1 = TerrainExaggeration;

  /**
   * This enumerated type is used to determine how the vertices of the terrain mesh are compressed.
   *
   * @enum {Number}
   *
   * @private
   */
  const TerrainQuantization = {
    /**
     * The vertices are not compressed.
     *
     * @type {Number}
     * @constant
     */
    NONE: 0,

    /**
     * The vertices are compressed to 12 bits.
     *
     * @type {Number}
     * @constant
     */
    BITS12: 1,
  };
  var TerrainQuantization$1 = Object.freeze(TerrainQuantization);

  const cartesian3Scratch = new Matrix3.Cartesian3();
  const cartesian3DimScratch = new Matrix3.Cartesian3();
  const cartesian2Scratch = new Matrix2.Cartesian2();
  const matrix4Scratch = new Matrix2.Matrix4();
  const matrix4Scratch2 = new Matrix2.Matrix4();

  const SHIFT_LEFT_12 = Math.pow(2.0, 12.0);

  /**
   * Data used to quantize and pack the terrain mesh. The position can be unpacked for picking and all attributes
   * are unpacked in the vertex shader.
   *
   * @alias TerrainEncoding
   * @constructor
   *
   * @param {Cartesian3} center The center point of the vertices.
   * @param {AxisAlignedBoundingBox} axisAlignedBoundingBox The bounds of the tile in the east-north-up coordinates at the tiles center.
   * @param {Number} minimumHeight The minimum height.
   * @param {Number} maximumHeight The maximum height.
   * @param {Matrix4} fromENU The east-north-up to fixed frame matrix at the center of the terrain mesh.
   * @param {Boolean} hasVertexNormals If the mesh has vertex normals.
   * @param {Boolean} [hasWebMercatorT=false] true if the terrain data includes a Web Mercator texture coordinate; otherwise, false.
   * @param {Boolean} [hasGeodeticSurfaceNormals=false] true if the terrain data includes geodetic surface normals; otherwise, false.
   * @param {Number} [exaggeration=1.0] A scalar used to exaggerate terrain.
   * @param {Number} [exaggerationRelativeHeight=0.0] The relative height from which terrain is exaggerated.
   *
   * @private
   */
  function TerrainEncoding(
    center,
    axisAlignedBoundingBox,
    minimumHeight,
    maximumHeight,
    fromENU,
    hasVertexNormals,
    hasWebMercatorT,
    hasGeodeticSurfaceNormals,
    exaggeration,
    exaggerationRelativeHeight
  ) {
    let quantization = TerrainQuantization$1.NONE;
    let toENU;
    let matrix;

    if (
      defaultValue.defined(axisAlignedBoundingBox) &&
      defaultValue.defined(minimumHeight) &&
      defaultValue.defined(maximumHeight) &&
      defaultValue.defined(fromENU)
    ) {
      const minimum = axisAlignedBoundingBox.minimum;
      const maximum = axisAlignedBoundingBox.maximum;

      const dimensions = Matrix3.Cartesian3.subtract(
        maximum,
        minimum,
        cartesian3DimScratch
      );
      const hDim = maximumHeight - minimumHeight;
      const maxDim = Math.max(Matrix3.Cartesian3.maximumComponent(dimensions), hDim);

      if (maxDim < SHIFT_LEFT_12 - 1.0) {
        quantization = TerrainQuantization$1.BITS12;
      } else {
        quantization = TerrainQuantization$1.NONE;
      }

      toENU = Matrix2.Matrix4.inverseTransformation(fromENU, new Matrix2.Matrix4());

      const translation = Matrix3.Cartesian3.negate(minimum, cartesian3Scratch);
      Matrix2.Matrix4.multiply(
        Matrix2.Matrix4.fromTranslation(translation, matrix4Scratch),
        toENU,
        toENU
      );

      const scale = cartesian3Scratch;
      scale.x = 1.0 / dimensions.x;
      scale.y = 1.0 / dimensions.y;
      scale.z = 1.0 / dimensions.z;
      Matrix2.Matrix4.multiply(Matrix2.Matrix4.fromScale(scale, matrix4Scratch), toENU, toENU);

      matrix = Matrix2.Matrix4.clone(fromENU);
      Matrix2.Matrix4.setTranslation(matrix, Matrix3.Cartesian3.ZERO, matrix);

      fromENU = Matrix2.Matrix4.clone(fromENU, new Matrix2.Matrix4());

      const translationMatrix = Matrix2.Matrix4.fromTranslation(minimum, matrix4Scratch);
      const scaleMatrix = Matrix2.Matrix4.fromScale(dimensions, matrix4Scratch2);
      const st = Matrix2.Matrix4.multiply(translationMatrix, scaleMatrix, matrix4Scratch);

      Matrix2.Matrix4.multiply(fromENU, st, fromENU);
      Matrix2.Matrix4.multiply(matrix, st, matrix);
    }

    /**
     * How the vertices of the mesh were compressed.
     * @type {TerrainQuantization}
     */
    this.quantization = quantization;

    /**
     * The minimum height of the tile including the skirts.
     * @type {Number}
     */
    this.minimumHeight = minimumHeight;

    /**
     * The maximum height of the tile.
     * @type {Number}
     */
    this.maximumHeight = maximumHeight;

    /**
     * The center of the tile.
     * @type {Cartesian3}
     */
    this.center = Matrix3.Cartesian3.clone(center);

    /**
     * A matrix that takes a vertex from the tile, transforms it to east-north-up at the center and scales
     * it so each component is in the [0, 1] range.
     * @type {Matrix4}
     */
    this.toScaledENU = toENU;

    /**
     * A matrix that restores a vertex transformed with toScaledENU back to the earth fixed reference frame
     * @type {Matrix4}
     */
    this.fromScaledENU = fromENU;

    /**
     * The matrix used to decompress the terrain vertices in the shader for RTE rendering.
     * @type {Matrix4}
     */
    this.matrix = matrix;

    /**
     * The terrain mesh contains normals.
     * @type {Boolean}
     */
    this.hasVertexNormals = hasVertexNormals;

    /**
     * The terrain mesh contains a vertical texture coordinate following the Web Mercator projection.
     * @type {Boolean}
     */
    this.hasWebMercatorT = defaultValue.defaultValue(hasWebMercatorT, false);

    /**
     * The terrain mesh contains geodetic surface normals, used for terrain exaggeration.
     * @type {Boolean}
     */
    this.hasGeodeticSurfaceNormals = defaultValue.defaultValue(
      hasGeodeticSurfaceNormals,
      false
    );

    /**
     * A scalar used to exaggerate terrain.
     * @type {Number}
     */
    this.exaggeration = defaultValue.defaultValue(exaggeration, 1.0);

    /**
     * The relative height from which terrain is exaggerated.
     */
    this.exaggerationRelativeHeight = defaultValue.defaultValue(
      exaggerationRelativeHeight,
      0.0
    );

    /**
     * The number of components in each vertex. This value can differ with different quantizations.
     * @type {Number}
     */
    this.stride = 0;

    this._offsetGeodeticSurfaceNormal = 0;
    this._offsetVertexNormal = 0;

    // Calculate the stride and offsets declared above
    this._calculateStrideAndOffsets();
  }

  TerrainEncoding.prototype.encode = function (
    vertexBuffer,
    bufferIndex,
    position,
    uv,
    height,
    normalToPack,
    webMercatorT,
    geodeticSurfaceNormal
  ) {
    const u = uv.x;
    const v = uv.y;

    if (this.quantization === TerrainQuantization$1.BITS12) {
      position = Matrix2.Matrix4.multiplyByPoint(
        this.toScaledENU,
        position,
        cartesian3Scratch
      );

      position.x = Math$1.CesiumMath.clamp(position.x, 0.0, 1.0);
      position.y = Math$1.CesiumMath.clamp(position.y, 0.0, 1.0);
      position.z = Math$1.CesiumMath.clamp(position.z, 0.0, 1.0);

      const hDim = this.maximumHeight - this.minimumHeight;
      const h = Math$1.CesiumMath.clamp((height - this.minimumHeight) / hDim, 0.0, 1.0);

      Matrix2.Cartesian2.fromElements(position.x, position.y, cartesian2Scratch);
      const compressed0 = AttributeCompression.AttributeCompression.compressTextureCoordinates(
        cartesian2Scratch
      );

      Matrix2.Cartesian2.fromElements(position.z, h, cartesian2Scratch);
      const compressed1 = AttributeCompression.AttributeCompression.compressTextureCoordinates(
        cartesian2Scratch
      );

      Matrix2.Cartesian2.fromElements(u, v, cartesian2Scratch);
      const compressed2 = AttributeCompression.AttributeCompression.compressTextureCoordinates(
        cartesian2Scratch
      );

      vertexBuffer[bufferIndex++] = compressed0;
      vertexBuffer[bufferIndex++] = compressed1;
      vertexBuffer[bufferIndex++] = compressed2;

      if (this.hasWebMercatorT) {
        Matrix2.Cartesian2.fromElements(webMercatorT, 0.0, cartesian2Scratch);
        const compressed3 = AttributeCompression.AttributeCompression.compressTextureCoordinates(
          cartesian2Scratch
        );
        vertexBuffer[bufferIndex++] = compressed3;
      }
    } else {
      Matrix3.Cartesian3.subtract(position, this.center, cartesian3Scratch);

      vertexBuffer[bufferIndex++] = cartesian3Scratch.x;
      vertexBuffer[bufferIndex++] = cartesian3Scratch.y;
      vertexBuffer[bufferIndex++] = cartesian3Scratch.z;
      vertexBuffer[bufferIndex++] = height;
      vertexBuffer[bufferIndex++] = u;
      vertexBuffer[bufferIndex++] = v;

      if (this.hasWebMercatorT) {
        vertexBuffer[bufferIndex++] = webMercatorT;
      }
    }

    if (this.hasVertexNormals) {
      vertexBuffer[bufferIndex++] = AttributeCompression.AttributeCompression.octPackFloat(
        normalToPack
      );
    }

    if (this.hasGeodeticSurfaceNormals) {
      vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.x;
      vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.y;
      vertexBuffer[bufferIndex++] = geodeticSurfaceNormal.z;
    }

    return bufferIndex;
  };

  const scratchPosition = new Matrix3.Cartesian3();
  const scratchGeodeticSurfaceNormal = new Matrix3.Cartesian3();

  TerrainEncoding.prototype.addGeodeticSurfaceNormals = function (
    oldBuffer,
    newBuffer,
    ellipsoid
  ) {
    if (this.hasGeodeticSurfaceNormals) {
      return;
    }

    const oldStride = this.stride;
    const vertexCount = oldBuffer.length / oldStride;
    this.hasGeodeticSurfaceNormals = true;
    this._calculateStrideAndOffsets();
    const newStride = this.stride;

    for (let index = 0; index < vertexCount; index++) {
      for (let offset = 0; offset < oldStride; offset++) {
        const oldIndex = index * oldStride + offset;
        const newIndex = index * newStride + offset;
        newBuffer[newIndex] = oldBuffer[oldIndex];
      }
      const position = this.decodePosition(newBuffer, index, scratchPosition);
      const geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
        position,
        scratchGeodeticSurfaceNormal
      );

      const bufferIndex = index * newStride + this._offsetGeodeticSurfaceNormal;
      newBuffer[bufferIndex] = geodeticSurfaceNormal.x;
      newBuffer[bufferIndex + 1] = geodeticSurfaceNormal.y;
      newBuffer[bufferIndex + 2] = geodeticSurfaceNormal.z;
    }
  };

  TerrainEncoding.prototype.removeGeodeticSurfaceNormals = function (
    oldBuffer,
    newBuffer
  ) {
    if (!this.hasGeodeticSurfaceNormals) {
      return;
    }

    const oldStride = this.stride;
    const vertexCount = oldBuffer.length / oldStride;
    this.hasGeodeticSurfaceNormals = false;
    this._calculateStrideAndOffsets();
    const newStride = this.stride;

    for (let index = 0; index < vertexCount; index++) {
      for (let offset = 0; offset < newStride; offset++) {
        const oldIndex = index * oldStride + offset;
        const newIndex = index * newStride + offset;
        newBuffer[newIndex] = oldBuffer[oldIndex];
      }
    }
  };

  TerrainEncoding.prototype.decodePosition = function (buffer, index, result) {
    if (!defaultValue.defined(result)) {
      result = new Matrix3.Cartesian3();
    }

    index *= this.stride;

    if (this.quantization === TerrainQuantization$1.BITS12) {
      const xy = AttributeCompression.AttributeCompression.decompressTextureCoordinates(
        buffer[index],
        cartesian2Scratch
      );
      result.x = xy.x;
      result.y = xy.y;

      const zh = AttributeCompression.AttributeCompression.decompressTextureCoordinates(
        buffer[index + 1],
        cartesian2Scratch
      );
      result.z = zh.x;

      return Matrix2.Matrix4.multiplyByPoint(this.fromScaledENU, result, result);
    }

    result.x = buffer[index];
    result.y = buffer[index + 1];
    result.z = buffer[index + 2];
    return Matrix3.Cartesian3.add(result, this.center, result);
  };

  TerrainEncoding.prototype.getExaggeratedPosition = function (
    buffer,
    index,
    result
  ) {
    result = this.decodePosition(buffer, index, result);

    const exaggeration = this.exaggeration;
    const exaggerationRelativeHeight = this.exaggerationRelativeHeight;
    const hasExaggeration = exaggeration !== 1.0;
    if (hasExaggeration && this.hasGeodeticSurfaceNormals) {
      const geodeticSurfaceNormal = this.decodeGeodeticSurfaceNormal(
        buffer,
        index,
        scratchGeodeticSurfaceNormal
      );
      const rawHeight = this.decodeHeight(buffer, index);
      const heightDifference =
        TerrainExaggeration$1.getHeight(
          rawHeight,
          exaggeration,
          exaggerationRelativeHeight
        ) - rawHeight;

      // some math is unrolled for better performance
      result.x += geodeticSurfaceNormal.x * heightDifference;
      result.y += geodeticSurfaceNormal.y * heightDifference;
      result.z += geodeticSurfaceNormal.z * heightDifference;
    }

    return result;
  };

  TerrainEncoding.prototype.decodeTextureCoordinates = function (
    buffer,
    index,
    result
  ) {
    if (!defaultValue.defined(result)) {
      result = new Matrix2.Cartesian2();
    }

    index *= this.stride;

    if (this.quantization === TerrainQuantization$1.BITS12) {
      return AttributeCompression.AttributeCompression.decompressTextureCoordinates(
        buffer[index + 2],
        result
      );
    }

    return Matrix2.Cartesian2.fromElements(buffer[index + 4], buffer[index + 5], result);
  };

  TerrainEncoding.prototype.decodeHeight = function (buffer, index) {
    index *= this.stride;

    if (this.quantization === TerrainQuantization$1.BITS12) {
      const zh = AttributeCompression.AttributeCompression.decompressTextureCoordinates(
        buffer[index + 1],
        cartesian2Scratch
      );
      return (
        zh.y * (this.maximumHeight - this.minimumHeight) + this.minimumHeight
      );
    }

    return buffer[index + 3];
  };

  TerrainEncoding.prototype.decodeWebMercatorT = function (buffer, index) {
    index *= this.stride;

    if (this.quantization === TerrainQuantization$1.BITS12) {
      return AttributeCompression.AttributeCompression.decompressTextureCoordinates(
        buffer[index + 3],
        cartesian2Scratch
      ).x;
    }

    return buffer[index + 6];
  };

  TerrainEncoding.prototype.getOctEncodedNormal = function (
    buffer,
    index,
    result
  ) {
    index = index * this.stride + this._offsetVertexNormal;

    const temp = buffer[index] / 256.0;
    const x = Math.floor(temp);
    const y = (temp - x) * 256.0;

    return Matrix2.Cartesian2.fromElements(x, y, result);
  };

  TerrainEncoding.prototype.decodeGeodeticSurfaceNormal = function (
    buffer,
    index,
    result
  ) {
    index = index * this.stride + this._offsetGeodeticSurfaceNormal;

    result.x = buffer[index];
    result.y = buffer[index + 1];
    result.z = buffer[index + 2];
    return result;
  };

  TerrainEncoding.prototype._calculateStrideAndOffsets = function () {
    let vertexStride = 0;

    switch (this.quantization) {
      case TerrainQuantization$1.BITS12:
        vertexStride += 3;
        break;
      default:
        vertexStride += 6;
    }
    if (this.hasWebMercatorT) {
      vertexStride += 1;
    }
    if (this.hasVertexNormals) {
      this._offsetVertexNormal = vertexStride;
      vertexStride += 1;
    }
    if (this.hasGeodeticSurfaceNormals) {
      this._offsetGeodeticSurfaceNormal = vertexStride;
      vertexStride += 3;
    }

    this.stride = vertexStride;
  };

  const attributesIndicesNone = {
    position3DAndHeight: 0,
    textureCoordAndEncodedNormals: 1,
    geodeticSurfaceNormal: 2,
  };
  const attributesIndicesBits12 = {
    compressed0: 0,
    compressed1: 1,
    geodeticSurfaceNormal: 2,
  };

  TerrainEncoding.prototype.getAttributes = function (buffer) {
    const datatype = ComponentDatatype.ComponentDatatype.FLOAT;
    const sizeInBytes = ComponentDatatype.ComponentDatatype.getSizeInBytes(datatype);
    const strideInBytes = this.stride * sizeInBytes;
    let offsetInBytes = 0;

    const attributes = [];
    function addAttribute(index, componentsPerAttribute) {
      attributes.push({
        index: index,
        vertexBuffer: buffer,
        componentDatatype: datatype,
        componentsPerAttribute: componentsPerAttribute,
        offsetInBytes: offsetInBytes,
        strideInBytes: strideInBytes,
      });
      offsetInBytes += componentsPerAttribute * sizeInBytes;
    }

    if (this.quantization === TerrainQuantization$1.NONE) {
      addAttribute(attributesIndicesNone.position3DAndHeight, 4);

      let componentsTexCoordAndNormals = 2;
      componentsTexCoordAndNormals += this.hasWebMercatorT ? 1 : 0;
      componentsTexCoordAndNormals += this.hasVertexNormals ? 1 : 0;
      addAttribute(
        attributesIndicesNone.textureCoordAndEncodedNormals,
        componentsTexCoordAndNormals
      );

      if (this.hasGeodeticSurfaceNormals) {
        addAttribute(attributesIndicesNone.geodeticSurfaceNormal, 3);
      }
    } else {
      // When there is no webMercatorT or vertex normals, the attribute only needs 3 components: x/y, z/h, u/v.
      // WebMercatorT and vertex normals each take up one component, so if only one of them is present the first
      // attribute gets a 4th component. If both are present, we need an additional attribute that has 1 component.
      const usingAttribute0Component4 =
        this.hasWebMercatorT || this.hasVertexNormals;
      const usingAttribute1Component1 =
        this.hasWebMercatorT && this.hasVertexNormals;
      addAttribute(
        attributesIndicesBits12.compressed0,
        usingAttribute0Component4 ? 4 : 3
      );

      if (usingAttribute1Component1) {
        addAttribute(attributesIndicesBits12.compressed1, 1);
      }

      if (this.hasGeodeticSurfaceNormals) {
        addAttribute(attributesIndicesBits12.geodeticSurfaceNormal, 3);
      }
    }

    return attributes;
  };

  TerrainEncoding.prototype.getAttributeLocations = function () {
    if (this.quantization === TerrainQuantization$1.NONE) {
      return attributesIndicesNone;
    }
    return attributesIndicesBits12;
  };

  TerrainEncoding.clone = function (encoding, result) {
    if (!defaultValue.defined(encoding)) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      result = new TerrainEncoding();
    }

    result.quantization = encoding.quantization;
    result.minimumHeight = encoding.minimumHeight;
    result.maximumHeight = encoding.maximumHeight;
    result.center = Matrix3.Cartesian3.clone(encoding.center);
    result.toScaledENU = Matrix2.Matrix4.clone(encoding.toScaledENU);
    result.fromScaledENU = Matrix2.Matrix4.clone(encoding.fromScaledENU);
    result.matrix = Matrix2.Matrix4.clone(encoding.matrix);
    result.hasVertexNormals = encoding.hasVertexNormals;
    result.hasWebMercatorT = encoding.hasWebMercatorT;
    result.hasGeodeticSurfaceNormals = encoding.hasGeodeticSurfaceNormals;
    result.exaggeration = encoding.exaggeration;
    result.exaggerationRelativeHeight = encoding.exaggerationRelativeHeight;

    result._calculateStrideAndOffsets();

    return result;
  };

  exports.EllipsoidalOccluder = EllipsoidalOccluder;
  exports.TerrainEncoding = TerrainEncoding;

}));
