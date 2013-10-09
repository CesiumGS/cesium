/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        './CameraController',
        './PerspectiveFrustum'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        CesiumMath,
        Ellipsoid,
        Cartesian3,
        Cartesian4,
        Matrix4,
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
     * @exception {DeveloperError} context is required.
     *
     * @constructor
     *
     * @example
     * // Create a camera looking down the negative z-axis, positioned at the origin,
     * // with a field of view of 60 degrees, and 1:1 aspect ratio.
     * var camera = new Camera(context);
     * camera.position = new Cartesian3();
     * camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z);
     * camera.up = Cartesian3.UNIT_Y;
     * camera.frustum.fovy = CesiumMath.PI_OVER_THREE;
     * camera.frustum.near = 1.0;
     * camera.frustum.far = 2.0;
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Camera.html">Cesium Sandcastle Camera Demo</a>
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Camera.html">Sandcastle Example</a> from the <a href="http://cesium.agi.com/2013/02/13/Cesium-Camera-Tutorial/">Camera Tutorial</a>
     */
    var Camera = function(context) {
        if (!defined(context)) {
            throw new DeveloperError('context is required.');
        }

        /**
         * Modifies the camera's reference frame. The inverse of this transformation is appended to the view matrix.
         *
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         *
         * @see Transforms
         * @see Camera#inverseTransform
         */
        this.transform = Matrix4.clone(Matrix4.IDENTITY);
        this._transform = Matrix4.clone(this.transform);
        this._invTransform = Matrix4.clone(Matrix4.IDENTITY);

        var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
        var position = Cartesian3.multiplyByScalar(Cartesian3.normalize(new Cartesian3(0.0, -2.0, 1.0)), 2.5 * maxRadii);

        /**
         * The position of the camera.
         *
         * @type {Cartesian3}
         */
        this.position = Cartesian3.clone(position);
        this._position = position;
        this._positionWC = position;

        var direction = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.ZERO, position));

        /**
         * The view direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.direction = Cartesian3.clone(direction);
        this._direction = direction;
        this._directionWC = direction;

        var right = Cartesian3.normalize(Cartesian3.cross(direction, Cartesian3.UNIT_Z));
        var up = Cartesian3.cross(right, direction);

        /**
         * The up direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.up = Cartesian3.clone(up);
        this._up = up;
        this._upWC = up;

        right = Cartesian3.cross(direction, up);

        /**
         * The right direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.right = Cartesian3.clone(right);
        this._right = right;
        this._rightWC = right;

        /**
         * The region of space in view.
         *
         * @type {Frustum}
         * @default PerspectiveFrustum()
         *
         * @see PerspectiveFrustum
         * @see PerspectiveOffCenterFrustum
         * @see OrthographicFrustum
         */
        this.frustum = new PerspectiveFrustum();
        this.frustum.fovy = CesiumMath.toRadians(60.0);
        this.frustum.aspectRatio = context.getDrawingBufferWidth() / context.getDrawingBufferHeight();

        /**
         * Defines camera behavior. The controller can be used to perform common camera manipulations.
         *
         * @type {CameraController}
         * @default CameraController(this)
         */
        this.controller = new CameraController(this);

        this._viewMatrix = undefined;
        this._invViewMatrix = undefined;
        updateViewMatrix(this);

        this._context = context;
    };

    function updateViewMatrix(camera) {
        var r = camera._right;
        var u = camera._up;
        var d = camera._direction;
        var e = camera._position;

        var viewMatrix = new Matrix4( r.x,  r.y,  r.z, -Cartesian3.dot(r, e),
                                      u.x,  u.y,  u.z, -Cartesian3.dot(u, e),
                                     -d.x, -d.y, -d.z,  Cartesian3.dot(d, e),
                                      0.0,  0.0,  0.0,      1.0);
        camera._viewMatrix = Matrix4.multiply(viewMatrix, camera._invTransform);
        camera._invViewMatrix = Matrix4.inverseTransformation(camera._viewMatrix);
    }

    function update(camera) {
        var position = camera._position;
        var positionChanged = !Cartesian3.equals(position, camera.position);
        if (positionChanged) {
            position = camera._position = Cartesian3.clone(camera.position);
        }

        var direction = camera._direction;
        var directionChanged = !Cartesian3.equals(direction, camera.direction);
        if (directionChanged) {
            direction = camera._direction = Cartesian3.clone(camera.direction);
        }

        var up = camera._up;
        var upChanged = !Cartesian3.equals(up, camera.up);
        if (upChanged) {
            up = camera._up = Cartesian3.clone(camera.up);
        }

        var right = camera._right;
        var rightChanged = !Cartesian3.equals(right, camera.right);
        if (rightChanged) {
            right = camera._right = Cartesian3.clone(camera.right);
        }

        var transform = camera._transform;
        var transformChanged = !Matrix4.equals(transform, camera.transform);
        if (transformChanged) {
            transform = camera._transform = Matrix4.clone(camera.transform);

            camera._invTransform = Matrix4.inverseTransformation(camera._transform);
        }

        if (positionChanged || transformChanged) {
            camera._positionWC = Cartesian3.fromCartesian4(Matrix4.multiplyByPoint(transform, position), camera._positionWC);
        }

        if (directionChanged || upChanged || rightChanged) {
            var det = Cartesian3.dot(direction, Cartesian3.cross(up, right));
            if (Math.abs(1.0 - det) > CesiumMath.EPSILON2) {
                //orthonormalize axes
                direction = camera._direction = Cartesian3.normalize(direction);
                camera.direction = Cartesian3.clone(direction);

                var invUpMag = 1.0 / Cartesian3.magnitudeSquared(up);
                var scalar = Cartesian3.dot(up, direction) * invUpMag;
                var w0 = Cartesian3.multiplyByScalar(direction, scalar);
                up = camera._up = Cartesian3.normalize(Cartesian3.subtract(up, w0));
                camera.up = Cartesian3.clone(up);

                right = camera._right = Cartesian3.cross(direction, up);
                camera.right = Cartesian3.clone(right);
            }
        }

        if (directionChanged || transformChanged) {
            camera._directionWC = Cartesian3.fromCartesian4(Matrix4.multiplyByVector(transform, new Cartesian4(direction.x, direction.y, direction.z, 0.0)));
        }

        if (upChanged || transformChanged) {
            camera._upWC = Cartesian3.fromCartesian4(Matrix4.multiplyByVector(transform, new Cartesian4(up.x, up.y, up.z, 0.0)));
        }

        if (rightChanged || transformChanged) {
            camera._rightWC = Cartesian3.fromCartesian4(Matrix4.multiplyByVector(transform, new Cartesian4(right.x, right.y, right.z, 0.0)));
        }

        if (positionChanged || directionChanged || upChanged || rightChanged || transformChanged) {
            updateViewMatrix(camera);
        }
    }

    defineProperties(Camera.prototype, {
        /**
         * Gets the inverse camera transform.
         *
         * @memberof Camera
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         *
         * @see Camera#transform
         */
        inverseTransform : {
            get : function () {
                update(this);
                return this._invTransform;
            }
        },

        /**
         * The view matrix.
         *
         * @memberof Camera
         * @type {Matrix4}
         *
         * @see UniformState#getView
         * @see czm_view
         * @see Camera#inverseViewMatrix
         */
        viewMatrix : {
            get : function () {
                update(this);
                return this._viewMatrix;
            }
        },

        /**
         * The inverse view matrix.
         *
         * @memberof Camera
         * @type {Matrix4}
         *
         * @see UniformState#getInverseView
         * @see czm_inverseView
         * @see Camera#viewMatrix
         */
        inverseViewMatrix : {
            get : function () {
                update(this);
                return this._invViewMatrix;
            }
        },

        /**
         * The position of the camera in world coordinates.
         *
         * @memberof Camera
         * @type {Cartesian3}
         */
        positionWC : {
            get : function() {
                update(this);
                return this._positionWC;
            }
        },

        /**
         * The view direction of the camera in world coordinates.
         *
         * @memberof Camera
         * @type {Cartesian3}
         */
        directionWC : {
            get : function() {
                update(this);
                return this._directionWC;
            }
        },

        /**
         * The up direction of the camera in world coordinates.
         *
         * @memberof Camera
         * @type {Cartesian3}
         */
        upWC : {
            get : function() {
                update(this);
                return this._upWC;
            }
        },

        /**
         * The right direction of the camera in world coordinates.
         *
         * @memberof Camera
         * @type {Cartesian3}
         */
        rightWC : {
            get : function() {
                update(this);
                return this._rightWC;
            }
        }
    });

    /**
     * Returns a duplicate of a Camera instance.
     *
     * @memberof Camera
     *
     * @returns {Camera} A new copy of the Camera instance.
     */
    Camera.prototype.clone = function() {
        var camera = new Camera(this._context);
        camera.position = Cartesian3.clone(this.position);
        camera.direction = Cartesian3.clone(this.direction);
        camera.up = Cartesian3.clone(this.up);
        camera.right = Cartesian3.clone(this.right);
        camera.transform = Matrix4.clone(this.transform);
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
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        return Matrix4.multiplyByVector(this.inverseTransform, cartesian, result);
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
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        return Matrix4.multiplyByVector(this.transform, cartesian, result);
    };

    return Camera;
});
