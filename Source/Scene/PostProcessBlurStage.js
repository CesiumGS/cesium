define([
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessComposite',
        './PostProcessSampleMode'
    ], function(
        defineProperties,
        destroyObject,
        GaussianBlur1D,
        PostProcess,
        PostProcessComposite,
        PostProcessSampleMode) {
    'use strict';

    /**
     * Post process stage for blur. Implements {@link PostProcess}.
     *
     * @alias PostProcessBlurStage
     * @constructor
     *
     * @private
     */
    function PostProcessBlurStage() {
        var processes = new Array(2);

        var delta = 1.0;
        var sigma = 2.0;
        var kernelSize = 1.0;

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;
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
        this._blurPostProcess = new PostProcessComposite({
            processes : processes
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
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

    defineProperties(PostProcessBlurStage.prototype, {
        ready : {
            get : function() {
                return this._blurPostProcess.ready;
            }
        },
        enabled : {
            get : function() {
                return this._blurPostProcess.enabled;
            },
            set : function(value) {
                this._blurPostProcess.enabled = value;
            }
        },
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },
        outputTexture : {
            get : function() {
                return this._blurPostProcess.outputTexture;
            }
        }
    });

    PostProcessBlurStage.prototype.update = function(context) {
        this._blurPostProcess.update(context);
    };

    PostProcessBlurStage.prototype.clear = function(context) {
        this._blurPostProcess.clear(context);
    };

    PostProcessBlurStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._blurPostProcess.execute(context, colorTexture, depthTexture);
    };

    PostProcessBlurStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessBlurStage.prototype.destroy = function() {
        this._blurPostProcess.destroy();
        return destroyObject(this);
    };

    return PostProcessBlurStage;
});
