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
        '../Shaders/PostProcessFilters/AmbientOcclusionGenerate',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
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
        AmbientOcclusionGenerate,
        GaussianBlur1D,
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
        this._postProcess = undefined;
        this._randomTexture = undefined;

        this._generateUniformValues = {
            randomTexture: undefined,
            intensity: 4.0,
            bias: 0.0,
            lenCap: 0.25,
            stepSize: 2.0,
            frustumLength : 1000.0
        };
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

        this._fragmentShader = AmbientOcclusion;

        this._uniformValues = {
            aoTexture : undefined,
            aoOnly: false
        };

        /**
         * @inheritdoc PostProcessStage#show
         */
        this.show = true;
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
        generateUniformValues : {
            get : function() {
                return this._generateUniformValues;
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
                sampler : new Sampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.NEAREST,
                    magnificationFilter : TextureMagnificationFilter.NEAREST
                })
            });

            this._generateUniformValues.randomTexture = this._randomTexture;
        }

        if (dirty) {
            destroyResources(this);
            createResources(this);
        }

        this._postProcess.execute(frameState, inputColorTexture, inputDepthTexture, undefined);
        this._uniformValues.aoTexture = this._postProcess.outputColorTexture;
    };

    function createResources(stage) {
        var blurFragmentShader = '#define USE_KERNEL_SIZE\n' + GaussianBlur1D;

        var generateStage = new PostProcessStage({
            fragmentShader : AmbientOcclusionGenerate,
            uniformValues: stage._generateUniformValues
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
            stages : [generateStage, blurXStage, blurYStage],
            overwriteInput : false,
            blendOutput : false,
            createOutputFramebuffer : true
        });

        stage._postProcess = postProcess;
    }

    function destroyResources(stage) {
        stage._postProcess = stage._postProcess && stage._postProcess.destroy();
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
