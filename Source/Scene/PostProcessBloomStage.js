define([
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Core/buildModuleUrl',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Shaders/PostProcessFilters/BloomComposite',
        '../Shaders/PostProcessFilters/ContrastBias',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessStage'
    ], function(
        defineProperties,
        destroyObject,
        PixelFormat,
        buildModuleUrl,
        Framebuffer,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        BloomComposite,
        ContrastBias,
        GaussianBlur1D,
        PostProcess,
        PostProcessStage) {
    'use strict';

    /**
     * Post process stage for bloom. Implements {@link PostProcessStage}.
     *
     * @alias PostProcessBloomStage
     * @constructor
     *
     * @private
     */
    function PostProcessBloomStage() {
        this._texture = undefined;
        this._framebuffer = undefined;
        this._postProcess = undefined;

        this._fragmentShader = BloomComposite;

        this._blurXUniformValues = {
            delta : 1.0,
            sigma : 2.0,
            direction : 0.0,
            kernelSize : 1.0
        };
        this._blurYUniformValues = {
            delta : 1.0,
            sigma : 2.0,
            direction : 1.0,
            kernelSize : 1.0
        };
        this._contrastBiasUniformValues = {
            contrast : 0.0,
            brightness : 0.0
        };
        this._uniformValues = {
            bloomTexture : undefined,
            glowOnly : false
        };

        /**
         * @inheritdoc PostProcessStage#show
         */
        this.show = false;
    }

    defineProperties(PostProcessBloomStage.prototype, {
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
        blurXUniformValues : {
            get : function() {
                return this._blurXUniformValues;
            }
        },
        /**
         * @inheritdoc PostProcessStage#uniformValues
         */
        blurYUniformValues : {
            get : function() {
                return this._blurYUniformValues;
            }
        },
        /**
         * @inheritdoc PostProcessStage#uniformValues
         */
        contrastBiasUniformValues : {
            get : function() {
                return this._contrastBiasUniformValues;
            }
        }

    });

    /**
     * @inheritdoc PostProcessStage#execute
     */
    PostProcessBloomStage.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, dirty) {
        if (!this.show) {
            return;
        }

        if (dirty) {
            destroyResources(this);
            createResources(this, frameState.context);
        }

        this._postProcess.execute(frameState, inputColorTexture, inputDepthTexture, this._framebuffer);
    };

    function createSampler() {
        return new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
    }

    function createResources(stage, context) {
        var texture = new Texture({
            context : context,
            width : context.drawingBufferWidth,
            height : context.drawingBufferHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });
        var framebuffer = new Framebuffer({
            context : context,
            colorTextures : [texture],
            destroyAttachments : false
        });

        var blurFragmentShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;

        var contrastBiasStage = new PostProcessStage({
            fragmentShader : ContrastBias,
            uniformValues : stage._contrastBiasUniformValues
        });
        var blurXStage = new PostProcessStage({
            fragmentShader : blurFragmentShader,
            uniformValues: stage._blurXUniformValues
        });
        var blurYStage = new PostProcessStage({
            fragmentShader : blurFragmentShader,
            uniformValues: stage._blurYUniformValues
        });

        var postProcess = new PostProcess({
            stages : [contrastBiasStage, blurXStage, blurYStage],
            overwriteInput : false,
            blendOutput : false
        });

        stage._texture = texture;
        stage._framebuffer = framebuffer;
        stage._postProcess = postProcess;
        stage._uniformValues.bloomTexture = texture;
    }

    function destroyResources(stage) {
        stage._texture = stage._texture && stage._texture.destroy();
        stage._framebuffer = stage._framebuffer && stage._framebuffer.destroy();
        stage._postProcess = stage._postProcess && stage._postProcess.destroy();
    }

    /**
     * @inheritdoc PostProcessStage#isDestroyed
     */
    PostProcessBloomStage.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc PostProcessStage#destroy
     */
    PostProcessBloomStage.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return PostProcessBloomStage;
});
