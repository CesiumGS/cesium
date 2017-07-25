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
        
        this._dofTexture = undefined;
        this._dofFramebuffer = undefined;
        this._dofPostProcess = undefined;

        this._dofBlurUniformValues = {
            kernelSize : 1.0
        };

        this._uniformValues = {
            dofTexture : undefined,
            focalDistance : 5.0
        };

        this._fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_dofTexture; \n' +
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
            '    } \n' +

            //'    f *= f; \n' +
            '    return clamp(f, 0.0, 1.0); \n' +
            '} \n' +
           
            'void main(void) \n' +
            '{ \n' +           
            '    float depth = texture2D(u_depthTexture, v_textureCoordinates).r; \n' +
            '    vec4 posInCamera = czm_inverseProjection * vec4(ScreenToView(v_textureCoordinates), depth, 1.0); \n' +
            '    posInCamera = posInCamera / posInCamera.w; \n' +
            '    float d = ComputeDepthBlur(-posInCamera.z); \n' +
            '    d = pow(d, 0.5); \n' +
            '    gl_FragColor = mix(texture2D(u_colorTexture, v_textureCoordinates), texture2D(u_dofTexture, v_textureCoordinates),d);\n' +
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
        dofBlurUniformValues : {
            get : function() {
                return this._dofBlurUniformValues;
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

        this._dofPostProcess.execute(frameState, inputColorTexture, inputDepthTexture, this._dofFramebuffer);
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
        var dofTexture = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });
        var dofFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [dofTexture],
            destroyAttachments : false
        });

        var dofBlurUniformValues = stage._dofBlurUniformValues;

        var dofBlurXShader =
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

        var dofBlurYShader =
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

        var dofBlurXStage = new PostProcessStage({
            fragmentShader : dofBlurXShader,
            uniformValues: dofBlurUniformValues
        });

        var dofBlurYStage = new PostProcessStage({
            fragmentShader : dofBlurYShader,
            uniformValues: dofBlurUniformValues
        });

        var dofPostProcess = new PostProcess({
            stages : [dofBlurXStage, dofBlurYStage],
            overwriteInput : false,
            blendOutput : false
        });
       
        dofBlurXStage.show = true;
        dofBlurYStage.show = true;

        stage._dofTexture = dofTexture;
        stage._dofFramebuffer = dofFramebuffer;
        stage._dofPostProcess = dofPostProcess;
        stage._uniformValues.dofTexture = dofTexture;
    }

    function destroyResources(stage) {
        stage._dofTexture = stage._dofTexture && stage._dofTexture.destroy();
        stage._dofFramebuffer = stage._dofFramebuffer && stage._dofFramebuffer.destroy();
        stage._dofPostProcess = stage._dofPostProcess && stage._dofPostProcess.destroy();
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