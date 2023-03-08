define(['exports', './Transforms-26539bce', './Matrix3-315394f6', './Matrix2-13178034', './Check-666ab1a0', './ComponentDatatype-f7b11d02', './defaultValue-0a909f67', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './Math-2dbd6b93', './Plane-900aa728', './VertexFormat-6b480673'], (function (exports, Transforms, Matrix3, Matrix2, Check, ComponentDatatype, defaultValue, GeometryAttribute, GeometryAttributes, Math$1, Plane, VertexFormat) { 'use strict';

  /**
   * The culling volume defined by planes.
   *
   * @alias CullingVolume
   * @constructor
   *
   * @param {Cartesian4[]} [planes] An array of clipping planes.
   */
  function CullingVolume(planes) {
    /**
     * Each plane is represented by a Cartesian4 object, where the x, y, and z components
     * define the unit vector normal to the plane, and the w component is the distance of the
     * plane from the origin.
     * @type {Cartesian4[]}
     * @default []
     */
    this.planes = defaultValue.defaultValue(planes, []);
  }

  const faces = [new Matrix3.Cartesian3(), new Matrix3.Cartesian3(), new Matrix3.Cartesian3()];
  Matrix3.Cartesian3.clone(Matrix3.Cartesian3.UNIT_X, faces[0]);
  Matrix3.Cartesian3.clone(Matrix3.Cartesian3.UNIT_Y, faces[1]);
  Matrix3.Cartesian3.clone(Matrix3.Cartesian3.UNIT_Z, faces[2]);

  const scratchPlaneCenter = new Matrix3.Cartesian3();
  const scratchPlaneNormal = new Matrix3.Cartesian3();
  const scratchPlane = new Plane.Plane(new Matrix3.Cartesian3(1.0, 0.0, 0.0), 0.0);

  /**
   * Constructs a culling volume from a bounding sphere. Creates six planes that create a box containing the sphere.
   * The planes are aligned to the x, y, and z axes in world coordinates.
   *
   * @param {BoundingSphere} boundingSphere The bounding sphere used to create the culling volume.
   * @param {CullingVolume} [result] The object onto which to store the result.
   * @returns {CullingVolume} The culling volume created from the bounding sphere.
   */
  CullingVolume.fromBoundingSphere = function (boundingSphere, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(boundingSphere)) {
      throw new Check.DeveloperError("boundingSphere is required.");
    }
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new CullingVolume();
    }

    const length = faces.length;
    const planes = result.planes;
    planes.length = 2 * length;

    const center = boundingSphere.center;
    const radius = boundingSphere.radius;

    let planeIndex = 0;

    for (let i = 0; i < length; ++i) {
      const faceNormal = faces[i];

      let plane0 = planes[planeIndex];
      let plane1 = planes[planeIndex + 1];

      if (!defaultValue.defined(plane0)) {
        plane0 = planes[planeIndex] = new Matrix2.Cartesian4();
      }
      if (!defaultValue.defined(plane1)) {
        plane1 = planes[planeIndex + 1] = new Matrix2.Cartesian4();
      }

      Matrix3.Cartesian3.multiplyByScalar(faceNormal, -radius, scratchPlaneCenter);
      Matrix3.Cartesian3.add(center, scratchPlaneCenter, scratchPlaneCenter);

      plane0.x = faceNormal.x;
      plane0.y = faceNormal.y;
      plane0.z = faceNormal.z;
      plane0.w = -Matrix3.Cartesian3.dot(faceNormal, scratchPlaneCenter);

      Matrix3.Cartesian3.multiplyByScalar(faceNormal, radius, scratchPlaneCenter);
      Matrix3.Cartesian3.add(center, scratchPlaneCenter, scratchPlaneCenter);

      plane1.x = -faceNormal.x;
      plane1.y = -faceNormal.y;
      plane1.z = -faceNormal.z;
      plane1.w = -Matrix3.Cartesian3.dot(
        Matrix3.Cartesian3.negate(faceNormal, scratchPlaneNormal),
        scratchPlaneCenter
      );

      planeIndex += 2;
    }

    return result;
  };

  /**
   * Determines whether a bounding volume intersects the culling volume.
   *
   * @param {Object} boundingVolume The bounding volume whose intersection with the culling volume is to be tested.
   * @returns {Intersect}  Intersect.OUTSIDE, Intersect.INTERSECTING, or Intersect.INSIDE.
   */
  CullingVolume.prototype.computeVisibility = function (boundingVolume) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(boundingVolume)) {
      throw new Check.DeveloperError("boundingVolume is required.");
    }
    //>>includeEnd('debug');

    const planes = this.planes;
    let intersecting = false;
    for (let k = 0, len = planes.length; k < len; ++k) {
      const result = boundingVolume.intersectPlane(
        Plane.Plane.fromCartesian4(planes[k], scratchPlane)
      );
      if (result === Transforms.Intersect.OUTSIDE) {
        return Transforms.Intersect.OUTSIDE;
      } else if (result === Transforms.Intersect.INTERSECTING) {
        intersecting = true;
      }
    }

    return intersecting ? Transforms.Intersect.INTERSECTING : Transforms.Intersect.INSIDE;
  };

  /**
   * Determines whether a bounding volume intersects the culling volume.
   *
   * @param {Object} boundingVolume The bounding volume whose intersection with the culling volume is to be tested.
   * @param {Number} parentPlaneMask A bit mask from the boundingVolume's parent's check against the same culling
   *                                 volume, such that if (planeMask & (1 << planeIndex) === 0), for k < 31, then
   *                                 the parent (and therefore this) volume is completely inside plane[planeIndex]
   *                                 and that plane check can be skipped.
   * @returns {Number} A plane mask as described above (which can be applied to this boundingVolume's children).
   *
   * @private
   */
  CullingVolume.prototype.computeVisibilityWithPlaneMask = function (
    boundingVolume,
    parentPlaneMask
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(boundingVolume)) {
      throw new Check.DeveloperError("boundingVolume is required.");
    }
    if (!defaultValue.defined(parentPlaneMask)) {
      throw new Check.DeveloperError("parentPlaneMask is required.");
    }
    //>>includeEnd('debug');

    if (
      parentPlaneMask === CullingVolume.MASK_OUTSIDE ||
      parentPlaneMask === CullingVolume.MASK_INSIDE
    ) {
      // parent is completely outside or completely inside, so this child is as well.
      return parentPlaneMask;
    }

    // Start with MASK_INSIDE (all zeros) so that after the loop, the return value can be compared with MASK_INSIDE.
    // (Because if there are fewer than 31 planes, the upper bits wont be changed.)
    let mask = CullingVolume.MASK_INSIDE;

    const planes = this.planes;
    for (let k = 0, len = planes.length; k < len; ++k) {
      // For k greater than 31 (since 31 is the maximum number of INSIDE/INTERSECTING bits we can store), skip the optimization.
      const flag = k < 31 ? 1 << k : 0;
      if (k < 31 && (parentPlaneMask & flag) === 0) {
        // boundingVolume is known to be INSIDE this plane.
        continue;
      }

      const result = boundingVolume.intersectPlane(
        Plane.Plane.fromCartesian4(planes[k], scratchPlane)
      );
      if (result === Transforms.Intersect.OUTSIDE) {
        return CullingVolume.MASK_OUTSIDE;
      } else if (result === Transforms.Intersect.INTERSECTING) {
        mask |= flag;
      }
    }

    return mask;
  };

  /**
   * For plane masks (as used in {@link CullingVolume#computeVisibilityWithPlaneMask}), this special value
   * represents the case where the object bounding volume is entirely outside the culling volume.
   *
   * @type {Number}
   * @private
   */
  CullingVolume.MASK_OUTSIDE = 0xffffffff;

  /**
   * For plane masks (as used in {@link CullingVolume.prototype.computeVisibilityWithPlaneMask}), this value
   * represents the case where the object bounding volume is entirely inside the culling volume.
   *
   * @type {Number}
   * @private
   */
  CullingVolume.MASK_INSIDE = 0x00000000;

  /**
   * For plane masks (as used in {@link CullingVolume.prototype.computeVisibilityWithPlaneMask}), this value
   * represents the case where the object bounding volume (may) intersect all planes of the culling volume.
   *
   * @type {Number}
   * @private
   */
  CullingVolume.MASK_INDETERMINATE = 0x7fffffff;

  /**
   * The viewing frustum is defined by 6 planes.
   * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
   * define the unit vector normal to the plane, and the w component is the distance of the
   * plane from the origin/camera position.
   *
   * @alias OrthographicOffCenterFrustum
   * @constructor
   *
   * @param {Object} [options] An object with the following properties:
   * @param {Number} [options.left] The left clipping plane distance.
   * @param {Number} [options.right] The right clipping plane distance.
   * @param {Number} [options.top] The top clipping plane distance.
   * @param {Number} [options.bottom] The bottom clipping plane distance.
   * @param {Number} [options.near=1.0] The near clipping plane distance.
   * @param {Number} [options.far=500000000.0] The far clipping plane distance.
   *
   * @example
   * const maxRadii = ellipsoid.maximumRadius;
   *
   * const frustum = new Cesium.OrthographicOffCenterFrustum();
   * frustum.right = maxRadii * Cesium.Math.PI;
   * frustum.left = -c.frustum.right;
   * frustum.top = c.frustum.right * (canvas.clientHeight / canvas.clientWidth);
   * frustum.bottom = -c.frustum.top;
   * frustum.near = 0.01 * maxRadii;
   * frustum.far = 50.0 * maxRadii;
   */
  function OrthographicOffCenterFrustum(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    /**
     * The left clipping plane.
     * @type {Number}
     * @default undefined
     */
    this.left = options.left;
    this._left = undefined;

    /**
     * The right clipping plane.
     * @type {Number}
     * @default undefined
     */
    this.right = options.right;
    this._right = undefined;

    /**
     * The top clipping plane.
     * @type {Number}
     * @default undefined
     */
    this.top = options.top;
    this._top = undefined;

    /**
     * The bottom clipping plane.
     * @type {Number}
     * @default undefined
     */
    this.bottom = options.bottom;
    this._bottom = undefined;

    /**
     * The distance of the near plane.
     * @type {Number}
     * @default 1.0
     */
    this.near = defaultValue.defaultValue(options.near, 1.0);
    this._near = this.near;

    /**
     * The distance of the far plane.
     * @type {Number}
     * @default 500000000.0;
     */
    this.far = defaultValue.defaultValue(options.far, 500000000.0);
    this._far = this.far;

    this._cullingVolume = new CullingVolume();
    this._orthographicMatrix = new Matrix2.Matrix4();
  }

  function update$3(frustum) {
    //>>includeStart('debug', pragmas.debug);
    if (
      !defaultValue.defined(frustum.right) ||
      !defaultValue.defined(frustum.left) ||
      !defaultValue.defined(frustum.top) ||
      !defaultValue.defined(frustum.bottom) ||
      !defaultValue.defined(frustum.near) ||
      !defaultValue.defined(frustum.far)
    ) {
      throw new Check.DeveloperError(
        "right, left, top, bottom, near, or far parameters are not set."
      );
    }
    //>>includeEnd('debug');

    if (
      frustum.top !== frustum._top ||
      frustum.bottom !== frustum._bottom ||
      frustum.left !== frustum._left ||
      frustum.right !== frustum._right ||
      frustum.near !== frustum._near ||
      frustum.far !== frustum._far
    ) {
      //>>includeStart('debug', pragmas.debug);
      if (frustum.left > frustum.right) {
        throw new Check.DeveloperError("right must be greater than left.");
      }
      if (frustum.bottom > frustum.top) {
        throw new Check.DeveloperError("top must be greater than bottom.");
      }
      if (frustum.near <= 0 || frustum.near > frustum.far) {
        throw new Check.DeveloperError(
          "near must be greater than zero and less than far."
        );
      }
      //>>includeEnd('debug');

      frustum._left = frustum.left;
      frustum._right = frustum.right;
      frustum._top = frustum.top;
      frustum._bottom = frustum.bottom;
      frustum._near = frustum.near;
      frustum._far = frustum.far;
      frustum._orthographicMatrix = Matrix2.Matrix4.computeOrthographicOffCenter(
        frustum.left,
        frustum.right,
        frustum.bottom,
        frustum.top,
        frustum.near,
        frustum.far,
        frustum._orthographicMatrix
      );
    }
  }

  Object.defineProperties(OrthographicOffCenterFrustum.prototype, {
    /**
     * Gets the orthographic projection matrix computed from the view frustum.
     * @memberof OrthographicOffCenterFrustum.prototype
     * @type {Matrix4}
     * @readonly
     */
    projectionMatrix: {
      get: function () {
        update$3(this);
        return this._orthographicMatrix;
      },
    },
  });

  const getPlanesRight$1 = new Matrix3.Cartesian3();
  const getPlanesNearCenter$1 = new Matrix3.Cartesian3();
  const getPlanesPoint = new Matrix3.Cartesian3();
  const negateScratch = new Matrix3.Cartesian3();

  /**
   * Creates a culling volume for this frustum.
   *
   * @param {Cartesian3} position The eye position.
   * @param {Cartesian3} direction The view direction.
   * @param {Cartesian3} up The up direction.
   * @returns {CullingVolume} A culling volume at the given position and orientation.
   *
   * @example
   * // Check if a bounding volume intersects the frustum.
   * const cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
   * const intersect = cullingVolume.computeVisibility(boundingVolume);
   */
  OrthographicOffCenterFrustum.prototype.computeCullingVolume = function (
    position,
    direction,
    up
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(position)) {
      throw new Check.DeveloperError("position is required.");
    }
    if (!defaultValue.defined(direction)) {
      throw new Check.DeveloperError("direction is required.");
    }
    if (!defaultValue.defined(up)) {
      throw new Check.DeveloperError("up is required.");
    }
    //>>includeEnd('debug');

    const planes = this._cullingVolume.planes;
    const t = this.top;
    const b = this.bottom;
    const r = this.right;
    const l = this.left;
    const n = this.near;
    const f = this.far;

    const right = Matrix3.Cartesian3.cross(direction, up, getPlanesRight$1);
    Matrix3.Cartesian3.normalize(right, right);
    const nearCenter = getPlanesNearCenter$1;
    Matrix3.Cartesian3.multiplyByScalar(direction, n, nearCenter);
    Matrix3.Cartesian3.add(position, nearCenter, nearCenter);

    const point = getPlanesPoint;

    // Left plane
    Matrix3.Cartesian3.multiplyByScalar(right, l, point);
    Matrix3.Cartesian3.add(nearCenter, point, point);

    let plane = planes[0];
    if (!defaultValue.defined(plane)) {
      plane = planes[0] = new Matrix2.Cartesian4();
    }
    plane.x = right.x;
    plane.y = right.y;
    plane.z = right.z;
    plane.w = -Matrix3.Cartesian3.dot(right, point);

    // Right plane
    Matrix3.Cartesian3.multiplyByScalar(right, r, point);
    Matrix3.Cartesian3.add(nearCenter, point, point);

    plane = planes[1];
    if (!defaultValue.defined(plane)) {
      plane = planes[1] = new Matrix2.Cartesian4();
    }
    plane.x = -right.x;
    plane.y = -right.y;
    plane.z = -right.z;
    plane.w = -Matrix3.Cartesian3.dot(Matrix3.Cartesian3.negate(right, negateScratch), point);

    // Bottom plane
    Matrix3.Cartesian3.multiplyByScalar(up, b, point);
    Matrix3.Cartesian3.add(nearCenter, point, point);

    plane = planes[2];
    if (!defaultValue.defined(plane)) {
      plane = planes[2] = new Matrix2.Cartesian4();
    }
    plane.x = up.x;
    plane.y = up.y;
    plane.z = up.z;
    plane.w = -Matrix3.Cartesian3.dot(up, point);

    // Top plane
    Matrix3.Cartesian3.multiplyByScalar(up, t, point);
    Matrix3.Cartesian3.add(nearCenter, point, point);

    plane = planes[3];
    if (!defaultValue.defined(plane)) {
      plane = planes[3] = new Matrix2.Cartesian4();
    }
    plane.x = -up.x;
    plane.y = -up.y;
    plane.z = -up.z;
    plane.w = -Matrix3.Cartesian3.dot(Matrix3.Cartesian3.negate(up, negateScratch), point);

    // Near plane
    plane = planes[4];
    if (!defaultValue.defined(plane)) {
      plane = planes[4] = new Matrix2.Cartesian4();
    }
    plane.x = direction.x;
    plane.y = direction.y;
    plane.z = direction.z;
    plane.w = -Matrix3.Cartesian3.dot(direction, nearCenter);

    // Far plane
    Matrix3.Cartesian3.multiplyByScalar(direction, f, point);
    Matrix3.Cartesian3.add(position, point, point);

    plane = planes[5];
    if (!defaultValue.defined(plane)) {
      plane = planes[5] = new Matrix2.Cartesian4();
    }
    plane.x = -direction.x;
    plane.y = -direction.y;
    plane.z = -direction.z;
    plane.w = -Matrix3.Cartesian3.dot(Matrix3.Cartesian3.negate(direction, negateScratch), point);

    return this._cullingVolume;
  };

  /**
   * Returns the pixel's width and height in meters.
   *
   * @param {Number} drawingBufferWidth The width of the drawing buffer.
   * @param {Number} drawingBufferHeight The height of the drawing buffer.
   * @param {Number} distance The distance to the near plane in meters.
   * @param {Number} pixelRatio The scaling factor from pixel space to coordinate space.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new instance of {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
   *
   * @exception {DeveloperError} drawingBufferWidth must be greater than zero.
   * @exception {DeveloperError} drawingBufferHeight must be greater than zero.
   * @exception {DeveloperError} pixelRatio must be greater than zero.
   *
   * @example
   * // Example 1
   * // Get the width and height of a pixel.
   * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 0.0, scene.pixelRatio, new Cesium.Cartesian2());
   */
  OrthographicOffCenterFrustum.prototype.getPixelDimensions = function (
    drawingBufferWidth,
    drawingBufferHeight,
    distance,
    pixelRatio,
    result
  ) {
    update$3(this);

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(drawingBufferWidth) || !defaultValue.defined(drawingBufferHeight)) {
      throw new Check.DeveloperError(
        "Both drawingBufferWidth and drawingBufferHeight are required."
      );
    }
    if (drawingBufferWidth <= 0) {
      throw new Check.DeveloperError("drawingBufferWidth must be greater than zero.");
    }
    if (drawingBufferHeight <= 0) {
      throw new Check.DeveloperError("drawingBufferHeight must be greater than zero.");
    }
    if (!defaultValue.defined(distance)) {
      throw new Check.DeveloperError("distance is required.");
    }
    if (!defaultValue.defined(pixelRatio)) {
      throw new Check.DeveloperError("pixelRatio is required.");
    }
    if (pixelRatio <= 0) {
      throw new Check.DeveloperError("pixelRatio must be greater than zero.");
    }
    if (!defaultValue.defined(result)) {
      throw new Check.DeveloperError("A result object is required.");
    }
    //>>includeEnd('debug');

    const frustumWidth = this.right - this.left;
    const frustumHeight = this.top - this.bottom;
    const pixelWidth = (pixelRatio * frustumWidth) / drawingBufferWidth;
    const pixelHeight = (pixelRatio * frustumHeight) / drawingBufferHeight;

    result.x = pixelWidth;
    result.y = pixelHeight;
    return result;
  };

  /**
   * Returns a duplicate of a OrthographicOffCenterFrustum instance.
   *
   * @param {OrthographicOffCenterFrustum} [result] The object onto which to store the result.
   * @returns {OrthographicOffCenterFrustum} The modified result parameter or a new OrthographicOffCenterFrustum instance if one was not provided.
   */
  OrthographicOffCenterFrustum.prototype.clone = function (result) {
    if (!defaultValue.defined(result)) {
      result = new OrthographicOffCenterFrustum();
    }

    result.left = this.left;
    result.right = this.right;
    result.top = this.top;
    result.bottom = this.bottom;
    result.near = this.near;
    result.far = this.far;

    // force update of clone to compute matrices
    result._left = undefined;
    result._right = undefined;
    result._top = undefined;
    result._bottom = undefined;
    result._near = undefined;
    result._far = undefined;

    return result;
  };

  /**
   * Compares the provided OrthographicOffCenterFrustum componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {OrthographicOffCenterFrustum} [other] The right hand side OrthographicOffCenterFrustum.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  OrthographicOffCenterFrustum.prototype.equals = function (other) {
    return (
      defaultValue.defined(other) &&
      other instanceof OrthographicOffCenterFrustum &&
      this.right === other.right &&
      this.left === other.left &&
      this.top === other.top &&
      this.bottom === other.bottom &&
      this.near === other.near &&
      this.far === other.far
    );
  };

  /**
   * Compares the provided OrthographicOffCenterFrustum componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {OrthographicOffCenterFrustum} other The right hand side OrthographicOffCenterFrustum.
   * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if this and other are within the provided epsilon, <code>false</code> otherwise.
   */
  OrthographicOffCenterFrustum.prototype.equalsEpsilon = function (
    other,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    return (
      other === this ||
      (defaultValue.defined(other) &&
        other instanceof OrthographicOffCenterFrustum &&
        Math$1.CesiumMath.equalsEpsilon(
          this.right,
          other.right,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.left,
          other.left,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.top,
          other.top,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.bottom,
          other.bottom,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.near,
          other.near,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.far,
          other.far,
          relativeEpsilon,
          absoluteEpsilon
        ))
    );
  };

  /**
   * The viewing frustum is defined by 6 planes.
   * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
   * define the unit vector normal to the plane, and the w component is the distance of the
   * plane from the origin/camera position.
   *
   * @alias OrthographicFrustum
   * @constructor
   *
   * @param {Object} [options] An object with the following properties:
   * @param {Number} [options.width] The width of the frustum in meters.
   * @param {Number} [options.aspectRatio] The aspect ratio of the frustum's width to it's height.
   * @param {Number} [options.near=1.0] The distance of the near plane.
   * @param {Number} [options.far=500000000.0] The distance of the far plane.
   *
   * @example
   * const maxRadii = ellipsoid.maximumRadius;
   *
   * const frustum = new Cesium.OrthographicFrustum();
   * frustum.near = 0.01 * maxRadii;
   * frustum.far = 50.0 * maxRadii;
   */
  function OrthographicFrustum(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    this._offCenterFrustum = new OrthographicOffCenterFrustum();

    /**
     * The horizontal width of the frustum in meters.
     * @type {Number}
     * @default undefined
     */
    this.width = options.width;
    this._width = undefined;

    /**
     * The aspect ratio of the frustum's width to it's height.
     * @type {Number}
     * @default undefined
     */
    this.aspectRatio = options.aspectRatio;
    this._aspectRatio = undefined;

    /**
     * The distance of the near plane.
     * @type {Number}
     * @default 1.0
     */
    this.near = defaultValue.defaultValue(options.near, 1.0);
    this._near = this.near;

    /**
     * The distance of the far plane.
     * @type {Number}
     * @default 500000000.0;
     */
    this.far = defaultValue.defaultValue(options.far, 500000000.0);
    this._far = this.far;
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  OrthographicFrustum.packedLength = 4;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {OrthographicFrustum} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  OrthographicFrustum.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value.width;
    array[startingIndex++] = value.aspectRatio;
    array[startingIndex++] = value.near;
    array[startingIndex] = value.far;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {OrthographicFrustum} [result] The object into which to store the result.
   * @returns {OrthographicFrustum} The modified result parameter or a new OrthographicFrustum instance if one was not provided.
   */
  OrthographicFrustum.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new OrthographicFrustum();
    }

    result.width = array[startingIndex++];
    result.aspectRatio = array[startingIndex++];
    result.near = array[startingIndex++];
    result.far = array[startingIndex];

    return result;
  };

  function update$2(frustum) {
    //>>includeStart('debug', pragmas.debug);
    if (
      !defaultValue.defined(frustum.width) ||
      !defaultValue.defined(frustum.aspectRatio) ||
      !defaultValue.defined(frustum.near) ||
      !defaultValue.defined(frustum.far)
    ) {
      throw new Check.DeveloperError(
        "width, aspectRatio, near, or far parameters are not set."
      );
    }
    //>>includeEnd('debug');

    const f = frustum._offCenterFrustum;

    if (
      frustum.width !== frustum._width ||
      frustum.aspectRatio !== frustum._aspectRatio ||
      frustum.near !== frustum._near ||
      frustum.far !== frustum._far
    ) {
      //>>includeStart('debug', pragmas.debug);
      if (frustum.aspectRatio < 0) {
        throw new Check.DeveloperError("aspectRatio must be positive.");
      }
      if (frustum.near < 0 || frustum.near > frustum.far) {
        throw new Check.DeveloperError(
          "near must be greater than zero and less than far."
        );
      }
      //>>includeEnd('debug');

      frustum._aspectRatio = frustum.aspectRatio;
      frustum._width = frustum.width;
      frustum._near = frustum.near;
      frustum._far = frustum.far;

      const ratio = 1.0 / frustum.aspectRatio;
      f.right = frustum.width * 0.5;
      f.left = -f.right;
      f.top = ratio * f.right;
      f.bottom = -f.top;
      f.near = frustum.near;
      f.far = frustum.far;
    }
  }

  Object.defineProperties(OrthographicFrustum.prototype, {
    /**
     * Gets the orthographic projection matrix computed from the view frustum.
     * @memberof OrthographicFrustum.prototype
     * @type {Matrix4}
     * @readonly
     */
    projectionMatrix: {
      get: function () {
        update$2(this);
        return this._offCenterFrustum.projectionMatrix;
      },
    },
  });

  /**
   * Creates a culling volume for this frustum.
   *
   * @param {Cartesian3} position The eye position.
   * @param {Cartesian3} direction The view direction.
   * @param {Cartesian3} up The up direction.
   * @returns {CullingVolume} A culling volume at the given position and orientation.
   *
   * @example
   * // Check if a bounding volume intersects the frustum.
   * const cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
   * const intersect = cullingVolume.computeVisibility(boundingVolume);
   */
  OrthographicFrustum.prototype.computeCullingVolume = function (
    position,
    direction,
    up
  ) {
    update$2(this);
    return this._offCenterFrustum.computeCullingVolume(position, direction, up);
  };

  /**
   * Returns the pixel's width and height in meters.
   *
   * @param {Number} drawingBufferWidth The width of the drawing buffer.
   * @param {Number} drawingBufferHeight The height of the drawing buffer.
   * @param {Number} distance The distance to the near plane in meters.
   * @param {Number} pixelRatio The scaling factor from pixel space to coordinate space.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new instance of {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
   *
   * @exception {DeveloperError} drawingBufferWidth must be greater than zero.
   * @exception {DeveloperError} drawingBufferHeight must be greater than zero.
   * @exception {DeveloperError} pixelRatio must be greater than zero.
   *
   * @example
   * // Example 1
   * // Get the width and height of a pixel.
   * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 0.0, scene.pixelRatio, new Cesium.Cartesian2());
   */
  OrthographicFrustum.prototype.getPixelDimensions = function (
    drawingBufferWidth,
    drawingBufferHeight,
    distance,
    pixelRatio,
    result
  ) {
    update$2(this);
    return this._offCenterFrustum.getPixelDimensions(
      drawingBufferWidth,
      drawingBufferHeight,
      distance,
      pixelRatio,
      result
    );
  };

  /**
   * Returns a duplicate of a OrthographicFrustum instance.
   *
   * @param {OrthographicFrustum} [result] The object onto which to store the result.
   * @returns {OrthographicFrustum} The modified result parameter or a new OrthographicFrustum instance if one was not provided.
   */
  OrthographicFrustum.prototype.clone = function (result) {
    if (!defaultValue.defined(result)) {
      result = new OrthographicFrustum();
    }

    result.aspectRatio = this.aspectRatio;
    result.width = this.width;
    result.near = this.near;
    result.far = this.far;

    // force update of clone to compute matrices
    result._aspectRatio = undefined;
    result._width = undefined;
    result._near = undefined;
    result._far = undefined;

    this._offCenterFrustum.clone(result._offCenterFrustum);

    return result;
  };

  /**
   * Compares the provided OrthographicFrustum componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {OrthographicFrustum} [other] The right hand side OrthographicFrustum.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  OrthographicFrustum.prototype.equals = function (other) {
    if (!defaultValue.defined(other) || !(other instanceof OrthographicFrustum)) {
      return false;
    }

    update$2(this);
    update$2(other);

    return (
      this.width === other.width &&
      this.aspectRatio === other.aspectRatio &&
      this._offCenterFrustum.equals(other._offCenterFrustum)
    );
  };

  /**
   * Compares the provided OrthographicFrustum componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {OrthographicFrustum} other The right hand side OrthographicFrustum.
   * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if this and other are within the provided epsilon, <code>false</code> otherwise.
   */
  OrthographicFrustum.prototype.equalsEpsilon = function (
    other,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    if (!defaultValue.defined(other) || !(other instanceof OrthographicFrustum)) {
      return false;
    }

    update$2(this);
    update$2(other);

    return (
      Math$1.CesiumMath.equalsEpsilon(
        this.width,
        other.width,
        relativeEpsilon,
        absoluteEpsilon
      ) &&
      Math$1.CesiumMath.equalsEpsilon(
        this.aspectRatio,
        other.aspectRatio,
        relativeEpsilon,
        absoluteEpsilon
      ) &&
      this._offCenterFrustum.equalsEpsilon(
        other._offCenterFrustum,
        relativeEpsilon,
        absoluteEpsilon
      )
    );
  };

  /**
   * The viewing frustum is defined by 6 planes.
   * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
   * define the unit vector normal to the plane, and the w component is the distance of the
   * plane from the origin/camera position.
   *
   * @alias PerspectiveOffCenterFrustum
   * @constructor
   *
   * @param {Object} [options] An object with the following properties:
   * @param {Number} [options.left] The left clipping plane distance.
   * @param {Number} [options.right] The right clipping plane distance.
   * @param {Number} [options.top] The top clipping plane distance.
   * @param {Number} [options.bottom] The bottom clipping plane distance.
   * @param {Number} [options.near=1.0] The near clipping plane distance.
   * @param {Number} [options.far=500000000.0] The far clipping plane distance.
   *
   * @example
   * const frustum = new Cesium.PerspectiveOffCenterFrustum({
   *     left : -1.0,
   *     right : 1.0,
   *     top : 1.0,
   *     bottom : -1.0,
   *     near : 1.0,
   *     far : 100.0
   * });
   *
   * @see PerspectiveFrustum
   */
  function PerspectiveOffCenterFrustum(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    /**
     * Defines the left clipping plane.
     * @type {Number}
     * @default undefined
     */
    this.left = options.left;
    this._left = undefined;

    /**
     * Defines the right clipping plane.
     * @type {Number}
     * @default undefined
     */
    this.right = options.right;
    this._right = undefined;

    /**
     * Defines the top clipping plane.
     * @type {Number}
     * @default undefined
     */
    this.top = options.top;
    this._top = undefined;

    /**
     * Defines the bottom clipping plane.
     * @type {Number}
     * @default undefined
     */
    this.bottom = options.bottom;
    this._bottom = undefined;

    /**
     * The distance of the near plane.
     * @type {Number}
     * @default 1.0
     */
    this.near = defaultValue.defaultValue(options.near, 1.0);
    this._near = this.near;

    /**
     * The distance of the far plane.
     * @type {Number}
     * @default 500000000.0
     */
    this.far = defaultValue.defaultValue(options.far, 500000000.0);
    this._far = this.far;

    this._cullingVolume = new CullingVolume();
    this._perspectiveMatrix = new Matrix2.Matrix4();
    this._infinitePerspective = new Matrix2.Matrix4();
  }

  function update$1(frustum) {
    //>>includeStart('debug', pragmas.debug);
    if (
      !defaultValue.defined(frustum.right) ||
      !defaultValue.defined(frustum.left) ||
      !defaultValue.defined(frustum.top) ||
      !defaultValue.defined(frustum.bottom) ||
      !defaultValue.defined(frustum.near) ||
      !defaultValue.defined(frustum.far)
    ) {
      throw new Check.DeveloperError(
        "right, left, top, bottom, near, or far parameters are not set."
      );
    }
    //>>includeEnd('debug');

    const t = frustum.top;
    const b = frustum.bottom;
    const r = frustum.right;
    const l = frustum.left;
    const n = frustum.near;
    const f = frustum.far;

    if (
      t !== frustum._top ||
      b !== frustum._bottom ||
      l !== frustum._left ||
      r !== frustum._right ||
      n !== frustum._near ||
      f !== frustum._far
    ) {
      //>>includeStart('debug', pragmas.debug);
      if (frustum.near <= 0 || frustum.near > frustum.far) {
        throw new Check.DeveloperError(
          "near must be greater than zero and less than far."
        );
      }
      //>>includeEnd('debug');

      frustum._left = l;
      frustum._right = r;
      frustum._top = t;
      frustum._bottom = b;
      frustum._near = n;
      frustum._far = f;
      frustum._perspectiveMatrix = Matrix2.Matrix4.computePerspectiveOffCenter(
        l,
        r,
        b,
        t,
        n,
        f,
        frustum._perspectiveMatrix
      );
      frustum._infinitePerspective = Matrix2.Matrix4.computeInfinitePerspectiveOffCenter(
        l,
        r,
        b,
        t,
        n,
        frustum._infinitePerspective
      );
    }
  }

  Object.defineProperties(PerspectiveOffCenterFrustum.prototype, {
    /**
     * Gets the perspective projection matrix computed from the view frustum.
     * @memberof PerspectiveOffCenterFrustum.prototype
     * @type {Matrix4}
     * @readonly
     *
     * @see PerspectiveOffCenterFrustum#infiniteProjectionMatrix
     */
    projectionMatrix: {
      get: function () {
        update$1(this);
        return this._perspectiveMatrix;
      },
    },

    /**
     * Gets the perspective projection matrix computed from the view frustum with an infinite far plane.
     * @memberof PerspectiveOffCenterFrustum.prototype
     * @type {Matrix4}
     * @readonly
     *
     * @see PerspectiveOffCenterFrustum#projectionMatrix
     */
    infiniteProjectionMatrix: {
      get: function () {
        update$1(this);
        return this._infinitePerspective;
      },
    },
  });

  const getPlanesRight = new Matrix3.Cartesian3();
  const getPlanesNearCenter = new Matrix3.Cartesian3();
  const getPlanesFarCenter = new Matrix3.Cartesian3();
  const getPlanesNormal = new Matrix3.Cartesian3();
  /**
   * Creates a culling volume for this frustum.
   *
   * @param {Cartesian3} position The eye position.
   * @param {Cartesian3} direction The view direction.
   * @param {Cartesian3} up The up direction.
   * @returns {CullingVolume} A culling volume at the given position and orientation.
   *
   * @example
   * // Check if a bounding volume intersects the frustum.
   * const cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
   * const intersect = cullingVolume.computeVisibility(boundingVolume);
   */
  PerspectiveOffCenterFrustum.prototype.computeCullingVolume = function (
    position,
    direction,
    up
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(position)) {
      throw new Check.DeveloperError("position is required.");
    }

    if (!defaultValue.defined(direction)) {
      throw new Check.DeveloperError("direction is required.");
    }

    if (!defaultValue.defined(up)) {
      throw new Check.DeveloperError("up is required.");
    }
    //>>includeEnd('debug');

    const planes = this._cullingVolume.planes;

    const t = this.top;
    const b = this.bottom;
    const r = this.right;
    const l = this.left;
    const n = this.near;
    const f = this.far;

    const right = Matrix3.Cartesian3.cross(direction, up, getPlanesRight);

    const nearCenter = getPlanesNearCenter;
    Matrix3.Cartesian3.multiplyByScalar(direction, n, nearCenter);
    Matrix3.Cartesian3.add(position, nearCenter, nearCenter);

    const farCenter = getPlanesFarCenter;
    Matrix3.Cartesian3.multiplyByScalar(direction, f, farCenter);
    Matrix3.Cartesian3.add(position, farCenter, farCenter);

    const normal = getPlanesNormal;

    //Left plane computation
    Matrix3.Cartesian3.multiplyByScalar(right, l, normal);
    Matrix3.Cartesian3.add(nearCenter, normal, normal);
    Matrix3.Cartesian3.subtract(normal, position, normal);
    Matrix3.Cartesian3.normalize(normal, normal);
    Matrix3.Cartesian3.cross(normal, up, normal);
    Matrix3.Cartesian3.normalize(normal, normal);

    let plane = planes[0];
    if (!defaultValue.defined(plane)) {
      plane = planes[0] = new Matrix2.Cartesian4();
    }
    plane.x = normal.x;
    plane.y = normal.y;
    plane.z = normal.z;
    plane.w = -Matrix3.Cartesian3.dot(normal, position);

    //Right plane computation
    Matrix3.Cartesian3.multiplyByScalar(right, r, normal);
    Matrix3.Cartesian3.add(nearCenter, normal, normal);
    Matrix3.Cartesian3.subtract(normal, position, normal);
    Matrix3.Cartesian3.cross(up, normal, normal);
    Matrix3.Cartesian3.normalize(normal, normal);

    plane = planes[1];
    if (!defaultValue.defined(plane)) {
      plane = planes[1] = new Matrix2.Cartesian4();
    }
    plane.x = normal.x;
    plane.y = normal.y;
    plane.z = normal.z;
    plane.w = -Matrix3.Cartesian3.dot(normal, position);

    //Bottom plane computation
    Matrix3.Cartesian3.multiplyByScalar(up, b, normal);
    Matrix3.Cartesian3.add(nearCenter, normal, normal);
    Matrix3.Cartesian3.subtract(normal, position, normal);
    Matrix3.Cartesian3.cross(right, normal, normal);
    Matrix3.Cartesian3.normalize(normal, normal);

    plane = planes[2];
    if (!defaultValue.defined(plane)) {
      plane = planes[2] = new Matrix2.Cartesian4();
    }
    plane.x = normal.x;
    plane.y = normal.y;
    plane.z = normal.z;
    plane.w = -Matrix3.Cartesian3.dot(normal, position);

    //Top plane computation
    Matrix3.Cartesian3.multiplyByScalar(up, t, normal);
    Matrix3.Cartesian3.add(nearCenter, normal, normal);
    Matrix3.Cartesian3.subtract(normal, position, normal);
    Matrix3.Cartesian3.cross(normal, right, normal);
    Matrix3.Cartesian3.normalize(normal, normal);

    plane = planes[3];
    if (!defaultValue.defined(plane)) {
      plane = planes[3] = new Matrix2.Cartesian4();
    }
    plane.x = normal.x;
    plane.y = normal.y;
    plane.z = normal.z;
    plane.w = -Matrix3.Cartesian3.dot(normal, position);

    //Near plane computation
    plane = planes[4];
    if (!defaultValue.defined(plane)) {
      plane = planes[4] = new Matrix2.Cartesian4();
    }
    plane.x = direction.x;
    plane.y = direction.y;
    plane.z = direction.z;
    plane.w = -Matrix3.Cartesian3.dot(direction, nearCenter);

    //Far plane computation
    Matrix3.Cartesian3.negate(direction, normal);

    plane = planes[5];
    if (!defaultValue.defined(plane)) {
      plane = planes[5] = new Matrix2.Cartesian4();
    }
    plane.x = normal.x;
    plane.y = normal.y;
    plane.z = normal.z;
    plane.w = -Matrix3.Cartesian3.dot(normal, farCenter);

    return this._cullingVolume;
  };

  /**
   * Returns the pixel's width and height in meters.
   *
   * @param {Number} drawingBufferWidth The width of the drawing buffer.
   * @param {Number} drawingBufferHeight The height of the drawing buffer.
   * @param {Number} distance The distance to the near plane in meters.
   * @param {Number} pixelRatio The scaling factor from pixel space to coordinate space.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new instance of {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
   *
   * @exception {DeveloperError} drawingBufferWidth must be greater than zero.
   * @exception {DeveloperError} drawingBufferHeight must be greater than zero.
   * @exception {DeveloperError} pixelRatio must be greater than zero.
   *
   * @example
   * // Example 1
   * // Get the width and height of a pixel.
   * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 1.0, scene.pixelRatio, new Cesium.Cartesian2());
   *
   * @example
   * // Example 2
   * // Get the width and height of a pixel if the near plane was set to 'distance'.
   * // For example, get the size of a pixel of an image on a billboard.
   * const position = camera.position;
   * const direction = camera.direction;
   * const toCenter = Cesium.Cartesian3.subtract(primitive.boundingVolume.center, position, new Cesium.Cartesian3());      // vector from camera to a primitive
   * const toCenterProj = Cesium.Cartesian3.multiplyByScalar(direction, Cesium.Cartesian3.dot(direction, toCenter), new Cesium.Cartesian3()); // project vector onto camera direction vector
   * const distance = Cesium.Cartesian3.magnitude(toCenterProj);
   * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, distance, scene.pixelRatio, new Cesium.Cartesian2());
   */
  PerspectiveOffCenterFrustum.prototype.getPixelDimensions = function (
    drawingBufferWidth,
    drawingBufferHeight,
    distance,
    pixelRatio,
    result
  ) {
    update$1(this);

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(drawingBufferWidth) || !defaultValue.defined(drawingBufferHeight)) {
      throw new Check.DeveloperError(
        "Both drawingBufferWidth and drawingBufferHeight are required."
      );
    }
    if (drawingBufferWidth <= 0) {
      throw new Check.DeveloperError("drawingBufferWidth must be greater than zero.");
    }
    if (drawingBufferHeight <= 0) {
      throw new Check.DeveloperError("drawingBufferHeight must be greater than zero.");
    }
    if (!defaultValue.defined(distance)) {
      throw new Check.DeveloperError("distance is required.");
    }
    if (!defaultValue.defined(pixelRatio)) {
      throw new Check.DeveloperError("pixelRatio is required");
    }
    if (pixelRatio <= 0) {
      throw new Check.DeveloperError("pixelRatio must be greater than zero.");
    }
    if (!defaultValue.defined(result)) {
      throw new Check.DeveloperError("A result object is required.");
    }
    //>>includeEnd('debug');

    const inverseNear = 1.0 / this.near;
    let tanTheta = this.top * inverseNear;
    const pixelHeight =
      (2.0 * pixelRatio * distance * tanTheta) / drawingBufferHeight;
    tanTheta = this.right * inverseNear;
    const pixelWidth =
      (2.0 * pixelRatio * distance * tanTheta) / drawingBufferWidth;

    result.x = pixelWidth;
    result.y = pixelHeight;
    return result;
  };

  /**
   * Returns a duplicate of a PerspectiveOffCenterFrustum instance.
   *
   * @param {PerspectiveOffCenterFrustum} [result] The object onto which to store the result.
   * @returns {PerspectiveOffCenterFrustum} The modified result parameter or a new PerspectiveFrustum instance if one was not provided.
   */
  PerspectiveOffCenterFrustum.prototype.clone = function (result) {
    if (!defaultValue.defined(result)) {
      result = new PerspectiveOffCenterFrustum();
    }

    result.right = this.right;
    result.left = this.left;
    result.top = this.top;
    result.bottom = this.bottom;
    result.near = this.near;
    result.far = this.far;

    // force update of clone to compute matrices
    result._left = undefined;
    result._right = undefined;
    result._top = undefined;
    result._bottom = undefined;
    result._near = undefined;
    result._far = undefined;

    return result;
  };

  /**
   * Compares the provided PerspectiveOffCenterFrustum componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {PerspectiveOffCenterFrustum} [other] The right hand side PerspectiveOffCenterFrustum.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  PerspectiveOffCenterFrustum.prototype.equals = function (other) {
    return (
      defaultValue.defined(other) &&
      other instanceof PerspectiveOffCenterFrustum &&
      this.right === other.right &&
      this.left === other.left &&
      this.top === other.top &&
      this.bottom === other.bottom &&
      this.near === other.near &&
      this.far === other.far
    );
  };

  /**
   * Compares the provided PerspectiveOffCenterFrustum componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {PerspectiveOffCenterFrustum} other The right hand side PerspectiveOffCenterFrustum.
   * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if this and other are within the provided epsilon, <code>false</code> otherwise.
   */
  PerspectiveOffCenterFrustum.prototype.equalsEpsilon = function (
    other,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    return (
      other === this ||
      (defaultValue.defined(other) &&
        other instanceof PerspectiveOffCenterFrustum &&
        Math$1.CesiumMath.equalsEpsilon(
          this.right,
          other.right,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.left,
          other.left,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.top,
          other.top,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.bottom,
          other.bottom,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.near,
          other.near,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          this.far,
          other.far,
          relativeEpsilon,
          absoluteEpsilon
        ))
    );
  };

  /**
   * The viewing frustum is defined by 6 planes.
   * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
   * define the unit vector normal to the plane, and the w component is the distance of the
   * plane from the origin/camera position.
   *
   * @alias PerspectiveFrustum
   * @constructor
   *
   * @param {Object} [options] An object with the following properties:
   * @param {Number} [options.fov] The angle of the field of view (FOV), in radians.
   * @param {Number} [options.aspectRatio] The aspect ratio of the frustum's width to it's height.
   * @param {Number} [options.near=1.0] The distance of the near plane.
   * @param {Number} [options.far=500000000.0] The distance of the far plane.
   * @param {Number} [options.xOffset=0.0] The offset in the x direction.
   * @param {Number} [options.yOffset=0.0] The offset in the y direction.
   *
   * @example
   * const frustum = new Cesium.PerspectiveFrustum({
   *     fov : Cesium.Math.PI_OVER_THREE,
   *     aspectRatio : canvas.clientWidth / canvas.clientHeight
   *     near : 1.0,
   *     far : 1000.0
   * });
   *
   * @see PerspectiveOffCenterFrustum
   */
  function PerspectiveFrustum(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    this._offCenterFrustum = new PerspectiveOffCenterFrustum();

    /**
     * The angle of the field of view (FOV), in radians.  This angle will be used
     * as the horizontal FOV if the width is greater than the height, otherwise
     * it will be the vertical FOV.
     * @type {Number}
     * @default undefined
     */
    this.fov = options.fov;
    this._fov = undefined;
    this._fovy = undefined;

    this._sseDenominator = undefined;

    /**
     * The aspect ratio of the frustum's width to it's height.
     * @type {Number}
     * @default undefined
     */
    this.aspectRatio = options.aspectRatio;
    this._aspectRatio = undefined;

    /**
     * The distance of the near plane.
     * @type {Number}
     * @default 1.0
     */
    this.near = defaultValue.defaultValue(options.near, 1.0);
    this._near = this.near;

    /**
     * The distance of the far plane.
     * @type {Number}
     * @default 500000000.0
     */
    this.far = defaultValue.defaultValue(options.far, 500000000.0);
    this._far = this.far;

    /**
     * Offsets the frustum in the x direction.
     * @type {Number}
     * @default 0.0
     */
    this.xOffset = defaultValue.defaultValue(options.xOffset, 0.0);
    this._xOffset = this.xOffset;

    /**
     * Offsets the frustum in the y direction.
     * @type {Number}
     * @default 0.0
     */
    this.yOffset = defaultValue.defaultValue(options.yOffset, 0.0);
    this._yOffset = this.yOffset;
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  PerspectiveFrustum.packedLength = 6;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PerspectiveFrustum} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  PerspectiveFrustum.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value.fov;
    array[startingIndex++] = value.aspectRatio;
    array[startingIndex++] = value.near;
    array[startingIndex++] = value.far;
    array[startingIndex++] = value.xOffset;
    array[startingIndex] = value.yOffset;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PerspectiveFrustum} [result] The object into which to store the result.
   * @returns {PerspectiveFrustum} The modified result parameter or a new PerspectiveFrustum instance if one was not provided.
   */
  PerspectiveFrustum.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new PerspectiveFrustum();
    }

    result.fov = array[startingIndex++];
    result.aspectRatio = array[startingIndex++];
    result.near = array[startingIndex++];
    result.far = array[startingIndex++];
    result.xOffset = array[startingIndex++];
    result.yOffset = array[startingIndex];

    return result;
  };

  function update(frustum) {
    //>>includeStart('debug', pragmas.debug);
    if (
      !defaultValue.defined(frustum.fov) ||
      !defaultValue.defined(frustum.aspectRatio) ||
      !defaultValue.defined(frustum.near) ||
      !defaultValue.defined(frustum.far)
    ) {
      throw new Check.DeveloperError(
        "fov, aspectRatio, near, or far parameters are not set."
      );
    }
    //>>includeEnd('debug');

    const f = frustum._offCenterFrustum;

    if (
      frustum.fov !== frustum._fov ||
      frustum.aspectRatio !== frustum._aspectRatio ||
      frustum.near !== frustum._near ||
      frustum.far !== frustum._far ||
      frustum.xOffset !== frustum._xOffset ||
      frustum.yOffset !== frustum._yOffset
    ) {
      //>>includeStart('debug', pragmas.debug);
      if (frustum.fov < 0 || frustum.fov >= Math.PI) {
        throw new Check.DeveloperError("fov must be in the range [0, PI).");
      }

      if (frustum.aspectRatio < 0) {
        throw new Check.DeveloperError("aspectRatio must be positive.");
      }

      if (frustum.near < 0 || frustum.near > frustum.far) {
        throw new Check.DeveloperError(
          "near must be greater than zero and less than far."
        );
      }
      //>>includeEnd('debug');

      frustum._aspectRatio = frustum.aspectRatio;
      frustum._fov = frustum.fov;
      frustum._fovy =
        frustum.aspectRatio <= 1
          ? frustum.fov
          : Math.atan(Math.tan(frustum.fov * 0.5) / frustum.aspectRatio) * 2.0;
      frustum._near = frustum.near;
      frustum._far = frustum.far;
      frustum._sseDenominator = 2.0 * Math.tan(0.5 * frustum._fovy);
      frustum._xOffset = frustum.xOffset;
      frustum._yOffset = frustum.yOffset;

      f.top = frustum.near * Math.tan(0.5 * frustum._fovy);
      f.bottom = -f.top;
      f.right = frustum.aspectRatio * f.top;
      f.left = -f.right;
      f.near = frustum.near;
      f.far = frustum.far;

      f.right += frustum.xOffset;
      f.left += frustum.xOffset;
      f.top += frustum.yOffset;
      f.bottom += frustum.yOffset;
    }
  }

  Object.defineProperties(PerspectiveFrustum.prototype, {
    /**
     * Gets the perspective projection matrix computed from the view frustum.
     * @memberof PerspectiveFrustum.prototype
     * @type {Matrix4}
     * @readonly
     *
     * @see PerspectiveFrustum#infiniteProjectionMatrix
     */
    projectionMatrix: {
      get: function () {
        update(this);
        return this._offCenterFrustum.projectionMatrix;
      },
    },

    /**
     * The perspective projection matrix computed from the view frustum with an infinite far plane.
     * @memberof PerspectiveFrustum.prototype
     * @type {Matrix4}
     * @readonly
     *
     * @see PerspectiveFrustum#projectionMatrix
     */
    infiniteProjectionMatrix: {
      get: function () {
        update(this);
        return this._offCenterFrustum.infiniteProjectionMatrix;
      },
    },

    /**
     * Gets the angle of the vertical field of view, in radians.
     * @memberof PerspectiveFrustum.prototype
     * @type {Number}
     * @readonly
     * @default undefined
     */
    fovy: {
      get: function () {
        update(this);
        return this._fovy;
      },
    },

    /**
     * @readonly
     * @private
     */
    sseDenominator: {
      get: function () {
        update(this);
        return this._sseDenominator;
      },
    },
  });

  /**
   * Creates a culling volume for this frustum.
   *
   * @param {Cartesian3} position The eye position.
   * @param {Cartesian3} direction The view direction.
   * @param {Cartesian3} up The up direction.
   * @returns {CullingVolume} A culling volume at the given position and orientation.
   *
   * @example
   * // Check if a bounding volume intersects the frustum.
   * const cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
   * const intersect = cullingVolume.computeVisibility(boundingVolume);
   */
  PerspectiveFrustum.prototype.computeCullingVolume = function (
    position,
    direction,
    up
  ) {
    update(this);
    return this._offCenterFrustum.computeCullingVolume(position, direction, up);
  };

  /**
   * Returns the pixel's width and height in meters.
   *
   * @param {Number} drawingBufferWidth The width of the drawing buffer.
   * @param {Number} drawingBufferHeight The height of the drawing buffer.
   * @param {Number} distance The distance to the near plane in meters.
   * @param {Number} pixelRatio The scaling factor from pixel space to coordinate space.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new instance of {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
   *
   * @exception {DeveloperError} drawingBufferWidth must be greater than zero.
   * @exception {DeveloperError} drawingBufferHeight must be greater than zero.
   * @exception {DeveloperError} pixelRatio must be greater than zero.
   *
   * @example
   * // Example 1
   * // Get the width and height of a pixel.
   * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 1.0, scene.pixelRatio, new Cesium.Cartesian2());
   *
   * @example
   * // Example 2
   * // Get the width and height of a pixel if the near plane was set to 'distance'.
   * // For example, get the size of a pixel of an image on a billboard.
   * const position = camera.position;
   * const direction = camera.direction;
   * const toCenter = Cesium.Cartesian3.subtract(primitive.boundingVolume.center, position, new Cesium.Cartesian3());      // vector from camera to a primitive
   * const toCenterProj = Cesium.Cartesian3.multiplyByScalar(direction, Cesium.Cartesian3.dot(direction, toCenter), new Cesium.Cartesian3()); // project vector onto camera direction vector
   * const distance = Cesium.Cartesian3.magnitude(toCenterProj);
   * const pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, distance, scene.pixelRatio, new Cesium.Cartesian2());
   */
  PerspectiveFrustum.prototype.getPixelDimensions = function (
    drawingBufferWidth,
    drawingBufferHeight,
    distance,
    pixelRatio,
    result
  ) {
    update(this);
    return this._offCenterFrustum.getPixelDimensions(
      drawingBufferWidth,
      drawingBufferHeight,
      distance,
      pixelRatio,
      result
    );
  };

  /**
   * Returns a duplicate of a PerspectiveFrustum instance.
   *
   * @param {PerspectiveFrustum} [result] The object onto which to store the result.
   * @returns {PerspectiveFrustum} The modified result parameter or a new PerspectiveFrustum instance if one was not provided.
   */
  PerspectiveFrustum.prototype.clone = function (result) {
    if (!defaultValue.defined(result)) {
      result = new PerspectiveFrustum();
    }

    result.aspectRatio = this.aspectRatio;
    result.fov = this.fov;
    result.near = this.near;
    result.far = this.far;

    // force update of clone to compute matrices
    result._aspectRatio = undefined;
    result._fov = undefined;
    result._near = undefined;
    result._far = undefined;

    this._offCenterFrustum.clone(result._offCenterFrustum);

    return result;
  };

  /**
   * Compares the provided PerspectiveFrustum componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {PerspectiveFrustum} [other] The right hand side PerspectiveFrustum.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  PerspectiveFrustum.prototype.equals = function (other) {
    if (!defaultValue.defined(other) || !(other instanceof PerspectiveFrustum)) {
      return false;
    }

    update(this);
    update(other);

    return (
      this.fov === other.fov &&
      this.aspectRatio === other.aspectRatio &&
      this._offCenterFrustum.equals(other._offCenterFrustum)
    );
  };

  /**
   * Compares the provided PerspectiveFrustum componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {PerspectiveFrustum} other The right hand side PerspectiveFrustum.
   * @param {Number} relativeEpsilon The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if this and other are within the provided epsilon, <code>false</code> otherwise.
   */
  PerspectiveFrustum.prototype.equalsEpsilon = function (
    other,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    if (!defaultValue.defined(other) || !(other instanceof PerspectiveFrustum)) {
      return false;
    }

    update(this);
    update(other);

    return (
      Math$1.CesiumMath.equalsEpsilon(
        this.fov,
        other.fov,
        relativeEpsilon,
        absoluteEpsilon
      ) &&
      Math$1.CesiumMath.equalsEpsilon(
        this.aspectRatio,
        other.aspectRatio,
        relativeEpsilon,
        absoluteEpsilon
      ) &&
      this._offCenterFrustum.equalsEpsilon(
        other._offCenterFrustum,
        relativeEpsilon,
        absoluteEpsilon
      )
    );
  };

  const PERSPECTIVE = 0;
  const ORTHOGRAPHIC = 1;

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
    Check.Check.typeOf.object("options", options);
    Check.Check.typeOf.object("options.frustum", options.frustum);
    Check.Check.typeOf.object("options.origin", options.origin);
    Check.Check.typeOf.object("options.orientation", options.orientation);
    //>>includeEnd('debug');

    const frustum = options.frustum;
    const orientation = options.orientation;
    const origin = options.origin;
    const vertexFormat = defaultValue.defaultValue(options.vertexFormat, VertexFormat.VertexFormat.DEFAULT);

    // This is private because it is used by DebugCameraPrimitive to draw a multi-frustum by
    // creating multiple FrustumGeometrys. This way the near plane of one frustum doesn't overlap
    // the far plane of another.
    const drawNearPlane = defaultValue.defaultValue(options._drawNearPlane, true);

    let frustumType;
    let frustumPackedLength;
    if (frustum instanceof PerspectiveFrustum) {
      frustumType = PERSPECTIVE;
      frustumPackedLength = PerspectiveFrustum.packedLength;
    } else if (frustum instanceof OrthographicFrustum) {
      frustumType = ORTHOGRAPHIC;
      frustumPackedLength = OrthographicFrustum.packedLength;
    }

    this._frustumType = frustumType;
    this._frustum = frustum.clone();
    this._origin = Matrix3.Cartesian3.clone(origin);
    this._orientation = Transforms.Quaternion.clone(orientation);
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
      Matrix3.Cartesian3.packedLength +
      Transforms.Quaternion.packedLength +
      VertexFormat.VertexFormat.packedLength;
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
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const frustumType = value._frustumType;
    const frustum = value._frustum;

    array[startingIndex++] = frustumType;

    if (frustumType === PERSPECTIVE) {
      PerspectiveFrustum.pack(frustum, array, startingIndex);
      startingIndex += PerspectiveFrustum.packedLength;
    } else {
      OrthographicFrustum.pack(frustum, array, startingIndex);
      startingIndex += OrthographicFrustum.packedLength;
    }

    Matrix3.Cartesian3.pack(value._origin, array, startingIndex);
    startingIndex += Matrix3.Cartesian3.packedLength;
    Transforms.Quaternion.pack(value._orientation, array, startingIndex);
    startingIndex += Transforms.Quaternion.packedLength;
    VertexFormat.VertexFormat.pack(value._vertexFormat, array, startingIndex);
    startingIndex += VertexFormat.VertexFormat.packedLength;
    array[startingIndex] = value._drawNearPlane ? 1.0 : 0.0;

    return array;
  };

  const scratchPackPerspective = new PerspectiveFrustum();
  const scratchPackOrthographic = new OrthographicFrustum();
  const scratchPackQuaternion = new Transforms.Quaternion();
  const scratchPackorigin = new Matrix3.Cartesian3();
  const scratchVertexFormat = new VertexFormat.VertexFormat();

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {FrustumGeometry} [result] The object into which to store the result.
   */
  FrustumGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const frustumType = array[startingIndex++];

    let frustum;
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

    const origin = Matrix3.Cartesian3.unpack(array, startingIndex, scratchPackorigin);
    startingIndex += Matrix3.Cartesian3.packedLength;
    const orientation = Transforms.Quaternion.unpack(
      array,
      startingIndex,
      scratchPackQuaternion
    );
    startingIndex += Transforms.Quaternion.packedLength;
    const vertexFormat = VertexFormat.VertexFormat.unpack(
      array,
      startingIndex,
      scratchVertexFormat
    );
    startingIndex += VertexFormat.VertexFormat.packedLength;
    const drawNearPlane = array[startingIndex] === 1.0;

    if (!defaultValue.defined(result)) {
      return new FrustumGeometry({
        frustum: frustum,
        origin: origin,
        orientation: orientation,
        vertexFormat: vertexFormat,
        _drawNearPlane: drawNearPlane,
      });
    }

    const frustumResult =
      frustumType === result._frustumType ? result._frustum : undefined;
    result._frustum = frustum.clone(frustumResult);

    result._frustumType = frustumType;
    result._origin = Matrix3.Cartesian3.clone(origin, result._origin);
    result._orientation = Transforms.Quaternion.clone(orientation, result._orientation);
    result._vertexFormat = VertexFormat.VertexFormat.clone(vertexFormat, result._vertexFormat);
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
    const stOffset = (offset / 3) * 2;

    for (let i = 0; i < 4; ++i) {
      if (defaultValue.defined(normals)) {
        normals[offset] = normal.x;
        normals[offset + 1] = normal.y;
        normals[offset + 2] = normal.z;
      }
      if (defaultValue.defined(tangents)) {
        tangents[offset] = tangent.x;
        tangents[offset + 1] = tangent.y;
        tangents[offset + 2] = tangent.z;
      }
      if (defaultValue.defined(bitangents)) {
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

  const scratchRotationMatrix = new Matrix3.Matrix3();
  const scratchViewMatrix = new Matrix2.Matrix4();
  const scratchInverseMatrix = new Matrix2.Matrix4();

  const scratchXDirection = new Matrix3.Cartesian3();
  const scratchYDirection = new Matrix3.Cartesian3();
  const scratchZDirection = new Matrix3.Cartesian3();
  const scratchNegativeX = new Matrix3.Cartesian3();
  const scratchNegativeY = new Matrix3.Cartesian3();
  const scratchNegativeZ = new Matrix3.Cartesian3();

  const frustumSplits = new Array(3);

  const frustumCornersNDC = new Array(4);
  frustumCornersNDC[0] = new Matrix2.Cartesian4(-1.0, -1.0, 1.0, 1.0);
  frustumCornersNDC[1] = new Matrix2.Cartesian4(1.0, -1.0, 1.0, 1.0);
  frustumCornersNDC[2] = new Matrix2.Cartesian4(1.0, 1.0, 1.0, 1.0);
  frustumCornersNDC[3] = new Matrix2.Cartesian4(-1.0, 1.0, 1.0, 1.0);

  const scratchFrustumCorners = new Array(4);
  for (let i = 0; i < 4; ++i) {
    scratchFrustumCorners[i] = new Matrix2.Cartesian4();
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
    const rotationMatrix = Matrix3.Matrix3.fromQuaternion(
      orientation,
      scratchRotationMatrix
    );
    let x = defaultValue.defaultValue(xDirection, scratchXDirection);
    let y = defaultValue.defaultValue(yDirection, scratchYDirection);
    let z = defaultValue.defaultValue(zDirection, scratchZDirection);

    x = Matrix3.Matrix3.getColumn(rotationMatrix, 0, x);
    y = Matrix3.Matrix3.getColumn(rotationMatrix, 1, y);
    z = Matrix3.Matrix3.getColumn(rotationMatrix, 2, z);

    Matrix3.Cartesian3.normalize(x, x);
    Matrix3.Cartesian3.normalize(y, y);
    Matrix3.Cartesian3.normalize(z, z);

    Matrix3.Cartesian3.negate(x, x);

    const view = Matrix2.Matrix4.computeView(origin, z, y, x, scratchViewMatrix);

    let inverseView;
    let inverseViewProjection;
    if (frustumType === PERSPECTIVE) {
      const projection = frustum.projectionMatrix;
      const viewProjection = Matrix2.Matrix4.multiply(
        projection,
        view,
        scratchInverseMatrix
      );
      inverseViewProjection = Matrix2.Matrix4.inverse(
        viewProjection,
        scratchInverseMatrix
      );
    } else {
      inverseView = Matrix2.Matrix4.inverseTransformation(view, scratchInverseMatrix);
    }

    if (defaultValue.defined(inverseViewProjection)) {
      frustumSplits[0] = frustum.near;
      frustumSplits[1] = frustum.far;
    } else {
      frustumSplits[0] = 0.0;
      frustumSplits[1] = frustum.near;
      frustumSplits[2] = frustum.far;
    }

    for (let i = 0; i < 2; ++i) {
      for (let j = 0; j < 4; ++j) {
        let corner = Matrix2.Cartesian4.clone(
          frustumCornersNDC[j],
          scratchFrustumCorners[j]
        );

        if (!defaultValue.defined(inverseViewProjection)) {
          if (defaultValue.defined(frustum._offCenterFrustum)) {
            frustum = frustum._offCenterFrustum;
          }

          const near = frustumSplits[i];
          const far = frustumSplits[i + 1];

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

          Matrix2.Matrix4.multiplyByVector(inverseView, corner, corner);
        } else {
          corner = Matrix2.Matrix4.multiplyByVector(
            inverseViewProjection,
            corner,
            corner
          );

          // Reverse perspective divide
          const w = 1.0 / corner.w;
          Matrix3.Cartesian3.multiplyByScalar(corner, w, corner);

          Matrix3.Cartesian3.subtract(corner, origin, corner);
          Matrix3.Cartesian3.normalize(corner, corner);

          const fac = Matrix3.Cartesian3.dot(z, corner);
          Matrix3.Cartesian3.multiplyByScalar(corner, frustumSplits[i] / fac, corner);
          Matrix3.Cartesian3.add(corner, origin, corner);
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
    const frustumType = frustumGeometry._frustumType;
    const frustum = frustumGeometry._frustum;
    const origin = frustumGeometry._origin;
    const orientation = frustumGeometry._orientation;
    const drawNearPlane = frustumGeometry._drawNearPlane;
    const vertexFormat = frustumGeometry._vertexFormat;

    const numberOfPlanes = drawNearPlane ? 6 : 5;
    let positions = new Float64Array(3 * 4 * 6);
    FrustumGeometry._computeNearFarPlanes(
      origin,
      orientation,
      frustumType,
      frustum,
      positions
    );

    // -x plane
    let offset = 3 * 4 * 2;
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

    const attributes = new GeometryAttributes.GeometryAttributes({
      position: new GeometryAttribute.GeometryAttribute({
        componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: positions,
      }),
    });

    if (
      defaultValue.defined(vertexFormat.normal) ||
      defaultValue.defined(vertexFormat.tangent) ||
      defaultValue.defined(vertexFormat.bitangent) ||
      defaultValue.defined(vertexFormat.st)
    ) {
      const normals = defaultValue.defined(vertexFormat.normal)
        ? new Float32Array(3 * 4 * numberOfPlanes)
        : undefined;
      const tangents = defaultValue.defined(vertexFormat.tangent)
        ? new Float32Array(3 * 4 * numberOfPlanes)
        : undefined;
      const bitangents = defaultValue.defined(vertexFormat.bitangent)
        ? new Float32Array(3 * 4 * numberOfPlanes)
        : undefined;
      const st = defaultValue.defined(vertexFormat.st)
        ? new Float32Array(2 * 4 * numberOfPlanes)
        : undefined;

      const x = scratchXDirection;
      const y = scratchYDirection;
      const z = scratchZDirection;

      const negativeX = Matrix3.Cartesian3.negate(x, scratchNegativeX);
      const negativeY = Matrix3.Cartesian3.negate(y, scratchNegativeY);
      const negativeZ = Matrix3.Cartesian3.negate(z, scratchNegativeZ);

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

      if (defaultValue.defined(normals)) {
        attributes.normal = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: normals,
        });
      }
      if (defaultValue.defined(tangents)) {
        attributes.tangent = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: tangents,
        });
      }
      if (defaultValue.defined(bitangents)) {
        attributes.bitangent = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: bitangents,
        });
      }
      if (defaultValue.defined(st)) {
        attributes.st = new GeometryAttribute.GeometryAttribute({
          componentDatatype: ComponentDatatype.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: st,
        });
      }
    }

    const indices = new Uint16Array(6 * numberOfPlanes);
    for (let i = 0; i < numberOfPlanes; ++i) {
      const indexOffset = i * 6;
      const index = i * 4;

      indices[indexOffset] = index;
      indices[indexOffset + 1] = index + 1;
      indices[indexOffset + 2] = index + 2;
      indices[indexOffset + 3] = index;
      indices[indexOffset + 4] = index + 2;
      indices[indexOffset + 5] = index + 3;
    }

    return new GeometryAttribute.Geometry({
      attributes: attributes,
      indices: indices,
      primitiveType: GeometryAttribute.PrimitiveType.TRIANGLES,
      boundingSphere: Transforms.BoundingSphere.fromVertices(positions),
    });
  };

  exports.FrustumGeometry = FrustumGeometry;
  exports.OrthographicFrustum = OrthographicFrustum;
  exports.PerspectiveFrustum = PerspectiveFrustum;

}));
