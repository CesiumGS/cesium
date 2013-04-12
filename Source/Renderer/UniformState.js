/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/Ellipsoid',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Math',
        '../Core/EncodedCartesian3',
        '../Core/BoundingRectangle',
        '../Core/Transforms',
        '../Core/computeSunPosition',
        '../Scene/SceneMode'
    ], function(
        DeveloperError,
        defaultValue,
        Ellipsoid,
        Matrix3,
        Matrix4,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        CesiumMath,
        EncodedCartesian3,
        BoundingRectangle,
        Transforms,
        computeSunPosition,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias UniformState
     *
     * @internalConstructor
     */
    var UniformState = function() {
        this._viewport = new BoundingRectangle();
        this._viewportDirty = false;
        this._viewportOrthographicMatrix = Matrix4.IDENTITY.clone();
        this._viewportTransformation = Matrix4.IDENTITY.clone();

        this._model = Matrix4.IDENTITY.clone();
        this._view = Matrix4.IDENTITY.clone();
        this._inverseView = Matrix4.IDENTITY.clone();
        this._projection = Matrix4.IDENTITY.clone();
        this._infiniteProjection = Matrix4.IDENTITY.clone();
        this._entireFrustum = new Cartesian2();
        this._currentFrustum = new Cartesian2();
        this._pixelSize = 0.0;

        this._frameNumber = 1.0;
        this._time = undefined;
        this._temeToPseudoFixed = Matrix3.IDENTITY.clone();

        // Derived members
        this._view3DDirty = true;
        this._view3D = new Matrix4();

        this._inverseView3DDirty = true;
        this._inverseView3D = new Matrix4();

        this._inverseModelDirty = true;
        this._inverseModel = new Matrix4();

        this._viewRotation = new Matrix3();
        this._inverseViewRotation = new Matrix3();

        this._viewRotation3D = new Matrix3();
        this._inverseViewRotation3D = new Matrix3();

        this._inverseProjectionDirty = true;
        this._inverseProjection = new Matrix4();

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

        this._modelViewProjectionDirty = true;
        this._modelViewProjection = new Matrix4();

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

        this._sunDirectionWC = new Cartesian3();
        this._sunDirectionEC = new Cartesian3();
        this._moonDirectionEC = new Cartesian3();

        this._mode = undefined;
        this._mapProjection = undefined;
        this._cameraDirection = new Cartesian3();
        this._cameraRight = new Cartesian3();
        this._cameraUp = new Cartesian3();
        this._frustum2DWidth = 0.0;
    };

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
        uniformState._viewProjectionDirty = true;
        uniformState._modelViewProjectionDirty = true;
        uniformState._modelViewProjectionRelativeToEyeDirty = true;
    }

    function setInfiniteProjection(uniformState, matrix) {
        Matrix4.clone(matrix, uniformState._infiniteProjection);

        uniformState._modelViewInfiniteProjectionDirty = true;
    }

    function setCamera(uniformState, camera) {
        Cartesian3.clone(camera.getPositionWC(), uniformState._cameraPosition);
        Cartesian3.clone(camera.getDirectionWC(), uniformState._cameraDirection);
        Cartesian3.clone(camera.getRightWC(), uniformState._cameraRight);
        Cartesian3.clone(camera.getUpWC(), uniformState._cameraUp);
        uniformState._encodedCameraPositionMCDirty = true;
    }

    var sunPositionWC = new Cartesian3();
    var sunPositionScratch = new Cartesian3();

    function setSunAndMoonDirections(uniformState, frameState) {
        computeSunPosition(frameState.time, sunPositionWC);

        Cartesian3.normalize(sunPositionWC, uniformState._sunDirectionWC);
        Matrix3.multiplyByVector(uniformState.getViewRotation3D(), sunPositionWC, sunPositionScratch);
        Cartesian3.normalize(sunPositionScratch, uniformState._sunDirectionEC);

        // Pseudo direction for now just for lighting
        Cartesian3.negate(uniformState._sunDirectionEC, uniformState._moonDirectionEC);
    }

    /**
     * Synchronizes the frustum's state with the uniform state.  This is called
     * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
     * are set to the right value.
     *
     * @memberof UniformState
     *
     * @param {Object} frustum The frustum to synchronize with.
     */
    UniformState.prototype.updateFrustum = function(frustum) {
        setProjection(this, frustum.getProjectionMatrix());
        if (typeof frustum.getInfiniteProjectionMatrix !== 'undefined') {
            setInfiniteProjection(this, frustum.getInfiniteProjectionMatrix());
        }
        this._currentFrustum.x = frustum.near;
        this._currentFrustum.y = frustum.far;
    };

    /**
     * Synchronizes frame state with the uniform state.  This is called
     * by the {@link Scene} when rendering to ensure that automatic GLSL uniforms
     * are set to the right value.
     *
     * @memberof UniformState
     *
     * @param {FrameState} frameState The frameState to synchronize with.
     */
    UniformState.prototype.update = function(frameState) {
        this._mode = frameState.mode;
        this._mapProjection = frameState.scene2D.projection;

        var camera = frameState.camera;

        setView(this, camera.getViewMatrix());
        setInverseView(this, camera.getInverseViewMatrix());
        setCamera(this, camera);

        if (frameState.mode === SceneMode.SCENE2D) {
            this._frustum2DWidth = camera.frustum.right - camera.frustum.left;
        } else {
            this._frustum2DWidth = 0.0;
        }

        setSunAndMoonDirections(this, frameState);

        var pixelSize = camera.frustum.getPixelSize(frameState.canvasDimensions);
        this._pixelSize = Math.max(pixelSize.x, pixelSize.y);

        this._entireFrustum.x = camera.frustum.near;
        this._entireFrustum.y = camera.frustum.far;
        this.updateFrustum(camera.frustum);

        this._frameNumber = frameState.frameNumber;
        this._time = frameState.time;
        this._temeToPseudoFixed = Transforms.computeTemeToPseudoFixedMatrix(frameState.time);
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {BoundingRectangle} viewport DOC_TBA.
     *
     * @see UniformState#getViewport
     * @see czm_viewport
     */
    UniformState.prototype.setViewport = function(viewport) {
        if (!BoundingRectangle.equals(viewport, this._viewport)) {
            BoundingRectangle.clone(viewport, this._viewport);
            this._viewportDirty = true;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * return {BoundingRectangle} DOC_TBA.
     *
     * @see UniformState#setViewport
     * @see czm_viewport
     */
    UniformState.prototype.getViewport = function () {
        return this._viewport;
    };

    function cleanViewport(uniformState) {
        if (uniformState._viewportDirty) {
            var v = uniformState._viewport;
            Matrix4.computeOrthographicOffCenter(v.x, v.x + v.width, v.y, v.y + v.height, 0.0, 1.0, uniformState._viewportOrthographicMatrix);
            Matrix4.computeViewportTransformation(v, 0.0, 1.0, uniformState._viewportTransformation);
            uniformState._viewportDirty = false;
        }
    }

    /**
     * DOC_TBA
     * @memberof UniformState
     *
     *
     * @see czm_viewportOrthographic
     */
    UniformState.prototype.getViewportOrthographic = function() {
        cleanViewport(this);
        return this._viewportOrthographicMatrix;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @see czm_viewportTransformation
     */
    UniformState.prototype.getViewportTransformation = function() {
        cleanViewport(this);
        return this._viewportTransformation;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {Matrix4} [matrix] DOC_TBA.
     *
     * @see UniformState#getModel
     * @see czm_model
     */
    UniformState.prototype.setModel = function(matrix) {
        Matrix4.clone(matrix, this._model);

        this._modelView3DDirty = true;
        this._inverseModelView3DDirty = true;
        this._inverseModelDirty = true;
        this._modelViewDirty = true;
        this._modelViewRelativeToEyeDirty = true;
        this._inverseModelViewDirty = true;
        this._modelViewProjectionDirty = true;
        this._modelViewProjectionRelativeToEyeDirty = true;
        this._modelViewInfiniteProjectionDirty = true;
        this._normalDirty = true;
        this._inverseNormalDirty = true;
        this._normal3DDirty = true;
        this._inverseNormal3DDirty = true;
        this._encodedCameraPositionMCDirty = true;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see UniformState#setModel
     * @see czm_model
     */
    UniformState.prototype.getModel = function() {
        return this._model;
    };

    /**
     * Returns the inverse model matrix used to define the {@link czm_inverseModel} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The inverse model matrix.
     *
     * @see UniformState#setModel
     * @see UniformState#getModel
     * @see czm_inverseModel
     */
    UniformState.prototype.getInverseModel = function() {
        if (this._inverseModelDirty) {
            this._inverseModelDirty = false;

            this._model.inverse(this._inverseModel);
        }

        return this._inverseModel;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_view
     */
    UniformState.prototype.getView = function() {
        return this._view;
    };

    /**
     * Gets the 3D view matrix.  In 3D mode, this is identical to {@link UniformState#getView},
     * but in 2D and Columbus View it is a synthetic matrix based on the equivalent position
     * of the camera in the 3D world.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The 3D view matrix.
     *
     * @see czm_view3D
     */
    UniformState.prototype.getView3D = function() {
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
    };

    /**
     * Returns the 3x3 rotation matrix of the current view matrix ({@link UniformState#getView}).
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The 3x3 rotation matrix of the current view matrix.
     *
     * @see UniformState#getView
     * @see czm_viewRotation
     */
    UniformState.prototype.getViewRotation = function() {
        return this._viewRotation;
    };

    /**
     * Returns the 3x3 rotation matrix of the current 3D view matrix ({@link UniformState#getView3D}).
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The 3x3 rotation matrix of the current 3D view matrix.
     *
     * @see UniformState#getView3D
     * @see czm_viewRotation3D
     */
    UniformState.prototype.getViewRotation3D = function() {
        this.getView3D();
        return this._viewRotation3D;
    };


    /**
     * Returns the 4x4 inverse-view matrix that transforms from eye to world coordinates.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The 4x4 inverse-view matrix that transforms from eye to world coordinates.
     *
     * @see czm_inverseView
     */
    UniformState.prototype.getInverseView = function() {
        return this._inverseView;
    };

    /**
     * Returns the 4x4 inverse-view matrix that transforms from eye to 3D world coordinates.  In 3D mode, this is
     * identical to {@link UniformState#getInverseView}, but in 2D and Columbus View it is a synthetic matrix
     * based on the equivalent position of the camera in the 3D world.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The 4x4 inverse-view matrix that transforms from eye to 3D world coordinates.
     *
     * @see czm_inverseView3D
     */
    UniformState.prototype.getInverseView3D = function() {
        if (this._inverseView3DDirty) {
            Matrix4.inverseTransformation(this.getView3D(), this._inverseView3D);
            Matrix4.getRotation(this._inverseView3D, this._inverseViewRotation3D);
            this._inverseView3DDirty = false;
        }
        return this._inverseView3D;
    };

    /**
     * Returns the 3x3 rotation matrix of the current inverse-view matrix ({@link UniformState#getInverseView}).
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The 3x3 rotation matrix of the current inverse-view matrix.
     *
     * @see UniformState#getInverseView
     * @see czm_inverseViewRotation
     */
    UniformState.prototype.getInverseViewRotation = function() {
        return this._inverseViewRotation;
    };

    /**
     * Returns the 3x3 rotation matrix of the current 3D inverse-view matrix ({@link UniformState#getInverseView3D}).
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The 3x3 rotation matrix of the current 3D inverse-view matrix.
     *
     * @see UniformState#getInverseView3D
     * @see czm_inverseViewRotation3D
     */
    UniformState.prototype.getInverseViewRotation3D = function() {
        this.getInverseView3D();
        return this._inverseViewRotation3D;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see UniformState#setProjection
     * @see czm_projection
     */
    UniformState.prototype.getProjection = function() {
        return this._projection;
    };

    function cleanInverseProjection(uniformState) {
        if (uniformState._inverseProjectionDirty) {
            uniformState._inverseProjectionDirty = false;

            Matrix4.inverse(uniformState._projection, uniformState._inverseProjection);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_inverseProjection
     */
    UniformState.prototype.getInverseProjection = function() {
        cleanInverseProjection(this);
        return this._inverseProjection;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see UniformState#setInfiniteProjection
     * @see czm_infiniteProjection
     */
    UniformState.prototype.getInfiniteProjection = function() {
        return this._infiniteProjection;
    };

    // Derived
    function cleanModelView(uniformState) {
        if (uniformState._modelViewDirty) {
            uniformState._modelViewDirty = false;

            Matrix4.multiply(uniformState._view, uniformState._model, uniformState._modelView);
        }
    }

    /**
     * Gets the model-view matrix.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The model-view matrix.
     *
     * @see czm_modelView
     */
    UniformState.prototype.getModelView = function() {
        cleanModelView(this);
        return this._modelView;
    };

    function cleanModelView3D(uniformState) {
        if (uniformState._modelView3DDirty) {
            uniformState._modelView3DDirty = false;

            Matrix4.multiply(uniformState.getView3D(), uniformState._model, uniformState._modelView3D);
        }
    }

    /**
     * Gets the 3D model-view matrix.  In 3D mode, this is equivalent to {@link UniformState#getModelView}.  In 2D and
     * Columbus View, however, it is a synthetic matrix based on the equivalent position of the camera in the 3D world.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The 3D model-view matrix.
     *
     * @see czm_modelView3D
     */
    UniformState.prototype.getModelView3D = function() {
        cleanModelView3D(this);
        return this._modelView3D;
    };

    function cleanModelViewRelativeToEye(uniformState) {
        if (uniformState._modelViewRelativeToEyeDirty) {
            uniformState._modelViewRelativeToEyeDirty = false;

            var mv = uniformState.getModelView();
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

    /**
     * Returns the model-view relative to eye matrix used to define the {@link czm_modelViewRelativeToEye} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The model-view relative to eye matrix.
     *
     * @see czm_modelViewRelativeToEye
     */
    UniformState.prototype.getModelViewRelativeToEye = function() {
        cleanModelViewRelativeToEye(this);
        return this._modelViewRelativeToEye;
    };

    function cleanInverseModelView(uniformState) {
        if (uniformState._inverseModelViewDirty) {
            uniformState._inverseModelViewDirty = false;

            Matrix4.inverse(uniformState.getModelView(), uniformState._inverseModelView);
        }
    }

    /**
     * Gets the inverse of the model-view matrix.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The inverse of the model-view matrix.
     *
     * @see czm_inverseModelView
     */
    UniformState.prototype.getInverseModelView = function() {
        cleanInverseModelView(this);
        return this._inverseModelView;
    };

    function cleanInverseModelView3D(uniformState) {
        if (uniformState._inverseModelView3DDirty) {
            uniformState._inverseModelView3DDirty = false;

            Matrix4.inverse(uniformState.getModelView3D(), uniformState._inverseModelView3D);
        }
    }

    /**
     * Gets the inverse of the 3D model-view matrix.  In 3D mode, this is equivalent to {@link UniformState#getInverseModelView}.
     * In 2D and Columbus View, however, it is a synthetic matrix based on the equivalent position of the camera in the 3D world.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The inverse of the 3D model-view matrix.
     *
     * @see czm_inverseModelView3D
     */
    UniformState.prototype.getInverseModelView3D = function() {
        cleanInverseModelView3D(this);
        return this._inverseModelView3D;
    };

    function cleanViewProjection(uniformState) {
        if (uniformState._viewProjectionDirty) {
            uniformState._viewProjectionDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState._view, uniformState._viewProjection);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_viewProjection
     */
    UniformState.prototype.getViewProjection = function() {
        cleanViewProjection(this);
        return this._viewProjection;
    };

    function cleanModelViewProjection(uniformState) {
        if (uniformState._modelViewProjectionDirty) {
            uniformState._modelViewProjectionDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState.getModelView(), uniformState._modelViewProjection);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_modelViewProjection
     */
    UniformState.prototype.getModelViewProjection = function() {
        cleanModelViewProjection(this);
        return this._modelViewProjection;
    };

    function cleanModelViewProjectionRelativeToEye(uniformState) {
        if (uniformState._modelViewProjectionRelativeToEyeDirty) {
            uniformState._modelViewProjectionRelativeToEyeDirty = false;

            Matrix4.multiply(uniformState._projection, uniformState.getModelViewRelativeToEye(), uniformState._modelViewProjectionRelativeToEye);
        }
    }

    /**
     * Returns the model-view-projection relative to eye matrix used to define the {@link czm_modelViewProjectionRelativeToEye} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Matrix4} The model-view-projection relative to eye matrix.
     *
     * @see czm_modelViewProjectionRelativeToEye
     */
    UniformState.prototype.getModelViewProjectionRelativeToEye = function() {
        cleanModelViewProjectionRelativeToEye(this);
        return this._modelViewProjectionRelativeToEye;
    };

    function cleanModelViewInfiniteProjection(uniformState) {
        if (uniformState._modelViewInfiniteProjectionDirty) {
            uniformState._modelViewInfiniteProjectionDirty = false;

            Matrix4.multiply(uniformState._infiniteProjection, uniformState.getModelView(), uniformState._modelViewInfiniteProjection);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_modelViewProjection
     */
    UniformState.prototype.getModelViewInfiniteProjection = function() {
        cleanModelViewInfiniteProjection(this);
        return this._modelViewInfiniteProjection;
    };

    var normalScratch = new Matrix4();

    function cleanNormal(uniformState) {
        if (uniformState._normalDirty) {
            uniformState._normalDirty = false;

            Matrix4.transpose(uniformState.getInverseModelView(), normalScratch);
            Matrix4.getRotation(normalScratch, uniformState._normal);
        }
    }

    /**
     * Gets a 3x3 normal transformation matrix that transforms normal vectors in model coordinates to
     * eye coordinates.
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The normal transformation matrix.
     *
     * @see czm_normal
     */
    UniformState.prototype.getNormal = function() {
        cleanNormal(this);
        return this._normal;
    };

    function cleanNormal3D(uniformState) {
        if (uniformState._normal3DDirty) {
            uniformState._normal3DDirty = false;

            Matrix4.transpose(uniformState.getInverseModelView3D(), normalScratch);
            Matrix4.getRotation(normalScratch, uniformState._normal3D);
        }
    }

    /**
     * Gets a 3x3 normal transformation matrix that transforms normal vectors in 3D model
     * coordinates to eye coordinates.  In 3D mode, this is identical to
     * {@link UniformState#getNormal}, but in 2D and Columbus View it represents the normal transformation
     * matrix as if the camera were at an equivalent location in 3D mode.
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The normal transformation matrix.
     *
     * @see czm_normal3D
     */
    UniformState.prototype.getNormal3D = function() {
        cleanNormal3D(this);
        return this._normal3D;
    };

    function cleanInverseNormal(uniformState) {
        if (uniformState._inverseNormalDirty) {
            uniformState._inverseNormalDirty = false;

            Matrix4.getRotation(uniformState.getInverseModelView(), uniformState._inverseNormal);
        }
    }

    /**
     * Gets an inverse 3x3 normal transformation matrix that transforms normal vectors in model coordinates
     * to eye coordinates.
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The inverse normal transformation matrix.
     *
     * @see czm_inverseNormal
     */
    UniformState.prototype.getInverseNormal = function() {
        cleanInverseNormal(this);
        return this._inverseNormal;
    };

    function cleanInverseNormal3D(uniformState) {
        if (uniformState._inverseNormal3DDirty) {
            uniformState._inverseNormal3DDirty = false;

            Matrix4.getRotation(uniformState.getInverseModelView3D(), uniformState._inverseNormal3D);
        }
    }

    /**
     * Gets an inverse 3x3 normal transformation matrix that transforms normal vectors in eye coordinates
     * to 3D model coordinates.  In 3D mode, this is identical to
     * {@link UniformState#getInverseNormal}, but in 2D and Columbus View it represents the normal transformation
     * matrix as if the camera were at an equivalent location in 3D mode.
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The inverse normal transformation matrix.
     *
     * @see czm_inverseNormal3D
     */
    UniformState.prototype.getInverseNormal3D = function() {
        cleanInverseNormal3D(this);
        return this._inverseNormal3D;
    };

    /**
     * Returns the near distance (<code>x</code>) and the far distance (<code>y</code>) of the frustum defined by the camera.
     * This is the largest possible frustum, not an individual frustum used for multi-frustum rendering.
     *
     * @memberof UniformState
     *
     * @return {Cartesian2} Returns the near distance and the far distance of the frustum defined by the camera.
     *
     * @see czm_entireFrustum
     * @see UniformState#getCurrentFrustum
     */
    UniformState.prototype.getEntireFrustum = function() {
        return this._entireFrustum;
    };

    /**
     * Returns the near distance (<code>x</code>) and the far distance (<code>y</code>) of the frustum defined by the camera.
     * This is the individual frustum used for multi-frustum rendering.
     *
     * @memberof UniformState
     *
     * @return {Cartesian2} Returns the near distance and the far distance of the frustum defined by the camera.
     *
     * @see czm_currentFrustum
     * @see UniformState#getEntireFrustum
     */
    UniformState.prototype.getCurrentFrustum = function() {
        return this._currentFrustum;
    };

    /**
     * Returns the size of a pixel in meters at a distance of one meter from the camera.
     *
     * @memberof UniformState
     *
     * @return {Number} Returns the size of a pixel in meters at a distance of one meter from the camera.
     *
     * @see czm_pixelSizeInMeters
     */
    UniformState.prototype.getPixelSize = function() {
        return this._pixelSize;
    };

    /**
     * Returns a normalized vector to the sun in 3D world coordinates at the current scene time.  Even in 2D or
     * Columbus View mode, this returns the position of the sun in the 3D scene.
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} A normalized vector to the sun in 3D world coordinates at the current scene time.
     *
     * @see czm_sunDirectionWC
     */
    UniformState.prototype.getSunDirectionWC = function() {
        return this._sunDirectionWC;
    };

    /**
     * Returns a normalized vector to the sun in eye coordinates at the current scene time.  In 3D mode, this
     * returns the actual vector from the camera position to the sun position.  In 2D and Columbus View, it returns
     * the vector from the equivalent 3D camera position to the position of the sun in the 3D scene.
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} A normalized vector to the sun in eye coordinates at the current scene time.
     *
     * @see czm_sunDirectionEC
     */
    UniformState.prototype.getSunDirectionEC = function() {
        return this._sunDirectionEC;
    };

    /**
     * Returns a normalized vector to the moon in eye coordinates at the current scene time.  In 3D mode, this
     * returns the actual vector from the camera position to the moon position.  In 2D and Columbus View, it returns
     * the vector from the equivalent 3D camera position to the position of the moon in the 3D scene.
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} A normalized vector to the moon in eye coordinates at the current scene time.
     *
     * @see czm_moonDirectionEC
     */
    UniformState.prototype.getMoonDirectionEC = function() {
        return this._moonDirectionEC;
    };

    var cameraPositionMC = new Cartesian3();

    function cleanEncodedCameraPositionMC(uniformState) {
        if (uniformState._encodedCameraPositionMCDirty) {
            uniformState._encodedCameraPositionMCDirty = false;

            uniformState.getInverseModel().multiplyByPoint(uniformState._cameraPosition, cameraPositionMC);
            EncodedCartesian3.fromCartesian(cameraPositionMC, uniformState._encodedCameraPositionMC);
        }
    }

    /**
     * Returns the high bits of the camera position used to define the {@link czm_encodedCameraPositionMCHigh} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} The high bits of the camera position.
     *
     * @see UniformState#getEncodedCameraPositionMCLow
     */
    UniformState.prototype.getEncodedCameraPositionMCHigh = function() {
        cleanEncodedCameraPositionMC(this);
        return this._encodedCameraPositionMC.high;
    };

    /**
     * Returns the low bits of the camera position used to define the {@link czm_encodedCameraPositionMCLow} GLSL uniform.
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} The low bits of the camera position.
     *
     * @see UniformState#getEncodedCameraPositionMCHigh
     */
    UniformState.prototype.getEncodedCameraPositionMCLow = function() {
        cleanEncodedCameraPositionMC(this);
        return this._encodedCameraPositionMC.low;
    };

    /**
     * Gets the current frame number.
     *
     * @memberof UniformState
     *
     * @return {number} A number representing the current frame number.
     *
     * @see czm_frameNumber
     */
    UniformState.prototype.getFrameNumber = function() {
        return this._frameNumber;
    };

    /**
     * Gets the scene's current time.
     *
     * @memberof UniformState
     *
     * @return {JulianDate} The scene's current time.
     */
    UniformState.prototype.getTime = function() {
        return this._time;
    };

    /**
     * Returns a 3x3 matrix that transforms from True Equator Mean Equinox (TEME) axes to the
     * pseudo-fixed axes at the Scene's current time.
     *
     * @memberof UniformState
     *
     * @return {Matrix3} The transform from TEME to pseudo-fixed.
     *
     * @see czm_temeToPseudoFixed
     */
    UniformState.prototype.getTemeToPseudoFixedMatrix = function() {
        return this._temeToPseudoFixed;
    };

    UniformState.prototype.getHighResolutionSnapScale = function() {
        return 1.0;
    };

    var view2Dto3DPScratch = new Cartesian3();
    var view2Dto3DRScratch = new Cartesian4();
    var view2Dto3DUScratch = new Cartesian4();
    var view2Dto3DDScratch = new Cartesian4();
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
        var ellipsoid = projection.getEllipsoid();
        var position3D = ellipsoid.cartographicToCartesian(cartographic, view2Dto3DCartesian3Scratch);

        // Compute the rotation from the local ENU at the real world camera position to the fixed axes.
        var enuToFixed = Transforms.eastNorthUpToFixedFrame(position3D, ellipsoid, view2Dto3DMatrix4Scratch);

        // Transform each camera direction to the fixed axes.
        enuToFixed.multiplyByVector(r, r);
        enuToFixed.multiplyByVector(u, u);
        enuToFixed.multiplyByVector(d, d);

        // Compute the view matrix based on the new fixed-frame camera position and directions.
        if (typeof result === 'undefined') {
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