define([
        '../Core/Check',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/DepthOfField',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessBlurStage'
    ], function(
        Check,
        defineProperties,
        destroyObject,
        DepthOfField,
        GaussianBlur1D,
        PostProcess,
        PostProcessBlurStage) {
    'use strict';

    /**
     * Post process stage for depth of field. Implements {@link PostProcess}.
     *
     * @alias PostProcessDepthOfFieldStage
     * @constructor
     *
     * @private
     */
    function PostProcessDepthOfFieldStage() {
        this._name = 'czm_depth_of_field';

        this._blurProcess = new PostProcessBlurStage({
            name : 'czm_depth_of_field_blur'
        });
        this._depthOfFieldProcess = new PostProcess({
            name : 'czm_depth_of_field_composite',
            fragmentShader : DepthOfField,
            uniformValues : {
                focalDistance : 5.0,
                blurTexture : this._blurProcess.name
            }
        });

        var that = this;
        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            focalDistance : {
                get : function() {
                    return that._depthOfFieldProcess.uniformValues.focalDistance;
                },
                set : function(value) {
                    that._depthOfFieldProcess.uniformValues.focalDistance = value;
                }
            }
        });

        // used by PostProcessCollection
        this._collection = undefined;
        this._index = undefined;
    }

    defineProperties(PostProcessDepthOfFieldStage.prototype, {
        ready : {
            get : function() {
                return this._blurProcess.ready && this._depthOfFieldProcess.ready;
            }
        },
        enabled : {
            get : function() {
                return this._blurProcess.enabled;
            },
            set : function(value) {
                this._blurProcess.enabled = this._depthOfFieldProcess.enabled;
            }
        },
        name : {
            get : function() {
                return this._name;
            }
        },
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },
        blurUniformValues : {
            get : function() {
                return this._blurProcess.uniformValues;
            }
        },
        outputTexture : {
            get : function() {
                return this._depthOfFieldProcess.outputTexture;
            }
        },
        length : {
            get : function() {
                return 2;
            }
        }
    });

    PostProcessDepthOfFieldStage.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('index', index, 0);
        Check.typeOf.number.lessThan('index', index, this.length);
        //>>includeEnd('debug');
        if (index === 0) {
            return this._blurProcess;
        }
        return this._depthOfFieldProcess;
    };

    PostProcessDepthOfFieldStage.prototype.update = function(context) {
        this._blurProcess.update(context);
        this._depthOfFieldProcess.update(context);
    };

    PostProcessDepthOfFieldStage.prototype.clear = function(context) {
        this._blurProcess.clear(context);
        this._depthOfFieldProcess.clear(context);
    };

    PostProcessDepthOfFieldStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._blurProcess.execute(context, colorTexture, depthTexture);
        this._depthOfFieldProcess.execute(context, colorTexture, depthTexture);
    };

    PostProcessDepthOfFieldStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessDepthOfFieldStage.prototype.destroy = function() {
        this._blurProcess.destroy();
        this._depthOfFieldProcess.destroy();
        return destroyObject(this);
    };

    return PostProcessDepthOfFieldStage;
});
