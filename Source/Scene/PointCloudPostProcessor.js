/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/DrawCommand',
        '../Renderer/Framebuffer',
        '../Renderer/Pass',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/ShaderSource',
        '../Renderer/ShaderProgram',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Scene/BlendingState',
        '../Shaders/PostProcessFilters/PointOcclusionPass',
        '../Shaders/PostProcessFilters/RegionGrowingPass'
    ], function(
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        DrawCommand,
        Framebuffer,
        Pass,
        PixelDatatype,
        RenderState,
        Sampler,
        ShaderSource,
        ShaderProgram,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        BlendingState,
        PointOcclusionPass,
        RegionGrowingPass) {
    'use strict';

     /**
     * @private
     */
    function PointCloudPostProcessor(options) {
        this._framebuffers = undefined;
        this._colorTextures = undefined;
        this._ecTexture = undefined;
        this._depthTextures = undefined;
        this._drawCommands = undefined;
        this._blendCommand = undefined;
        this._clearCommands = undefined;

        this.occlusionAngle = options.occlusionAngle;
        this.rangeParameter = options.rangeParameter;
        this.neighborhoodHalfWidth = options.neighborhoodHalfWidth;
        this.numRegionGrowingPasses = options.numRegionGrowingPasses;
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
        var framebuffers = processor._framebuffers;
        for (var name in framebuffers) {
            if (framebuffers.hasOwnProperty(name)) {
                framebuffers[name].destroy();
            }
        }

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

    function replaceConstants(sourceStr, constantName, replacement) {
        var r = "#define\\s" + constantName + "\\s([0-9.]+)";
        return sourceStr.replace(new RegExp(r, "g"), "#define " + constantName + " " + replacement);
    };

    function pointOcclusionStage(processor, context) {
        var uniformMap = {
            pointCloud_colorTexture : function() {
                return processor._colorTextures[0];
            },
            pointCloud_ECTexture : function() {
                return processor._ecTexture;
            },
            occlusionAngle : function() {
                return processor.occlusionAngle;
            }
        };

        var pointOcclusionStr = replaceConstants(
            PointOcclusionPass,
            "neighborhoodHalfWidth",
            processor.neighborhoodHalfWidth
        );
        
        return context.createViewportQuadCommand(pointOcclusionStr, {
            uniformMap : uniformMap,
            framebuffer : processor._framebuffers.screenSpacePass,
            renderState : RenderState.fromCache({
                depthMask : true,
                depthTest : {
                    enabled : true
                }
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function regionGrowingStage(processor, context, iteration) {
        var i = iteration % 2;

        var uniformMap = {
            pointCloud_colorTexture : function() {
                return processor._colorTextures[i];
            },
            pointCloud_depthTexture : function() {
                return processor._depthTextures[i];
            },
            rangeParameter : function() {
                return processor.rangeParameter;
            }
        };

        var framebuffer = (i === 0) ?
            processor._framebuffers.regionGrowingPassA :
            processor._framebuffers.regionGrowingPassB;

        return context.createViewportQuadCommand(RegionGrowingPass, {
            uniformMap : uniformMap,
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                depthMask : true,
                depthTest : {
                    enabled : true
                }
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function createCommands(processor, context) {
        var numRegionGrowingPasses = processor.numRegionGrowingPasses;
        var drawCommands = new Array(numRegionGrowingPasses + 1);

        var i;
        drawCommands[0] = pointOcclusionStage(processor, context);

        for (i = 0; i < numRegionGrowingPasses; i++) {
            drawCommands[i + 1] = regionGrowingStage(processor, context, i);
        }

        for (i = 0; i < drawCommands.length; i++) {
            var shaderProgram = drawCommands[i].shaderProgram;
            var vsSource = shaderProgram.vertexShaderSource.clone();
            var fsSource = shaderProgram.fragmentShaderSource.clone();
            var attributeLocations = shaderProgram._attributeLocations;
            for (var a = 0; a < vsSource.sources.length; a++) {
                vsSource.sources[a] = glslModernize(vsSource.sources[a], false, true);
            }
            drawCommands[i].shaderProgram = context.shaderCache.getShaderProgram({
                vertexShaderSource : vsSource,
                fragmentShaderSource : fsSource,
                attributeLocations : attributeLocations
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
        var clearCommands = {};
        for (var name in framebuffers) {
            if (framebuffers.hasOwnProperty(name)) {
                clearCommands[name] = new ClearCommand({
                    framebuffer : framebuffers[name],
                    color : new Color(0.0, 0.0, 0.0, 0.0),
                    depth : 1.0,
                    renderState : RenderState.fromCache(),
                    pass : Pass.CESIUM_3D_TILE,
                    owner : processor
                });
            }
        }

        processor._drawCommands = drawCommands;
        processor._blendCommand = blendCommand;
        processor._clearCommands = clearCommands;
    }

    function createResources(processor, context, dirty) {
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

        if (!defined(drawCommands) || dirty) {
            createCommands(processor, context);
        }

        if (resized) {
            destroyFramebuffers(processor);
            createFramebuffers(processor, context);
            createCommands(processor, context);
        }
    }

    function processingSupported(context) {
        return context.depthTexture;
    }

    function glslModernize(source, isFragmentShader, first) {
        var mainFunctionRegex = /void\s+main\(\)/;
        var splitSource = source.split('\n');
        var mainFunctionLine;
        for (var number = 0; number < splitSource.length; number++) {
            var line = splitSource[number];
            if (mainFunctionRegex.exec(line)) {
                mainFunctionLine = number;
            }
        };

        function replaceInSource(regex, replacement) {
            for (var number = 0; number < splitSource.length; number++) {
                splitSource[number] = splitSource[number].replace(regex, replacement);
            }
        }
        
        function findInSource(regex) {
            for (var number = 0; number < splitSource.length; number++) {
                if (splitSource[number].search(regex) != -1) {
                    return true;
                }
            }
            return false;
        }

        function compileSource() {
            var wholeSource = "";
            for (var number = 0; number < splitSource.length; number++) {
                wholeSource += splitSource[number] + "\n";
            }
            return wholeSource;
        }

        function removeExtension(name) {
            var regex = "#extension\\s+GL_" + name + "\\s+:\\s+[a-zA-Z0-9]+\\s*$";
            replaceInSource(new RegExp(regex, "g"), "");
        }

        for (var i = 0; i < 10; i++) {
            var fragDataString = "gl_FragData\\[" + i + "\\]";
            var newOutput = 'czm_out' + i;
            var regex = new RegExp(fragDataString, "g");
            if (source.search(fragDataString) != -1) {
                replaceInSource(regex, newOutput);
                splitSource.splice(mainFunctionLine, 0,
                    "layout(location = " + i + ") out vec4 " +
                    newOutput + ";");
            }
        }
        
        if (findInSource(/gl_FragColor/)) {
            replaceInSource(/gl_FragColor/, "czm_fragColor");
            splitSource.splice(mainFunctionLine, 0, "layout(location = 0) out vec4 czm_fragColor");
        }

        if (first === true) {
            var versionThree = "#version 300 es";
            var foundVersion = false;
            for (var number = 0; number < splitSource.length; number++) {
                if (splitSource[number].search(/#version/) != -1) {
                    splitSource[number] = versionThree;
                    foundVersion = true;
                }
            }

            if (!foundVersion) {
                splitSource.splice(0, 0, versionThree);
            }
        }

        removeExtension("EXT_draw_buffers");
        removeExtension("EXT_frag_depth");

        replaceInSource(/texture2D/, "texture");

        if (isFragmentShader) {
            replaceInSource(/varying/, "in");
        } else {
            replaceInSource(/attribute/, "in");
            replaceInSource(/varying/, "out");
        }

        return compileSource();
    }

    function getECShaderProgram(context, shaderProgram) {
        var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, 'EC');
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;
 
            var vs = shaderProgram.vertexShaderSource.clone();
            var fs = shaderProgram.fragmentShaderSource.clone();

            vs.sources = vs.sources.map(function(source) {
                source = ShaderSource.replaceMain(source, 'czm_point_cloud_post_process_main');
                return source;
            });
            
            fs.sources = fs.sources.map(function(source) {
                source = ShaderSource.replaceMain(source, 'czm_point_cloud_post_process_main');
                source = source.replace(/gl_FragColor/g, 'gl_FragData[0]');
                return source;
            });

            vs.sources.push(
                'varying vec3 v_positionECPS; \n' +
                'void main() \n' +
                '{ \n' +
                '    czm_point_cloud_post_process_main(); \n' +
                '    v_positionECPS = (czm_inverseProjection * gl_Position).xyz; \n' +
                '}');
            fs.sources.splice(0, 0,
                              '#extension GL_EXT_draw_buffers : enable \n');
            fs.sources.push(
                'varying vec3 v_positionECPS; \n' +
                'void main() \n' +
                '{ \n' +
                '    czm_point_cloud_post_process_main(); \n' +
                '    gl_FragData[1] = vec4(v_positionECPS, 0); \n' +
                    '}');

            var modernized, i;
            for (i = 0; i < vs.sources.length; i++) {
                modernized = glslModernize(vs.sources[i], false, i === 0);
                vs.sources[i] = modernized;
            }
            
            for (i = 0; i < fs.sources.length; i++) {
                modernized = glslModernize(fs.sources[i], true, i === 0);
                fs.sources[i] = modernized;
            }

            shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, 'EC', {
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }
        
        return shader;
    }

    PointCloudPostProcessor.prototype.update = function(frameState, commandStart, options) {
        if (!processingSupported(frameState.context)) {
            return;
        }

        var dirty = false;
        // Set options here
        if (options.occlusionAngle != this.occlusionAngle ||
            options.rangeParameter != this.rangeParameter ||
            options.neighborhoodHalfWidth != this.neighborhoodHalfWidth ||
            options.numRegionGrowingPasses != this.numRegionGrowingPasses) {
            this.occlusionAngle = options.occlusionAngle;
            this.rangeParameter = options.rangeParameter;
            this.neighborhoodHalfWidth = options.neighborhoodHalfWidth;
            this.numRegionGrowingPasses = options.numRegionGrowingPasses;
            dirty = true;
        }

        if (!options.enabled) {
            return;
        }

        createResources(this, frameState.context, dirty);

        // Render point cloud commands into an offscreen FBO.
        var i;
        var commandList = frameState.commandList;
        var commandEnd = commandList.length;
        for (i = commandStart; i < commandEnd; ++i) {
            var command = commandList[i];

            var derivedCommand = command.derivedCommands.pointCloudProcessor;
            if (!defined(derivedCommand) || command.dirty) {
                derivedCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.pointCloudProcessor = derivedCommand;

                derivedCommand.framebuffer = this._framebuffers.prior;
                derivedCommand.shaderProgram = getECShaderProgram(frameState.context, command.shaderProgram);
                derivedCommand.castShadows = false;
                derivedCommand.receiveShadows = false;
                derivedCommand.pass = Pass.CESIUM_3D_TILE; // Overrides translucent commands
            }
            
            commandList[i] = derivedCommand;
        }

        // Apply processing commands
        var drawCommands = this._drawCommands;
        var clearCommands = this._clearCommands;
        var length = drawCommands.length;
        for (i = 0; i < length; ++i) {
            // So before each draw call, we should clean up the dirty
            // framebuffers that we left behind on the *previous* pass
            if (i == 0) {
                commandList.push(clearCommands['screenSpacePass']);
            } else {
                if (i % 2 == 1)
                    commandList.push(clearCommands['regionGrowingPassA']);
                else
                    commandList.push(clearCommands['regionGrowingPassB']);
            }
            
            commandList.push(drawCommands[i]);
        }

        // Blend final result back into the main FBO
        commandList.push(this._blendCommand);
        
        commandList.push(clearCommands['prior']);
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
