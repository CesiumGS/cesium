/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian3,
        Cartesian4,
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
         * DOC_TBA
         *
         * @type {Number}
         */
        this.left = null;
        this._left = null;

        /**
         * DOC_TBA
         *
         * @type {Number}
         */
        this.right = null;
        this._right = null;

        /**
         * DOC_TBA
         *
         * @type {Number}
         */
        this.top = null;
        this._top = null;

        /**
         * DOC_TBA
         *
         * @type {Number}
         */
        this.bottom = null;
        this._bottom = null;

        /**
         * The distance of the near plane from the camera's position.
         *
         * @type {Number}
         */
        this.near = null;
        this._near = null;

        /**
         * The The distance of the far plane from the camera's position.
         *
         * @type {Number}
         */
        this.far = null;
        this._far = null;

        this._orthographicMatrix = null;
    };

    /**
     * Returns the orthographic projection matrix computed from the view frustum.
     *
     * @memberof OrthographicFrustum
     *
     * @return {Matrix4} The orthographic projection matrix.
     *
     * @see OrthographicFrustum#getInfiniteProjectionMatrix
     */
    OrthographicFrustum.prototype.getProjectionMatrix = function() {
        this._update();
        return this._orthographicMatrix;
    };

    OrthographicFrustum.prototype._update = function() {
        if (this.left === null || this.right === null || this.top === null || this.bottom === null || this.near === null || this.far === null) {
            throw new DeveloperError('left, right, top, bottom, near, or far frustum parameters are not set.');
        }

        if (this.left !== this._left || this.right !== this._right || this.top !== this._top || this.bottom !== this._bottom || this.near !== this._near || this.far !== this._far) {
            if (this.left > this.right) {
                throw new DeveloperError('right must be greater than left.');
            }

            if (this.bottom > this.top) {
                throw new DeveloperError('top must be greater than bottom.');
            }

            if (this.near < 0 || this.near > this.far) {
                throw new DeveloperError('near must be greater than zero and less than far.');
            }

            this._left = this.left;
            this._right = this.right;
            this._top = this.top;
            this._bottom = this.bottom;
            this._near = this.near;
            this._far = this.far;

            this._updateProjectionMatrices();
        }
    };

    OrthographicFrustum.prototype._updateProjectionMatrices = function() {
        this._orthographicMatrix = Matrix4.createOrthographicOffCenter(this.left, this.right, this.bottom, this.top, this.near, this.far);
    };

    /**
     * DOC_TBA
     *
     * @memberof OrthographicFrustum
     *
     * @param {Cartesian3} position The eye position.
     * @param {Cartesian3} direction The view direction.
     * @param {Cartesian3} up The up direction.
     *
     * @exception {DeveloperError} position is required.
     * @exception {DeveloperError} direction is required.
     * @exception {DeveloperError} up is required.
     */
    OrthographicFrustum.prototype.getPlanes = function(position, direction, up) {
        if (!position) {
            throw new DeveloperError('position is required.');
        }

        if (!direction) {
            throw new DeveloperError('direction is required.');
        }

        if (!up) {
            throw new DeveloperError('up is required.');
        }

        var pos = Cartesian3.clone(position);
        var dir = Cartesian3.clone(direction);
        var u = Cartesian3.clone(up);

        var right = dir.cross(u);

        var planes = [];
        planes.length = 6;

        var planePoint;
        var nearCenter = pos.add(dir.multiplyByScalar(this.near));

        // Left plane
        planePoint = nearCenter.add(right.multiplyByScalar(this.left));
        planes[0] = new Cartesian4(right.x, right.y, right.z, -right.dot(planePoint));

        // Right plane
        planePoint = nearCenter.add(right.multiplyByScalar(this.right));
        planes[1] = new Cartesian4(-right.x, -right.y, -right.z, -right.negate().dot(planePoint));

        // Bottom plane
        planePoint = nearCenter.add(u.multiplyByScalar(this.bottom));
        planes[2] = new Cartesian4(u.x, u.y, u.z, -u.dot(planePoint));

        // Top plane
        planePoint = nearCenter.add(u.multiplyByScalar(this.top));
        planes[3] = new Cartesian4(-u.x, -u.y, -u.z, -u.negate().dot(planePoint));

        // Near plane
        planes[4] = new Cartesian4(direction.x, direction.y, direction.z, -direction.dot(nearCenter));

        // Far plane
        planePoint = position.add(direction.multiplyByScalar(this.far));
        planes[5] = new Cartesian4(-direction.x, -direction.y, -direction.z, -direction.negate().dot(planePoint));

        return planes;
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
        return frustum;
    };

    /**
     * DOC_TBA
     *
     * @memberof OrthographicFrustum
     */
    OrthographicFrustum.prototype.equals = function(other) {
        return (this.left === other.left &&
                this.right === other.right &&
                this.top === other.top &&
                this.bottom === other.bottom &&
                this.near === other.near &&
                this.far === other.far);
    };

    return OrthographicFrustum;
});