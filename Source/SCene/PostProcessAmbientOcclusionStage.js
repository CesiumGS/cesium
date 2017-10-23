define([
        '../Core/buildModuleUrl',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Shaders/PostProcessFilters/AmbientOcclusion',
        '../Shaders/PostProcessFilters/AmbientOcclusionBlurX',
        '../Shaders/PostProcessFilters/AmbientOcclusionBlurY',
        '../Shaders/PostProcessFilters/AmbientOcclusionGenerate',
        './PostProcess',
        './PostProcessStage'
    ], function(
        buildModuleUrl,
        defined,
        defineProperties,
        destroyObject,
        PixelFormat,
        Framebuffer,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        AmbientOcclusion,
        AmbientOcclusionBlurX,
        AmbientOcclusionBlurY,
        AmbientOcclusionGenerate,
        PostProcess,
        PostProcessStage) {
    'use strict';

    /**
     * Post process stage for ambient occlusion. Implements {@link PostProcessStage}.
     *
     * @alias PostProcessAmbientOcclusionStage
     * @constructor
     *
     * @private
     */
    function PostProcessAmbientOcclusionStage() {
        this._aoTexture = undefined;
        this._aoFramebuffer = undefined;
        this._aoPostProcess = undefined;
        this._randomTexture = undefined;

        this._aoGenerateUniformValues = {
            randomTexture: undefined,
            intensity: 4.0,
            bias: 0.0,
            lenCap: 0.25,
            stepSize: 2.0,
            frustumLength : 1000.0
        };

        this._aoBlurUniformValues = {
            kernelSize : 1.0
        };

        this._fragmentShader = AmbientOcclusion;

        this._uniformValues = {
            aoTexture : undefined,
            aoOnly: false
        };

        /**
         * @inheritdoc PostProcessStage#show
         */
        this.show = false;
    }

    defineProperties(PostProcessAmbientOcclusionStage.prototype, {
        /**
         * @inheritdoc PostProcessStage#ready
         */
        ready : {
            get : function() {
                return true;
            }
        },
        /**
         * @inheritdoc PostProcessStage#uniformValues
         */
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },
        /**
         * @inheritdoc PostProcessStage#fragmentShader
         */
        fragmentShader : {
            get : function() {
                return this._fragmentShader;
            }
        },
        /**
         * @inheritdoc PostProcessStage#uniformValues
         */
        aoGenerateUniformValues : {
            get : function() {
                return this._aoGenerateUniformValues;
            }
        },
        /**
         * @inheritdoc PostProcessStage#uniformValues
         */
        aoBlurUniformValues : {
            get : function() {
                return this._aoBlurUniformValues;
            }
        }

    });

    function createSampler() {
        return new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
    }

    /**
     * @inheritdoc PostProcessStage#execute
     */
    PostProcessAmbientOcclusionStage.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, dirty) {
        if (!this.show) {
            return;
        }

        if (!defined(this._randomTexture)) {
            var length = 256 * 256 * 3;
            var random = new Uint8Array(length);
            for (var i = 0; i < length; i += 3) {
                random[i] = Math.floor(Math.random() * 255.0);
            }

            this._randomTexture = new Texture({
                context : frameState.context,
                pixelFormat : PixelFormat.RGB,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                source : {
                    arrayBufferView : random,
                    width : 256,
                    height : 256
                },
                sampler : createSampler()
            });

            this._aoGenerateUniformValues.randomTexture = this._randomTexture;
        }

        if (dirty) {
            destroyResources(this);
            createResources(this, frameState.context);
        }

        this._aoPostProcess.execute(frameState, inputColorTexture, inputDepthTexture, this._aoFramebuffer);
    };

    function createResources(stage, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;
        var aoTexture = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });
        var aoFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [aoTexture],
            destroyAttachments : false
        });

        var aoGenerateUniformValues = stage._aoGenerateUniformValues;
        var aoBlurUniformValues = stage._aoBlurUniformValues;

        var aoGenerateStage = new PostProcessStage({
            fragmentShader : AmbientOcclusionGenerate,
            uniformValues: aoGenerateUniformValues
        });

        var aoBlurXStage = new PostProcessStage({
            fragmentShader : AmbientOcclusionBlurX,
            uniformValues: aoBlurUniformValues
        });

        var aoBlurYStage = new PostProcessStage({
            fragmentShader : AmbientOcclusionBlurY,
            uniformValues: aoBlurUniformValues
        });

        var aoPostProcess = new PostProcess({
            stages : [aoGenerateStage, aoBlurXStage, aoBlurYStage],
            overwriteInput : false,
            blendOutput : false
        });

        aoGenerateStage.show = true;
        aoBlurXStage.show = true;
        aoBlurYStage.show = true;

        stage._aoTexture = aoTexture;
        stage._aoFramebuffer = aoFramebuffer;
        stage._aoPostProcess = aoPostProcess;
        stage._uniformValues.aoTexture = aoTexture;
    }

    function destroyResources(stage) {
        stage._aoTexture = stage._aoTexture && stage._aoTexture.destroy();
        stage._aoFramebuffer = stage._aoFramebuffer && stage._aoFramebuffer.destroy();
        stage._aoPostProcess = stage._aoPostProcess && stage._aoPostProcess.destroy();
    }

    /**
     * @inheritdoc PostProcessStage#isDestroyed
     */
    PostProcessAmbientOcclusionStage.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc PostProcessStage#destroy
     */
    PostProcessAmbientOcclusionStage.prototype.destroy = function() {
        destroyResources(this);
        this._randomTexture = this._randomTexture && this._randomTexture.destroy();
        return destroyObject(this);
    };

    return PostProcessAmbientOcclusionStage;
});
