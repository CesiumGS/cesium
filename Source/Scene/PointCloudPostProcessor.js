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
        this._ecTexture = undefined;
        this._depthTextures = undefined;
        this._drawCommands = undefined;
        this._blendCommand = undefined;
        this._clearCommands = undefined;
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
        processor._ecTexture.destroy();
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
        var depthTextures = new Array(3);

        var ecTexture = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT,
            sampler : createSampler()
        });

        for (i = 0; i < 3; ++i) {
            if (i < 2) {
                colorTextures[i] = new Texture({
                    context : context,
                    width : screenWidth,
                    height : screenHeight,
                    pixelFormat : PixelFormat.RGBA,
                    pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                    sampler : createSampler()
                });
            }

            depthTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.DEPTH_STENCIL,
                pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
                sampler : createSampler()
            });
        }

        /* We want to reuse textures as much as possible, so here's the order
         * of events:
         *
         * 1.  We render normally to our prior:
         *     * Color -> 0
         *     * Depth -> 2 ("dirty depth")
         *     * EC -> 0
         * 2.  Then we perform the screen-space point occlusion stage with color[0] and EC:
         *     * No color
         *     * Depth -> 0
         *     * No EC
         * 3a. Then we perform the region growing stage with color[0] and depth[0]:
         *     * Color -> 1
         *     * Depth -> 1
         * 3b. We do the region growing stage again with color[1] and depth[1]:
         *     * Color -> 0
         *     * Depth -> 0
         * 3c. Repeat steps 3a and 3b until all holes are filled and/or we run
         *     out of time.
         */

        processor._framebuffers = {
            "prior": new Framebuffer({
                context : context,
                colorTextures : [
                    colorTextures[0],
                    ecTexture
                ],
                depthStencilTexture : depthTextures[2],
                destroyAttachments : false
            }),
            "screenSpacePass": new Framebuffer({
                context : context,
                depthStencilTexture : depthTextures[0],
                destroyAttachments : false
            }),
            "regionGrowingPassA": new Framebuffer({
                context : context,
                depthStencilTexture : depthTextures[1],
                colorTextures : [colorTextures[1]],
                destroyAttachments : false
            }),
            "regionGrowingPassB": new Framebuffer({
                context: context,
                depthStencilTexture: depthTextures[0],
                colorTextures: [colorTextures[0]],
                destroyAttachments: false
            })
        };
        processor._depthTextures = depthTextures;
        processor._colorTextures = colorTextures;
        processor._ecTexture = ecTexture;
    }

    function pointOcclusionStage(processor, context) {
        var pointOcclusionFS =
            'uniform sampler2D pointCloud_colorTexture; \n' +
            'uniform sampler2D pointCloud_ECTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
            '    vec4 EC = texture2D(pointCloud_ECTexture, v_textureCoordinates); \n' +
            '    color.rgb = color.rgb * 0.5 + vec3(normalize(EC.xyz)) * 0.1; \n' +
            '    gl_FragColor = color; \n' +
            '} \n';

        var uniformMap = {
            pointCloud_colorTexture: function() {
                return processor._colorTextures[0];
            },
            pointCloud_ECTexture: function() {
                return processor._ecTexture;
            }
        };
        return context.createViewportQuadCommand(pointOcclusionFS, {
            uniformMap : uniformMap,
            framebuffer : processor._framebuffers.screenSpacePass,
            renderState : RenderState.fromCache(),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function regionGrowingStage(processor, context, iteration) {
        var regionGrowingFS =
            'uniform sampler2D pointCloud_colorTexture; \n' +
            'uniform sampler2D pointCloud_depthTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
            '    float depth = texture2D(pointCloud_depthTexture, v_textureCoordinates).r; \n' +
            '    color.rgb = color.rgb * 0.5 + vec3(depth) * 0.1; \n' +
            '    gl_FragColor = color; \n' +
            '} \n';

        var i = iteration % 2;

        var uniformMap = {
            pointCloud_colorTexture: function() {
                return processor._colorTextures[i];
            },
            pointCloud_depthTexture: function() {
                return processor._depthTextures[i];
            }
        };

        var framebuffer = (i === 0) ?
            processor._framebuffers.regionGrowingPassA :
            processor._framebuffers.regionGrowingPassB;

        return context.createViewportQuadCommand(regionGrowingFS, {
            uniformMap : uniformMap,
            framebuffer : framebuffer,
            renderState : RenderState.fromCache(),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function createCommands(processor, context) {
        var numRegionGrowingPasses = 4;
        var drawCommands = new Array(numRegionGrowingPasses + 1);

        var i;
        drawCommands[0] = pointOcclusionStage(processor, context);

        for (i = 0; i < numRegionGrowingPasses; i++) {
            drawCommands[i + 1] = regionGrowingStage(processor, context, i);
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

        var blendUniformMap = {
            pointCloud_colorTexture: function() {
                return processor._colorTextures[1 - drawCommands.length % 2];
            },
            pointCloud_depthTexture: function() {
                return processor._depthTextures[1 - drawCommands.length % 2];
            }
        };

        var blendCommand = context.createViewportQuadCommand(blendFS, {
            uniformMap : blendUniformMap,
            renderState : blendRenderState,
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });

        var framebuffers = processor._framebuffers;
        var clearCommands = new Array(4);
        i = 0;
        for (var name in framebuffers) {
            if (framebuffers.hasOwnProperty(name)) {
                clearCommands[i] = new ClearCommand({
                    framebuffer : framebuffers[name],
                    color : new Color(0.0, 0.0, 0.0, 0.0),
                    depth : 1.0,
                    renderState : RenderState.fromCache(),
                    pass : Pass.CESIUM_3D_TILE,
                    owner : processor
                });
                i++;
            }
        }

        processor._drawCommands = drawCommands;
        processor._blendCommand = blendCommand;
        processor._clearCommands = clearCommands;
    }

    function createResources(processor, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;
        var colorTextures = processor._colorTextures;
        var drawCommands = processor._drawCommands;
        var resized = defined(colorTextures) &&
            ((colorTextures[0].width !== screenWidth) ||
             (colorTextures[0].height !== screenHeight));

        if (!defined(colorTextures)) {
            createFramebuffers(processor, context);
        }

        if (!defined(drawCommands)) {
            createCommands(processor, context);
        }

        if (resized) {
            destroyFramebuffers(processor);
            //createFramebuffers(processor, context);
            //updateCommandFramebuffers(processor);
            createCommands(processor, context);
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
            command.framebuffer = this._framebuffers.prior;
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
        for (i = 0; i < this._clearCommands.length; ++i) {
            commandList.push(this._clearCommands[i]);
        }
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
