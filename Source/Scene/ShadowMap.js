import BoundingRectangle from '../Core/BoundingRectangle.js';
import BoundingSphere from '../Core/BoundingSphere.js';
import BoxOutlineGeometry from '../Core/BoxOutlineGeometry.js';
import Cartesian2 from '../Core/Cartesian2.js';
import Cartesian3 from '../Core/Cartesian3.js';
import Cartesian4 from '../Core/Cartesian4.js';
import Cartographic from '../Core/Cartographic.js';
import clone from '../Core/clone.js';
import Color from '../Core/Color.js';
import ColorGeometryInstanceAttribute from '../Core/ColorGeometryInstanceAttribute.js';
import combine from '../Core/combine.js';
import CullingVolume from '../Core/CullingVolume.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import destroyObject from '../Core/destroyObject.js';
import DeveloperError from '../Core/DeveloperError.js';
import FeatureDetection from '../Core/FeatureDetection.js';
import GeometryInstance from '../Core/GeometryInstance.js';
import Intersect from '../Core/Intersect.js';
import CesiumMath from '../Core/Math.js';
import Matrix4 from '../Core/Matrix4.js';
import OrthographicOffCenterFrustum from '../Core/OrthographicOffCenterFrustum.js';
import PerspectiveFrustum from '../Core/PerspectiveFrustum.js';
import PixelFormat from '../Core/PixelFormat.js';
import Quaternion from '../Core/Quaternion.js';
import SphereOutlineGeometry from '../Core/SphereOutlineGeometry.js';
import WebGLConstants from '../Core/WebGLConstants.js';
import ClearCommand from '../Renderer/ClearCommand.js';
import ContextLimits from '../Renderer/ContextLimits.js';
import CubeMap from '../Renderer/CubeMap.js';
import DrawCommand from '../Renderer/DrawCommand.js';
import Framebuffer from '../Renderer/Framebuffer.js';
import Pass from '../Renderer/Pass.js';
import PassState from '../Renderer/PassState.js';
import PixelDatatype from '../Renderer/PixelDatatype.js';
import Renderbuffer from '../Renderer/Renderbuffer.js';
import RenderbufferFormat from '../Renderer/RenderbufferFormat.js';
import RenderState from '../Renderer/RenderState.js';
import Sampler from '../Renderer/Sampler.js';
import Texture from '../Renderer/Texture.js';
import TextureMagnificationFilter from '../Renderer/TextureMagnificationFilter.js';
import TextureMinificationFilter from '../Renderer/TextureMinificationFilter.js';
import TextureWrap from '../Renderer/TextureWrap.js';
import Camera from './Camera.js';
import CullFace from './CullFace.js';
import DebugCameraPrimitive from './DebugCameraPrimitive.js';
import PerInstanceColorAppearance from './PerInstanceColorAppearance.js';
import Primitive from './Primitive.js';
import ShadowMapShader from './ShadowMapShader.js';

    /**
     * Use {@link Viewer#shadowMap} to get the scene's shadow map originating from the sun. Do not construct this directly.
     *
     * <p>
     * The normalOffset bias pushes the shadows forward slightly, and may be disabled
     * for applications that require ultra precise shadows.
     * </p>
     *
     * @alias ShadowMap
     * @internalConstructor
     * @class
     *
     * @param {Object} options An object containing the following properties:
     * @param {Camera} options.lightCamera A camera representing the light source.
     * @param {Boolean} [options.enabled=true] Whether the shadow map is enabled.
     * @param {Boolean} [options.isPointLight=false] Whether the light source is a point light. Point light shadows do not use cascades.
     * @param {Boolean} [options.pointLightRadius=100.0] Radius of the point light.
     * @param {Boolean} [options.cascadesEnabled=true] Use multiple shadow maps to cover different partitions of the view frustum.
     * @param {Number} [options.numberOfCascades=4] The number of cascades to use for the shadow map. Supported values are one and four.
     * @param {Number} [options.maximumDistance=5000.0] The maximum distance used for generating cascaded shadows. Lower values improve shadow quality.
     * @param {Number} [options.size=2048] The width and height, in pixels, of each shadow map.
     * @param {Boolean} [options.softShadows=false] Whether percentage-closer-filtering is enabled for producing softer shadows.
     * @param {Number} [options.darkness=0.3] The shadow darkness.
     * @param {Boolean} [options.normalOffset=true] Whether a normal bias is applied to shadows.
     *
     * @exception {DeveloperError} Only one or four cascades are supported.
     *
     * @demo {@link https://sandcastle.cesium.com/index.html?src=Shadows.html|Cesium Sandcastle Shadows Demo}
     */
    function ShadowMap(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        // options.context is an undocumented option
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

        this._enabled = defaultValue(options.enabled, true);
        this._softShadows = defaultValue(options.softShadows, false);
        this._normalOffset = defaultValue(options.normalOffset, true);
        this.dirty = true;

        /**
         * Specifies whether the shadow map originates from a light source. Shadow maps that are used for analytical
         * purposes should set this to false so as not to affect scene rendering.
         *
         * @private
         */
        this.fromLightSource = defaultValue(options.fromLightSource, true);

        /**
         * Determines the darkness of the shadows.
         *
         * @type {Number}
         * @default 0.3
         */
        this.darkness = defaultValue(options.darkness, 0.3);
        this._darkness = this.darkness;

        /**
         * Determines the maximum distance of the shadow map. Only applicable for cascaded shadows. Larger distances may result in lower quality shadows.
         *
         * @type {Number}
         * @default 5000.0
         */
        this.maximumDistance = defaultValue(options.maximumDistance, 5000.0);

        this._outOfView = false;
        this._outOfViewPrevious = false;
        this._needsUpdate = true;

        // In IE11 and Edge polygon offset is not functional.
        // TODO : Also disabled for instances of Firefox and Chrome running ANGLE that do not support depth textures.
        // Re-enable once https://github.com/AnalyticalGraphicsInc/cesium/issues/4560 is resolved.
        var polygonOffsetSupported = true;
        if (FeatureDetection.isInternetExplorer() || FeatureDetection.isEdge() || ((FeatureDetection.isChrome() || FeatureDetection.isFirefox()) && FeatureDetection.isWindows() && !context.depthTexture)) {
            polygonOffsetSupported = false;
        }
        this._polygonOffsetSupported = polygonOffsetSupported;

        this._terrainBias = {
            polygonOffset : polygonOffsetSupported,
            polygonOffsetFactor : 1.1,
            polygonOffsetUnits : 4.0,
            normalOffset : this._normalOffset,
            normalOffsetScale : 0.5,
            normalShading : true,
            normalShadingSmooth : 0.3,
            depthBias : 0.0001
        };

        this._primitiveBias = {
            polygonOffset : polygonOffsetSupported,
            polygonOffsetFactor : 1.1,
            polygonOffsetUnits : 4.0,
            normalOffset : this._normalOffset,
            normalOffsetScale : 0.1,
            normalShading : true,
            normalShadingSmooth : 0.05,
            depthBias : 0.00002
        };

        this._pointBias = {
            polygonOffset : false,
            polygonOffsetFactor : 1.1,
            polygonOffsetUnits : 4.0,
            normalOffset : this._normalOffset,
            normalOffsetScale : 0.0,
            normalShading : true,
            normalShadingSmooth : 0.1,
            depthBias : 0.0005
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

        this._lightCamera = options.lightCamera;
        this._shadowMapCamera = new ShadowMapCamera();
        this._shadowMapCullingVolume = undefined;
        this._sceneCamera = undefined;
        this._boundingSphere = new BoundingSphere();

        this._isPointLight = defaultValue(options.isPointLight, false);
        this._pointLightRadius = defaultValue(options.pointLightRadius, 100.0);

        this._cascadesEnabled = this._isPointLight ? false : defaultValue(options.cascadesEnabled, true);
        this._numberOfCascades = !this._cascadesEnabled ? 0 : defaultValue(options.numberOfCascades, 4);
        this._fitNearFar = true;
        this._maximumCascadeDistances = [25.0, 150.0, 700.0, Number.MAX_VALUE];

        this._textureSize = new Cartesian2();

        this._isSpotLight = false;
        if (this._cascadesEnabled) {
            // Cascaded shadows are always orthographic. The frustum dimensions are calculated on the fly.
            this._shadowMapCamera.frustum = new OrthographicOffCenterFrustum();
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

        this._passes = new Array(numberOfPasses);
        for (var i = 0; i < numberOfPasses; ++i) {
            this._passes[i] = new ShadowPass(context);
        }

        this.debugShow = false;
        this.debugFreezeFrame = false;
        this._debugFreezeFrame = false;
        this._debugCascadeColors = false;
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

        this._size = defaultValue(options.size, 2048);
        this.size = this._size;
    }

    /**
     * Global maximum shadow distance used to prevent far off receivers from extending
     * the shadow far plane. This helps set a tighter near/far when viewing objects from space.
     *
     * @private
     */
    ShadowMap.MAXIMUM_DISTANCE = 20000.0;

    function ShadowPass(context) {
        this.camera = new ShadowMapCamera();
        this.passState = new PassState(context);
        this.framebuffer = undefined;
        this.textureOffsets = undefined;
        this.commandList = [];
        this.cullingVolume = undefined;
    }

    function createRenderState(colorMask, bias) {
        return RenderState.fromCache({
            cull : {
                enabled : true,
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

    /**
     * @private
     */
    ShadowMap.prototype.debugCreateRenderStates = function() {
        createRenderStates(this);
    };

    defineProperties(ShadowMap.prototype, {
        /**
         * Determines if the shadow map will be shown.
         *
         * @memberof ShadowMap.prototype
         * @type {Boolean}
         * @default true
         */
        enabled : {
            get : function() {
                return this._enabled;
            },
            set : function(value) {
                this.dirty = this._enabled !== value;
                this._enabled = value;
            }
        },

        /**
         * Determines if a normal bias will be applied to shadows.
         *
         * @memberof ShadowMap.prototype
         * @type {Boolean}
         * @default true
         */
        normalOffset : {
            get : function() {
                return this._normalOffset;
            },
            set : function(value) {
                this.dirty = this._normalOffset !== value;
                this._normalOffset = value;
                this._terrainBias.normalOffset = value;
                this._primitiveBias.normalOffset = value;
                this._pointBias.normalOffset = value;
            }
        },

        /**
         * Determines if soft shadows are enabled. Uses pcf filtering which requires more texture reads and may hurt performance.
         *
         * @memberof ShadowMap.prototype
         * @type {Boolean}
         * @default false
         */
        softShadows : {
            get : function() {
                return this._softShadows;
            },
            set : function(value) {
                this.dirty = this._softShadows !== value;
                this._softShadows = value;
            }
        },

        /**
         * The width and height, in pixels, of each shadow map.
         *
         * @memberof ShadowMap.prototype
         * @type {Number}
         * @default 2048
         */
        size : {
            get : function() {
                return this._size;
            },
            set : function(value) {
                resize(this, value);
            }
        },

        /**
         * Whether the shadow map is out of view of the scene camera.
         *
         * @memberof ShadowMap.prototype
         * @type {Boolean}
         * @readonly
         * @private
         */
        outOfView : {
            get : function() {
                return this._outOfView;
            }
        },

        /**
         * The culling volume of the shadow frustum.
         *
         * @memberof ShadowMap.prototype
         * @type {CullingVolume}
         * @readonly
         * @private
         */
        shadowMapCullingVolume : {
            get : function() {
                return this._shadowMapCullingVolume;
            }
        },

        /**
         * The passes used for rendering shadows. Each face of a point light or each cascade for a cascaded shadow map is a separate pass.
         *
         * @memberof ShadowMap.prototype
         * @type {ShadowPass[]}
         * @readonly
         * @private
         */
        passes : {
            get : function() {
                return this._passes;
            }
        },

        /**
         * Whether the light source is a point light.
         *
         * @memberof ShadowMap.prototype
         * @type {Boolean}
         * @readonly
         * @private
         */
        isPointLight : {
            get : function() {
                return this._isPointLight;
            }
        },

        /**
         * Debug option for visualizing the cascades by color.
         *
         * @memberof ShadowMap.prototype
         * @type {Boolean}
         * @default false
         * @private
         */
        debugCascadeColors : {
            get : function() {
                return this._debugCascadeColors;
            },
            set : function(value) {
                this.dirty = this._debugCascadeColors !== value;
                this._debugCascadeColors = value;
            }
        }
    });

    function destroyFramebuffer(shadowMap) {
        var length = shadowMap._passes.length;
        for (var i = 0; i < length; ++i) {
            var pass = shadowMap._passes[i];
            var framebuffer = pass.framebuffer;
            if (defined(framebuffer) && !framebuffer.isDestroyed()) {
                framebuffer.destroy();
            }
            pass.framebuffer = undefined;
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

        var length = shadowMap._passes.length;
        for (var i = 0; i < length; ++i) {
            var pass = shadowMap._passes[i];
            pass.framebuffer = framebuffer;
            pass.passState.framebuffer = framebuffer;
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

        var length = shadowMap._passes.length;
        for (var i = 0; i < length; ++i) {
            var pass = shadowMap._passes[i];
            pass.framebuffer = framebuffer;
            pass.passState.framebuffer = framebuffer;
        }

        shadowMap._shadowMapTexture = depthStencilTexture;
        shadowMap._depthAttachment = depthStencilTexture;
    }

    function createFramebufferCube(shadowMap, context) {
        var depthRenderbuffer = new Renderbuffer({
            context : context,
            width : shadowMap._textureSize.x,
            height : shadowMap._textureSize.y,
            format : RenderbufferFormat.DEPTH_COMPONENT16
        });

        var cubeMap = new CubeMap({
            context : context,
            width : shadowMap._textureSize.x,
            height : shadowMap._textureSize.y,
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
            var pass = shadowMap._passes[i];
            pass.framebuffer = framebuffer;
            pass.passState.framebuffer = framebuffer;
        }

        shadowMap._shadowMapTexture = cubeMap;
        shadowMap._depthAttachment = depthRenderbuffer;
        shadowMap._colorAttachment = cubeMap;
    }

    function createFramebuffer(shadowMap, context) {
        if (shadowMap._isPointLight) {
            createFramebufferCube(shadowMap, context);
        } else if (shadowMap._usesDepthTexture) {
            createFramebufferDepth(shadowMap, context);
        } else {
            createFramebufferColor(shadowMap, context);
        }
    }

    function checkFramebuffer(shadowMap, context) {
        // Attempt to make an FBO with only a depth texture. If it fails, fallback to a color texture.
        if (shadowMap._usesDepthTexture && (shadowMap._passes[0].framebuffer.status !== WebGLConstants.FRAMEBUFFER_COMPLETE)) {
            shadowMap._usesDepthTexture = false;
            createRenderStates(shadowMap);
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
        }
    }

    function updateFramebuffer(shadowMap, context) {
        if (!defined(shadowMap._passes[0].framebuffer) || (shadowMap._shadowMapTexture.width !== shadowMap._textureSize.x)) {
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
            checkFramebuffer(shadowMap, context);
            clearFramebuffer(shadowMap, context);
        }
    }

    function clearFramebuffer(shadowMap, context, shadowPass) {
        shadowPass = defaultValue(shadowPass, 0);
        if (shadowMap._isPointLight || (shadowPass === 0)) {
            shadowMap._clearCommand.framebuffer = shadowMap._passes[shadowPass].framebuffer;
            shadowMap._clearCommand.execute(context, shadowMap._clearPassState);
        }
    }

    function resize(shadowMap, size) {
        shadowMap._size = size;
        var passes = shadowMap._passes;
        var numberOfPasses = passes.length;
        var textureSize = shadowMap._textureSize;

        if (shadowMap._isPointLight) {
            size = (ContextLimits.maximumCubeMapSize >= size) ? size : ContextLimits.maximumCubeMapSize;
            textureSize.x = size;
            textureSize.y = size;
            var faceViewport = new BoundingRectangle(0, 0, size, size);
            passes[0].passState.viewport = faceViewport;
            passes[1].passState.viewport = faceViewport;
            passes[2].passState.viewport = faceViewport;
            passes[3].passState.viewport = faceViewport;
            passes[4].passState.viewport = faceViewport;
            passes[5].passState.viewport = faceViewport;
        } else if (numberOfPasses === 1) {
            // +----+
            // |  1 |
            // +----+
            size = (ContextLimits.maximumTextureSize >= size) ? size : ContextLimits.maximumTextureSize;
            textureSize.x = size;
            textureSize.y = size;
            passes[0].passState.viewport = new BoundingRectangle(0, 0, size, size);
        } else if (numberOfPasses === 4) {
            // +----+----+
            // |  3 |  4 |
            // +----+----+
            // |  1 |  2 |
            // +----+----+
            size = (ContextLimits.maximumTextureSize >= size * 2) ? size : ContextLimits.maximumTextureSize / 2;
            textureSize.x = size * 2;
            textureSize.y = size * 2;
            passes[0].passState.viewport = new BoundingRectangle(0, 0, size, size);
            passes[1].passState.viewport = new BoundingRectangle(size, 0, size, size);
            passes[2].passState.viewport = new BoundingRectangle(0, size, size, size);
            passes[3].passState.viewport = new BoundingRectangle(size, size, size, size);
        }

        // Update clear pass state
        shadowMap._clearPassState.viewport = new BoundingRectangle(0, 0, textureSize.x, textureSize.y);

        // Transforms shadow coordinates [0, 1] into the pass's region of the texture
        for (var i = 0; i < numberOfPasses; ++i) {
            var pass = passes[i];
            var viewport = pass.passState.viewport;
            var biasX = viewport.x / textureSize.x;
            var biasY = viewport.y / textureSize.y;
            var scaleX = viewport.width / textureSize.x;
            var scaleY = viewport.height / textureSize.y;
            pass.textureOffsets = new Matrix4(scaleX, 0.0, 0.0, biasX, 0.0, scaleY, 0.0, biasY, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
        }
    }

    var scratchViewport = new BoundingRectangle();

    function createDebugShadowViewCommand(shadowMap, context) {
        var fs;
        if (shadowMap._isPointLight) {
            fs = 'uniform samplerCube shadowMap_textureCube; \n' +
                 'varying vec2 v_textureCoordinates; \n' +
                 'void main() \n' +
                 '{ \n' +
                 '    vec2 uv = v_textureCoordinates; \n' +
                 '    vec3 dir; \n' +
                 ' \n' +
                 '    if (uv.y < 0.5) \n' +
                 '    { \n' +
                 '        if (uv.x < 0.333) \n' +
                 '        { \n' +
                 '            dir.x = -1.0; \n' +
                 '            dir.y = uv.x * 6.0 - 1.0; \n' +
                 '            dir.z = uv.y * 4.0 - 1.0; \n' +
                 '        } \n' +
                 '        else if (uv.x < 0.666) \n' +
                 '        { \n' +
                 '            dir.y = -1.0; \n' +
                 '            dir.x = uv.x * 6.0 - 3.0; \n' +
                 '            dir.z = uv.y * 4.0 - 1.0; \n' +
                 '        } \n' +
                 '        else \n' +
                 '        { \n' +
                 '            dir.z = -1.0; \n' +
                 '            dir.x = uv.x * 6.0 - 5.0; \n' +
                 '            dir.y = uv.y * 4.0 - 1.0; \n' +
                 '        } \n' +
                 '    } \n' +
                 '    else \n' +
                 '    { \n' +
                 '        if (uv.x < 0.333) \n' +
                 '        { \n' +
                 '            dir.x = 1.0; \n' +
                 '            dir.y = uv.x * 6.0 - 1.0; \n' +
                 '            dir.z = uv.y * 4.0 - 3.0; \n' +
                 '        } \n' +
                 '        else if (uv.x < 0.666) \n' +
                 '        { \n' +
                 '            dir.y = 1.0; \n' +
                 '            dir.x = uv.x * 6.0 - 3.0; \n' +
                 '            dir.z = uv.y * 4.0 - 3.0; \n' +
                 '        } \n' +
                 '        else \n' +
                 '        { \n' +
                 '            dir.z = 1.0; \n' +
                 '            dir.x = uv.x * 6.0 - 5.0; \n' +
                 '            dir.y = uv.y * 4.0 - 3.0; \n' +
                 '        } \n' +
                 '    } \n' +
                 ' \n' +
                 '    float shadow = czm_unpackDepth(textureCube(shadowMap_textureCube, dir)); \n' +
                 '    gl_FragColor = vec4(vec3(shadow), 1.0); \n' +
                 '} \n';
        } else {
            fs = 'uniform sampler2D shadowMap_texture; \n' +
                 'varying vec2 v_textureCoordinates; \n' +
                 'void main() \n' +
                 '{ \n' +

                 (shadowMap._usesDepthTexture ?
                 '    float shadow = texture2D(shadowMap_texture, v_textureCoordinates).r; \n' :
                 '    float shadow = czm_unpackDepth(texture2D(shadowMap_texture, v_textureCoordinates)); \n') +

                 '    gl_FragColor = vec4(vec3(shadow), 1.0); \n' +
                 '} \n';
        }

        var drawCommand = context.createViewportQuadCommand(fs, {
            uniformMap : {
                shadowMap_texture : function() {
                    return shadowMap._shadowMapTexture;
                },
                shadowMap_textureCube : function() {
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
            debugCommand = createDebugShadowViewCommand(shadowMap, context);
            shadowMap._debugShadowViewCommand = debugCommand;
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
    frustumCornersNDC[0] = new Cartesian4(-1.0, -1.0, -1.0, 1.0);
    frustumCornersNDC[1] = new Cartesian4(1.0, -1.0, -1.0, 1.0);
    frustumCornersNDC[2] = new Cartesian4(1.0, 1.0, -1.0, 1.0);
    frustumCornersNDC[3] = new Cartesian4(-1.0, 1.0, -1.0, 1.0);
    frustumCornersNDC[4] = new Cartesian4(-1.0, -1.0, 1.0, 1.0);
    frustumCornersNDC[5] = new Cartesian4(1.0, -1.0, 1.0, 1.0);
    frustumCornersNDC[6] = new Cartesian4(1.0, 1.0, 1.0, 1.0);
    frustumCornersNDC[7] = new Cartesian4(-1.0, 1.0, 1.0, 1.0);

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

    var debugOutlineColors = [Color.RED, Color.GREEN, Color.BLUE, Color.MAGENTA];
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
                shadowMap._debugCameraFrustum = new DebugCameraPrimitive({
                    camera : shadowMap._sceneCamera,
                    color : Color.CYAN,
                    updateOnChange : false
                });
            }
            shadowMap._debugCameraFrustum.update(frameState);
        }

        if (shadowMap._cascadesEnabled) {
            // Draw cascades only in freeze frame mode
            if (shadowMap.debugFreezeFrame) {
                if (enterFreezeFrame) {
                    // Recreate debug frustum when entering freeze frame mode
                    shadowMap._debugLightFrustum = shadowMap._debugLightFrustum && shadowMap._debugLightFrustum.destroy();
                    shadowMap._debugLightFrustum = new DebugCameraPrimitive({
                        camera : shadowMap._shadowMapCamera,
                        color : Color.YELLOW,
                        updateOnChange : false
                    });
                }
                shadowMap._debugLightFrustum.update(frameState);

                for (var i = 0; i < shadowMap._numberOfCascades; ++i) {
                    if (enterFreezeFrame) {
                        // Recreate debug frustum when entering freeze frame mode
                        shadowMap._debugCascadeFrustums[i] = shadowMap._debugCascadeFrustums[i] && shadowMap._debugCascadeFrustums[i].destroy();
                        shadowMap._debugCascadeFrustums[i] = new DebugCameraPrimitive({
                            camera : shadowMap._passes[i].camera,
                            color : debugOutlineColors[i],
                            updateOnChange : false
                        });
                    }
                    shadowMap._debugCascadeFrustums[i].update(frameState);
                }
            }
        } else if (shadowMap._isPointLight) {
            if (!defined(shadowMap._debugLightFrustum) || shadowMap._needsUpdate) {
                var translation = shadowMap._shadowMapCamera.positionWC;
                var rotation = Quaternion.IDENTITY;
                var uniformScale = shadowMap._pointLightRadius * 2.0;
                var scale = Cartesian3.fromElements(uniformScale, uniformScale, uniformScale, scratchScale);
                var modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(translation, rotation, scale, scratchMatrix);

                shadowMap._debugLightFrustum = shadowMap._debugLightFrustum && shadowMap._debugLightFrustum.destroy();
                shadowMap._debugLightFrustum = createDebugPointLight(modelMatrix, Color.YELLOW);
            }
            shadowMap._debugLightFrustum.update(frameState);
        } else {
            if (!defined(shadowMap._debugLightFrustum) || shadowMap._needsUpdate) {
                shadowMap._debugLightFrustum = new DebugCameraPrimitive({
                    camera : shadowMap._shadowMapCamera,
                    color : Color.YELLOW,
                    updateOnChange : false
                });
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
        this.directionWC = Cartesian3.clone(Cartesian3.UNIT_Z);
        this.upWC = Cartesian3.clone(Cartesian3.UNIT_Y);
        this.rightWC = Cartesian3.clone(Cartesian3.UNIT_X);
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

    var scratchSplits = new Array(5);
    var scratchFrustum = new PerspectiveFrustum();
    var scratchCascadeDistances = new Array(4);
    var scratchMin = new Cartesian3();
    var scratchMax = new Cartesian3();

    function computeCascades(shadowMap, frameState) {
        var shadowMapCamera = shadowMap._shadowMapCamera;
        var sceneCamera = shadowMap._sceneCamera;
        var cameraNear = sceneCamera.frustum.near;
        var cameraFar = sceneCamera.frustum.far;
        var numberOfCascades = shadowMap._numberOfCascades;

        // Split cascades. Use a mix of linear and log splits.
        var i;
        var range = cameraFar - cameraNear;
        var ratio = cameraFar / cameraNear;

        var lambda = 0.9;
        var clampCascadeDistances = false;

        // When the camera is close to a relatively small model, provide more detail in the closer cascades.
        // If the camera is near or inside a large model, such as the root tile of a city, then use the default values.
        // To get the most accurate cascade splits we would need to find the min and max values from the depth texture.
        if (frameState.shadowState.closestObjectSize < 200.0) {
            clampCascadeDistances = true;
            lambda = 0.9;
        }

        var cascadeDistances = scratchCascadeDistances;
        var splits = scratchSplits;
        splits[0] = cameraNear;
        splits[numberOfCascades] = cameraFar;

        // Find initial splits
        for (i = 0; i < numberOfCascades; ++i) {
            var p = (i + 1) / numberOfCascades;
            var logScale = cameraNear * Math.pow(ratio, p);
            var uniformScale = cameraNear + range * p;
            var split = CesiumMath.lerp(uniformScale, logScale, lambda);
            splits[i + 1] = split;
            cascadeDistances[i] = split - splits[i];
        }

        if (clampCascadeDistances) {
            // Clamp each cascade to its maximum distance
            for (i = 0; i < numberOfCascades; ++i) {
                cascadeDistances[i] = Math.min(cascadeDistances[i], shadowMap._maximumCascadeDistances[i]);
            }

            // Recompute splits
            var distance = splits[0];
            for (i = 0; i < numberOfCascades - 1; ++i) {
                distance += cascadeDistances[i];
                splits[i + 1] = distance;
            }
        }

        Cartesian4.unpack(splits, 0, shadowMap._cascadeSplits[0]);
        Cartesian4.unpack(splits, 1, shadowMap._cascadeSplits[1]);
        Cartesian4.unpack(cascadeDistances, 0, shadowMap._cascadeDistances);

        var shadowFrustum = shadowMapCamera.frustum;
        var left = shadowFrustum.left;
        var right = shadowFrustum.right;
        var bottom = shadowFrustum.bottom;
        var top = shadowFrustum.top;
        var near = shadowFrustum.near;
        var far = shadowFrustum.far;

        var position = shadowMapCamera.positionWC;
        var direction = shadowMapCamera.directionWC;
        var up = shadowMapCamera.upWC;

        var cascadeSubFrustum = sceneCamera.frustum.clone(scratchFrustum);
        var shadowViewProjection = shadowMapCamera.getViewProjection();

        for (i = 0; i < numberOfCascades; ++i) {
            // Find the bounding box of the camera sub-frustum in shadow map texture space
            cascadeSubFrustum.near = splits[i];
            cascadeSubFrustum.far = splits[i + 1];
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

            // Limit light-space coordinates to the [0, 1] range
            min.x = Math.max(min.x, 0.0);
            min.y = Math.max(min.y, 0.0);
            min.z = 0.0; // Always start cascade frustum at the top of the light frustum to capture objects in the light's path
            max.x = Math.min(max.x, 1.0);
            max.y = Math.min(max.y, 1.0);
            max.z = Math.min(max.z, 1.0);

            var pass = shadowMap._passes[i];
            var cascadeCamera = pass.camera;
            cascadeCamera.clone(shadowMapCamera); // PERFORMANCE_IDEA : could do a shallow clone for all properties except the frustum

            var frustum = cascadeCamera.frustum;
            frustum.left = left + min.x * (right - left);
            frustum.right = left + max.x * (right - left);
            frustum.bottom = bottom + min.y * (top - bottom);
            frustum.top = bottom + max.y * (top - bottom);
            frustum.near = near + min.z * (far - near);
            frustum.far = near + max.z * (far - near);

            pass.cullingVolume = cascadeCamera.frustum.computeCullingVolume(position, direction, up);

            // Transforms from eye space to the cascade's texture space
            var cascadeMatrix = shadowMap._cascadeMatrices[i];
            Matrix4.multiply(cascadeCamera.getViewProjection(), sceneCamera.inverseViewMatrix, cascadeMatrix);
            Matrix4.multiply(pass.textureOffsets, cascadeMatrix, cascadeMatrix);
        }
    }

    var scratchLightView = new Matrix4();
    var scratchRight = new Cartesian3();
    var scratchUp = new Cartesian3();
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

        var lightView = Matrix4.computeView(lightPosition, lightDir, lightUp, lightRight, scratchLightView);
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

        // 2. Set bounding box back to include objects in the light's view
        max.z += 1000.0; // Note: in light space, a positive number is behind the camera
        min.z -= 10.0; // Extend the shadow volume forward slightly to avoid problems right at the edge

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

        var frustum = shadowMapCamera.frustum;
        frustum.left = -halfWidth;
        frustum.right = halfWidth;
        frustum.bottom = -halfHeight;
        frustum.top = halfHeight;
        frustum.near = 0.01;
        frustum.far = depth;

        // 5. Update the shadow map camera
        Matrix4.clone(lightView, shadowMapCamera.viewMatrix);
        Matrix4.inverse(lightView, shadowMapCamera.inverseViewMatrix);
        Matrix4.getTranslation(shadowMapCamera.inverseViewMatrix, shadowMapCamera.positionWC);
        frameState.mapProjection.ellipsoid.cartesianToCartographic(shadowMapCamera.positionWC, shadowMapCamera.positionCartographic);
        Cartesian3.clone(lightDir, shadowMapCamera.directionWC);
        Cartesian3.clone(lightUp, shadowMapCamera.upWC);
        Cartesian3.clone(lightRight, shadowMapCamera.rightWC);
    }

    var directions = [
        new Cartesian3(-1.0, 0.0, 0.0),
        new Cartesian3(0.0, -1.0, 0.0),
        new Cartesian3(0.0, 0.0, -1.0),
        new Cartesian3(1.0, 0.0, 0.0),
        new Cartesian3(0.0, 1.0, 0.0),
        new Cartesian3(0.0, 0.0, 1.0)
    ];

    var ups = [
        new Cartesian3(0.0, -1.0, 0.0),
        new Cartesian3(0.0, 0.0, -1.0),
        new Cartesian3(0.0, -1.0, 0.0),
        new Cartesian3(0.0, -1.0, 0.0),
        new Cartesian3(0.0, 0.0, 1.0),
        new Cartesian3(0.0, -1.0, 0.0)
    ];

    var rights = [
        new Cartesian3(0.0, 0.0, 1.0),
        new Cartesian3(1.0, 0.0, 0.0),
        new Cartesian3(-1.0, 0.0, 0.0),
        new Cartesian3(0.0, 0.0, -1.0),
        new Cartesian3(1.0, 0.0, 0.0),
        new Cartesian3(1.0, 0.0, 0.0)
    ];

    function computeOmnidirectional(shadowMap, frameState) {
        // All sides share the same frustum
        var frustum = new PerspectiveFrustum();
        frustum.fov = CesiumMath.PI_OVER_TWO;
        frustum.near = 1.0;
        frustum.far = shadowMap._pointLightRadius;
        frustum.aspectRatio = 1.0;

        for (var i = 0; i < 6; ++i) {
            var camera = shadowMap._passes[i].camera;
            camera.positionWC = shadowMap._shadowMapCamera.positionWC;
            camera.positionCartographic = frameState.mapProjection.ellipsoid.cartesianToCartographic(camera.positionWC, camera.positionCartographic);
            camera.directionWC = directions[i];
            camera.upWC = ups[i];
            camera.rightWC = rights[i];

            Matrix4.computeView(camera.positionWC, camera.directionWC, camera.upWC, camera.rightWC, camera.viewMatrix);
            Matrix4.inverse(camera.viewMatrix, camera.inverseViewMatrix);

            camera.frustum = frustum;
        }
    }

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchBoundingSphere = new BoundingSphere();
    var scratchCenter = scratchBoundingSphere.center;

    function checkVisibility(shadowMap, frameState) {
        var sceneCamera = shadowMap._sceneCamera;
        var shadowMapCamera = shadowMap._shadowMapCamera;

        var boundingSphere = scratchBoundingSphere;

        // Check whether the shadow map is in view and needs to be updated
        if (shadowMap._cascadesEnabled) {
            // If the nearest shadow receiver is further than the shadow map's maximum distance then the shadow map is out of view.
            if (sceneCamera.frustum.near >= shadowMap.maximumDistance) {
                shadowMap._outOfView = true;
                shadowMap._needsUpdate = false;
                return;
            }

            // If the light source is below the horizon then the shadow map is out of view
            var surfaceNormal = frameState.mapProjection.ellipsoid.geodeticSurfaceNormal(sceneCamera.positionWC, scratchCartesian1);
            var lightDirection = Cartesian3.negate(shadowMapCamera.directionWC, scratchCartesian2);
            var dot = Cartesian3.dot(surfaceNormal, lightDirection);

            // Shadows start to fade out once the light gets closer to the horizon.
            // At this point the globe uses vertex lighting alone to darken the surface.
            var darknessAmount = CesiumMath.clamp(dot / 0.1, 0.0, 1.0);
            shadowMap._darkness = CesiumMath.lerp(1.0, shadowMap.darkness, darknessAmount);

            if (dot < 0.0) {
                shadowMap._outOfView = true;
                shadowMap._needsUpdate = false;
                return;
            }

            // By default cascaded shadows need to update and are always in view
            shadowMap._needsUpdate = true;
            shadowMap._outOfView = false;
        } else if (shadowMap._isPointLight) {
            // Sphere-frustum intersection test
            boundingSphere.center = shadowMapCamera.positionWC;
            boundingSphere.radius = shadowMap._pointLightRadius;
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
        shadowMap._lightPositionEC.w = shadowMap._pointLightRadius;

        // Get the near and far of the scene camera
        var near;
        var far;
        if (shadowMap._fitNearFar) {
            // shadowFar can be very large, so limit to shadowMap.maximumDistance
            // Push the far plane slightly further than the near plane to avoid degenerate frustum
            near = Math.min(frameState.shadowState.nearPlane, shadowMap.maximumDistance);
            far = Math.min(frameState.shadowState.farPlane, shadowMap.maximumDistance + 1.0);
        } else {
            near = camera.frustum.near;
            far = shadowMap.maximumDistance;
        }

        shadowMap._sceneCamera = Camera.clone(camera, sceneCamera);
        camera.frustum.clone(shadowMap._sceneCamera.frustum);
        shadowMap._sceneCamera.frustum.near = near;
        shadowMap._sceneCamera.frustum.far = far;
        shadowMap._distance = far - near;

        checkVisibility(shadowMap, frameState);

        if (!shadowMap._outOfViewPrevious && shadowMap._outOfView) {
            shadowMap._needsUpdate = true;
        }
        shadowMap._outOfViewPrevious = shadowMap._outOfView;
    }

    /**
     * @private
     */
    ShadowMap.prototype.update = function(frameState) {
        updateCameras(this, frameState);

        if (this._needsUpdate) {
            updateFramebuffer(this, frameState.context);

            if (this._isPointLight) {
                computeOmnidirectional(this, frameState);
            }

            if (this._cascadesEnabled) {
                fitShadowMapToScene(this, frameState);

                if (this._numberOfCascades > 1) {
                    computeCascades(this, frameState);
                }
            }

            if (!this._isPointLight) {
                // Compute the culling volume
                var shadowMapCamera = this._shadowMapCamera;
                var position = shadowMapCamera.positionWC;
                var direction = shadowMapCamera.directionWC;
                var up = shadowMapCamera.upWC;
                this._shadowMapCullingVolume = shadowMapCamera.frustum.computeCullingVolume(position, direction, up);

                if (this._passes.length === 1) {
                    // Since there is only one pass, use the shadow map camera as the pass camera.
                    this._passes[0].camera.clone(shadowMapCamera);
                }
            } else {
                this._shadowMapCullingVolume = CullingVolume.fromBoundingSphere(this._boundingSphere);
            }
        }

        if (this._passes.length === 1) {
            // Transforms from eye space to shadow texture space.
            // Always requires an update since the scene camera constantly changes.
            var inverseView = this._sceneCamera.inverseViewMatrix;
            Matrix4.multiply(this._shadowMapCamera.getViewProjection(), inverseView, this._shadowMapMatrix);
        }

        if (this.debugShow) {
            applyDebugSettings(this, frameState);
        }
    };

    /**
     * @private
     */
    ShadowMap.prototype.updatePass = function(context, shadowPass) {
        clearFramebuffer(this, context, shadowPass);
    };

    var scratchTexelStepSize = new Cartesian2();

    function combineUniforms(shadowMap, uniforms, isTerrain) {
        var bias = shadowMap._isPointLight ? shadowMap._pointBias : (isTerrain ? shadowMap._terrainBias : shadowMap._primitiveBias);

        var mapUniforms = {
            shadowMap_texture :function() {
                return shadowMap._shadowMapTexture;
            },
            shadowMap_textureCube : function() {
                return shadowMap._shadowMapTexture;
            },
            shadowMap_matrix : function() {
                return shadowMap._shadowMapMatrix;
            },
            shadowMap_cascadeSplits : function() {
                return shadowMap._cascadeSplits;
            },
            shadowMap_cascadeMatrices : function() {
                return shadowMap._cascadeMatrices;
            },
            shadowMap_lightDirectionEC : function() {
                return shadowMap._lightDirectionEC;
            },
            shadowMap_lightPositionEC : function() {
                return shadowMap._lightPositionEC;
            },
            shadowMap_cascadeDistances : function() {
                return shadowMap._cascadeDistances;
            },
            shadowMap_texelSizeDepthBiasAndNormalShadingSmooth : function() {
                var texelStepSize = scratchTexelStepSize;
                texelStepSize.x = 1.0 / shadowMap._textureSize.x;
                texelStepSize.y = 1.0 / shadowMap._textureSize.y;

                return Cartesian4.fromElements(texelStepSize.x, texelStepSize.y, bias.depthBias, bias.normalShadingSmooth, this.combinedUniforms1);
            },
            shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness : function() {
                return Cartesian4.fromElements(bias.normalOffsetScale, shadowMap._distance, shadowMap.maximumDistance, shadowMap._darkness, this.combinedUniforms2);
            },

            combinedUniforms1 : new Cartesian4(),
            combinedUniforms2 : new Cartesian4()
        };

        return combine(uniforms, mapUniforms, false);
    }

    function createCastDerivedCommand(shadowMap, shadowsDirty, command, context, oldShaderId, result) {
        var castShader;
        var castRenderState;
        var castUniformMap;
        if (defined(result)) {
            castShader = result.shaderProgram;
            castRenderState = result.renderState;
            castUniformMap = result.uniformMap;
        }

        result = DrawCommand.shallowClone(command, result);
        result.castShadows = true;
        result.receiveShadows = false;

        if (!defined(castShader) || oldShaderId !== command.shaderProgram.id || shadowsDirty) {
            var shaderProgram = command.shaderProgram;

            var isTerrain = command.pass === Pass.GLOBE;
            var isOpaque = command.pass !== Pass.TRANSLUCENT;
            var isPointLight = shadowMap._isPointLight;
            var usesDepthTexture= shadowMap._usesDepthTexture;

            var keyword =  ShadowMapShader.getShadowCastShaderKeyword(isPointLight, isTerrain, usesDepthTexture, isOpaque);
            castShader = context.shaderCache.getDerivedShaderProgram(shaderProgram, keyword);
            if (!defined(castShader)) {
                var vertexShaderSource = shaderProgram.vertexShaderSource;
                var fragmentShaderSource = shaderProgram.fragmentShaderSource;

                var castVS = ShadowMapShader.createShadowCastVertexShader(vertexShaderSource, isPointLight, isTerrain);
                var castFS = ShadowMapShader.createShadowCastFragmentShader(fragmentShaderSource, isPointLight, usesDepthTexture, isOpaque);

                castShader = context.shaderCache.createDerivedShaderProgram(shaderProgram, keyword, {
                    vertexShaderSource : castVS,
                    fragmentShaderSource : castFS,
                    attributeLocations : shaderProgram._attributeLocations
                });
            }

            castRenderState = shadowMap._primitiveRenderState;
            if (isPointLight) {
                castRenderState = shadowMap._pointRenderState;
            } else if (isTerrain) {
                castRenderState = shadowMap._terrainRenderState;
            }

            // Modify the render state for commands that do not use back-face culling, e.g. flat textured walls
            var cullEnabled = command.renderState.cull.enabled;
            if (!cullEnabled) {
                castRenderState = clone(castRenderState, false);
                castRenderState.cull = clone(castRenderState.cull, false);
                castRenderState.cull.enabled = false;
                castRenderState = RenderState.fromCache(castRenderState);
            }

            castUniformMap = combineUniforms(shadowMap, command.uniformMap, isTerrain);
        }

        result.shaderProgram = castShader;
        result.renderState = castRenderState;
        result.uniformMap = castUniformMap;

        return result;
    }

    ShadowMap.createReceiveDerivedCommand = function(lightShadowMaps, command, shadowsDirty, context, result) {
        if (!defined(result)) {
            result = {};
        }

        var lightShadowMapsEnabled = (lightShadowMaps.length > 0);
        var shaderProgram = command.shaderProgram;
        var vertexShaderSource = shaderProgram.vertexShaderSource;
        var fragmentShaderSource = shaderProgram.fragmentShaderSource;
        var isTerrain = command.pass === Pass.GLOBE;

        var hasTerrainNormal = false;
        if (isTerrain) {
            hasTerrainNormal = command.owner.data.renderedMesh.encoding.hasVertexNormals;
        }

        if (command.receiveShadows && lightShadowMapsEnabled) {
            // Only generate a receiveCommand if there is a shadow map originating from a light source.
            var receiveShader;
            var receiveUniformMap;
            if (defined(result.receiveCommand)) {
                receiveShader = result.receiveCommand.shaderProgram;
                receiveUniformMap = result.receiveCommand.uniformMap;
            }

            result.receiveCommand = DrawCommand.shallowClone(command, result.receiveCommand);
            result.castShadows = false;
            result.receiveShadows = true;

            // If castShadows changed, recompile the receive shadows shader. The normal shading technique simulates
            // self-shadowing so it should be turned off if castShadows is false.
            var castShadowsDirty = result.receiveShaderCastShadows !== command.castShadows;
            var shaderDirty = result.receiveShaderProgramId !== command.shaderProgram.id;

            if (!defined(receiveShader) || shaderDirty || shadowsDirty || castShadowsDirty) {
                var keyword = ShadowMapShader.getShadowReceiveShaderKeyword(lightShadowMaps[0], command.castShadows, isTerrain, hasTerrainNormal);
                receiveShader = context.shaderCache.getDerivedShaderProgram(shaderProgram, keyword);
                if (!defined(receiveShader)) {
                    var receiveVS = ShadowMapShader.createShadowReceiveVertexShader(vertexShaderSource, isTerrain, hasTerrainNormal);
                    var receiveFS = ShadowMapShader.createShadowReceiveFragmentShader(fragmentShaderSource, lightShadowMaps[0], command.castShadows, isTerrain, hasTerrainNormal);

                    receiveShader = context.shaderCache.createDerivedShaderProgram(shaderProgram, keyword, {
                        vertexShaderSource : receiveVS,
                        fragmentShaderSource : receiveFS,
                        attributeLocations : shaderProgram._attributeLocations
                    });
                }

                receiveUniformMap = combineUniforms(lightShadowMaps[0], command.uniformMap, isTerrain);
            }

            result.receiveCommand.shaderProgram = receiveShader;
            result.receiveCommand.uniformMap = receiveUniformMap;
            result.receiveShaderProgramId = command.shaderProgram.id;
            result.receiveShaderCastShadows = command.castShadows;
        }

        return result;
    };

    ShadowMap.createCastDerivedCommand = function(shadowMaps, command, shadowsDirty, context, result) {
        if (!defined(result)) {
            result = {};
        }

        if (command.castShadows) {
            var castCommands = result.castCommands;
            if (!defined(castCommands)) {
                castCommands = result.castCommands = [];
            }

            var oldShaderId = result.castShaderProgramId;

            var shadowMapLength = shadowMaps.length;
            castCommands.length = shadowMapLength;

            for (var i = 0; i < shadowMapLength; ++i) {
                castCommands[i] = createCastDerivedCommand(shadowMaps[i], shadowsDirty, command, context, oldShaderId, castCommands[i]);
            }

            result.castShaderProgramId = command.shaderProgram.id;
        }

        return result;
    };

    /**
     * @private
     */
    ShadowMap.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
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
export default ShadowMap;
