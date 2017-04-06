/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/DeveloperError',
        './OrthographicOffCenterFrustum'
    ], function(
        defined,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        OrthographicOffCenterFrustum) {
    'use strict';

    /**
     * The viewing frustum is defined by 6 planes.
     * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
     * define the unit vector normal to the plane, and the w component is the distance of the
     * plane from the origin/camera position.
     *
     * @alias OrthographicOffCenterFrustum
     * @constructor
     *
     * @example
     * var maxRadii = ellipsoid.maximumRadius;
     *
     * var frustum = new Cesium.OrthographicOffCenterFrustum();
     * frustum.right = maxRadii * Cesium.Math.PI;
     * frustum.left = -c.frustum.right;
     * frustum.top = c.frustum.right * (canvas.clientHeight / canvas.clientWidth);
     * frustum.bottom = -c.frustum.top;
     * frustum.near = 0.01 * maxRadii;
     * frustum.far = 50.0 * maxRadii;
     */
    function OrthographicFrustum() {
        this._offCenterFrustum = new OrthographicOffCenterFrustum();

        this.width = undefined;
        this._width = undefined;

        this.aspectRatio = undefined;
        this._aspectRatio = undefined;

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

        this._useDeprecated = false;
    }

    function update(frustum) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(frustum.width) || !defined(frustum.aspectRatio) || !defined(frustum.near) || !defined(frustum.far)) {
            throw new DeveloperError('width, aspectRatio, near, or far parameters are not set.');
        }
        //>>includeEnd('debug');

        var f = frustum._offCenterFrustum;

        if (frustum.width !== frustum._width || frustum.aspectRatio !== frustum._aspectRatio ||
            frustum.near !== frustum._near || frustum.far !== frustum._far) {
            //>>includeStart('debug', pragmas.debug);
            if (frustum.aspectRatio < 0) {
                throw new DeveloperError('aspectRatio must be positive.');
            }
            if (frustum.near < 0 || frustum.near > frustum.far) {
                throw new DeveloperError('near must be greater than zero and less than far.');
            }
            //>>includeEnd('debug');

            frustum._aspectRatio = frustum.aspectRatio;
            frustum._width = frustum.width;
            frustum._near = frustum.near;
            frustum._far = frustum.far;

            if (!frustum._useDeprecated) {
                var ratio = 1.0 / frustum.aspectRatio;
                f.right = frustum.width * 0.5;
                f.left = -f.right;
                f.top = ratio * f.right;
                f.bottom = -f.top;
                f.near = frustum.near;
                f.far = frustum.far;
            }
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
                return this._offCenterFrustum.projectionMatrix;
            }
        },

        /**
         * The left clipping plane.
         * @type {Number}
         * @default undefined
         */
        left : {
            get : function() {
                deprecationWarning('OrthographicFrustum', 'OrthographicFrustum left, right, bottom and top properties were deprecated in 1.32 and will be removed in 1.33.');
                return this._offCenterFrustum.left;
            },
            set : function(value) {
                deprecationWarning('OrthographicFrustum', 'OrthographicFrustum left, right, bottom and top properties were deprecated in 1.32 and will be removed in 1.33.');
                this._useDeprecated = true;
                this._offCenterFrustum.left = value;
            }
        },

        /**
         * The right clipping plane.
         * @type {Number}
         * @default undefined
         */
        right : {
            get : function() {
                deprecationWarning('OrthographicFrustum', 'OrthographicFrustum left, right, bottom and top properties were deprecated in 1.32 and will be removed in 1.33.');
                return this._offCenterFrustum.right;
            },
            set : function(value) {
                deprecationWarning('OrthographicFrustum', 'OrthographicFrustum left, right, bottom and top properties were deprecated in 1.32 and will be removed in 1.33.');
                this._useDeprecated = true;
                this._offCenterFrustum.right = value;
            }
        },

        /**
         * The top clipping plane.
         * @type {Number}
         * @default undefined
         */
        top : {
            get : function() {
                deprecationWarning('OrthographicFrustum', 'OrthographicFrustum left, right, bottom and top properties were deprecated in 1.32 and will be removed in 1.33.');
                return this._offCenterFrustum.top;
            },
            set : function(value) {
                deprecationWarning('OrthographicFrustum', 'OrthographicFrustum left, right, bottom and top properties were deprecated in 1.32 and will be removed in 1.33.');
                this._useDeprecated = true;
                this._offCenterFrustum.top = value;
            }
        },

        /**
         * The bottom clipping plane.
         * @type {Number}
         * @default undefined
         */
        bottom : {
            get : function() {
                deprecationWarning('OrthographicFrustum', 'OrthographicFrustum left, right, bottom and top properties were deprecated in 1.32 and will be removed in 1.33.');
                return this._offCenterFrustum.bottom;
            },
            set : function(value) {
                deprecationWarning('OrthographicFrustum', 'OrthographicFrustum left, right, bottom and top properties were deprecated in 1.32 and will be removed in 1.33.');
                this._useDeprecated = true;
                this._offCenterFrustum.bottom = value;
            }
        }
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
     * var cullingVolume = frustum.computeCullingVolume(cameraPosition, cameraDirection, cameraUp);
     * var intersect = cullingVolume.computeVisibility(boundingVolume);
     */
    OrthographicFrustum.prototype.computeCullingVolume = function(position, direction, up) {
        update(this);
        return this._offCenterFrustum.computeCullingVolume(position, direction, up);
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
     * var pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 0.0, new Cesium.Cartesian2());
     */
    OrthographicFrustum.prototype.getPixelDimensions = function(drawingBufferWidth, drawingBufferHeight, distance, result) {
        update(this);
        return this._offCenterFrustum.getPixelDimensions(drawingBufferWidth, drawingBufferHeight, distance, result);
    };

    /**
     * Returns a duplicate of a OrthographicFrustum instance.
     *
     * @param {OrthographicFrustum} [result] The object onto which to store the result.
     * @returns {OrthographicFrustum} The modified result parameter or a new OrthographicFrustum instance if one was not provided.
     */
    OrthographicFrustum.prototype.clone = function(result) {
        if (!defined(result)) {
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
    OrthographicFrustum.prototype.equals = function(other) {
        if (!defined(other)) {
            return false;
        }

        update(this);
        update(other);

        return (this.width === other.width &&
                this.aspectRatio === other.aspectRatio &&
                this.near === other.near &&
                this.far === other.far &&
                this._offCenterFrustum.equals(other._offCenterFrustum));
    };

    return OrthographicFrustum;
});
