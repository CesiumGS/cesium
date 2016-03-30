/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        './CullingVolume'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Matrix4,
        CullingVolume) {
    'use strict';

    /**
     * The viewing frustum is defined by 6 planes.
     * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
     * define the unit vector normal to the plane, and the w component is the distance of the
     * plane from the origin/camera position.
     *
     * @alias PerspectiveOffCenterFrustum
     * @constructor
     *
     *
     * @example
     * var frustum = new Cesium.PerspectiveOffCenterFrustum();
     * frustum.right = 1.0;
     * frustum.left = -1.0;
     * frustum.top = 1.0;
     * frustum.bottom = -1.0;
     * frustum.near = 1.0;
     * frustum.far = 2.0;
     *
     * @see PerspectiveFrustum
     */
    function PerspectiveOffCenterFrustum() {
        /**
         * Defines the left clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.left = undefined;
        this._left = undefined;

        /**
         * Defines the right clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.right = undefined;
        this._right = undefined;

        /**
         * Defines the top clipping plane.
         * @type {Number}
         * @default undefined
         */
        this.top = undefined;
        this._top = undefined;

        /**
         * Defines the bottom clipping plane.
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
         * @default 500000000.0
         */
        this.far = 500000000.0;
        this._far = this.far;

        this._cullingVolume = new CullingVolume();
        this._perspectiveMatrix = new Matrix4();
        this._infinitePerspective = new Matrix4();
    }

    function update(frustum) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(frustum.right) || !defined(frustum.left) ||
            !defined(frustum.top) || !defined(frustum.bottom) ||
            !defined(frustum.near) || !defined(frustum.far)) {
            throw new DeveloperError('right, left, top, bottom, near, or far parameters are not set.');
        }
        //>>includeEnd('debug');

        var t = frustum.top;
        var b = frustum.bottom;
        var r = frustum.right;
        var l = frustum.left;
        var n = frustum.near;
        var f = frustum.far;

        if (t !== frustum._top || b !== frustum._bottom ||
            l !== frustum._left || r !== frustum._right ||
            n !== frustum._near || f !== frustum._far) {

            //>>includeStart('debug', pragmas.debug);
            if (frustum.near <= 0 || frustum.near > frustum.far) {
                throw new DeveloperError('near must be greater than zero and less than far.');
            }
            //>>includeEnd('debug');

            frustum._left = l;
            frustum._right = r;
            frustum._top = t;
            frustum._bottom = b;
            frustum._near = n;
            frustum._far = f;
            frustum._perspectiveMatrix = Matrix4.computePerspectiveOffCenter(l, r, b, t, n, f, frustum._perspectiveMatrix);
            frustum._infinitePerspective = Matrix4.computeInfinitePerspectiveOffCenter(l, r, b, t, n, frustum._infinitePerspective);
        }
    }

    defineProperties(PerspectiveOffCenterFrustum.prototype, {
        /**
         * Gets the perspective projection matrix computed from the view frustum.
         * @memberof PerspectiveOffCenterFrustum.prototype
         * @type {Matrix4}
         * @readonly
         *
         * @see PerspectiveOffCenterFrustum#infiniteProjectionMatrix
         */
        projectionMatrix : {
            get : function() {
                update(this);
                return this._perspectiveMatrix;
            }
        },

        /**
         * Gets the perspective projection matrix computed from the view frustum with an infinite far plane.
         * @memberof PerspectiveOffCenterFrustum.prototype
         * @type {Matrix4}
         * @readonly
         *
         * @see PerspectiveOffCenterFrustum#projectionMatrix
         */
        infiniteProjectionMatrix : {
            get : function() {
                update(this);
                return this._infinitePerspective;
            }
        }
    });

    var getPlanesRight = new Cartesian3();
    var getPlanesNearCenter = new Cartesian3();
    var getPlanesFarCenter = new Cartesian3();
    var getPlanesNormal = new Cartesian3();
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
    PerspectiveOffCenterFrustum.prototype.computeCullingVolume = function(position, direction, up) {
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

        var farCenter = getPlanesFarCenter;
        Cartesian3.multiplyByScalar(direction, f, farCenter);
        Cartesian3.add(position, farCenter, farCenter);

        var normal = getPlanesNormal;

        //Left plane computation
        Cartesian3.multiplyByScalar(right, l, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.normalize(normal, normal);
        Cartesian3.cross(normal, up, normal);

        var plane = planes[0];
        if (!defined(plane)) {
            plane = planes[0] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, position);

        //Right plane computation
        Cartesian3.multiplyByScalar(right, r, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.normalize(normal, normal);
        Cartesian3.cross(up, normal, normal);

        plane = planes[1];
        if (!defined(plane)) {
            plane = planes[1] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, position);

        //Bottom plane computation
        Cartesian3.multiplyByScalar(up, b, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.normalize(normal, normal);
        Cartesian3.cross(right, normal, normal);

        plane = planes[2];
        if (!defined(plane)) {
            plane = planes[2] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, position);

        //Top plane computation
        Cartesian3.multiplyByScalar(up, t, normal);
        Cartesian3.add(nearCenter, normal, normal);
        Cartesian3.subtract(normal, position, normal);
        Cartesian3.normalize(normal, normal);
        Cartesian3.cross(normal, right, normal);

        plane = planes[3];
        if (!defined(plane)) {
            plane = planes[3] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, position);

        //Near plane computation
        plane = planes[4];
        if (!defined(plane)) {
            plane = planes[4] = new Cartesian4();
        }
        plane.x = direction.x;
        plane.y = direction.y;
        plane.z = direction.z;
        plane.w = -Cartesian3.dot(direction, nearCenter);

        //Far plane computation
        Cartesian3.negate(direction, normal);

        plane = planes[5];
        if (!defined(plane)) {
            plane = planes[5] = new Cartesian4();
        }
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = -Cartesian3.dot(normal, farCenter);

        return this._cullingVolume;
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
     * var pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, 1.0, new Cartesian2());
     *
     * @example
     * // Example 2
     * // Get the width and height of a pixel if the near plane was set to 'distance'.
     * // For example, get the size of a pixel of an image on a billboard.
     * var position = camera.position;
     * var direction = camera.direction;
     * var toCenter = Cesium.Cartesian3.subtract(primitive.boundingVolume.center, position, new Cesium.Cartesian3());      // vector from camera to a primitive
     * var toCenterProj = Cesium.Cartesian3.multiplyByScalar(direction, Cesium.Cartesian3.dot(direction, toCenter), new Cesium.Cartesian3()); // project vector onto camera direction vector
     * var distance = Cesium.Cartesian3.magnitude(toCenterProj);
     * var pixelSize = camera.frustum.getPixelDimensions(scene.drawingBufferWidth, scene.drawingBufferHeight, distance, new Cartesian2());
     */
    PerspectiveOffCenterFrustum.prototype.getPixelDimensions = function(drawingBufferWidth, drawingBufferHeight, distance, result) {
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

        var inverseNear = 1.0 / this.near;
        var tanTheta = this.top * inverseNear;
        var pixelHeight = 2.0 * distance * tanTheta / drawingBufferHeight;
        tanTheta = this.right * inverseNear;
        var pixelWidth = 2.0 * distance * tanTheta / drawingBufferWidth;

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
    PerspectiveOffCenterFrustum.prototype.clone = function(result) {
        if (!defined(result)) {
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
    PerspectiveOffCenterFrustum.prototype.equals = function(other) {
        return (defined(other) &&
                this.right === other.right &&
                this.left === other.left &&
                this.top === other.top &&
                this.bottom === other.bottom &&
                this.near === other.near &&
                this.far === other.far);
    };

    return PerspectiveOffCenterFrustum;
});
