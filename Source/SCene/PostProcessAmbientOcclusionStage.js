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
        this._fragmentShader = undefined;
        this._uniformValues = undefined;

        this._aoTexture = undefined;
        this._aoFramebuffer = undefined;
        this._aoPostProcess = undefined;

        this._fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_aoTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 color = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    vec3 ao = texture2D(u_aoTexture, v_textureCoordinates).rgb; \n' +
            '    gl_FragColor = vec4(color * ao, 1.0); \n' +
            '} \n';

        this._uniformValues = {
            aoTexture : undefined
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
        }
    });

    /**
     * @inheritdoc PostProcessStage#execute
     */
    PostProcessAmbientOcclusionStage.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, dirty) {
        if (!this.show) {
            return;
        }

        if (dirty) {
            destroyResources(this);
            createResources(this, frameState.context);
        }

        this._aoPostProcess.execute(frameState, inputColorTexture, inputDepthTexture, this._aoFramebuffer);
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

        var aoGenerateShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 color = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    gl_FragColor = vec4(vec3(czm_luminance(color)), 1.0); \n' +
            '} \n';
        var aoBlurXShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 color = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    gl_FragColor = vec4(color * 0.5, 1.0); \n' +
            '} \n';
        var aoBlurYShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 color = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    gl_FragColor = vec4(color * 0.9, 1.0); \n' +
            '} \n';

        var aoGenerateStage = new PostProcessStage({
            fragmentShader : aoGenerateShader
        });

        var aoBlurXStage = new PostProcessStage({
            fragmentShader : aoBlurXShader
        });

        var aoBlurYStage = new PostProcessStage({
            fragmentShader : aoBlurYShader
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
        return destroyObject(this);
    };

    return PostProcessAmbientOcclusionStage;
});
