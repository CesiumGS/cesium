define([
        '../Core/Color',
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
        '../Shaders/PostProcessFilters/EdgeDetection',
        '../Shaders/PostProcessFilters/Toon',
        '../Shaders/PostProcessFilters/ToonComposite',
        './PostProcess',
        './PostProcessStage'
    ], function(
        Color,
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
        EdgeDetection,
        Toon,
        ToonComposite,
        PostProcess,
        PostProcessStage) {
    'use strict';

    /**
     * Post process stage for Toon. Implements {@link PostProcessStage}.
     *
     * @alias PostProcessToonStage
     * @constructor
     *
     * @private
     */
    function PostProcessToonStage() {
        this._toonTexture = undefined;
        this._toonFramebuffer = undefined;
        this._toonPostProcess = undefined;

        this._edgeDetectionUniformValues = {
            len : 0.1,
            color : Color.clone(Color.BLACK)
        };
        this._toonUniformValues = {};
        this._uniformValues = {
            toonTexture : undefined
        };

        /**
         * @inheritdoc PostProcessStage#show
         */
        this.show = false;

        this._fragmentShader = ToonComposite;
    }

    defineProperties(PostProcessToonStage.prototype, {
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
        edgeDetectionUniformValues : {
            get : function() {
                return this._edgeDetectionUniformValues;
            }
        },
        /**
         * @inheritdoc PostProcessStage#uniformValues
         */
        toonUniformValues : {
            get : function() {
                return this._toonUniformValues;
            }
        }

    });

    /**
     * @inheritdoc PostProcessStage#execute
     */
    PostProcessToonStage.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, dirty) {
        if (!this.show) {
            return;
        }

        if (dirty) {
            destroyResources(this);
            createResources(this, frameState.context);
        }

        this._toonPostProcess.execute(frameState, inputColorTexture, inputDepthTexture, this._toonFramebuffer);
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
        var toonTexture = new Texture({
            context : context,
            width : context.drawingBufferWidth,
            height : context.drawingBufferHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });
        var toonFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [toonTexture],
            destroyAttachments : false
        });

        var edgeDetectionUniformValues = stage._edgeDetectionUniformValues;

        var toonUniformValues = stage._toonUniformValues;

        var toonStage = new PostProcessStage({
            fragmentShader : Toon,
            uniformValues: toonUniformValues
        });
        var edgeDetectionStage = new PostProcessStage({
            fragmentShader : EdgeDetection,
            uniformValues: edgeDetectionUniformValues
        });
        var toonPostProcess = new PostProcess({
            stages : [toonStage, edgeDetectionStage],
            overwriteInput : false,
            blendOutput : false
        });

        stage._toonTexture = toonTexture;
        stage._toonFramebuffer = toonFramebuffer;
        stage._toonPostProcess = toonPostProcess;
        stage._uniformValues.toonTexture = toonTexture;
    }

    function destroyResources(stage) {
        stage._toonTexture = stage._toonTexture && stage._toonTexture.destroy();
        stage._toonFramebuffer = stage._toonFramebuffer && stage._toonFramebuffer.destroy();
        stage._toonPostProcess = stage._toonPostProcess && stage._toonPostProcess.destroy();
    }

    /**
     * @inheritdoc PostProcessStage#isDestroyed
     */
    PostProcessToonStage.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc PostProcessStage#destroy
     */
    PostProcessToonStage.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return PostProcessToonStage;
});
