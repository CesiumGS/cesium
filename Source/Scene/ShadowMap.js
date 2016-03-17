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

        // Uniforms
        this._shadowMapMatrix = new Matrix4();
        this._shadowMapTexture = undefined;
        this._lightDirectionEC = new Cartesian3();
        this._lightPositionEC = new Cartesian4();

        this._framebuffer = undefined;
        this._shadowMapSize = defaultValue(options.size, 1024);
        this._textureSize = new Cartesian2(this._shadowMapSize, this._shadowMapSize);

        this._lightCamera = options.lightCamera;
        this._shadowMapCamera = new ShadowMapCamera();
        this._sceneCamera = undefined;

        this._isPointLight = defaultValue(options.isPointLight, false);
        this._radius = defaultValue(options.radius, 100.0);
        this._usesCubeMap = true;

        this._cascadesEnabled = this._isPointLight ? false : defaultValue(options.cascadesEnabled, true);
        this._numberOfCascades = !this._cascadesEnabled ? 0 : defaultValue(options.numberOfCascades, 4);
        this._fitNearFar = true;
        this._distance = 1000.0;

        // Uniforms
        this._cascadeSplits = [new Cartesian4(), new Cartesian4()];
        this._cascadeOffsets = [new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3()];
        this._cascadeScales = [new Cartesian3(), new Cartesian3(), new Cartesian3(), new Cartesian3()];

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
        this._passFaces = new Array(numberOfPasses); // For point shadows

        for (var i = 0; i < numberOfPasses; ++i) {
            this._passCameras[i] = new ShadowMapCamera();
            this._passStates[i] = new PassState(context);
        }

        this.debugShow = false;
        this.debugFreezeFrame = false;
        this.debugVisualizeCascades = false;
        this._debugLightFrustum = undefined;
        this._debugPointLight = undefined;
        this._debugCameraFrustum = undefined;
        this._debugCascadeFrustums = new Array(this._numberOfCascades);
        this._debugShadowViewCommand = undefined;

        // Only enable the color mask if the depth texture extension is not supported
        this._usesDepthTexture = context.depthTexture;

        if (this._isPointLight && this._usesCubeMap) {
            this._usesDepthTexture = false;
        }

        var colorMask = !this._usesDepthTexture;

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
            framebuffer : undefined,
            renderState : RenderState.fromCache({
                viewport : new BoundingRectangle(0, 0, this._textureSize.x, this._textureSize.y)
            })
        });

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
         * The clear command used for clearing the shadow map.
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

        passStates : {
            get : function() {
                return this._passStates;
            }
        },
        passCameras : {
            get : function() {
                return this._passCameras;
            }
        },

        numberOfCascades : {
            get : function() {
                return this._numberOfCascades;
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
        },
        lightPositionEC : {
            get : function() {
                return this._lightPositionEC;
            }
        },
        isPointLight : {
            get : function() {
                return this._isPointLight;
            }
        },
        usesCubeMap : {
            get : function() {
                return this._usesCubeMap;
            }
        },
        usesDepthTexture : {
            get : function() {
                return this._usesDepthTexture;
            }
        }
    });

    function destroyFramebuffer(shadowMap) {
        shadowMap._framebuffer = shadowMap._framebuffer && shadowMap._framebuffer.destroy();

        // Need to destroy cube map separately
        if (shadowMap._isPointLight && shadowMap._usesCubeMap) {
            shadowMap._shadowMapTexture = shadowMap._shadowMapTexture && shadowMap._shadowMapTexture.destroy();
        }
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
            colorTextures : [colorTexture]
        });

        shadowMap._shadowMapTexture = colorTexture;
        return framebuffer;
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
            depthStencilTexture : depthStencilTexture
        });

        shadowMap._shadowMapTexture = depthStencilTexture;

        return framebuffer;
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

        var framebuffer = new Framebuffer({
            context : context,
            depthRenderbuffer : depthRenderbuffer,
            colorTextures : [cubeMap.positiveX]
        });

        shadowMap._passFaces[0] = cubeMap.negativeX;
        shadowMap._passFaces[1] = cubeMap.negativeY;
        shadowMap._passFaces[2] = cubeMap.negativeZ;
        shadowMap._passFaces[3] = cubeMap.positiveX;
        shadowMap._passFaces[4] = cubeMap.positiveY;
        shadowMap._passFaces[5] = cubeMap.positiveZ;

        shadowMap._shadowMapTexture = cubeMap;
        return framebuffer;
    }

    function createFramebuffer(shadowMap, context) {
        var framebuffer;
        if (shadowMap._isPointLight && shadowMap._usesCubeMap) {
            framebuffer = createFramebufferCube(shadowMap, context);
        } else if (shadowMap._usesDepthTexture) {
            framebuffer = createFramebufferDepth(shadowMap, context);
        } else {
            framebuffer = createFramebufferColor(shadowMap, context);
        }
        shadowMap._framebuffer = framebuffer;
        shadowMap._clearCommand.framebuffer = framebuffer;
        for (var i = 0; i < shadowMap._numberOfPasses; ++i) {
            shadowMap._passStates[i].framebuffer = framebuffer;
        }
    }

    function checkFramebuffer(shadowMap, context) {
        // Attempt to make an FBO with only a depth texture. If it fails, fallback to a color texture.
        if (shadowMap._usesDepthTexture && (shadowMap._framebuffer.status !== WebGLConstants.FRAMEBUFFER_COMPLETE)) {
            shadowMap._usesDepthTexture = false;
            var colorMask = shadowMap._renderState.colorMask;
            colorMask.red = colorMask.green = colorMask.blue = colorMask.alpha = true;
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
        }
    }

    function updateFramebuffer(shadowMap, context) {
        if (!defined(shadowMap._framebuffer) || (shadowMap._shadowMapTexture.width !== shadowMap._textureSize.x)) {
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
            checkFramebuffer(shadowMap, context);
        }
    }

    ShadowMap.prototype.setSize = function(size) {
        this._shadowMapSize = size;
        var numberOfPasses = this._numberOfPasses;
        var textureSize = this._textureSize;

        if (this._isPointLight && this._usesCubeMap) {
            textureSize.x = size;
            textureSize.y = size;
            var viewport = new BoundingRectangle(0, 0, size, size);
            this._passStates[0].viewport = viewport;
            this._passStates[1].viewport = viewport;
            this._passStates[2].viewport = viewport;
            this._passStates[3].viewport = viewport;
            this._passStates[4].viewport = viewport;
            this._passStates[5].viewport = viewport;
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

        // Update clear command
        this._clearCommand.renderState.viewport = new BoundingRectangle(0, 0, textureSize.x, textureSize.y);
    };

    function updateDebugShadowViewCommand(shadowMap, frameState) {
        // Draws the shadow map on the bottom-right corner of the screen
        var context = frameState.context;
        var screenWidth = frameState.context.drawingBufferWidth;
        var screenHeight = frameState.context.drawingBufferHeight;
        var size = Math.min(screenWidth, screenHeight) * 0.3;

        var x = screenWidth - size;
        var y = 0;
        var width = size;
        var height = size;

        if (!defined(shadowMap._debugShadowViewCommand)) {
            var fs;
            if (shadowMap._isPointLight && shadowMap._usesCubeMap) {
                fs = 'varying vec2 v_textureCoordinates; \n' +
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
                     '    float shadow = czm_unpackDepth(textureCube(czm_sunShadowMapTextureCube, dir)); \n' +
                     '    gl_FragColor = vec4(vec3(shadow), 1.0); \n' +
                     '} \n';
            } else {
                fs = 'varying vec2 v_textureCoordinates; \n' +
                     'void main() \n' +
                     '{ \n' +

                     (shadowMap._usesDepthTexture ?
                     '    float shadow = texture2D(czm_sunShadowMapTexture, v_textureCoordinates).r; \n' :
                     '    float shadow = czm_unpackDepth(texture2D(czm_sunShadowMapTexture, v_textureCoordinates)); \n') +

                     '    gl_FragColor = vec4(vec3(shadow), 1.0); \n' +
                     '} \n';
            }

            // Set viewport now to avoid using a cached render state
            var renderState = RenderState.fromCache({
                viewport : new BoundingRectangle(x, y, width, height)
            });

            var drawCommand = context.createViewportQuadCommand(fs);
            drawCommand.renderState = renderState;
            drawCommand.pass = Pass.OVERLAY;
            shadowMap._debugShadowViewCommand = drawCommand;
        }

        var viewport = shadowMap._debugShadowViewCommand.renderState.viewport;
        viewport.x = x;
        viewport.y = y;
        viewport.width = width;
        viewport.height = height;

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

    function createDebugSphere(color) {
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
            asynchronous : false
        });
    }

    var debugCascadeColors = [Color.RED, Color.GREEN, Color.BLUE, Color.MAGENTA];
    var scratchScale = new Matrix4();

    function applyDebugSettings(shadowMap, frameState) {
        updateDebugShadowViewCommand(shadowMap, frameState);

        // Only show cascades in freeze frame mode.
        if (shadowMap._cascadesEnabled && !shadowMap.debugFreezeFrame) {
            return;
        }

        if (shadowMap._isPointLight) {
            var debugPointLight = shadowMap._debugPointLight;
            if (!defined(debugPointLight)) {
                debugPointLight = shadowMap._debugPointLight = createDebugSphere(Color.YELLOW);
            }

            var scale = Matrix4.fromUniformScale(shadowMap._radius * 2.0, scratchScale);
            var translation = Matrix4.fromTranslation(shadowMap._shadowMapCamera.positionWC, scratchMatrix);
            Matrix4.multiply(translation, scale, debugPointLight.modelMatrix);
            debugPointLight.update(frameState);
        } else {
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
                Matrix4.inverse(shadowMap._passCameras[i].getViewProjection(), debugCascadeFrustum.modelMatrix);
                debugCascadeFrustum.update(frameState);
            }
        }
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

            var cascadeCamera = shadowMap._passCameras[j];
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
        frustum.fov = CesiumMath.PI / 2.0;
        frustum.near = 1.0;
        frustum.far = shadowMap._radius;
        frustum.aspectRatio = 1.0;

        // Re-purpose the shadow map matrix
        Matrix4.inverse(frustum.projectionMatrix, shadowMap._shadowMapMatrix);

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

        // Get the light position in eye coordinates
        Matrix4.multiplyByPoint(camera.viewMatrix, shadowMapCamera.positionWC, shadowMap._lightPositionEC);
        shadowMap._lightPositionEC.w = shadowMap._radius;

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

        if (this._isPointLight) {
            // TODO : only update if the light moves
            computeOmnidirectional(this);
        }

        if (this._cascadesEnabled) {
            fitShadowMapToScene(this);

            if (this._numberOfCascades > 1) {
                computeCascades(this);
            }
        }

        if (this._numberOfPasses === 1) {
            this._passCameras[0].clone(this._shadowMapCamera);
        }

        if (this.debugShow) {
            applyDebugSettings(this, frameState);
        }
    };

    ShadowMap.prototype.updatePass = function(context, pass) {
        if (this._isPointLight && this._usesCubeMap) {
            this._framebuffer._attachTexture(context, WebGLConstants.COLOR_ATTACHMENT0, this._passFaces[pass]);
            this._clearCommand.execute(context);
        } else if (pass === 0) {
            this._clearCommand.execute(context);
        }
    };

    ShadowMap.prototype.updateShadowMapMatrix = function(uniformState) {
        if (this._isPointLight) {
            // Point light shadows do not project into light space
            return;
        }
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
        this._debugPointLight = this._debugPointLight && this._debugPointLight.destroy();
        this._debugCameraFrustum = this._debugCameraFrustum && this._debugCameraFrustum.destroy();
        this._debugShadowViewCommand = this._debugShadowViewCommand && this._debugShadowViewCommand.shaderProgram && this._debugShadowViewCommand.shaderProgram.destroy();

        for (var i = 0; i < this._numberOfCascades; ++i) {
            this._debugCascadeFrustums[i] = this._debugCascadeFrustums[i] && this._debugCascadeFrustums[i].destroy();
        }

        return destroyObject(this);
    };

    return ShadowMap;
});
