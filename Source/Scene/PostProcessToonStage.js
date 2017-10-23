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
     * Post process stage for Toon. Implements {@link PostProcessStage}.
     *
     * @alias PostProcessToonStage
     * @constructor
     *
     * @private
     */
    function PostProcessToonStage() {
        this._toonTexture = undefined;
        this._toonFramebuffer = undefined;
        this._toonPostProcess = undefined;

        this._edgeDetectionUniformValues = {
            len : 0.1
        };

        this._toonUniformValues = {};

        this._uniformValues = {
            toonTexture : undefined,
            toonOnly : true
        };

        /**
         * @inheritdoc PostProcessStage#show
         */
        this.show = false;

        this._fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_toonTexture; \n' +
            'uniform bool  u_toonOnly; \n' +
            'varying vec2 v_textureCoordinates; \n' +

            'void main(void) \n' +
            '{ \n' +
            '     gl_FragColor = texture2D(u_toonTexture, v_textureCoordinates);\n' +
            '     gl_FragColor = mix(texture2D(u_colorTexture, v_textureCoordinates), texture2D(u_toonTexture, v_textureCoordinates), gl_FragColor.a);\n' +
            '} \n';
    }

    defineProperties(PostProcessToonStage.prototype, {
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
        edgeDetectionUniformValues : {
            get : function() {
                return this._edgeDetectionUniformValues;
            }
        },
        /**
         * @inheritdoc PostProcessStage#uniformValues
         */
        toonUniformValues : {
            get : function() {
                return this._toonUniformValues;
            }
        }

    });

    /**
     * @inheritdoc PostProcessStage#execute
     */
    PostProcessToonStage.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, dirty) {
        if (!this.show) {
            return;
        }

        if (dirty) {
            destroyResources(this);
            createResources(this, frameState.context);
        }

        this._toonPostProcess.execute(frameState, inputColorTexture, inputDepthTexture, this._toonFramebuffer);
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
        var toonTexture = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });
        var toonFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [toonTexture],
            destroyAttachments : false
        });

        var edgeDetectionUniformValues = stage._edgeDetectionUniformValues;

        var toonUniformValues = stage._toonUniformValues;

        var toonShader =
            '#extension GL_OES_standard_derivatives : enable \n' +
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_depthTexture; \n' +

            'varying vec2 v_textureCoordinates; \n' +

            'vec2 ScreenToView(vec2 uv) \n' +
            '{ \n' +
            '   return vec2((uv.x * 2.0 - 1.0), ((1.0 - uv.y)*2.0 - 1.0)) ; \n' +
            '} \n' +

            //Reconstruct Normal from View position
            'vec3 GetNormal(vec3 posInCamera) \n' +
            '{ \n' +
            '  vec3 d1 = dFdx(posInCamera); \n' +
            '  vec3 d2 = dFdy(posInCamera); \n' +
            '  return normalize(cross(d2, d1)); \n' +
            '} \n' +

            'float LinearDepth(float depth) \n' +
            '{ \n' +
            ' float far= czm_currentFrustum.y; \n' +
            ' float near = czm_currentFrustum.x; \n' +
            ' return (2.0 * near) / (far + near - depth * (far - near)); \n' +
            '} \n' +

            'void main(void) \n' +
            '{ \n' +
            '    float depth = texture2D(u_depthTexture, v_textureCoordinates).r; \n' +
            '    vec4 posInCamera = czm_inverseProjection * vec4(ScreenToView(v_textureCoordinates), depth, 1.0); \n' +
            '    posInCamera = posInCamera / posInCamera.w; \n' +
            '    vec3 normalInCamera = GetNormal(posInCamera.xyz); \n' +
            '    vec4 normalInWorld = czm_inverseView * vec4(normalInCamera, 0.0); \n' +
            '    depth = LinearDepth(depth); \n' +
            '    gl_FragColor = vec4(depth);\n' +
            '} \n';

        var edgeDetectionShader =
            'uniform sampler2D u_colorTexture; \n' +
            'uniform sampler2D u_depthTexture; \n' +
            'uniform float u_len; \n' +
            'uniform float u_stepSize; \n' +
            'precision highp float; \n' +

            'varying vec2 v_textureCoordinates; \n' +

            'void main(void) \n' +
            '{ \n' +

              'float padx = 1.0 / czm_viewport.z; \n' +
              'float pady = 1.0 / czm_viewport.w; \n' +

              'float horizEdge = 0.0; \n' +

              'horizEdge -= texture2D(u_depthTexture, v_textureCoordinates+ vec2(-padx, -pady)).x * 3.0; \n' +
              'horizEdge -= texture2D(u_depthTexture, v_textureCoordinates+ vec2(-padx, 0.0)).x * 10.0; \n' +
              'horizEdge -= texture2D(u_depthTexture, v_textureCoordinates+ vec2(-padx, pady)).x * 3.0; \n' +

              'horizEdge += texture2D(u_depthTexture, v_textureCoordinates+ vec2(padx, -pady)).x * 3.0; \n' +
              'horizEdge += texture2D(u_depthTexture, v_textureCoordinates+ vec2(padx, 0.0)).x * 10.0; \n' +
              'horizEdge += texture2D(u_depthTexture, v_textureCoordinates+ vec2(padx, pady)).x * 3.0; \n' +

              'float vertEdge = 0.0; \n' +

              'vertEdge -= texture2D(u_depthTexture, v_textureCoordinates+ vec2(-padx, -pady)).x * 3.0; \n' +
              'vertEdge -= texture2D(u_depthTexture, v_textureCoordinates+ vec2(0.0, -pady)).x * 10.0; \n' +
              'vertEdge -= texture2D(u_depthTexture, v_textureCoordinates+ vec2(padx, -pady)).x * 3.0; \n' +

              'vertEdge += texture2D(u_depthTexture, v_textureCoordinates+ vec2(-padx, pady)).x * 3.0; \n' +
              'vertEdge += texture2D(u_depthTexture, v_textureCoordinates+ vec2(0.0, pady)).x * 10.0; \n' +
              'vertEdge += texture2D(u_depthTexture, v_textureCoordinates+ vec2(padx, pady)).x * 3.0; \n' +

              'float len = sqrt(horizEdge*horizEdge + vertEdge*vertEdge); \n' +

              'if (len > u_len) \n' +
              '{ \n' +
              '   gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); \n' +
              '} \n' +
              'else \n' +
              '{ \n' +
              '   gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); \n' +
              '} \n' +

            '} \n';

        var toonStage = new PostProcessStage({
            fragmentShader : toonShader,
            uniformValues: toonUniformValues
        });

        var edgeDetectionStage = new PostProcessStage({
            fragmentShader : edgeDetectionShader,
            uniformValues: edgeDetectionUniformValues
        });

        var toonPostProcess = new PostProcess({
            stages : [toonStage, edgeDetectionStage],
            overwriteInput : false,
            blendOutput : false
        });

        toonStage.show = true;
        edgeDetectionStage.show = true;


        stage._toonTexture = toonTexture;
        stage._toonFramebuffer = toonFramebuffer;
        stage._toonPostProcess = toonPostProcess;
        stage._uniformValues.toonTexture = toonTexture;
    }

    function destroyResources(stage) {
        stage._toonTexture = stage._toonTexture && stage._toonTexture.destroy();
        stage._toonFramebuffer = stage._toonFramebuffer && stage._toonFramebuffer.destroy();
        stage._toonPostProcess = stage._toonPostProcess && stage._toonPostProcess.destroy();
    }

    /**
     * @inheritdoc PostProcessStage#isDestroyed
     */
    PostProcessToonStage.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc PostProcessStage#destroy
     */
    PostProcessToonStage.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return PostProcessToonStage;
});
