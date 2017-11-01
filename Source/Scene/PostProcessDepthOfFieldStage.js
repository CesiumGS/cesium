define([
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/DepthOfField',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessComposite',
        './PostProcessSampleMode'
    ], function(
        defineProperties,
        destroyObject,
        DepthOfField,
        GaussianBlur1D,
        PostProcess,
        PostProcessComposite,
        PostProcessSampleMode) {
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
        var processes = new Array(3);

        var delta = 1.0;
        var sigma = 2.0;
        var kernelSize = 1.0;

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;

        var that = this;
        processes[0] = new PostProcess({
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 0.0
            },
            samplingMode : PostProcessSampleMode.LINEAR
        });
        processes[1] = new PostProcess({
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 1.0
            },
            samplingMode : PostProcessSampleMode.LINEAR
        });
        processes[2] = new PostProcess({
            fragmentShader : DepthOfField,
            uniformValues : {
                focalDistance : 5.0,
                originalColorTexture : function() {
                    return that._initialTexture;
                }
            }
        });

        this._initialTexture = undefined;
        this._postProcess = new PostProcessComposite({
            processes : processes
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            focalDistance : {
                get : function() {
                    return that._postProcess.processes[2].uniformValues.focalDistance;
                },
                set : function(value) {
                    that._postProcess.processes[2].uniformValues.focalDistance = value;
                }
            }
        });

        this._blurUniformValues = {};
        defineProperties(this._blurUniformValues, {
            delta : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.delta;
                },
                set : function(value) {
                    var blurXUniforms = that._postProcess.processes[0].uniformValues;
                    var blurYUniforms = that._postProcess.processes[1].uniformValues;
                    blurXUniforms.delta = blurYUniforms.delta = value;
                }
            },
            sigma : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.sigma;
                },
                set : function(value) {
                    var blurXUniforms = that._postProcess.processes[0].uniformValues;
                    var blurYUniforms = that._postProcess.processes[1].uniformValues;
                    blurXUniforms.sigma = blurYUniforms.sigma = value;
                }
            },
            kernelSize : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.kernelSize;
                },
                set : function(value) {
                    var blurXUniforms = that._postProcess.processes[0].uniformValues;
                    var blurYUniforms = that._postProcess.processes[1].uniformValues;
                    blurXUniforms.kernelSize = blurYUniforms.kernelSize = value;
                }
            }
        });
    }

    defineProperties(PostProcessDepthOfFieldStage.prototype, {
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },
        blurUniformValues : {
            get : function() {
                return this._blurUniformValues;
            }
        },
        outputTexture : {
            get : function() {
                return this._postProcess.outputTexture;
            }
        }
    });

    PostProcessDepthOfFieldStage.prototype.update = function(context) {
        this._postProcess.update(context);
    };

    PostProcessDepthOfFieldStage.prototype.clear = function(context) {
        this._postProcess.clear(context);
    };

    PostProcessDepthOfFieldStage.prototype._setColorTexture = function(texture) {
        this._initialTexture = texture;
        this._postProcess._setColorTexture(texture);
    };

    PostProcessDepthOfFieldStage.prototype._setDepthTexture = function(texture) {
        this._postProcess._setDepthTexture(texture);
    };

    PostProcessDepthOfFieldStage.prototype.execute = function(context) {
        this._postProcess.execute(context);
    };

    PostProcessDepthOfFieldStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessDepthOfFieldStage.prototype.destroy = function() {
        this._postProcess.destroy();
        return destroyObject(this);
    };

    return PostProcessDepthOfFieldStage;
});
