/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/Ellipsoid',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/BoundingRectangle'
    ], function(
        DeveloperError,
        defaultValue,
        Ellipsoid,
        Matrix3,
        Matrix4,
        Cartesian3,
        Cartesian4,
        BoundingRectangle) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias UniformState
     *
     * @internalConstructor
     */
    var UniformState = function(context) {
        this._context = context;
        this._viewport = new BoundingRectangle();
        this._viewportDirty = false;
        this._viewportOrthographicMatrix = Matrix4.IDENTITY.clone();
        this._viewportTransformation = Matrix4.IDENTITY.clone();

        this._model = Matrix4.IDENTITY.clone();
        this._view = Matrix4.IDENTITY.clone();
        this._projection = Matrix4.IDENTITY.clone();
        this._infiniteProjection = Matrix4.IDENTITY.clone();
        // Arbitrary.  The user will explicitly set this later.
        this._sunPosition = new Cartesian3(2.0 * Ellipsoid.WGS84.getRadii().x, 0.0, 0.0);

        // Derived members
        this._viewRotation = new Matrix3();
        this._inverseViewRotation = new Matrix3();

        this._inverseViewDirty = true;
        this._inverseView = new Matrix4();

        this._inverseProjectionDirty = true;
        this._inverseProjection = new Matrix4();

        this._modelViewDirty = true;
        this._modelView = new Matrix4();

        this._inverseModelViewDirty = true;
        this._inverseModelView = new Matrix4();

        this._viewProjectionDirty = true;
        this._viewProjection = new Matrix4();

        this._modelViewProjectionDirty = true;
        this._modelViewProjection = new Matrix4();

        this._modelViewInfiniteProjectionDirty = true;
        this._modelViewInfiniteProjection = new Matrix4();

        this._normalDirty = true;
        this._normal = new Matrix3();

        this._inverseNormalDirty = true;
        this._inverseNormal = new Matrix3();

        this._sunDirectionECDirty = true;
        this._sunDirectionEC = new Cartesian3();

        this._sunDirectionWCDirty = true;
        this._sunDirectionWC = new Cartesian3();

        this._frameNumber = 1.0;
    };

    /**
     * DOC_TBA
     * @memberof UniformState
     */
    UniformState.prototype.getContext = function() {
        return this._context;
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

    UniformState.prototype._cleanViewport = function() {
        if (this._viewportDirty) {
            var v = this._viewport;
            Matrix4.computeOrthographicOffCenter(v.x, v.x + v.width, v.y, v.y + v.height, 0.0, 1.0, this._viewportOrthographicMatrix);
            Matrix4.computeViewportTransformation(v, 0.0, 1.0, this._viewportTransformation);
            this._viewportDirty = false;
        }
    };

    /**
     * DOC_TBA
     * @memberof UniformState
     *
     *
     * @see czm_viewportOrthographic
     */
    UniformState.prototype.getViewportOrthographic = function() {
        this._cleanViewport();
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
        this._cleanViewport();
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
        Matrix4.clone(defaultValue(matrix, Matrix4.IDENTITY), this._model);

        this._modelViewDirty = true;
        this._inverseModelViewDirty = true;
        this._modelViewProjectionDirty = true;
        this._modelViewInfiniteProjectionDirty = true;
        this._normalDirty = true;
        this._inverseNormalDirty = true;
        this._sunDirectionWCDirty = true;
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
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {Matrix4} [matrix] DOC_TBA.
     *
     * @see UniformState#getView
     * @see czm_view
     */
    UniformState.prototype.setView = function(matrix) {
        matrix = defaultValue(matrix, Matrix4.IDENTITY);
        Matrix4.clone(matrix, this._view);
        Matrix4.getRotation(matrix, this._viewRotation);

        this._inverseViewDirty = true;
        this._modelViewDirty = true;
        this._inverseModelViewDirty = true;
        this._viewProjectionDirty = true;
        this._modelViewProjectionDirty = true;
        this._modelViewInfiniteProjectionDirty = true;
        this._normalDirty = true;
        this._inverseNormalDirty = true;
        this._sunDirectionECDirty = true;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see UniformState#setView
     * @see czm_view
     */
    UniformState.prototype.getView = function() {
        return this._view;
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

    UniformState.prototype._cleanInverseView = function() {
        if (this._inverseViewDirty) {
            this._inverseViewDirty = false;

            var v = this.getView();
            Matrix4.inverse(v, this._inverseView);
            Matrix4.getRotation(this._inverseView, this._inverseViewRotation);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_inverseView
     */
    UniformState.prototype.getInverseView = function() {
        this._cleanInverseView();
        return this._inverseView;
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
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {Matrix4} [matrix] DOC_TBA.
     *
     * @see UniformState#getProjection
     * @see czm_projection
     */
    UniformState.prototype.setProjection = function(matrix) {
        Matrix4.clone(defaultValue(matrix, Matrix4.IDENTITY), this._projection);

        this._inverseProjectionDirty = true;
        this._viewProjectionDirty = true;
        this._modelViewProjectionDirty = true;
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

    UniformState.prototype._cleanInverseProjection = function() {
        if (this._inverseProjectionDirty) {
            this._inverseProjectionDirty = false;

            Matrix4.inverse(this._projection, this._inverseProjection);
        }
    };

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
        this._cleanInverseProjection();
        return this._inverseProjection;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {Matrix4} [matrix] DOC_TBA.
     *
     * @see UniformState#getInfiniteProjection
     * @see czm_infiniteProjection
     */
    UniformState.prototype.setInfiniteProjection = function(matrix) {
        Matrix4.clone(defaultValue(matrix, Matrix4.IDENTITY), this._infiniteProjection);

        this._modelViewInfiniteProjectionDirty = true;
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
    UniformState.prototype._cleanModelView = function() {
        if (this._modelViewDirty) {
            this._modelViewDirty = false;

            Matrix4.multiply(this._view, this._model, this._modelView);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_modelView
     */
    UniformState.prototype.getModelView = function() {
        this._cleanModelView();
        return this._modelView;
    };

    UniformState.prototype._cleanInverseModelView = function() {
        if (this._inverseModelViewDirty) {
            this._inverseModelViewDirty = false;

            Matrix4.inverse(this.getModelView(), this._inverseModelView);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see czm_inverseModelView
     */
    UniformState.prototype.getInverseModelView = function() {
        this._cleanInverseModelView();
        return this._inverseModelView;
    };

    UniformState.prototype._cleanViewProjection = function() {
        if (this._viewProjectionDirty) {
            this._viewProjectionDirty = false;

            Matrix4.multiply(this._projection, this._view, this._viewProjection);
        }
    };

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
        this._cleanViewProjection();
        return this._viewProjection;
    };

    UniformState.prototype._cleanModelViewProjection = function() {
        if (this._modelViewProjectionDirty) {
            this._modelViewProjectionDirty = false;

            Matrix4.multiply(this._projection, this.getModelView(), this._modelViewProjection);
        }
    };

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
        this._cleanModelViewProjection();
        return this._modelViewProjection;
    };

    UniformState.prototype._cleanModelViewInfiniteProjection = function() {
        if (this._modelViewInfiniteProjectionDirty) {
            this._modelViewInfiniteProjectionDirty = false;

            Matrix4.multiply(this._infiniteProjection, this.getModelView(), this._modelViewInfiniteProjection);
        }
    };

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
        this._cleanModelViewInfiniteProjection();
        return this._modelViewInfiniteProjection;
    };

    var normalScratch = new Matrix4();

    UniformState.prototype._cleanNormal = function() {
        if (this._normalDirty) {
            this._normalDirty = false;

            // TODO:  Inverse, transpose of the whole 4x4?  Or we can just do the 3x3?
            Matrix4.inverse(this.getModelView(), normalScratch);
            Matrix4.transpose(normalScratch, normalScratch);
            Matrix4.getRotation(normalScratch, this._normal);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix3} DOC_TBA.
     *
     * @see czm_normal
     */
    UniformState.prototype.getNormal = function() {
        this._cleanNormal();
        return this._normal;
    };

    var inverseNormalScratch = new Matrix4();

    UniformState.prototype._cleanInverseNormal = function() {
        if (this._inverseNormalDirty) {
            this._inverseNormalDirty = false;

            // TODO:  Inverse of the whole 4x4?  Or we can just do the 3x3?
            Matrix4.inverse(this.getModelView(), inverseNormalScratch);
            Matrix4.getRotation(inverseNormalScratch, this._inverseNormal);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix3} DOC_TBA.
     *
     * @see czm_inverseNormal
     */
    UniformState.prototype.getInverseNormal = function() {
        this._cleanInverseNormal();
        return this._inverseNormal;
    };

    var sunPositionScratch = new Cartesian3();

    UniformState.prototype._cleanSunDirectionEC = function() {
        if (this._sunDirectionECDirty) {
            this._sunDirectionECDirty = false;

            Matrix3.multiplyByVector(this.getViewRotation(), this._sunPosition, sunPositionScratch);
            Cartesian3.normalize(sunPositionScratch, this._sunDirectionEC);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {Matrix4} sunPosition The position of the sun in the sun's reference frame.
     *
     * @exception {DeveloperError} sunPosition is required.
     *
     * @see UniformState#getSunPosition
     */
    UniformState.prototype.setSunPosition = function(sunPosition) {
        if (!sunPosition) {
            throw new DeveloperError('sunPosition is required.');
        }

        Cartesian3.clone(sunPosition, this._sunPosition);
        this._sunDirectionECDirty = true;
        this._sunDirectionWCDirty = true;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @see UniformState#setSunPosition
     */
    UniformState.prototype.getSunPosition = function() {
        return this._sunPosition;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Cartesian3} The sun's direction in eye coordinates.
     *
     * @see czm_sunDirectionEC
     * @see UniformState#getSunDirectionEC
     */
    UniformState.prototype.getSunDirectionEC = function() {
        this._cleanSunDirectionEC();
        return this._sunDirectionEC;
    };

    UniformState.prototype._cleanSunDirectionWC = function() {
        if (this._sunDirectionWCDirty) {
            this._sunDirectionWCDirty = false;
            Cartesian3.normalize(this._sunPosition, this._sunDirectionWC);
        }
    };

    /**
    * DOC_TBA
    *
    * @memberof UniformState
    *
    * @return {Cartesian3} A normalized vector from the model's origin to the sun in model coordinates.
    *
    * @see czm_sunDirectionWC
    */
    UniformState.prototype.getSunDirectionWC = function() {
        this._cleanSunDirectionWC();
        return this._sunDirectionWC;
    };

    /**
     * Sets the current frame number.
     *
     * @memberof UniformState
     *
     * @param {number} frameNumber The current frame number.
     *
     * @see UniformState#getFrameNumber
     * @see czm_frameNumber
     */
    UniformState.prototype.setFrameNumber = function(frameNumber) {
        this._frameNumber = frameNumber;
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

    UniformState.prototype.getHighResolutionSnapScale = function() {
        return 1.0;
    };

    return UniformState;
});