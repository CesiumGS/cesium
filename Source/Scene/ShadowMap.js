/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/PixelFormat',
        '../Core/SphereOutlineGeometry',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
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
        destroyObject,
        GeometryInstance,
        Matrix4,
        PixelFormat,
        SphereOutlineGeometry,
        ClearCommand,
        Framebuffer,
        PassState,
        PixelDatatype,
        RenderState,
        ShaderProgram,
        ShaderSource,
        Texture,
        Camera,
        CullFace,
        OrthographicFrustum,
        Pass,
        PerInstanceColorAppearance,
        Primitive) {
    "use strict";

    // TODO : doc
    // TODO : handle if depth texture extension is not supported

    /**
     * @private
     */
    function ShadowMap(scene) {
        this.enabled = true;

        this.debugShow = false;
        this.debugFreezeFrame = false;
        this._debugLightFrustum = undefined;
        this._debugLight = undefined;
        this._debugCameraFrustum = undefined;
        this._debugCamera = undefined;
        this._debugShadowViewCommand = undefined;

        this._depthStencilTexture = undefined;
        this._framebuffer = undefined;
        this._size = 1024; // Width and height of the shadow map in pixels

        this.renderState = RenderState.fromCache({
            cull : {
                enabled : true,
                face : CullFace.BACK
            },
            depthTest : {
                enabled : true
            },
            colorMask : {
                red : false,
                green : false,
                blue : false,
                alpha : false
            },
            depthMask : true,
            viewport : new BoundingRectangle(0, 0, this._size, this._size)
        });

        this.passState = new PassState(scene.context);

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
        var camera = new Camera(scene);
        camera.frustum = frustum;
        var centerLongitude = -1.31968;
        var centerLatitude = 0.698874;
        camera.lookAt(Cartesian3.fromRadians(centerLongitude, centerLatitude), new Cartesian3(0.0, 0.0, 75.0));
        this.camera = camera;

        this.clearCommand = new ClearCommand({
            depth : 1.0,
            renderState : this.renderState,
            framebuffer : undefined, // Set later
            owner : this
        });
    }

    function destroyTextures(shadowMap) {
        shadowMap._depthStencilTexture = shadowMap._depthStencilTexture && !shadowMap._depthStencilTexture.isDestroyed() && shadowMap._depthStencilTexture.destroy();
    }

    function destroyFramebuffers(shadowMap) {
        shadowMap.framebuffer = shadowMap.framebuffer && !shadowMap.framebuffer.isDestroyed() && shadowMap.framebuffer.destroy();
    }

    function createTextures(shadowMap, context) {
        // TODO : Use nearest filtering for testing, not default linear.
        shadowMap._depthStencilTexture = new Texture({
            context : context,
            width : shadowMap._size,
            height : shadowMap._size,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
        });
    }

    function createFramebuffers(shadowMap, context) {
        destroyTextures(shadowMap);
        destroyFramebuffers(shadowMap);

        createTextures(shadowMap, context);

        var framebuffer = new Framebuffer({
            context : context,
            depthStencilTexture : shadowMap._depthStencilTexture,
            destroyAttachments : false
        });

        shadowMap._framebuffer = framebuffer;
        shadowMap.passState.framebuffer = framebuffer;
        shadowMap.clearCommand.framebuffer = framebuffer;
    }

    function updateFramebuffers(shadowMap, context) {
        var depthStencilTexture = shadowMap._depthStencilTexture;
        var textureChanged = !defined(depthStencilTexture) || (depthStencilTexture.width !== shadowMap._size);
        if (!defined(shadowMap.framebuffer) || textureChanged) {
            createFramebuffers(shadowMap, context);
        }
    }

    ShadowMap.createShadowCastProgram = function(shaderProgram) {
        // TODO : unused right now
        // TODO : vertex shader won't be optimized
        // TODO : handle mismatched varyings
        var vs = shaderProgram.vertexShaderText;
        var fs =
            'void main()\n' +
            '{\n' +
            '    gl_FragColor = vec4(0.0);\n' +
            '}\n';

        return ShaderProgram.fromCache({
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : shaderProgram._attributeLocations
        });
    };

    ShadowMap.createReceiveShadowsVertexShader = function(vs) {
        vs = ShaderSource.replaceMain(vs, 'czm_shadow_main');
        vs +=
            'varying vec3 czm_shadowMapCoordinate; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    czm_shadowMapCoordinate = (czm_shadowMapMatrix * gl_Position).xyz; \n' +
            '} \n';
        return vs;
    };

    ShadowMap.createReceiveShadowsFragmentShader = function(fs) {
        fs = ShaderSource.replaceMain(fs, 'czm_shadow_main');
        fs +=
            'varying vec3 czm_shadowMapCoordinate; \n' +
            'void main() \n' +
            '{ \n' +
            '    czm_shadow_main(); \n' +
            '    float depth = czm_shadowMapCoordinate.z; \n' +
            '    float shadowDepth = texture2D(czm_shadowMapTexture, czm_shadowMapCoordinate.xy).r; \n' +
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
                '    float shadow = texture2D(czm_shadowMapTexture, v_textureCoordinates).r; \n' +
                '    gl_FragColor = vec4(shadow, shadow, shadow, 1.0); \n' +
                '} \n';

            // Set viewport now to avoid using a cached render state
            var renderState = RenderState.fromCache({
                viewport : new BoundingRectangle(x, y, width, height)
            });

            var drawCommand = frameState.context.createViewportQuadCommand(fs);
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
    var scratchMatrix = new Matrix4();

    ShadowMap.prototype.update = function(frameState) {
        var enabled = frameState.shadowsEnabled = this.enabled;
        if (!enabled) {
            return;
        }

        var context = frameState.context;
        var uniformState = context.uniformState;

        applyDebugSettings(this, frameState);

        updateFramebuffers(this, context);

        // Calculate shadow map matrix. It converts gl_Position to shadow map texture space.
        // TODO : only compute matrix when dirty
        var viewMatrix = this.camera.viewMatrix;
        var projectionMatrix = this._frustum.projectionMatrix;
        var shadowMapViewProjection = Matrix4.multiplyTransformation(projectionMatrix, viewMatrix, scratchMatrix);
        Matrix4.multiplyTransformation(scaleBiasMatrix, shadowMapViewProjection, shadowMapViewProjection);
        Matrix4.multiply(shadowMapViewProjection, uniformState.inverseViewProjection, shadowMapViewProjection);

        // Update uniforms for shadow receiving
        uniformState.shadowMapTexture = this._depthStencilTexture;
        uniformState.shadowMapMatrix = shadowMapViewProjection;
    };

    ShadowMap.prototype.isDestroyed = function() {
        return false;
    };

    ShadowMap.prototype.destroy = function() {
        destroyTextures(this);
        destroyFramebuffers(this);

        this._debugLightFrustum = this._debugLightFrustum && this._debugLightFrustum.destroy();
        this._debugLight = this._debugLight && this._debugLight.destroy();
        this._debugCameraFrustum = this._debugCameraFrustum && this._debugCameraFrustum.destroy();
        this._debugCamera = this._debugCamera && this._debugCamera.destroy();
        this._debugShadowViewCommand = this._debugShadowViewCommand && this._debugShadowViewCommand.shaderProgram && this._debugShadowViewCommand.shaderProgram.destroy();

        return destroyObject(this);
    };

    return ShadowMap;
});
