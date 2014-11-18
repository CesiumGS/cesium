/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/EasingFunction',
        '../Core/Ellipsoid',
        '../Core/IntersectionTests',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/Ray',
        '../Core/Rectangle',
        '../Core/Transforms',
        './CameraFlightPath',
        './PerspectiveFrustum',
        './SceneMode'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        EasingFunction,
        Ellipsoid,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        Ray,
        Rectangle,
        Transforms,
        CameraFlightPath,
        PerspectiveFrustum,
        SceneMode) {
    "use strict";

    /**
     * The camera is defined by a position, orientation, and view frustum.
     * <br /><br />
     * The orientation forms an orthonormal basis with a view, up and right = view x up unit vectors.
     * <br /><br />
     * The viewing frustum is defined by 6 planes.
     * Each plane is represented by a {@link Cartesian4} object, where the x, y, and z components
     * define the unit vector normal to the plane, and the w component is the distance of the
     * plane from the origin/camera position.
     *
     * @alias Camera
     *
     * @constructor
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Camera.html|Cesium Sandcastle Camera Demo}
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Camera%20Tutorial.html">Sandcastle Example</a> from the <a href="http://cesiumjs.org/2013/02/13/Cesium-Camera-Tutorial/|Camera Tutorial}
     *
     * @example
     * // Create a camera looking down the negative z-axis, positioned at the origin,
     * // with a field of view of 60 degrees, and 1:1 aspect ratio.
     * var camera = new Cesium.Camera(scene);
     * camera.position = new Cesium.Cartesian3();
     * camera.direction = Cesium.Cartesian3.negate(Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3());
     * camera.up = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Y);
     * camera.frustum.fov = Cesium.Math.PI_OVER_THREE;
     * camera.frustum.near = 1.0;
     * camera.frustum.far = 2.0;
     */
    var Camera = function(scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');
        this._scene = scene;
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
        this._actualTransform = Matrix4.clone(Matrix4.IDENTITY);
        this._actualInvTransform = Matrix4.clone(Matrix4.IDENTITY);

        /**
         * The position of the camera.
         *
         * @type {Cartesian3}
         */
        this.position = new Cartesian3();
        this._position = new Cartesian3();
        this._positionWC = new Cartesian3();
        this._positionCartographic = new Cartographic();

        /**
         * The view direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.direction = new Cartesian3();
        this._direction = new Cartesian3();
        this._directionWC = new Cartesian3();

        /**
         * The up direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.up = new Cartesian3();
        this._up = new Cartesian3();
        this._upWC = new Cartesian3();

        /**
         * The right direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.right = new Cartesian3();
        this._right = new Cartesian3();
        this._rightWC = new Cartesian3();

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
        this.frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        this.frustum.fov = CesiumMath.toRadians(60.0);

        /**
         * The default amount to move the camera when an argument is not
         * provided to the move methods.
         * @type {Number}
         * @default 100000.0;
         */
        this.defaultMoveAmount = 100000.0;
        /**
         * The default amount to rotate the camera when an argument is not
         * provided to the look methods.
         * @type {Number}
         * @default Math.PI / 60.0
         */
        this.defaultLookAmount = Math.PI / 60.0;
        /**
         * The default amount to rotate the camera when an argument is not
         * provided to the rotate methods.
         * @type {Number}
         * @default Math.PI / 3600.0
         */
        this.defaultRotateAmount = Math.PI / 3600.0;
        /**
         * The default amount to move the camera when an argument is not
         * provided to the zoom methods.
         * @type {Number}
         * @default 100000.0;
         */
        this.defaultZoomAmount = 100000.0;
        /**
         * If set, the camera will not be able to rotate past this axis in either direction.
         * @type {Cartesian3}
         * @default undefined
         */
        this.constrainedAxis = undefined;
        /**
         * The factor multiplied by the the map size used to determine where to clamp the camera position
         * when translating across the surface. The default is 1.5. Only valid for 2D and Columbus view.
         * @type {Number}
         * @default 1.5
         */
        this.maximumTranslateFactor = 1.5;
        /**
         * The factor multiplied by the the map size used to determine where to clamp the camera position
         * when zooming out from the surface. The default is 2.5. Only valid for 2D.
         * @type {Number}
         * @default 2.5
         */
        this.maximumZoomFactor = 2.5;

        this._viewMatrix = new Matrix4();
        this._invViewMatrix = new Matrix4();
        updateViewMatrix(this);

        this._mode = SceneMode.SCENE3D;
        this._modeChanged = true;
        var projection = scene.mapProjection;
        this._projection = projection;
        this._maxCoord = projection.project(new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO));
        this._max2Dfrustum = undefined;

        // set default view
        this.viewRectangle(Camera.DEFAULT_VIEW_RECTANGLE);

        var mag = Cartesian3.magnitude(this.position);
        mag += mag * Camera.DEFAULT_VIEW_FACTOR;
        Cartesian3.normalize(this.position, this.position);
        Cartesian3.multiplyByScalar(this.position, mag, this.position);
    };

    /**
     * @private
     */
    Camera.TRANSFORM_2D = new Matrix4(
        0.0, 0.0, 1.0, 0.0,
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 1.0);

    /**
     * @private
     */
    Camera.TRANSFORM_2D_INVERSE = Matrix4.inverseTransformation(Camera.TRANSFORM_2D, new Matrix4());

    /**
     * The default extent the camera will view on creation.
     * @type Rectangle
     */
    Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(-95.0, -20.0, -70.0, 90.0);

    /**
     * A scalar to multiply to the camera position and add it back after setting the camera to view the rectangle.
     * A value of zero means the camera will view the entire {@link Camera#DEFAULT_VIEW_RECTANGLE}, a value greater than zero
     * will move it further away from the extent, and a value less than zero will move it close to the extent.
     * @type Number
     */
    Camera.DEFAULT_VIEW_FACTOR = 0.5;

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

        Matrix4.multiply(viewMatrix, camera._actualInvTransform, camera._viewMatrix);
        Matrix4.inverseTransformation(camera._viewMatrix, camera._invViewMatrix);
    }

    var scratchCartographic = new Cartographic();
    var scratchCartesian3Projection = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4Origin = new Cartesian4();
    var scratchCartesian4NewOrigin = new Cartesian4();
    var scratchCartesian4NewXAxis = new Cartesian4();
    var scratchCartesian4NewYAxis = new Cartesian4();
    var scratchCartesian4NewZAxis = new Cartesian4();

    function convertTransformForColumbusView(camera) {
        var projection = camera._projection;
        var ellipsoid = projection.ellipsoid;

        var origin = Matrix4.getColumn(camera._transform, 3, scratchCartesian4Origin);
        var cartographic = ellipsoid.cartesianToCartographic(origin, scratchCartographic);

        var projectedPosition = projection.project(cartographic, scratchCartesian3Projection);
        var newOrigin = scratchCartesian4NewOrigin;
        newOrigin.x = projectedPosition.z;
        newOrigin.y = projectedPosition.x;
        newOrigin.z = projectedPosition.y;
        newOrigin.w = 1.0;

        var xAxis = Cartesian4.add(Matrix4.getColumn(camera._transform, 0, scratchCartesian3), origin, scratchCartesian3);
        ellipsoid.cartesianToCartographic(xAxis, cartographic);

        projection.project(cartographic, projectedPosition);
        var newXAxis = scratchCartesian4NewXAxis;
        newXAxis.x = projectedPosition.z;
        newXAxis.y = projectedPosition.x;
        newXAxis.z = projectedPosition.y;
        newXAxis.w = 0.0;

        Cartesian3.subtract(newXAxis, newOrigin, newXAxis);

        var yAxis = Cartesian4.add(Matrix4.getColumn(camera._transform, 1, scratchCartesian3), origin, scratchCartesian3);
        ellipsoid.cartesianToCartographic(yAxis, cartographic);

        projection.project(cartographic, projectedPosition);
        var newYAxis = scratchCartesian4NewYAxis;
        newYAxis.x = projectedPosition.z;
        newYAxis.y = projectedPosition.x;
        newYAxis.z = projectedPosition.y;
        newYAxis.w = 0.0;

        Cartesian3.subtract(newYAxis, newOrigin, newYAxis);

        var newZAxis = scratchCartesian4NewZAxis;
        Cartesian3.cross(newXAxis, newYAxis, newZAxis);
        Cartesian3.normalize(newZAxis, newZAxis);
        Cartesian3.cross(newYAxis, newZAxis, newXAxis);
        Cartesian3.normalize(newXAxis, newXAxis);
        Cartesian3.cross(newZAxis, newXAxis, newYAxis);
        Cartesian3.normalize(newYAxis, newYAxis);

        Matrix4.setColumn(camera._actualTransform, 0, newXAxis, camera._actualTransform);
        Matrix4.setColumn(camera._actualTransform, 1, newYAxis, camera._actualTransform);
        Matrix4.setColumn(camera._actualTransform, 2, newZAxis, camera._actualTransform);
        Matrix4.setColumn(camera._actualTransform, 3, newOrigin, camera._actualTransform);
    }

    function convertTransformFor2D(camera) {
        var projection = camera._projection;
        var ellipsoid = projection.ellipsoid;

        var origin = Matrix4.getColumn(camera._transform, 3, scratchCartesian4Origin);
        var cartographic = ellipsoid.cartesianToCartographic(origin, scratchCartographic);

        var projectedPosition = projection.project(cartographic, scratchCartesian3Projection);
        var newOrigin = scratchCartesian4NewOrigin;
        newOrigin.x = projectedPosition.z;
        newOrigin.y = projectedPosition.x;
        newOrigin.z = projectedPosition.y;
        newOrigin.w = 1.0;

        var newZAxis = Cartesian4.clone(Cartesian4.UNIT_X, scratchCartesian4NewZAxis);

        var xAxis = Cartesian4.add(Matrix4.getColumn(camera._transform, 0, scratchCartesian3), origin, scratchCartesian3);
        ellipsoid.cartesianToCartographic(xAxis, cartographic);

        projection.project(cartographic, projectedPosition);
        var newXAxis = scratchCartesian4NewXAxis;
        newXAxis.x = projectedPosition.z;
        newXAxis.y = projectedPosition.x;
        newXAxis.z = projectedPosition.y;
        newXAxis.w = 0.0;

        Cartesian3.subtract(newXAxis, newOrigin, newXAxis);
        newXAxis.x = 0.0;

        var newYAxis = scratchCartesian4NewYAxis;
        if (Cartesian3.magnitudeSquared(newXAxis) > CesiumMath.EPSILON10) {
            Cartesian3.cross(newZAxis, newXAxis, newYAxis);
        } else {
            var yAxis = Cartesian4.add(Matrix4.getColumn(camera._transform, 1, scratchCartesian3), origin, scratchCartesian3);
            ellipsoid.cartesianToCartographic(yAxis, cartographic);

            projection.project(cartographic, projectedPosition);
            newYAxis.x = projectedPosition.z;
            newYAxis.y = projectedPosition.x;
            newYAxis.z = projectedPosition.y;
            newYAxis.w = 0.0;

            Cartesian3.subtract(newYAxis, newOrigin, newYAxis);
            newYAxis.x = 0.0;

            if (Cartesian3.magnitudeSquared(newYAxis) < CesiumMath.EPSILON10) {
                Cartesian4.clone(Cartesian4.UNIT_Y, newXAxis);
                Cartesian4.clone(Cartesian4.UNIT_Z, newYAxis);
            }
        }

        Cartesian3.cross(newYAxis, newZAxis, newXAxis);
        Cartesian3.normalize(newXAxis, newXAxis);
        Cartesian3.cross(newZAxis, newXAxis, newYAxis);
        Cartesian3.normalize(newYAxis, newYAxis);

        Matrix4.setColumn(camera._actualTransform, 0, newXAxis, camera._actualTransform);
        Matrix4.setColumn(camera._actualTransform, 1, newYAxis, camera._actualTransform);
        Matrix4.setColumn(camera._actualTransform, 2, newZAxis, camera._actualTransform);
        Matrix4.setColumn(camera._actualTransform, 3, newOrigin, camera._actualTransform);
    }

    var scratchCartesian = new Cartesian3();

    function updateMembers(camera) {
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

        var transformChanged = !Matrix4.equals(camera._transform, camera.transform) || camera._modeChanged;
        if (transformChanged) {
            Matrix4.clone(camera.transform, camera._transform);
            Matrix4.inverseTransformation(camera._transform, camera._invTransform);

            if (camera._mode === SceneMode.COLUMBUS_VIEW || camera._mode === SceneMode.SCENE2D) {
                if (Matrix4.equals(Matrix4.IDENTITY, camera._transform)) {
                    Matrix4.clone(Camera.TRANSFORM_2D, camera._actualTransform);
                } else if (camera._mode === SceneMode.COLUMBUS_VIEW) {
                    convertTransformForColumbusView(camera);
                } else {
                    convertTransformFor2D(camera);
                }
            } else {
                Matrix4.clone(camera._transform, camera._actualTransform);
            }

            Matrix4.inverseTransformation(camera._actualTransform, camera._actualInvTransform);

            camera._modeChanged = false;
        }

        var transform = camera._actualTransform;

        if (positionChanged || transformChanged) {
            camera._positionWC = Matrix4.multiplyByPoint(transform, position, camera._positionWC);

            // Compute the Cartographic position of the camera.
            var mode = camera._mode;
            if (mode === SceneMode.SCENE3D || mode === SceneMode.MORPHING) {
                camera._positionCartographic = camera._projection.ellipsoid.cartesianToCartographic(camera._positionWC, camera._positionCartographic);
            } else {
                // The camera position is expressed in the 2D coordinate system where the Y axis is to the East,
                // the Z axis is to the North, and the X axis is out of the map.  Express them instead in the ENU axes where
                // X is to the East, Y is to the North, and Z is out of the local horizontal plane.
                var positionENU = scratchCartesian;
                positionENU.x = camera._positionWC.y;
                positionENU.y = camera._positionWC.z;
                positionENU.z = camera._positionWC.x;

                // In 2D, the camera height is always 12.7 million meters.
                // The apparent height is equal to half the frustum width.
                if (mode === SceneMode.SCENE2D) {
                    positionENU.z = (camera.frustum.right - camera.frustum.left) * 0.5;
                }

                camera._projection.unproject(positionENU, camera._positionCartographic);
            }
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

    function getHeading2D(camera) {
        return Math.atan2(camera.right.y, camera.right.x);
    }

    var scratchHeadingMatrix4 = new Matrix4();
    var scratchHeadingMatrix3 = new Matrix3();
    var scratchHeadingCartesian3 = new Cartesian3();

    function getHeading3D(camera) {
        var ellipsoid = camera._projection.ellipsoid;
        var toFixedFrame = Transforms.eastNorthUpToFixedFrame(camera.position, ellipsoid, scratchHeadingMatrix4);
        var transform = Matrix4.getRotation(toFixedFrame, scratchHeadingMatrix3);
        Matrix3.transpose(transform, transform);

        var right = Matrix3.multiplyByVector(transform, camera.right, scratchHeadingCartesian3);
        return Math.atan2(right.y, right.x);
    }

    function setHeading2D(camera, angle) {
        var rightAngle = getHeading2D(camera);
        angle = rightAngle - angle;
        camera.look(Cartesian3.UNIT_Z, angle);
    }

    var scratchHeadingAxis = new Cartesian3();

    function setHeading3D(camera, angle) {
        var axis = Cartesian3.normalize(camera.position, scratchHeadingAxis);
        var upAngle = getHeading3D(camera);
        angle = upAngle - angle;
        camera.look(axis, angle);
    }

    function getTiltCV(camera) {
        // CesiumMath.acosClamped(dot(camera.direction, Cartesian3.negate(Cartesian3.UNIT_Z))
        return CesiumMath.PI_OVER_TWO - CesiumMath.acosClamped(-camera.direction.z);
    }

    var scratchTiltCartesian3 = new Cartesian3();

    function getTilt3D(camera) {
        var direction = Cartesian3.normalize(camera.position, scratchTiltCartesian3);
        Cartesian3.negate(direction, direction);

        return CesiumMath.PI_OVER_TWO - CesiumMath.acosClamped(Cartesian3.dot(camera.direction, direction));
    }

    defineProperties(Camera.prototype, {
        /**
         * Gets the inverse camera transform.
         * @memberof Camera.prototype
         *
         * @type {Matrix4}
         * @readonly
         *
         * @default {@link Matrix4.IDENTITY}
         */
        inverseTransform : {
            get : function() {
                updateMembers(this);
                return this._invTransform;
            }
        },

        /**
         * Gets the view matrix.
         * @memberof Camera.prototype
         *
         * @type {Matrix4}
         * @readonly
         *
         * @see Camera#inverseViewMatrix
         */
        viewMatrix : {
            get : function() {
                updateMembers(this);
                return this._viewMatrix;
            }
        },

        /**
         * Gets the inverse view matrix.
         * @memberof Camera.prototype
         *
         * @type {Matrix4}
         * @readonly
         *
         * @see Camera#viewMatrix
         */
        inverseViewMatrix : {
            get : function() {
                updateMembers(this);
                return this._invViewMatrix;
            }
        },

        /**
         * Gets the {@link Cartographic} position of the camera, with longitude and latitude
         * expressed in radians and height in meters.  In 2D and Columbus View, it is possible
         * for the returned longitude and latitude to be outside the range of valid longitudes
         * and latitudes when the camera is outside the map.
         * @memberof Camera.prototype
         *
         * @type {Cartographic}
         */
        positionCartographic : {
            get : function() {
                updateMembers(this);
                return this._positionCartographic;
            }
        },

        /**
         * Gets the position of the camera in world coordinates.
         * @memberof Camera.prototype
         *
         * @type {Cartesian3}
         * @readonly
         */
        positionWC : {
            get : function() {
                updateMembers(this);
                return this._positionWC;
            }
        },

        /**
         * Gets the view direction of the camera in world coordinates.
         * @memberof Camera.prototype
         *
         * @type {Cartesian3}
         * @readonly
         */
        directionWC : {
            get : function() {
                updateMembers(this);
                return this._directionWC;
            }
        },

        /**
         * Gets the up direction of the camera in world coordinates.
         * @memberof Camera.prototype
         *
         * @type {Cartesian3}
         * @readonly
         */
        upWC : {
            get : function() {
                updateMembers(this);
                return this._upWC;
            }
        },

        /**
         * Gets the right direction of the camera in world coordinates.
         * @memberof Camera.prototype
         *
         * @type {Cartesian3}
         * @readonly
         */
        rightWC : {
            get : function() {
                updateMembers(this);
                return this._rightWC;
            }
        },

        /**
         * Gets or sets the camera heading in radians.
         * @memberof Camera.prototype
         *
         * @type {Number}
         */
        heading : {
            get : function () {
                if (this._mode === SceneMode.SCENE2D || this._mode === SceneMode.COLUMBUS_VIEW) {
                    return getHeading2D(this);
                } else if (this._mode === SceneMode.SCENE3D) {
                    return getHeading3D(this);
                }

                return undefined;
            },
            //TODO See https://github.com/AnalyticalGraphicsInc/cesium/issues/832
            set : function (angle) {

                //>>includeStart('debug', pragmas.debug);
                if (!defined(angle)) {
                    throw new DeveloperError('angle is required.');
                }
                //>>includeEnd('debug');

                if (this._mode === SceneMode.SCENE2D || this._mode === SceneMode.COLUMBUS_VIEW) {
                    setHeading2D(this, angle);
                } else if (this._mode === SceneMode.SCENE3D) {
                    setHeading3D(this, angle);
                }
            }
        },

        /**
         * Gets or sets the camera tilt in radians.
         * @memberof Camera.prototype
         *
         * @type {Number}
         */
        tilt : {
            get : function() {
                if (this._mode === SceneMode.COLUMBUS_VIEW) {
                    return getTiltCV(this);
                } else if (this._mode === SceneMode.SCENE3D) {
                    return getTilt3D(this);
                }

                return undefined;
            },
            //TODO See https://github.com/AnalyticalGraphicsInc/cesium/issues/832
            set : function(angle) {

                //>>includeStart('debug', pragmas.debug);
                if (!defined(angle)) {
                    throw new DeveloperError('angle is required.');
                }
                //>>includeEnd('debug');

                if (this._mode === SceneMode.COLUMBUS_VIEW || this._mode === SceneMode.SCENE3D) {
                    angle = CesiumMath.clamp(angle, -CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO);
                    angle = angle - this.tilt;
                    this.look(this.right, angle);
                }
            }
        }
    });

    /**
     * @private
     */
    Camera.prototype.update = function(mode) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(mode)) {
            throw new DeveloperError('mode is required.');
        }
        //>>includeEnd('debug');

        var updateFrustum = false;
        if (mode !== this._mode) {
            this._mode = mode;
            this._modeChanged = mode !== SceneMode.MORPHING;
            updateFrustum = this._mode === SceneMode.SCENE2D;
        }

        if (updateFrustum) {
            var frustum = this._max2Dfrustum = this.frustum.clone();

            //>>includeStart('debug', pragmas.debug);
            if (!defined(frustum.left) || !defined(frustum.right) ||
               !defined(frustum.top) || !defined(frustum.bottom)) {
                throw new DeveloperError('The camera frustum is expected to be orthographic for 2D camera control.');
            }
            //>>includeEnd('debug');

            var maxZoomOut = 2.0;
            var ratio = frustum.top / frustum.right;
            frustum.right = this._maxCoord.x * maxZoomOut;
            frustum.left = -frustum.right;
            frustum.top = ratio * frustum.right;
            frustum.bottom = -frustum.top;
        }
    };

    var setTransformPosition = new Cartesian3();
    var setTransformUp = new Cartesian3();
    var setTransformDirection = new Cartesian3();

    /**
     * Sets the camera's transform without changing the current view.
     *
     * @param {Matrix4} transform The camera transform.
     */
    Camera.prototype.setTransform = function(transform) {
        var position = Cartesian3.clone(this.positionWC, setTransformPosition);
        var up = Cartesian3.clone(this.upWC, setTransformUp);
        var direction = Cartesian3.clone(this.directionWC, setTransformDirection);

        Matrix4.clone(transform, this.transform);
        updateMembers(this);
        var inverse = this._actualInvTransform;

        Matrix4.multiplyByPoint(inverse, position, this.position);
        Matrix4.multiplyByPointAsVector(inverse, direction, this.direction);
        Matrix4.multiplyByPointAsVector(inverse, up, this.up);
        Cartesian3.cross(this.direction, this.up, this.right);
    };

    /**
     * Transform a vector or point from world coordinates to the camera's reference frame.
     *
     * @param {Cartesian4} cartesian The vector or point to transform.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The transformed vector or point.
     */
    Camera.prototype.worldToCameraCoordinates = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)){
            result = new Cartesian4();
        }
        updateMembers(this);
        return Matrix4.multiplyByVector(this._actualInvTransform, cartesian, result);
    };

    /**
     * Transform a point from world coordinates to the camera's reference frame.
     *
     * @param {Cartesian3} cartesian The point to transform.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The transformed point.
     */
    Camera.prototype.worldToCameraCoordinatesPoint = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)){
            result = new Cartesian3();
        }
        updateMembers(this);
        return Matrix4.multiplyByPoint(this._actualInvTransform, cartesian, result);
    };

    /**
     * Transform a vector from world coordinates to the camera's reference frame.
     *
     * @param {Cartesian3} cartesian The vector to transform.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The transformed vector.
     */
    Camera.prototype.worldToCameraCoordinatesVector = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)){
            result = new Cartesian3();
        }
        updateMembers(this);
        return Matrix4.multiplyByPointAsVector(this._actualInvTransform, cartesian, result);
    };

    /**
     * Transform a vector or point from the camera's reference frame to world coordinates.
     *
     * @param {Cartesian4} cartesian The vector or point to transform.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @returns {Cartesian4} The transformed vector or point.
     */
    Camera.prototype.cameraToWorldCoordinates = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)){
            result = new Cartesian4();
        }
        updateMembers(this);
        return Matrix4.multiplyByVector(this._actualTransform, cartesian, result);
    };

    /**
     * Transform a point from the camera's reference frame to world coordinates.
     *
     * @param {Cartesian3} cartesian The point to transform.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The transformed point.
     */
    Camera.prototype.cameraToWorldCoordinatesPoint = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)){
            result = new Cartesian3();
        }
        updateMembers(this);
        return Matrix4.multiplyByPoint(this._actualTransform, cartesian, result);
    };

    /**
     * Transform a vector from the camera's reference frame to world coordinates.
     *
     * @param {Cartesian3} cartesian The vector to transform.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The transformed vector.
     */
    Camera.prototype.cameraToWorldCoordinatesVector = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)){
            result = new Cartesian3();
        }
        updateMembers(this);
        return Matrix4.multiplyByPointAsVector(this._actualTransform, cartesian, result);
    };

    function clampMove2D(camera, position) {
        var maxX = camera._maxCoord.x * camera.maximumTranslateFactor;
        if (position.x > maxX) {
            position.x = maxX;
        }
        if (position.x < -maxX) {
            position.x = -maxX;
        }

        var maxY = camera._maxCoord.y * camera.maximumTranslateFactor;
        if (position.y > maxY) {
            position.y = maxY;
        }
        if (position.y < -maxY) {
            position.y = -maxY;
        }
    }

    var moveScratch = new Cartesian3();
    /**
     * Translates the camera's position by <code>amount</code> along <code>direction</code>.
     *
     * @param {Cartesian3} direction The direction to move.
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @see Camera#moveBackward
     * @see Camera#moveForward
     * @see Camera#moveLeft
     * @see Camera#moveRight
     * @see Camera#moveUp
     * @see Camera#moveDown
     */
    Camera.prototype.move = function(direction, amount) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(direction)) {
            throw new DeveloperError('direction is required.');
        }
        //>>includeEnd('debug');

        var cameraPosition = this.position;
        Cartesian3.multiplyByScalar(direction, amount, moveScratch);
        Cartesian3.add(cameraPosition, moveScratch, cameraPosition);

        if (this._mode === SceneMode.SCENE2D) {
            clampMove2D(this, cameraPosition);
        }
    };

    /**
     * Translates the camera's position by <code>amount</code> along the camera's view vector.
     *
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @see Camera#moveBackward
     */
    Camera.prototype.moveForward = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.direction, amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the opposite direction
     * of the camera's view vector.
     *
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @see Camera#moveForward
     */
    Camera.prototype.moveBackward = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.direction, -amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the camera's up vector.
     *
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @see Camera#moveDown
     */
    Camera.prototype.moveUp = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.up, amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the opposite direction
     * of the camera's up vector.
     *
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @see Camera#moveUp
     */
    Camera.prototype.moveDown = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.up, -amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the camera's right vector.
     *
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @see Camera#moveLeft
     */
    Camera.prototype.moveRight = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.right, amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the opposite direction
     * of the camera's right vector.
     *
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @see Camera#moveRight
     */
    Camera.prototype.moveLeft = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this.right, -amount);
    };

    /**
     * Rotates the camera around its up vector by amount, in radians, in the opposite direction
     * of its right vector.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#lookRight
     */
    Camera.prototype.lookLeft = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this.up, -amount);
    };

    /**
     * Rotates the camera around its up vector by amount, in radians, in the direction
     * of its right vector.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#lookLeft
     */
    Camera.prototype.lookRight = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this.up, amount);
    };

    /**
     * Rotates the camera around its right vector by amount, in radians, in the direction
     * of its up vector.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#lookDown
     */
    Camera.prototype.lookUp = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this.right, -amount);
    };

    /**
     * Rotates the camera around its right vector by amount, in radians, in the opposite direction
     * of its up vector.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#lookUp
     */
    Camera.prototype.lookDown = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this.right, amount);
    };

    var lookScratchQuaternion = new Quaternion();
    var lookScratchMatrix = new Matrix3();
    /**
     * Rotate each of the camera's orientation vectors around <code>axis</code> by <code>angle</code>
     *
     * @param {Cartesian3} axis The axis to rotate around.
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#lookUp
     * @see Camera#lookDown
     * @see Camera#lookLeft
     * @see Camera#lookRight
     */
    Camera.prototype.look = function(axis, angle) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(axis)) {
            throw new DeveloperError('axis is required.');
        }
        //>>includeEnd('debug');

        var turnAngle = defaultValue(angle, this.defaultLookAmount);
        var quaternion = Quaternion.fromAxisAngle(axis, -turnAngle, lookScratchQuaternion);
        var rotation = Matrix3.fromQuaternion(quaternion, lookScratchMatrix);

        var direction = this.direction;
        var up = this.up;
        var right = this.right;

        Matrix3.multiplyByVector(rotation, direction, direction);
        Matrix3.multiplyByVector(rotation, up, up);
        Matrix3.multiplyByVector(rotation, right, right);
    };

    /**
     * Rotate the camera counter-clockwise around its direction vector by amount, in radians.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#twistRight
     */
    Camera.prototype.twistLeft = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this.direction, amount);
    };

    /**
     * Rotate the camera clockwise around its direction vector by amount, in radians.
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see Camera#twistLeft
     */
    Camera.prototype.twistRight = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this.direction, -amount);
    };

    var rotateScratchQuaternion = new Quaternion();
    var rotateScratchMatrix = new Matrix3();
    /**
     * Rotates the camera around <code>axis</code> by <code>angle</code>. The distance
     * of the camera's position to the center of the camera's reference frame remains the same.
     *
     * @param {Cartesian3} axis The axis to rotate around given in world coordinates.
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateUp
     * @see Camera#rotateDown
     * @see Camera#rotateLeft
     * @see Camera#rotateRight
    */
    Camera.prototype.rotate = function(axis, angle) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(axis)) {
            throw new DeveloperError('axis is required.');
        }
        //>>includeEnd('debug');

        var turnAngle = defaultValue(angle, this.defaultRotateAmount);
        var quaternion = Quaternion.fromAxisAngle(axis, -turnAngle, rotateScratchQuaternion);
        var rotation = Matrix3.fromQuaternion(quaternion, rotateScratchMatrix);
        Matrix3.multiplyByVector(rotation, this.position, this.position);
        Matrix3.multiplyByVector(rotation, this.direction, this.direction);
        Matrix3.multiplyByVector(rotation, this.up, this.up);
        Cartesian3.cross(this.direction, this.up, this.right);
        Cartesian3.cross(this.right, this.direction, this.up);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle downwards.
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateUp
     * @see Camera#rotate
     */
    Camera.prototype.rotateDown = function(angle) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateVertical(this, angle);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle upwards.
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateDown
     * @see Camera#rotate
     */
    Camera.prototype.rotateUp = function(angle) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateVertical(this, -angle);
    };

    var rotateVertScratchP = new Cartesian3();
    var rotateVertScratchA = new Cartesian3();
    var rotateVertScratchTan = new Cartesian3();
    var rotateVertScratchNegate = new Cartesian3();
    function rotateVertical(camera, angle) {
        var position = camera.position;
        var p = Cartesian3.normalize(position, rotateVertScratchP);
        if (defined(camera.constrainedAxis)) {
            var northParallel = Cartesian3.equalsEpsilon(p, camera.constrainedAxis, CesiumMath.EPSILON2);
            var southParallel = Cartesian3.equalsEpsilon(p, Cartesian3.negate(camera.constrainedAxis, rotateVertScratchNegate), CesiumMath.EPSILON2);
            if ((!northParallel && !southParallel)) {
                var constrainedAxis = Cartesian3.normalize(camera.constrainedAxis, rotateVertScratchA);

                var dot = Cartesian3.dot(p, constrainedAxis);
                var angleToAxis = CesiumMath.acosClamped(dot);
                if (angle > 0 && angle > angleToAxis) {
                    angle = angleToAxis - CesiumMath.EPSILON4;
                }

                dot = Cartesian3.dot(p, Cartesian3.negate(constrainedAxis, rotateVertScratchNegate));
                angleToAxis = CesiumMath.acosClamped(dot);
                if (angle < 0 && -angle > angleToAxis) {
                    angle = -angleToAxis + CesiumMath.EPSILON4;
                }

                var tangent = Cartesian3.cross(constrainedAxis, p, rotateVertScratchTan);
                camera.rotate(tangent, angle);
            } else if ((northParallel && angle < 0) || (southParallel && angle > 0)) {
                camera.rotate(camera.right, angle);
            }
        } else {
            camera.rotate(camera.right, angle);
        }
    }

    /**
     * Rotates the camera around the center of the camera's reference frame by angle to the right.
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateLeft
     * @see Camera#rotate
     */
    Camera.prototype.rotateRight = function(angle) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateHorizontal(this, -angle);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle to the left.
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     *
     * @see Camera#rotateRight
     * @see Camera#rotate
     */
    Camera.prototype.rotateLeft = function(angle) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateHorizontal(this, angle);
    };

    function rotateHorizontal(camera, angle) {
        if (defined(camera.constrainedAxis)) {
            camera.rotate(camera.constrainedAxis, angle);
        } else {
            camera.rotate(camera.up, angle);
        }
    }

    function zoom2D(camera, amount) {
        var frustum = camera.frustum;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(frustum.left) || !defined(frustum.right) || !defined(frustum.top) || !defined(frustum.bottom)) {
            throw new DeveloperError('The camera frustum is expected to be orthographic for 2D camera control.');
        }
        //>>includeEnd('debug');

        amount = amount * 0.5;
        var newRight = frustum.right - amount;
        var newLeft = frustum.left + amount;

        var maxRight = camera._maxCoord.x * camera.maximumZoomFactor;
        if (newRight > maxRight) {
            newRight = maxRight;
            newLeft = -maxRight;
        }

        if (newRight <= newLeft) {
            newRight = 1.0;
            newLeft = -1.0;
        }

        var ratio = frustum.top / frustum.right;
        frustum.right = newRight;
        frustum.left = newLeft;
        frustum.top = frustum.right * ratio;
        frustum.bottom = -frustum.top;
    }

    function zoom3D(camera, amount) {
        camera.move(camera.direction, amount);
    }

    /**
     * Zooms <code>amount</code> along the camera's view vector.
     *
     * @param {Number} [amount] The amount to move. Defaults to <code>defaultZoomAmount</code>.
     *
     * @see Camera#zoomOut
     */
    Camera.prototype.zoomIn = function(amount) {
        amount = defaultValue(amount, this.defaultZoomAmount);
        if (this._mode === SceneMode.SCENE2D) {
            zoom2D(this, amount);
        } else {
            zoom3D(this, amount);
        }
    };

    /**
     * Zooms <code>amount</code> along the opposite direction of
     * the camera's view vector.
     *
     * @param {Number} [amount] The amount to move. Defaults to <code>defaultZoomAmount</code>.
     *
     * @see Camera#zoomIn
     */
    Camera.prototype.zoomOut = function(amount) {
        amount = defaultValue(amount, this.defaultZoomAmount);
        if (this._mode === SceneMode.SCENE2D) {
            zoom2D(this, -amount);
        } else {
            zoom3D(this, -amount);
        }
    };

    /**
     * Gets the magnitude of the camera position. In 3D, this is the vector magnitude. In 2D and
     * Columbus view, this is the distance to the map.
     *
     * @returns {Number} The magnitude of the position.
     */
    Camera.prototype.getMagnitude = function() {
        if (this._mode === SceneMode.SCENE3D) {
            return Cartesian3.magnitude(this.position);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            return Math.abs(this.position.z);
        } else if (this._mode === SceneMode.SCENE2D) {
            return  Math.max(this.frustum.right - this.frustum.left, this.frustum.top - this.frustum.bottom);
        }
    };

    function setPositionCartographic2D(camera, cartographic) {
        var newLeft = -cartographic.height * 0.5;
        var newRight = -newLeft;

        var frustum = camera.frustum;
        if (newRight > newLeft) {
            var ratio = frustum.top / frustum.right;
            frustum.right = newRight;
            frustum.left = newLeft;
            frustum.top = frustum.right * ratio;
            frustum.bottom = -frustum.top;
        }

        //We use Cartesian2 instead of 3 here because Z must be constant in 2D mode.
        Cartesian2.clone(camera._projection.project(cartographic), camera.position);
        Cartesian3.negate(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_X, camera.right);
    }

    function setPositionCartographicCV(camera, cartographic) {
        var projection = camera._projection;
        camera.position = projection.project(cartographic);
        Cartesian3.negate(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_X, camera.right);
    }

    function setPositionCartographic3D(camera, cartographic) {
        var ellipsoid = camera._projection.ellipsoid;

        ellipsoid.cartographicToCartesian(cartographic, camera.position);
        Cartesian3.negate(camera.position, camera.direction);
        Cartesian3.normalize(camera.direction, camera.direction);
        Cartesian3.cross(camera.direction, Cartesian3.UNIT_Z, camera.right);
        Cartesian3.cross(camera.right, camera.direction, camera.up);
        Cartesian3.cross(camera.direction, camera.up, camera.right);
    }

    /**
     * Moves the camera to the provided cartographic position.
     *
     * @param {Cartographic} cartographic The new camera position.
     */
    Camera.prototype.setPositionCartographic = function(cartographic) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartographic)) {
            throw new DeveloperError('cartographic is required.');
        }
        //>>includeEnd('debug');

        if (this._mode === SceneMode.SCENE2D) {
            setPositionCartographic2D(this, cartographic);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            setPositionCartographicCV(this, cartographic);
        } else if (this._mode === SceneMode.SCENE3D) {
            setPositionCartographic3D(this, cartographic);
        }
    };

    /**
     * Sets the camera position and orientation with an eye position, target, and up vector.
     * This method is not supported in 2D mode because there is only one direction to look.
     *
     * @param {Cartesian3} eye The position of the camera.
     * @param {Cartesian3} target The position to look at.
     * @param {Cartesian3} up The up vector.
     *
     * @exception {DeveloperError} lookAt is not supported while morphing.
     */
    Camera.prototype.lookAt = function(eye, target, up) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(eye)) {
            throw new DeveloperError('eye is required');
        }
        if (!defined(target)) {
            throw new DeveloperError('target is required');
        }
        if (!defined(up)) {
            throw new DeveloperError('up is required');
        }
        if (this._mode === SceneMode.MORPHING) {
            throw new DeveloperError('lookAt is not supported while morphing.');
        }
        //>>includeEnd('debug');

        if (this._mode === SceneMode.SCENE2D) {
            Cartesian2.clone(target, this.position);
            Cartesian3.negate(Cartesian3.UNIT_Z, this.direction);

            Cartesian3.clone(up, this.up);
            this.up.z = 0.0;

            if (Cartesian3.magnitudeSquared(this.up) < CesiumMath.EPSILON10) {
                Cartesian3.clone(Cartesian3.UNIT_Y, this.up);
            }

            Cartesian3.cross(this.direction, this.up, this.right);

            var frustum = this.frustum;
            var ratio = frustum.top / frustum.right;
            frustum.right = eye.z;
            frustum.left = -frustum.right;
            frustum.top = ratio * frustum.right;
            frustum.bottom = -frustum.top;

            return;
        }

        this.position = Cartesian3.clone(eye, this.position);
        this.direction = Cartesian3.normalize(Cartesian3.subtract(target, eye, this.direction), this.direction);
        this.right = Cartesian3.normalize(Cartesian3.cross(this.direction, up, this.right), this.right);
        this.up = Cartesian3.cross(this.right, this.direction, this.up);
    };

    var viewRectangle3DCartographic = new Cartographic();
    var viewRectangle3DNorthEast = new Cartesian3();
    var viewRectangle3DSouthWest = new Cartesian3();
    var viewRectangle3DNorthWest = new Cartesian3();
    var viewRectangle3DSouthEast = new Cartesian3();
    var viewRectangle3DCenter = new Cartesian3();
    var defaultRF = {direction: new Cartesian3(), right: new Cartesian3(), up: new Cartesian3()};
    function rectangleCameraPosition3D (camera, rectangle, ellipsoid, result, positionOnly) {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        var cameraRF = camera;
        if (positionOnly) {
            cameraRF = defaultRF;
        }
        var north = rectangle.north;
        var south = rectangle.south;
        var east = rectangle.east;
        var west = rectangle.west;

        // If we go across the International Date Line
        if (west > east) {
            east += CesiumMath.TWO_PI;
        }

        var cart = viewRectangle3DCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var northEast = ellipsoid.cartographicToCartesian(cart, viewRectangle3DNorthEast);
        cart.latitude = south;
        var southEast = ellipsoid.cartographicToCartesian(cart, viewRectangle3DSouthEast);
        cart.longitude = west;
        var southWest = ellipsoid.cartographicToCartesian(cart, viewRectangle3DSouthWest);
        cart.latitude = north;
        var northWest = ellipsoid.cartographicToCartesian(cart, viewRectangle3DNorthWest);

        var center = Cartesian3.subtract(northEast, southWest, viewRectangle3DCenter);
        Cartesian3.multiplyByScalar(center, 0.5, center);
        Cartesian3.add(southWest, center, center);

        var mag = Cartesian3.magnitude(center);
        if (mag < CesiumMath.EPSILON6) {
            cart.longitude = (east + west) * 0.5;
            cart.latitude = (north + south) * 0.5;
            ellipsoid.cartographicToCartesian(cart, center);
        }

        Cartesian3.subtract(northWest, center, northWest);
        Cartesian3.subtract(southEast, center, southEast);
        Cartesian3.subtract(northEast, center, northEast);
        Cartesian3.subtract(southWest, center, southWest);

        var direction = Cartesian3.negate(center, cameraRF.direction);
        Cartesian3.normalize(direction, direction);
        var right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, cameraRF.right);
        Cartesian3.normalize(right, right);
        var up = Cartesian3.cross(right, direction, cameraRF.up);

        var height = Math.max(
          Math.abs(Cartesian3.dot(up, northWest)),
          Math.abs(Cartesian3.dot(up, southEast)),
          Math.abs(Cartesian3.dot(up, northEast)),
          Math.abs(Cartesian3.dot(up, southWest))
        );
        var width = Math.max(
          Math.abs(Cartesian3.dot(right, northWest)),
          Math.abs(Cartesian3.dot(right, southEast)),
          Math.abs(Cartesian3.dot(right, northEast)),
          Math.abs(Cartesian3.dot(right, southWest))
        );

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var d = Math.max(width / tanTheta, height / tanPhi);

        var scalar = mag + d;
        Cartesian3.normalize(center, center);
        return Cartesian3.multiplyByScalar(center, scalar, result);
    }

    var viewRectangleCVCartographic = new Cartographic();
    var viewRectangleCVNorthEast = new Cartesian3();
    var viewRectangleCVSouthWest = new Cartesian3();
    function rectangleCameraPositionColumbusView(camera, rectangle, projection, result, positionOnly) {
        var north = rectangle.north;
        var south = rectangle.south;
        var east = rectangle.east;
        var west = rectangle.west;
        var transform = camera._actualTransform;
        var invTransform = camera._actualInvTransform;

        var cart = viewRectangleCVCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var northEast = projection.project(cart, viewRectangleCVNorthEast);
        Matrix4.multiplyByPoint(transform, northEast, northEast);
        Matrix4.multiplyByPoint(invTransform, northEast, northEast);

        cart.longitude = west;
        cart.latitude = south;
        var southWest = projection.project(cart, viewRectangleCVSouthWest);
        Matrix4.multiplyByPoint(transform, southWest, southWest);
        Matrix4.multiplyByPoint(invTransform, southWest, southWest);

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        if (!defined(result)) {
            result = new Cartesian3();
        }

        result.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
        result.y = (northEast.y - southWest.y) * 0.5 + southWest.y;
        result.z = Math.max((northEast.x - southWest.x) / tanTheta, (northEast.y - southWest.y) / tanPhi) * 0.5;

        if (!positionOnly) {
            var direction = Cartesian3.clone(Cartesian3.UNIT_Z, camera.direction);
            Cartesian3.negate(direction, direction);
            Cartesian3.clone(Cartesian3.UNIT_X, camera.right);
            Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        }

        return result;
    }

    var viewRectangle2DCartographic = new Cartographic();
    var viewRectangle2DNorthEast = new Cartesian3();
    var viewRectangle2DSouthWest = new Cartesian3();
    function rectangleCameraPosition2D (camera, rectangle, projection, result, positionOnly) {
        var north = rectangle.north;
        var south = rectangle.south;
        var east = rectangle.east;
        var west = rectangle.west;

        var cart = viewRectangle2DCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var northEast = projection.project(cart, viewRectangle2DNorthEast);
        cart.longitude = west;
        cart.latitude = south;
        var southWest = projection.project(cart, viewRectangle2DSouthWest);

        var width = Math.abs(northEast.x - southWest.x) * 0.5;
        var height = Math.abs(northEast.y - southWest.y) * 0.5;

        var right, top;
        var ratio = camera.frustum.right / camera.frustum.top;
        var heightRatio = height * ratio;
        if (width > heightRatio) {
            right = width;
            top = right / ratio;
        } else {
            top = height;
            right = heightRatio;
        }

        height = Math.max(2.0 * right, 2.0 * top);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        result.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
        result.y = (northEast.y - southWest.y) * 0.5 + southWest.y;

        if (positionOnly) {
            cart = projection.unproject(result, cart);
            cart.height = height;
            result = projection.project(cart, result);
        } else {
            var frustum = camera.frustum;
            frustum.right = right;
            frustum.left = -right;
            frustum.top = top;
            frustum.bottom = -top;

            var direction = Cartesian3.clone(Cartesian3.UNIT_Z, camera.direction);
            Cartesian3.negate(direction, direction);
            Cartesian3.clone(Cartesian3.UNIT_X, camera.right);
            Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        }

        return result;
    }
    /**
     * Get the camera position needed to view an rectangle on an ellipsoid or map
     *
     * @param {Rectangle} rectangle The rectangle to view.
     * @param {Cartesian3} [result] The camera position needed to view the rectangle
     * @returns {Cartesian3} The camera position needed to view the rectangle
     */
    Camera.prototype.getRectangleCameraCoordinates = function(rectangle, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required');
        }
        //>>includeEnd('debug');

        if (this._mode === SceneMode.SCENE3D) {
            return rectangleCameraPosition3D(this, rectangle, this._projection.ellipsoid, result, true);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            return rectangleCameraPositionColumbusView(this, rectangle, this._projection, result, true);
        } else if (this._mode === SceneMode.SCENE2D) {
            return rectangleCameraPosition2D(this, rectangle, this._projection, result, true);
        }

        return undefined;
    };

    /**
     * View an rectangle on an ellipsoid or map.
     *
     * @param {Rectangle} rectangle The rectangle to view.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to view.
     */
    Camera.prototype.viewRectangle = function(rectangle, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
        //>>includeEnd('debug');

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        if (this._mode === SceneMode.SCENE3D) {
            rectangleCameraPosition3D(this, rectangle, ellipsoid, this.position);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            rectangleCameraPositionColumbusView(this, rectangle, this._projection, this.position);
        } else if (this._mode === SceneMode.SCENE2D) {
            rectangleCameraPosition2D(this, rectangle, this._projection, this.position);
        }
    };

    var pickEllipsoid3DRay = new Ray();
    function pickEllipsoid3D(camera, windowPosition, ellipsoid, result) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var ray = camera.getPickRay(windowPosition, pickEllipsoid3DRay);
        var intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
        if (!intersection) {
            return undefined;
        }

        var t = intersection.start > 0.0 ? intersection.start : intersection.stop;
        return Ray.getPoint(ray, t, result);
    }

    var pickEllipsoid2DRay = new Ray();
    function pickMap2D(camera, windowPosition, projection, result) {
        var ray = camera.getPickRay(windowPosition, pickEllipsoid2DRay);
        var position = ray.origin;
        position.z = 0.0;
        var cart = projection.unproject(position);

        if (cart.latitude < -CesiumMath.PI_OVER_TWO || cart.latitude > CesiumMath.PI_OVER_TWO ||
                cart.longitude < - Math.PI || cart.longitude > Math.PI) {
            return undefined;
        }

        return projection.ellipsoid.cartographicToCartesian(cart, result);
    }

    var pickEllipsoidCVRay = new Ray();
    function pickMapColumbusView(camera, windowPosition, projection, result) {
        var ray = camera.getPickRay(windowPosition, pickEllipsoidCVRay);
        var scalar = -ray.origin.x / ray.direction.x;
        Ray.getPoint(ray, scalar, result);

        var cart = projection.unproject(new Cartesian3(result.y, result.z, 0.0));

        if (cart.latitude < -CesiumMath.PI_OVER_TWO || cart.latitude > CesiumMath.PI_OVER_TWO ||
                cart.longitude < - Math.PI || cart.longitude > Math.PI) {
            return undefined;
        }

        return projection.ellipsoid.cartographicToCartesian(cart, result);
    }

    /**
     * Pick an ellipsoid or map.
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} If the ellipsoid or map was picked, returns the point on the surface of the ellipsoid or map
     * in world coordinates. If the ellipsoid or map was not picked, returns undefined.
     */
    Camera.prototype.pickEllipsoid = function(windowPosition, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(windowPosition)) {
            throw new DeveloperError('windowPosition is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartesian3();
        }

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        if (this._mode === SceneMode.SCENE3D) {
            result = pickEllipsoid3D(this, windowPosition, ellipsoid, result);
        } else if (this._mode === SceneMode.SCENE2D) {
            result = pickMap2D(this, windowPosition, this._projection, result);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            result = pickMapColumbusView(this, windowPosition, this._projection, result);
        } else {
            return undefined;
        }

        return result;
    };

    var pickPerspCenter = new Cartesian3();
    var pickPerspXDir = new Cartesian3();
    var pickPerspYDir = new Cartesian3();
    function getPickRayPerspective(camera, windowPosition, result) {
        var canvas = camera._scene.canvas;
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var near = camera.frustum.near;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;

        var position = camera.positionWC;
        Cartesian3.clone(position, result.origin);

        var nearCenter = Cartesian3.multiplyByScalar(camera.directionWC, near, pickPerspCenter);
        Cartesian3.add(position, nearCenter, nearCenter);
        var xDir = Cartesian3.multiplyByScalar(camera.rightWC, x * near * tanTheta, pickPerspXDir);
        var yDir = Cartesian3.multiplyByScalar(camera.upWC, y * near * tanPhi, pickPerspYDir);
        var direction = Cartesian3.add(nearCenter, xDir, result.direction);
        Cartesian3.add(direction, yDir, direction);
        Cartesian3.subtract(direction, position, direction);
        Cartesian3.normalize(direction, direction);

        return result;
    }

    var scratchDirection = new Cartesian3();

    function getPickRayOrthographic(camera, windowPosition, result) {
        var canvas = camera._scene.canvas;
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        x *= (camera.frustum.right - camera.frustum.left) * 0.5;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;
        y *= (camera.frustum.top - camera.frustum.bottom) * 0.5;

        var origin = result.origin;
        Cartesian3.clone(camera.position, origin);

        Cartesian3.multiplyByScalar(camera.right, x, scratchDirection);
        Cartesian3.add(scratchDirection, origin, origin);
        Cartesian3.multiplyByScalar(camera.up, y, scratchDirection);
        Cartesian3.add(scratchDirection, origin, origin);

        Cartesian3.clone(camera.directionWC, result.direction);

        return result;
    }

    /**
     * Create a ray from the camera position through the pixel at <code>windowPosition</code>
     * in world coordinates.
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ray} [result] The object onto which to store the result.
     * @returns {Object} Returns the {@link Cartesian3} position and direction of the ray.
     */
    Camera.prototype.getPickRay = function(windowPosition, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(windowPosition)) {
            throw new DeveloperError('windowPosition is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Ray();
        }

        var frustum = this.frustum;
        if (defined(frustum.aspectRatio) && defined(frustum.fov) && defined(frustum.near)) {
            return getPickRayPerspective(this, windowPosition, result);
        }

        return getPickRayOrthographic(this, windowPosition, result);
    };

    function createAnimation2D(camera, duration) {
        var position = camera.position;
        var translateX = position.x < -camera._maxCoord.x || position.x > camera._maxCoord.x;
        var translateY = position.y < -camera._maxCoord.y || position.y > camera._maxCoord.y;
        var animatePosition = translateX || translateY;

        var frustum = camera.frustum;
        var top = frustum.top;
        var bottom = frustum.bottom;
        var right = frustum.right;
        var left = frustum.left;
        var startFrustum = camera._max2Dfrustum;
        var animateFrustum = right > camera._max2Dfrustum.right;

        if (animatePosition || animateFrustum) {
            var translatedPosition = Cartesian3.clone(position);

            if (translatedPosition.x > camera._maxCoord.x) {
                translatedPosition.x = camera._maxCoord.x;
            } else if (translatedPosition.x < -camera._maxCoord.x) {
                translatedPosition.x = -camera._maxCoord.x;
            }

            if (translatedPosition.y > camera._maxCoord.y) {
                translatedPosition.y = camera._maxCoord.y;
            } else if (translatedPosition.y < -camera._maxCoord.y) {
                translatedPosition.y = -camera._maxCoord.y;
            }

            var update2D = function(value) {
                if (animatePosition) {
                    camera.position = Cartesian3.lerp(position, translatedPosition, value.time, camera.position);
                }
                if (animateFrustum) {
                    camera.frustum.top = CesiumMath.lerp(top, startFrustum.top, value.time);
                    camera.frustum.bottom = CesiumMath.lerp(bottom, startFrustum.bottom, value.time);
                    camera.frustum.right = CesiumMath.lerp(right, startFrustum.right, value.time);
                    camera.frustum.left = CesiumMath.lerp(left, startFrustum.left, value.time);
                }
            };

            return {
                easingFunction : EasingFunction.EXPONENTIAL_OUT,
                startObject : {
                    time : 0.0
                },
                stopObject : {
                    time : 1.0
                },
                duration : duration,
                update : update2D
            };
        }

        return undefined;
    }

    function createAnimationTemplateCV(camera, position, center, maxX, maxY, duration) {
        var newPosition = Cartesian3.clone(position);

        if (center.y > maxX) {
            newPosition.y -= center.y - maxX;
        } else if (center.y < -maxX) {
            newPosition.y += -maxX - center.y;
        }

        if (center.z > maxY) {
            newPosition.z -= center.z - maxY;
        } else if (center.z < -maxY) {
            newPosition.z += -maxY - center.z;
        }

        var updateCV = function(value) {
            var interp = Cartesian3.lerp(position, newPosition, value.time, new Cartesian3());
            camera.worldToCameraCoordinatesPoint(interp, camera.position);
        };

        return {
            easingFunction : EasingFunction.EXPONENTIAL_OUT,
            startObject : {
                time : 0.0
            },
            stopObject : {
                time : 1.0
            },
            duration : duration,
            update : updateCV
        };
    }

    var normalScratch = new Cartesian3();
    var centerScratch = new Cartesian3();
    var posScratch = new Cartesian3();
    var scratchCartesian3Subtract = new Cartesian3();

    function createAnimationCV(camera, duration) {
        var position = camera.position;
        var direction = camera.direction;

        var normal = camera.worldToCameraCoordinatesVector(Cartesian3.UNIT_X, normalScratch);
        var scalar = -Cartesian3.dot(normal, position) / Cartesian3.dot(normal, direction);
        var center = Cartesian3.add(position, Cartesian3.multiplyByScalar(direction, scalar, centerScratch), centerScratch);
        camera.cameraToWorldCoordinatesPoint(center, center);

        position = camera.cameraToWorldCoordinatesPoint(camera.position, posScratch);

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var distToC = Cartesian3.magnitude(Cartesian3.subtract(position, center, scratchCartesian3Subtract));
        var dWidth = tanTheta * distToC;
        var dHeight = tanPhi * distToC;

        var mapWidth = camera._maxCoord.x;
        var mapHeight = camera._maxCoord.y;

        var maxX = Math.max(dWidth - mapWidth, mapWidth);
        var maxY = Math.max(dHeight - mapHeight, mapHeight);

        if (position.z < -maxX || position.z > maxX || position.y < -maxY || position.y > maxY) {
            var translateX = center.y < -maxX || center.y > maxX;
            var translateY = center.z < -maxY || center.z > maxY;
            if (translateX || translateY) {
                return createAnimationTemplateCV(camera, position, center, maxX, maxY, duration);
            }
        }

        return undefined;
    }

    /**
     * Create an animation to move the map into view. This method is only valid for 2D and Columbus modes.
     *
     * @param {Number} duration The duration, in seconds, of the animation.
     * @returns {Object} The animation or undefined if the scene mode is 3D or the map is already ion view.
     *
     * @exception {DeveloperException} duration is required.
     *
     * @private
     */
    Camera.prototype.createCorrectPositionTween = function(duration) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(duration)) {
            throw new DeveloperError('duration is required.');
        }
        //>>includeEnd('debug');

        if (this._mode === SceneMode.SCENE2D) {
            return createAnimation2D(this, duration);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            return createAnimationCV(this, duration);
        }

        return undefined;
    };

    /**
     * Flies the camera from its current position to a new position.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.destination The final position of the camera in WGS84 (world) coordinates.
     * @param {Cartesian3} [options.direction] The final direction of the camera in WGS84 (world) coordinates. By default, the direction will point towards the center of the frame in 3D and in the negative z direction in Columbus view or 2D.
     * @param {Cartesian3} [options.up] The final up direction in WGS84 (world) coordinates. By default, the up direction will point towards local north in 3D and in the positive y direction in Columbus view or 2D.
     * @param {Number} [options.duration=3.0] The duration of the flight in seconds.
     * @param {Camera~FlightCompleteCallback} [options.complete] The function to execute when the flight is complete.
     * @param {Camera~FlightCancelledCallback} [options.cancel] The function to execute if the flight is cancelled.
     * @param {Matrix4} [options.endTransform] Transform matrix representing the reference frame the camera will be in when the flight is completed.
     * @param {Boolean} [options.convert=true] When <code>true</code>, the destination is converted to the correct coordinate system for each scene mode. When <code>false</code>, the destination is expected
     *                  to be in the correct coordinate system.
     *
     * @exception {DeveloperError} If either direction or up is given, then both are required.
     */
    Camera.prototype.flyTo = function(options) {
        var scene = this._scene;
        scene.tweens.add(CameraFlightPath.createTween(scene, options));
    };

    /**
     * Flies the camera from its current position to a position where the entire rectangle is visible.
     *
     * @param {Object} options Object with the following properties:
     * @param {Rectangle} options.destination The rectangle to view, in WGS84 (world) coordinates, which determines the final position of the camera.
     * @param {Number} [options.duration=3.0] The duration of the flight in seconds.
     * @param {Camera~FlightCompleteCallback} [options.complete] The function to execute when the flight is complete.
     * @param {Camera~FlightCancelledCallback} [options.cancel] The function to execute if the flight is cancelled.
     * @param {Matrix4} [endTransform] Transform matrix representing the reference frame the camera will be in when the flight is completed.
     */
    Camera.prototype.flyToRectangle = function(options) {
        var scene = this._scene;
        scene.tweens.add(CameraFlightPath.createTweenRectangle(scene, options));
    };

    /**
     * Returns a duplicate of a Camera instance.
     *
     * @returns {Camera} A new copy of the Camera instance.
     */
    Camera.prototype.clone = function() {
        var camera = new Camera(this._scene);
        camera.position = Cartesian3.clone(this.position);
        camera.direction = Cartesian3.clone(this.direction);
        camera.up = Cartesian3.clone(this.up);
        camera.right = Cartesian3.clone(this.right);
        camera.transform = Matrix4.clone(this.transform);
        camera.frustum = this.frustum.clone();
        return camera;
    };

    /**
     * A function that will execute when a flight completes.
     * @callback Camera~FlightCompleteCallback
     */

    /**
     * A function that will execute when a flight is cancelled.
     * @callback Camera~FlightCancelledCallback
     */

    return Camera;
});
