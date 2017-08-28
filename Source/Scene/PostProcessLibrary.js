define([
        '../Core/buildModuleUrl',
        '../Core/defineProperties',
        '../Core/destroyObject',
        './PostProcess',
        './PostProcessAmbientOcclusionStage',
        './PostProcessBloomStage',     
        './PostProcessCompositeStage',
        './PostProcessDepthOfFieldStage',
        './PostProcessStage',
        './PostProcessToonStage',
        '../Shaders/PostProcessFilters/FXAA',
        '../ThirdParty/Shaders/FXAA3_11'
], function(
        buildModuleUrl,
        defineProperties,
        destroyObject,
        PostProcess,
        PostProcessAmbientOcclusionStage,
        PostProcessBloomStage,
        PostProcessCompositeStage,
        PostProcessDepthOfFieldStage,
        PostProcessStage,
        PostProcessToonStage,
        FXAAFS,
        FXAA3_11) {
    'use strict';

    function PostProcessLibrary() {
    }

    defineProperties(PostProcessLibrary, {
        /**
         * Renders in black and white gradations.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        blackAndWhite : {
            get : function() {
                return createBlackAndWhiteStage();
            }
        },
        /**
         * Control the brightness of the render.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        brightness : {
            get : function() {
                return createBrightnessStage();
            }
        },
        /**
         * Render in a pixelated eight-bit style.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        eightBit : {
            get : function() {
                return createEightBitStage();
            }
        },
        /**
         * Render with a night vision effect.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        nightVision : {
            get : function() {
                return createNightVisionStage();
            }
        },
        /**
         * Overlay a texture above the render.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        textureOverlay : {
            get : function() {
                return createTextureOverlayStage();
            }
        },
        /**
         * @private
         */
        fxaa : {
            get : function() {
                return createFxaaStage();
            }
        },

        /**
         * @private
         */
        depthView : {
            get : function() {
                return createDepthViewStage();
            }
        },

        /**
         * @private
         */
        compositeTest : {
            get : function() {
                return createCompositeTestStage();
            }
        },

        /**
         * lensFlare.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        lensFlare : {
            get : function() {
                return createLensFlareStage();
            }
        },

        /**
         * ambientOcclusion.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        ambientOcclusion : {
            get : function() {
                return createAmbientOcclusionStage();
            }
        },

         /**
         * depthOfField.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        depthOfField : {
            get : function() {
                return createDepthOfFieldStage();
            }
        },

        /**
         * bloom.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        bloom : {
            get : function() {
                return createBloomStage();
            }
        },

        /**
         * toon.
         *
         * @memberof PostProcessLibrary
         *
         * @type {PostProcessStage}
         * @readonly
         */
        toon : {
            get : function() {
                return createToonStage();
            }
        }
    });

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

        return new PostProcessStage({
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

        return new PostProcessStage({
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
        return new PostProcessStage({
            fragmentShader : fragmentShader
        });
    }

    function createNightVisionStage() {
        var fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'float rand(vec2 co) \n' +
            '{ \n' +
            '    return fract(sin(dot(co.xy ,vec2(12.9898, 78.233))) * 43758.5453); \n' +
            '} \n' +
            'void main(void) \n' +
            '{ \n' +
            '    float noiseValue = rand(v_textureCoordinates + sin(czm_frameNumber)) * 0.1; \n' +
            '    vec3 rgb = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    vec3 green = vec3(0.0, 1.0, 0.0); \n' +
            '    gl_FragColor = vec4((noiseValue + rgb) * green, 1.0); \n' +
            '} \n';

        return new PostProcessStage({
            fragmentShader : fragmentShader
        });
    }

    function createTextureOverlayStage() {
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
            '    vec4 screen = texture2D(u_colorTexture, v_textureCoordinates); \n' +
            '    vec4 color = texture2D(u_texture, v_textureCoordinates); \n' +
            '    gl_FragColor = vec4(mix(screen.rgb, color.rgb, u_alpha * color.a), 1.0); \n' +
            '} \n';

        return new PostProcessStage({
            fragmentShader : fragmentShader,
            uniformValues : uniformValues
        });
    }

    function createFxaaStage() {
        var fragmentShader =
            '#define FXAA_QUALITY_PRESET 39 \n' +
            FXAA3_11 + '\n' +
            FXAAFS;
        return new PostProcessStage({
            fragmentShader : fragmentShader
        });
    }

    function createDepthViewStage() {
        var fragmentShader =
            'uniform sampler2D u_depthTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    float depth = texture2D(u_depthTexture, v_textureCoordinates).r; \n' +
            '    gl_FragColor = vec4(vec3(depth), 1.0); \n' +
            '} \n';
        return new PostProcessStage({
            fragmentShader : fragmentShader
        });
    }

    function createCompositeTestStage() {
        var darkenShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    vec3 color = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            '    gl_FragColor = vec4(color * 0.5, 1.0); \n' +
            '} \n';
        var redShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main(void) \n' +
            '{ \n' +
            '    float red = texture2D(u_colorTexture, v_textureCoordinates).r; \n' +
            '    gl_FragColor = vec4(red, 0.0, 0.0, 1.0); \n' +
            '} \n';
        var darkenStage = new PostProcessStage({
            fragmentShader : darkenShader
        });
        var redStage = new PostProcessStage({
            fragmentShader : redShader
        });
        return new PostProcessCompositeStage([darkenStage, redStage]);
    }

    function createLensFlareStage() {
        var urlDirt = buildModuleUrl('Assets/Textures/LensFlare/DirtMask.jpg');
        var urlStar = buildModuleUrl('Assets/Textures/LensFlare/StarBurst.jpg');
        var uniformValues = {
            dirtTexture: urlDirt,
            starTexture: urlStar,
            intensity: 2.0,
            distortion: 10.0,
            ghostDispersal: 0.4,
            haloWidth: 0.4,
            earthRadius: 0.0
        };

        var fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_dirtTexture; \n' +
            'uniform sampler2D u_starTexture; \n' +
            'uniform float u_distortion; \n' +
            'uniform float u_ghostDispersal; \n' +
            'uniform float u_haloWidth; \n' +
            'uniform float u_earthRadius; \n' +
            'uniform float u_intensity; \n' +
            'varying vec2 v_textureCoordinates; \n' +

            //return ndc from world coordinate biased earthRadius
            'vec4 getNDCFromWC(vec3 WC, float earthRadius) \n' +
            '{ \n' +
            ' vec4 positionWC = vec4(WC, 1.0); \n' +
            ' vec4 positionEC = czm_view * positionWC; \n' +
            ' positionEC = vec4(positionEC.x + earthRadius , positionEC.y, positionEC.z, 1.0); \n' +
            ' positionWC = czm_eyeToWindowCoordinates(positionEC); \n' +
            ' return czm_viewportOrthographic * vec4(positionWC.xy, -positionWC.z, 1.0); \n' +
            '} \n' +

            //Check if current pixel is included Earth
            //if then mask it gradually
            'float isInEarth(vec2 texcoord, vec2 sceneSize) \n' +
            '{ \n' +
            '   vec2 NDC = texcoord * 2.0 - 1.0; \n' +
            '   vec4 earthPosSC = getNDCFromWC(vec3(0.0,0.0,0.0), 0.0); \n' +
            '   vec4 earthPosSCEdge = getNDCFromWC(vec3(0.0,0.0,0.0), u_earthRadius * 1.5); \n' +
            '   NDC.xy -= earthPosSC.xy; \n' +
            '   float X = abs(NDC.x)*sceneSize.x; \n' +
            '   X *= X; \n' +
            '   float Y = abs(NDC.y)*sceneSize.y; \n' +
            '   Y *= Y; \n' +
            '   return clamp(0.0, 1.0, max( sqrt(X + Y) / max(abs(earthPosSCEdge.x*sceneSize.x), 1.0) - 0.8 , 0.0)); \n' +
            '} \n' +

            //For Chromatic effect
            'vec4 textureDistorted( \n' +
            '  sampler2D tex, \n' +
            '  vec2 texcoord, \n' +
            '  vec2 direction, \n' +
            '  vec3 distortion, \n' +
            '  bool isSpace \n' +
            ') \n' +
            '{ \n' +
            ' vec2 sceneSize = czm_viewport.zw; \n' +
            ' float red = 0.0; \n' +
            ' float green = 0.0; \n' +
            ' float blue = 0.0; \n' +
            ' if(isSpace) \n' +
            ' { \n' +
                'red = isInEarth(texcoord  + direction * distortion.r, sceneSize) * texture2D(tex, texcoord + direction * distortion.r).r; \n' +
                'green = isInEarth(texcoord + direction * distortion.g, sceneSize) *  texture2D(tex, texcoord + direction * distortion.g).g; \n' +
                'blue = isInEarth(texcoord  + direction * distortion.b, sceneSize) * texture2D(tex, texcoord + direction * distortion.b).b; \n' +
            ' } \n' +
            ' else \n' +
            ' { \n' +
                'red = texture2D(tex, texcoord + direction * distortion.r).r; \n' +
                'green = texture2D(tex, texcoord + direction * distortion.g).g; \n' +
                'blue = texture2D(tex, texcoord + direction * distortion.b).b; \n' +
            ' } \n' +
            '   return vec4(clamp(red, 0.0, 1.0), clamp(green, 0.0, 1.0), clamp(blue, 0.0, 1.0), 0.0); \n' +
            '} \n' +

            'void main(void) \n' +
            '{ \n' +
            ' vec3 rgb = texture2D(u_colorTexture, v_textureCoordinates).rgb; \n' +
            ' bool isSpace = true; \n' +

            //whether it is in space or not            
            ' float distanceForSpace = 6500000.0; \n' +

            ' if(length(czm_viewerPositionWC.xyz) < distanceForSpace) \n' +
            '   isSpace = false; \n' +

            //Sun position
            ' vec4 sunPositionWC; \n' +
            ' if (czm_morphTime == 1.0) \n' +
            ' { \n' +
            '   sunPositionWC = vec4(czm_sunPositionWC, 1.0); \n' +
            ' } \n' +
            ' else \n' +
            ' { \n' +
            '   sunPositionWC = vec4(czm_sunPositionColumbusView.zxy, 1.0); \n' +
            ' } \n' +

            ' vec4 sunPositionEC = czm_view * sunPositionWC; \n' +
            ' sunPositionWC = czm_eyeToWindowCoordinates(sunPositionEC); \n' +
            ' sunPositionWC = czm_viewportOrthographic * vec4(sunPositionWC.xy, -sunPositionWC.z, 1.0); \n' +
            ' vec2 texcoord = -v_textureCoordinates + vec2(1.0); \n' +
            ' vec2 texelSize = 1.0 / czm_viewport.zw; \n' +
            ' vec3 distortion = vec3(-texelSize.x * u_distortion, 0.0, texelSize.x * u_distortion); \n' +

            // ghost vector to image centre:
            ' vec2 ghostVec = (vec2(0.5) - texcoord) * u_ghostDispersal; \n' +
            ' vec3 direction = normalize(vec3(ghostVec, 0.0)); \n' +

            // sample ghosts:  
            ' vec4 result = vec4(0.0);  \n' +
            ' vec4 ghost = vec4(0.0);  \n' +
            ' for (int i = 0; i < 4; ++i) \n' +
            ' { \n' +
            '  vec2 offset = fract(texcoord + ghostVec * float(i)); \n' +
            // Only bright spots from the centre of the source image 
            '  ghost += textureDistorted(u_colorTexture, offset, direction.xy, distortion, isSpace); \n' +
            ' } \n' +
            ' result += ghost; \n' +

            // sample halo:
            ' vec4 halo; \n' +
            ' vec2 haloVec = normalize(ghostVec) * u_haloWidth; \n' +
            ' float weightForHalo = length(vec2(0.5) - fract(texcoord + haloVec)) / length(vec2(0.5)); \n' +
            ' weightForHalo = pow(1.0 - weightForHalo, 5.0); \n' +
            ' halo = textureDistorted(u_colorTexture, texcoord + haloVec, direction.xy, distortion, isSpace) * weightForHalo * 1.5; \n' +
            ' result += halo; \n' +
            ' result += texture2D(u_dirtTexture, v_textureCoordinates); \n' +

            //Rotating starburst texture's coordinate
            ' vec3 camx = vec3(czm_view[0][0], czm_view[0][1], czm_view[0][2] ); \n' +
            ' vec3 camz = vec3(czm_view[1][0], czm_view[1][1], czm_view[1][2] ); \n' +
            ' float camrot = dot(camx, vec3(0.0, 0.0, 1.0)) + dot(camz, vec3(0.0, 1.0, 0.0)); \n' +
            ' float cosValue = cos(camrot); \n' +
            ' float sinValue = sin(camrot); \n' +
            ' mat3 rotation = mat3( \n' +
            '    cosValue, -sinValue, 0.0, \n' +
            '    sinValue, cosValue, 0.0, \n' +
            '    0.0, 0.0, 1.0 \n' +
            ' ); \n' +
            ' vec3 st1 = vec3(v_textureCoordinates, 1.0) * 2.0 - vec3(1.0); \n' +
            ' st1.z = 1.0; \n' +
            ' vec3 st2 = rotation * st1; \n' +
            ' st2.z = 1.0; \n' +
            ' vec3 st3 = st2 * 0.5 + vec3(0.5); \n' +
            ' vec2 lensStarTexcoord = st3.xy; \n' +
            ' float weightForLensFlare = length(vec3(sunPositionWC.xy, 0.0)); \n' +
            ' float oneMinusWeightForLensFlare = max(1.0 - weightForLensFlare, 0.0); \n' +
            ' if (!isSpace) \n' +
            ' { \n' +
            '  result *= oneMinusWeightForLensFlare * u_intensity * 0.2; \n' +
            ' } \n' +
            ' else \n' +
            ' { \n' +
            '  result *= oneMinusWeightForLensFlare * u_intensity; \n' +
            '  result *= texture2D(u_starTexture, lensStarTexcoord) * pow(weightForLensFlare,1.0) * max((1.0 - length(vec3(st1.xy, 0.0))), 0.0) * 2.0; \n' +
            ' } \n' +

            //If sun is in the screen space, add lens flare effect
            ' if( (sunPositionWC.x >= -1.1 && sunPositionWC.x <= 1.1) && \n' +
            '    (sunPositionWC.y >= -1.1 && sunPositionWC.y <= 1.1) \n' +
            ' ) \n' +
            ' { \n' +
            '  result += texture2D(u_colorTexture, v_textureCoordinates); \n' +
            ' } \n' +
            ' else \n' +
            ' { \n' +
            '  result = texture2D(u_colorTexture, v_textureCoordinates); \n' +
            ' } \n' +
            '  gl_FragColor = result; \n' +
            ' } \n';

        return new PostProcessStage({
            fragmentShader: fragmentShader,
            uniformValues: uniformValues
        });
    }

    function createAmbientOcclusionStage() {
        return new PostProcessAmbientOcclusionStage();
    }

    function createDepthOfFieldStage() {
        return new PostProcessDepthOfFieldStage();
    }

    function createBloomStage() {
        return new PostProcessBloomStage();
    }

    function createToonStage() {
        return new PostProcessToonStage();
    }

    return PostProcessLibrary;
});
