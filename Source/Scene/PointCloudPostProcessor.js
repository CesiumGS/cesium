/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/Pass',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Scene/BlendingState'
    ], function(
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        Framebuffer,
        Pass,
        PixelDatatype,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        BlendingState) {
    'use strict';

     /**
     * @private
     */
    function PointCloudPostProcessor() {
        this._framebuffers = undefined;
        this._colorTextures = undefined;
        this._ecTextures = undefined;
        this._depthTextures = undefined;
        this._drawCommands = undefined;
        this._blendCommand = undefined;
        this._clearCommand = undefined;
    }

    function createSampler() {
        return new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
    }

    function destroyFramebuffers(processor) {
        processor._depthTextures[0].destroy();
        processor._depthTextures[1].destroy();
        processor._colorTextures[0].destroy();
        processor._colorTextures[1].destroy();
        processor._ecTextures[0].destroy();
        processor._ecTextures[1].destroy();
        processor._framebuffers[0].destroy();
        processor._framebuffers[1].destroy();

        processor._depthTextures = undefined;
        processor._colorTextures = undefined;
        processor._framebuffers = undefined;
    }

    function createFramebuffers(processor, context) {
        var i;
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;


        var colorTextures = new Array(2);
        var ecTextures = new Array(2);
        var depthTextures = new Array(2);
        var framebuffers = new Array(2);

        if (!context.floatingPointTexture)
            throw new DeveloperError('Context must support floating point textures!');

        for (i = 0; i < 2; ++i) {
            colorTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : createSampler()
            });

            ecTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.FLOAT,
                sampler : createSampler()
            });

            depthTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.DEPTH_STENCIL,
                pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
                sampler : createSampler()
            });

            // TODO : for now assume than any pass can write depth, possibly through EXT_frag_depth.
            // Definitely needed for the initial render into the FBO, possibly also the ping-pong processing.
            framebuffers[i] = new Framebuffer({
                context : context,
                depthStencilTexture : depthTextures[i],
                colorTextures : [colorTextures[i], ecTextures[i]],
                destroyAttachments : false
            });
        }

        processor._depthTextures = depthTextures;
        processor._colorTextures = colorTextures;
        processor._ecTextures = ecTextures;
        processor._framebuffers = framebuffers;
    }

    function createUniformMap(processor, index) {
        return {
            pointCloud_colorTexture : function() {
                // Use the other color texture as input
                return processor._colorTextures[1 - index];
            },
            pointCloud_ecTexture : function() {
                // Use the other color texture as input
                return processor._ecTextures[1 - index];
            },
            pointCloud_depthTexture : function() {
                return processor._depthTextures[1 - index];
            }
        };
    }

    function createCommands(processor, context) {
        var i;
        var framebuffers = processor._framebuffers;
        var uniformMaps = [
            createUniformMap(processor, 0),
            createUniformMap(processor, 1)
        ];

        var stageFS =
            'uniform sampler2D pointCloud_colorTexture; \n' +
            'uniform sampler2D pointCloud_depthTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
            '    float depth = texture2D(pointCloud_depthTexture, v_textureCoordinates).r; \n' +
            '    color.rgb = color.rgb * 0.5 + vec3(depth) * 0.5; \n' +
            '    gl_FragColor = color; \n' +
            '} \n';

        // TODO : faking post-processing stages for testing
        var stagesLength = 3;
        var drawCommands = new Array(stagesLength);
        for (i = 0; i < stagesLength; ++i) {
            drawCommands[i] = context.createViewportQuadCommand(stageFS, {
                uniformMap : uniformMaps[i % 2],
                framebuffer : framebuffers[i % 2],
                renderState : RenderState.fromCache(),
                pass : Pass.CESIUM_3D_TILE,
                owner : processor
            });
        }

        // TODO : point cloud depth information is lost
        var blendFS =
            'uniform sampler2D pointCloud_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
            '    gl_FragColor = color; \n' +
            '} \n';

        var blendRenderState = RenderState.fromCache({
            blending : BlendingState.ALPHA_BLEND
        });

        var blendCommand = context.createViewportQuadCommand(blendFS, {
            uniformMap : uniformMaps[stagesLength % 2],
            renderState : blendRenderState,
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });

        // TODO : may need to clear FBOs between each stage instead of just clearing the main FBO.
        var clearCommand = new ClearCommand({
            framebuffer : framebuffers[1],
            color : new Color(0.0, 0.0, 0.0, 0.0),
            depth : 1.0,
            renderState : RenderState.fromCache(),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });

        processor._drawCommands = drawCommands;
        processor._blendCommand = blendCommand;
        processor._clearCommand = clearCommand;
    }

    function updateCommandFramebuffers(processor) {
        var framebuffers = processor._framebuffers;
        var drawCommands = processor._drawCommands;
        var clearCommand = processor._clearCommand;
        var length = drawCommands.length;
        for (var i = 0; i < length; ++i) {
            drawCommands[i].framebuffer = framebuffers[i % 2];
        }
        clearCommand.framebuffer = framebuffers[1];
    }

    function createResources(processor, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;
        var depthTextures = processor._depthTextures;
        var drawCommands = processor._drawCommands;
        var resized = defined(depthTextures) &&
            ((depthTextures[0].width !== screenWidth) ||
             (depthTextures[0].height !== screenHeight));

        if (!defined(depthTextures)) {
            createFramebuffers(processor, context);
        }

        if (!defined(drawCommands)) {
            createCommands(processor, context);
        }

        if (resized) {
            destroyFramebuffers(processor);
            createFramebuffers(processor, context);
            updateCommandFramebuffers(processor);
        }
    }

    function processingSupported(context) {
        return context.depthTexture;
    }

    PointCloudPostProcessor.prototype.update = function(frameState, commandStart) {
        if (!processingSupported(frameState.context)) {
            return;
        }

        createResources(this, frameState.context);

        // Render point cloud commands into an offscreen FBO.
        var i;
        var commandList = frameState.commandList;
        var commandEnd = commandList.length;
        for (i = commandStart; i < commandEnd; ++i) {
            var command = commandList[i];
            command.framebuffer = this._framebuffers[1];
            command.pass = Pass.CESIUM_3D_TILE; // Overrides translucent commands
        }

        // Apply processing commands
        var drawCommands = this._drawCommands;
        var length = drawCommands.length;
        for (i = 0; i < length; ++i) {
            commandList.push(drawCommands[i]);
        }

        // Blend final result back into the main FBO
        commandList.push(this._blendCommand);

        // TODO: technically should apply the clear sooner since the FBO's color texture is undefined on the first frame. Related to TODO above. This may also explain some black flashes during resizing.
        commandList.push(this._clearCommand);
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloudPostProcessor.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Part of the {@link Cesium3DTileContent} interface.
     */
    PointCloudPostProcessor.prototype.destroy = function() {
        // TODO: actually destroy stuff
        return destroyObject(this);
    };

    return PointCloudPostProcessor;
});
