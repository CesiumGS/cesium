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
            kernelSize : 1.0,
            stepSize : 1.0
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
            'uniform float u_stepSize; \n' +
            'precision highp float; \n' +

            'varying vec2 v_textureCoordinates; \n' +

            'void main(void) \n' +
            '{ \n' +

            'float Blur7Coeff[4]; Blur7Coeff[0] = 0.3125; Blur7Coeff[1] = 0.234375; Blur7Coeff[2] = 0.09375; Blur7Coeff[3] = 0.015625; \n' +
            'float Blur9Coeff[5]; Blur9Coeff[0] = 0.2734375; Blur9Coeff[1] = 0.21875; Blur9Coeff[2] = 0.109375; Blur9Coeff[3] = 0.03125; Blur9Coeff[4] = 0.00390625;\n' +
            'float Blur11Coeff[6]; Blur11Coeff[0] = 0.24609375; Blur11Coeff[1] = 0.205078125; Blur11Coeff[2] = 0.1171875; Blur11Coeff[3] = 0.0439453125; Blur11Coeff[4] = 0.009765625; Blur11Coeff[5] = 0.0009765625;\n' +
            'float Blur13Coeff[7]; Blur13Coeff[0] = 0.2255859375; Blur13Coeff[1] = 0.193359375; Blur13Coeff[2] = 0.120849609375; Blur13Coeff[3] = 0.0537109375; Blur13Coeff[4] = 0.01611328125; Blur13Coeff[5] = 0.0029296875; Blur13Coeff[6] = 0.000244140625;\n' +
            'float Blur15Coeff[8]; Blur15Coeff[0] = 0.20947265625; Blur15Coeff[1] = 0.18328857421875; Blur15Coeff[2] = 0.1221923828125; Blur15Coeff[3] = 0.06109619140625; Blur15Coeff[4] = 0.022216796875; Blur15Coeff[5] = 0.00555419921875; Blur15Coeff[6] = 0.0008544921875; Blur15Coeff[7] = 0.00006103515625;\n' +
            'float Blur17Coeff[9]; Blur17Coeff[0] = 0.196380615234375; Blur17Coeff[1] = 0.174560546875; Blur17Coeff[2] = 0.1221923828125; Blur17Coeff[3] = 0.066650390625; Blur17Coeff[4] = 0.02777099609375; Blur17Coeff[5] = 0.008544921875; Blur17Coeff[6] = 0.0018310546875; Blur17Coeff[7] = 0.000244140625; Blur17Coeff[8] = 0.0000152587890625;\n' +
            'float Blur25Coeff[13]; Blur25Coeff[0] = 0.1611802577972412109375; Blur25Coeff[1] = 0.14878177642822265625; Blur25Coeff[2] = 0.116899967193603515625; Blur25Coeff[3] = 0.07793331146240234375; Blur25Coeff[4] = 0.043837487697601318359375; Blur25Coeff[5] = 0.020629405975341796875; Blur25Coeff[6] = 0.0080225467681884765625;\n' +
            'Blur25Coeff[7] = 0.002533435821533203125; Blur25Coeff[8] = 0.00063335895538330078125; Blur25Coeff[9] = 0.000120639801025390625; Blur25Coeff[10] = 0.0000164508819580078125; Blur25Coeff[11] = 0.000001430511474609375; Blur25Coeff[12] = 0.000000059604644775390625;\n' +

            '    vec4 result = vec4(0.0); \n' +
            '    vec2 recipalScreenSize = u_stepSize / czm_viewport.zw; \n' +
            '    if(u_kernelSize < 1.0) \n' +
            '    { \n' +
            '      for(int i=1; i <= 3; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x * float(i), 0.0)) * Blur7Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * float(i), 0.0)) * Blur7Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur7Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 2.0) \n' +
            '    { \n' +
            '      for(int i=1; i <= 4; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x * float(i), 0.0)) * Blur9Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * float(i), 0.0)) * Blur9Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur9Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 3.0) \n' +
            '    { \n' +
            '      for(int i=1; i <= 5; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x * float(i), 0.0)) * Blur11Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * float(i), 0.0)) * Blur11Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur11Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 4.0) \n' +
            '    { \n' +
            '      for(int i=1; i<=6; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x * float(i), 0.0)) * Blur13Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * float(i), 0.0)) * Blur13Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur13Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 5.0) \n' +
            '    { \n' +
            '      for(int i=1; i<=7; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x * float(i), 0.0)) * Blur15Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * float(i), 0.0)) * Blur15Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur15Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 6.0) \n' +
            '    { \n' +
            '      for(int i=1; i<=8; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x * float(i), 0.0)) * Blur17Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * float(i), 0.0)) * Blur17Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur17Coeff[0]; \n' +
            '    } \n' +     
            '    else \n' +
            '    { \n' +
            '      for(int i=1; i<=12; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(recipalScreenSize.x * float(i), 0.0)) * Blur25Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(-recipalScreenSize.x * float(i), 0.0)) * Blur25Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur25Coeff[0]; \n' +
            '    } \n' +      
            '    gl_FragColor = result; \n' +
            '} \n';

        var dofBlurYShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform float u_kernelSize; \n' +
            'uniform float u_stepSize; \n' +
            'varying vec2 v_textureCoordinates; \n' +

            'precision highp float; \n' +

            'void main(void) \n' +
            '{ \n' +
            
            'float Blur7Coeff[4]; Blur7Coeff[0] = 0.3125; Blur7Coeff[1] = 0.234375; Blur7Coeff[2] = 0.09375; Blur7Coeff[3] = 0.015625; \n' +
            'float Blur9Coeff[5]; Blur9Coeff[0] = 0.2734375; Blur9Coeff[1] = 0.21875; Blur9Coeff[2] = 0.109375; Blur9Coeff[3] = 0.03125; Blur9Coeff[4] = 0.00390625;\n' +
            'float Blur11Coeff[6]; Blur11Coeff[0] = 0.24609375; Blur11Coeff[1] = 0.205078125; Blur11Coeff[2] = 0.1171875; Blur11Coeff[3] = 0.0439453125; Blur11Coeff[4] = 0.009765625; Blur11Coeff[5] = 0.0009765625;\n' +
            'float Blur13Coeff[7]; Blur13Coeff[0] = 0.2255859375; Blur13Coeff[1] = 0.193359375; Blur13Coeff[2] = 0.120849609375; Blur13Coeff[3] = 0.0537109375; Blur13Coeff[4] = 0.01611328125; Blur13Coeff[5] = 0.0029296875; Blur13Coeff[6] = 0.000244140625;\n' +
            'float Blur15Coeff[8]; Blur15Coeff[0] = 0.20947265625; Blur15Coeff[1] = 0.18328857421875; Blur15Coeff[2] = 0.1221923828125; Blur15Coeff[3] = 0.06109619140625; Blur15Coeff[4] = 0.022216796875; Blur15Coeff[5] = 0.00555419921875; Blur15Coeff[6] = 0.0008544921875; Blur15Coeff[7] = 0.00006103515625;\n' +
            'float Blur17Coeff[9]; Blur17Coeff[0] = 0.196380615234375; Blur17Coeff[1] = 0.174560546875; Blur17Coeff[2] = 0.1221923828125; Blur17Coeff[3] = 0.066650390625; Blur17Coeff[4] = 0.02777099609375; Blur17Coeff[5] = 0.008544921875; Blur17Coeff[6] = 0.0018310546875; Blur17Coeff[7] = 0.000244140625; Blur17Coeff[8] = 0.0000152587890625;\n' +
            'float Blur25Coeff[13]; Blur25Coeff[0] = 0.1611802577972412109375; Blur25Coeff[1] = 0.14878177642822265625; Blur25Coeff[2] = 0.116899967193603515625; Blur25Coeff[3] = 0.07793331146240234375; Blur25Coeff[4] = 0.043837487697601318359375; Blur25Coeff[5] = 0.020629405975341796875; Blur25Coeff[6] = 0.0080225467681884765625;\n' +
            'Blur25Coeff[7] = 0.002533435821533203125; Blur25Coeff[8] = 0.00063335895538330078125; Blur25Coeff[9] = 0.000120639801025390625; Blur25Coeff[10] = 0.0000164508819580078125; Blur25Coeff[11] = 0.000001430511474609375; Blur25Coeff[12] = 0.000000059604644775390625;\n' +

            '    vec4 result = vec4(0.0); \n' +
            '    vec2 recipalScreenSize = u_stepSize / czm_viewport.zw; \n' +
            '    if(u_kernelSize < 1.0) \n' +
            '    { \n' +
            '      for(int i=1; i <= 3; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y * float(i))) * Blur7Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y * float(i))) * Blur7Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur7Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 2.0) \n' +
            '    { \n' +
            '      for(int i=1; i <= 4; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y * float(i))) * Blur9Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y * float(i))) * Blur9Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur9Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 3.0) \n' +
            '    { \n' +
            '      for(int i=1; i <= 5; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y * float(i))) * Blur11Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y * float(i))) * Blur11Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur11Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 4.0) \n' +
            '    { \n' +
            '      for(int i=1; i<=6; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y * float(i))) * Blur13Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y * float(i))) * Blur13Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur13Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 5.0) \n' +
            '    { \n' +
            '      for(int i=1; i<=7; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y * float(i))) * Blur15Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y * float(i))) * Blur15Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur15Coeff[0]; \n' +
            '    } \n' +
            '    else if(u_kernelSize < 6.0) \n' +
            '    { \n' +
            '      for(int i=1; i<=8; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y * float(i))) * Blur17Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y * float(i))) * Blur17Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur17Coeff[0]; \n' +
            '    } \n' +        
            '    else \n' +
            '    { \n' +
            '      for(int i=1; i<=12; i++) \n' +
            '      { \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, recipalScreenSize.y * float(i))) * Blur25Coeff[i]; \n' +
            '         result += texture2D(u_colorTexture, v_textureCoordinates + vec2(0.0, -recipalScreenSize.y * float(i))) * Blur25Coeff[i]; \n' +
            '      } \n' +
            '      result += texture2D(u_colorTexture, v_textureCoordinates) * Blur25Coeff[0]; \n' +
            '    } \n' +      
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