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
        var processes = new Array(2);

        var delta = 1.0;
        var sigma = 2.0;
        var kernelSize = 1.0;

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;

        var that = this;
        var blurX = processes[0] = new PostProcess({
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 0.0
            },
            samplingMode : PostProcessSampleMode.LINEAR
        });
        var blurY = processes[1] = new PostProcess({
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 1.0
            },
            samplingMode : PostProcessSampleMode.LINEAR
        });

        this._blurProcess = new PostProcessComposite({
            processes : processes
        });
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

        this._blurUniformValues = {};
        defineProperties(this._blurUniformValues, {
            delta : {
                get : function() {
                    return blurX.uniformValues.delta;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
                    blurXUniforms.delta = blurYUniforms.delta = value;
                }
            },
            sigma : {
                get : function() {
                    return blurX.uniformValues.sigma;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
                    blurXUniforms.sigma = blurYUniforms.sigma = value;
                }
            },
            kernelSize : {
                get : function() {
                    return blurX.uniformValues.kernelSize;
                },
                set : function(value) {
                    var blurXUniforms = blurX.uniformValues;
                    var blurYUniforms = blurY.uniformValues;
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
