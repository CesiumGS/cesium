/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryAttributes',
        '../Core/GeometryInstance',
        '../Core/IndexDatatype',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/VertexArray',
        '../Shaders/Cesium3DTileGroundPrimitiveFS',
        '../Shaders/Cesium3DTileGroundPrimitiveVS',
        './BlendingState',
        './DepthFunction',
        './Pass',
        './StencilFunction',
        './StencilOperation'
    ], function(
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        ComponentDatatype,
        defaultValue,
        defined,
        destroyObject,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        IndexDatatype,
        Matrix4,
        PrimitiveType,
        Buffer,
        BufferUsage,
        DrawCommand,
        RenderState,
        ShaderProgram,
        VertexArray,
        Cesium3DTileGroundPrimitiveFS,
        Cesium3DTileGroundPrimitiveVS,
        BlendingState,
        DepthFunction,
        Pass,
        StencilFunction,
        StencilOperation) {
    'use strict';

    function Cesium3DTileGroundPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._positions = options.positions;
        this._offsets = options.offsets;
        this._counts = options.counts;
        this._indexOffsets = options.indexOffsets;
        this._indexCounts = options.indexCounts;
        this._indices = options.indices;
        this._decodeMatrix = options.decodeMatrix;

        this._ellispoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._minimumHeight = options.minimumHeight;
        this._maximumHeight = options.maximumHeight;
        this._center = options.center;

        this._boundingVolume = options.boundingVolume;

        this._va = undefined;
        this._sp = undefined;

        this._rsStencilPreloadPass = undefined;
        this._rsStencilDepthPass = undefined;
        this._rsColorPass = undefined;
        this._rsPickPass = undefined;

        this._commands = undefined;
    }

    var attributeLocations = {
        position : 0,
        color : 1
    };

    var scratchEncodedPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchScaledNormal = new Cartesian3();
    var scratchMinHeightPosition = new Cartesian3();
    var scratchMaxHeightPosition = new Cartesian3();

    function createVertexArray(primitive, context) {
        if (!defined(primitive._positions)) {
            return;
        }

        var positions = primitive._positions;
        var offsets = primitive._offsets;
        var counts = primitive._counts;
        var indexOffsets = primitive._indexOffsets;
        var indexCounts = primitive._indexCounts;
        var indices = primitive._indices;
        var decodeMatrix = primitive._decodeMatrix;
        var center = primitive._center;
        var ellipsoid = primitive._ellispoid;

        // TODO: get feature colors
        var randomColors = [Color.fromRandom({alpha : 0.5}), Color.fromRandom({alpha : 0.5})];
        primitive._colors = [];
        var tempLength = offsets.length;
        for (var n = 0; n < tempLength; ++n) {
            primitive._colors[n] = randomColors[n % randomColors.length];
        }

        var positionsLength = positions.length;
        var colorsLength = positionsLength / 3 * 4;
        var batchedPositions = new Float32Array(positionsLength * 2.0);
        var batchedColors = new Uint8Array(colorsLength * 2);

        var wallIndicesLength = positions.length / 3 * 6;
        var indicesLength = indices.length;
        var batchedIndices = new Uint32Array(indicesLength * 2 + wallIndicesLength);

        var colors = primitive._colors;
        colorsLength = colors.length;

        var i;
        var j;
        var color;
        var rgba;

        var buffers = {};
        for (i = 0; i < colorsLength; ++i) {
            rgba = colors[i].toRgba();
            if (!defined(buffers[rgba])) {
                buffers[rgba] = {
                    positionLength : counts[i],
                    indexLength : indexCounts[i],
                    offset : 0,
                    indexOffset : 0
                };
            } else {
                buffers[rgba].positionLength += counts[i];
                buffers[rgba].indexLength += indexCounts[i];
            }
        }

        var object;
        var byColorPositionOffset = 0;
        var byColorIndexOffset = 0;
        for (rgba in buffers) {
            if (buffers.hasOwnProperty(rgba)) {
                object = buffers[rgba];
                object.offset = byColorPositionOffset;
                object.indexOffset = byColorIndexOffset;

                var positionLength = object.positionLength * 2;
                var indexLength = object.indexLength * 2 + object.positionLength * 6;

                byColorPositionOffset += positionLength;
                byColorIndexOffset += indexLength;

                object.indexLength = indexLength;
            }
        }

        var batchedDrawCalls = [];

        for (rgba in buffers) {
            if (buffers.hasOwnProperty(rgba)) {
                object = buffers[rgba];

                batchedDrawCalls.push({
                    color : Color.fromRgba(parseInt(rgba)),
                    offset : object.indexOffset,
                    count : object.indexLength
                });
            }
        }

        primitive._batchedIndices = batchedDrawCalls;

        var minHeight = primitive._minimumHeight;
        var maxHeight = primitive._maximumHeight;

        for (i = 0; i < colorsLength; ++i) {
            color = colors[i];
            rgba = color.toRgba();

            var red = Color.floatToByte(color.red);
            var green = Color.floatToByte(color.green);
            var blue = Color.floatToByte(color.blue);
            var alpha = Color.floatToByte(color.alpha);

            object = buffers[rgba];
            var positionOffset = object.offset;
            var positionIndex = positionOffset * 3;
            var colorIndex = positionOffset * 4;

            var polygonOffset = offsets[i];
            var polygonCount = counts[i];

            for (j = 0; j < polygonCount * 3; j += 3) {
                var encodedPosition = Cartesian3.unpack(positions, polygonOffset * 3 + j, scratchEncodedPosition);
                var rtcPosition = Matrix4.multiplyByPoint(decodeMatrix, encodedPosition, encodedPosition);
                var position = Cartesian3.add(rtcPosition, center, rtcPosition);

                var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
                var scaledPosition = ellipsoid.scaleToGeodeticSurface(position, position);
                var scaledNormal = Cartesian3.multiplyByScalar(normal, minHeight, scratchScaledNormal);
                var minHeightPosition = Cartesian3.add(scaledPosition, scaledNormal, scratchMinHeightPosition);

                scaledNormal = Cartesian3.multiplyByScalar(normal, maxHeight, scaledNormal);
                var maxHeightPosition = Cartesian3.add(scaledPosition, scaledNormal, scratchMaxHeightPosition);

                Cartesian3.subtract(maxHeightPosition, center, maxHeightPosition);
                Cartesian3.subtract(minHeightPosition, center, minHeightPosition);

                Cartesian3.pack(maxHeightPosition, batchedPositions, positionIndex);
                Cartesian3.pack(minHeightPosition, batchedPositions, positionIndex + 3);

                batchedColors[colorIndex]     = red;
                batchedColors[colorIndex + 1] = green;
                batchedColors[colorIndex + 2] = blue;
                batchedColors[colorIndex + 3] = alpha;

                batchedColors[colorIndex + 4] = red;
                batchedColors[colorIndex + 5] = green;
                batchedColors[colorIndex + 6] = blue;
                batchedColors[colorIndex + 7] = alpha;

                positionIndex += 6;
                colorIndex += 8;
            }

            var indicesIndex = object.indexOffset;

            var indexOffset = indexOffsets[i];
            var indexCount = indexCounts[i];

            for (j = 0; j < indexCount; j += 3) {
                var i0 = indices[indexOffset + j] - polygonOffset;
                var i1 = indices[indexOffset + j + 1] - polygonOffset;
                var i2 = indices[indexOffset + j + 2] - polygonOffset;

                batchedIndices[indicesIndex++] = i0 * 2 + positionOffset;
                batchedIndices[indicesIndex++] = i1 * 2 + positionOffset;
                batchedIndices[indicesIndex++] = i2 * 2 + positionOffset;

                batchedIndices[indicesIndex++] = i2 * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = i1 * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = i0 * 2 + 1 + positionOffset;
            }

            for (j = 0; j < polygonCount - 1; ++j) {
                batchedIndices[indicesIndex++] = j * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = (j + 1) * 2 + positionOffset;
                batchedIndices[indicesIndex++] = j * 2 + positionOffset;

                batchedIndices[indicesIndex++] = j * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = (j + 1) * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = (j + 1) * 2 + positionOffset;
            }

            object.offset += polygonCount * 2;
            object.indexOffset = indicesIndex;
        }

        primitive._positions = undefined;
        primitive._decodeMatrix = undefined;

        var positionBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : batchedPositions,
            usage : BufferUsage.STATIC_DRAW
        });
        var colorBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : batchedColors,
            usage : BufferUsage.STATIC_DRAW
        });
        var indexBuffer = Buffer.createIndexBuffer({
            context : context,
            typedArray : batchedIndices,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : IndexDatatype.UNSIGNED_INT
        });

        var vertexAttributes = [{
            index : attributeLocations.position,
            vertexBuffer : positionBuffer,
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3
        }, {
            index : attributeLocations.color,
            vertexBuffer : colorBuffer,
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true
        }];

        primitive._va = new VertexArray({
            context : context,
            attributes : vertexAttributes,
            indexBuffer : indexBuffer
        });
    }

    function createShaders(primitive, context) {
        if (defined(primitive._sp)) {
            return;
        }

        primitive._sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : Cesium3DTileGroundPrimitiveVS,
            fragmentShaderSource : Cesium3DTileGroundPrimitiveFS,
            attributeLocations : attributeLocations
        });
    }

    var stencilPreloadRenderState = {
        colorMask : {
            red : false,
            green : false,
            blue : false,
            alpha : false
        },
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.ALWAYS,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.DECREMENT_WRAP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            backFunction : StencilFunction.ALWAYS,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.INCREMENT_WRAP,
                zPass : StencilOperation.INCREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : false
        },
        depthMask : false
    };

    var stencilDepthRenderState = {
        colorMask : {
            red : false,
            green : false,
            blue : false,
            alpha : false
        },
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.ALWAYS,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.INCREMENT_WRAP
            },
            backFunction : StencilFunction.ALWAYS,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : true,
            func : DepthFunction.LESS_OR_EQUAL
        },
        depthMask : false
    };

    var colorRenderState = {
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.NOT_EQUAL,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            backFunction : StencilFunction.NOT_EQUAL,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : false
        },
        depthMask : false,
        blending : BlendingState.ALPHA_BLEND
    };

    var pickRenderState = {
        stencilTest : {
            enabled : true,
            frontFunction : StencilFunction.NOT_EQUAL,
            frontOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            backFunction : StencilFunction.NOT_EQUAL,
            backOperation : {
                fail : StencilOperation.KEEP,
                zFail : StencilOperation.KEEP,
                zPass : StencilOperation.DECREMENT_WRAP
            },
            reference : 0,
            mask : ~0
        },
        depthTest : {
            enabled : false
        },
        depthMask : false
    };

    function createRenderStates(primitive) {
        if (defined(primitive._rsStencilPreloadPass)) {
            return;
        }

        primitive._rsStencilPreloadPass = RenderState.fromCache(stencilPreloadRenderState);
        primitive._rsStencilDepthPass = RenderState.fromCache(stencilDepthRenderState);
        primitive._rsColorPass = RenderState.fromCache(colorRenderState);
        primitive._rsPickPass = RenderState.fromCache(pickRenderState);
    }

    var modifiedModelViewScratch = new Matrix4();
    var rtcScratch = new Cartesian3();

    function createUniformMap(primitive, context) {
        if (defined(primitive._uniformMap)) {
            return;
        }

        primitive._uniformMap = {
            u_modifiedModelViewProjection : function() {
                var viewMatrix = context.uniformState.view;
                var projectionMatrix = context.uniformState.projection;
                Matrix4.clone(viewMatrix, modifiedModelViewScratch);
                Matrix4.multiplyByPoint(modifiedModelViewScratch, primitive._center, rtcScratch);
                Matrix4.setTranslation(modifiedModelViewScratch, rtcScratch, modifiedModelViewScratch);
                Matrix4.multiply(projectionMatrix, modifiedModelViewScratch, modifiedModelViewScratch);
                return modifiedModelViewScratch;
            }
        };
    }

    function createColorCommands(primitive) {
        if (defined(primitive._commands)) {
            return;
        }

        primitive._commands = [];

        var batchedIndices = primitive._batchedIndices;
        var length = batchedIndices.length;
        for (var i = 0; i < length; ++i) {
            var command = new DrawCommand({
                owner : primitive,
                primitiveType : PrimitiveType.TRIANGLES,
                vertexArray : primitive._va,
                shaderProgram : primitive._sp,
                uniformMap : primitive._uniformMap,
                modelMatrix : Matrix4.IDENTITY,
                boundingVolume : primitive._boundingVolume,
                pass : Pass.GROUND,
                offset : batchedIndices[i].offset,
                count : batchedIndices[i].count
            });

            var stencilPreloadCommand = command;
            var stencilDepthCommand = DrawCommand.shallowClone(command);
            var colorCommand = DrawCommand.shallowClone(command);

            stencilPreloadCommand.renderState = primitive._rsStencilPreloadPass;
            stencilDepthCommand.renderState = primitive._rsStencilDepthPass;
            colorCommand.renderState = primitive._rsColorPass;

            primitive._commands.push(stencilPreloadCommand, stencilDepthCommand, colorCommand);
        }
    }

    Cesium3DTileGroundPrimitive.prototype.update = function(frameState) {
        var context = frameState.context;

        createVertexArray(this, context);
        createShaders(this, context);
        createRenderStates(this);
        createUniformMap(this, context);
        createColorCommands(this);

        var passes = frameState.passes;
        if (passes.render) {
            var length = this._commands.length;
            for (var i = 0; i < length; ++i) {
                frameState.commandList.push(this._commands[i]);
            }
        }
    };

    Cesium3DTileGroundPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    Cesium3DTileGroundPrimitive.prototype.destroy = function() {
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.destroy();
        return destroyObject(this);
    };

    return Cesium3DTileGroundPrimitive;
});
