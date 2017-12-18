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
        './PostProcess',
        './PostProcessBlurStage'
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
        PostProcess,
        PostProcessBlurStage) {
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

        var that = this;
        this._generatePostProcess = new PostProcess({
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

        this._blurPostProcess = new PostProcessBlurStage();

        this._ambientOcclusionComposite = new PostProcess({
            fragmentShader : AmbientOcclusion,
            uniformValues : {
                ambientOcclusionOnly : false,
                ambientOcclusionTexture : function() {
                    return that._blurPostProcess.outputTexture;
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
    }

    defineProperties(PostProcessAmbientOcclusionStage.prototype, {
        ready : {
            get : function() {
                return this._generatePostProcess.ready && this._blurPostProcess.ready && this._ambientOcclusionComposite.ready;
            }
        },
        enabled : {
            get : function() {
                return this._generatePostProcess.enabled;
            },
            set : function(value) {
                this._generatePostProcess.enabled = this._blurPostProcess.enabled = this._ambientOcclusionComposite.enabled = value;
            }
        },
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },
        generateUniformValues : {
            get : function() {
                return this._generatePostProcess.uniformValues;
            }
        },
        blurUniformValues : {
            get : function() {
                return this._blurPostProcess.uniformValues;
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
        this._blurPostProcess.update(context);
        this._ambientOcclusionComposite.update(context);
    };

    PostProcessAmbientOcclusionStage.prototype.clear = function(context) {
        this._generatePostProcess.clear(context);
        this._blurPostProcess.clear(context);
        this._ambientOcclusionComposite.clear(context);
    };

    PostProcessAmbientOcclusionStage.prototype.execute = function(context, colorTexture, depthTexture) {
        this._generatePostProcess.execute(context, colorTexture, depthTexture);
        this._blurPostProcess.execute(context, this._generatePostProcess.outputTexture, depthTexture);
        this._ambientOcclusionComposite.execute(context, colorTexture, depthTexture);
    };

    PostProcessAmbientOcclusionStage.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessAmbientOcclusionStage.prototype.destroy = function() {
        this._generatePostProcess.destroy();
        this._blurPostProcess.destroy();
        this._ambientOcclusionComposite.destroy();
        this._randomTexture = this._randomTexture && this._randomTexture.destroy();
        return destroyObject(this);
    };

    return PostProcessAmbientOcclusionStage;
});
