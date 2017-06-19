/*global define*/
define([
        '../Core/buildModuleUrl',
        '../Core/Check',
        '../Core/destroyObject',
        './PostProcessor',
        './PostProcessorCompositeStage',
        './PostProcessorStage'
], function(
        buildModuleUrl,
        Check,
        destroyObject,
        PostProcessor,
        PostProcessorCompositeStage,
        PostProcessorStage) {
    'use strict';

    /**
     * @private
     */
    function PostProcessorScene() {
        this.blackAndWhiteStage = createBlackAndWhiteStage();
        this.brightnessStage = createBrightnessStage();
        this.eightBitStage = createEightBitStage();
        this.compositeTextureStage = createCompositeTextureStage();
        this.compositeTextureStage.show = false;
        this.LensFlareStage = createLensFlareStage();

        var stages = [
            this.blackAndWhiteStage,
            this.brightnessStage,
            this.eightBitStage,
            this.compositeTextureStage,
            this.LensFlareStage
        ];

        this._postProcessor = new PostProcessor({
            stages : stages
        });
    }

    function createLensFlareStage() {
        var url_Dirt = buildModuleUrl('Assets/Textures/LensFlare/DirtMaskTextureExample.png');
        var url_Star = buildModuleUrl('Assets/Textures/LensFlare/StarBurst.png');

        var uniformValues = {

            DirtTexture: url_Dirt,
            StarTexture: url_Star,

            Intensity: 2.0,

            Distortion: 5.0,
            NumofGhosts: 4,
            GhostDispersal: 0.4,

            HaloWidth: 0.4,

            EarthRadius: 0.0
        };

        var LensFlareShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_DirtTexture; \n' +
            'uniform sampler2D u_StarTexture; \n' +

            'uniform float u_Distortion; \n' +
            'uniform float u_GhostDispersal; \n' +
            'uniform float u_HaloWidth; \n' +
            'uniform float u_EarthRadius; \n' +

            'uniform float u_Intensity; \n' +

            'varying vec2 v_textureCoordinates; \n' +

            //return ndc from world coordinate biased EarthRadius
            'vec4 GetNDCFromWC(in vec3 WC, in float EarthRadius) \n' +
            '{ \n' +
            ' vec4 position = vec4(WC, 1.0); \n' +
            ' vec4 positionEC = czm_view * position; \n' +
            ' positionEC = vec4(positionEC.x + EarthRadius , positionEC.y, positionEC.z, 1.0); \n' +
            ' vec4 positionWC = czm_eyeToWindowCoordinates(positionEC); \n' +
            ' return czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0); \n' +
            '} \n' +

            //Check if current pixel is included Earth
            //if then mask it gradually
            'float IsinEarth(in vec2 texcoord, in vec2 SceneSize) \n' +
            '{ \n' +

                'vec2 NDC = texcoord * 2.0 - 1.0; \n' +
                'vec4 EarthPosSC = GetNDCFromWC(vec3(0.0,0.0,0.0), 0.0); \n' +
                'vec4 EarthPosSC2 = GetNDCFromWC(vec3( 0.0,0.0,0.0), u_EarthRadius *1.5); \n' +

                'NDC.xy -= EarthPosSC.xy; \n' +
                'float X =  abs(NDC.x)*SceneSize.x;   \n' +
                'X *= X;                            \n' +
                'float Y =  abs(NDC.y)*SceneSize.y;   \n' +
                'Y *= Y;                            \n' +

                'return clamp(0.0, 1.0, max( sqrt(X + Y) / max(abs(EarthPosSC2.x*SceneSize.x), 1.0) - 0.8 , 0.0)); \n' +

            '} \n' +


            //For Chromatic effect
            'vec4 textureDistorted( \n' +
            '    in sampler2D tex, \n' +
            '    in vec2 texcoord, \n' +
            '    in vec2 direction, \n' +
            '    in vec3 distortion, \n' +
            '    in bool bSpace \n' +
           ' ) {                    \n' +

           ' vec2 SceneSize = czm_viewport.zw; \n' +

            'float red = 0.0; \n' +
            'float green = 0.0; \n' +
            'float blue = 0.0; \n' +
            'if(bSpace) \n' +
            '{ \n' +
                'red = IsinEarth(texcoord  + direction * distortion.r, SceneSize) * texture2D(tex, texcoord + direction * distortion.r).r; \n' +
                'green = IsinEarth(texcoord + direction * distortion.g, SceneSize) *  texture2D(tex, texcoord + direction * distortion.g).g; \n' +
                'blue = IsinEarth(texcoord  + direction * distortion.b, SceneSize) * texture2D(tex, texcoord + direction * distortion.b).b; \n' +
            '} \n' +
            'else \n' +
            '{ \n' +
                'red = texture2D(tex, texcoord + direction * distortion.r).r; \n' +
                'green = texture2D(tex, texcoord + direction * distortion.g).g; \n' +
                'blue = texture2D(tex, texcoord + direction * distortion.b).b; \n' +
            '} \n' +



            'return vec4(clamp(red, 0.0, 1.0), clamp(green, 0.0, 1.0), clamp(blue, 0.0, 1.0), 0.0); \n' +

            '}   \n' +



            'void main(void) \n' +
            '{ \n' +
            '    vec3 rgb = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +


            'bool bSpace = true; \n' +

            //whether it is in space or not
            'if(length(czm_viewerPositionWC.xyz) < 6500000.0) \n' +
            '   bSpace = false; \n' +

            //Sun position
            'vec4 position; \n' +
            'if (czm_morphTime == 1.0) \n' +
            '{                         \n' +
            '    position = vec4(czm_sunPositionWC, 1.0);   \n' +
            '}                                              \n' +
            'else \n' +
            '{ \n' +
            '    position = vec4(czm_sunPositionColumbusView.zxy, 1.0); \n' +
            '} \n' +

            'vec4 positionEC = czm_view * position; \n' +
            'vec4 positionWC = czm_eyeToWindowCoordinates(positionEC); \n' +


            'vec4 lastPosition = czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0); \n' +
            'vec2 texcoord = -v_textureCoordinates + vec2(1.0);   \n' +

            'vec2 texelSize = 1.0 / czm_viewport.zw;    \n' +
            'vec3 distortion = vec3(-texelSize.x * u_Distortion, 0.0, texelSize.x * u_Distortion);    \n' +

            // ghost vector to image centre:
            'vec2 ghostVec = (vec2(0.5) - texcoord) * u_GhostDispersal;  \n' +
            'vec3 direction = normalize(vec3(ghostVec, 0.0));  \n' +

            // sample ghosts:  
           ' vec4 result = vec4(0.0);  \n' +
           ' vec4 ghost = vec4(0.0);  \n' +
           ' for (int i = 0; i < 4; ++i) {  \n' +
           '     vec2 offset = fract(texcoord + ghostVec * float(i));  \n' +

                //Only bright spots from the centre of the source image
           '     float weight = length(vec2(0.5) - offset) / length(vec2(0.5));  \n' +
           '     weight = pow(1.0 - clamp(weight,0.0,1.0) , 10.0);  \n' +

            '    ghost += textureDistorted(u_colorTexture, offset, direction.xy, distortion, bSpace);  \n' +

            '}  \n' +

            ' result += ghost;  \n' +

            // sample halo:
            'vec4 halo;  \n' +
            ' vec2 haloVec = normalize(ghostVec) * u_HaloWidth;  \n' +
            ' float weight = length(vec2(0.5) - fract(texcoord + haloVec)) / length(vec2(0.5));  \n' +
            ' weight = pow(1.0 - weight, 5.0);  \n' +
            ' halo = textureDistorted(u_colorTexture, texcoord + haloVec, direction.xy, distortion, bSpace) * weight * 1.5;  \n' +

            ' result += halo; \n' +
            ' result += texture2D(u_DirtTexture, v_textureCoordinates);  \n' +
            ' float weight2 = length(vec3(lastPosition.xy, 0.0)); \n' +
             ' float oneminusweight2 = max(1.0 - weight2, 0.0); \n' +


            //Rotating starburst texture's coordinate
            ' vec3 camx = vec3(czm_view[0][0], czm_view[0][1], czm_view[0][2] ); \n' +
            ' vec3 camz = vec3(czm_view[1][0], czm_view[1][1], czm_view[1][2] );  \n' +
            ' float camrot = dot(camx, vec3(0, 0, 1)) + dot(camz, vec3(0, 1, 0));  \n' +

            ' mat3 rotation = mat3(  \n' +
            '    cos(camrot), -sin(camrot), 0.0,  \n' +
            '    sin(camrot), cos(camrot), 0.0,  \n' +
            '    0.0, 0.0, 1.0  \n' +
            ');  \n' +

            ' vec3 st1 = vec3(v_textureCoordinates, 1.0) * 2.0  - vec3(1.0); \n' +
            ' st1.z = 1.0; \n' +
            ' vec3 st2 = rotation * st1; \n' +
            ' st2.z = 1.0; \n' +

            ' vec3 st3 = st2 * 0.5 + vec3(0.5); \n' +

            ' vec2 lensStarTexcoord = st3.xy; \n' +

            ' float weight3 = length(vec3(st1.xy, 0.0)); \n' +

             'if (!bSpace) \n' +
            '{                         \n' +
            ' result *= oneminusweight2 * u_Intensity * 0.2;  \n' +
            '}                          \n' +
            'else \n' +
            '{ \n' +
                'result *= oneminusweight2 * u_Intensity;  \n' +
                ' result *= texture2D(u_StarTexture, lensStarTexcoord) * pow(weight2,1.0) * max((1.0 - weight3), 0.0) * 2.0;  \n' +
            '} \n' +

            //If sun is in the screen space, add lens flare effect
            'if( (  lastPosition.x >= -1.1 && lastPosition.x <= 1.1) &&  \n' +
            '    (lastPosition.y >= -1.1 && lastPosition.y <= 1.1)  \n' +
            ')  \n' +
            '{  \n' +
            '    result += texture2D(u_colorTexture, v_textureCoordinates); \n' +
            '}  \n' +
            'else \n' +
            '{ \n' +
            '    result = texture2D(u_colorTexture, v_textureCoordinates); \n' +
            '} \n' +

            ' gl_FragColor = result; \n' +

            '} \n';

        return new PostProcessorStage({
            fragmentShader: LensFlareShader,
            uniformValues: uniformValues
        });
    }

    function createBlackAndWhiteStage() {
        var uniformValues = {
            gradations : 5.0
        };

        var fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform float u_gradations; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 rgb = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    float luminance = czm_luminance(rgb); \n' +
            '    float darkness = luminance * u_gradations; \n' +
            '    darkness = (darkness - fract(darkness)) / u_gradations; \n' +
            '    gl_FragColor = vec4(vec3(darkness), 1.0); \n' +
            '} \n';

        return new PostProcessorStage({
            fragmentShader : fragmentShader,
            uniformValues : uniformValues
        });
    }

    function createBrightnessStage() {
        var uniformValues = {
            brightness : 0.5
        };

        var fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform float u_brightness; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 rgb = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    vec3 target = vec3(0.0); \n' +
            '    gl_FragColor = vec4(mix(target, rgb, u_brightness), 1.0); \n' +
            '} \n';

        return new PostProcessorStage({
            fragmentShader : fragmentShader,
            uniformValues : uniformValues
        });
    }

    function createEightBitStage() {
        var fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'const int KERNEL_WIDTH = 16; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec2 u_step = vec2(1.0 / czm_viewport.z, 1.0 / czm_viewport.w); \n' +
            '    vec2 integralPos = v_textureCoordinates - mod(v_textureCoordinates, 8.0 * u_step); \n' +
            '    vec3 averageValue = vec3(0.0); \n' +
            '    for (int i = 0; i < KERNEL_WIDTH; i++) \n' +
            '    { \n' +
            '        for (int j = 0; j < KERNEL_WIDTH; j++) \n' +
            '        { \n' +
            '            averageValue += texture2D(u_colorTexture, integralPos + u_step * vec2(i, j)).rgb; \n' +
            '        } \n' +
            '    } \n' +
            '    averageValue /= float(KERNEL_WIDTH * KERNEL_WIDTH); \n' +
            '    gl_FragColor = vec4(averageValue, 1.0); \n' +
            '} \n';
        return new PostProcessorStage({
            fragmentShader : fragmentShader
        });
    }

    function createCompositeTextureStage() {
        var url = buildModuleUrl('Assets/Textures/moonSmall.jpg');
        var uniformValues = {
            alpha : 0.5,
            texture : url
        };

        var fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'uniform float u_alpha; \n' +
            'uniform sampler2D u_texture; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 screenRgb = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    vec3 textureRgb = texture2D(u_texture, v_textureCoordinates).rgb; \n' +
            '    gl_FragColor = vec4(mix(screenRgb, textureRgb, u_alpha), 1.0); \n' +
            '} \n';

        return new PostProcessorStage({
            fragmentShader : fragmentShader,
            uniformValues : uniformValues
        });
    }

    PostProcessorScene.prototype.update = function(frameState, inputFramebuffer, outputFramebuffer) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('frameState', frameState);
        Check.typeOf.object('inputFramebuffer', inputFramebuffer);
        //>>includeEnd('debug');

        var context = frameState.context;

        var commandList = frameState.commandList;
        var commandStart = commandList.length;
        this._postProcessor.update(frameState, inputFramebuffer, outputFramebuffer);
        var commandEnd = commandList.length;
        for (var i = commandStart; i < commandEnd; ++i) {
            commandList[i].execute(context);
        }
        commandList.length = commandStart;
    };

    PostProcessorScene.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessorScene.prototype.destroy = function() {
        this._postProcessor = this._postProcessor && this._postProcessor.destroy();
        return destroyObject(this);
    };

    return PostProcessorScene;
});
