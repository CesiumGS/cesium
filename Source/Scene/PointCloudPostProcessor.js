/*global define*/
define([
        '../Core/Color',
        '../Core/combine',
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
        '../Scene/BlendEquation',
        '../Scene/BlendFunction',
        '../Scene/BlendingState',
        '../Scene/StencilFunction',
        '../Scene/StencilOperation',
        '../Shaders/PostProcessFilters/PointOcclusionPassGL1',
        '../Shaders/PostProcessFilters/PointOcclusionPassGL2',
        '../Shaders/PostProcessFilters/RegionGrowingPassGL1',
        '../Shaders/PostProcessFilters/RegionGrowingPassGL2',
        '../Shaders/PostProcessFilters/DensityEdgeCullPass',
        '../Shaders/PostProcessFilters/PointCloudPostProcessorBlendPass'
    ], function(
        Color,
        combine,
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
        BlendEquation,
        BlendFunction,
        BlendingState,
        StencilFunction,
        StencilOperation,
        PointOcclusionPassGL1,
        PointOcclusionPassGL2,
        RegionGrowingPassGL1,
        RegionGrowingPassGL2,
        DensityEdgeCullPass,
        PointCloudPostProcessorBlendPass
    ) {
    'use strict';

     /**
     * @private
     */
    function PointCloudPostProcessor(options) {
        this._framebuffers = undefined;
        this._colorTextures = undefined;
        this._ecTextures = undefined;
        this._densityTexture = undefined;
        this._edgeCullingTexture = undefined;
        this._sectorLUTTexture = undefined;
        this._aoTextures = undefined;
        this._stencilMaskTexture = undefined;
        this._drawCommands = undefined;
        this._clearCommands = undefined;

        this.densityScaleFactor = 10.0;
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
        this.enableAO = options.enableAO;
        this.AOViewEnabled = options.AOViewEnabled;
        this.depthViewEnabled = options.depthViewEnabled;
        this.sigmoidDomainOffset = options.sigmoidDomainOffset;
        this.sigmoidSharpness = options.sigmoidSharpness;
        this.dropoutFactor = options.dropoutFactor;
        this.delay = options.delay;

        this._testingFunc = StencilFunction.EQUAL;
        this._testingOp = {
            fail : StencilOperation.KEEP,
            zFail : StencilOperation.KEEP,
            zPass : StencilOperation.KEEP
        };
        this._writeFunc = StencilFunction.ALWAYS;
        this._writeOp = {
            fail : StencilOperation.KEEP,
            zFail : StencilOperation.KEEP,
            zPass : StencilOperation.ZERO
        };

        this._positiveStencilTest = {
            enabled : true,
            reference : 0,
            mask : 1,
            frontFunction : this._testingFunc,
            backFunction : this._testingFunc,
            frontOperation : this._testingOp,
            backOperation : this._testingOp
        };
        this._negativeStencilTest = {
            enabled : true,
            reference : 1,
            mask : 1,
            frontFunction : this._testingFunc,
            backFunction : this._testingFunc,
            frontOperation : this._testingOp,
            backOperation : this._testingOp
        };
        this._stencilWrite = {
            enabled : true,
            reference : 1,
            mask : 0,
            frontFunction : this._writeFunc,
            backFunction : this._writeFunc,
            frontOperation : this._writeOp,
            backOperation : this._writeOp
        };

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
        var framebuffers = processor._framebuffers;
        if (!defined(framebuffers)) {
            return;
        }

        processor._ecTextures[0].destroy();
        processor._ecTextures[1].destroy();
        processor._sectorLUTTexture.destroy();
        processor._aoTextures[0].destroy();
        processor._aoTextures[1].destroy();
        processor._densityTexture.destroy();
        processor._edgeCullingTexture.destroy();
        processor._stencilMaskTexture.destroy();
        processor._colorTextures[0].destroy();
        processor._colorTextures[1].destroy();
        for (var name in framebuffers) {
            if (framebuffers.hasOwnProperty(name)) {
                framebuffers[name].destroy();
            }
        }

        processor._framebuffers = undefined;
        processor._colorTextures = undefined;
        processor._ecTextures = undefined;
        processor._densityTexture = undefined;
        processor._edgeCullingTexture = undefined;
        processor._sectorLUTTexture = undefined;
        processor._aoTextures = undefined;
        processor._dirty = undefined;
        processor._drawCommands = undefined;
    }

    function getSector(dx, dy, numSectors) {
        var angle = (Math.atan2(dy, dx) + Math.PI) / (2.0 * Math.PI) - 1e-6;
        return Math.trunc(angle * numSectors);
    }

    function collapseSectors(dx, dy, numSectors) {
        var sectors = new Uint8Array(4);
        sectors[0] = getSector(dx - 0.5, dy + 0.5, numSectors);
        sectors[1] = getSector(dx + 0.5, dy - 0.5, numSectors);
        sectors[2] = getSector(dx + 0.5, dy + 0.5, numSectors);
        sectors[3] = getSector(dx - 0.5, dy - 0.5, numSectors);

        var first = sectors[0];
        var second = sectors[0];
        sectors.forEach(function(element) {
            if (element !== first) {
                second = element;
            }
        });
        return [first, second];
    }

    function generateSectorLUT(processor) {
        var numSectors = 8;
        var lutSize = processor.neighborhoodHalfWidth * 2 + 1;
        var lut = new Uint8Array(lutSize * lutSize * 4);
        var start = -Math.trunc(lutSize / 2);
        var end = -start;
        for (var i = start; i <= end; i++) {
            for (var j = start; j <= end; j++) {
                var offset = ((i + end) + (j + end) * lutSize) * 4;
                var sectors = collapseSectors(i, j, numSectors);
                lut[offset] = Math.trunc(256 * (sectors[0] / 8));
                lut[offset + 1] = Math.trunc(256 * (sectors[1] / 8));
            }
        }

        return lut;
    }

    function createFramebuffers(processor, context) {
        var i;
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        var colorTextures = new Array(2);
        var ecTextures = new Array(2);
        var aoTextures = new Array(2);

        var densityMap = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        var edgeCullingTexture = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT,
            sampler : createSampler()
        });

        // Load the sector LUT that the point occlusion pass needs
        var lutSize = processor.neighborhoodHalfWidth * 2 + 1;
        var lutData = generateSectorLUT(processor);
        var sectorLUTTexture = new Texture({
            context : context,
            source : {
                width : lutSize,
                height : lutSize,
                arrayBufferView : lutData
            },
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        var stencilMaskTexture = new Texture({
            context : context,
            width : screenWidth,
            height : screenHeight,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
            sampler : createSampler()
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

            ecTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.FLOAT,
                sampler : createSampler()
            });

            aoTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : createSampler()
            });
        }

        processor._framebuffers = {
            prior : new Framebuffer({
                context : context,
                colorTextures : [
                    colorTextures[0],
                    ecTextures[1]
                ],
                depthStencilTexture : stencilMaskTexture,
                destroyAttachments : false
            }),
            screenSpacePass : new Framebuffer({
                context : context,
                colorTextures : [ecTextures[0], aoTextures[0]],
                depthStencilTexture: stencilMaskTexture,
                destroyAttachments : false
            }),
            aoBufferA : new Framebuffer({
                context : context,
                colorTextures : [aoTextures[1]],
                destroyAttachments : false
            }),
            aoBufferB : new Framebuffer({
                context : context,
                colorTextures : [aoTextures[0]],
                destroyAttachments : false
            }),
            stencilMask : new Framebuffer({
                context : context,
                depthStencilTexture: stencilMaskTexture,
                destroyAttachments : false
            }),
            densityEstimationPass : new Framebuffer({
                context : context,
                colorTextures : [densityMap],
                depthStencilTexture: stencilMaskTexture,
                destroyAttachments : false
            }),
            regionGrowingPassA : new Framebuffer({
                context : context,
                colorTextures : [colorTextures[1],
                                 ecTextures[1],
                                 aoTextures[1]],
                depthStencilTexture: stencilMaskTexture,
                destroyAttachments : false
            }),
            regionGrowingPassB : new Framebuffer({
                context : context,
                colorTextures : [colorTextures[0],
                                 ecTextures[0],
                                 aoTextures[0]],
                depthStencilTexture : stencilMaskTexture,
                destroyAttachments : false
            })
        };
        processor._ecTextures = ecTextures;
        processor._densityTexture = densityMap;
        processor._edgeCullingTexture = edgeCullingTexture;
        processor._sectorLUTTexture = sectorLUTTexture;
        processor._aoTextures = aoTextures;
        processor._colorTextures = colorTextures;
        processor._stencilMaskTexture = stencilMaskTexture;
    }

    function replaceConstants(sourceFS, constantName, replacement) {
        var r;
        if (typeof(replacement) === 'boolean') {
            if (replacement === false) {
                r = '#define\\s' + constantName;
                return sourceFS.replace(new RegExp(r, 'g'), '/*#define ' + constantName + '*/');
            }
                return sourceFS;
        }
        r = '#define\\s' + constantName + '\\s([0-9.]+)';
        return sourceFS.replace(new RegExp(r, 'g'), '#define ' + constantName + ' ' + replacement);
    }

     function pointOcclusionStage(processor, context) {
        var uniformMap = {
            u_sectorLUT : function() {
                return processor._sectorLUTTexture;
            },
            u_pointCloud_ecTexture : function() {
                return processor._ecTextures[1];
            },
            u_occlusionAngle : function() {
                return processor.occlusionAngle;
            },
            u_dropoutFactor : function() {
                return processor.dropoutFactor;
            }
        };

        var pointOcclusionFS = replaceConstants(
            (context.webgl2) ? PointOcclusionPassGL2 : PointOcclusionPassGL1,
            'neighborhoodHalfWidth',
            processor.neighborhoodHalfWidth
        );

        pointOcclusionFS = replaceConstants(
            pointOcclusionFS,
            'useTriangle',
            processor.useTriangle
        );

        if (processor.dropoutFactor < 1e-6) {
            pointOcclusionFS = replaceConstants(
                pointOcclusionFS,
                'dropoutEnabled',
                false);
        }

        return context.createViewportQuadCommand(pointOcclusionFS, {
            uniformMap : uniformMap,
            framebuffer : processor._framebuffers.screenSpacePass,
            renderState : RenderState.fromCache({
                stencilTest : processor._positiveStencilTest
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function densityEdgeCullStage(processor, context) {
        var uniformMap = {
            u_pointCloud_ecTexture : function() {
                return processor._ecTextures[0];
            },
            u_neighborhoodVectorSize : function() {
                return processor.neighborhoodVectorSize;
            },
            u_maxAbsRatio : function() {
                return processor.maxAbsRatio;
            },
            u_dropoutFactor : function() {
                return processor.dropoutFactor;
            }
        };

        var densityEdgeCullFS = replaceConstants(
            DensityEdgeCullPass,
            'neighborhoodHalfWidth',
            processor.densityHalfWidth
        );

        if (processor.dropoutFactor < 1e-6 || !context.webgl2) {
            densityEdgeCullFS = replaceConstants(
                densityEdgeCullFS,
                'dropoutEnabled',
                false);
        }

        return context.createViewportQuadCommand(densityEdgeCullFS, {
            uniformMap : uniformMap,
            framebuffer : processor._framebuffers.densityEstimationPass,
            renderState : RenderState.fromCache({
                stencilTest : processor._negativeStencilTest
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
            u_pointCloud_colorTexture : function() {
                return processor._colorTextures[i];
            },
            u_pointCloud_ecTexture : function() {
                return processor._ecTextures[i];
            },
            u_pointCloud_densityTexture : function() {
                return processor._densityTexture;
            },
            u_pointCloud_aoTexture : function() {
                return processor._aoTextures[i];
            },
            u_rangeParameter : function() {
                if (processor.useTriangle) {
                    return processor.rangeParameter;
                }
                if (processor.rangeParameter < rangeMin) {
                    return 0.0;
                }
                return processor.rangeParameter * (rangeMax - rangeMin) + rangeMin;
            },
            u_densityHalfWidth : function() {
                return processor.densityHalfWidth;
            },
            u_iterationNumber : function() {
                return iteration;
            }
        };

        var framebuffer = (i === 0) ?
            processor._framebuffers.regionGrowingPassA :
            processor._framebuffers.regionGrowingPassB;

        var regionGrowingPassFS = (context.webgl2) ?
            RegionGrowingPassGL2 :
            RegionGrowingPassGL1;

        regionGrowingPassFS = replaceConstants(
            regionGrowingPassFS,
            'densityView',
            processor.densityViewEnabled
        );

        regionGrowingPassFS = replaceConstants(
            regionGrowingPassFS,
            'stencilView',
            processor.stencilViewEnabled
        );

        regionGrowingPassFS = replaceConstants(
            regionGrowingPassFS,
            'DELAY',
            processor.delay
        );

        return context.createViewportQuadCommand(regionGrowingPassFS, {
            uniformMap : uniformMap,
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                stencilTest : processor._positiveStencilTest
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function copyRegionGrowingColorStage(processor, context, i) {
        var uniformMap = {
            u_pointCloud_colorTexture : function() {
                return processor._colorTextures[i];
            },
            u_pointCloud_ecTexture : function() {
                return processor._ecTextures[i];
            },
            u_pointCloud_aoTexture : function() {
                return processor._aoTextures[i];
            },
            u_pointCloud_densityTexture : function() {
                return processor._densityTexture;
            },
            u_densityHalfWidth : function() {
                return processor.densityHalfWidth;
            }
        };

        var framebuffer = (i === 0) ?
            processor._framebuffers.regionGrowingPassA :
            processor._framebuffers.regionGrowingPassB;

        var copyStageFS =
            '#extension GL_EXT_draw_buffers : enable \n' +
            '#define densityView \n' +
            '#define densityScaleFactor 10.0 \n' +
            'uniform int u_densityHalfWidth; \n' +
            'uniform sampler2D u_pointCloud_colorTexture; \n' +
            'uniform sampler2D u_pointCloud_ecTexture; \n' +
            'uniform sampler2D u_pointCloud_aoTexture; \n' +
            'uniform sampler2D u_pointCloud_densityTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 ec = texture2D(u_pointCloud_ecTexture, v_textureCoordinates); \n' +
            '    vec4 rawAO = texture2D(u_pointCloud_aoTexture, v_textureCoordinates); \n' +
            '    if (length(ec) > czm_epsilon6) { \n' +
            '        #ifdef densityView \n' +
            '        float density = ceil(densityScaleFactor * texture2D(u_pointCloud_densityTexture, v_textureCoordinates).r); \n' +
            '        gl_FragData[0] = vec4(vec3(density / float(u_densityHalfWidth)), 1.0); \n' +
            '        #else \n' +
            '        gl_FragData[0] = texture2D(u_pointCloud_colorTexture, v_textureCoordinates); \n' +
            '        #endif \n' +
            '        gl_FragData[1] = ec; \n' +
            '        gl_FragData[2] = rawAO; \n' +
            '    }  else { \n' +
            '       gl_FragData[1] = vec4(0.0); ' +
            '       gl_FragData[2] = czm_packDepth(1.0 - czm_epsilon6); ' +
            '    } \n' +
            '} \n';

        copyStageFS = replaceConstants(
            copyStageFS,
            'densityView',
            processor.densityViewEnabled
        );

        return context.createViewportQuadCommand(copyStageFS, {
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
            u_pointCloud_densityTexture : function() {
                return processor._densityTexture;
            }
        };

        var stencilMaskStageFS =
            '#define epsilon8 1e-8 \n' +
            '#define cutoff 0 \n' +
            '#define DELAY 1 \n' +
            '#define densityScaleFactor 10.0 \n' +
            'uniform sampler2D u_pointCloud_densityTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    float density = ceil(densityScaleFactor * texture2D(u_pointCloud_densityTexture, v_textureCoordinates).r); \n' +
            '    if (float(cutoff - DELAY) + epsilon8 > density) \n' +
            '        discard; \n' +
            '} \n';

        stencilMaskStageFS = replaceConstants(
            stencilMaskStageFS,
            'cutoff',
            iteration
        );

        stencilMaskStageFS = replaceConstants(
            stencilMaskStageFS,
            'DELAY',
            processor.delay
        );

        var framebuffer = processor._framebuffers.stencilMask;

        return context.createViewportQuadCommand(stencilMaskStageFS, {
            uniformMap : uniformMap,
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                stencilTest : processor._stencilWrite
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function debugViewStage(processor, context, texture, unpack) {
        var uniformMap = {
            u_debugTexture : function() {
                return texture;
            }
        };

        var debugViewStageFS =
            '#define unpack \n' +
            'uniform sampler2D u_debugTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 value = texture2D(u_debugTexture, v_textureCoordinates); \n' +
            '#ifdef unpack \n' +
            '    value = vec4(czm_unpackDepth(value)); \n' +
            '#endif // unpack \n' +
            '    gl_FragColor = vec4(value); \n' +
            '} \n';

        debugViewStageFS = replaceConstants(
            debugViewStageFS,
            'unpack',
            unpack
        );

        return context.createViewportQuadCommand(debugViewStageFS, {
            uniformMap : uniformMap,
            renderState : RenderState.fromCache({
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function createCommands(processor, context) {
        processor._drawCommands = {};
        var numRegionGrowingPasses = processor.numRegionGrowingPasses;
        var regionGrowingCommands = new Array(numRegionGrowingPasses);
        var stencilCommands = new Array(numRegionGrowingPasses);
        var copyCommands = new Array(2);

        var i;
        processor._drawCommands.densityEdgeCullCommand = densityEdgeCullStage(processor, context);
        processor._drawCommands.pointOcclusionCommand = pointOcclusionStage(processor, context);

        for (i = 0; i < numRegionGrowingPasses; i++) {
            regionGrowingCommands[i] = regionGrowingStage(processor, context, i);
            stencilCommands[i] = stencilMaskStage(processor, context, i);
        }

        copyCommands[0] = copyRegionGrowingColorStage(processor, context, 0);
        copyCommands[1] = copyRegionGrowingColorStage(processor, context, 1);

        var blendRenderState;
        if (processor.useTriangle) {
            blendRenderState = RenderState.fromCache({
                blending : BlendingState.ALPHA_BLEND
            });
        } else {
            blendRenderState = RenderState.fromCache({
                blending : BlendingState.ALPHA_BLEND,
                depthMask : true,
                depthTest : {
                    enabled : true
                }
            });
        }

        var blendFS = replaceConstants(
            PointCloudPostProcessorBlendPass,
            'enableAO',
            processor.enableAO && !processor.densityViewEnabled && !processor.stencilViewEnabled
        );

        var blendUniformMap = {
            u_pointCloud_colorTexture : function() {
                return processor._colorTextures[1 - numRegionGrowingPasses % 2];
            },
            u_pointCloud_ecTexture : function() {
                return processor._ecTextures[1 - numRegionGrowingPasses % 2];
            },
            u_pointCloud_aoTexture : function() {
                return processor._aoTextures[1 - numRegionGrowingPasses % 2];
            },
            u_sigmoidDomainOffset : function() {
                return processor.sigmoidDomainOffset;
            },
            u_sigmoidSharpness : function() {
                return processor.sigmoidSharpness;
            }
        };

        var blendCommand = context.createViewportQuadCommand(blendFS, {
            uniformMap : blendUniformMap,
            renderState : blendRenderState,
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });

        var debugViewCommand;
        if (processor.AOViewEnabled) {
            debugViewCommand = debugViewStage(processor, context, processor._aoTextures[0], true);
        } else if (processor.depthViewEnabled) {
            debugViewCommand = debugViewStage(processor, context, processor._ecTextures[0], false);
        }

        var framebuffers = processor._framebuffers;
        var clearCommands = {};
        for (var name in framebuffers) {
            if (framebuffers.hasOwnProperty(name)) {
                // The screen space pass should consider
                // the stencil value, so we don't clear it
                // here. 1.0 / densityScale is the base density
                // for invalid pixels, so we clear to that.
                // Also we want to clear the AO buffer to white
                // so that the pixels that never get region-grown
                // do not appear black
                if (name === 'screenSpacePass') {
                    clearCommands[name] = new ClearCommand({
                        framebuffer : framebuffers[name],
                        color : new Color(0.0, 0.0, 0.0, 0.0),
                        depth : 1.0,
                        renderState : RenderState.fromCache(),
                        pass : Pass.CESIUM_3D_TILE,
                        owner : processor
                    });
                } else if (name === 'densityEstimationPass') {
                    clearCommands[name] = new ClearCommand({
                        framebuffer : framebuffers[name],
                        color : new Color(1.0 / processor.densityScaleFactor, 0.0, 0.0, 0.0),
                        depth : 1.0,
                        renderState : RenderState.fromCache(),
                        pass : Pass.CESIUM_3D_TILE,
                        owner : processor
                    });
                } else if (name === 'aoBufferA' ||
                           name === 'aoBufferB') {
                    clearCommands[name] = new ClearCommand({
                        framebuffer : framebuffers[name],
                        color : new Color(1.0, 1.0, 1.0, 1.0),
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

        processor._drawCommands.regionGrowingCommands = regionGrowingCommands;
        processor._drawCommands.stencilCommands = stencilCommands;
        processor._drawCommands.blendCommand = blendCommand;
        processor._drawCommands.copyCommands = copyCommands;
        processor._drawCommands.debugViewCommand = debugViewCommand;
        processor._clearCommands = clearCommands;
    }

    function createResources(processor, context, dirty) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;
        var colorTextures = processor._colorTextures;
        var nowDirty = false;
        var resized = defined(colorTextures) &&
            ((colorTextures[0].width !== screenWidth) ||
             (colorTextures[0].height !== screenHeight));

        if (!defined(colorTextures) || resized || dirty) {
            destroyFramebuffers(processor);
            createFramebuffers(processor, context);
            createCommands(processor, context);
            nowDirty = true;
        }
        return nowDirty;
    }

    function processingSupported(context) {
        return context.floatingPointTexture && context.drawBuffers && context.fragmentDepth;
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
            fs.sources.unshift('#extension GL_EXT_draw_buffers : enable \n');
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
        if (tileset.pointCloudPostProcessorOptions.occlusionAngle !== this.occlusionAngle ||
            tileset.pointCloudPostProcessorOptions.rangeParameter !== this.rangeParameter ||
            tileset.pointCloudPostProcessorOptions.neighborhoodHalfWidth !== this.neighborhoodHalfWidth ||
            tileset.pointCloudPostProcessorOptions.numRegionGrowingPasses !== this.numRegionGrowingPasses ||
            tileset.pointCloudPostProcessorOptions.densityHalfWidth !== this.densityHalfWidth ||
            tileset.pointCloudPostProcessorOptions.neighborhoodVectorSize !== this.neighborhoodVectorSize ||
            tileset.pointCloudPostProcessorOptions.maxAbsRatio !== this.maxAbsRatio ||
            tileset.pointCloudPostProcessorOptions.densityViewEnabled !== this.densityViewEnabled ||
            tileset.pointCloudPostProcessorOptions.depthViewEnabled !== this.depthViewEnabled ||
            tileset.pointCloudPostProcessorOptions.stencilViewEnabled !== this.stencilViewEnabled ||
            tileset.pointCloudPostProcessorOptions.pointAttenuationMultiplier !== this.pointAttenuationMultiplier ||
            tileset.pointCloudPostProcessorOptions.useTriangle !== this.useTriangle ||
            tileset.pointCloudPostProcessorOptions.enableAO !== this.enableAO ||
            tileset.pointCloudPostProcessorOptions.AOViewEnabled !== this.AOViewEnabled ||
            tileset.pointCloudPostProcessorOptions.sigmoidDomainOffset !== this.sigmoidDomainOffset ||
            tileset.pointCloudPostProcessorOptions.sigmoidSharpness !== this.sigmoidSharpness ||
            tileset.pointCloudPostProcessorOptions.dropoutFactor !== this.dropoutFactor ||
            tileset.pointCloudPostProcessorOptions.delay !== this.delay) {
            this.occlusionAngle = tileset.pointCloudPostProcessorOptions.occlusionAngle;
            this.rangeParameter = tileset.pointCloudPostProcessorOptions.rangeParameter;
            this.neighborhoodHalfWidth = tileset.pointCloudPostProcessorOptions.neighborhoodHalfWidth;
            this.numRegionGrowingPasses = tileset.pointCloudPostProcessorOptions.numRegionGrowingPasses;
            this.densityHalfWidth = tileset.pointCloudPostProcessorOptions.densityHalfWidth;
            this.neighborhoodVectorSize = tileset.pointCloudPostProcessorOptions.neighborhoodVectorSize;
            this.densityViewEnabled = tileset.pointCloudPostProcessorOptions.densityViewEnabled;
            this.depthViewEnabled = tileset.pointCloudPostProcessorOptions.depthViewEnabled;
            this.stencilViewEnabled = tileset.pointCloudPostProcessorOptions.stencilViewEnabled;
            this.maxAbsRatio = tileset.pointCloudPostProcessorOptions.maxAbsRatio;
            this.pointAttenuationMultiplier = tileset.pointCloudPostProcessorOptions.pointAttenuationMultiplier;
            this.useTriangle = tileset.pointCloudPostProcessorOptions.useTriangle;
            this.enableAO = tileset.pointCloudPostProcessorOptions.enableAO;
            this.AOViewEnabled = tileset.pointCloudPostProcessorOptions.AOViewEnabled;
            this.sigmoidDomainOffset = tileset.pointCloudPostProcessorOptions.sigmoidDomainOffset;
            this.sigmoidSharpness = tileset.pointCloudPostProcessorOptions.sigmoidSharpness;
            this.dropoutFactor = tileset.pointCloudPostProcessorOptions.dropoutFactor;
            this.delay = tileset.pointCloudPostProcessorOptions.delay;
            dirty = true;
        }

        dirty |= createResources(this, frameState.context, dirty);

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

                var derivedCommandRenderState = new RenderState(derivedCommand.renderState);
                derivedCommandRenderState.stencilTest = this._stencilWrite;
                derivedCommand.renderState = RenderState.fromCache(
                    derivedCommandRenderState
                );

                // TODO: Even if the filter is disabled,
                // point attenuation settings are not! Fix this behavior.
                var derivedCommandUniformMap = derivedCommand.uniformMap;
                var newUniformMap = {
                    'u_pointAttenuationMaxSize' : attenuationUniformFunction
                };
                derivedCommand.uniformMap = combine(derivedCommandUniformMap, newUniformMap);

                derivedCommand.pass = Pass.CESIUM_3D_TILE; // Overrides translucent commands
            }

            commandList[i] = derivedCommand;
        }

        // Apply processing commands
        var densityEdgeCullCommand = this._drawCommands.densityEdgeCullCommand;
        var pointOcclusionCommand = this._drawCommands.pointOcclusionCommand;
        var regionGrowingCommands = this._drawCommands.regionGrowingCommands;
        var copyCommands = this._drawCommands.copyCommands;
        var stencilCommands = this._drawCommands.stencilCommands;
        var clearCommands = this._clearCommands;
        var blendCommand = this._drawCommands.blendCommand;
        var debugViewCommand = this._drawCommands.debugViewCommand;
        var numRegionGrowingCommands = regionGrowingCommands.length;

        commandList.push(clearCommands.screenSpacePass);
        commandList.push(clearCommands.aoBufferB);
        commandList.push(pointOcclusionCommand);
        commandList.push(clearCommands.densityEstimationPass);
        commandList.push(densityEdgeCullCommand);

        for (i = 0; i < numRegionGrowingCommands; i++) {
            if (i % 2 === 0) {
                commandList.push(clearCommands.regionGrowingPassA);
                commandList.push(clearCommands.aoBufferA);
            } else {
                commandList.push(clearCommands.regionGrowingPassB);
                commandList.push(clearCommands.aoBufferB);
            }

            commandList.push(copyCommands[i % 2]);
            commandList.push(stencilCommands[i]);
            commandList.push(regionGrowingCommands[i]);
        }

        // Blend final result back into the main FBO
        commandList.push(blendCommand);
        if ((this.AOViewEnabled && this.enableAO) || this.depthViewEnabled) {
            commandList.push(debugViewCommand);
        }

        commandList.push(clearCommands['prior']);
    };

    /**
     * @inheritdoc Cesium3DTileContent#isDestroyed
     */
    PointCloudPostProcessor.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @inheritdoc Cesium3DTileContent#destroy
     */
    PointCloudPostProcessor.prototype.destroy = function() {
        // TODO: actually destroy stuff
        return destroyObject(this);
    };

    return PointCloudPostProcessor;
});
