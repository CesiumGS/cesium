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

        this._fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_texture; \n' +
            'uniform sampler2D u_depthTexture; \n' +
            'uniform float u_focalDistance; \n' +
            'varying vec2 v_textureCoordinates; \n' +

            'vec2 ScreenToView(vec2 uv) \n' +
            '{ \n' +
            '   return vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y)*2.0 - 1.0)) ; \n' +
            '} \n' +

            'float ComputeDepthBlur(float depth) \n' +
            '{ \n' +
            '    float f; \n' +
            '    if (depth < u_focalDistance) \n' +
            '    { \n' +
            '        f = (u_focalDistance - depth) / (u_focalDistance - czm_currentFrustum.x); \n' +
            '    } \n' +
            '    else \n' +
            '    { \n' +
            '        f = (depth - u_focalDistance) / (czm_currentFrustum.y - u_focalDistance); \n' +
            '        f = pow(f, 0.1); \n' +
            '    } \n' +
            '    f *= f; \n' +
            '    return clamp(f, 0.0, 1.0); \n' +
            '} \n' +

            'void main(void) \n' +
            '{ \n' +
            '    float depth = texture2D(u_depthTexture, v_textureCoordinates).r; \n' +
            '    vec4 posInCamera = czm_inverseProjection * vec4(ScreenToView(v_textureCoordinates), depth, 1.0); \n' +
            '    posInCamera = posInCamera / posInCamera.w; \n' +
            '    float d = ComputeDepthBlur(-posInCamera.z); \n' +
            '    d = pow(d, 0.5); \n' +
            '    gl_FragColor = mix(texture2D(u_colorTexture, v_textureCoordinates), texture2D(u_texture, v_textureCoordinates),d);\n' +
            '} \n';

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
