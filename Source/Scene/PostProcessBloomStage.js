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
        var processes = new Array(4);

        var delta = 1.0;
        var sigma = 2.0;
        var kernelSize = 1.0;

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;

        var that = this;
        processes[0] = new PostProcess({
            fragmentShader : ContrastBias,
            uniformValues : {
                contrast : 0.0,
                brightness : 0.0
            }
        });
        processes[1] = new PostProcess({
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 0.0
            }
        });
        processes[2] = new PostProcess({
            fragmentShader : blurShader,
            uniformValues: {
                delta : delta,
                sigma : sigma,
                kernelSize : kernelSize,
                direction : 1.0
            }
        });
        processes[3] = new PostProcess({
            fragmentShader : BloomComposite,
            uniformValues : {
                glowOnly : false,
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
            glowOnly : {
                get : function() {
                    return that._postProcess.processes[3].uniformValues.glowOnly;
                },
                set : function(value) {
                    that._postProcess.processes[3].uniformValues.glowOnly = value;
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
                    var blurXUniforms = that._postProcess.processes[1].uniformValues;
                    var blurYUniforms = that._postProcess.processes[2].uniformValues;
                    blurXUniforms.delta = blurYUniforms.delta = value;
                }
            },
            sigma : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.sigma;
                },
                set : function(value) {
                    var blurXUniforms = that._postProcess.processes[1].uniformValues;
                    var blurYUniforms = that._postProcess.processes[2].uniformValues;
                    blurXUniforms.sigma = blurYUniforms.sigma = value;
                }
            },
            kernelSize : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.kernelSize;
                },
                set : function(value) {
                    var blurXUniforms = that._postProcess.processes[1].uniformValues;
                    var blurYUniforms = that._postProcess.processes[2].uniformValues;
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
                return this._postProcess.processes[0].uniformValues;
            }
        },
        outputTexture : {
            get : function() {
                return this._postProcess.outputTexture;
            }
        }
    });

    PostProcessBloomStage.prototype.update = function(context) {
        this._postProcess.update(context);
    };

    PostProcessBloomStage.prototype.clear = function(context) {
        this._postProcess.clear(context);
    };

    PostProcessBloomStage.prototype._setColorTexture = function(texture) {
        this._initialTexture = texture;
        this._postProcess._setColorTexture(texture);
    };

    PostProcessBloomStage.prototype._setDepthTexture = function(texture) {
        this._postProcess._setDepthTexture(texture);
    };

    PostProcessBloomStage.prototype.execute = function(context) {
        this._postProcess.execute(context);
    };

    PostProcessBloomStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessBloomStage.prototype.destroy = function() {
        this._postProcess.destroy();
        return destroyObject(this);
    };

    return PostProcessBloomStage;
});
