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
     * @constructor
     *
     * @example
     * // Create a camera looking down the negative z-axis, positioned at the origin,
     * // with a field of view of 60 degrees, and 1:1 aspect ratio.
     * var camera = new Cesium.Camera(context);
     * camera.position = new Cesium.Cartesian3();
     * camera.direction = Cesium.Cartesian3.negate(Cesium.Cartesian3.UNIT_Z);
     * camera.up = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Y);
     * camera.frustum.fovy = Cesium.Math.PI_OVER_THREE;
     * camera.frustum.near = 1.0;
     * camera.frustum.far = 2.0;
     *
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Camera.html">Cesium Sandcastle Camera Demo</a>
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Camera.html">Sandcastle Example</a> from the <a href="http://cesiumjs.org/2013/02/13/Cesium-Camera-Tutorial/">Camera Tutorial</a>
     */
    var Camera = function(context) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(context)) {
            throw new DeveloperError('context is required.');
        }
        //>>includeEnd('debug');

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
        this._transform = Matrix4.clone(Matrix4.IDENTITY);
        this._invTransform = Matrix4.clone(Matrix4.IDENTITY);

        var maxRadii = Ellipsoid.WGS84.maximumRadius;
        var position = Cartesian3.multiplyByScalar(Cartesian3.normalize(new Cartesian3(0.0, -2.0, 1.0)), 2.5 * maxRadii);

        /**
         * The position of the camera.
         *
         * @type {Cartesian3}
         */
        this.position = position;
        this._position = Cartesian3.clone(position);
        this._positionWC = Cartesian3.clone(position);

        var direction = Cartesian3.normalize(Cartesian3.negate(position));

        /**
         * The view direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.direction = direction;
        this._direction = Cartesian3.clone(direction);
        this._directionWC = Cartesian3.clone(direction);

        var right = Cartesian3.normalize(Cartesian3.cross(direction, Cartesian3.UNIT_Z));
        var up = Cartesian3.cross(right, direction);

        /**
         * The up direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.up = up;
        this._up = Cartesian3.clone(up);
        this._upWC = Cartesian3.clone(up);

        right = Cartesian3.cross(direction, up);

        /**
         * The right direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.right = right;
        this._right = Cartesian3.clone(right);
        this._rightWC = Cartesian3.clone(right);

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

        this._viewMatrix = new Matrix4();
        this._invViewMatrix = new Matrix4();
        updateViewMatrix(this);

        this._context = context;
    };

    function updateViewMatrix(camera) {
        var r = camera._right;
        var u = camera._up;
        var d = camera._direction;
        var e = camera._position;

        var viewMatrix = camera._viewMatrix;
        viewMatrix[0] = r.x;
        viewMatrix[1] = u.x;
        viewMatrix[2] = -d.x;
        viewMatrix[3] = 0.0;
        viewMatrix[4] = r.y;
        viewMatrix[5] = u.y;
        viewMatrix[6] = -d.y;
        viewMatrix[7] = 0.0;
        viewMatrix[8] = r.z;
        viewMatrix[9] = u.z;
        viewMatrix[10] = -d.z;
        viewMatrix[11] = 0.0;
        viewMatrix[12] = -Cartesian3.dot(r, e);
        viewMatrix[13] = -Cartesian3.dot(u, e);
        viewMatrix[14] = Cartesian3.dot(d, e);
        viewMatrix[15] = 1.0;

        Matrix4.multiply(viewMatrix, camera._invTransform, camera._viewMatrix);
        Matrix4.inverseTransformation(camera._viewMatrix, camera._invViewMatrix);
    }

    var scratchCartesian = new Cartesian3();

    function update(camera) {
        var position = camera._position;
        var positionChanged = !Cartesian3.equals(position, camera.position);
        if (positionChanged) {
            position = Cartesian3.clone(camera.position, camera._position);
        }

        var direction = camera._direction;
        var directionChanged = !Cartesian3.equals(direction, camera.direction);
        if (directionChanged) {
            direction = Cartesian3.clone(camera.direction, camera._direction);
        }

        var up = camera._up;
        var upChanged = !Cartesian3.equals(up, camera.up);
        if (upChanged) {
            up = Cartesian3.clone(camera.up, camera._up);
        }

        var right = camera._right;
        var rightChanged = !Cartesian3.equals(right, camera.right);
        if (rightChanged) {
            right = Cartesian3.clone(camera.right, camera._right);
        }

        var transform = camera._transform;
        var transformChanged = !Matrix4.equals(transform, camera.transform);
        if (transformChanged) {
            transform = Matrix4.clone(camera.transform, camera._transform);
            Matrix4.inverseTransformation(camera._transform, camera._invTransform);
        }

        if (positionChanged || transformChanged) {
            camera._positionWC = Matrix4.multiplyByPoint(transform, position, camera._positionWC);
        }

        if (directionChanged || upChanged || rightChanged) {
            var det = Cartesian3.dot(direction, Cartesian3.cross(up, right, scratchCartesian));
            if (Math.abs(1.0 - det) > CesiumMath.EPSILON2) {
                //orthonormalize axes
                direction = Cartesian3.normalize(direction, camera._direction);
                Cartesian3.clone(direction, camera.direction);

                var invUpMag = 1.0 / Cartesian3.magnitudeSquared(up);
                var scalar = Cartesian3.dot(up, direction) * invUpMag;
                var w0 = Cartesian3.multiplyByScalar(direction, scalar, scratchCartesian);
                up = Cartesian3.normalize(Cartesian3.subtract(up, w0, camera._up), camera._up);
                Cartesian3.clone(up, camera.up);

                right = Cartesian3.cross(direction, up, camera._right);
                Cartesian3.clone(right, camera.right);
            }
        }

        if (directionChanged || transformChanged) {
            camera._directionWC = Matrix4.multiplyByPointAsVector(transform, direction, camera._directionWC);
        }

        if (upChanged || transformChanged) {
            camera._upWC = Matrix4.multiplyByPointAsVector(transform, up, camera._upWC);
        }

        if (rightChanged || transformChanged) {
            camera._rightWC = Matrix4.multiplyByPointAsVector(transform, right, camera._rightWC);
        }

        if (positionChanged || directionChanged || upChanged || rightChanged || transformChanged) {
            updateViewMatrix(camera);
        }
    }

    defineProperties(Camera.prototype, {
        /**
         * Gets the inverse camera transform.
         * @memberof Camera.prototype
         *
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         */
        inverseTransform : {
            get : function () {
                update(this);
                return this._invTransform;
            }
        },

        /**
         * Gets the view matrix.
         * @memberof Camera.prototype
         *
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
         * Gets the inverse view matrix.
         * @memberof Camera.prototype
         *
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
         * Gets the position of the camera in world coordinates.
         * @memberof Camera.prototype
         * @type {Cartesian3}
         */
        positionWC : {
            get : function() {
                update(this);
                return this._positionWC;
            }
        },

        /**
         * Gets the view direction of the camera in world coordinates.
         * @memberof Camera.prototype
         * @type {Cartesian3}
         */
        directionWC : {
            get : function() {
                update(this);
                return this._directionWC;
            }
        },

        /**
         * Gets the up direction of the camera in world coordinates.
         * @memberof Camera.prototype
         * @type {Cartesian3}
         */
        upWC : {
            get : function() {
                update(this);
                return this._upWC;
            }
        },

        /**
         * Gets the right direction of the camera in world coordinates.
         * @memberof Camera.prototype
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
     * @returns {Cartesian4} The transformed vector or point.
     */
    Camera.prototype.worldToCameraCoordinates = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        return Matrix4.multiplyByVector(this.inverseTransform, cartesian, result);
    };

    /**
     * Transform a vector or point from the camera's reference frame to world coordinates.
     * @memberof Camera
     *
     * @param {Cartesian4} vector The vector or point to transform.
     * @param {Cartesian4} [result] The object onto which to store the result.
     *
     * @returns {Cartesian4} The transformed vector or point.
     */
    Camera.prototype.cameraToWorldCoordinates = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        return Matrix4.multiplyByVector(this.transform, cartesian, result);
    };

    return Camera;
});
