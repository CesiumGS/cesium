/*global define*/
define([
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/PixelFormat',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
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
        '../Renderer/VertexArray',
        '../Scene/BlendingState',
        '../Scene/StencilFunction',
        '../Scene/StencilOperation',
        '../Shaders/PostProcessFilters/PointOcclusionPassGL1',
        '../Shaders/PostProcessFilters/RegionGrowingPassGL1',
        '../Shaders/PostProcessFilters/PointOcclusionPassGL2',
        '../Shaders/PostProcessFilters/RegionGrowingPassGL2',
        '../Shaders/PostProcessFilters/DensityEstimationPass'
    ], function(
        Color,
        ComponentDatatype,
        defined,
        destroyObject,
        Geometry,
        GeometryAttribute,
        PixelFormat,
        PrimitiveType,
        BufferUsage,
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
        VertexArray,
        BlendingState,
        StencilFunction,
        StencilOperation,
        PointOcclusionPassGL1,
        RegionGrowingPassGL1,
        PointOcclusionPassGL2,
        RegionGrowingPassGL2,
        DensityEstimationPass
    ) {
    'use strict';

     /**
     * @private
     */
    function PointCloudPostProcessor(options) {
        this._framebuffers = undefined;
        this._colorTextures = undefined;
        this._ecTexture = undefined;
        this._depthTextures = undefined;
        this._densityTexture = undefined;
        this._dirty = undefined;
        this._clearStencil = undefined;
        this._drawCommands = undefined;
        this._stencilCommands = undefined;
        this._copyCommands = undefined;
        this._blendCommand = undefined;
        this._clearCommands = undefined;

        this.occlusionAngle = options.occlusionAngle;
        this.rangeParameter = options.rangeParameter;
        this.neighborhoodHalfWidth = options.neighborhoodHalfWidth;
        this.numRegionGrowingPasses = options.numRegionGrowingPasses;
        this.densityHalfWidth = options.densityHalfWidth;
        this.neighborhoodVectorSize = options.neighborhoodVectorSize;
        this.maxAbsRatio = options.maxAbsRatio;
        this.densityViewEnabled = options.densityViewEnabled;
        this.stencilViewEnabled = options.stencilViewEnabled;
        this.pointAttenuationMultiplier = options.pointAttenuationMultiplier;
        this.useTriangle = options.useTriangle;

        this.pointArray = undefined;

        this.rangeMin = 1e-6;
        this.rangeMax = 5e-2;
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
        processor._densityTexture.destroy();
        processor._dirty.destroy();
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

        var densityMap = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        var dirty = new Texture({
            context: context,
            width: screenWidth,
            height: screenHeight,
            pixelFormat: PixelFormat.DEPTH_STENCIL,
            pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
            sampler: createSampler()
        });

        for (i = 0; i < 2; ++i) {
            colorTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : createSampler()
            });

            depthTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : createSampler()
            });
        }

        // There used to be an explanation of how this worked here
        // but it got too long.
        // TODO: Find a better place to put an explanation of what all
        // the framebuffers are meant for.
        processor._framebuffers = {
            prior : new Framebuffer({
                context : context,
                colorTextures : [
                    colorTextures[0],
                    ecTexture
                ],
                depthStencilTexture : dirty,
                destroyAttachments : false
            }),
            screenSpacePass : new Framebuffer({
                context : context,
                colorTextures : [depthTextures[0]],
                depthStencilTexture: dirty,
                destroyAttachments : false
            }),
            stencilMask : new Framebuffer({
                context : context,
                depthStencilTexture: dirty,
                destroyAttachments : false
            }),
            densityEstimationPass : new Framebuffer({
                context : context,
                colorTextures : [densityMap],
                destroyAttachments : false
            }),
            regionGrowingPassA : new Framebuffer({
                context : context,
                colorTextures : [colorTextures[1],
                                 depthTextures[1]],
                depthStencilTexture: dirty,
                destroyAttachments : false
            }),
            regionGrowingPassB : new Framebuffer({
                context: context,
                colorTextures: [colorTextures[0],
                                depthTextures[0]],
                depthStencilTexture: dirty,
                destroyAttachments: false
            })
        };
        processor._depthTextures = depthTextures;
        processor._densityTexture = densityMap;
        processor._colorTextures = colorTextures;
        processor._ecTexture = ecTexture;
        processor._dirty = dirty;
    }

    function createPointArray(processor, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        var pointArray = processor.pointArray;

        var vertexArr = new Float32Array(screenWidth * screenHeight);

        var xIncrement = 2.0 / screenWidth;
        var yIncrement = 2.0 / screenHeight;

        var baryOffsetX = xIncrement / 2.0;
        var baryOffsetY = yIncrement / 2.0;

        var k = 0;
        for (var i = -1.0; i < 1.0; i += xIncrement) {
            for (var j = -1.0; j < 1.0; j += yIncrement) {
                vertexArr[k++] = i + baryOffsetX;
                vertexArr[k++] = j + baryOffsetY;
            }
        }

        var geometry = new Geometry({
            attributes: {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : vertexArr
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        pointArray = VertexArray.fromGeometry({
            context : this,
            geometry : geometry,
            attributeLocations : {
                position : 0
            },
            bufferUsage : BufferUsage.STATIC_DRAW,
            interleave : true
        });

        processor.pointArray = pointArray;
    }

    function createPointArrayCommand(vertexShaderSource, fragmentShaderSource, processor, context) {
        if (!defined(processor.pointArray)) {
            createPointArray(processor, context);
        }

        return new DrawCommand({
            vertexArray : this.pointArray,
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : ShaderProgram.fromCache({
                context : this,
                vertexShaderSource : vertexShaderSource,
                fragmentShaderSource : fragmentShaderSource,
                attributeLocations : {
                    position : 0
                }
            })
        });
    }

    function replaceConstants(sourceStr, constantName, replacement) {
        var r;
        if (typeof(replacement) === 'boolean') {
            if (replacement === false) {
                r = '#define\\s' + constantName;
                return sourceStr.replace(new RegExp(r, 'g'), '/*#define ' + constantName + '*/');
            }
                return sourceStr;

        }
            r = '#define\\s' + constantName + '\\s([0-9.]+)';
            return sourceStr.replace(new RegExp(r, 'g'), '#define ' + constantName + ' ' + replacement);

    }

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
            },
            ONE : function() {
                return 1.0;
            }
        };

        var pointOcclusionStr = replaceConstants(
            (context.webgl2) ? PointOcclusionPassGL2 : PointOcclusionPassGL1,
            'neighborhoodHalfWidth',
            processor.neighborhoodHalfWidth
        );

        pointOcclusionStr = replaceConstants(
            pointOcclusionStr,
            'useTriangle',
            processor.useTriangle
        );

        var func = StencilFunction.EQUAL;
        var op = {
            fail : StencilOperation.KEEP,
            zFail : StencilOperation.KEEP,
            zPass : StencilOperation.KEEP
        };

        return context.createViewportQuadCommand(pointOcclusionStr, {
            uniformMap : uniformMap,
            framebuffer : processor._framebuffers.screenSpacePass,
            renderState : RenderState.fromCache({
                stencilTest : {
                    enabled : true,
                    reference : 0,
                    mask : 1,
                    frontFunction : func,
                    backFunction : func,
                    frontOperation : op,
                    backOperation : op
                }
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function densityEstimationStage(processor, context) {
        var uniformMap = {
            pointCloud_depthTexture : function() {
                return processor._depthTextures[0];
            },
            neighborhoodVectorSize : function() {
                return processor.neighborhoodVectorSize;
            },
            maxAbsRatio : function() {
                return processor.maxAbsRatio;
            }
        };

        var densityEstimationStr = replaceConstants(
            DensityEstimationPass,
            'neighborhoodHalfWidth',
            processor.densityHalfWidth
        );

        return context.createViewportQuadCommand(densityEstimationStr, {
            uniformMap : uniformMap,
            framebuffer : processor._framebuffers.densityEstimationPass,
            renderState : RenderState.fromCache({
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function regionGrowingStage(processor, context, iteration) {
        var i = iteration % 2;
        var rangeMin = processor.rangeMin;
        var rangeMax = processor.rangeMax;

        var uniformMap = {
            pointCloud_colorTexture : function() {
                return processor._colorTextures[i];
            },
            pointCloud_depthTexture : function() {
                return processor._depthTextures[i];
            },
            pointCloud_densityTexture : function() {
                return processor._densityTexture;
            },
            rangeParameter : function() {
                if (processor.useTriangle) {
                    return processor.rangeParameter;
                }
                    if (processor.rangeParameter < rangeMin) {
                        return 0.0;
                    }
                        return processor.rangeParameter * (rangeMax - rangeMin) + rangeMin;


            },
            densityHalfWidth : function() {
                return processor.densityHalfWidth;
            },
            iterationNumber : function() {
                return iteration;
            }
        };

        var framebuffer = (i === 0) ?
            processor._framebuffers.regionGrowingPassA :
            processor._framebuffers.regionGrowingPassB;

        var regionGrowingPassStr = (context.webgl2) ?
            RegionGrowingPassGL2 :
            RegionGrowingPassGL1;

        regionGrowingPassStr = replaceConstants(
            regionGrowingPassStr,
            'densityView',
            processor.densityViewEnabled
        );

        regionGrowingPassStr = replaceConstants(
            regionGrowingPassStr,
            'stencilView',
            processor.stencilViewEnabled
        );

        var func = StencilFunction.EQUAL;
        var op = {
            fail : StencilOperation.KEEP,
            zFail : StencilOperation.KEEP,
            zPass : StencilOperation.KEEP
        };

        return context.createViewportQuadCommand(regionGrowingPassStr, {
            uniformMap : uniformMap,
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                stencilTest : {
                    enabled : true,
                    reference : 0,
                    mask : 1,
                    frontFunction : func,
                    backFunction : func,
                    frontOperation : op,
                    backOperation : op
                }
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function copyRegionGrowingColorStage(processor, context, i) {
        var uniformMap = {
            pointCloud_colorTexture : function() {
                return processor._colorTextures[i];
            },
            pointCloud_depthTexture : function() {
                return processor._depthTextures[i];
            },
            pointCloud_densityTexture : function() {
                return processor._densityTexture;
            },
            densityHalfWidth : function() {
                return processor.densityHalfWidth;
            }
        };

        var framebuffer = (i === 0) ?
            processor._framebuffers.regionGrowingPassA :
            processor._framebuffers.regionGrowingPassB;

        var copyStageStr =
            '#extension GL_EXT_draw_buffers : enable \n' +
            '#define densityView \n' +
            '#define densityScaleFactor 32.0 \n' +
            '#define EPS 1e-6 \n' +
            'uniform int densityHalfWidth; \n' +
            'uniform sampler2D pointCloud_colorTexture; \n' +
            'uniform sampler2D pointCloud_depthTexture; \n' +
            'uniform sampler2D pointCloud_densityTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 rawDepth = texture2D(pointCloud_depthTexture, v_textureCoordinates); \n' +
            '    float depth = czm_unpackDepth(rawDepth); \n' +
            '    if (depth > EPS) { \n' +
            '        #ifdef densityView \n' +
            '        float density = densityScaleFactor * czm_unpackDepth(texture2D(pointCloud_densityTexture, v_textureCoordinates)); \n' +
            '        gl_FragData[0] = vec4(vec3(density / float(densityHalfWidth)), 1.0); \n' +
            '        #else \n' +
            '        gl_FragData[0] = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
            '        #endif \n' +
            '        gl_FragData[1] = rawDepth; \n' +
            '    } \n' +
            '} \n';

        copyStageStr = replaceConstants(
            copyStageStr,
            'densityView',
            processor.densityViewEnabled
        );

        return context.createViewportQuadCommand(copyStageStr, {
            uniformMap : uniformMap,
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function stencilMaskStage(processor, context, iteration) {
        var uniformMap = {
            pointCloud_densityTexture : function() {
                return processor._densityTexture;
            }
        };

        var stencilMaskStageStr =
            '#define EPS 1e-8 \n' +
            '#define cutoff 0 \n' +
            '#define DELAY 0 \n' +
            '#define densityScaleFactor 32.0 \n' +
            'uniform sampler2D pointCloud_densityTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    float density = densityScaleFactor * czm_unpackDepth(texture2D(pointCloud_densityTexture, v_textureCoordinates)); \n' +
            '    if (float(cutoff - DELAY) + EPS > density) \n' +
            '        discard; \n' +
            '} \n';

        stencilMaskStageStr = replaceConstants(
            stencilMaskStageStr,
            'cutoff',
            iteration
        );

        var framebuffer = processor._framebuffers.stencilMask;

        var func = StencilFunction.ALWAYS;
        var op = {
            fail : StencilOperation.KEEP,
            zFail : StencilOperation.KEEP,
            zPass : StencilOperation.ZERO
        };
        return context.createViewportQuadCommand(stencilMaskStageStr, {
            uniformMap : uniformMap,
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                stencilTest : {
                    enabled : true,
                    reference : 1,
                    mask : 0,
                    frontFunction : func,
                    backFunction : func,
                    frontOperation : op,
                    backOperation : op
                }
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function createCommands(processor, context) {
        var numRegionGrowingPasses = processor.numRegionGrowingPasses;
        var drawCommands = new Array(numRegionGrowingPasses + 2);
        var stencilCommands = new Array(numRegionGrowingPasses);
        var copyCommands = new Array(2);

        var i;
        drawCommands[0] = pointOcclusionStage(processor, context);
        drawCommands[1] = densityEstimationStage(processor, context);

        for (i = 0; i < numRegionGrowingPasses; i++) {
            drawCommands[i + 2] = regionGrowingStage(processor, context, i);
            stencilCommands[i] = stencilMaskStage(processor, context, i);
        }

        copyCommands[0] = copyRegionGrowingColorStage(processor, context, 0);
        copyCommands[1] = copyRegionGrowingColorStage(processor, context, 1);

        var blendFS =
            '#define EPS 1e-8 \n' +
            '#extension GL_EXT_frag_depth : enable \n' +
            'uniform sampler2D pointCloud_colorTexture; \n' +
            'uniform sampler2D pointCloud_depthTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
            '    float rayDist = czm_unpackDepth(texture2D(pointCloud_depthTexture, v_textureCoordinates)); \n' +
            '    if (length(rayDist) < EPS) { \n' +
            '        discard;' +
            '    } else { \n' +
            '        float frustumLength = czm_clampedFrustum.y - czm_clampedFrustum.x; \n' +
            '        float scaledRayDist = rayDist * frustumLength + czm_clampedFrustum.x; \n' +
            '        vec4 ray = normalize(czm_windowToEyeCoordinates(vec4(gl_FragCoord))); \n' +
            '        float depth = czm_eyeToWindowCoordinates(ray * scaledRayDist).z; \n' +
            '        gl_FragColor = color; \n' +
            '        gl_FragDepthEXT = depth; \n' +
            '    }' +
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
                // The screen space pass should consider
                // the stencil value, so we don't clear it
                // here
                if (name === 'screenSpacePass') {
                    clearCommands[name] = new ClearCommand({
                        framebuffer : framebuffers[name],
                        color : new Color(0.0, 0.0, 0.0, 0.0),
                        depth : 1.0,
                        renderState : RenderState.fromCache(),
                        pass : Pass.CESIUM_3D_TILE,
                        owner : processor
                    });
                } else {
                    clearCommands[name] = new ClearCommand({
                        framebuffer : framebuffers[name],
                        color : new Color(0.0, 0.0, 0.0, 0.0),
                        depth : 1.0,
                        stencil : 1.0,
                        renderState : RenderState.fromCache(),
                        pass : Pass.CESIUM_3D_TILE,
                        owner : processor
                    });
                }
            }
        }

        processor._drawCommands = drawCommands;
        processor._stencilCommands = stencilCommands;
        processor._blendCommand = blendCommand;
        processor._clearCommands = clearCommands;
        processor._copyCommands = copyCommands;
    }

    function createResources(processor, context, dirty) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;
        var colorTextures = processor._colorTextures;
        var drawCommands = processor._drawCommands;
        var stencilCommands = processor._stencilCommands;
        var resized = defined(colorTextures) &&
            ((colorTextures[0].width !== screenWidth) ||
             (colorTextures[0].height !== screenHeight));

        if (!defined(colorTextures)) {
            createFramebuffers(processor, context);
        }

        if (!defined(drawCommands) || !defined(stencilCommands) || dirty) {
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

            shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, 'EC', {
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }

        return shader;
    }

    PointCloudPostProcessor.prototype.update = function(frameState, commandStart, tileset) {
        if (!processingSupported(frameState.context)) {
            return;
        }

        var dirty = false;
        // Set options here
        if (tileset.pointCloudPostProcessorOptions.occlusionAngle !== this.occlusionAngle ||
            tileset.pointCloudPostProcessorOptions.rangeParameter !== this.rangeParameter ||
            tileset.pointCloudPostProcessorOptions.neighborhoodHalfWidth !== this.neighborhoodHalfWidth ||
            tileset.pointCloudPostProcessorOptions.numRegionGrowingPasses !== this.numRegionGrowingPasses ||
            tileset.pointCloudPostProcessorOptions.densityHalfWidth !== this.densityHalfWidth ||
            tileset.pointCloudPostProcessorOptions.neighborhoodVectorSize !== this.neighborhoodVectorSize ||
            tileset.pointCloudPostProcessorOptions.maxAbsRatio !== this.maxAbsRatio ||
            tileset.pointCloudPostProcessorOptions.densityViewEnabled !== this.densityViewEnabled ||
            tileset.pointCloudPostProcessorOptions.stencilViewEnabled !== this.stencilViewEnabled ||
            tileset.pointCloudPostProcessorOptions.pointAttenuationMultiplier !== this.pointAttenuationMultiplier ||
            tileset.pointCloudPostProcessorOptions.useTriangle !== this.useTriangle) {
            this.occlusionAngle = tileset.pointCloudPostProcessorOptions.occlusionAngle;
            this.rangeParameter = tileset.pointCloudPostProcessorOptions.rangeParameter;
            this.neighborhoodHalfWidth = tileset.pointCloudPostProcessorOptions.neighborhoodHalfWidth;
            this.numRegionGrowingPasses = tileset.pointCloudPostProcessorOptions.numRegionGrowingPasses;
            this.densityHalfWidth = tileset.pointCloudPostProcessorOptions.densityHalfWidth;
            this.neighborhoodVectorSize = tileset.pointCloudPostProcessorOptions.neighborhoodVectorSize;
            this.densityViewEnabled = tileset.pointCloudPostProcessorOptions.densityViewEnabled;
            this.stencilViewEnabled = tileset.pointCloudPostProcessorOptions.stencilViewEnabled;
            this.maxAbsRatio = tileset.pointCloudPostProcessorOptions.maxAbsRatio;
            this.pointAttenuationMultiplier = tileset.pointCloudPostProcessorOptions.pointAttenuationMultiplier;
            this.useTriangle = tileset.pointCloudPostProcessorOptions.useTriangle;
            dirty = true;
        }

        if (!tileset.pointCloudPostProcessorOptions.enabled) {
            return;
        }

        createResources(this, frameState.context, dirty);

        // Render point cloud commands into an offscreen FBO.
        var i;
        var commandList = frameState.commandList;
        var commandEnd = commandList.length;

        var attenuationMultiplier = this.pointAttenuationMultiplier;
        var attenuationUniformFunction = function() {
            return attenuationMultiplier;
        };

        for (i = commandStart; i < commandEnd; ++i) {
            var command = commandList[i];
            if (command.primitiveType !== PrimitiveType.POINTS) {
                continue;
            }

            var derivedCommand = command.derivedCommands.pointCloudProcessor;
            if (!defined(derivedCommand) || command.dirty || dirty) {
                derivedCommand = DrawCommand.shallowClone(command);
                command.derivedCommands.pointCloudProcessor = derivedCommand;

                derivedCommand.framebuffer = this._framebuffers.prior;
                derivedCommand.shaderProgram = getECShaderProgram(frameState.context, command.shaderProgram);
                derivedCommand.castShadows = false;
                derivedCommand.receiveShadows = false;

                var func = StencilFunction.ALWAYS;
                var op = {
                    fail: StencilOperation.KEEP,
                    zFail: StencilOperation.KEEP,
                    zPass: StencilOperation.ZERO
                };
                var derivedCommandRenderState = derivedCommand.renderState;
                derivedCommandRenderState.stencilTest = {
                    enabled : true,
                    reference : 1,
                    mask : 0,
                    frontFunction : func,
                    backFunction : func,
                    frontOperation : op,
                    backOperation : op
                };
                derivedCommand.renderState = RenderState.fromCache(
                    derivedCommandRenderState
                );

                // TODO: Even if the filter is disabled,
                // point attenuation settings are not! Fix this behavior.
                var derivedCommandUniformMap = derivedCommand.uniformMap;
                derivedCommandUniformMap['u_pointAttenuationMaxSize'] = attenuationUniformFunction;
                derivedCommand.uniformMap = derivedCommandUniformMap;

                derivedCommand.pass = Pass.CESIUM_3D_TILE; // Overrides translucent commands
                command.dirty = false;
            }

            commandList[i] = derivedCommand;
        }

        // Apply processing commands
        var drawCommands = this._drawCommands;
        var copyCommands = this._copyCommands;
        var stencilCommands = this._stencilCommands;
        var clearCommands = this._clearCommands;
        var length = drawCommands.length;
        for (i = 0; i < length; ++i) {
            // So before each draw call, we should clean up the dirty
            // framebuffers that we left behind on the *previous* pass
            if (i === 0) {
                commandList.push(clearCommands['screenSpacePass']);
            } else if (i === 1) {
                    commandList.push(clearCommands['densityEstimationPass']);
                } else if (i % 2 === 0)
                        {commandList.push(clearCommands['regionGrowingPassA']);}
                    else
                        {commandList.push(clearCommands['regionGrowingPassB']);}

            if (i >= 2) {
                commandList.push(copyCommands[i % 2]);
                commandList.push(stencilCommands[i - 2]);
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
