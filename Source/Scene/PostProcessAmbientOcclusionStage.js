define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Shaders/PostProcessFilters/AmbientOcclusion',
        '../Shaders/PostProcessFilters/AmbientOcclusionGenerate',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessComposite'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        PixelFormat,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        AmbientOcclusion,
        AmbientOcclusionGenerate,
        GaussianBlur1D,
        PostProcess,
        PostProcessComposite) {
    'use strict';

    /**
     * Post process stage for ambient occlusion. Implements {@link PostProcess}.
     *
     * @alias PostProcessAmbientOcclusionStage
     * @constructor
     *
     * @private
     */
    function PostProcessAmbientOcclusionStage() {
        this._initialTexture = undefined;
        this._randomTexture = undefined;

        var processes = new Array(4);

        var delta = 1.0;
        var sigma = 2.0;
        var kernelSize = 1.0;

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;

        var that = this;
        processes[0] = new PostProcess({
            fragmentShader : AmbientOcclusionGenerate,
            uniformValues : {
                intensity : 4.0,
                bias : 0.0,
                lengthCap : 0.25,
                stepSize : 2.0,
                frustumLength : 1000.0,
                randomTexture : function () {
                    return that._randomTexture;
                }
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
            fragmentShader : AmbientOcclusion,
            uniformValues : {
                ambientOcclusionOnly : false,
                originalColorTexture : function() {
                    return that._initialTexture;
                }
            }
        });

        this._postProcess = new PostProcessComposite({
            processes : processes
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            ambientOcclusionOnly : {
                get : function() {
                    return that._postProcess.processes[3].uniformValues.ambientOcclusionOnly;
                },
                set : function(value) {
                    that._postProcess.processes[3].uniformValues.ambientOcclusionOnly = value;
                }
            }
        });

        this._generateUniformValues = {};
        defineProperties(this._generateUniformValues, {
            intensity : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.intensity;
                },
                set : function(value) {
                    that._postProcess.processes[0].uniformValues.intensity = value;
                }
            },
            bias : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.bias;
                },
                set : function(value) {
                    that._postProcess.processes[0].uniformValues.bias = value;
                }
            },
            lengthCap : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.lengthCap;
                },
                set : function(value) {
                    that._postProcess.processes[0].uniformValues.lengthCap = value;
                }
            },
            stepSize : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.stepSize;
                },
                set : function(value) {
                    that._postProcess.processes[0].uniformValues.stepSize = value;
                }
            },
            frustumLength : {
                get : function() {
                    return that._postProcess.processes[0].uniformValues.frustumLength;
                },
                set : function(value) {
                    that._postProcess.processes[0].uniformValues.frustumLength = value;
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

    defineProperties(PostProcessAmbientOcclusionStage.prototype, {
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },
        generateUniformValues : {
            get : function() {
                return this._generateUniformValues;
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

    PostProcessAmbientOcclusionStage.prototype.update = function(context) {
        if (!defined(this._randomTexture)) {
            var length = 256 * 256 * 3;
            var random = new Uint8Array(length);
            for (var i = 0; i < length; i += 3) {
                random[i] = Math.floor(Math.random() * 255.0);
            }

            this._randomTexture = new Texture({
                context : context,
                pixelFormat : PixelFormat.RGB,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                source : {
                    arrayBufferView : random,
                    width : 256,
                    height : 256
                },
                sampler : new Sampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.NEAREST,
                    magnificationFilter : TextureMagnificationFilter.NEAREST
                })
            });
        }

        this._postProcess.update(context);
    };

    PostProcessAmbientOcclusionStage.prototype.clear = function(context) {
        this._postProcess.clear(context);
    };

    PostProcessAmbientOcclusionStage.prototype._setColorTexture = function(texture) {
        this._initialTexture = texture;
        this._postProcess._setColorTexture(texture);
    };

    PostProcessAmbientOcclusionStage.prototype._setDepthTexture = function(texture) {
        this._postProcess._setDepthTexture(texture);
    };

    PostProcessAmbientOcclusionStage.prototype.execute = function(context) {
        this._postProcess.execute(context);
    };

    PostProcessAmbientOcclusionStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessAmbientOcclusionStage.prototype.destroy = function() {
        this._postProcess.destroy();
        this._randomTexture = this._randomTexture && this._randomTexture.destroy();
        return destroyObject(this);
    };

    return PostProcessAmbientOcclusionStage;
});
