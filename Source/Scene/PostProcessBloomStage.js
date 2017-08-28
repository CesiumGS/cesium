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
        this._bloomPostProcess = undefined;

        this._bloomBlurUniformValues = {
            kernelSize : 1.0,
            stepSize : 1.0
        };

        this._bloomContrastBiasUniformValues = {
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
        this.show = true;

        this._fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_bloomTexture; \n' +        
            'uniform bool  u_glowOnly; \n' +             
            'varying vec2 v_textureCoordinates; \n' +
           
            'void main(void) \n' +
            '{ \n' + 
            '    if(u_glowOnly) \n' +
            '     gl_FragColor = texture2D(u_bloomTexture, v_textureCoordinates);\n' +
            '    else \n' +
            '     gl_FragColor = texture2D(u_bloomTexture, v_textureCoordinates) + texture2D(u_colorTexture, v_textureCoordinates);\n' +
            '} \n';
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
        bloomBlurUniformValues : {
            get : function() {
                return this._bloomBlurUniformValues;
            }
        },
        /**
         * @inheritdoc PostProcessStage#uniformValues
         */
        bloomContrastBiasUniformValues : {
            get : function() {
                return this._bloomContrastBiasUniformValues;
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
            createResources(this);
        }

        this._bloomPostProcess.execute(frameState, inputColorTexture, inputDepthTexture, undefined);
        this._uniformValues.bloomTexture = this._bloomPostProcess.outputColorTexture;
    };

    function createResources(stage, context) {
        var bloomBlurUniformValues = stage._bloomBlurUniformValues;
        var bloomContrastBiasUniformValues = stage._bloomContrastBiasUniformValues;

        var contrastBiasShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform float u_contrast; \n' +
            'uniform float u_brightness; \n' +           
            'varying vec2 v_textureCoordinates; \n' +

            //https://www.laurivan.com/rgb-to-hsv-to-rgb-for-shaders/
            'vec3 rgb2hsv(vec3 c) \n' +
            '{ \n' +
            '    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0); \n' +
            '    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); \n' +
            '    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); \n' +
 
            '    float d = q.x - min(q.w, q.y); \n' +
            '    float e = 1.0e-10; \n' +
            '    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x); \n' +
            '} \n' +

            'vec3 hsv2rgb(vec3 c) \n' +
            '{ \n' +
            '    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0); \n' +
            '    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); \n' +
            '    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y); \n' +
            '} \n' +

            'void main(void) \n' +
            '{ \n' +           
            '    vec3 sceneColor = texture2D(u_colorTexture, v_textureCoordinates).xyz; \n' +
            '    sceneColor = rgb2hsv(sceneColor); \n' +
            '    sceneColor.z += u_brightness; \n' +
            '    sceneColor = hsv2rgb(sceneColor); \n' +
            '    float factor = (259.0 * (u_contrast + 255.0)) / (255.0*(259.0 - u_contrast)); \n' +
            '    sceneColor = factor * (sceneColor - vec3(0.5)) + vec3(0.5); \n' +
            '    gl_FragColor = vec4(sceneColor, 1.0);\n' +
            '} \n';

        var bloomBlurXShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform float u_kernelSize; \n' +
            'uniform float u_stepSize; \n' +

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

        var bloomBlurYShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform float u_kernelSize; \n' +
            'uniform float u_stepSize; \n' +
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
           
        var contrastBiasStage = new PostProcessStage({
            fragmentShader : contrastBiasShader,
            uniformValues: bloomContrastBiasUniformValues
        });

        var bloomBlurXStage = new PostProcessStage({
            fragmentShader : bloomBlurXShader,
            uniformValues: bloomBlurUniformValues
        });

        var bloomBlurYStage = new PostProcessStage({
            fragmentShader : bloomBlurYShader,
            uniformValues: bloomBlurUniformValues
        });

        var bloomPostProcess = new PostProcess({
            stages : [contrastBiasStage, bloomBlurXStage, bloomBlurYStage],
            overwriteInput : false,
            blendOutput : false,
            createOutputFramebuffer : true
        });
       
       stage._bloomPostProcess = bloomPostProcess;
    }

    function destroyResources(stage) {
        stage._bloomPostProcess = stage._bloomPostProcess && stage._bloomPostProcess.destroy();
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
