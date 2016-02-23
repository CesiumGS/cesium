/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryAttributes',
        '../Core/GeometryInstance',
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
        './Primitive'
    ], function(
        BoundingRectangle,
        BoxOutlineGeometry,
        Cartesian3,
        Cartesian4,
        Color,
        ColorGeometryInstanceAttribute,
        ComponentDatatype,
        defined,
        defineProperties,
        destroyObject,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
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
        Primitive) {
    'use strict';

    /**
     * @private
     */
    function ShadowMap(context, lightCamera) {
        this.enabled = false;

        this.debugShow = false;
        this.debugFreezeFrame = false;
        this._debugLightFrustum = undefined;
        this._debugCameraFrustum = undefined;
        this._debugShadowViewCommand = undefined;

        this._shadowMapMatrix = new Matrix4();
        this._shadowMapTexture = undefined;
        this._framebuffer = undefined;
        this._size = 1024; // Width and height of the shadow map in pixels

        this._lightCamera = lightCamera;
        this._shadowMapCamera = new ShadowMapCamera();
        this._sceneCamera = undefined;
        this._farPlane = 100.0; // Shadow map covers only a portion of the scene's camera

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

    var scratchMatrix = new Matrix4();
    var scratchFrustumCorners = new Array(8);
    for (var i = 0; i < 8; ++i) {
        scratchFrustumCorners[i] = new Cartesian4();
    }

    function createDebugFrustum(camera, color) {
        var view = camera.viewMatrix;
        var projection = camera.frustum.projectionMatrix;
        var viewProjection = Matrix4.multiply(projection, view, scratchMatrix);
        var inverseViewProjection = Matrix4.inverse(viewProjection, scratchMatrix);

        var corners = scratchFrustumCorners;
        Cartesian4.fromElements(-1, -1, -1, 1, corners[0]);
        Cartesian4.fromElements(1, -1, -1, 1, corners[1]);
        Cartesian4.fromElements(1, 1, -1, 1, corners[2]);
        Cartesian4.fromElements(-1, 1, -1, 1, corners[3]);
        Cartesian4.fromElements(-1, -1, 1, 1, corners[4]);
        Cartesian4.fromElements(1, -1, 1, 1, corners[5]);
        Cartesian4.fromElements(1, 1, 1, 1, corners[6]);
        Cartesian4.fromElements(-1, 1, 1, 1, corners[7]);

        for (var i = 0; i < 8; ++i) {
            var corner = corners[i];
            Matrix4.multiplyByVector(inverseViewProjection, corner, corner);
            Cartesian3.divideByScalar(corner, corner.w, corner); // Handle the perspective divide
        }

        var geometryInstances = new Array(8);
        for (var j = 0; j < 8; ++j) {
            geometryInstances[j] = new GeometryInstance({
                geometry : new SphereOutlineGeometry({
                    radius : 1.0
                }),
                modelMatrix : Matrix4.fromTranslation(corners[j]),
                attributes : {
                    color : ColorGeometryInstanceAttribute.fromColor(color)
                }
            });
        }

        return new Primitive({
            geometryInstances : geometryInstances,
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });

    }

    function applyDebugSettings(shadowMap, frameState) {
        if (!shadowMap.debugShow) {
            return;
        }

        // TODO : for now need to always recreate the primitive, find a faster alternative if it exists
        shadowMap._debugLightFrustum = shadowMap._debugLightFrustum && shadowMap._debugLightFrustum.destroy();
        shadowMap._debugLightFrustum = createDebugFrustum(shadowMap._shadowMapCamera, Color.RED);

        shadowMap._debugCameraFrustum = shadowMap._debugCameraFrustum && shadowMap._debugCameraFrustum.destroy();
        shadowMap._debugCameraFrustum = createDebugFrustum(shadowMap._sceneCamera, Color.BLUE);

        shadowMap._debugLightFrustum.update(frameState);
        shadowMap._debugCameraFrustum.update(frameState);

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

    var scratchRight = new Cartesian3();
    var scratchUp = new Cartesian3();

    function createViewMatrix(d, u, r, result) {
        result[0] = r.x;
        result[1] = u.x;
        result[2] = -d.x;
        result[3] = 0.0;
        result[4] = r.y;
        result[5] = u.y;
        result[6] = -d.y;
        result[7] = 0.0;
        result[8] = r.z;
        result[9] = u.z;
        result[10] = -d.z;
        result[11] = 0.0;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = 0.0;
        result[15] = 1.0;
        return result;
    }

    var scratchLightView = new Matrix4();
    var scratchMin = new Cartesian3();
    var scratchMax = new Cartesian3();
    var scratchTranslation = new Cartesian3();

    function updateLightViewProjection(shadowMap) {
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

        var lightView = createViewMatrix(lightDir, lightUp, lightRight, scratchLightView);
        var cameraToLight = Matrix4.multiply(lightView, inverseViewProjection, scratchMatrix);

        // Define the corners of the camera frustum in NDC space
        var frustumCorners = scratchFrustumCorners;
        Cartesian4.fromElements(-1, -1, 1, 1, frustumCorners[0]);
        Cartesian4.fromElements(1, -1, 1, 1, frustumCorners[1]);
        Cartesian4.fromElements(1, 1, 1, 1, frustumCorners[2]);
        Cartesian4.fromElements(-1, 1, 1, 1, frustumCorners[3]);
        Cartesian4.fromElements(1, -1, -1, 1, frustumCorners[4]);
        Cartesian4.fromElements(1, 1, -1, 1, frustumCorners[5]);
        Cartesian4.fromElements(-1, 1, -1, 1, frustumCorners[6]);
        Cartesian4.fromElements(-1, -1, -1, 1, frustumCorners[7]);

        // Project each corner from NDC space to light view space, and calculate a min and max in light view space
        var min = Cartesian3.fromElements(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE, scratchMin);
        var max = Cartesian3.fromElements(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE, scratchMax);

        for(var i = 0; i < 8; ++i) {
            var corner = frustumCorners[i];
            Matrix4.multiplyByVector(cameraToLight, corner, corner);
            Cartesian3.divideByScalar(corner, corner.w, corner); // Handle the perspective divide
            Cartesian3.minimumByComponent(corner, min, min);
            Cartesian3.maximumByComponent(corner, max, max);
        }

        // 2. TODO : Set bounding box back to include objects in the light's view

        // 3. Adjust light view matrix so that it is centered on the bounding volume
        var translation = scratchTranslation;
        translation.x = -(0.5 * (min.x + max.x));
        translation.y = -(0.5 * (min.y + max.y));
        translation.z = -max.z;

        var translationMatrix = Matrix4.fromTranslation(translation, scratchMatrix);
        lightView = Matrix4.multiply(translationMatrix, lightView, lightView);

        // 4. Now create an orthographic projection matrix that covers the bounding box extents
        var halfWidth = 0.5 * (max.x - min.x);
        var halfHeight = 0.5 * (max.y - min.y);
        var depth = max.z - min.z;

        // Update the shadow map camera
        var frustum = shadowMapCamera.frustum;
        frustum.left = -halfWidth;
        frustum.right = halfWidth;
        frustum.bottom = -halfHeight;
        frustum.top = halfHeight;
        frustum.near = 0.01;
        frustum.far = depth;

        Matrix4.clone(lightView, shadowMapCamera.viewMatrix);
        Matrix4.inverseTransformation(lightView, shadowMapCamera.inverseViewMatrix);
        Matrix4.getTranslation(shadowMapCamera.inverseViewMatrix, shadowMapCamera.positionWC);
        Cartesian3.clone(lightDir, shadowMapCamera.directionWC);
        Cartesian3.clone(lightUp, shadowMapCamera.upWC);
        Cartesian3.clone(lightRight, shadowMapCamera.rightWC);
    }

    function updateCameras(shadowMap, camera) {
        if (shadowMap.debugFreezeFrame) {
            return;
        }

        // TODO : rename
        // Clone light camera into the shadow map camera
        shadowMap._shadowMapCamera.clone(shadowMap._lightCamera);

        // Clone scene camera and limit the far plane
        shadowMap._sceneCamera = Camera.clone(camera, shadowMap._sceneCamera);
        shadowMap._sceneCamera.frustum.far = shadowMap._farPlane;
    }

    ShadowMap.prototype.update = function(frameState) {
        updateCameras(this, frameState.camera);
        updateLightViewProjection(this);
        applyDebugSettings(this, frameState);
        updateFramebuffer(this, frameState.context);
    };

    // Converts from NDC space to texture space
    var scaleBiasMatrix = new Matrix4(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);

    ShadowMap.prototype.updateShadowMapMatrix = function(uniformState) {
        // Calculate shadow map matrix. It converts gl_Position to shadow map texture space.
        var view = this._shadowMapCamera.viewMatrix;
        var projection = this._shadowMapCamera.frustum.projectionMatrix;
        var shadowMapMatrix = this._shadowMapMatrix;
        Matrix4.multiply(projection, view, shadowMapMatrix);
        Matrix4.multiply(scaleBiasMatrix, shadowMapMatrix, shadowMapMatrix);
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
