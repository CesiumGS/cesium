/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/PixelFormat',
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
        './Primitive'
    ], function(
        BoundingRectangle,
        BoxOutlineGeometry,
        Cartesian3,
        Cartesian4,
        Color,
        ColorGeometryInstanceAttribute,
        defined,
        defineProperties,
        destroyObject,
        GeometryInstance,
        Matrix4,
        PixelFormat,
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
        Primitive) {
    'use strict';

    /**
     * @private
     */
    function ShadowMap(context, camera) {
        this.enabled = false;

        this.debugShow = false;
        this.debugFreezeFrame = false;
        this._debugLightFrustum = undefined;
        this._debugCameraFrustum = undefined;
        this._debugShadowViewCommand = undefined;

        this._lightViewProjection = new Matrix4();
        this._shadowMapMatrix = new Matrix4();
        this._shadowMapTexture = undefined;
        this._framebuffer = undefined;
        this._size = 1024; // Width and height of the shadow map in pixels

        // Only enable the color mask if the depth texture extension is not supported
        var colorMask = !context.depthTexture;

        this.renderState = RenderState.fromCache({
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
            viewport : new BoundingRectangle(0, 0, this._size, this._size)
        });

        this.clearCommand = new ClearCommand({
            depth : 1.0,
            color : new Color(),
            renderState : this.renderState,
            framebuffer : undefined, // Set later
            owner : this
        });

        this.passState = new PassState(context);

        this.camera = camera;
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
            width : shadowMap._size,
            height : shadowMap._size,
            format : RenderbufferFormat.DEPTH_COMPONENT16
        });

        var colorTexture = new Texture({
            context : context,
            width : shadowMap._size,
            height : shadowMap._size,
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
            width : shadowMap._size,
            height : shadowMap._size,
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
        shadowMap.passState.framebuffer = framebuffer;
        shadowMap.clearCommand.framebuffer = framebuffer;
    }

    function updateFramebuffer(shadowMap, context) {
        if (!defined(shadowMap._framebuffer) || (shadowMap._shadowMapTexture.width !== shadowMap._size)) {
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
        }
    }

    ShadowMap.prototype.setSize = function(size) {
        this._size = size;
        this.renderState.viewport.width = this._size;
        this.renderState.viewport.height = this._size;
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

    function applyDebugSettings(shadowMap, frameState) {
        if (!shadowMap.debugShow) {
            return;
        }

        if (!defined(shadowMap._debugLightFrustum)) {
            // Create the light frustum
            shadowMap._debugLightFrustum = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : new BoxOutlineGeometry({
                        minimum : new Cartesian3(-1, -1, -1),
                        maximum : new Cartesian3(1, 1, 1)
                    }),
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(Color.BLUE)
                    }
                }),
                appearance : new PerInstanceColorAppearance({
                    translucent : false,
                    flat : true
                }),
                asynchronous : false
            });
        }

        var debugLightFrustumMatrix = shadowMap._debugLightFrustum.modelMatrix;
        Matrix4.inverse(shadowMap._lightViewProjection, debugLightFrustumMatrix);
        shadowMap._debugLightFrustum.update(frameState);
        //shadowMap._debugCameraFrustum.update(frameState);

        updateDebugShadowViewCommand(shadowMap, frameState);
    }

    function updateLightViewProjectionFixed(shadowMap) {
        // Use hardcoded camera and frustum for shadow map
        var lightView = shadowMap.camera.viewMatrix;
        var lightProjection = shadowMap.camera.frustum.projectionMatrix;
        shadowMap._lightViewProjection = Matrix4.multiplyTransformation(lightProjection, lightView, shadowMap._lightViewProjection);
    }

    ShadowMap.prototype.update = function(frameState) {
        updateLightViewProjectionFixed(this);
        applyDebugSettings(this, frameState);
        updateFramebuffer(this, frameState.context);
    };

    // Converts from NDC space to texture space
    var scaleBiasMatrix = new Matrix4(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);

    ShadowMap.prototype.updateShadowMapMatrix = function(uniformState) {
        // Calculate shadow map matrix. It converts gl_Position to shadow map texture space.
        var shadowMapMatrix = this._shadowMapMatrix;
        Matrix4.multiplyTransformation(scaleBiasMatrix, this._lightViewProjection, shadowMapMatrix);
        Matrix4.multiply(shadowMapMatrix, uniformState.inverseViewProjection, shadowMapMatrix);
    };

    ShadowMap.prototype.isDestroyed = function() {
        return false;
    };

    ShadowMap.prototype.destroy = function() {
        destroyFramebuffer(this);

        this._debugLightFrustum = this._debugLightFrustum && this._debugLightFrustum.destroy();
        this._debugCameraFrustum = this._debugCameraFrustum && this._debugCameraFrustum.destroy();
        this._debugShadowViewCommand = this._debugShadowViewCommand && this._debugShadowViewCommand.shaderProgram && this._debugShadowViewCommand.shaderProgram.destroy();

        return destroyObject(this);
    };

    return ShadowMap;
});
