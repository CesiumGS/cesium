define([
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
        '../Shaders/PostProcessFilters/DepthOfField',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        './PostProcess',
        './PostProcessStage'
    ], function(
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
        DepthOfField,
        GaussianBlur1D,
        PostProcess,
        PostProcessStage) {
    'use strict';

    /**
     * Post process stage for depth of field. Implements {@link PostProcessStage}.
     *
     * @alias PostProcessDepthOfFieldStage
     * @constructor
     *
     * @private
     */
    function PostProcessDepthOfFieldStage() {
        this._texture = undefined;
        this._framebuffer = undefined;
        this._postProcess = undefined;

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
        this._uniformValues = {
            texture : undefined,
            focalDistance : 5.0
        };

        this._fragmentShader = DepthOfField;

        /**
         * @inheritdoc PostProcessStage#show
         */
        this.show = false;
    }

    defineProperties(PostProcessDepthOfFieldStage.prototype, {
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
        }
    });

    /**
     * @inheritdoc PostProcessStage#execute
     */
    PostProcessDepthOfFieldStage.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, dirty) {
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

        var blurShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;
        var blurXStage = new PostProcessStage({
            fragmentShader : blurShader,
            uniformValues: stage._blurXUniformValues
        });
        var blurYStage = new PostProcessStage({
            fragmentShader : blurShader,
            uniformValues: stage._blurYUniformValues
        });
        var postProcess = new PostProcess({
            stages : [blurXStage, blurYStage],
            overwriteInput : false,
            blendOutput : false
        });

        stage._texture = texture;
        stage._framebuffer = framebuffer;
        stage._postProcess = postProcess;
        stage._uniformValues.texture = texture;
    }

    function destroyResources(stage) {
        stage._texture = stage._texture && stage._texture.destroy();
        stage._framebuffer = stage._framebuffer && stage._framebuffer.destroy();
        stage._postProcess = stage._postProcess && stage._postProcess.destroy();
    }

    /**
     * @inheritdoc PostProcessStage#isDestroyed
     */
    PostProcessDepthOfFieldStage.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc PostProcessStage#destroy
     */
    PostProcessDepthOfFieldStage.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return PostProcessDepthOfFieldStage;
});
