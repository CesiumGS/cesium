/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
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
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PixelFormat',
        '../Core/PolylineGeometry',
        '../Core/PrimitiveType',
        '../Core/SphereOutlineGeometry',
        '../Renderer/ClearCommand',
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
        './Camera',
        './CullFace',
        './OrthographicFrustum',
        './Pass',
        './PerInstanceColorAppearance',
        './PerspectiveFrustum',
        './Primitive'
    ], function(
        BoundingRectangle,
        BoxOutlineGeometry,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Color,
        ColorGeometryInstanceAttribute,
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
        CesiumMath,
        Matrix4,
        PixelFormat,
        PolylineGeometry,
        PrimitiveType,
        SphereOutlineGeometry,
        ClearCommand,
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
     * @param {Boolean} [options.cascadesEnabled=true] Use multiple shadow maps to cover different partitions of the view frustum.
     * @param {Number} [options.numberOfCascades=4] The number of cascades to use for the shadow map. Supported values are one and four.
     * @param {Number} [options.size=1024] The width and height, in pixels, of each cascade in the shadow map.
     *
     * @see ShadowMapShader
     *
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
        //>>includeEnd('debug');

        this.enabled = false;

        // Uniforms
        this._shadowMapMatrix = new Matrix4();
        this._shadowMapTexture = undefined;
        this._lightDirectionEC = new Cartesian3();

        this._framebuffer = undefined;
        this._shadowMapSize = defaultValue(options.size, 1024);

        this._lightCamera = options.lightCamera;
        this._shadowMapCamera = new ShadowMapCamera();
        this._sceneCamera = undefined;
        this._distance = 1000.0;

        this._cascadesEnabled = defaultValue(options.cascadesEnabled, true);
        this._fitNearFar = true;

        var maximumNumberOfCascades = 4;
        this._numberOfCascades = this._cascadesEnabled ? defaultValue(options.numberOfCascades, maximumNumberOfCascades) : 1;

        this._cascadeCameras = new Array(maximumNumberOfCascades);
        this._cascadePassStates = new Array(maximumNumberOfCascades);
        this._cascadeViewports = new Array(maximumNumberOfCascades);

        // Uniforms
        this._cascadeSplits = [new Cartesian4(), new Cartesian4()];
        this._cascadeOffsets = new Array(maximumNumberOfCascades);
        this._cascadeScales = new Array(maximumNumberOfCascades);

        for (var i = 0; i < maximumNumberOfCascades; ++i) {
            this._cascadeCameras[i] = new ShadowMapCamera();
            this._cascadePassStates[i] = new PassState(context);
            this._cascadePassStates[i].viewport = new BoundingRectangle(); // Updated in setSize
            this._cascadeOffsets[i] = new Cartesian3();
            this._cascadeScales[i] = new Cartesian3();
        }

        this.debugShow = false;
        this.debugFreezeFrame = false;
        this.debugVisualizeCascades = false;
        this._debugLightFrustum = undefined;
        this._debugCameraFrustum = undefined;
        this._debugCascadeFrustums = new Array(maximumNumberOfCascades);
        this._debugShadowViewCommand = undefined;

        // Only enable the color mask if the depth texture extension is not supported
        var colorMask = !context.depthTexture;

        // For shadow casters
        this._renderState = RenderState.fromCache({
            cull : {
                enabled : true, // TODO : need to handle objects that don't use back face culling, like walls
                face : CullFace.FRONT
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
                enabled : true,
                factor : 1.1,
                units : 4.0
            }
        });

        // For clearing the shadow map texture every frame
        this._clearCommand = new ClearCommand({
            depth : 1.0,
            color : new Color(),
            renderState : RenderState.fromCache()
        });

        this._passState = new PassState(context);
        this._passState.viewport = new BoundingRectangle(); // Updated in setSize

        this.setNumberOfCascades(this._numberOfCascades);
        this.setSize(this._shadowMapSize);
    }

    defineProperties(ShadowMap.prototype, {
        /**
         * The shadow map texture used in shadow receive programs.
         *
         * @memberof ShadowMap.prototype
         * @type {Texture}
         * @readonly
         */
        shadowMapTexture : {
            get : function() {
                return this._shadowMapTexture;
            }
        },
        /**
         * The shadow map matrix used in shadow receive programs.
         * It converts gl_Position to shadow map texture space.
         *
         * @memberof ShadowMap.prototype
         * @type {Matrix4}
         * @readonly
         */
        shadowMapMatrix : {
            get : function() {
                return this._shadowMapMatrix;
            }
        },
        /**
         * The camera used for rendering into the shadow map.
         *
         * @memberof ShadowMap.prototype
         * @type {ShadowMap~ShadowMapCamera}
         * @readonly
         */
        shadowMapCamera : {
            get : function() {
                return this._shadowMapCamera;
            }
        },

        /**
         * The number of cascades used in the shadow map.
         *
         * @memberof ShadowMap.prototype
         * @type {Number}
         * @readonly
         */
        numberOfCascades : {
            get : function() {
                return this._numberOfCascades;
            }
        },

        /**
         * The render state used for rendering shadow casters into the shadow map.
         *
         * @memberof ShadowMap.prototype
         * @type {RenderState}
         * @readonly
         */
        renderState : {
            get : function() {
                return this._renderState;
            }
        },

        /**
         * The pass state used for rendering shadow casters into the shadow map.
         *
         * @memberof ShadowMap.prototype
         * @type {PassState}
         * @readonly
         */
        passState : {
            get : function() {
                return this._passState;
            }
        },

        /**
         * The clear command used for clearing the shadow map, used in conjunction with the pass state.
         *
         * @memberof ShadowMap.prototype
         * @type {ClearCommand}
         * @readonly
         */
        clearCommand : {
            get : function() {
                return this._clearCommand;
            }
        },
        cascadePassStates : {
            get : function() {
                return this._cascadePassStates;
            }
        },
        cascadeCameras : {
            get : function() {
                return this._cascadeCameras;
            }
        },
        cascadeSplits : {
            get : function() {
                return this._cascadeSplits;
            }
        },
        cascadeOffsets : {
            get : function() {
                return this._cascadeOffsets;
            }
        },
        cascadeScales : {
            get : function() {
                return this._cascadeScales;
            }
        },
        lightDirectionEC : {
            get : function() {
                return this._lightDirectionEC;
            }
        }
    });

    function destroyFramebuffer(shadowMap) {
        shadowMap._framebuffer = shadowMap._framebuffer && !shadowMap._framebuffer.isDestroyed() && shadowMap._framebuffer.destroy();
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
            width : shadowMap._shadowMapSize,
            height : shadowMap._shadowMapSize,
            format : RenderbufferFormat.DEPTH_COMPONENT16
        });

        var colorTexture = new Texture({
            context : context,
            width : shadowMap._shadowMapSize,
            height : shadowMap._shadowMapSize,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        var framebuffer = new Framebuffer({
            context : context,
            depthRenderbuffer : depthRenderbuffer,
            colorTextures : [colorTexture]
        });

        shadowMap._shadowMapTexture = colorTexture;
        return framebuffer;
    }

    function createFramebufferDepth(shadowMap, context) {
        var depthStencilTexture = new Texture({
            context : context,
            width : shadowMap._shadowMapSize,
            height : shadowMap._shadowMapSize,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
            sampler : createSampler()
        });

        var framebuffer = new Framebuffer({
            context : context,
            depthStencilTexture : depthStencilTexture
        });

        shadowMap._shadowMapTexture = depthStencilTexture;
        return framebuffer;
    }

    function createFramebuffer(shadowMap, context) {
        var createFunction = (context.depthTexture) ? createFramebufferDepth : createFramebufferColor;
        var framebuffer = createFunction(shadowMap, context);
        shadowMap._framebuffer = framebuffer;
        shadowMap._passState.framebuffer = framebuffer;
        for (var i = 0; i < shadowMap._numberOfCascades; ++i) {
            shadowMap._cascadePassStates[i].framebuffer = framebuffer;
        }
    }

    function updateFramebuffer(shadowMap, context) {
        if (!defined(shadowMap._framebuffer) || (shadowMap._shadowMapTexture.width !== shadowMap._shadowMapSize)) {
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
        }
    }

    ShadowMap.prototype.setNumberOfCascades = function(numberOfCascades) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(numberOfCascades) || ((numberOfCascades !== 1) && (numberOfCascades !== 4))) {
            throw new DeveloperError('Only one or four cascades are supported.');
        }
        //>>includeEnd('debug');

        this._numberOfCascades = numberOfCascades;

        if (numberOfCascades === 1) {
            this._cascadeViewports[0] = new Cartesian4(0.0, 0.0, 1.0, 1.0);
        } else if (numberOfCascades === 4) {
            // Mirrors the viewports in the shader (offset x, offset y, scale x, scale y)
            this._cascadeViewports[0] = new Cartesian4(0.0, 0.0, 0.5, 0.5);
            this._cascadeViewports[1] = new Cartesian4(0.5, 0.0, 0.5, 0.5);
            this._cascadeViewports[2] = new Cartesian4(0.0, 0.5, 0.5, 0.5);
            this._cascadeViewports[3] = new Cartesian4(0.5, 0.5, 0.5, 0.5);
        }
    };

    ShadowMap.prototype.setSize = function(size) {
        if (this._numberOfCascades === 4) {
            size *= 2;
        }

        this._shadowMapSize = size;

        // Update pass state
        this._passState.viewport.x = 0;
        this._passState.viewport.y = 0;
        this._passState.viewport.width = size;
        this._passState.viewport.height = size;

        // Update cascade pass states
        for (var i = 0; i < this._numberOfCascades; ++i) {
            var passState = this._cascadePassStates[i];
            var viewport = this._cascadeViewports[i];
            passState.viewport.x = size * viewport.x;
            passState.viewport.y = size * viewport.y;
            passState.viewport.width = size * viewport.z;
            passState.viewport.height = size * viewport.w;
        }
    };

    function updateDebugShadowViewCommand(shadows, frameState) {
        // Draws the shadow map on the bottom-right corner of the screen
        var context = frameState.context;
        var screenWidth = frameState.context.drawingBufferWidth;
        var screenHeight = frameState.context.drawingBufferHeight;
        var size = Math.min(screenWidth, screenHeight) * 0.3;

        var x = screenWidth - size;
        var y = 0;
        var width = size;
        var height = size;

        if (!defined(shadows._debugShadowViewCommand)) {
            var fs =
                'varying vec2 v_textureCoordinates; \n' +
                'void main() \n' +
                '{ \n' +

                (context.depthTexture ?
                '    float shadow = texture2D(czm_sunShadowMapTexture, v_textureCoordinates).r; \n' :
                '    float shadow = czm_unpackDepth(texture2D(czm_sunShadowMapTexture, v_textureCoordinates)); \n') +

                '    gl_FragColor = vec4(vec3(shadow), 1.0); \n' +
                '} \n';

            // Set viewport now to avoid using a cached render state
            var renderState = RenderState.fromCache({
                viewport : new BoundingRectangle(x, y, width, height)
            });

            var drawCommand = context.createViewportQuadCommand(fs);
            drawCommand.renderState = renderState;
            drawCommand.pass = Pass.OVERLAY;
            shadows._debugShadowViewCommand = drawCommand;
        }

        var viewport = shadows._debugShadowViewCommand.renderState.viewport;
        viewport.x = x;
        viewport.y = y;
        viewport.width = width;
        viewport.height = height;

        frameState.commandList.push(shadows._debugShadowViewCommand);
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

    function createDebugFrustum(color) {
        return new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new BoxOutlineGeometry({
                    minimum : new Cartesian3(0, 0, 0),
                    maximum : new Cartesian3(1, 1, 1)
                }),
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
    }

    var debugCascadeColors = [Color.RED, Color.GREEN, Color.BLUE, Color.MAGENTA];

    function applyDebugSettings(shadowMap, frameState) {
        var showFrustumOutlines = !shadowMap._cascadesEnabled || shadowMap.debugFreezeFrame;
        if (showFrustumOutlines) {
            var debugLightFrustum = shadowMap._debugLightFrustum;
            if (!defined(debugLightFrustum)) {
                debugLightFrustum = shadowMap._debugLightFrustum = createDebugFrustum(Color.YELLOW);
            }
            Matrix4.inverse(shadowMap._shadowMapCamera.getViewProjection(), debugLightFrustum.modelMatrix);
            debugLightFrustum.update(frameState);

            for (var i = 0; i < shadowMap._numberOfCascades; ++i) {
                var debugCascadeFrustum = shadowMap._debugCascadeFrustums[i];
                if (!defined(debugCascadeFrustum)) {
                    debugCascadeFrustum = shadowMap._debugCascadeFrustums[i] = createDebugFrustum(debugCascadeColors[i]);
                }
                Matrix4.inverse(shadowMap._cascadeCameras[i].getViewProjection(), debugCascadeFrustum.modelMatrix);
                debugCascadeFrustum.update(frameState);
            }
        }

        updateDebugShadowViewCommand(shadowMap, frameState);
    }

    function ShadowMapCamera() {
        this.viewMatrix = new Matrix4();
        this.inverseViewMatrix = new Matrix4();
        this.frustum = new OrthographicFrustum();
        this.positionWC = new Cartesian3();
        this.directionWC = new Cartesian3();
        this.upWC = new Cartesian3();
        this.rightWC = new Cartesian3();
        this.viewProjectionMatrix = new Matrix4();
    }

    ShadowMapCamera.prototype.clone = function(camera) {
        Matrix4.clone(camera.viewMatrix, this.viewMatrix);
        Matrix4.clone(camera.inverseViewMatrix, this.inverseViewMatrix);
        camera.frustum.clone(this.frustum);
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

    function computeCascades(shadowMap) {
        var shadowMapCamera = shadowMap._shadowMapCamera;
        var sceneCamera = shadowMap._sceneCamera;
        var cameraNear = sceneCamera.frustum.near;
        var cameraFar = sceneCamera.frustum.far;
        var numberOfCascades = shadowMap._numberOfCascades;

        // Split cascades. Use a mix of linear and log splits.
        var lambda = 1.0;
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
        Cartesian4.unpack(splitsNear, 0, shadowMap._cascadeSplits[0]);
        Cartesian4.unpack(splitsFar, 0, shadowMap._cascadeSplits[1]);

        var left = shadowMapCamera.frustum.left;
        var right = shadowMapCamera.frustum.right;
        var bottom = shadowMapCamera.frustum.bottom;
        var top = shadowMapCamera.frustum.top;
        var near = shadowMapCamera.frustum.near;
        var far = shadowMapCamera.frustum.far;

        var cascadeSubFrustum = sceneCamera.frustum.clone(scratchFrustum);

        for (var j = 0; j < numberOfCascades; ++j) {
            // Find the bounding box of the camera sub-frustum in shadow map texture space
            cascadeSubFrustum.near = splitsNear[j];
            cascadeSubFrustum.far = splitsFar[j];
            var viewProjection = Matrix4.multiply(cascadeSubFrustum.projectionMatrix, sceneCamera.viewMatrix, scratchMatrix);
            var inverseViewProjection = Matrix4.inverse(viewProjection, scratchMatrix);
            var cascadeMatrix = Matrix4.multiply(shadowMapCamera.getViewProjection(), inverseViewProjection, scratchMatrix);

            // Project each corner from camera NDC space to shadow map texture space. Min and max will be from 0 to 1.
            var min = Cartesian3.fromElements(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, scratchMin);
            var max = Cartesian3.fromElements(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, scratchMax);

            for (var k = 0; k < 8; ++k) {
                var corner = Cartesian4.clone(frustumCornersNDC[k], scratchFrustumCorners[k]);
                Matrix4.multiplyByVector(cascadeMatrix, corner, corner);
                Cartesian3.divideByScalar(corner, corner.w, corner); // Handle the perspective divide
                Cartesian3.minimumByComponent(corner, min, min);
                Cartesian3.maximumByComponent(corner, max, max);
            }

            // Limit min to 0.0. Sometimes precision errors cause it to go slightly negative, which affects the frustum extent computations below.
            min.x = Math.max(min.x, 0.0);
            min.y = Math.max(min.y, 0.0);

            // Always start cascade frustum at the top of the light frustum to capture objects in the light's path
            min.z = 0.0;

            var cascadeCamera = shadowMap._cascadeCameras[j];
            cascadeCamera.clone(shadowMapCamera); // PERFORMANCE_IDEA : could do a shallow clone for all properties except the frustum
            cascadeCamera.frustum.left = left + min.x * (right - left);
            cascadeCamera.frustum.right = left + max.x * (right - left);
            cascadeCamera.frustum.bottom = bottom + min.y * (top - bottom);
            cascadeCamera.frustum.top = bottom + max.y * (top - bottom);
            cascadeCamera.frustum.near = near + min.z * (far - near);
            cascadeCamera.frustum.far = near + max.z * (far - near);

            // Scale and offset are used to transform shadowPosition to the proper cascade in the shader
            var cascadeScale = shadowMap._cascadeScales[j];
            cascadeScale.x = 1.0 / (max.x - min.x);
            cascadeScale.y = 1.0 / (max.y - min.y);
            cascadeScale.z = 1.0 / (max.z - min.z);

            var cascadeOffset = shadowMap._cascadeOffsets[j];
            cascadeOffset.x = -min.x;
            cascadeOffset.y = -min.y;
            cascadeOffset.z = -min.z;
        }
    }

    var scratchLightView = new Matrix4();
    var scratchRight = new Cartesian3();
    var scratchUp = new Cartesian3();
    var scratchMin = new Cartesian3();
    var scratchMax = new Cartesian3();
    var scratchTranslation = new Cartesian3();

    function fitShadowMapToScene(shadowMap) {
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
        max.z += 10.0; // Note: in light space, a positive number is behind the camera

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
        Matrix4.getTranslation(shadowMapCamera.inverseViewMatrix, shadowMapCamera.positionWC);
        Cartesian3.clone(lightDir, shadowMapCamera.directionWC);
        Cartesian3.clone(lightUp, shadowMapCamera.upWC);
        Cartesian3.clone(lightRight, shadowMapCamera.rightWC);
    }

    function updateCameras(shadowMap, frameState) {
        if (shadowMap.debugFreezeFrame) {
            return;
        }

        var camera = frameState.camera;

        // Clone light camera into the shadow map camera
        var shadowMapCamera = shadowMap._shadowMapCamera;
        shadowMapCamera.clone(shadowMap._lightCamera);

        // Get the light direction in eye coordinates
        var lightDirection = shadowMap._lightDirectionEC;
        Matrix4.multiplyByPointAsVector(camera.viewMatrix, shadowMapCamera.directionWC, lightDirection);
        Cartesian3.normalize(lightDirection, lightDirection);
        Cartesian3.negate(lightDirection, lightDirection);

        // Get the near and far of the scene camera
        var near;
        var far;
        if (shadowMap._fitNearFar) {
            // shadowFar can be very large, so limit to shadowMap._distance
            near = frameState.shadowNear;
            far = Math.min(frameState.shadowFar, near + shadowMap._distance);
        } else {
            near = camera.frustum.near;
            far = shadowMap._distance;
        }

        shadowMap._sceneCamera = Camera.clone(camera, shadowMap._sceneCamera);
        shadowMap._sceneCamera.frustum.near = near;
        shadowMap._sceneCamera.frustum.far = far;
    }

    ShadowMap.prototype.update = function(frameState) {
        updateFramebuffer(this, frameState.context);
        updateCameras(this, frameState);

        if (this._cascadesEnabled) {
            fitShadowMapToScene(this);

            if (this._numberOfCascades > 1) {
                computeCascades(this);
            }
        }

        if (this._numberOfCascades === 1) {
            this._cascadeCameras[0].clone(this._shadowMapCamera);
        }

        if (this.debugShow) {
            applyDebugSettings(this, frameState);
        }
    };

    ShadowMap.prototype.updateShadowMapMatrix = function(uniformState) {
        // Calculate shadow map matrix. It converts gl_Position to shadow map texture space.
        // Needs to be updated for each frustum in multi-frustum rendering because the projection matrix changes.
        var shadowViewProjection = this._shadowMapCamera.getViewProjection();
        Matrix4.multiply(shadowViewProjection, uniformState.inverseViewProjection, this._shadowMapMatrix);
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
