define([
        '../Core/buildModuleUrl',
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
        '../Shaders/PostProcessFilters/AmbientOcclusionGenerate',
        './PostProcess',
        './PostProcessStage'
    ], function(
        buildModuleUrl,
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

        var urlRandomNoiseTex = buildModuleUrl('Assets/Textures/HBAO/RandomNoiseTex.jpg');

        this._aoGenerateUniformValues = {
            randomTexture: urlRandomNoiseTex,
            intensity: 4.0,
            bias: 0.0,
            lenCap: 0.25,
            stepSize: 2.0
        };

        this._aoBlurUniformValues = {
            kernelSize : 1.0
        };

        this._fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_aoTexture; \n' +
            'uniform bool u_HBAOonly; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 color = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    vec3 ao = texture2D(u_aoTexture, v_textureCoordinates).rgb; \n' +
            '    if(u_HBAOonly) \n' +
            '      gl_FragColor = vec4(ao, 1.0); \n' +
            '    else \n' +
            '      gl_FragColor = vec4(ao * color, 1.0); \n' +
            '} \n';

        this._uniformValues = {
            aoTexture : undefined,
            HBAOonly: false
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

        var aoGenerateUniformValues = stage._aoGenerateUniformValues;
        var aoBlurUniformValues = stage._aoBlurUniformValues;

        var aoBlurXShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform float u_kernelSize; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec4 result = vec4(0.0); \n' +
            '    vec2 recipalScreenSize = u_kernelSize / czm_viewport.zw; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x*4.0, 0.0))*0.00390625; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x*3.0, 0.0))*0.03125; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x*2.0, 0.0))*0.109375; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x, 0.0))*0.21875; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates)*0.2734375; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x, 0.0))*0.21875; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x*2.0, 0.0))*0.109375; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x*3.0, 0.0))*0.03125; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x*4.0, 0.0))*0.00390625; \n' +
            '    gl_FragColor = result; \n' +
            '} \n';

        var aoBlurYShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform float u_kernelSize; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec4 result = vec4(0.0); \n' +
            '    vec2 recipalScreenSize = u_kernelSize / czm_viewport.zw; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y*4.0))*0.00390625; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y*3.0))*0.03125; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y*2.0))*0.109375; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y))*0.21875; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates)*0.2734375; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y))*0.21875; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y*2.0))*0.109375; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y*3.0))*0.03125; \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y*4.0))*0.00390625; \n' +
            '    gl_FragColor = result; \n' +
            '} \n';

        var aoGenerateStage = new PostProcessStage({
            fragmentShader : AmbientOcclusionGenerate,
            uniformValues: aoGenerateUniformValues
        });

        var aoBlurXStage = new PostProcessStage({
            fragmentShader : aoBlurXShader,
            uniformValues: aoBlurUniformValues
        });

        var aoBlurYStage = new PostProcessStage({
            fragmentShader : aoBlurYShader,
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
        return destroyObject(this);
    };

    return PostProcessAmbientOcclusionStage;
});
