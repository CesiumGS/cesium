/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        './CullingVolume'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        defined,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        Matrix4,
        CullingVolume) {
    "use strict";

    /**
     * The viewing frustum is defined by 6 planes.
     * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
     * define the unit vector normal to the plane, and the w component is the distance of the
     * plane from the origin/camera position.
     *
     * @alias OrthographicFrustum
     * @constructor
     *
     * @example
     * var maxRadii = ellipsoid.maximumRadius;
     *
     * var frustum = new Cesium.OrthographicFrustum();
     * frustum.right = maxRadii * Cesium.Math.PI;
     * frustum.left = -c.frustum.right;
     * frustum.top = c.frustum.right * (canvas.clientHeight / canvas.clientWidth);
     * frustum.bottom = -c.frustum.top;
     * frustum.near = 0.01 * maxRadii;
     * frustum.far = 50.0 * maxRadii;
     */
    var OrthographicFrustum = function() {
        /**
         * The left clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.left = undefined;
        this._left = undefined;

        /**
         * The right clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.right = undefined;
        this._right = undefined;

        /**
         * The top clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.top = undefined;
        this._top = undefined;

        /**
         * The bottom clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.bottom = undefined;
        this._bottom = undefined;

        /**
         * The distance of the near plane.
         * @type {Number}
         * @default 1.0
         */
        this.near = 1.0;
        this._near = this.near;

        /**
         * The distance of the far plane.
         * @type {Number}
         * @default 500000000.0;
         */
        this.far = 500000000.0;
        this._far = this.far;

        this._cullingVolume = new CullingVolume();
        this._orthographicMatrix = new Matrix4();
    };

    function update(frustum) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(frustum.right) || !defined(frustum.left) ||
            !defined(frustum.top) || !defined(frustum.bottom) ||
            !defined(frustum.near) || !defined(frustum.far)) {
            throw new DeveloperError('right, left, top, bottom, near, or far parameters are not set.');
        }
        //>>includeEnd('debug');

        if (frustum.top !== frustum._top || frustum.bottom !== frustum._bottom ||
                frustum.left !== frustum._left || frustum.right !== frustum._right ||
                frustum.near !== frustum._near || frustum.far !== frustum._far) {

            //>>includeStart('debug', pragmas.debug);
            if (frustum.left > frustum.right) {
                throw new DeveloperError('right must be greater than left.');
            }
            if (frustum.bottom > frustum.top) {
                throw new DeveloperError('top must be greater than bottom.');
            }
            if (frustum.near <= 0 || frustum.near > frustum.far) {
                throw new DeveloperError('near must be greater than zero and less than far.');
            }
            //>>includeEnd('debug');

            frustum._left = frustum.left;
            frustum._right = frustum.right;
            frustum._top = frustum.top;
            frustum._bottom = frustum.bottom;
            frustum._near = frustum.near;
            frustum._far = frustum.far;
            frustum._orthographicMatrix = Matrix4.computeOrthographicOffCenter(frustum.left, frustum.right, frustum.bottom, frustum.top, frustum.near, frustum.far, frustum._orthographicMatrix);
        }
    }

    defineProperties(OrthographicFrustum.prototype, {
        /**
         * Gets the orthographic projection matrix computed from the view frustum.
         * @memberof OrthographicFrustum.prototype
         * @type {Matrix4}
         * @readonly
         */
        projectionMatrix : {
            get : function() {
                update(this);
                return this._orthographicMatrix;
            }
        }
    });

    var getPlanesRight = new Cartesian3();
    var getPlanesNearCenter = new Cartesian3();
    var getPlanesPoint = new Cartesian3();
    var negateScratch = new Cartesian3();

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
     * var cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
     * var intersect = cullingVolume.computeVisibility(boundingVolume);
     */
    OrthographicFrustum.prototype.computeCullingVolume = function(position, direction, up) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(position)) {
            throw new DeveloperError('position is required.');
        }
        if (!defined(direction)) {
            throw new DeveloperError('direction is required.');
        }
        if (!defined(up)) {
            throw new DeveloperError('up is required.');
        }
        //>>includeEnd('debug');

        var planes = this._cullingVolume.planes;
        var t = this.top;
        var b = this.bottom;
        var r = this.right;
        var l = this.left;
        var n = this.near;
        var f = this.far;

        var right = Cartesian3.cross(direction, up, getPlanesRight);
        var nearCenter = getPlanesNearCenter;
        Cartesian3.multiplyByScalar(direction, n, nearCenter);
        Cartesian3.add(position, nearCenter, nearCenter);

        var point = getPlanesPoint;

        // Left plane
        Cartesian3.multiplyByScalar(right, l, point);
        Cartesian3.add(nearCenter, point, point);

        var plane = planes[0];
        if (!defined(plane)) {
            plane = planes[0] = new Cartesian4();
        }
        plane.x = right.x;
        plane.y = right.y;
        plane.z = right.z;
        plane.w = -Cartesian3.dot(right, point);

        // Right plane
        Cartesian3.multiplyByScalar(right, r, point);
        Cartesian3.add(nearCenter, point, point);

        plane = planes[1];
        if (!defined(plane)) {
            plane = planes[1] = new Cartesian4();
        }
        plane.x = -right.x;
        plane.y = -right.y;
        plane.z = -right.z;
        plane.w = -Cartesian3.dot(Cartesian3.negate(right, negateScratch), point);

        // Bottom plane
        Cartesian3.multiplyByScalar(up, b, point);
        Cartesian3.add(nearCenter, point, point);

        plane = planes[2];
        if (!defined(plane)) {
            plane = planes[2] = new Cartesian4();
        }
        plane.x = up.x;
        plane.y = up.y;
        plane.z = up.z;
        plane.w = -Cartesian3.dot(up, point);

        // Top plane
        Cartesian3.multiplyByScalar(up, t, point);
        Cartesian3.add(nearCenter, point, point);

        plane = planes[3];
        if (!defined(plane)) {
            plane = planes[3] = new Cartesian4();
        }
        plane.x = -up.x;
        plane.y = -up.y;
        plane.z = -up.z;
        plane.w = -Cartesian3.dot(Cartesian3.negate(up, negateScratch), point);

        // Near plane
        plane = planes[4];
        if (!defined(plane)) {
            plane = planes[4] = new Cartesian4();
        }
        plane.x = direction.x;
        plane.y = direction.y;
        plane.z = direction.z;
        plane.w = -Cartesian3.dot(direction, nearCenter);

        // Far plane
        Cartesian3.multiplyByScalar(direction, f, point);
        Cartesian3.add(position, point, point);

        plane = planes[5];
        if (!defined(plane)) {
            plane = planes[5] = new Cartesian4();
        }
        plane.x = -direction.x;
        plane.y = -direction.y;
        plane.z = -direction.z;
        plane.w = -Cartesian3.dot(Cartesian3.negate(direction, negateScratch), point);

        return this._cullingVolume;
    };

    /**
     * Returns the pixel's width and height in meters.
     *
     * @param {Cartesian2} drawingBufferDimensions A {@link Cartesian2} with width and height in the x and y properties, respectively.
     * @param {Number} distance Ignored for orthographic frustum.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new instance of {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
     *
     * @exception {DeveloperError} drawingBufferDimensions.x must be greater than zero.
     * @exception {DeveloperError} drawingBufferDimensions.y must be greater than zero.
     *
     * @example
     * var pixelSize = camera.frustum.getPixelSize(new Cesium.Cartesian2(scene.drawingBufferWidth, scene.drawingBufferHeight));
     *
     * @deprecated
     */
    OrthographicFrustum.prototype.getPixelSize = function(drawingBufferDimensions, distance, result) {
        deprecationWarning('OrthographicFrustum', 'getPixelSize is deprecated. Use getPixelDimensions instead.');

        update(this);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(drawingBufferDimensions)) {
            throw new DeveloperError('drawingBufferDimensions is required.');
        }
        if (drawingBufferDimensions.x <= 0) {
            throw new DeveloperError('drawingBufferDimensions.x must be greater than zero.');
        }
        if (drawingBufferDimensions.y <= 0) {
            throw new DeveloperError('drawingBufferDimensions.y must be greater than zero.');
        }
        //>>includeEnd('debug');

        var frustumWidth = this.right - this.left;
        var frustumHeight = this.top - this.bottom;
        var pixelWidth = frustumWidth / drawingBufferDimensions.x;
        var pixelHeight = frustumHeight / drawingBufferDimensions.y;

        if (!defined(result)) {
            return new Cartesian2(pixelWidth, pixelHeight);
        }

        result.x = pixelWidth;
        result.y = pixelHeight;
        return result;
    };

    /**
     * Returns the pixel's width and height in meters.
     *
     * @param {Number} drawingBufferWidth The width of the drawing buffer.
     * @param {Number} drawingBufferHeight The height of the drawing buffer.
     * @param {Number} distance The distance to the near plane in meters.
     * @param {Cartesian2} result The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new instance of {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
     *
     * @exception {DeveloperError} drawingBufferWidth must be greater than zero.
     * @exception {DeveloperError} drawingBufferHeight must be greater than zero.
     *
     * @example
     * // Example 1
     * // Get the width and height of a pixel.
     * var pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 0.0, new Cartesian2());
     */
    OrthographicFrustum.prototype.getPixelDimensions = function(drawingBufferWidth, drawingBufferHeight, distance, result) {
        update(this);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(drawingBufferWidth) || !defined(drawingBufferHeight)) {
            throw new DeveloperError('Both drawingBufferWidth and drawingBufferHeight are required.');
        }
        if (drawingBufferWidth <= 0) {
            throw new DeveloperError('drawingBufferWidth must be greater than zero.');
        }
        if (drawingBufferHeight <= 0) {
            throw new DeveloperError('drawingBufferHeight must be greater than zero.');
        }
        if (!defined(distance)) {
            throw new DeveloperError('distance is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('A result object is required.');
        }
        //>>includeEnd('debug');

        var frustumWidth = this.right - this.left;
        var frustumHeight = this.top - this.bottom;
        var pixelWidth = frustumWidth / drawingBufferWidth;
        var pixelHeight = frustumHeight / drawingBufferHeight;

        result.x = pixelWidth;
        result.y = pixelHeight;
        return result;
    };

    /**
     * Returns a duplicate of a OrthographicFrustum instance.
     *
     * @param {OrthographicFrustum} [result] The object onto which to store the result.
     * @returns {OrthographicFrustum} The modified result parameter or a new PerspectiveFrustum instance if one was not provided.
     */
    OrthographicFrustum.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new OrthographicFrustum();
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
     * Compares the provided OrthographicFrustum componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {OrthographicFrustum} [other] The right hand side OrthographicFrustum.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    OrthographicFrustum.prototype.equals = function(other) {
        return (defined(other) &&
                this.right === other.right &&
                this.left === other.left &&
                this.top === other.top &&
                this.bottom === other.bottom &&
                this.near === other.near &&
                this.far === other.far);
    };

    return OrthographicFrustum;
});
