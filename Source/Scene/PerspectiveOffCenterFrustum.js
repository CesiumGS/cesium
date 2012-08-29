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
     * @alias PerspectiveOffCenterFrustum
     * @constructor
     *
     * @see PerspectiveFrustum
     *
     * @example
     * var frustum = new PerspectiveOffCenterFrustum();
     * frustum.right = 1.0;
     * frustum.left = -frustum.right;
     * frustum.top = 1.0;
     * frustum.bottom = -frustum.top;
     * frustum.near = 1.0;
     * frustum.far = 2.0;
     */
    var PerspectiveOffCenterFrustum = function() {
        /**
         * Defines the left clipping plane.
         *
         * @type {Number}
         */
        this.left = undefined;
        this._left = undefined;

        /**
         * Defines the right clipping plane.
         *
         * @type {Number}
         */
        this.right = undefined;
        this._right = undefined;

        /**
         * Defines the top clipping plane.
         *
         * @type {Number}
         */
        this.top = undefined;
        this._top = undefined;

        /**
         * Defines the bottom clipping plane.
         *
         * @type {Number}
         */
        this.bottom = undefined;
        this._bottom = undefined;

        /**
         * The distance of the near plane from the camera's position.
         *
         * @type {Number}
         */
        this.near = undefined;
        this._near = undefined;

        /**
         * The The distance of the far plane from the camera's position.
         *
         * @type {Number}
         */
        this.far = undefined;
        this._far = undefined;

        this._perspectiveMatrix = undefined;
        this._infinitePerspective = undefined;
    };

    /**
     * Returns the perspective projection matrix computed from the view frustum.
     *
     * @memberof PerspectiveOffCenterFrustum
     *
     * @return {Matrix4} The perspective projection matrix.
     *
     * @see PerspectiveOffCenterFrustum#getInfiniteProjectionMatrix
     */
    PerspectiveOffCenterFrustum.prototype.getProjectionMatrix = function() {
        update(this);
        return this._perspectiveMatrix;
    };

    /**
     * Returns the perspective projection matrix computed from the view frustum with an infinite far plane.
     *
     * @memberof PerspectiveOffCenterFrustum
     *
     * @return {Matrix4} The infinite perspective projection matrix.
     *
     * @see PerspectiveOffCenterFrustum#getProjectionMatrix
     */
    PerspectiveOffCenterFrustum.prototype.getInfiniteProjectionMatrix = function() {
        update(this);
        return this._infinitePerspective;
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

            if (frustum.near < 0 || frustum.near > frustum.far) {
                throw new DeveloperError('near must be greater than zero and less than far.');
            }

            frustum._left = frustum.left;
            frustum._right = frustum.right;
            frustum._top = frustum.top;
            frustum._bottom = frustum.bottom;
            frustum._near = frustum.near;
            frustum._far = frustum.far;

            frustum._updateProjectionMatrices();
        }
    }

    PerspectiveOffCenterFrustum.prototype._updateProjectionMatrices = function() {
        var t = this.top;
        var b = this.bottom;
        var r = this.right;
        var l = this.left;
        var n = this.near;
        var f = this.far;

        this._perspectiveMatrix = Matrix4.computePerspectiveOffCenter(l, r, b, t, n, f);
        this._infinitePerspective = Matrix4.computeInfinitePerspectiveOffCenter(l, r, b, t, n);
    };

    /**
     * Creates an array of clipping planes for this frustum.
     *
     * @memberof PerspectiveOffCenterFrustum
     *
     * @param {Cartesian3} position The eye position.
     * @param {Cartesian3} direction The view direction.
     * @param {Cartesian3} up The up direction.
     *
     * @exception {DeveloperError} position is required.
     * @exception {DeveloperError} direction is required.
     * @exception {DeveloperError} up is required.
     */
    PerspectiveOffCenterFrustum.prototype.getPlanes = function(position, direction, up) {
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

        var t = this.top;
        var b = this.bottom;
        var r = this.right;
        var l = this.left;
        var n = this.near;
        var f = this.far;

        var planes = [];
        planes.length = 6;

        var normal, planeVec;
        var nearCenter = pos.add(dir.multiplyByScalar(n));
        var farCenter = pos.add(dir.multiplyByScalar(f));

        //Left plane computation
        planeVec = nearCenter.add(right.multiplyByScalar(l)).subtract(pos);
        planeVec = planeVec.normalize();
        normal = planeVec.cross(u);
        planes[0] = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(pos));

        //Right plane computation
        planeVec = nearCenter.add(right.multiplyByScalar(r)).subtract(pos);
        planeVec = planeVec.normalize();
        normal = u.cross(planeVec);
        planes[1] = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(pos));

        //Bottom plane computation
        planeVec = nearCenter.add(u.multiplyByScalar(b)).subtract(position);
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
     * Returns a duplicate of a PerspectiveOffCenterFrustum instance.
     *
     * @memberof PerspectiveOffCenterFrustum
     *
     * @return {PerspectiveOffCenterFrustum} A new copy of the PerspectiveOffCenterFrustum instance.
     */
    PerspectiveOffCenterFrustum.prototype.clone = function() {
        var frustum = new PerspectiveOffCenterFrustum();
        frustum.right = this.right;
        frustum.left = this.left;
        frustum.top = this.top;
        frustum.bottom = this.bottom;
        frustum.near = this.near;
        frustum.far = this.far;
        return frustum;
    };

    /**
     * Compares the provided PerspectiveOffCenterFrustum componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @memberof PerspectiveOffCenterFrustum
     *
     * @param {PerspectiveOffCenterFrustum} [other] The right hand side PerspectiveOffCenterFrustum.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    PerspectiveOffCenterFrustum.prototype.equals = function(other) {
        return (typeof other !== 'undefined' &&
                this.right === other.right &&
                this.left === other.left &&
                this.top === other.top &&
                this.bottom === other.bottom &&
                this.near === other.near &&
                this.far === other.far);
    };

    return PerspectiveOffCenterFrustum;
});