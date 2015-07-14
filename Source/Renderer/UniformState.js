/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/EncodedCartesian3',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Simon1994PlanetaryPositions',
        '../Core/Transforms',
        '../Scene/SceneMode'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defined,
        defineProperties,
        EncodedCartesian3,
        CesiumMath,
        Matrix3,
        Matrix4,
        Simon1994PlanetaryPositions,
        Transforms,
        SceneMode) {
    "use strict";

    /**
     * @private
     */
    var UniformState = function() {
        /**
         * @type {Texture}
         */
        this.globeDepthTexture = undefined;

        this._viewport = new BoundingRectangle();
        this._viewportCartesian4 = new Cartesian4();
        this._viewportDirty = false;
        this._viewportOrthographicMatrix = Matrix4.clone(Matrix4.IDENTITY);
        this._viewportTransformation = Matrix4.clone(Matrix4.IDENTITY);

        this._model = Matrix4.clone(Matrix4.IDENTITY);
        this._view = Matrix4.clone(Matrix4.IDENTITY);
        this._inverseView = Matrix4.clone(Matrix4.IDENTITY);
        this._projection = Matrix4.clone(Matrix4.IDENTITY);
        this._infiniteProjection = Matrix4.clone(Matrix4.IDENTITY);
        this._entireFrustum = new Cartesian2();
        this._currentFrustum = new Cartesian2();

        this._frameState = undefined;
        this._temeToPseudoFixed = Matrix3.clone(Matrix4.IDENTITY);

        // Derived members
        this._view3DDirty = true;
        this._view3D = new Matrix4();

        this._inverseView3DDirty = true;
        this._inverseView3D = new Matrix4();

        this._inverseModelDirty = true;
        this._inverseModel = new Matrix4();

        this._inverseTransposeModelDirty = true;
        this._inverseTransposeModel = new Matrix3();

        this._viewRotation = new Matrix3();
        this._inverseViewRotation = new Matrix3();

        this._viewRotation3D = new Matrix3();
        this._inverseViewRotation3D = new Matrix3();

        this._inverseProjectionDirty = true;
        this._inverseProjection = new Matrix4();

        this._inverseProjectionOITDirty = true;
        this._inverseProjectionOIT = new Matrix4();

        this._modelViewDirty = true;
        this._modelView = new Matrix4();

        this._modelView3DDirty = true;
        this._modelView3D = new Matrix4();

        this._modelViewRelativeToEyeDirty = true;
        this._modelViewRelativeToEye = new Matrix4();

        this._inverseModelViewDirty = true;
        this._inverseModelView = new Matrix4();

        this._inverseModelView3DDirty = true;
        this._inverseModelView3D = new Matrix4();

        this._viewProjectionDirty = true;
        this._viewProjection = new Matrix4();

        this._inverseViewProjectionDirty = true;
        this._inverseViewProjection = new Matrix4();

        this._modelViewProjectionDirty = true;
        this._modelViewProjection = new Matrix4();

        this._inverseModelViewProjectionDirty = true;
        this._inverseModelViewProjection = new Matrix4();

        this._modelViewProjectionRelativeToEyeDirty = true;
        this._modelViewProjectionRelativeToEye = new Matrix4();

        this._modelViewInfiniteProjectionDirty = true;
        this._modelViewInfiniteProjection = new Matrix4();

        this._normalDirty = true;
        this._normal = new Matrix3();

        this._normal3DDirty = true;
        this._normal3D = new Matrix3();

        this._inverseNormalDirty = true;
        this._inverseNormal = new Matrix3();

        this._inverseNormal3DDirty = true;
        this._inverseNormal3D = new Matrix3();

        this._encodedCameraPositionMCDirty = true;
        this._encodedCameraPositionMC = new EncodedCartesian3();
        this._cameraPosition = new Cartesian3();

        this._sunPositionWC = new Cartesian3();
        this._sunPositionColumbusView = new Cartesian3();
        this._sunDirectionWC = new Cartesian3();
        this._sunDirectionEC = new Cartesian3();
        this._moonDirectionEC = new Cartesian3();

        this._mode = undefined;
        this._mapProjection = undefined;
        this._cameraDirection = new Cartesian3();
        this._cameraRight = new Cartesian3();
        this._cameraUp = new Cartesian3();
        this._frustum2DWidth = 0.0;
        this._eyeHeight2D = new Cartesian2();
        this._resolutionScale = 1.0;
    };

    defineProperties(UniformState.prototype, {
        /**
         * @memberof UniformState.prototype
         * @type {FrameState}
         * @readonly
         */
        frameState : {
            get : function() {
                return this._frameState;
            }
        },
        /**
         * @memberof UniformState.prototype
         * @type {BoundingRectangle}
         */
        viewport : {
            get : function() {
                return this._viewport;
            },
            set : function(viewport) {
                if (!BoundingRectangle.equals(viewport, this._viewport)) {
                    BoundingRectangle.clone(viewport, this._viewport);

                    var v = this._viewport;
                    var vc = this._viewportCartesian4;
                    vc.x = v.x;
                    vc.y = v.y;
                    vc.z = v.width;
                    vc.w = v.height;

                    this._viewportDirty = true;
                }
            }
        },

        /**
         * @memberof UniformState.prototype
         * @private
         */
        viewportCartesian4 : {
            get : function() {
                return this._viewportCartesian4;
            }
        },

        viewportOrthographic : {
            get : function() {
                cleanViewport(this);
                return this._viewportOrthographicMatrix;
            }
        },

        viewportTransformation : {
            get : function() {
                cleanViewport(this);
                return this._viewportTransformation;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        model : {
            get : function() {
                return this._model;
            },
            set : function(matrix) {
                Matrix4.clone(matrix, this._model);

                this._modelView3DDirty = true;
                this._inverseModelView3DDirty = true;
                this._inverseModelDirty = true;
                this._inverseTransposeModelDirty = true;
                this._modelViewDirty = true;
                this._inverseModelViewDirty = true;
                this._viewProjectionDirty = true;
                this._inverseViewProjectionDirty = true;
                this._modelViewRelativeToEyeDirty = true;
                this._inverseModelViewDirty = true;
                this._modelViewProjectionDirty = true;
                this._inverseModelViewProjectionDirty = true;
                this._modelViewProjectionRelativeToEyeDirty = true;
                this._modelViewInfiniteProjectionDirty = true;
                this._normalDirty = true;
                this._inverseNormalDirty = true;
                this._normal3DDirty = true;
                this._inverseNormal3DDirty = true;
                this._encodedCameraPositionMCDirty = true;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        inverseModel : {
            get : function() {
                if (this._inverseModelDirty) {
                    this._inverseModelDirty = false;

                    Matrix4.inverse(this._model, this._inverseModel);
                }

                return this._inverseModel;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @private
         */
        inverseTranposeModel : {
            get : function() {
                var m = this._inverseTransposeModel;
                if (this._inverseTransposeModelDirty) {
                    this._inverseTransposeModelDirty = false;

                    Matrix4.getRotation(this.inverseModel, m);
                    Matrix3.transpose(m, m);
                }

                return m;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        view : {
            get : function() {
                return this._view;
            }
        },

        /**
         * The 3D view matrix.  In 3D mode, this is identical to {@link UniformState#view},
         * but in 2D and Columbus View it is a synthetic matrix based on the equivalent position
         * of the camera in the 3D world.
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        view3D : {
            get : function() {
                if (this._view3DDirty) {
                    if (this._mode === SceneMode.SCENE3D) {
                        Matrix4.clone(this._view, this._view3D);
                    } else {
                        view2Dto3D(this._cameraPosition, this._cameraDirection, this._cameraRight, this._cameraUp, this._frustum2DWidth, this._mode, this._mapProjection, this._view3D);
                    }
                    Matrix4.getRotation(this._view3D, this._viewRotation3D);
                    this._view3DDirty = false;
                }
                return this._view3D;
            }
        },

        /**
         * The 3x3 rotation matrix of the current view matrix ({@link UniformState#view}).
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        viewRotation : {
            get : function() {
                return this._viewRotation;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        viewRotation3D : {
            get : function() {
                var view3D = this.view3D;
                return this._viewRotation3D;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        inverseView : {
            get : function() {
                return this._inverseView;
            }
        },

        /**
         * the 4x4 inverse-view matrix that transforms from eye to 3D world coordinates.  In 3D mode, this is
         * identical to {@link UniformState#inverseView}, but in 2D and Columbus View it is a synthetic matrix
         * based on the equivalent position of the camera in the 3D world.
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        inverseView3D : {
            get : function() {
                if (this._inverseView3DDirty) {
                    Matrix4.inverseTransformation(this.view3D, this._inverseView3D);
                    Matrix4.getRotation(this._inverseView3D, this._inverseViewRotation3D);
                    this._inverseView3DDirty = false;
                }
                return this._inverseView3D;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        inverseViewRotation : {
            get : function() {
                return this._inverseViewRotation;
            }
        },

        /**
         * The 3x3 rotation matrix of the current 3D inverse-view matrix ({@link UniformState#inverseView3D}).
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        inverseViewRotation3D : {
            get : function() {
                var inverseView = this.inverseView3D;
                return this._inverseViewRotation3D;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        projection : {
            get : function() {
                return this._projection;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        inverseProjection : {
            get : function() {
                cleanInverseProjection(this);
                return this._inverseProjection;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @private
         */
        inverseProjectionOIT : {
            get : function() {
                cleanInverseProjectionOIT(this);
                return this._inverseProjectionOIT;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        infiniteProjection : {
            get : function() {
                return this._infiniteProjection;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        modelView : {
            get : function() {
                cleanModelView(this);
                return this._modelView;
            }
        },

        /**
         * The 3D model-view matrix.  In 3D mode, this is equivalent to {@link UniformState#modelView}.  In 2D and
         * Columbus View, however, it is a synthetic matrix based on the equivalent position of the camera in the 3D world.
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        modelView3D : {
            get : function() {
                cleanModelView3D(this);
                return this._modelView3D;
            }
        },

        /**
         * Model-view relative to eye matrix.
         *
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        modelViewRelativeToEye : {
            get : function() {
                cleanModelViewRelativeToEye(this);
                return this._modelViewRelativeToEye;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        inverseModelView : {
            get : function() {
                cleanInverseModelView(this);
                return this._inverseModelView;
            }
        },

        /**
         * The inverse of the 3D model-view matrix.  In 3D mode, this is equivalent to {@link UniformState#inverseModelView}.
         * In 2D and Columbus View, however, it is a synthetic matrix based on the equivalent position of the camera in the 3D world.
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        inverseModelView3D : {
            get : function() {
                cleanInverseModelView3D(this);
                return this._inverseModelView3D;

            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        viewProjection : {
            get : function() {
                cleanViewProjection(this);
                return this._viewProjection;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        inverseViewProjection : {
            get : function() {
                cleanInverseViewProjection(this);
                return this._inverseViewProjection;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        modelViewProjection : {
            get : function() {
                cleanModelViewProjection(this);
                return this._modelViewProjection;

            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        inverseModelViewProjection : {
            get : function() {
                cleanInverseModelViewProjection(this);
                return this._inverseModelViewProjection;

            }
        },

        /**
         * Model-view-projection relative to eye matrix.
         *
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        modelViewProjectionRelativeToEye : {
            get : function() {
                cleanModelViewProjectionRelativeToEye(this);
                return this._modelViewProjectionRelativeToEye;
            }
        },

        /**
         * @memberof UniformState.prototype
         * @type {Matrix4}
         */
        modelViewInfiniteProjection : {
            get : function() {
                cleanModelViewInfiniteProjection(this);
                return this._modelViewInfiniteProjection;
            }
        },

        /**
         * A 3x3 normal transformation matrix that transforms normal vectors in model coordinates to
         * eye coordinates.
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        normal : {
            get : function() {
                cleanNormal(this);
                return this._normal;
            }
        },

        /**
         * A 3x3 normal transformation matrix that transforms normal vectors in 3D model
         * coordinates to eye coordinates.  In 3D mode, this is identical to
         * {@link UniformState#normal}, but in 2D and Columbus View it represents the normal transformation
         * matrix as if the camera were at an equivalent location in 3D mode.
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        normal3D : {
            get : function() {
                cleanNormal3D(this);
                return this._normal3D;

            }
        },

        /**
         * An inverse 3x3 normal transformation matrix that transforms normal vectors in model coordinates
         * to eye coordinates.
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        inverseNormal : {
            get : function() {
                cleanInverseNormal(this);
                return this._inverseNormal;
            }
        },

        /**
         * An inverse 3x3 normal transformation matrix that transforms normal vectors in eye coordinates
         * to 3D model coordinates.  In 3D mode, this is identical to
         * {@link UniformState#inverseNormal}, but in 2D and Columbus View it represents the normal transformation
         * matrix as if the camera were at an equivalent location in 3D mode.
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        inverseNormal3D : {
            get : function() {
                cleanInverseNormal3D(this);
                return this._inverseNormal3D;
            }
        },

        /**
         * The near distance (<code>x</code>) and the far distance (<code>y</code>) of the frustum defined by the camera.
         * This is the largest possible frustum, not an individual frustum used for multi-frustum rendering.
         * @memberof UniformState.prototype
         * @type {Cartesian2}
         */
        entireFrustum : {
            get : function() {
                return this._entireFrustum;
            }
        },

        /**
         * The near distance (<code>x</code>) and the far distance (<code>y</code>) of the frustum defined by the camera.
         * This is the individual frustum used for multi-frustum rendering.
         * @memberof UniformState.prototype
         * @type {Cartesian2}
         */
        currentFrustum : {
            get : function() {
                return this._currentFrustum;
            }
        },

        /**
         * The the height (<code>x</code>) and the height squared (<code>y</code>)
         * in meters of the camera above the 2D world plane. This uniform is only valid
         * when the {@link SceneMode} equal to <code>SCENE2D</code>.
         * @memberof UniformState.prototype
         * @type {Cartesian2}
         */
        eyeHeight2D : {
            get : function() {
                return this._eyeHeight2D;
            }
        },

        /**
         * The sun position in 3D world coordinates at the current scene time.
         * @memberof UniformState.prototype
         * @type {Cartesian3}
         */
        sunPositionWC : {
            get : function() {
                return this._sunPositionWC;
            }
        },

        /**
         * The sun position in 2D world coordinates at the current scene time.
         * @memberof UniformState.prototype
         * @type {Cartesian3}
         */
        sunPositionColumbusView : {
            get : function(){
                return this._sunPositionColumbusView;
            }
        },

        /**
         * A normalized vector to the sun in 3D world coordinates at the current scene time.  Even in 2D or
         * Columbus View mode, this returns the position of the sun in the 3D scene.
         * @memberof UniformState.prototype
         * @type {Cartesian3}
         */
        sunDirectionWC : {
            get : function() {
                return this._sunDirectionWC;
            }
        },

        /**
         * A normalized vector to the sun in eye coordinates at the current scene time.  In 3D mode, this
         * returns the actual vector from the camera position to the sun position.  In 2D and Columbus View, it returns
         * the vector from the equivalent 3D camera position to the position of the sun in the 3D scene.
         * @memberof UniformState.prototype
         * @type {Cartesian3}
         */
        sunDirectionEC : {
            get : function() {
                return this._sunDirectionEC;
            }
        },

        /**
         * A normalized vector to the moon in eye coordinates at the current scene time.  In 3D mode, this
         * returns the actual vector from the camera position to the moon position.  In 2D and Columbus View, it returns
         * the vector from the equivalent 3D camera position to the position of the moon in the 3D scene.
         * @memberof UniformState.prototype
         * @type {Cartesian3}
         */
        moonDirectionEC : {
            get : function() {
                return this._moonDirectionEC;
            }
        },

        /**
         * The high bits of the camera position.
         * @memberof UniformState.prototype
         * @type {Cartesian3}
         */
        encodedCameraPositionMCHigh : {
            get : function() {
                cleanEncodedCameraPositionMC(this);
                return this._encodedCameraPositionMC.high;
            }
        },

        /**
         * The low bits of the camera position.
         * @memberof UniformState.prototype
         * @type {Cartesian3}
         */
        encodedCameraPositionMCLow : {
            get : function() {
                cleanEncodedCameraPositionMC(this);
                return this._encodedCameraPositionMC.low;
            }
        },

        /**
         * A 3x3 matrix that transforms from True Equator Mean Equinox (TEME) axes to the
         * pseudo-fixed axes at the Scene's current time.
         * @memberof UniformState.prototype
         * @type {Matrix3}
         */
        temeToPseudoFixedMatrix : {
            get : function() {
                return this._temeToPseudoFixed;
            }
        },

        /**
         * Gets the scaling factor for transforming from the canvas
         * pixel space to canvas coordinate space.
         * @memberof UniformState.prototype
         * @type {Number}
         */
        resolutionScale : {
            get : function() {
                return this._resolutionScale;
            }
        }
    });

    function setView(uniformState, matrix) {
        Matrix4.clone(matrix, uniformState._view);
        Matrix4.getRotation(matrix, uniformState._viewRotation);

        uniformState._view3DDirty = true;
        uniformState._inverseView3DDirty = true;
        uniformState._modelViewDirty = true;
        uniformState._modelView3DDirty = true;
        uniformState._modelViewRelativeToEyeDirty = true;
        uniformState._inverseModelViewDirty = true;
        uniformState._inverseModelView3DDirty = true;
        uniformState._viewProjectionDirty = true;
        uniformState._modelViewProjectionDirty = true;
        uniformState._modelViewProjectionRelativeToEyeDirty = true;
        uniformState._modelViewInfiniteProjectionDirty = true;
        uniformState._normalDirty = true;
        uniformState._inverseNormalDirty = true;
        uniformState._normal3DDirty = true;
        uniformState._inverseNormal3DDirty = true;
    }

    function setInverseView(uniformState, matrix) {
        Matrix4.clone(matrix, uniformState._inverseView);
        Matrix4.getRotation(matrix, uniformState._inverseViewRotation);
    }

    function setProjection(uniformState, matrix) {
        Matrix4.clone(matrix, uniformState._projection);

        uniformState._inverseProjectionDirty = true;
        uniformState._inverseProjectionOITDirty = true;
        uniformState._viewProjectionDirty = true;
        uniformState._modelViewProjectionDirty = true;
        uniformState._modelViewProjectionRelativeToEyeDirty = true;
    }

    function setInfiniteProjection(uniformState, matrix) {
        Matrix4.clone(matrix, uniformState._infiniteProjection);

        uniformState._modelViewInfiniteProjectionDirty = true;
    }

    function setCamera(uniformState, camera) {
        Cartesian3.clone(camera.positionWC, uniformState._cameraPosition);
        Cartesian3.clone(camera.directionWC, uniformState._cameraDirection);
        Cartesian3.clone(camera.rightWC, uniformState._cameraRight);
        Cartesian3.clone(camera.upWC, uniformState._cameraUp);
        uniformState._encodedCameraPositionMCDirty = true;
    }

    var transformMatrix = new Matrix3();
    var sunCartographicScratch = new Cartographic();
    function setSunAndMoonDirections(uniformState, frameState) {
        if (!defined(Transforms.computeIcrfToFixedMatrix(frameState.time, transformMatrix))) {
            transformMatrix = Transforms.computeTemeToPseudoFixedMatrix(frameState.time, transformMatrix);
        }

        var position = Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(frameState.time, uniformState._sunPositionWC);
        Matrix3.multiplyByVector(transformMatrix, position, position);

        Cartesian3.normalize(position, uniformState._sunDirectionWC);

        position = Matrix3.multiplyByVector(uniformState.viewRotation3D, position, uniformState._sunDirectionEC);
        Cartesian3.normalize(position, position);

        position = Simon1994PlanetaryPositions.computeMoonPositionInEarthInertialFrame(frameState.time, uniformState._moonDirectionEC);
        Matrix3.multiplyByVector(transformMatrix, position, position);
        Matrix3.multiplyByVector(uniformState.viewRotation3D, position, position);
        Cartesian3.normalize(position, position);

        var projection = frameState.mapProjection;
        var ellipsoid = projection.ellipsoid;
        var sunCartographic = ellipsoid.cartesianToCartographic(uniformState._sunPositionWC, sunCartographicScratch);
        projection.project(sunCartographic, uniformState._sunPositionColumbusView);
    }

    /**
     * Synchronizes the frustum's state with the uniform state.  This is called
     * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
     * are set to the right value.
     *
     * @param {Object} frustum The frustum to synchronize with.
     */
    UniformState.prototype.updateFrustum = function(frustum) {
        setProjection(this, frustum.projectionMatrix);
        if (defined(frustum.infiniteProjectionMatrix)) {
            setInfiniteProjection(this, frustum.infiniteProjectionMatrix);
        }
        this._currentFrustum.x = frustum.near;
        this._currentFrustum.y = frustum.far;
    };

    /**
     * Synchronizes frame state with the uniform state.  This is called
     * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
     * are set to the right value.
     *
     * @param {FrameState} frameState The frameState to synchronize with.
     */
    UniformState.prototype.update = function(context, frameState) {
        this._mode = frameState.mode;
        this._mapProjection = frameState.mapProjection;

        var canvas = context._canvas;
        this._resolutionScale = canvas.width / canvas.clientWidth;

        var camera = frameState.camera;

        setView(this, camera.viewMatrix);
        setInverseView(this, camera.inverseViewMatrix);
        setCamera(this, camera);

        if (frameState.mode === SceneMode.SCENE2D) {
            this._frustum2DWidth = camera.frustum.right - camera.frustum.left;
            this._eyeHeight2D.x = this._frustum2DWidth * 0.5;
            this._eyeHeight2D.y = this._eyeHeight2D.x * this._eyeHeight2D.x;
        } else {
            this._frustum2DWidth = 0.0;
            this._eyeHeight2D.x = 0.0;
            this._eyeHeight2D.y = 0.0;
        }

        setSunAndMoonDirections(this, frameState);

        this._entireFrustum.x = camera.frustum.near;
        this._entireFrustum.y = camera.frustum.far;
        this.updateFrustum(camera.frustum);

        this._frameState = frameState;
        this._temeToPseudoFixed = Transforms.computeTemeToPseudoFixedMatrix(frameState.time, this._temeToPseudoFixed);
    };

    function cleanViewport(uniformState) {
        if (uniformState._viewportDirty) {
            var v = uniformState._viewport;
            Matrix4.computeOrthographicOffCenter(v.x, v.x + v.width, v.y, v.y + v.height, 0.0, 1.0, uniformState._viewportOrthographicMatrix);
            Matrix4.computeViewportTransformation(v, 0.0, 1.0, uniformState._viewportTransformation);
            uniformState._viewportDirty = false;
        }
    }

    function cleanInverseProjection(uniformState) {
        if (uniformState._inverseProjectionDirty) {
            uniformState._inverseProjectionDirty = false;

            Matrix4.inverse(uniformState._projection, uniformState._inverseProjection);
        }
    }

    function cleanInverseProjectionOIT(uniformState) {
        if (uniformState._inverseProjectionOITDirty) {
            uniformState._inverseProjectionOITDirty = false;

            if (uniformState._mode !== SceneMode.SCENE2D && uniformState._mode !== SceneMode.MORPHING) {
                Matrix4.inverse(uniformState._projection, uniformState._inverseProjectionOIT);
            } else {
                Matrix4.clone(Matrix4.IDENTITY, uniformState._inverseProjectionOIT);
            }
        }
    }

    // Derived
    function cleanModelView(uniformState) {
        if (uniformState._modelViewDirty) {
            uniformState._modelViewDirty = false;

            Matrix4.multiplyTransformation(uniformState._view, uniformState._model, uniformState._modelView);
        }
    }

    function cleanModelView3D(uniformState) {
        if (uniformState._modelView3DDirty) {
            uniformState._modelView3DDirty = false;

            Matrix4.multiplyTransformation(uniformState.view3D, uniformState._model, uniformState._modelView3D);
        }
    }

    function cleanInverseModelView(uniformState) {
        if (uniformState._inverseModelViewDirty) {
            uniformState._inverseModelViewDirty = false;

            Matrix4.inverse(uniformState.modelView, uniformState._inverseModelView);
        }
    }

    function cleanInverseModelView3D(uniformState) {
        if (uniformState._inverseModelView3DDirty) {
            uniformState._inverseModelView3DDirty = false;

            Matrix4.inverse(uniformState.modelView3D, uniformState._inverseModelView3D);
        }
    }

    function cleanViewProjection(uniformState) {
        if (uniformState._viewProjectionDirty) {
            uniformState._viewProjectionDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState._view, uniformState._viewProjection);
        }
    }

    function cleanInverseViewProjection(uniformState) {
        if (uniformState._inverseViewProjectionDirty) {
            uniformState._inverseViewProjectionDirty = false;

            Matrix4.inverse(uniformState.viewProjection, uniformState._inverseViewProjection);
        }
    }

    function cleanModelViewProjection(uniformState) {
        if (uniformState._modelViewProjectionDirty) {
            uniformState._modelViewProjectionDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState.modelView, uniformState._modelViewProjection);
        }
    }

    function cleanModelViewRelativeToEye(uniformState) {
        if (uniformState._modelViewRelativeToEyeDirty) {
            uniformState._modelViewRelativeToEyeDirty = false;

            var mv = uniformState.modelView;
            var mvRte = uniformState._modelViewRelativeToEye;
            mvRte[0] = mv[0];
            mvRte[1] = mv[1];
            mvRte[2] = mv[2];
            mvRte[3] = mv[3];
            mvRte[4] = mv[4];
            mvRte[5] = mv[5];
            mvRte[6] = mv[6];
            mvRte[7] = mv[7];
            mvRte[8] = mv[8];
            mvRte[9] = mv[9];
            mvRte[10] = mv[10];
            mvRte[11] = mv[11];
            mvRte[12] = 0.0;
            mvRte[13] = 0.0;
            mvRte[14] = 0.0;
            mvRte[15] = mv[15];
        }
    }

    function cleanInverseModelViewProjection(uniformState) {
        if (uniformState._inverseModelViewProjectionDirty) {
            uniformState._inverseModelViewProjectionDirty = false;

            Matrix4.inverse(uniformState.modelViewProjection, uniformState._inverseModelViewProjection);
        }
    }

    function cleanModelViewProjectionRelativeToEye(uniformState) {
        if (uniformState._modelViewProjectionRelativeToEyeDirty) {
            uniformState._modelViewProjectionRelativeToEyeDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState.modelViewRelativeToEye, uniformState._modelViewProjectionRelativeToEye);
        }
    }

    function cleanModelViewInfiniteProjection(uniformState) {
        if (uniformState._modelViewInfiniteProjectionDirty) {
            uniformState._modelViewInfiniteProjectionDirty = false;

            Matrix4.multiply(uniformState._infiniteProjection, uniformState.modelView, uniformState._modelViewInfiniteProjection);
        }
    }

    function cleanNormal(uniformState) {
        if (uniformState._normalDirty) {
            uniformState._normalDirty = false;

            var m = uniformState._normal;
            Matrix4.getRotation(uniformState.inverseModelView, m);
            Matrix3.transpose(m, m);
        }
    }

    function cleanNormal3D(uniformState) {
        if (uniformState._normal3DDirty) {
            uniformState._normal3DDirty = false;

            var m = uniformState._normal3D;
            Matrix4.getRotation(uniformState.inverseModelView3D, m);
            Matrix3.transpose(m, m);
        }
    }

    function cleanInverseNormal(uniformState) {
        if (uniformState._inverseNormalDirty) {
            uniformState._inverseNormalDirty = false;

            Matrix4.getRotation(uniformState.inverseModelView, uniformState._inverseNormal);
        }
    }

    function cleanInverseNormal3D(uniformState) {
        if (uniformState._inverseNormal3DDirty) {
            uniformState._inverseNormal3DDirty = false;

            Matrix4.getRotation(uniformState.inverseModelView3D, uniformState._inverseNormal3D);
        }
    }

    var cameraPositionMC = new Cartesian3();

    function cleanEncodedCameraPositionMC(uniformState) {
        if (uniformState._encodedCameraPositionMCDirty) {
            uniformState._encodedCameraPositionMCDirty = false;

            Matrix4.multiplyByPoint(uniformState.inverseModel, uniformState._cameraPosition, cameraPositionMC);
            EncodedCartesian3.fromCartesian(cameraPositionMC, uniformState._encodedCameraPositionMC);
        }
    }

    var view2Dto3DPScratch = new Cartesian3();
    var view2Dto3DRScratch = new Cartesian3();
    var view2Dto3DUScratch = new Cartesian3();
    var view2Dto3DDScratch = new Cartesian3();
    var view2Dto3DCartographicScratch = new Cartographic();
    var view2Dto3DCartesian3Scratch = new Cartesian3();
    var view2Dto3DMatrix4Scratch = new Matrix4();

    function view2Dto3D(position2D, direction2D, right2D, up2D, frustum2DWidth, mode, projection, result) {
        // The camera position and directions are expressed in the 2D coordinate system where the Y axis is to the East,
        // the Z axis is to the North, and the X axis is out of the map.  Express them instead in the ENU axes where
        // X is to the East, Y is to the North, and Z is out of the local horizontal plane.
        var p = view2Dto3DPScratch;
        p.x = position2D.y;
        p.y = position2D.z;
        p.z = position2D.x;

        var r = view2Dto3DRScratch;
        r.x = right2D.y;
        r.y = right2D.z;
        r.z = right2D.x;

        var u = view2Dto3DUScratch;
        u.x = up2D.y;
        u.y = up2D.z;
        u.z = up2D.x;

        var d = view2Dto3DDScratch;
        d.x = direction2D.y;
        d.y = direction2D.z;
        d.z = direction2D.x;

        // In 2D, the camera height is always 12.7 million meters.
        // The apparent height is equal to half the frustum width.
        if (mode === SceneMode.SCENE2D) {
            p.z = frustum2DWidth * 0.5;
        }

        // Compute the equivalent camera position in the real (3D) world.
        // In 2D and Columbus View, the camera can travel outside the projection, and when it does so
        // there's not really any corresponding location in the real world.  So clamp the unprojected
        // longitude and latitude to their valid ranges.
        var cartographic = projection.unproject(p, view2Dto3DCartographicScratch);
        cartographic.longitude = CesiumMath.clamp(cartographic.longitude, -Math.PI, Math.PI);
        cartographic.latitude = CesiumMath.clamp(cartographic.latitude, -CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO);
        var ellipsoid = projection.ellipsoid;
        var position3D = ellipsoid.cartographicToCartesian(cartographic, view2Dto3DCartesian3Scratch);

        // Compute the rotation from the local ENU at the real world camera position to the fixed axes.
        var enuToFixed = Transforms.eastNorthUpToFixedFrame(position3D, ellipsoid, view2Dto3DMatrix4Scratch);

        // Transform each camera direction to the fixed axes.
        Matrix4.multiplyByPointAsVector(enuToFixed, r, r);
        Matrix4.multiplyByPointAsVector(enuToFixed, u, u);
        Matrix4.multiplyByPointAsVector(enuToFixed, d, d);

        // Compute the view matrix based on the new fixed-frame camera position and directions.
        if (!defined(result)) {
            result = new Matrix4();
        }

        result[0] = r.x;
        result[1] = u.x;
        result[2] = -d.x;
        result[3] = 0.0;
        result[4] = r.y;
        result[5] = u.y;
        result[6] = -d.y;
        result[7] = 0.0;
        result[8] = r.z;
        result[9] = u.z;
        result[10] = -d.z;
        result[11] = 0.0;
        result[12] = -Cartesian3.dot(r, position3D);
        result[13] = -Cartesian3.dot(u, position3D);
        result[14] = Cartesian3.dot(d, position3D);
        result[15] = 1.0;

        return result;
    }

    return UniformState;
});
