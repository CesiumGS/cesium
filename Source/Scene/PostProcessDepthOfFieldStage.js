define([
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/DepthOfField',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessBlurStage'
    ], function(
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
        var that = this;
        this._blurProcess = new PostProcessBlurStage();
        this._depthOfFieldProcess = new PostProcess({
            fragmentShader : DepthOfField,
            uniformValues : {
                focalDistance : 5.0,
                blurTexture : function() {
                    return that._blurProcess.outputTexture;
                }
            }
        });

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
        }
    });

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
