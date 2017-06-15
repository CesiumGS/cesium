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

        var stages = [
            this.blackAndWhiteStage,
            this.brightnessStage,
            this.eightBitStage,
            this.compositeTextureStage
        ];

        this._postProcessor = new PostProcessor({
            stages : stages
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
