define([
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Shaders/PostProcessFilters/BloomComposite',
        '../Shaders/PostProcessFilters/ContrastBias',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessComposite'
    ], function(
        defineProperties,
        destroyObject,
        BloomComposite,
        ContrastBias,
        GaussianBlur1D,
        PostProcess,
        PostProcessComposite) {
    'use strict';

    /**
     * Post process stage for bloom. Implements {@link PostProcess}.
     *
     * @alias PostProcessBloomStage
     * @constructor
     *
     * @private
     */
    function PostProcessBloomStage() {
        var processes = new Array(3);

        var delta = 1.0;
        var sigma = 2.0;
        var kernelSize = 1.0;

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;

        var that = this;
        var contrastBias = processes[0] = new PostProcess({
            fragmentShader : ContrastBias,
            uniformValues : {
                contrast : 0.0,
                brightness : 0.0
            }
        });
        var blurX = processes[1] = new PostProcess({
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 0.0
            }
        });
        var blurY = processes[2] = new PostProcess({
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 1.0
            }
        });

        this._bloomGenerateProcess = new PostProcessComposite({
            processes : processes
        });
        this._bloomComposite = new PostProcess({
            fragmentShader : BloomComposite,
            uniformValues : {
                glowOnly : false,
                bloomTexture : function() {
                    return that._bloomGenerateProcess.outputTexture;
                }
            }
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            glowOnly : {
                get : function() {
                    return that._bloomComposite.uniformValues.glowOnly;
                },
                set : function(value) {
                    that._bloomComposite.uniformValues.glowOnly = value;
                }
            }
        });

        this._contrastBiasUniformValues = contrastBias.uniformValues;

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

    defineProperties(PostProcessBloomStage.prototype, {
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
        contrastBiasUniformValues : {
            get : function() {
                return this._contrastBiasUniformValues;
            }
        },
        outputTexture : {
            get : function() {
                return this._bloomComposite.outputTexture;
            }
        }
    });

    PostProcessBloomStage.prototype.update = function(context) {
        this._bloomGenerateProcess.update(context);
        this._bloomComposite.update(context);
    };

    PostProcessBloomStage.prototype.clear = function(context) {
        this._bloomGenerateProcess.clear(context);
        this._bloomComposite.clear(context);
    };

    PostProcessBloomStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._bloomGenerateProcess.execute(context, colorTexture, depthTexture);
        this._bloomComposite.execute(context, colorTexture, depthTexture);
    };

    PostProcessBloomStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessBloomStage.prototype.destroy = function() {
        this._bloomGenerateProcess.destroy();
        this._bloomComposite.destroy();
        return destroyObject(this);
    };

    return PostProcessBloomStage;
});
