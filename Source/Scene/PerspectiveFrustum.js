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
     * @alias PerspectiveFrustum
     * @constructor
     *
     * @example
     * var frustum = new PerspectiveFrustum();
     * frustum.fovy = CesiumMath.PI_OVER_THREE;
     * frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;
     * frustum.near = 1.0;
     * frustum.far = 2.0;
     */
    var PerspectiveFrustum = function() {
        /**
         * The angle of the field of view, in radians.
         *
         * @type {Number}
         */
        this.fovy = null;
        this._fovy = null;

        /**
         * The aspect ratio of the frustum's width to it's height.
         *
         * @type {Number}
         */
        this.aspectRatio = null;
        this._aspectRatio = null;

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

        this._perspectiveMatrix = null;
        this._infinitePerspective = null;
    };

    /**
     * Returns the perspective projection matrix computed from the view frustum.
     *
     * @memberof PerspectiveFrustum
     *
     * @return {Matrix4} The perspective projection matrix.
     *
     * @see PerspectiveFrustum#getInfiniteProjectionMatrix
     */
    PerspectiveFrustum.prototype.getProjectionMatrix = function() {
        this._update();
        return this._perspectiveMatrix;
    };

    /**
     * DOC_TBA
     *
     * @memberof PerspectiveFrustum
     *
     * @see PerspectiveFrustum#getProjectionMatrix
     */
    PerspectiveFrustum.prototype.getInfiniteProjectionMatrix = function() {
        this._update();
        return this._infinitePerspective;
    };

    PerspectiveFrustum.prototype._update = function() {
        if (this.fovy === null || this.aspectRatio === null || this.near === null || this.far === null) {
            throw new DeveloperError('fovy, aspectRatio, near, or far parameters are not set.');
        }

        if (this.fovy !== this._fovy || this.aspectRatio !== this._aspectRatio || this.near !== this._near || this.far !== this._far) {
            if (this.fovy < 0 || this.fovy >= Math.PI) {
                throw new DeveloperError('fovy must be in the range [0, PI).');
            }

            if (this.aspectRatio < 0) {
                throw new DeveloperError('aspectRatio must be positive.');
            }

            if (this.near < 0 || this.near > this.far) {
                throw new DeveloperError('near must be greater than zero and less than far.');
            }

            this._fovy = this.fovy;
            this._aspectRatio = this.aspectRatio;
            this._near = this.near;
            this._far = this.far;

            this._updateProjectionMatrices();
        }
    };

    PerspectiveFrustum.prototype._updateProjectionMatrices = function() {
        var t = this.near * Math.tan(0.5 * this.fovy);
        var b = -t;
        var r = this.aspectRatio * t;
        var l = -r;
        var n = this.near;
        var f = this.far;

        this._perspectiveMatrix = Matrix4.createPerspectiveOffCenter(l, r, b, t, n, f);
        this._infinitePerspective = Matrix4.createInfinitePerspectiveOffCenter(l, r, b, t, n);
    };

    /**
     * DOC_TBA
     *
     * @memberof PerspectiveFrustum
     *
     * @param {Cartesian3} position The eye position.
     * @param {Cartesian3} direction The view direction.
     * @param {Cartesian3} up The up direction.
     *
     * @exception {DeveloperError} position is required.
     * @exception {DeveloperError} direction is required.
     * @exception {DeveloperError} up is required.
     */
    PerspectiveFrustum.prototype.getPlanes = function(position, direction, up) {
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

        var t = this.near * Math.tan(0.5 * this.fovy);
        var r = this.aspectRatio * t;
        var n = this.near;
        var f = this.far;

        var planes = [];
        planes.length = 6;

        var normal, planeVec;
        var nearCenter = pos.add(dir.multiplyByScalar(n));
        var farCenter = pos.add(dir.multiplyByScalar(f));

        //Left plane computation
        planeVec = nearCenter.add(right.negate().multiplyByScalar(r)).subtract(pos);
        planeVec = planeVec.normalize();
        normal = planeVec.cross(u);
        planes[0] = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(pos));

        //Right plane computation
        planeVec = nearCenter.add(right.multiplyByScalar(r)).subtract(pos);
        planeVec = planeVec.normalize();
        normal = u.cross(planeVec);
        planes[1] = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(pos));

        //Bottom plane computation
        planeVec = nearCenter.add(u.negate().multiplyByScalar(t)).subtract(position);
        planeVec = planeVec.normalize();
        normal = right.cross(planeVec);
        planes[2] = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(pos));

        //Top plane computation
        planeVec = nearCenter.add(u.multiplyByScalar(t)).subtract(pos);
        planeVec = planeVec.normalize();
        normal = planeVec.cross(right);
        planes[3] = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(pos));

        //Near plane computation
        normal = direction;
        planes[4] = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(nearCenter));

        //Far plane computation
        normal = direction.negate();
        planes[5] = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(farCenter));

        return planes;
    };

    /**
     * Returns a duplicate of a PerspectiveFrustum instance.
     *
     * @memberof PerspectiveFrustum
     *
     * @return {PerspectiveFrustum} A new copy of the PerspectiveFrustum instance.
     */
    PerspectiveFrustum.prototype.clone = function() {
        var frustum = new PerspectiveFrustum();
        frustum.fovy = this.fovy;
        frustum.aspectRatio = this.aspectRatio;
        frustum.near = this.near;
        frustum.far = this.far;
        return frustum;
    };

    /**
     * DOC_TBA
     *
     * @memberof PerspectiveFrustum
     */
    PerspectiveFrustum.prototype.equals = function(other) {
        return (this.fovy === other.fovy && this.aspectRatio === other.aspectRatio && this.near === other.near && this.far === other.far);
    };

    return PerspectiveFrustum;
});