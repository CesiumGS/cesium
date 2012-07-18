/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Matrix4',
        '../Core/Cartesian3',
        '../Core/Cartesian4'
    ], function(
        DeveloperError,
        Ellipsoid,
        Matrix4,
        Cartesian3,
        Cartesian4) {
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
        this._viewport = {
            x : 0,
            y : 0,
            width : 0,
            height : 0
        };
        this._viewportOrthographicMatrix = Matrix4.IDENTITY;
        this._viewportTransformation = Matrix4.IDENTITY;

        this._model = Matrix4.IDENTITY;
        this._view = Matrix4.IDENTITY;
        this._projection = Matrix4.IDENTITY;

        this._infiniteProjection = Matrix4.IDENTITY;

        // Arbitrary.  The user will explicitly set this later.
        this._sunPosition = new Cartesian3(2.0 * Ellipsoid.WGS84.getRadii().x, 0.0, 0.0);

        // Derived members
        this._inverseViewDirty = true;
        this._inverseProjectionDirty = true;
        this._modelViewDirty = true;
        this._inverseModelViewDirty = true;
        this._viewProjectionDirty = true;
        this._modelViewProjectionDirty = true;
        this._modelViewInfiniteProjectionDirty = true;
        this._normalDirty = true;
        this._inverseNormalDirty = true;
        this._sunDirectionECDirty = true;
        this._sunDirectionWCDirty = true;
    };

    /**
     * DOC_TBA
     * @memberof UniformState
     */
    UniformState.prototype.getContext = function() {
        return this._context;
    };

    UniformState.prototype._cleanViewport = function() {
        var current = this._viewport;
        var v = this._context.getViewport();

        if ((current.x !== v.x) ||
            (current.y !== v.y) ||
            (current.width !== v.width) ||
            (current.height !== v.height)) {
            current.x = v.x;
            current.y = v.y;
            current.width = v.width;
            current.height = v.height;

            this._viewportOrthographicMatrix = Matrix4.createOrthographicOffCenter(v.x, v.x + v.width, v.y, v.y + v.height, 0.0, 1.0);
            this._viewportTransformation = Matrix4.createViewportTransformation(v);
        }
    };

    /**
     * DOC_TBA
     * @memberof UniformState
     *
     *
     * @see agi_viewportOrthographic
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
     * @see agi_viewportTransformation
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
     * @see agi_model
     */
    UniformState.prototype.setModel = function(matrix) {
        matrix = matrix || Matrix4.IDENTITY;

        this._model = matrix;
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
     * @see agi_model
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
     * @see agi_view
     */
    UniformState.prototype.setView = function(matrix) {
        matrix = matrix || Matrix4.IDENTITY;

        this._view = matrix;
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
     * @see agi_view
     */
    UniformState.prototype.getView = function() {
        return this._view;
    };

    UniformState.prototype._cleanInverseView = function() {
        if (this._inverseViewDirty) {
            this._inverseViewDirty = false;

            var n = this.getView().inverse();
            this._inverseView = n;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see agi_inverseView
     */
    UniformState.prototype.getInverseView = function() {
        this._cleanInverseView();
        return this._inverseView;
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @param {Matrix4} [matrix] DOC_TBA.
     *
     * @see UniformState#getProjection
     * @see agi_projection
     */
    UniformState.prototype.setProjection = function(matrix) {
        matrix = matrix || Matrix4.IDENTITY;

        this._projection = matrix;
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
     * @see agi_projection
     */
    UniformState.prototype.getProjection = function() {
        return this._projection;
    };

    UniformState.prototype._cleanInverseProjection = function() {
        if (this._inverseProjectionDirty) {
            this._inverseProjectionDirty = false;

            var n = this.getProjection().inverse();
            this._inverseProjection = n;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see agi_inverseProjection
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
     * @see agi_infiniteProjection
     */
    UniformState.prototype.setInfiniteProjection = function(matrix) {
        matrix = matrix || Matrix4.IDENTITY;

        this._infiniteProjection = matrix;
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
     * @see agi_infiniteProjection
     */
    UniformState.prototype.getInfiniteProjection = function() {
        return this._infiniteProjection;
    };

    // Derived
    UniformState.prototype._cleanModelView = function() {
        if (this._modelViewDirty) {
            this._modelViewDirty = false;

            var mv = this._view.multiply(this._model);
            this._modelView = mv;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see agi_modelView
     */
    UniformState.prototype.getModelView = function() {
        this._cleanModelView();
        return this._modelView;
    };

    UniformState.prototype._cleanInverseModelView = function() {
        if (this._inverseModelViewDirty) {
            this._inverseModelViewDirty = false;

            var m = this.getModelView().inverse();
            this._inverseModelView = m;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see agi_inverseModelView
     */
    UniformState.prototype.getInverseModelView = function() {
        this._cleanInverseModelView();
        return this._inverseModelView;
    };

    UniformState.prototype._cleanViewProjection = function() {
        if (this._viewProjectionDirty) {
            this._viewProjectionDirty = false;

            var vp = this.getProjection().multiply(this.getView());
            this._viewProjection = vp;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see agi_viewProjection
     */
    UniformState.prototype.getViewProjection = function() {
        this._cleanViewProjection();
        return this._viewProjection;
    };

    UniformState.prototype._cleanModelViewProjection = function() {
        if (this._modelViewProjectionDirty) {
            this._modelViewProjectionDirty = false;

            var mvp = this._projection.multiply(this.getModelView());
            this._modelViewProjection = mvp;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see agi_modelViewProjection
     */
    UniformState.prototype.getModelViewProjection = function() {
        this._cleanModelViewProjection();
        return this._modelViewProjection;
    };

    UniformState.prototype._cleanModelViewInfiniteProjection = function() {
        if (this._modelViewInfiniteProjectionDirty) {
            this._modelViewInfiniteProjectionDirty = false;

            var mvp = this._infiniteProjection.multiply(this.getModelView());
            this._modelViewInfiniteProjection = mvp;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix4} DOC_TBA.
     *
     * @see agi_modelViewProjection
     */
    UniformState.prototype.getModelViewInfiniteProjection = function() {
        this._cleanModelViewInfiniteProjection();
        return this._modelViewInfiniteProjection;
    };

    UniformState.prototype._cleanNormal = function() {
        if (this._normalDirty) {
            this._normalDirty = false;

            // TODO:  Inverse, transpose of the whole 4x4?  Or we can just do the 3x3?
            var n = this.getModelView().inverse().transpose().getRotation();
            this._normal = n;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix3} DOC_TBA.
     *
     * @see agi_normal
     */
    UniformState.prototype.getNormal = function() {
        this._cleanNormal();
        return this._normal;
    };

    UniformState.prototype._cleanInverseNormal = function() {
        if (this._inverseNormalDirty) {
            this._inverseNormalDirty = false;

            // TODO:  Inverse of the whole 4x4?  Or we can just do the 3x3?
            var n = this.getModelView().inverse().getRotation();
            this._inverseNormal = n;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof UniformState
     *
     * @return {Matrix3} DOC_TBA.
     *
     * @see agi_inverseNormal
     */
    UniformState.prototype.getInverseNormal = function() {
        this._cleanInverseNormal();
        return this._inverseNormal;
    };

    UniformState.prototype._cleanSunDirectionEC = function() {
        if (this._sunDirectionECDirty) {
            this._sunDirectionECDirty = false;

            var sunPosition = new Cartesian4(this._sunPosition.x, this._sunPosition.y, this._sunPosition.z, 0.0);
            var sunEC = this.getView().multiplyByVector(sunPosition);
            var p = new Cartesian3(sunEC.x, sunEC.y, sunEC.z).normalize();

            this._sunDirectionEC = p;
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

        this._sunPosition = sunPosition;
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
     * @see agi_sunDirectionEC
     * @see UniformState#getSunDirectionEC
     */
    UniformState.prototype.getSunDirectionEC = function() {
        this._cleanSunDirectionEC();
        return this._sunDirectionEC;
    };

    UniformState.prototype._cleanSunDirectionWC = function() {
        if (this._sunDirectionWCDirty) {
            this._sunDirectionWCDirty = false;
            this._sunDirectionWC = this._sunPosition.normalize();
        }
    };

    /**
    * DOC_TBA
    *
    * @memberof UniformState
    *
    * @return {Cartesian3} A normalized vector from the model's origin to the sun in model coordinates.
    *
    * @see agi_sunDirectionWC
    */
    UniformState.prototype.getSunDirectionWC = function() {
        this._cleanSunDirectionWC();
        return this._sunDirectionWC;
    };

    UniformState.prototype.getHighResolutionSnapScale = function() {
        return 1.0;
    };

    return UniformState;
});