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
        this._randomTexture = undefined;

        var processes = new Array(3);

        var delta = 1.0;
        var sigma = 2.0;
        var kernelSize = 1.0;

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;

        var that = this;
        var generateProcess = processes[0] = new PostProcess({
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
        this._generatePostProcess = new PostProcessComposite({
            processes : processes
        });

        this._ambientOcclusionComposite = new PostProcess({
            fragmentShader : AmbientOcclusion,
            uniformValues : {
                ambientOcclusionOnly : false,
                ambientOcclusionTexture : function() {
                    return that._generatePostProcess.outputTexture;
                }
            }
        });

        this._uniformValues = {};
        defineProperties(this._uniformValues, {
            ambientOcclusionOnly : {
                get : function() {
                    return that._ambientOcclusionComposite.uniformValues.ambientOcclusionOnly;
                },
                set : function(value) {
                    that._ambientOcclusionComposite.uniformValues.ambientOcclusionOnly = value;
                }
            }
        });

        this._generateUniformValues = {};
        defineProperties(this._generateUniformValues, {
            intensity : {
                get : function() {
                    return generateProcess.uniformValues.intensity;
                },
                set : function(value) {
                    generateProcess.uniformValues.intensity = value;
                }
            },
            bias : {
                get : function() {
                    return generateProcess.uniformValues.bias;
                },
                set : function(value) {
                    generateProcess.uniformValues.bias = value;
                }
            },
            lengthCap : {
                get : function() {
                    return generateProcess.uniformValues.lengthCap;
                },
                set : function(value) {
                    generateProcess.uniformValues.lengthCap = value;
                }
            },
            stepSize : {
                get : function() {
                    return generateProcess.uniformValues.stepSize;
                },
                set : function(value) {
                    generateProcess.uniformValues.stepSize = value;
                }
            },
            frustumLength : {
                get : function() {
                    return generateProcess.uniformValues.frustumLength;
                },
                set : function(value) {
                    generateProcess.uniformValues.frustumLength = value;
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
                return this._ambientOcclusionComposite.outputTexture;
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

        this._generatePostProcess.update(context);
        this._ambientOcclusionComposite.update(context);
    };

    PostProcessAmbientOcclusionStage.prototype.clear = function(context) {
        this._generatePostProcess.clear(context);
        this._ambientOcclusionComposite.clear(context);
    };

    PostProcessAmbientOcclusionStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._generatePostProcess.execute(context, colorTexture, depthTexture);
        this._ambientOcclusionComposite.execute(context, colorTexture, depthTexture);
    };

    PostProcessAmbientOcclusionStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessAmbientOcclusionStage.prototype.destroy = function() {
        this._generatePostProcess.destroy();
        this._ambientOcclusionComposite.destroy();
        this._randomTexture = this._randomTexture && this._randomTexture.destroy();
        return destroyObject(this);
    };

    return PostProcessAmbientOcclusionStage;
});
