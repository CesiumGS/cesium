/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
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
    "use strict";

    // TODO : doc
    /**
     * @private
     */
    function ShadowMap(context, camera) {
        this.enabled = true;

        this.debugShow = false;
        this.debugFreezeFrame = false;
        this._debugLightFrustum = undefined;
        this._debugLight = undefined;
        this._debugCameraFrustum = undefined;
        this._debugCamera = undefined;
        this._debugShadowViewCommand = undefined;

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

        // TODO : determine frustum based on scene
        var frustum = new OrthographicFrustum();
        frustum.left = -15.0;
        frustum.right = 15.0;
        frustum.bottom = -15.0;
        frustum.top = 15.0;
        frustum.near = 1.0;
        frustum.far = 100.0;
        this._frustum = frustum;

        // TODO : position camera based on sun direction
        camera.frustum = frustum;
        var centerLongitude = -1.31968;
        var centerLatitude = 0.698874;
        camera.lookAt(Cartesian3.fromRadians(centerLongitude, centerLatitude), new Cartesian3(0.0, 0.0, 75.0));
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
        shadowMap.framebuffer = shadowMap.framebuffer && !shadowMap.framebuffer.isDestroyed() && shadowMap.framebuffer.destroy();
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
        if (!defined(shadowMap.framebuffer) || (shadowMap._shadowMapTexture.width !== shadowMap._size)) {
            destroyFramebuffer(shadowMap);
            createFramebuffer(shadowMap, context);
        }
    }

    ShadowMap.createShadowCastVertexShader = function(vs) {
        // TODO : vertex shader could be optimized by removing all varyings
        return vs;
    };

    ShadowMap.createShadowCastFragmentShader = function(fs, context) {
        // TODO : optimize for different cases - opaque geometry shader can be very simple and fast, unlike below
        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
        fs +=
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    if (gl_FragColor.a == 0.0) { \n' +
            '       discard; \n' +
            '    } \n' +
            '    gl_FragColor = ' + (context.depthTexture ? 'vec4(1.0)' : 'czm_packDepth(gl_FragCoord.z)') + '; \n' +
            '}';
        return fs;
    };

    ShadowMap.createReceiveShadowsVertexShader = function(vs) {
        // TODO: will need to adapt this for GPU RTE, e.g., when there is low and high position attributes.
        vs = ShaderSource.replaceMain(vs, 'czm_shadow_main');
        vs +=
            'varying vec3 czm_shadowMapCoordinate; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    czm_shadowMapCoordinate = (czm_sunShadowMapMatrix * gl_Position).xyz; \n' +
            '} \n';
        return vs;
    };

    ShadowMap.createReceiveShadowsFragmentShader = function(fs, context) {
        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
        fs +=
            'varying vec3 czm_shadowMapCoordinate; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    float depth = czm_shadowMapCoordinate.z; \n' +

            (context.depthTexture ?
            '    float shadowDepth = texture2D(czm_sunShadowMapTexture, czm_shadowMapCoordinate.xy).r; \n' :
            '    float shadowDepth = czm_unpackDepth(texture2D(czm_sunShadowMapTexture, czm_shadowMapCoordinate.xy)); \n') +

            '    // TODO : remove if \n' +
            '    if (depth - 0.005 > shadowDepth) { \n' +
            '        gl_FragColor.rgb *= 0.2; \n' +
            '    } \n' +
            '} \n';
        return fs;
    };

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

        // TODO : will need to reposition if the light moves
        if (!defined(shadowMap._debugLightFrustum)) {
            var frustum = shadowMap._frustum;
            var minimum = new Cartesian3(frustum.left, frustum.bottom, -frustum.near);
            var maximum = new Cartesian3(frustum.right, frustum.top, -frustum.far);
            var modelMatrix = shadowMap.camera.inverseViewMatrix;

            // Create the light frustum
            shadowMap._debugLightFrustum = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : new BoxOutlineGeometry({
                        minimum : minimum,
                        maximum : maximum
                    }),
                    modelMatrix : modelMatrix,
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

            // Create the light
            shadowMap._debugLight = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : new SphereOutlineGeometry({
                        radius : 1.0
                    }),
                    modelMatrix : modelMatrix,
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

            //// Create the camera frustum
            //var nearPlane = frameState.camera.frustum.near;
            //var farPlane = frameState.camera.frustum.far;
            //shadowMap._debugCameraFrustum = new Primitive({
            //    geometryInstances : new GeometryInstance({
            //        geometry : new BoxOutlineGeometry({
            //            minimum : new Cartesian3(-0.0, -0.0, -nearPlane),
            //            maximum : new Cartesian3(0.0, 0.0, -farPlane)
            //        }),
            //        attributes : {
            //            color : ColorGeometryInstanceAttribute.fromColor(Color.RED)
            //        }
            //    }),
            //    appearance : new PerInstanceColorAppearance({
            //        translucent : false,
            //        flat : true
            //    }),
            //    asynchronous : false
            //});
        }

        //if (!shadowMap.debugFreezeFrame) {
        //
        //    //var nearPlane = frameState.camera.frustum.near;
        //    //var point = Matrix4.multiplyByPoint(frameState.context.uniformState.inverseViewProjection, new Cartesian3(0, 0, -nearPlane), new Cartesian3());
        //    //console.log(point.x, point.y, point.z);
        //    //console.log(frameState.camera.positionWC.x, frameState.camera.positionWC.y, frameState.camera.positionWC.z);
        //    //
        //    //// TODO : possibly get this from the camera instead
        //    //var cameraMatrix = frameState.context.uniformState.inverseViewProjection;
        //    //shadowMap._debugCameraFrustum.modelMatrix = cameraMatrix;
        //}

        shadowMap._debugLightFrustum.update(frameState);
        shadowMap._debugLight.update(frameState);
        //shadowMap._debugCameraFrustum.update(frameState);

        updateDebugShadowViewCommand(shadowMap, frameState);
    }

    // Converts from NDC space to texture space
    var scaleBiasMatrix = new Matrix4(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);

    ShadowMap.prototype.update = function(frameState) {
        var context = frameState.context;
        var uniformState = context.uniformState;

        applyDebugSettings(this, frameState);

        updateFramebuffer(this, context);

        // Calculate shadow map matrix. It converts gl_Position to shadow map texture space.
        // TODO : only compute matrix when dirty
        var viewMatrix = this.camera.viewMatrix;
        var projectionMatrix = this._frustum.projectionMatrix;
        var shadowMapMatrix = Matrix4.multiplyTransformation(projectionMatrix, viewMatrix, this._shadowMapMatrix);
        Matrix4.multiplyTransformation(scaleBiasMatrix, shadowMapMatrix, shadowMapMatrix);
        Matrix4.multiply(shadowMapMatrix, uniformState.inverseViewProjection, shadowMapMatrix);
    };

    ShadowMap.prototype.isDestroyed = function() {
        return false;
    };

    ShadowMap.prototype.destroy = function() {
        destroyFramebuffer(this);

        this._debugLightFrustum = this._debugLightFrustum && this._debugLightFrustum.destroy();
        this._debugLight = this._debugLight && this._debugLight.destroy();
        this._debugCameraFrustum = this._debugCameraFrustum && this._debugCameraFrustum.destroy();
        this._debugCamera = this._debugCamera && this._debugCamera.destroy();
        this._debugShadowViewCommand = this._debugShadowViewCommand && this._debugShadowViewCommand.shaderProgram && this._debugShadowViewCommand.shaderProgram.destroy();

        return destroyObject(this);
    };

    return ShadowMap;
});
