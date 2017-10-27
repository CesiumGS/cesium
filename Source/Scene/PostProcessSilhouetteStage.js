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
        '../Shaders/PostProcessFilters/Silhouette',
        '../Shaders/PostProcessFilters/SilhouetteComposite',
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
        Silhouette,
        SilhouetteComposite,
        PostProcess,
        PostProcessStage) {
    'use strict';

    /**
     * Post process stage for a silhouette. Implements {@link PostProcessStage}.
     *
     * @alias PostProcessSilhouetteStage
     * @constructor
     *
     * @private
     */
    function PostProcessSilhouetteStage() {
        this._texture = undefined;
        this._framebuffer = undefined;
        this._postProcess = undefined;

        this._edgeDetectionUniformValues = {
            length : 0.5,
            color : Color.clone(Color.BLACK)
        };
        this._silhouetteUniformValues = {};
        this._uniformValues = {
            silhouetteTexture : undefined
        };

        /**
         * @inheritdoc PostProcessStage#show
         */
        this.show = false;

        this._fragmentShader = SilhouetteComposite;
    }

    defineProperties(PostProcessSilhouetteStage.prototype, {
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
        silhouetteUniformValues : {
            get : function() {
                return this._silhouetteUniformValues;
            }
        }

    });

    /**
     * @inheritdoc PostProcessStage#execute
     */
    PostProcessSilhouetteStage.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, dirty) {
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

        var silhouetteStage = new PostProcessStage({
            fragmentShader : Silhouette,
            uniformValues: stage._silhouetteUniformValues
        });
        var edgeDetectionStage = new PostProcessStage({
            fragmentShader : EdgeDetection,
            uniformValues: stage._edgeDetectionUniformValues
        });
        var postProcess = new PostProcess({
            stages : [silhouetteStage, edgeDetectionStage],
            overwriteInput : false,
            blendOutput : false
        });

        stage._texture = texture;
        stage._framebuffer = framebuffer;
        stage._postProcess = postProcess;
        stage._uniformValues.silhouetteTexture = texture;
    }

    function destroyResources(stage) {
        stage._texture = stage._texture && stage._texture.destroy();
        stage._framebuffer = stage._framebuffer && stage._framebuffer.destroy();
        stage._postProcess = stage._postProcess && stage._postProcess.destroy();
    }

    /**
     * @inheritdoc PostProcessStage#isDestroyed
     */
    PostProcessSilhouetteStage.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc PostProcessStage#destroy
     */
    PostProcessSilhouetteStage.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return PostProcessSilhouetteStage;
});
