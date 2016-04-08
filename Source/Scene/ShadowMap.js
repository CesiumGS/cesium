/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryAttributes',
        '../Core/GeometryInstance',
        '../Core/Intersect',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PixelFormat',
        '../Core/PrimitiveType',
        '../Core/Quaternion',
        '../Core/SphereOutlineGeometry',
        '../Renderer/ClearCommand',
        '../Renderer/CubeMap',
        '../Renderer/Framebuffer',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/Renderbuffer',
        '../Renderer/RenderbufferFormat',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Renderer/WebGLConstants',
        './Camera',
        './CullFace',
        './OrthographicFrustum',
        './Pass',
        './PerInstanceColorAppearance',
        './PerspectiveFrustum',
        './Primitive'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        BoxOutlineGeometry,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        Color,
        ColorGeometryInstanceAttribute,
        combine,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        Intersect,
        CesiumMath,
        Matrix4,
        PixelFormat,
        PrimitiveType,
        Quaternion,
        SphereOutlineGeometry,
        ClearCommand,
        CubeMap,
        Framebuffer,
        PassState,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        RenderState,
        Sampler,
        ShaderProgram,
        ShaderSource,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        WebGLConstants,
        Camera,
        CullFace,
        OrthographicFrustum,
        Pass,
        PerInstanceColorAppearance,
        PerspectiveFrustum,
        Primitive) {
    'use strict';

    /**
     * Creates a cascaded shadow map from the provided light camera.
     *
     * @alias ShadowMap
     * @constructor
     *
     * @param {Object} options An object containing the following properties:
     * @param {Context} options.context The context in which to create the shadow map.
     * @param {Camera} options.lightCamera A camera representing the light source.
     * @param {Boolean} [options.isPointLight=false] Whether the light source is a point light. Point light shadows do not use cascades.
     * @param {Boolean} [options.radius=100.0] Radius of the point light.
     * @param {Boolean} [options.cascadesEnabled=true] Use multiple shadow maps to cover different partitions of the view frustum.
     * @param {Number} [options.numberOfCascades=4] The number of cascades to use for the shadow map. Supported values are one and four.
     * @param {Number} [options.size=1024] The width and height, in pixels, of each shadow map.
     * @param {Boolean} [options.softShadows=false] Whether percentage-closer-filtering is enabled for producing softer shadows.
     *
     * @see ShadowMapShader
     *
     * @exception {DeveloperError} Only one or four cascades are supported.

     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Shadows.html|Cesium Sandcastle Shadows Demo}
     *
     * @private
     */
    function ShadowMap(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var context = options.context;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(context)) {
            throw new DeveloperError('context is required.');
        }
        if (!defined(options.lightCamera)) {
            throw new DeveloperError('lightCamera is required.');
        }
        if (defined(options.numberOfCascades) && ((options.numberOfCascades !== 1) && (options.numberOfCascades !== 4))) {
            throw new DeveloperError('Only one or four cascades are supported.');
        }
        //>>includeEnd('debug');

        this.enabled = false;
        this.softShadows = defaultValue(options.softShadows, false);
        this._exponentialShadows = false;

        this._outOfView = false;
        this._outOfViewPrevious = false;
        this._needsUpdate = true;

        this._terrainBias = {
            polygonOffset : true,
            polygonOffsetFactor : 1.1,
            polygonOffsetUnits : 4.0,
            normalOffset : true,
            normalOffsetScale : 0.5,
            normalShading : true,
            normalShadingSmooth : 0.1,
            depthBias : 0.0
        };

        this._primitiveBias = {
            polygonOffset : true,
            polygonOffsetFactor : 1.1,
            polygonOffsetUnits : 4.0,
            normalOffset : true,
            normalOffsetScale : 0.05,
            normalShading : true,
            normalShadingSmooth : 0.1,
            depthBias : 0.0001
        };

        this._pointBias = {
            polygonOffset : false,
            polygonOffsetFactor : 1.1,
            polygonOffsetUnits : 4.0,
            normalOffset : false,
            normalOffsetScale : 0.0,
            normalShading : true,
            normalShadingSmooth : 0.1,
            depthBias : 0.01
        };

        // Framebuffer resources
        this._depthAttachment = undefined;
        this._colorAttachment = undefined;

        // Uniforms
        this._shadowMapMatrix = new Matrix4();
        this._shadowMapTexture = undefined;
        this._lightDirectionEC = new Cartesian3();
        this._lightPositionEC = new Cartesian4();
        this._distance = 0.0;

        this._shadowMapSize = defaultValue(options.size, 1024);
        this._textureSize = new Cartesian2(this._shadowMapSize, this._shadowMapSize);

        this._lightCamera = options.lightCamera;
        this._shadowMapCamera = new ShadowMapCamera();
        this._shadowMapCullingVolume = undefined;
        this._sceneCamera = undefined;
        this._boundingSphere = new BoundingSphere();

        this._isPointLight = defaultValue(options.isPointLight, false);
        this._radius = defaultValue(options.radius, 100.0);
        this._usesCubeMap = true;

        this._cascadesEnabled = this._isPointLight ? false : defaultValue(options.cascadesEnabled, true);
        this._numberOfCascades = !this._cascadesEnabled ? 0 : defaultValue(options.numberOfCascades, 4);
        this._fitNearFar = true;
        this._maximumDistance = 1000.0;

        this._isSpotLight = false;
        if (this._cascadesEnabled) {
            // Cascaded shadows are always orthographic. The frustum dimensions are calculated on the fly.
            this._lightCamera.frustum = new OrthographicFrustum();
            this._shadowMapCamera.frustum = new OrthographicFrustum();
        } else if (defined(this._lightCamera.frustum.fov)) {
            // If the light camera uses a perspective frustum, then the light source is a spot light
            this._isSpotLight = true;
        }

        // Uniforms
        this._cascadeSplits = [new Cartesian4(), new Cartesian4()];
        this._cascadeMatrices = [new Matrix4(), new Matrix4(), new Matrix4(), new Matrix4()];
        this._cascadeDistances = new Cartesian4();

        var numberOfPasses;
        if (this._isPointLight) {
            numberOfPasses = 6; // One shadow map for each direction
        } else if (!this._cascadesEnabled) {
            numberOfPasses = 1;
        } else {
            numberOfPasses = this._numberOfCascades;
        }

        this._numberOfPasses = numberOfPasses;
        this._passCameras = new Array(numberOfPasses);
        this._passStates = new Array(numberOfPasses);
        this._passFramebuffers = new Array(numberOfPasses);
        this._passTextureOffsets = new Array(numberOfPasses);
        this._passCommands = new Array(numberOfPasses);
        this._passCullingVolumes = new Array(numberOfPasses);

        for (var i = 0; i < numberOfPasses; ++i) {
            this._passCameras[i] = new ShadowMapCamera();
            this._passStates[i] = new PassState(context);
            this._passCommands[i] = [];
        }

        this.debugShow = false;
        this.debugFreezeFrame = false;
        this._debugFreezeFrame = false;
        this.debugVisualizeCascades = false;
        this._debugLightFrustum = undefined;
        this._debugCameraFrustum = undefined;
        this._debugCascadeFrustums = new Array(this._numberOfCascades);
        this._debugShadowViewCommand = undefined;

        this._usesDepthTexture = context.depthTexture;

        if (this._isPointLight) {
            this._usesDepthTexture = false;
        }

        // Create render states for shadow casters
        this._primitiveRenderState = undefined;
        this._terrainRenderState = undefined;
        this._pointRenderState = undefined;
        createRenderStates(this);

        // For clearing the shadow map texture every frame
        this._clearCommand = new ClearCommand({
            depth : 1.0,
            color : new Color()
        });

        this._clearPassState = new PassState(context);

        this.setSize(this._shadowMapSize);
    }

    function createRenderState(colorMask, bias) {
        return RenderState.fromCache({
            cull : {
                enabled : true, // TODO : need to handle objects that don't use back face culling, like walls
                face : CullFace.BACK
            },
            depthTest : {
                enabled : true
            },
            colorMask : {
                red : colorMask,
                green : colorMask,
                blue : colorMask,
                alpha : colorMask
            },
            depthMask : true,
            polygonOffset : {
                enabled : bias.polygonOffset,
                factor : bias.polygonOffsetFactor,
                units : bias.polygonOffsetUnits
            }
        });
    }

    function createRenderStates(shadowMap) {
        // Enable the color mask if the shadow map is backed by a color texture, e.g. when depth textures aren't supported
        var colorMask = !shadowMap._usesDepthTexture;
        shadowMap._primitiveRenderState = createRenderState(colorMask, shadowMap._primitiveBias);
        shadowMap._terrainRenderState = createRenderState(colorMask, shadowMap._terrainBias);
        shadowMap._pointRenderState = createRenderState(colorMask, shadowMap._pointBias);
    }

    // For debug purposes only. Call this when polygonOffset values change.
    ShadowMap.prototype._createRenderStates = function() {
        createRenderStates(this);
    };

    defineProperties(ShadowMap.prototype, {
        /**
         * Whether the shadow map is out of view of the scene camera.
         */
        outOfView : {
            get : function() {
                return this._outOfView;
            }
        },

        /**
         * The camera representing the shadow volume.
         *
         * @memberof ShadowMap.prototype
         * @type {ShadowMapCamera}
         * @readonly
         */
        shadowMapCamera : {
            get : function() {
                return this._shadowMapCamera;
            }
        },

        /**
         * The culling volume of the shadow frustum.
         *
         * @memberof ShadowMap.prototype
         * @type {CullingVolume}
         * @readonly
         */
        shadowMapCullingVolume : {
            get : function() {
                return this._shadowMapCullingVolume;
            }
        },

        /**
         * The primitive render state used for rendering shadow casters into the shadow map.
         *
         * @memberof ShadowMap.prototype
         * @type {RenderState}
         * @readonly
         */
        primitiveRenderState : {
            get : function() {
                return this._primitiveRenderState;
            }
        },

        /**
         * The terrain render state used for rendering shadow casters into the shadow map.
         *
         * @memberof ShadowMap.prototype
         * @type {RenderState}
         * @readonly
         */
        terrainRenderState : {
            get : function() {
                return this._terrainRenderState;
            }
        },

        /**
         * The point render state used for rendering shadow casters into the shadow map.
         *
         * @memberof ShadowMap.prototype
         * @type {RenderState}
         * @readonly
         */
        pointRenderState : {
            get : function() {
                return this._pointRenderState;
            }
        },

        /**
         * The number of passes required for rendering shadows.
         *
         * @memberof ShadowMap.prototype
         * @type {Number}
         * @readonly
         */
        numberOfPasses : {
            get : function() {
                return this._numberOfPasses;
            }
        },

        /**
         * The pass states.
         *
         * @memberof ShadowMap.prototype
         * @type {PassState[]}
         * @readonly
         */
        passStates : {
            get : function() {
                return this._passStates;
            }
        },

        /**
         * The pass cameras.
         *
         * @memberof ShadowMap.prototype
         * @type {ShadowMapCamera[]}
         * @readonly
         */
        passCameras : {
            get : function() {
                return this._passCameras;
            }
        },

        /**
         * The list of commands that are rendered into each pass.
         *
         * @memberof ShadowMap.prototype
         * @type {DrawCommand[]}
         * @readonly
         */
        passCommands : {
            get : function() {
                return this._passCommands;
            }
        },

        /**
         * The culling volume for each pass.
         *
         * @memberof ShadowMap.prototype
         * @type {CullingVolume}
         * @readonly
         */
        passCullingVolumes : {
            get : function() {
                return this._passCullingVolumes;
            }
        },

        /**
         * Whether the light source is a point light.
         *
         * @memberof ShadowMap.prototype
         * @type {Boolean}
         * @readonly
         */
        isPointLight : {
            get : function() {
                return this._isPointLight;
            }
        },

        /**
         * The position of the point light source.
         *
         * @memberof ShadowMap.prototype
         * @type {Cartesian3}
         * @readonly
         */
        pointLightPosition : {
            get : function() {
                return this._shadowMapCamera.positionWC;
            }
        },

        /**
         * The radius of the point light source.
         *
         * @memberof ShadowMap.prototype
         * @type {Number}
         * @readonly
         */
        pointLightRadius : {
            get : function() {
                return this._radius;
            }
        }
    });

    function destroyFramebuffer(shadowMap) {
        for (var i = 0; i < shadowMap._numberOfPasses; ++i) {
            var framebuffer = shadowMap._passFramebuffers[i];
            if (defined(framebuffer) && !framebuffer.isDestroyed()) {
                framebuffer.destroy();
            }
            shadowMap._passFramebuffers[i] = undefined;
        }

        // Destroy the framebuffer attachments
        shadowMap._depthAttachment = shadowMap._depthAttachment && shadowMap._depthAttachment.destroy();
        shadowMap._colorAttachment = shadowMap._colorAttachment && shadowMap._colorAttachment.destroy();
    }

    function createSampler() {
        return new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
    }

    function createFramebufferColor(shadowMap, context) {
        var depthRenderbuffer = new Renderbuffer({
            context : context,
            width : shadowMap._textureSize.x,
            height : shadowMap._textureSize.y,
            format : RenderbufferFormat.DEPTH_COMPONENT16
        });

        var colorTexture = new Texture({
            context : context,
            width : shadowMap._textureSize.x,
            height : shadowMap._textureSize.y,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        var framebuffer = new Framebuffer({
            context : context,
            depthRenderbuffer : depthRenderbuffer,
            colorTextures : [colorTexture],
            destroyAttachments : false
        });

        for (var i = 0; i < shadowMap._numberOfPasses; ++i) {
            shadowMap._passFramebuffers[i] = framebuffer;
            shadowMap._passStates[i].framebuffer = framebuffer;
        }

        shadowMap._shadowMapTexture = colorTexture;
        shadowMap._depthAttachment = depthRenderbuffer;
        shadowMap._colorAttachment = colorTexture;
    }

    function createFramebufferDepth(shadowMap, context) {
        var depthStencilTexture = new Texture({
            context : context,
            width : shadowMap._textureSize.x,
            height : shadowMap._textureSize.y,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
            sampler : createSampler()
        });

        var framebuffer = new Framebuffer({
            context : context,
            depthStencilTexture : depthStencilTexture,
            destroyAttachments : false
        });

        for (var i = 0; i < shadowMap._numberOfPasses; ++i) {
            shadowMap._passFramebuffers[i] = framebuffer;
            shadowMap._passStates[i].framebuffer = framebuffer;
        }

        shadowMap._shadowMapTexture = depthStencilTexture;
        shadowMap._depthAttachment = depthStencilTexture;
    }

    function createFramebufferCube(shadowMap, context) {
        var depthRenderbuffer = new Renderbuffer({
            context : context,
            width : shadowMap._shadowMapSize,
            height : shadowMap._shadowMapSize,
            format : RenderbufferFormat.DEPTH_COMPONENT16
        });

        var cubeMap = new CubeMap({
            context : context,
            width : shadowMap._shadowMapSize,
            height : shadowMap._shadowMapSize,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        var faces = [cubeMap.negativeX, cubeMap.negativeY, cubeMap.negativeZ, cubeMap.positiveX, cubeMap.positiveY, cubeMap.positiveZ];

        for (var i = 0; i < 6; ++i) {
            var framebuffer = new Framebuffer({
                context : context,
                depthRenderbuffer : depthRenderbuffer,
                colorTextures : [faces[i]],
                destroyAttachments : false
            });
            shadowMap._passFramebuffers[i] = framebuffer;
            shadowMap._passStates[i].framebuffer = framebuffer;
        }

        shadowMap._shadowMapTexture = cubeMap;
        shadowMap._depthAttachment = depthRenderbuffer;
        shadowMap._colorAttachment = cubeMap;
    }

    function createFramebuffer(shadowMap, context) {
        if (shadowMap._isPointLight && shadowMap._usesCubeMap) {
            createFramebufferCube(shadowMap, context);
        } else if (shadowMap._usesDepthTexture) {
            createFramebufferDepth(shadowMap, context);
        } else {
            createFramebufferColor(shadowMap, context);
        }

        clearFramebuffer(shadowMap, context);
    }

    function checkFramebuffer(shadowMap, context) {
        // Attempt to make an FBO with only a depth texture. If it fails, fallback to a color texture.
        if (shadowMap._usesDepthTexture && (shadowMap._passFramebuffers[0].status !== WebGLConstants.FRAMEBUFFER_COMPLETE)) {
            shadowMap._usesDepthTexture = false;
            createRenderStates(shadowMap);
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
        }
    }

    function updateFramebuffer(shadowMap, context) {
        if (!defined(shadowMap._passFramebuffers[0]) || (shadowMap._shadowMapTexture.width !== shadowMap._textureSize.x)) {
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
            checkFramebuffer(shadowMap, context);
        }
    }

    function clearFramebuffer(shadowMap, context, pass) {
        pass = defaultValue(pass, 0);
        if ((shadowMap._isPointLight && shadowMap._usesCubeMap) || (pass === 0)) {
            shadowMap._clearCommand.framebuffer = shadowMap._passFramebuffers[pass];
            shadowMap._clearCommand.execute(context, shadowMap._clearPassState);
        }
    }

    ShadowMap.prototype.setSize = function(size) {
        this._shadowMapSize = size;
        var numberOfPasses = this._numberOfPasses;
        var textureSize = this._textureSize;

        if (this._isPointLight && this._usesCubeMap) {
            textureSize.x = size;
            textureSize.y = size;
            var faceViewport = new BoundingRectangle(0, 0, size, size);
            this._passStates[0].viewport = faceViewport;
            this._passStates[1].viewport = faceViewport;
            this._passStates[2].viewport = faceViewport;
            this._passStates[3].viewport = faceViewport;
            this._passStates[4].viewport = faceViewport;
            this._passStates[5].viewport = faceViewport;
        } else if (numberOfPasses === 1) {
            // +----+
            // |  1 |
            // +----+
            textureSize.x = size;
            textureSize.y = size;
            this._passStates[0].viewport = new BoundingRectangle(0, 0, size, size);
        } else if (numberOfPasses === 4) {
            // +----+----+
            // |  3 |  4 |
            // +----+----+
            // |  1 |  2 |
            // +----+----+
            textureSize.x = size * 2;
            textureSize.y = size * 2;
            this._passStates[0].viewport = new BoundingRectangle(0, 0, size, size);
            this._passStates[1].viewport = new BoundingRectangle(size, 0, size, size);
            this._passStates[2].viewport = new BoundingRectangle(0, size, size, size);
            this._passStates[3].viewport = new BoundingRectangle(size, size, size, size);
        } else if (numberOfPasses === 6) {
            // +----+----+----+
            // |  4 |  5 |  6 |
            // +----+----+----+
            // |  1 |  2 |  3 |
            // +----+----+----+
            textureSize.x = size * 3;
            textureSize.y = size * 2;
            this._passStates[0].viewport = new BoundingRectangle(0, 0, size, size);
            this._passStates[1].viewport = new BoundingRectangle(size, 0, size, size);
            this._passStates[2].viewport = new BoundingRectangle(size * 2, 0, size, size);
            this._passStates[3].viewport = new BoundingRectangle(0, size, size, size);
            this._passStates[4].viewport = new BoundingRectangle(size, size, size, size);
            this._passStates[5].viewport = new BoundingRectangle(size * 2, size, size, size);
        }

        // Update clear pass state
        this._clearPassState.viewport = new BoundingRectangle(0, 0, textureSize.x, textureSize.y);

        // Transforms shadow coordinates [0, 1] into the pass's region of the texture
        for (var i = 0; i < numberOfPasses; ++i) {
            var viewport = this._passStates[i].viewport;
            var biasX = viewport.x / textureSize.x;
            var biasY = viewport.y / textureSize.y;
            var scaleX = viewport.width / textureSize.x;
            var scaleY = viewport.height / textureSize.y;
            this._passTextureOffsets[i] = new Matrix4(scaleX, 0.0, 0.0, biasX, 0.0, scaleY, 0.0, biasY, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
        }
    };

    var scratchViewport = new BoundingRectangle();

    function createDebugShadowViewCommand(shadowMap, context) {
        var fs;
        if (shadowMap._isPointLight && shadowMap._usesCubeMap) {
            fs = 'uniform samplerCube u_shadowMapTextureCube; \n' +
                 'varying vec2 v_textureCoordinates; \n' +
                 'void main() \n' +
                 '{ \n' +
                 '    vec2 uv = v_textureCoordinates; \n' +
                 '    vec3 dir; \n' +
                 ' \n' +
                 '    if (uv.y < 0.5) { \n' +
                 '        if (uv.x < 0.333) { \n' +
                 '            dir.x = -1.0; \n' +
                 '            dir.y = uv.x * 6.0 - 1.0; \n' +
                 '            dir.z = uv.y * 4.0 - 1.0; \n' +
                 '        } \n' +
                 '        else if (uv.x < 0.666) { \n' +
                 '            dir.y = -1.0; \n' +
                 '            dir.x = uv.x * 6.0 - 3.0; \n' +
                 '            dir.z = uv.y * 4.0 - 1.0; \n' +
                 '        } \n' +
                 '        else { \n' +
                 '            dir.z = -1.0; \n' +
                 '            dir.x = uv.x * 6.0 - 5.0; \n' +
                 '            dir.y = uv.y * 4.0 - 1.0; \n' +
                 '        } \n' +
                 '    } else { \n' +
                 '        if (uv.x < 0.333) { \n' +
                 '            dir.x = 1.0; \n' +
                 '            dir.y = uv.x * 6.0 - 1.0; \n' +
                 '            dir.z = uv.y * 4.0 - 3.0; \n' +
                 '        } \n' +
                 '        else if (uv.x < 0.666) { \n' +
                 '            dir.y = 1.0; \n' +
                 '            dir.x = uv.x * 6.0 - 3.0; \n' +
                 '            dir.z = uv.y * 4.0 - 3.0; \n' +
                 '        } \n' +
                 '        else { \n' +
                 '            dir.z = 1.0; \n' +
                 '            dir.x = uv.x * 6.0 - 5.0; \n' +
                 '            dir.y = uv.y * 4.0 - 3.0; \n' +
                 '        } \n' +
                 '    } \n' +
                 ' \n' +
                 '    float shadow = czm_unpackDepth(textureCube(u_shadowMapTextureCube, dir)); \n' +
                 '    gl_FragColor = vec4(vec3(shadow), 1.0); \n' +
                 '} \n';
        } else {
            fs = 'uniform sampler2D u_shadowMapTexture; \n' +
                 'varying vec2 v_textureCoordinates; \n' +
                 'void main() \n' +
                 '{ \n' +

                 (shadowMap._usesDepthTexture ?
                 '    float shadow = texture2D(u_shadowMapTexture, v_textureCoordinates).r; \n' :
                 '    float shadow = czm_unpackDepth(texture2D(u_shadowMapTexture, v_textureCoordinates)); \n') +

                 '    gl_FragColor = vec4(vec3(shadow), 1.0); \n' +
                 '} \n';
        }

        var drawCommand = context.createViewportQuadCommand(fs, {
            uniformMap : {
                u_shadowMapTexture : function() {
                    return shadowMap._shadowMapTexture;
                },
                u_shadowMapTextureCube : function() {
                    return shadowMap._shadowMapTexture;
                }
            }
        });
        drawCommand.pass = Pass.OVERLAY;
        return drawCommand;
    }

    function updateDebugShadowViewCommand(shadowMap, frameState) {
        // Draws the shadow map on the bottom-right corner of the screen
        var context = frameState.context;
        var screenWidth = frameState.context.drawingBufferWidth;
        var screenHeight = frameState.context.drawingBufferHeight;
        var size = Math.min(screenWidth, screenHeight) * 0.3;

        var viewport = scratchViewport;
        viewport.x = screenWidth - size;
        viewport.y = 0;
        viewport.width = size;
        viewport.height = size;

        var debugCommand = shadowMap._debugShadowViewCommand;
        if (!defined(debugCommand)) {
            debugCommand = shadowMap._debugShadowViewCommand = createDebugShadowViewCommand(shadowMap, context);
        }

        // Get a new RenderState for the updated viewport size
        if (!defined(debugCommand.renderState) || !BoundingRectangle.equals(debugCommand.renderState.viewport, viewport)) {
            debugCommand.renderState = RenderState.fromCache({
                viewport : BoundingRectangle.clone(viewport)
            });
        }

        frameState.commandList.push(shadowMap._debugShadowViewCommand);
    }

    var frustumCornersNDC = new Array(8);
    frustumCornersNDC[0] = new Cartesian4(-1, -1, -1, 1);
    frustumCornersNDC[1] = new Cartesian4(1, -1, -1, 1);
    frustumCornersNDC[2] = new Cartesian4(1, 1, -1, 1);
    frustumCornersNDC[3] = new Cartesian4(-1, 1, -1, 1);
    frustumCornersNDC[4] = new Cartesian4(-1, -1, 1, 1);
    frustumCornersNDC[5] = new Cartesian4(1, -1, 1, 1);
    frustumCornersNDC[6] = new Cartesian4(1, 1, 1, 1);
    frustumCornersNDC[7] = new Cartesian4(-1, 1, 1, 1);

    var scratchMatrix = new Matrix4();
    var scratchFrustumCorners = new Array(8);
    for (var i = 0; i < 8; ++i) {
        scratchFrustumCorners[i] = new Cartesian4();
    }

    function createDebugPointLight(modelMatrix, color) {
        var box = new GeometryInstance({
            geometry : new BoxOutlineGeometry({
                minimum : new Cartesian3(-0.5, -0.5, -0.5),
                maximum : new Cartesian3(0.5, 0.5, 0.5)
            }),
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(color)
            }
        });

        var sphere = new GeometryInstance({
            geometry : new SphereOutlineGeometry({
                radius : 0.5
            }),
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(color)
            }
        });

        return new Primitive({
            geometryInstances : [box, sphere],
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false,
            modelMatrix : modelMatrix
        });
    }

    function createDebugFrustum(camera, color) {
        var view = camera.viewMatrix;
        var projection = camera.frustum.projectionMatrix;
        var viewProjection = Matrix4.multiply(projection, view, scratchMatrix);
        var inverseViewProjection = Matrix4.inverse(viewProjection, scratchMatrix);

        var positions = new Float64Array(8 * 3);
        for (var i = 0; i < 8; ++i) {
            var corner = Cartesian4.clone(frustumCornersNDC[i], scratchFrustumCorners[i]);
            Matrix4.multiplyByVector(inverseViewProjection, corner, corner);
            Cartesian3.divideByScalar(corner, corner.w, corner); // Handle the perspective divide
            positions[i * 3 + 0] = corner.x;
            positions[i * 3 + 1] = corner.y;
            positions[i * 3 + 2] = corner.z;
        }

        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positions
        });

        var indices = new Uint16Array([0,1,1,2,2,3,3,0,0,4,4,7,7,3,7,6,6,2,2,1,1,5,5,4,5,6]);
        var geometry = new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : new BoundingSphere.fromVertices(positions)
        });

        var debugFrustum = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : geometry,
                attributes : {
                    color : ColorGeometryInstanceAttribute.fromColor(color)
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });

        return debugFrustum;
    }

    var debugCascadeColors = [Color.RED, Color.GREEN, Color.BLUE, Color.MAGENTA];
    var scratchScale = new Cartesian3();

    function applyDebugSettings(shadowMap, frameState) {
        updateDebugShadowViewCommand(shadowMap, frameState);

        var enterFreezeFrame = shadowMap.debugFreezeFrame && !shadowMap._debugFreezeFrame;
        shadowMap._debugFreezeFrame = shadowMap.debugFreezeFrame;

        // Draw scene camera in freeze frame mode
        if (shadowMap.debugFreezeFrame) {
            if (enterFreezeFrame) {
                // Recreate debug camera when entering freeze frame mode
                shadowMap._debugCameraFrustum = shadowMap._debugCameraFrustum && shadowMap._debugCameraFrustum.destroy();
                shadowMap._debugCameraFrustum = createDebugFrustum(shadowMap._sceneCamera, Color.CYAN);
            }
            shadowMap._debugCameraFrustum.update(frameState);
        }

        if (shadowMap._cascadesEnabled) {
            // Draw cascades only in freeze frame mode
            if (shadowMap.debugFreezeFrame) {
                if (enterFreezeFrame) {
                    // Recreate debug frustum when entering freeze frame mode
                    shadowMap._debugLightFrustum = shadowMap._debugLightFrustum && shadowMap._debugLightFrustum.destroy();
                    shadowMap._debugLightFrustum = createDebugFrustum(shadowMap._shadowMapCamera, Color.YELLOW);
                }
                shadowMap._debugLightFrustum.update(frameState);

                for (var i = 0; i < shadowMap._numberOfCascades; ++i) {
                    if (enterFreezeFrame) {
                        // Recreate debug frustum when entering freeze frame mode
                        shadowMap._debugCascadeFrustums[i] = shadowMap._debugCascadeFrustums[i] && shadowMap._debugCascadeFrustums[i].destroy();
                        shadowMap._debugCascadeFrustums[i] = createDebugFrustum(shadowMap._passCameras[i], debugCascadeColors[i]);
                    }
                    shadowMap._debugCascadeFrustums[i].update(frameState);
                }
            }
        } else if (shadowMap._isPointLight) {
            if (!defined(shadowMap._debugLightFrustum) || shadowMap._needsUpdate) {
                var translation = shadowMap._shadowMapCamera.positionWC;
                var rotation = Quaternion.IDENTITY;
                var uniformScale = shadowMap._radius * 2.0;
                var scale = Cartesian3.fromElements(uniformScale, uniformScale, uniformScale, scratchScale);
                var modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(translation, rotation, scale, scratchMatrix);

                shadowMap._debugLightFrustum = shadowMap._debugLightFrustum && shadowMap._debugLightFrustum.destroy();
                shadowMap._debugLightFrustum = createDebugPointLight(modelMatrix, Color.YELLOW);
            }
            shadowMap._debugLightFrustum.update(frameState);
        } else {
            if (!defined(shadowMap._debugLightFrustum) || shadowMap._needsUpdate) {
                shadowMap._debugLightFrustum = createDebugFrustum(shadowMap._shadowMapCamera, Color.YELLOW);
            }
            shadowMap._debugLightFrustum.update(frameState);
        }
    }

    function ShadowMapCamera() {
        this.viewMatrix = new Matrix4();
        this.inverseViewMatrix = new Matrix4();
        this.frustum = undefined;
        this.positionCartographic = new Cartographic();
        this.positionWC = new Cartesian3();
        this.directionWC = new Cartesian3();
        this.upWC = new Cartesian3();
        this.rightWC = new Cartesian3();
        this.viewProjectionMatrix = new Matrix4();
    }

    ShadowMapCamera.prototype.clone = function(camera) {
        Matrix4.clone(camera.viewMatrix, this.viewMatrix);
        Matrix4.clone(camera.inverseViewMatrix, this.inverseViewMatrix);
        this.frustum = camera.frustum.clone(this.frustum);
        Cartographic.clone(camera.positionCartographic, this.positionCartographic);
        Cartesian3.clone(camera.positionWC, this.positionWC);
        Cartesian3.clone(camera.directionWC, this.directionWC);
        Cartesian3.clone(camera.upWC, this.upWC);
        Cartesian3.clone(camera.rightWC, this.rightWC);
    };

    // Converts from NDC space to texture space
    var scaleBiasMatrix = new Matrix4(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);

    ShadowMapCamera.prototype.getViewProjection = function() {
        var view = this.viewMatrix;
        var projection = this.frustum.projectionMatrix;
        Matrix4.multiply(projection, view, this.viewProjectionMatrix);
        Matrix4.multiply(scaleBiasMatrix, this.viewProjectionMatrix, this.viewProjectionMatrix);
        return this.viewProjectionMatrix;
    };

    var scratchSplitNear = new Array(4);
    var scratchSplitFar = new Array(4);
    var scratchFrustum = new PerspectiveFrustum();
    var scratchCascadeDistances = new Array(4);

    function computeCascades(shadowMap) {
        var shadowMapCamera = shadowMap._shadowMapCamera;
        var sceneCamera = shadowMap._sceneCamera;
        var cameraNear = sceneCamera.frustum.near;
        var cameraFar = sceneCamera.frustum.far;
        var numberOfCascades = shadowMap._numberOfCascades;

        // Split cascades. Use a mix of linear and log splits.
        var lambda = 0.9;
        var range = cameraFar - cameraNear;
        var ratio = cameraFar / cameraNear;

        var splitsNear = scratchSplitNear;
        var splitsFar = scratchSplitFar;
        splitsNear[0] = cameraNear;
        splitsFar[numberOfCascades - 1] = cameraFar;

        for (var i = 0; i < numberOfCascades - 1; ++i) {
            var p = (i + 1) / numberOfCascades;
            var logScale = cameraNear * Math.pow(ratio, p);
            var uniformScale = cameraNear + range * p;
            var split = CesiumMath.lerp(uniformScale, logScale, lambda);
            splitsFar[i] = split;
            splitsNear[i + 1] = split;
        }

        var cascadeDistances = scratchCascadeDistances;
        for (var m = 0; m < numberOfCascades; ++m) {
            cascadeDistances[m] = splitsFar[m] - splitsNear[m];
        }

        Cartesian4.unpack(splitsNear, 0, shadowMap._cascadeSplits[0]);
        Cartesian4.unpack(splitsFar, 0, shadowMap._cascadeSplits[1]);
        Cartesian4.unpack(cascadeDistances, 0, shadowMap._cascadeDistances);

        var left = shadowMapCamera.frustum.left;
        var right = shadowMapCamera.frustum.right;
        var bottom = shadowMapCamera.frustum.bottom;
        var top = shadowMapCamera.frustum.top;
        var near = shadowMapCamera.frustum.near;
        var far = shadowMapCamera.frustum.far;

        var position = shadowMapCamera.positionWC;
        var direction = shadowMapCamera.directionWC;
        var up = shadowMapCamera.upWC;

        var cascadeSubFrustum = sceneCamera.frustum.clone(scratchFrustum);
        var shadowViewProjection = shadowMapCamera.getViewProjection();

        for (var j = 0; j < numberOfCascades; ++j) {
            // Find the bounding box of the camera sub-frustum in shadow map texture space
            cascadeSubFrustum.near = splitsNear[j];
            cascadeSubFrustum.far = splitsFar[j];
            var viewProjection = Matrix4.multiply(cascadeSubFrustum.projectionMatrix, sceneCamera.viewMatrix, scratchMatrix);
            var inverseViewProjection = Matrix4.inverse(viewProjection, scratchMatrix);
            var shadowMapMatrix = Matrix4.multiply(shadowViewProjection, inverseViewProjection, scratchMatrix);

            // Project each corner from camera NDC space to shadow map texture space. Min and max will be from 0 to 1.
            var min = Cartesian3.fromElements(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, scratchMin);
            var max = Cartesian3.fromElements(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, scratchMax);

            for (var k = 0; k < 8; ++k) {
                var corner = Cartesian4.clone(frustumCornersNDC[k], scratchFrustumCorners[k]);
                Matrix4.multiplyByVector(shadowMapMatrix, corner, corner);
                Cartesian3.divideByScalar(corner, corner.w, corner); // Handle the perspective divide
                Cartesian3.minimumByComponent(corner, min, min);
                Cartesian3.maximumByComponent(corner, max, max);
            }

            // Limit min to 0.0. Sometimes precision errors cause it to go slightly negative, which affects the frustum extent computations below.
            min.x = Math.max(min.x, 0.0);
            min.y = Math.max(min.y, 0.0);

            // Always start cascade frustum at the top of the light frustum to capture objects in the light's path
            min.z = 0.0;

            var cascadeCamera = shadowMap._passCameras[j];
            cascadeCamera.clone(shadowMapCamera); // PERFORMANCE_IDEA : could do a shallow clone for all properties except the frustum
            cascadeCamera.frustum.left = left + min.x * (right - left);
            cascadeCamera.frustum.right = left + max.x * (right - left);
            cascadeCamera.frustum.bottom = bottom + min.y * (top - bottom);
            cascadeCamera.frustum.top = bottom + max.y * (top - bottom);
            cascadeCamera.frustum.near = near + min.z * (far - near);
            cascadeCamera.frustum.far = near + max.z * (far - near);

            shadowMap._passCullingVolumes[j] = cascadeCamera.frustum.computeCullingVolume(position, direction, up);

            // Transforms from eye space to the cascade's texture space
            var cascadeMatrix = shadowMap._cascadeMatrices[j];
            Matrix4.multiply(cascadeCamera.getViewProjection(), sceneCamera.inverseViewMatrix, cascadeMatrix);
            Matrix4.multiply(shadowMap._passTextureOffsets[j], cascadeMatrix, cascadeMatrix);
        }
    }

    var scratchLightView = new Matrix4();
    var scratchRight = new Cartesian3();
    var scratchUp = new Cartesian3();
    var scratchMin = new Cartesian3();
    var scratchMax = new Cartesian3();
    var scratchTranslation = new Cartesian3();

    function fitShadowMapToScene(shadowMap, frameState) {
        var shadowMapCamera = shadowMap._shadowMapCamera;
        var sceneCamera = shadowMap._sceneCamera;

        // 1. First find a tight bounding box in light space that contains the entire camera frustum.
        var viewProjection = Matrix4.multiply(sceneCamera.frustum.projectionMatrix, sceneCamera.viewMatrix, scratchMatrix);
        var inverseViewProjection = Matrix4.inverse(viewProjection, scratchMatrix);

        // Start to construct the light view matrix. Set translation later once the bounding box is found.
        var lightDir = shadowMapCamera.directionWC;
        var lightUp = sceneCamera.directionWC; // Align shadows to the camera view.
        var lightRight = Cartesian3.cross(lightDir, lightUp, scratchRight);
        lightUp = Cartesian3.cross(lightRight, lightDir, scratchUp); // Recalculate up now that right is derived
        Cartesian3.normalize(lightUp, lightUp);
        Cartesian3.normalize(lightRight, lightRight);
        var lightPosition = Cartesian3.fromElements(0.0, 0.0, 0.0, scratchTranslation);

        var lightView = Matrix4.computeView(lightDir, lightUp, lightRight, lightPosition, scratchLightView);
        var cameraToLight = Matrix4.multiply(lightView, inverseViewProjection, scratchMatrix);

        // Project each corner from NDC space to light view space, and calculate a min and max in light view space
        var min = Cartesian3.fromElements(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, scratchMin);
        var max = Cartesian3.fromElements(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, scratchMax);

        for (var i = 0; i < 8; ++i) {
            var corner = Cartesian4.clone(frustumCornersNDC[i], scratchFrustumCorners[i]);
            Matrix4.multiplyByVector(cameraToLight, corner, corner);
            Cartesian3.divideByScalar(corner, corner.w, corner); // Handle the perspective divide
            Cartesian3.minimumByComponent(corner, min, min);
            Cartesian3.maximumByComponent(corner, max, max);
        }

        // TODO : This is just an estimate, should take scene geometry into account
        // 2. Set bounding box back to include objects in the light's view
        max.z += 1000.0; // Note: in light space, a positive number is behind the camera

        // 3. Adjust light view matrix so that it is centered on the bounding volume
        var translation = scratchTranslation;
        translation.x = -(0.5 * (min.x + max.x));
        translation.y = -(0.5 * (min.y + max.y));
        translation.z = -max.z;

        var translationMatrix = Matrix4.fromTranslation(translation, scratchMatrix);
        lightView = Matrix4.multiply(translationMatrix, lightView, lightView);

        // 4. Create an orthographic frustum that covers the bounding box extents
        var halfWidth = 0.5 * (max.x - min.x);
        var halfHeight = 0.5 * (max.y - min.y);
        var depth = max.z - min.z;

        shadowMapCamera.frustum.left = -halfWidth;
        shadowMapCamera.frustum.right = halfWidth;
        shadowMapCamera.frustum.bottom = -halfHeight;
        shadowMapCamera.frustum.top = halfHeight;
        shadowMapCamera.frustum.near = 0.01;
        shadowMapCamera.frustum.far = depth;

        // 5. Update the shadow map camera
        Matrix4.clone(lightView, shadowMapCamera.viewMatrix);
        Matrix4.inverse(lightView, shadowMapCamera.inverseViewMatrix);
        frameState.mapProjection.ellipsoid.cartesianToCartographic(shadowMapCamera.positionWC, shadowMapCamera.positionCartographic);
        Matrix4.getTranslation(shadowMapCamera.inverseViewMatrix, shadowMapCamera.positionWC);
        Cartesian3.clone(lightDir, shadowMapCamera.directionWC);
        Cartesian3.clone(lightUp, shadowMapCamera.upWC);
        Cartesian3.clone(lightRight, shadowMapCamera.rightWC);
    }

    var directions = [
        new Cartesian3(-1, 0, 0),
        new Cartesian3(0, -1, 0),
        new Cartesian3(0, 0, -1),
        new Cartesian3(1, 0, 0),
        new Cartesian3(0, 1, 0),
        new Cartesian3(0, 0, 1)
    ];

    var ups = [
        new Cartesian3(0, -1, 0),
        new Cartesian3(0, 0, -1),
        new Cartesian3(0, -1, 0),
        new Cartesian3(0, -1, 0),
        new Cartesian3(0, 0, 1),
        new Cartesian3(0, -1, 0)
    ];

    var rights = [
        new Cartesian3(0, 0, 1),
        new Cartesian3(1, 0, 0),
        new Cartesian3(-1, 0, 0),
        new Cartesian3(0, 0, -1),
        new Cartesian3(1, 0, 0),
        new Cartesian3(1, 0, 0)
    ];

    function computeOmnidirectional(shadowMap) {
        // All sides share the same frustum
        var frustum = new PerspectiveFrustum();
        frustum.fov = CesiumMath.PI_OVER_TWO;
        frustum.near = 1.0;
        frustum.far = shadowMap._radius;
        frustum.aspectRatio = 1.0;

        for (var i = 0; i < 6; ++i) {
            var camera = shadowMap._passCameras[i];
            camera.positionWC = shadowMap._shadowMapCamera.positionWC;
            camera.directionWC = directions[i];
            camera.upWC = ups[i];
            camera.rightWC = rights[i];

            Matrix4.computeView(camera.directionWC, camera.upWC, camera.rightWC, camera.positionWC, camera.viewMatrix);
            Matrix4.inverse(camera.viewMatrix, camera.inverseViewMatrix);

            camera.frustum = frustum;
        }
    }

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchBoundingSphere = new BoundingSphere();
    var scratchCenter = scratchBoundingSphere.center;

    function checkVisibility(shadowMap, frameState) {
        var camera = frameState.camera;
        var lightCamera = shadowMap._lightCamera;
        var sceneCamera = shadowMap._sceneCamera;
        var shadowMapCamera = shadowMap._shadowMapCamera;

        var boundingSphere = scratchBoundingSphere;

        // Check whether the shadow map is in view and needs to be updated
        if (shadowMap._cascadesEnabled) {
            // If the nearest shadow receiver is further than the shadow map's maximum distance then the shadow map is out of view.
            if (sceneCamera.frustum.near > shadowMap._maximumDistance) {
                shadowMap._outOfView = true;
                shadowMap._needsUpdate = false;
                return;
            }

            // If the light source is below the horizon then the shadow map is out of view
            var surfaceNormal = frameState.mapProjection.ellipsoid.geodeticSurfaceNormal(sceneCamera.positionWC, scratchCartesian1);
            var lightDirection = Cartesian3.negate(shadowMapCamera.directionWC, scratchCartesian2);
            var dot = Cartesian3.dot(surfaceNormal, lightDirection);
            if (dot < 0.1) {
                shadowMap._outOfView = true;
                shadowMap._needsUpdate = false;
                return;
            }

            // If the scene camera or light direction changes, then the shadow map needs to update
            var sceneCameraChanged = !Matrix4.equals(sceneCamera.viewMatrix, camera.viewMatrix);
            var directionChanged = !Cartesian3.equals(shadowMapCamera.directionWC, lightCamera.directionWC);
            shadowMap._needsUpdate = sceneCameraChanged || directionChanged;

            // By default cascaded shadows are always in view
            shadowMap._outOfView = false;
        } else if (shadowMap._isPointLight) {
            // Sphere-frustum intersection test
            boundingSphere.center = shadowMapCamera.positionWC;
            boundingSphere.radius = shadowMap._radius;
            shadowMap._outOfView = frameState.cullingVolume.computeVisibility(boundingSphere) === Intersect.OUTSIDE;
            shadowMap._needsUpdate = !shadowMap._outOfView && !shadowMap._boundingSphere.equals(boundingSphere);
            BoundingSphere.clone(boundingSphere, shadowMap._boundingSphere);
        } else {
            // Simplify frustum-frustum intersection test as a sphere-frustum test
            var frustumRadius = shadowMapCamera.frustum.far / 2.0;
            var frustumCenter = Cartesian3.add(shadowMapCamera.positionWC, Cartesian3.multiplyByScalar(shadowMapCamera.directionWC, frustumRadius, scratchCenter), scratchCenter);
            boundingSphere.center = frustumCenter;
            boundingSphere.radius = frustumRadius;
            shadowMap._outOfView = frameState.cullingVolume.computeVisibility(boundingSphere) === Intersect.OUTSIDE;
            shadowMap._needsUpdate = !shadowMap._outOfView && !shadowMap._boundingSphere.equals(boundingSphere);
            BoundingSphere.clone(boundingSphere, shadowMap._boundingSphere);
        }
    }

    function updateCameras(shadowMap, frameState) {
        var camera = frameState.camera; // The actual camera in the scene
        var lightCamera = shadowMap._lightCamera; // The external camera representing the light source
        var sceneCamera = shadowMap._sceneCamera; // Clone of camera, with clamped near and far planes
        var shadowMapCamera = shadowMap._shadowMapCamera; // Camera representing the shadow volume, initially cloned from lightCamera

        if (defined(sceneCamera)) {
            // Skip check on the first frame
            checkVisibility(shadowMap, frameState);
        }

        // Clear the shadow texture when a cascaded shadow map goes out of view (e.g. when the sun dips below the horizon).
        // This prevents objects that still read from the shadow map from reading old values.
        if (shadowMap._cascadesEnabled && !shadowMap._outOfViewPrevious && shadowMap._outOfView) {
            clearFramebuffer(shadowMap, frameState.context);
        }
        shadowMap._outOfViewPrevious = shadowMap._outOfView;

        // Clone light camera into the shadow map camera
        if (shadowMap._cascadesEnabled) {
            Cartesian3.clone(lightCamera.directionWC, shadowMapCamera.directionWC);
        } else if (shadowMap._isPointLight) {
            Cartesian3.clone(lightCamera.positionWC, shadowMapCamera.positionWC);
        } else {
            shadowMapCamera.clone(lightCamera);
        }

        // Get the light direction in eye coordinates
        var lightDirection = shadowMap._lightDirectionEC;
        Matrix4.multiplyByPointAsVector(camera.viewMatrix, shadowMapCamera.directionWC, lightDirection);
        Cartesian3.normalize(lightDirection, lightDirection);
        Cartesian3.negate(lightDirection, lightDirection);

        // Get the light position in eye coordinates
        Matrix4.multiplyByPoint(camera.viewMatrix, shadowMapCamera.positionWC, shadowMap._lightPositionEC);
        shadowMap._lightPositionEC.w = shadowMap._radius;

        // Get the near and far of the scene camera
        var near;
        var far;
        if (shadowMap._fitNearFar) {
            // shadowFar can be very large, so limit to shadowMap._maximumDistance
            near = Math.min(frameState.shadowNear, shadowMap._maximumDistance);
            far = Math.min(frameState.shadowFar, shadowMap._maximumDistance);
        } else {
            near = camera.frustum.near;
            far = shadowMap._maximumDistance;
        }

        shadowMap._sceneCamera = Camera.clone(camera, sceneCamera);
        shadowMap._sceneCamera.frustum.near = near;
        shadowMap._sceneCamera.frustum.far = far;
        shadowMap._distance = far - near;
    }

    ShadowMap.prototype.update = function(frameState) {
        updateCameras(this, frameState);

        if (this._needsUpdate) {
            updateFramebuffer(this, frameState.context);

            if (this._isPointLight) {
                computeOmnidirectional(this);
            }

            if (this._cascadesEnabled) {
                fitShadowMapToScene(this, frameState);

                if (this._numberOfCascades > 1) {
                    computeCascades(this);
                }
            }

            if (!this._isPointLight) {
                // Compute the culling volume
                var position = this._shadowMapCamera.positionWC;
                var direction = this._shadowMapCamera.directionWC;
                var up = this._shadowMapCamera.upWC;
                this._shadowMapCullingVolume = this._shadowMapCamera.frustum.computeCullingVolume(position, direction, up);

                if (this._numberOfPasses === 1) {
                    // Since there is only one pass, use the shadow map camera as the pass camera.
                    this._passCameras[0].clone(this._shadowMapCamera);
                }
            }
        }

        if (this._numberOfPasses === 1) {
            // Transforms from eye space to shadow texture space.
            // Always requires an update since the scene camera constantly changes.
            var inverseView = this._sceneCamera.inverseViewMatrix;
            Matrix4.multiply(this._shadowMapCamera.getViewProjection(), inverseView, this._shadowMapMatrix);
        }

        if (this.debugShow) {
            applyDebugSettings(this, frameState);
        }
    };

    ShadowMap.prototype.updatePass = function(context, pass) {
        clearFramebuffer(this, context, pass);
    };

    var scratchTexelStepSize = new Cartesian2();
    var scratchUniformCartesian3 = new Cartesian3();
    var scratchUniformCartesian4 = new Cartesian4();

    ShadowMap.prototype.combineUniforms = function(uniforms, isTerrain) {
        var bias = this._isPointLight ? this._pointBias : (isTerrain ? this._terrainBias : this._primitiveBias);

        var that = this;
        var mapUniforms = {
            u_shadowMapTexture :function() {
                return that._shadowMapTexture;
            },
            u_shadowMapTextureCube : function() {
                return that._shadowMapTexture;
            },
            u_shadowMapMatrix : function() {
                return that._shadowMapMatrix;
            },
            u_shadowMapCascadeSplits : function() {
                return that._cascadeSplits;
            },
            u_shadowMapCascadeMatrices : function() {
                return that._cascadeMatrices;
            },
            u_shadowMapLightDirectionEC : function() {
                return that._lightDirectionEC;
            },
            u_shadowMapLightPositionEC : function() {
                return that._lightPositionEC;
            },
            u_shadowMapCascadeDistances : function() {
                return that._cascadeDistances;
            },
            u_shadowMapTexelSizeDepthBiasAndNormalShadingSmooth : function() {
                var texelStepSize = scratchTexelStepSize;
                texelStepSize.x = 1.0 / that._textureSize.x;
                texelStepSize.y = 1.0 / that._textureSize.y;

                return Cartesian4.fromElements(texelStepSize.x, texelStepSize.y, bias.depthBias, bias.normalShadingSmooth, scratchUniformCartesian4);
            },
            u_shadowMapNormalOffsetScaleDistanceAndMaxDistance : function() {
                return Cartesian3.fromElements(bias.normalOffsetScale, that._distance, that._maximumDistance, scratchUniformCartesian3);
            }
        };

        return combine(uniforms, mapUniforms);
    };

    ShadowMap.prototype.isDestroyed = function() {
        return false;
    };

    ShadowMap.prototype.destroy = function() {
        destroyFramebuffer(this);

        this._debugLightFrustum = this._debugLightFrustum && this._debugLightFrustum.destroy();
        this._debugCameraFrustum = this._debugCameraFrustum && this._debugCameraFrustum.destroy();
        this._debugShadowViewCommand = this._debugShadowViewCommand && this._debugShadowViewCommand.shaderProgram && this._debugShadowViewCommand.shaderProgram.destroy();

        for (var i = 0; i < this._numberOfCascades; ++i) {
            this._debugCascadeFrustums[i] = this._debugCascadeFrustums[i] && this._debugCascadeFrustums[i].destroy();
        }

        return destroyObject(this);
    };

    return ShadowMap;
});
