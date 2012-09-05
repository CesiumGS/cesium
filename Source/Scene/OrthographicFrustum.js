/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Intersect',
        '../Core/Matrix4'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Intersect,
        Matrix4) {
    "use strict";

    /**
     * The viewing frustum is defined by 6 planes.
     * Each plane is represented by a {Cartesian4} object, where the x, y, and z components
     * define the unit vector normal to the plane, and the w component is the distance of the
     * plane from the origin/camera position.
     *
     * @alias OrthographicFrustum
     * @constructor
     *
     * @example
     * var maxRadii = ellipsoid.getMaximumRadius();
     *
     * var frustum = new OrthographicFrustum();
     * frustum.right = maxRadii * CesiumMath.PI;
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
         */
        this.left = undefined;
        this._left = undefined;

        /**
         * The right clipping plane.
         * @type {Number}
         */
        this.right = undefined;
        this._right = undefined;

        /**
         * The top clipping plane.
         * @type {Number}
         */
        this.top = undefined;
        this._top = undefined;

        /**
         * The bottom clipping plane.
         * @type {Number}
         */
        this.bottom = undefined;
        this._bottom = undefined;

        /**
         * The distance of the near plane.
         * @type {Number}
         */
        this.near = undefined;
        this._near = undefined;

        /**
         * The distance of the far plane.
         * @type {Number}
         */
        this.far = undefined;
        this._far = undefined;

        /**
         * The position of the frustum.
         * @type {Cartesian3}
         */
        this.position = undefined;
        this._position = undefined;

        /**
         * The view direction of the frustum.
         * @type {Cartesian3}
         */
        this.direction = undefined;
        this._direction = undefined;

        /**
         * The up direction of the frustum.
         * @type {Cartesian3}
         */
        this.up = undefined;
        this._up = undefined;

        this._planes = [];

        this._orthographicMatrix = undefined;
    };

    /**
     * Returns the orthographic projection matrix computed from the view frustum.
     *
     * @memberof OrthographicFrustum
     *
     * @return {Matrix4} The orthographic projection matrix.
     */
    OrthographicFrustum.prototype.getProjectionMatrix = function() {
        update(this);
        return this._orthographicMatrix;
    };

    function update(frustum) {
        if (typeof frustum.right === undefined || typeof frustum.left === undefined ||
                typeof frustum.top === undefined || typeof frustum.bottom === undefined ||
                frustum.near === undefined || frustum.far === undefined) {
            throw new DeveloperError('right, left, top, bottom, near, or far parameters are not set.');
        }

        if (frustum.top !== frustum._top || frustum.bottom !== frustum._bottom ||
                frustum.left !== frustum._left || frustum.right !== frustum._right ||
                frustum.near !== frustum._near || frustum.far !== frustum._far) {

            if (frustum.left > frustum.right) {
                throw new DeveloperError('right must be greater than left.');
            }

            if (frustum.bottom > frustum.top) {
                throw new DeveloperError('top must be greater than bottom.');
            }

            if (frustum.near <= 0 || frustum.near > frustum.far) {
                throw new DeveloperError('near must be greater than zero and less than far.');
            }

            frustum._left = frustum.left;
            frustum._right = frustum.right;
            frustum._top = frustum.top;
            frustum._bottom = frustum.bottom;
            frustum._near = frustum.near;
            frustum._far = frustum.far;

            updateProjectionMatrices(frustum);
        }

        var position = frustum.position;
        var positionDefined = typeof position !== 'undefined';
        var positionChanged = positionDefined && !position.equals(frustum._position);
        if (positionChanged) {
            position = frustum._position = frustum.position.clone();
        }

        var direction = frustum.direction;
        var directionDefined = typeof direction !== 'undefined';
        var directionChanged = directionDefined && !direction.equals(frustum._direction);
        if (directionChanged) {
            direction = frustum._direction = frustum.direction.clone();
        }

        var up = frustum.up;
        var upDefined = typeof up !== 'undefined';
        var upChanged = upDefined && !up.equals(frustum._up);
        if (upChanged) {
            up = frustum._up = frustum.up.clone();
        }

        if (positionDefined && upDefined && directionDefined &&
                (positionChanged || directionChanged || upChanged)) {
            frustum._planes = computePlanes(frustum, frustum._planes);
        }
    }

    function updateProjectionMatrices(frustum) {
        var t = frustum.top;
        var b = frustum.bottom;
        var r = frustum.right;
        var l = frustum.left;
        var n = frustum.near;
        var f = frustum.far;

        frustum._orthographicMatrix = Matrix4.computeOrthographicOffCenter(l, r, b, t, n, f);
    }

    var getPlanesRight = new Cartesian3();
    var getPlanesNearCenter = new Cartesian3();
    var getPlanesPoint = new Cartesian3();
    function computePlanes(frustum, result) {
        if (typeof result === 'undefined') {
            result = new Array(6);
        }

        var position = frustum.position;
        var direction = frustum.direction;
        var up = frustum.up;

        var t = frustum.top;
        var b = frustum.bottom;
        var r = frustum.right;
        var l = frustum.left;
        var n = frustum.near;
        var f = frustum.far;

        var right = Cartesian3.cross(direction, up, getPlanesRight);

        var nearCenter = getPlanesNearCenter;
        Cartesian3.multiplyByScalar(direction, n, nearCenter);
        Cartesian3.add(position, nearCenter, nearCenter);

        var point = getPlanesPoint;

        // Left plane
        Cartesian3.multiplyByScalar(right, l, point);
        Cartesian3.add(nearCenter, point, point);

        var plane = result[0];
        if (typeof plane === 'undefined') {
            plane = result[0] = new Cartesian4();
        }
        plane.x = right.x;
        plane.y = right.y;
        plane.z = right.z;
        plane.w = -Cartesian3.dot(right, point);

        // Right plane
        Cartesian3.multiplyByScalar(right, r, point);
        Cartesian3.add(nearCenter, point, point);

        plane = result[1];
        if (typeof plane === 'undefined') {
            plane = result[1] = new Cartesian4();
        }
        plane.x = -right.x;
        plane.y = -right.y;
        plane.z = -right.z;
        plane.w = -Cartesian3.dot(right.negate(), point);

        // Bottom plane
        Cartesian3.multiplyByScalar(up, b, point);
        Cartesian3.add(nearCenter, point, point);

        plane = result[2];
        if (typeof plane === 'undefined') {
            plane = result[2] = new Cartesian4();
        }
        plane.x = up.x;
        plane.y = up.y;
        plane.z = up.z;
        plane.w = -Cartesian3.dot(up, point);

        // Top plane
        Cartesian3.multiplyByScalar(up, t, point);
        Cartesian3.add(nearCenter, point, point);

        plane = result[3];
        if (typeof plane === 'undefined') {
            plane = result[3] = new Cartesian4();
        }
        plane.x = -up.x;
        plane.y = -up.y;
        plane.z = -up.z;
        plane.w = -Cartesian3.dot(up.negate(), point);

        // Near plane
        plane = result[4];
        if (typeof plane === 'undefined') {
            plane = result[4] = new Cartesian4();
        }
        plane.x = direction.x;
        plane.y = direction.y;
        plane.z = direction.z;
        plane.w = -Cartesian3.dot(direction, nearCenter);

        // Far plane
        Cartesian3.multiplyByScalar(direction, f, point);
        Cartesian3.add(position, point, point);

        plane = result[5];
        if (typeof plane === 'undefined') {
            plane = result[5] = new Cartesian4();
        }
        plane.x = -direction.x;
        plane.y = -direction.y;
        plane.z = -direction.z;
        plane.w = -Cartesian3.dot(direction.negate(), point);

        return result;
    }

    /**
     * Gets an array of clipping planes for this frustum.
     *
     * @memberof OrthographicFrustum
     *
     * @return {Array} An array of 6 clipping planes.
     *
     * @example
     * // Check if a bounding volume intersects the frustum.
     * var planes = frustum.getPlanes();
     * var intersecting = boundingVolume.intersect(planes[0]) !== Intersect.OUTSIDE;             // check for left intersection
     * intersecting = intersecting && boundingVolume.intersect(planes[1]) !== Intersect.OUTSIDE; // check for right intersection
     * intersecting = intersecting && boundingVolume.intersect(planes[2]) !== Intersect.OUTSIDE; // check for bottom intersection
     * intersecting = intersecting && boundingVolume.intersect(planes[3]) !== Intersect.OUTSIDE; // check for top intersection
     * intersecting = intersecting && boundingVolume.intersect(planes[4]) !== Intersect.OUTSIDE; // check for near intersection
     * intersecting = intersecting && boundingVolume.intersect(planes[5]) !== Intersect.OUTSIDE; // check for far intersection
     */
    OrthographicFrustum.prototype.getPlanes = function() {
        update(this);

        if (typeof this.position === 'undefined') {
            throw new DeveloperError('position is required.');
        }

        if (typeof this.direction === 'undefined') {
            throw new DeveloperError('direction is required.');
        }

        if (typeof this.up === 'undefined') {
            throw new DeveloperError('up is required.');
        }

        return this._planes;
    };

    /**
     * Determines whether a bounding volume intersects with the frustum or not.
     *
     * @memberof OrthographicFrustum
     *
     * @param {Object} object The bounding volume whose intersection with the frustum is to be tested.
     *
     * @return {Enumeration}  Intersect.OUTSIDE, Intersect.INTERSECTING, or Intersect.INSIDE.
     */
    OrthographicFrustum.prototype.getVisibility = function(object) {
        update(this);

        if (typeof this.position === 'undefined') {
            throw new DeveloperError('position cannot be undefined.');
        }

        if (typeof this.direction === 'undefined') {
            throw new DeveloperError('direction cannot be undefined.');
        }

        if (typeof this.up === 'undefined') {
            throw new DeveloperError('up cannot be undefined.');
        }

        var planes = this._planes;
        var intersecting = false;
        for ( var k = 0; k < planes.length; k++) {
            var result = object.intersect(planes[k]);
            if (result === Intersect.OUTSIDE) {
                return Intersect.OUTSIDE;
            } else if (result === Intersect.INTERSECTING) {
                intersecting = true;
            }
        }

        return intersecting ? Intersect.INTERSECTING : Intersect.INSIDE;
    };

    /**
     * Returns the pixel's width and height in meters.
     *
     * @memberof OrthographicFrustum
     *
     * @param {Cartesian2} canvasDimensions A {@link Cartesian2} with width and height in the x and y properties, respectively.
     *
     * @exception {DeveloperError} canvasDimensions is required.
     * @exception {DeveloperError} canvasDimensions.x must be greater than zero.
     * @exception {DeveloperError} canvasDimensione.y must be greater than zero.
     *
     * @returns {Cartesian2} A {@link Cartesian2} with the pixel's width and height in the x and y properties, respectively.
     *
     * @example
     * // Example 1
     * // Get the width and height of a pixel.
     * var pixelSize = camera.frustum.getPixelSize(new Cartesian2(canvas.clientWidth, canvas.clientHeight));
     */
    OrthographicFrustum.prototype.getPixelSize = function(canvasDimensions) {
        update(this);

        if (typeof canvasDimensions === 'undefined') {
            throw new DeveloperError('canvasDimensions is required.');
        }

        var width = canvasDimensions.x;
        var height = canvasDimensions.y;

        if (width <= 0) {
            throw new DeveloperError('canvasDimensions.x must be grater than zero.');
        }

        if (height <= 0) {
            throw new DeveloperError('canvasDimensions.y must be grater than zero.');
        }

        var frustumWidth = this.right - this.left;
        var frustumHeight = this.top - this.bottom;
        var pixelWidth = frustumWidth / width;
        var pixelHeight = frustumHeight / height;

        return new Cartesian2(pixelWidth, pixelHeight);
    };

    /**
     * Returns a duplicate of a OrthographicFrustum instance.
     *
     * @memberof OrthographicFrustum
     *
     * @return {OrthographicFrustum} A new copy of the OrthographicFrustum instance.
     */
    OrthographicFrustum.prototype.clone = function() {
        var frustum = new OrthographicFrustum();
        frustum.left = this.left;
        frustum.right = this.right;
        frustum.top = this.top;
        frustum.bottom = this.bottom;
        frustum.near = this.near;
        frustum.far = this.far;
        frustum.position = this.position && this.position.clone();
        frustum.direction = this.direction && this.direction.clone();
        frustum.up = this.up && this.up.clone();
        return frustum;
    };

    /**
     * Compares the provided OrthographicFrustum componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @memberof OrthographicFrustum
     *
     * @param {OrthographicFrustum} [other] The right hand side OrthographicFrustum.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    OrthographicFrustum.prototype.equals = function(other) {
        return (typeof other !== 'undefined' &&
                this.right === other.right &&
                this.left === other.left &&
                this.top === other.top &&
                this.bottom === other.bottom &&
                this.near === other.near &&
                this.far === other.far &&
                Cartesian3.equals(this.position, other.position) &&
                Cartesian3.equals(this.direction, other.direction) &&
                Cartesian3.equals(this.up, other.up));
    };

    return OrthographicFrustum;
});