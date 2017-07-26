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
        '../Scene/BlendEquation',
        '../Scene/BlendFunction',
        '../Scene/BlendingState',
        '../Scene/StencilFunction',
        '../Scene/StencilOperation',
        '../Shaders/PostProcessFilters/RegionGrowingPassGL1',
        '../Shaders/PostProcessFilters/RegionGrowingPassGL2',
        '../Shaders/PostProcessFilters/SectorHistogramPass',
        '../Shaders/PostProcessFilters/SectorGatheringPass',
        '../Shaders/PostProcessFilters/DensityEstimationPass',
        '../Shaders/PostProcessFilters/EdgeCullingPass'
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
        BlendEquation,
        BlendFunction,
        BlendingState,
        StencilFunction,
        StencilOperation,
        RegionGrowingPassGL1,
        RegionGrowingPassGL2,
        SectorHistogramPass,
        SectorGatheringPass,
        DensityEstimationPass,
        EdgeCullingPass
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
        this._sectorTextures = undefined;
        this._densityTexture = undefined;
        this._edgeCullingTexture = undefined;
        this._sectorLUTTexture = undefined;
        this._aoTextures = undefined;
        this._dirty = undefined;
        this._drawCommands = undefined;
        /*this._densityEstimationCommand = undefined;
        this._edgeCullingCommand = undefined;
        this._sectorHistogramCommand = undefined;
        this._sectorGatheringCommand = undefined;
        this._regionGrowingCommands = undefined;
        this._stencilCommands = undefined;
        this._aoCommand = undefined;
        this._copyCommands = undefined;
        this._blendCommand = undefined;*/
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
        this.enableAO = options.enableAO;
        this.AOViewEnabled = options.AOViewEnabled;
        this.sigmoidDomainOffset = options.sigmoidDomainOffset;
        this.sigmoidSharpness = options.sigmoidSharpness;

        this._pointArray = undefined;

        this._minBlend = {
            enabled : true,
            equationRgb : BlendEquation.MIN,
            equationAlpha : BlendEquation.MIN,
            functionSourceRgb : BlendFunction.ONE,
            functionSourceAlpha : BlendFunction.ONE,
            functionDestinationRgb : BlendFunction.ONE,
            functionDestinationAlpha : BlendFunction.ONE
        };
        this._addBlend = {
            enabled : true,
            equationRgb : BlendEquation.ADD,
            equationAlpha : BlendEquation.ADD,
            functionSourceRgb : BlendFunction.ONE,
            functionSourceAlpha : BlendFunction.ONE,
            functionDestinationRgb : BlendFunction.ONE,
            functionDestinationAlpha : BlendFunction.ONE
        };

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
        processor._depthTextures[0].destroy();
        processor._depthTextures[1].destroy();
        processor._ecTexture.destroy();
        processor._sectorTextures[0].destroy();
        processor._sectorTextures[1].destroy();
        processor._sectorLUTTexture.destroy();
        processor._aoTextures[0].destroy();
        processor._aoTextures[1].destroy();
        processor._densityTexture.destroy();
        processor._edgeCullingTexture.destroy();
        processor._dirty.destroy();
        processor._colorTextures[0].destroy();
        processor._colorTextures[1].destroy();
        var framebuffers = processor._framebuffers;
        for (var name in framebuffers) {
            if (framebuffers.hasOwnProperty(name)) {
                framebuffers[name].destroy();
            }
        }

        processor._framebuffers = undefined;
        processor._colorTextures = undefined;
        processor._ecTexture = undefined;
        processor._depthTextures = undefined;
        processor._sectorTextures = undefined;
        processor._densityTexture = undefined;
        processor._edgeCullingTexture = undefined;
        processor._sectorLUTTexture = undefined;
        processor._aoTextures = undefined;
        processor._dirty = undefined;
        processor._drawCommands = undefined;
        /*processor._densityEstimationCommand = undefined;
        processor._edgeCullingCommand = undefined;
        processor._sectorHistogramCommand = undefined;
        processor._sectorGatheringCommand = undefined;
        processor._regionGrowingCommands = undefined;
        processor._stencilCommands = undefined;
        processor._aoCommand = undefined;
        processor._copyCommands = undefined;
        processor._blendCommand = undefined;
        processor._clearCommands = undefined;*/
    }

    function generateSectorLUT(processor) {
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
            return new Array(first, second);
        }

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
        var sectorTextures = new Array(2);
        var depthTextures = new Array(3);
        var aoTextures = new Array(2);

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
        var sectorLUTTexture = new Texture({
            context : context,
            width : lutSize,
            height : lutSize,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });
        var lutData = generateSectorLUT(processor);
        sectorLUTTexture.copyFrom({
            width : lutSize,
            height : lutSize,
            arrayBufferView : lutData
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

            sectorTextures[i] = new Texture({
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
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
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
                colorTextures : [depthTextures[0], aoTextures[0]],
                depthStencilTexture: dirty,
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
            sectorHistogramPass : new Framebuffer({
                context : context,
                colorTextures : [sectorTextures[0], sectorTextures[1]],
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
            edgeCullingPass : new Framebuffer({
                context : context,
                colorTextures : [edgeCullingTexture],
                destroyAttachments : false
            }),
            regionGrowingPassA : new Framebuffer({
                context : context,
                colorTextures : [colorTextures[1],
                                 depthTextures[1],
                                 aoTextures[1]],
                depthStencilTexture: dirty,
                destroyAttachments : false
            }),
            regionGrowingPassB : new Framebuffer({
                context: context,
                colorTextures: [colorTextures[0],
                                depthTextures[0],
                                aoTextures[0]],
                depthStencilTexture: dirty,
                destroyAttachments: false
            })
        };
        processor._depthTextures = depthTextures;
        processor._sectorTextures = sectorTextures;
        processor._densityTexture = densityMap;
        processor._edgeCullingTexture = edgeCullingTexture;
        processor._sectorLUTTexture = sectorLUTTexture;
        processor._aoTextures = aoTextures;
        processor._colorTextures = colorTextures;
        processor._ecTexture = ecTexture;
        processor._dirty = dirty;
    }

    function createPointArray(processor, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        var vertexArr = new Float32Array(screenWidth * screenHeight * 2);

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

        var pointArray = VertexArray.fromGeometry({
            context : context,
            geometry : geometry,
            attributeLocations : {
                position : 0
            },
            bufferUsage : BufferUsage.STATIC_DRAW,
            interleave : true
        });

        processor._pointArray = pointArray;
    }

    function createPointArrayCommand(depthTexture,
                                     kernelSize,
                                     useStencil,
                                     blendingState,
                                     fragmentShaderSource,
                                     processor,
                                     context,
                                     overrides) {
        if (!defined(processor._pointArray)) {
            createPointArray(processor, context);
        }

        var vertexShaderSource =
                     '#define EPS 1e-6 \n' +
                     '#define kernelSize 9.0 \n\n' +
                     'attribute vec4 position; \n' +
                     'varying float centerPos; \n\n' +
                     'uniform sampler2D pointCloud_depthTexture; \n\n' +
                     'void main()  \n' +
                     '{ \n' +
                     '    vec2 textureCoordinates = 0.5 * position.xy + vec2(0.5); \n' +
                     '    ivec2 screenSpaceCoordinates = ivec2(textureCoordinates * czm_viewport.zw); \n' +
                     '    if (length(texture2D(pointCloud_depthTexture, textureCoordinates)) > EPS) { \n' +
                     '        gl_Position = position; \n' +
                     '        gl_PointSize = kernelSize; \n' +
                     '        centerPos = float(screenSpaceCoordinates.x + screenSpaceCoordinates.y * int(czm_viewport.z)); \n' +
                     '    } else {\n' +
                     '        gl_Position = vec4(-10); \n' +
                     '        centerPos = 0.0; \n' +
                     '    } \n' +
                     '} \n';

        var uniformMap = (defined(overrides.uniformMap)) ? overrides.uniformMap : {};
        uniformMap.pointCloud_depthTexture = function () {
            return depthTexture;
        };

        vertexShaderSource = replaceConstants(vertexShaderSource, 'kernelSize', kernelSize.toFixed(1));

        var renderState = overrides.renderState;

        if (!defined(overrides.renderState)) {
            var stencilTest = processor._positiveStencilTest;
            if (defined(overrides.stencilTest)) {
                stencilTest = overrides.stencilTest;
            }
            if (useStencil) {
                renderState = RenderState.fromCache({
                    stencilTest : stencilTest,
                    blending : blendingState
                });
            } else {
                renderState = RenderState.fromCache({
                    blending : blendingState
                });
            }
        }

        return new DrawCommand({
            vertexArray : processor._pointArray,
            primitiveType : PrimitiveType.POINTS,
            renderState : renderState,
            shaderProgram : ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : vertexShaderSource,
                fragmentShaderSource : fragmentShaderSource,
                attributeLocations : {
                    position : 0
                }
            }),
            uniformMap : uniformMap,
            owner : overrides.owner,
            framebuffer : overrides.framebuffer,
            pass : overrides.pass
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

    function sectorHistogramStage(processor, context) {
        var neighborhoodSize = processor.neighborhoodHalfWidth * 2 + 1;
        var uniformMap = {
            sectorLUT : function() {
                return processor._sectorLUTTexture;
            },
            neighborhoodSize : function() {
                return neighborhoodSize;
            }
        };

        return createPointArrayCommand(
            processor._ecTexture,
            neighborhoodSize,
            true,
            processor._minBlend,
            SectorHistogramPass,
            processor,
            context, {
                uniformMap : uniformMap,
                framebuffer : processor._framebuffers.sectorHistogramPass,
                pass : Pass.CESIUM_3D_TILE,
                owner : processor
            }
        );
    }

    function sectorGatheringStage(processor, context) {
        var uniformMap = {
            pointCloud_ECTexture : function() {
                return processor._ecTexture;
            },
            sectorFirst : function() {
                return processor._sectorTextures[0];
            },
            sectorSecond : function() {
                return processor._sectorTextures[1];
            },
            occlusionAngle : function() {
                return processor.occlusionAngle;
            },
            ONE : function() {
                return 1.0;
            }
        };

        var sectorGatheringStr = replaceConstants(
            SectorGatheringPass,
            'useTriangle',
            processor.useTriangle
        );

        return context.createViewportQuadCommand(sectorGatheringStr, {
            uniformMap : uniformMap,
            framebuffer : processor._framebuffers.screenSpacePass,
            renderState : RenderState.fromCache({
                stencilTest : processor._positiveStencilTest
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function densityEstimationStage(processor, context) {
        var uniformMap = {
            neighborhoodVectorSize : function() {
                return processor.neighborhoodVectorSize;
            },
            maxAbsRatio : function() {
                return processor.maxAbsRatio;
            },
            pointCloud_edgeCullingTexture : function() {
                return processor._edgeCullingTexture;
            }
        };

        var densityEstimationStr = replaceConstants(
            DensityEstimationPass,
            'neighborhoodHalfWidth',
            processor.densityHalfWidth
        );

        return createPointArrayCommand(
            processor._depthTextures[0],
            processor.densityHalfWidth * 2 + 1,
            false,
            processor._minBlend,
            densityEstimationStr,
            processor,
            context, {
                uniformMap : uniformMap,
                framebuffer : processor._framebuffers.densityEstimationPass,
                pass : Pass.CESIUM_3D_TILE,
                owner : processor
            }
        );
    }

    function edgeCullingStage(processor, context) {
        var uniformMap = {
        };

        var edgeCullingStr = replaceConstants(
            EdgeCullingPass,
            'neighborhoodHalfWidth',
            processor.densityHalfWidth
        );

        return createPointArrayCommand(
            processor._depthTextures[0],
            processor.densityHalfWidth * 2 + 1,
            true,
            processor._addBlend,
            edgeCullingStr,
            processor,
            context, {
                uniformMap : uniformMap,
                framebuffer : processor._framebuffers.edgeCullingPass,
                pass : Pass.CESIUM_3D_TILE,
                owner : processor,
                stencilTest : processor._negativeStencilTest
            }
        );
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
            pointCloud_aoTexture : function() {
                return processor._aoTextures[i];
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

        return context.createViewportQuadCommand(regionGrowingPassStr, {
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
            pointCloud_colorTexture : function() {
                return processor._colorTextures[i];
            },
            pointCloud_depthTexture : function() {
                return processor._depthTextures[i];
            },
            pointCloud_aoTexture : function() {
                return processor._aoTextures[i];
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
            '#define densityScaleFactor 10.0 \n' +
            '#define EPS 1e-6 \n' +
            'uniform int densityHalfWidth; \n' +
            'uniform sampler2D pointCloud_colorTexture; \n' +
            'uniform sampler2D pointCloud_depthTexture; \n' +
            'uniform sampler2D pointCloud_aoTexture; \n' +
            'uniform sampler2D pointCloud_densityTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 rawDepth = texture2D(pointCloud_depthTexture, v_textureCoordinates); \n' +
            '    vec4 rawAO = texture2D(pointCloud_aoTexture, v_textureCoordinates); \n' +
            '    float depth = czm_unpackDepth(rawDepth); \n' +
            '    if (depth > EPS) { \n' +
            '        #ifdef densityView \n' +
            '        float density = ceil(densityScaleFactor * texture2D(pointCloud_densityTexture, v_textureCoordinates).r); \n' +
            '        gl_FragData[0] = vec4(vec3(density / float(densityHalfWidth)), 1.0); \n' +
            '        #else \n' +
            '        gl_FragData[0] = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
            '        #endif \n' +
            '        gl_FragData[1] = rawDepth; \n' +
            '        gl_FragData[2] = rawAO; \n' +
            '    }  else { \n' +
            '       gl_FragData[1] = czm_packDepth(0.0); ' +
            '       gl_FragData[2] = czm_packDepth(1.0 - EPS); ' +
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
            '#define densityScaleFactor 10.0 \n' +
            'uniform sampler2D pointCloud_densityTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    float density = ceil(densityScaleFactor * texture2D(pointCloud_densityTexture, v_textureCoordinates).r); \n' +
            '    if (float(cutoff - DELAY) + EPS > density) \n' +
            '        discard; \n' +
            '} \n';

        stencilMaskStageStr = replaceConstants(
            stencilMaskStageStr,
            'cutoff',
            iteration
        );

        var framebuffer = processor._framebuffers.stencilMask;

        return context.createViewportQuadCommand(stencilMaskStageStr, {
            uniformMap : uniformMap,
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                stencilTest : processor._stencilWrite
            }),
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });
    }

    function aoStage(processor, context) {
        var uniformMap = {
            aoTexture : function() {
                return processor._aoTextures[0];
            }
        };

        var aoStageStr =
            '#define EPS 1e-8 \n' +
            'uniform sampler2D aoTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 raw = texture2D(aoTexture, v_textureCoordinates); \n' +
            '    float occlusion = czm_unpackDepth(raw); \n' +
            '    gl_FragColor = vec4(occlusion); \n' +
            '} \n';

        return context.createViewportQuadCommand(aoStageStr, {
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
        processor._drawCommands.edgeCullingCommand = edgeCullingStage(processor, context);
        processor._drawCommands.densityEstimationCommand = densityEstimationStage(processor, context);
        processor._drawCommands.sectorHistogramCommand = sectorHistogramStage(processor, context);
        processor._drawCommands.sectorGatheringCommand = sectorGatheringStage(processor, context);

        for (i = 0; i < numRegionGrowingPasses; i++) {
            regionGrowingCommands[i] = regionGrowingStage(processor, context, i);
            stencilCommands[i] = stencilMaskStage(processor, context, i);
        }

        copyCommands[0] = copyRegionGrowingColorStage(processor, context, 0);
        copyCommands[1] = copyRegionGrowingColorStage(processor, context, 1);

        var blendFS =
            '#define EPS 1e-8 \n' +
            '#define enableAO' +
            '#extension GL_EXT_frag_depth : enable \n' +
            'uniform sampler2D pointCloud_colorTexture; \n' +
            'uniform sampler2D pointCloud_depthTexture; \n' +
            'uniform sampler2D pointCloud_aoTexture; \n' +
            'uniform float sigmoidDomainOffset; \n' +
            'uniform float sigmoidSharpness; \n' +
            'varying vec2 v_textureCoordinates; \n\n' +
            'float sigmoid2(float x, float sharpness) { \n' +
            '  if (x >= 1.0) return 1.0; \n' +
            '  else if (x <= -1.0) return -1.0; \n' +
            '  else { \n' +
            '    if (sharpness < 0.0) sharpness -= 1.0; \n' +
            ' \n' +
            '    if (x > 0.0) return sharpness * x / (sharpness - x + 1.0); \n' +
            '    else if (x < 0.0) return sharpness * x / (sharpness - abs(x) + 1.0); \n' +
            '    else return 0.0; \n' +
            '  } \n' +
            '} \n\n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 color = texture2D(pointCloud_colorTexture, v_textureCoordinates); \n' +
            '    #ifdef enableAO \n' +
            '    float ao = czm_unpackDepth(texture2D(pointCloud_aoTexture, v_textureCoordinates)); \n' +
            '    ao = clamp(sigmoid2(ao + sigmoidDomainOffset, sigmoidSharpness), 0.0, 1.0); \n' +
            '    color.xyz = color.xyz * ao; \n' +
            '    #endif // enableAO \n' +
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

        blendFS = replaceConstants(
            blendFS,
            'enableAO',
            processor.enableAO && !processor.densityViewEnabled && !processor.stencilViewEnabled
        );

        var blendUniformMap = {
            pointCloud_colorTexture : function() {
                return processor._colorTextures[1 - numRegionGrowingPasses % 2];
            },
            pointCloud_depthTexture : function() {
                return processor._depthTextures[1 - numRegionGrowingPasses % 2];
            },
            pointCloud_aoTexture : function() {
                return processor._aoTextures[1 - numRegionGrowingPasses % 2];
            },
            sigmoidDomainOffset : function() {
                return processor.sigmoidDomainOffset;
            },
            sigmoidSharpness : function() {
                return processor.sigmoidSharpness;
            }
        };

        var blendCommand = context.createViewportQuadCommand(blendFS, {
            uniformMap : blendUniformMap,
            renderState : blendRenderState,
            pass : Pass.CESIUM_3D_TILE,
            owner : processor
        });

        var aoCommand = aoStage(processor, context, processor._sectorTextures[0]);

        var framebuffers = processor._framebuffers;
        var clearCommands = {};
        for (var name in framebuffers) {
            if (framebuffers.hasOwnProperty(name)) {
                // The screen space pass should consider
                // the stencil value, so we don't clear it
                // here. Edge culling should only apply to invalid
                // pixels. The density estimation pass uses
                // min blending, so we need to set the default
                // value to the maximum possible value
                if (name === 'screenSpacePass' ||
                    name === 'edgeCullingPass') {
                    clearCommands[name] = new ClearCommand({
                        framebuffer : framebuffers[name],
                        color : new Color(0.0, 0.0, 0.0, 0.0),
                        depth : 1.0,
                        renderState : RenderState.fromCache(),
                        pass : Pass.CESIUM_3D_TILE,
                        owner : processor
                    });
                } else if (name === 'densityEstimationPass' ||
                           name === 'sectorHistogramPass' ||
                           name === 'aoBufferA' ||
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
        processor._drawCommands.aoCommand = aoCommand;
        processor._clearCommands = clearCommands;
    }

    function createResources(processor, context, dirty) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;
        var colorTextures = processor._colorTextures;
        var regionGrowingCommands = (defined(processor._drawCommands)) ? processor._drawCommands.regionGrowingCommands : undefined;
        var stencilCommands = (defined(processor._drawCommands)) ? processor._drawCommands.stencilCommands : undefined;
        var nowDirty = false;
        var resized = defined(colorTextures) &&
            ((colorTextures[0].width !== screenWidth) ||
             (colorTextures[0].height !== screenHeight));

        if (!defined(colorTextures)) {
            createFramebuffers(processor, context);
            createPointArray(processor, context);
            nowDirty = true;
        }

        if (!defined(regionGrowingCommands) || !defined(stencilCommands) || dirty) {
            createCommands(processor, context);
        }

        if (resized) {
            destroyFramebuffers(processor);
            createFramebuffers(processor, context);
            createPointArray(processor, context);
            createCommands(processor, context);
            nowDirty = true;
        }
        return nowDirty;
    }

    function processingSupported(context) {
        return context.depthTexture && context.blendMinmax;
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
            tileset.pointCloudPostProcessorOptions.useTriangle !== this.useTriangle ||
            tileset.pointCloudPostProcessorOptions.enableAO !== this.enableAO ||
            tileset.pointCloudPostProcessorOptions.AOViewEnabled !== this.AOViewEnabled ||
            tileset.pointCloudPostProcessorOptions.sigmoidDomainOffset !== this.sigmoidDomainOffset ||
            tileset.pointCloudPostProcessorOptions.sigmoidSharpness !== this.sigmoidSharpness) {
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
            this.enableAO = tileset.pointCloudPostProcessorOptions.enableAO;
            this.AOViewEnabled = tileset.pointCloudPostProcessorOptions.AOViewEnabled;
            this.sigmoidDomainOffset = tileset.pointCloudPostProcessorOptions.sigmoidDomainOffset;
            this.sigmoidSharpness = tileset.pointCloudPostProcessorOptions.sigmoidSharpness;
            dirty = true;
        }

        if (!tileset.pointCloudPostProcessorOptions.enabled) {
            return;
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

                var derivedCommandRenderState = derivedCommand.renderState;
                derivedCommandRenderState.stencilTest = this._stencilWrite;
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
        var edgeCullingCommand = this._drawCommands.edgeCullingCommand;
        var densityEstimationCommand = this._drawCommands.densityEstimationCommand;
        var sectorHistogramCommand = this._drawCommands.sectorHistogramCommand;
        var sectorGatheringCommand = this._drawCommands.sectorGatheringCommand;
        var regionGrowingCommands = this._drawCommands.regionGrowingCommands;
        var copyCommands = this._drawCommands.copyCommands;
        var stencilCommands = this._drawCommands.stencilCommands;
        var clearCommands = this._clearCommands;
        var blendCommand = this._drawCommands.blendCommand;
        var aoCommand = this._drawCommands.aoCommand;
        var numRegionGrowingCommands = regionGrowingCommands.length;

        commandList.push(clearCommands['screenSpacePass']);
        commandList.push(clearCommands['sectorHistogramPass']);
        commandList.push(sectorHistogramCommand);
        commandList.push(clearCommands['aoBufferB']);
        commandList.push(sectorGatheringCommand);
        commandList.push(clearCommands['edgeCullingPass']);
        commandList.push(edgeCullingCommand);
        commandList.push(clearCommands['densityEstimationPass']);
        commandList.push(densityEstimationCommand);

        for (i = 0; i < numRegionGrowingCommands; i++) {
            if (i % 2 === 0) {
                commandList.push(clearCommands['regionGrowingPassA']);
                commandList.push(clearCommands['aoBufferA']);
            } else {
                commandList.push(clearCommands['regionGrowingPassB']);
                commandList.push(clearCommands['aoBufferB']);
            }

            commandList.push(copyCommands[i % 2]);
            commandList.push(stencilCommands[i]);
            commandList.push(regionGrowingCommands[i]);
        }

        // Blend final result back into the main FBO
        commandList.push(blendCommand);
        if (this.AOViewEnabled && this.enableAO) {
            commandList.push(aoCommand);
        }

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
