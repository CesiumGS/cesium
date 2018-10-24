define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/FeatureDetection',
        '../Core/PixelFormat',
        '../Core/PrimitiveType',
        '../Renderer/ClearCommand',
        '../Renderer/DrawCommand',
        '../Renderer/Framebuffer',
        '../Renderer/Pass',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Scene/BlendingState',
        '../Shaders/PostProcessStages/PointCloudEyeDomeLighting'
    ], function(
        Cartesian3,
        Color,
        defined,
        destroyObject,
        FeatureDetection,
        PixelFormat,
        PrimitiveType,
        ClearCommand,
        DrawCommand,
        Framebuffer,
        Pass,
        PixelDatatype,
        RenderState,
        Sampler,
        ShaderSource,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        BlendingState,
        PointCloudEyeDomeLightingShader) {
    'use strict';

    /**
     * Eye dome lighting. Does not support points with per-point translucency, but does allow translucent styling against the globe.
     * Requires support for EXT_frag_depth and WEBGL_draw_buffers extensions in WebGL 1.0.
     *
     * @private
     */
    function PointCloudEyeDomeLighting() {
        this._framebuffer = undefined;
        this._colorGBuffer = undefined; // color gbuffer
        this._depthGBuffer = undefined; // depth gbuffer
        this._depthTexture = undefined; // needed to write depth so camera based on depth works
        this._drawCommand = undefined;
        this._clearCommand = undefined;

        this._strength = 1.0;
        this._radius = 1.0;
    }

    function createSampler() {
        return new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
    }

    function destroyFramebuffer(processor) {
        var framebuffer = processor._framebuffer;
        if (!defined(framebuffer)) {
            return;
        }

        processor._colorGBuffer.destroy();
        processor._depthGBuffer.destroy();
        processor._depthTexture.destroy();
        framebuffer.destroy();

        processor._framebuffer = undefined;
        processor._colorGBuffer = undefined;
        processor._depthGBuffer = undefined;
        processor._depthTexture = undefined;
        processor._drawCommand = undefined;
        processor._clearCommand = undefined;
    }

    function createFramebuffer(processor, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        var colorGBuffer = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        var depthGBuffer = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        var depthTexture = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.DEPTH_COMPONENT,
            pixelDatatype : PixelDatatype.UNSIGNED_INT,
            sampler : createSampler()
        });

        processor._framebuffer = new Framebuffer({
            context : context,
            colorTextures : [
                colorGBuffer,
                depthGBuffer
            ],
            depthTexture : depthTexture,
            destroyAttachments : false
        });
        processor._colorGBuffer = colorGBuffer;
        processor._depthGBuffer = depthGBuffer;
        processor._depthTexture = depthTexture;
    }

    var distancesAndEdlStrengthScratch = new Cartesian3();

    function createCommands(processor, context) {
        var blendFS = PointCloudEyeDomeLightingShader;

        var blendUniformMap = {
            u_pointCloud_colorGBuffer : function() {
                return processor._colorGBuffer;
            },
            u_pointCloud_depthGBuffer : function() {
                return processor._depthGBuffer;
            },
            u_distancesAndEdlStrength : function() {
                distancesAndEdlStrengthScratch.x = processor._radius / context.drawingBufferWidth;
                distancesAndEdlStrengthScratch.y = processor._radius / context.drawingBufferHeight;
                distancesAndEdlStrengthScratch.z = processor._strength;
                return distancesAndEdlStrengthScratch;
            }
        };

        var blendRenderState = RenderState.fromCache({
            blending : BlendingState.ALPHA_BLEND,
            depthMask : true,
            depthTest : {
                enabled : true
            }
        });

        processor._drawCommand = context.createViewportQuadCommand(blendFS, {
            uniformMap : blendUniformMap,
            renderState : blendRenderState,
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });

        processor._clearCommand = new ClearCommand({
            framebuffer : processor._framebuffer,
            color : new Color(0.0, 0.0, 0.0, 0.0),
            depth : 1.0,
            renderState : RenderState.fromCache(),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function createResources(processor, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;
        var colorGBuffer = processor._colorGBuffer;
        var nowDirty = false;
        var resized = defined(colorGBuffer) &&
                      ((colorGBuffer.width !== screenWidth) ||
                       (colorGBuffer.height !== screenHeight));

        if (!defined(colorGBuffer) || resized) {
            destroyFramebuffer(processor);
            createFramebuffer(processor, context);
            createCommands(processor, context);
            nowDirty = true;
        }
        return nowDirty;
    }

    function isSupported(context) {
        return context.drawBuffers && context.fragmentDepth;
    }

    PointCloudEyeDomeLighting.isSupported = isSupported;

    function getECShaderProgram(context, shaderProgram) {
        var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, 'EC');
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;

            var fs = shaderProgram.fragmentShaderSource.clone();

            fs.sources = fs.sources.map(function(source) {
                source = ShaderSource.replaceMain(source, 'czm_point_cloud_post_process_main');
                source = source.replace(/gl_FragColor/g, 'gl_FragData[0]');
                return source;
            });

            fs.sources.unshift('#extension GL_EXT_draw_buffers : enable \n');
            fs.sources.push(
                'void main() \n' +
                '{ \n' +
                '    czm_point_cloud_post_process_main(); \n' +
                '    gl_FragData[1] = czm_packDepth(gl_FragCoord.z); \n' +
                '}');

            shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, 'EC', {
                vertexShaderSource : shaderProgram.vertexShaderSource,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }

        return shader;
    }

    PointCloudEyeDomeLighting.prototype.update = function(frameState, commandStart, pointCloudShading) {
        if (!isSupported(frameState.context)) {
            return;
        }

        this._strength = pointCloudShading.eyeDomeLightingStrength;
        this._radius = pointCloudShading.eyeDomeLightingRadius;

        var dirty = createResources(this, frameState.context);

        // Hijack existing point commands to render into an offscreen FBO.
        var i;
        var commandList = frameState.commandList;
        var commandEnd = commandList.length;

        for (i = commandStart; i < commandEnd; ++i) {
            var command = commandList[i];
            if (command.primitiveType !== PrimitiveType.POINTS || command.pass === Pass.TRANSLUCENT) {
                continue;
            }
            var derivedCommand = command.derivedCommands.pointCloudProcessor;
            if (!defined(derivedCommand) || command.dirty || dirty ||
                (derivedCommand.framebuffer !== this._framebuffer)) { // Prevent crash when tiles out-of-view come in-view during context size change
                derivedCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.pointCloudProcessor = derivedCommand;

                derivedCommand.framebuffer = this._framebuffer;
                derivedCommand.shaderProgram = getECShaderProgram(frameState.context, command.shaderProgram);
                derivedCommand.castShadows = false;
                derivedCommand.receiveShadows = false;
            }

            commandList[i] = derivedCommand;
        }

        var clearCommand = this._clearCommand;
        var blendCommand = this._drawCommand;

        // Blend EDL into the main FBO
        commandList.push(blendCommand);
        commandList.push(clearCommand);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see PointCloudEyeDomeLighting#destroy
     */
    PointCloudEyeDomeLighting.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * processor = processor && processor.destroy();
     *
     * @see PointCloudEyeDomeLighting#isDestroyed
     */
    PointCloudEyeDomeLighting.prototype.destroy = function() {
        destroyFramebuffer(this);
        return destroyObject(this);
    };

    return PointCloudEyeDomeLighting;
});
