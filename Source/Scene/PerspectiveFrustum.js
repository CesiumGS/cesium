/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Scene/PerspectiveOffCenterFrustum'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian3,
        Cartesian4,
        Matrix4,
        PerspectiveOffCenterFrustum) {
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
     * @see PerspectiveOffCenterFrustum
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
        this.fovy = undefined;
        this._fovy = undefined;

        /**
         * The aspect ratio of the frustum's width to it's height.
         *
         * @type {Number}
         */
        this.aspectRatio = undefined;
        this._aspectRatio = undefined;

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

        this._offCenterFrustum = new PerspectiveOffCenterFrustum();
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
        update(this);
        return this._offCenterFrustum.getProjectionMatrix();
    };

    /**
     * Returns the perspective projection matrix computed from the view frustum with an infinite far plane.
     *
     * @memberof PerspectiveFrustum
     *
     * @return {Matrix4} The infinite perspective projection matrix.
     *
     * @see PerspectiveFrustum#getProjectionMatrix
     */
    PerspectiveFrustum.prototype.getInfiniteProjectionMatrix = function() {
        update(this);
        return this._offCenterFrustum.getInfiniteProjectionMatrix();
    };

    function update(frustum) {
        if (typeof frustum.fovy === 'undefined' || typeof frustum.aspectRatio === 'undefined' ||
                typeof frustum.near === 'undefined' || typeof frustum.far === 'undefined') {
            throw new DeveloperError('fovy, aspectRatio, near, or far parameters are not set.');
        }

        if (frustum.fovy !== frustum._fovy || frustum.aspectRatio !== frustum._aspectRatio ||
                frustum.near !== frustum._near || frustum.far !== frustum._far) {
            if (frustum.fovy < 0 || frustum.fovy >= Math.PI) {
                throw new DeveloperError('fovy must be in the range [0, PI).');
            }

            if (frustum.aspectRatio < 0) {
                throw new DeveloperError('aspectRatio must be positive.');
            }

            if (frustum.near < 0 || frustum.near > frustum.far) {
                throw new DeveloperError('near must be greater than zero and less than far.');
            }

            frustum._fovy = frustum.fovy;
            frustum._aspectRatio = frustum.aspectRatio;
            frustum._near = frustum.near;
            frustum._far = frustum.far;

            var f = frustum._offCenterFrustum;
            f.top = frustum.near * Math.tan(0.5 * frustum.fovy);
            f.bottom = -f.top;
            f.right = frustum.aspectRatio * f.top;
            f.left = -f.right;
            f.near = frustum.near;
            f.far = frustum.far;
        }
    }

    /**
     * Creates an array of clipping planes for this frustum.
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
     *
     * @return {Array} An array of 6 clipping planes.
     */
    PerspectiveFrustum.prototype.getPlanes = function(position, direction, up) {
        update(this);
        return this._offCenterFrustum.getPlanes(position, direction, up);
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
        frustum._offCenterFrustum = this._offCenterFrustum.clone();
        return frustum;
    };

    /**
     * Compares the provided PerspectiveFrustum componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @memberof PerspectiveFrustum
     *
     * @param {PerspectiveFrustum} [other] The right hand side PerspectiveFrustum.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    PerspectiveFrustum.prototype.equals = function(other) {
        if (typeof other === 'undefined') {
            return false;
        }

        update(this);
        update(other);

        return (this.fovy === other.fovy &&
                this.aspectRatio === other.aspectRatio &&
                this.near === other.near &&
                this.far === other.far &&
                this._offCenterFrustum.equals(other._offCenterFrustum));
    };

    return PerspectiveFrustum;
});