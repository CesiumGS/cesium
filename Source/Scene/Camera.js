/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Core/Ray',
        './CameraController',
        './PerspectiveFrustum'
    ], function(
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Cartesian3,
        Cartesian4,
        Matrix4,
        Ray,
        CameraController,
        PerspectiveFrustum) {
    "use strict";

    /**
     * The camera is defined by a position, orientation, and view frustum.
     * <br /><br />
     * The orientation forms an orthonormal basis with a view, up and right = view x up unit vectors.
     * <br /><br />
     * The viewing frustum is defined by 6 planes.
     * Each plane is represented by a {Cartesian4} object, where the x, y, and z components
     * define the unit vector normal to the plane, and the w component is the distance of the
     * plane from the origin/camera position.
     *
     * @alias Camera
     *
     * @exception {DeveloperError} canvas is required.
     *
     * @constructor
     *
     * @example
     * // Create a camera looking down the negative z-axis, positioned at the origin,
     * // with a field of view of 60 degrees, and 1:1 aspect ratio.
     * var camera = new Camera(canvas);
     * camera.position = new Cartesian3();
     * camera.direction = Cartesian3.UNIT_Z.negate();
     * camera.up = Cartesian3.UNIT_Y;
     * camera.frustum.fovy = CesiumMath.PI_OVER_THREE;
     * camera.frustum.near = 1.0;
     * camera.frustum.far = 2.0;
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Camera.html">Cesium Sandcastle Camera Demo</a>
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Camera.html">Sandcastle Example</a> from the <a href="http://cesium.agi.com/2013/02/13/Cesium-Camera-Tutorial/">Camera Tutorial</a>
     */
    var Camera = function(canvas) {
        if (typeof canvas === 'undefined') {
            throw new DeveloperError('canvas is required.');
        }

        /**
         * Modifies the camera's reference frame. The inverse of this transformation is appended to the view matrix.
         *
         * @type {Matrix4}
         *
         * @see Transforms
         */
        this.transform = Matrix4.IDENTITY.clone();
        this._transform = this.transform.clone();
        this._invTransform = Matrix4.IDENTITY.clone();

        var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
        var position = new Cartesian3(0.0, -2.0, 1.0).normalize().multiplyByScalar(2.5 * maxRadii);

        /**
         * The position of the camera.
         *
         * @type {Cartesian3}
         */
        this.position = position.clone();
        this._position = position;
        this._positionWC = position;

        var direction = Cartesian3.ZERO.subtract(position).normalize();

        /**
         * The view direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.direction = direction.clone();
        this._direction = direction;
        this._directionWC = direction;

        var right = direction.cross(Cartesian3.UNIT_Z).normalize();
        var up = right.cross(direction);

        /**
         * The up direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.up = up.clone();
        this._up = up;
        this._upWC = up;

        right = direction.cross(up);

        /**
         * The right direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.right = right.clone();
        this._right = right;
        this._rightWC = right;

        /**
         * The region of space in view.
         *
         * @type {Frustum}
         *
         * @see PerspectiveFrustum
         * @see PerspectiveOffCenterFrustum
         * @see OrthographicFrustum
         */
        this.frustum = new PerspectiveFrustum();
        this.frustum.fovy = CesiumMath.toRadians(60.0);
        this.frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;

        /**
         * Defines camera behavior. The controller can be used to perform common camera manipulations.
         *
         * @type {CameraController}
         */
        this.controller = new CameraController(this);

        this._viewMatrix = undefined;
        this._invViewMatrix = undefined;
        updateViewMatrix(this);

        this._canvas = canvas;
    };

    function updateViewMatrix(camera) {
        var r = camera._right;
        var u = camera._up;
        var d = camera._direction;
        var e = camera._position;

        var viewMatrix = new Matrix4( r.x,  r.y,  r.z, -r.dot(e),
                                      u.x,  u.y,  u.z, -u.dot(e),
                                     -d.x, -d.y, -d.z,  d.dot(e),
                                      0.0,  0.0,  0.0,      1.0);
        camera._viewMatrix = viewMatrix.multiply(camera._invTransform);
        camera._invViewMatrix = camera._viewMatrix.inverseTransformation();
    }

    function update(camera) {
        var position = camera._position;
        var positionChanged = !position.equals(camera.position);
        if (positionChanged) {
            position = camera._position = camera.position.clone();
        }

        var direction = camera._direction;
        var directionChanged = !direction.equals(camera.direction);
        if (directionChanged) {
            direction = camera._direction = camera.direction.clone();
        }

        var up = camera._up;
        var upChanged = !up.equals(camera.up);
        if (upChanged) {
            up = camera._up = camera.up.clone();
        }

        var right = camera._right;
        var rightChanged = !right.equals(camera.right);
        if (rightChanged) {
            right = camera._right = camera.right.clone();
        }

        var transform = camera._transform;
        var transformChanged = !transform.equals(camera.transform);
        if (transformChanged) {
            transform = camera._transform = camera.transform.clone();

            camera._invTransform = camera._transform.inverseTransformation();
        }

        if (positionChanged || transformChanged) {
            camera._positionWC = Cartesian3.fromCartesian4(transform.multiplyByPoint(position));
        }

        if (directionChanged || upChanged || rightChanged) {
            var det = direction.dot(up.cross(right));
            if (Math.abs(1.0 - det) > CesiumMath.EPSILON2) {
                //orthonormalize axes
                direction = camera._direction = direction.normalize();
                camera.direction = direction.clone();

                var invUpMag = 1.0 / up.magnitudeSquared();
                var scalar = up.dot(direction) * invUpMag;
                var w0 = direction.multiplyByScalar(scalar);
                up = camera._up = up.subtract(w0).normalize();
                camera.up = up.clone();

                right = camera._right = direction.cross(up);
                camera.right = right.clone();
            }
        }

        if (directionChanged || transformChanged) {
            camera._directionWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));
        }

        if (upChanged || transformChanged) {
            camera._upWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        }

        if (rightChanged || transformChanged) {
            camera._rightWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        }

        if (positionChanged || directionChanged || upChanged || rightChanged || transformChanged) {
            updateViewMatrix(camera);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof Camera
     *
     * @return {Matrix4} DOC_TBA
     */
    Camera.prototype.getInverseTransform = function() {
        update(this);
        return this._invTransform;
    };

    /**
     * Returns the view matrix.
     *
     * @memberof Camera
     *
     * @return {Matrix4} The view matrix.
     *
     * @see UniformState#getView
     * @see UniformState#setView
     * @see czm_view
     */
    Camera.prototype.getViewMatrix = function() {
        update(this);
        return this._viewMatrix;
    };

    /**
     * DOC_TBA
     * @memberof Camera
     */
    Camera.prototype.getInverseViewMatrix = function() {
        update(this);
        return this._invViewMatrix;
    };

    /**
     * The position of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getPositionWC = function() {
        update(this);
        return this._positionWC;
    };

    /**
     * The view direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getDirectionWC = function() {
        update(this);
        return this._directionWC;
    };

    /**
     * The up direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getUpWC = function() {
        update(this);
        return this._upWC;
    };

    /**
     * The right direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getRightWC = function() {
        update(this);
        return this._rightWC;
    };

    /**
     * Returns a duplicate of a Camera instance.
     *
     * @memberof Camera
     *
     * @return {Camera} A new copy of the Camera instance.
     */
    Camera.prototype.clone = function() {
        var camera = new Camera(this._canvas);
        camera.position = this.position.clone();
        camera.direction = this.direction.clone();
        camera.up = this.up.clone();
        camera.right = this.right.clone();
        camera.transform = this.transform.clone();
        camera.frustum = this.frustum.clone();
        return camera;
    };

    /**
     * Transform a vector or point from world coordinates to the camera's reference frame.
     * @memberof Camera
     *
     * @param {Cartesian4} cartesian The vector or point to transform.
     * @param {Cartesian4} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} cartesian is required.
     *
     * @returns {Cartesian4} The transformed vector or point.
     */
    Camera.prototype.worldToCameraCoordinates = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required.');
        }
        return Matrix4.multiplyByVector(this.getInverseTransform(), cartesian, result);
    };

    /**
     * Transform a vector or point from the camera's reference frame to world coordinates.
     * @memberof Camera
     *
     * @param {Cartesian4} vector The vector or point to transform.
     * @param {Cartesian4} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} cartesian is required.
     *
     * @returns {Cartesian4} The transformed vector or point.
     */
    Camera.prototype.cameraToWorldCoordinates = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required.');
        }
        return Matrix4.multiplyByVector(this.transform, cartesian, result);
    };

    return Camera;
});
