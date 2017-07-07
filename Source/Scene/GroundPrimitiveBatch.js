/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryAttributes',
        '../Core/GeometryInstance',
        '../Core/IndexDatatype',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/PrimitiveType',
        '../Core/Rectangle',
        '../Core/TaskProcessor',
        '../Core/TranslationRotationScale',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/Pass',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArray',
        '../Shaders/ShadowVolumeFS',
        '../Shaders/ShadowVolumeVS',
        '../ThirdParty/when',
        './BlendingState',
        './DepthFunction',
        './StencilFunction',
        './StencilOperation'
    ], function(
        Cartesian3,
        Cartographic,
        Color,
        ColorGeometryInstanceAttribute,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        IndexDatatype,
        Matrix4,
        OrientedBoundingBox,
        PrimitiveType,
        Rectangle,
        TaskProcessor,
        TranslationRotationScale,
        Buffer,
        BufferUsage,
        DrawCommand,
        Pass,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArray,
        ShadowVolumeFS,
        ShadowVolumeVS,
        when,
        BlendingState,
        DepthFunction,
        StencilFunction,
        StencilOperation) {
    'use strict';

    /**
     * Renders a batch of pre-triangulated polygons draped on terrain.
     *
     * @alias GroundPrimitiveBatch
     * @constructor
     *
     * @param {Object} options An object with following properties:
     * @param {Float32Array|Uint16Array} options.positions The positions of the polygons. The positions must be contiguous
     * so that the positions for polygon n are in [c, c + counts[n]] where c = sum{counts[0], counts[n - 1]} and they are the outer ring of
     * the polygon in counter-clockwise order.
     * @param {Number[]} options.counts The number or positions in the each polygon.
     * @param {Uint16Array|Uint32Array} options.indices The indices of the triangulated polygons. The indices must be contiguous so that
     * the indices for polygon n are in [i, i + indexCounts[n]] where i = sum{indexCounts[0], indexCounts[n - 1]}.
     * @param {Number[]} options.indexCounts The number of indices for each polygon.
     * @param {Number} options.minimumHeight The minimum height of the terrain covered by the tile.
     * @param {Number} options.maximumHeight The maximum height of the terrain covered by the tile.
     * @param {Float32Array} [options.polygonMinimumHeights] An array containing the minimum heights for each polygon.
     * @param {Float32Array} [options.polygonMaximumHeights] An array containing the maximum heights for each polygon.
     * @param {Rectangle} options.rectangle The rectangle containing the tile.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
     * @param {Cartesian3} [options.center=Cartesian3.ZERO] The RTC center.
     * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched polygons.
     * @param {Number[]} options.batchIds The batch ids for each polygon.
     * @param {BoundingSphere} options.boundingVolume The bounding volume for the entire batch of polygons.
     *
     * @private
     */
    function GroundPrimitiveBatch(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._batchTable = options.batchTable;

        // These arrays are released after VAO creation.
        this._batchIds = options.batchIds;
        this._positions = options.positions;
        this._counts = options.counts;

        // These arrays are kept for re-batching indices based on colors.
        // If WebGL 2 is supported, indices will be released and rebatching uses buffer-to-buffer copies.
        this._indices = options.indices;
        this._indexCounts = options.indexCounts;
        this._indexOffsets = undefined;

        // Typed arrays transferred to web worker.
        this._batchTableColors = undefined;
        this._packedBuffer = undefined;

        // Typed array transferred from web worker and released after vbo creation.
        this._batchedPositions = undefined;

        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._minimumHeight = options.minimumHeight;
        this._maximumHeight = options.maximumHeight;
        this._polygonMinimumHeights = options.polygonMinimumHeights;
        this._polygonMaximumHeights = options.polygonMaximumHeights;
        this._center = options.center;
        this._rectangle = options.rectangle;
        this._isCartographic = options.isCartographic;
        this._modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY);

        this._boundingVolume = options.boundingVolume;
        this._boundingVolumes = undefined;

        this._batchedIndices = undefined;

        this._va = undefined;
        this._sp = undefined;
        this._spPick = undefined;
        this._uniformMap = undefined;

        // Only used with WebGL 2 to ping-pong ibos after copy.
        this._vaSwap = undefined;

        this._rsStencilPreloadPass = undefined;
        this._rsStencilDepthPass = undefined;
        this._rsColorPass = undefined;
        this._rsPickPass = undefined;

        this._commands = [];
        this._pickCommands = [];

        this._pickObject = options.pickObject;

        this._constantColor = Color.clone(Color.WHITE);
        this._highlightColor = this._constantColor;

        this._batchDirty = false;
        this._pickCommandsDirty = true;
        this._framesSinceLastRebatch = 0;

        this._ready = false;
        this._readyPromise = when.defer();

        this._verticesPromise = undefined;
    }

    defineProperties(GroundPrimitiveBatch.prototype, {
        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        }
    });

    function packBuffer(primitive) {
        var packedBuffer = new Float64Array(3 + Cartesian3.packedLength + Ellipsoid.packedLength + Rectangle.packedLength);

        var offset = 0;
        packedBuffer[offset++] = primitive._minimumHeight;
        packedBuffer[offset++] = primitive._maximumHeight;

        Cartesian3.pack(primitive._center, packedBuffer, offset);
        offset += Cartesian3.packedLength;

        Ellipsoid.pack(primitive._ellipsoid, packedBuffer, offset);
        offset += Ellipsoid.packedLength;

        Rectangle.pack(primitive._rectangle, packedBuffer, offset);
        offset += Rectangle.packedLength;

        packedBuffer[offset] = primitive._isCartographic ? 1.0 : 0.0;

        return packedBuffer;
    }

    function unpackBuffer(primitive, packedBuffer) {
        var offset = 1;

        var numBVS = packedBuffer[offset++];
        var bvs = primitive._boundingVolumes = new Array(numBVS);

        for (var i = 0; i < numBVS; ++i) {
            bvs[i] = OrientedBoundingBox.unpack(packedBuffer, offset);
            offset += OrientedBoundingBox.packedLength;
        }

        var numBatchedIndices = packedBuffer[offset++];
        var bis = primitive._batchedIndices = new Array(numBatchedIndices);

        for (var j = 0; j < numBatchedIndices; ++j) {
            var color = Color.unpack(packedBuffer, offset);
            offset += Color.packedLength;

            var indexOffset = packedBuffer[offset++];
            var count = packedBuffer[offset++];

            var length = packedBuffer[offset++];
            var batchIds = new Array(length);

            for (var k = 0; k < length; ++k) {
                batchIds[k] = packedBuffer[offset++];
            }

            bis[j] = {
                color : color,
                offset : indexOffset,
                count : count,
                batchIds : batchIds
            };
        }
    }

    var attributeLocations = {
        position : 0,
        a_batchId : 1
    };

    var createVerticesTaskProcessor = new TaskProcessor('createVerticesFromVectorTile');
    var scratchColor = new Color();

    function createVertexArray(primitive, context) {
        if (defined(primitive._va)) {
            return;
        }

        if (!defined(primitive._verticesPromise)) {
            var positions = primitive._positions;
            var counts = primitive._counts;
            var indexCounts = primitive._indexCounts;
            var indices = primitive._indices;

            var batchIds = primitive._batchIds;
            var batchTableColors = primitive._batchTableColors;

            var packedBuffer = primitive._packedBuffer;

            if (!defined(batchTableColors)) {
                // Copy because they may be the views on the same buffer.
                positions = primitive._positions = primitive._positions.slice();
                counts = primitive._counts = primitive._counts.slice();
                indexCounts = primitive._indexCounts= primitive._indexCounts.slice();
                indices = primitive._indices = primitive._indices.slice();

                batchTableColors = primitive._batchTableColors = new Uint32Array(batchIds.length);
                batchIds = primitive._batchIds = new Uint32Array(primitive._batchIds);
                var batchTable = primitive._batchTable;

                var length = batchTableColors.length;
                for (var i = 0; i < length; ++i) {
                    var color = batchTable.getColor(batchIds[i], scratchColor);
                    batchTableColors[i] = color.toRgba();
                }

                packedBuffer = primitive._packedBuffer = packBuffer(primitive);
            }

            var transferrableObjects = [positions.buffer, counts.buffer, indexCounts.buffer, indices.buffer, batchIds.buffer, batchTableColors.buffer, packedBuffer.buffer];
            var parameters = {
                packedBuffer : packedBuffer.buffer,
                positions : positions.buffer,
                counts : counts.buffer,
                indexCounts : indexCounts.buffer,
                indices : indices.buffer,
                batchIds : batchIds.buffer,
                batchTableColors : batchTableColors.buffer
            };

            var minimumHeights = primitive._polygonMinimumHeights;
            var maximumHeights = primitive._polygonMaximumHeights;
            if (defined(minimumHeights) && defined(maximumHeights)) {
                transferrableObjects.push(minimumHeights.buffer, maximumHeights.buffer);
                parameters.minimumHeights = minimumHeights;
                parameters.maximumHeights = maximumHeights;
            }

            var verticesPromise = primitive._verticesPromise = createVerticesTaskProcessor.scheduleTask(parameters, transferrableObjects);
            if (!defined(verticesPromise)) {
                // Postponed
                return;
            }

            when(verticesPromise, function(result) {
                primitive._positions = undefined;
                primitive._counts = undefined;
                primitive._polygonMinimumHeights = undefined;
                primitive._polygonMaximumHeights = undefined;

                var packedBuffer = new Float64Array(result.packedBuffer);
                var indexDatatype = packedBuffer[0];
                unpackBuffer(primitive, packedBuffer);

                primitive._indices = IndexDatatype.getSizeInBytes(indexDatatype) === 2 ? new Uint16Array(result.indices) : new Uint32Array(result.indices);
                primitive._indexOffsets = new Uint32Array(result.indexOffsets);
                primitive._indexCounts = new Uint32Array(result.indexCounts);

                // will be released
                primitive._batchedPositions = new Float32Array(result.positions);
                primitive._batchIds = new Uint32Array(result.batchIds);

                primitive._ready = true;
            });
        }

        if (primitive._ready && !defined(primitive._va)) {
            var positionBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : primitive._batchedPositions,
                usage : BufferUsage.STATIC_DRAW
            });
            var idBuffer = Buffer.createVertexBuffer({
                context : context,
                typedArray : primitive._batchIds,
                usage : BufferUsage.STATIC_DRAW
            });
            var indexBuffer = Buffer.createIndexBuffer({
                context : context,
                typedArray : primitive._indices,
                usage : BufferUsage.DYNAMIC_DRAW,
                indexDatatype : (primitive._indices.BYTES_PER_ELEMENT === 2) ?  IndexDatatype.UNSIGNED_SHORT : IndexDatatype.UNSIGNED_INT
            });

            var vertexAttributes = [{
                index : attributeLocations.position,
                vertexBuffer : positionBuffer,
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3
            }, {
                index : attributeLocations.a_batchId,
                vertexBuffer : idBuffer,
                componentDatatype : ComponentDatatype.UNSIGNED_SHORT,
                componentsPerAttribute : 1
            }];

            primitive._va = new VertexArray({
                context : context,
                attributes : vertexAttributes,
                indexBuffer : indexBuffer
            });

            if (context.webgl2) {
                primitive._vaSwap = new VertexArray({
                    context : context,
                    attributes : vertexAttributes,
                    indexBuffer : Buffer.createIndexBuffer({
                        context : context,
                        sizeInBytes : indexBuffer.sizeInBytes,
                        usage : BufferUsage.DYNAMIC_DRAW,
                        indexDatatype : indexBuffer.indexDatatype
                    })
                });
            }

            primitive._batchedPositions = undefined;
            primitive._batchIds = undefined;
            primitive._verticesPromise = undefined;

            primitive._readyPromise.resolve();
        }
    }

    function createShaders(primitive, context) {
        if (defined(primitive._sp)) {
            return;
        }

        var batchTable = primitive._batchTable;

        var vsSource = batchTable.getVertexShaderCallback(false, 'a_batchId')(ShadowVolumeVS);
        var fsSource = batchTable.getFragmentShaderCallback()(ShadowVolumeFS);

        var vs = new ShaderSource({
            defines : ['VECTOR_TILE'],
            sources : [vsSource]
        });
        var fs = new ShaderSource({
            defines : ['VECTOR_TILE'],
            sources : [fsSource]
        });

        primitive._sp = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            attributeLocations : attributeLocations
        });

        vsSource = batchTable.getPickVertexShaderCallback('a_batchId')(ShadowVolumeVS);
        fsSource = batchTable.getPickFragmentShaderCallback()(ShadowVolumeFS);

        var pickVS = new ShaderSource({
            defines : ['VECTOR_TILE'],
            sources : [vsSource]
        });
        var pickFS = new ShaderSource({
            defines : ['VECTOR_TILE'],
            sources : [fsSource]
        });
        primitive._spPick = ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : pickVS,
            fragmentShaderSource : pickFS,
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
            },
            u_highlightColor : function() {
                return primitive._highlightColor;
            }
        };
    }

    function copyIndicesCPU(indices, newIndices, currentOffset, offsets, counts, batchIds) {
        var sizeInBytes = indices.constructor.BYTES_PER_ELEMENT;

        var batchedIdsLength = batchIds.length;
        for (var j = 0; j < batchedIdsLength; ++j) {
            var batchedId = batchIds[j];
            var offset = offsets[batchedId];
            var count = counts[batchedId];

            var subarray = new indices.constructor(indices.buffer, sizeInBytes * offset, count);
            newIndices.set(subarray, currentOffset);

            offsets[batchedId] = currentOffset;
            currentOffset += count;
        }

        return currentOffset;
    }

    function rebatchCPU(primitive, batchedIndices) {
        var newIndices = new primitive._indices.constructor(primitive._indices.length);

        var current = batchedIndices.pop();
        var newBatchedIndices = [current];

        var currentOffset = copyIndicesCPU(primitive._indices, newIndices, 0, primitive._indexOffsets, primitive._indexCounts, current.batchIds);

        current.offset = 0;
        current.count = currentOffset;

        while (batchedIndices.length > 0) {
            var next = batchedIndices.pop();
            if (Color.equals(next.color, current.color)) {
                currentOffset = copyIndicesCPU(primitive._indices, newIndices, currentOffset, primitive._indexOffsets, primitive._indexCounts, next.batchIds);
                current.batchIds = current.batchIds.concat(next.batchIds);
                current.count = currentOffset - current.offset;
            } else {
                var offset = currentOffset;
                currentOffset = copyIndicesCPU(primitive._indices, newIndices, currentOffset, primitive._indexOffsets, primitive._indexCounts, next.batchIds);

                next.offset = offset;
                next.count = currentOffset - offset;
                newBatchedIndices.push(next);
                current = next;
            }
        }

        primitive._va.indexBuffer.copyFromArrayView(newIndices);

        primitive._indices = newIndices;
        primitive._batchedIndices = newBatchedIndices;
    }

    function copyIndicesGPU(readBuffer, writeBuffer, currentOffset, offsets, counts, batchIds) {
        var sizeInBytes = readBuffer.bytesPerIndex;

        var batchedIdsLength = batchIds.length;
        for (var j = 0; j < batchedIdsLength; ++j) {
            var batchedId = batchIds[j];
            var offset = offsets[batchedId];
            var count = counts[batchedId];

            writeBuffer.copyFromBuffer(readBuffer, offset * sizeInBytes, currentOffset * sizeInBytes, count * sizeInBytes);

            offsets[batchedId] = currentOffset;
            currentOffset += count;
        }

        return currentOffset;
    }

    function rebatchGPU(primitive, batchedIndices) {
        var current = batchedIndices.pop();
        var newBatchedIndices = [current];

        var readBuffer = primitive._va.indexBuffer;
        var writeBuffer = primitive._vaSwap.indexBuffer;

        var currentOffset = copyIndicesGPU(readBuffer, writeBuffer, 0, primitive._indexOffsets, primitive._indexCounts, current.batchIds);

        current.offset = 0;
        current.count = currentOffset;

        while (batchedIndices.length > 0) {
            var next = batchedIndices.pop();
            if (Color.equals(next.color, current.color)) {
                currentOffset = copyIndicesGPU(readBuffer, writeBuffer, currentOffset, primitive._indexOffsets, primitive._indexCounts, next.batchIds);
                current.batchIds = current.batchIds.concat(next.batchIds);
                current.count = currentOffset - current.offset;
            } else {
                var offset = currentOffset;
                currentOffset = copyIndicesGPU(readBuffer, writeBuffer, currentOffset, primitive._indexOffsets, primitive._indexCounts, next.batchIds);
                next.offset = offset;
                next.count = currentOffset - offset;
                newBatchedIndices.push(next);
                current = next;
            }
        }

        var temp = primitive._va;
        primitive._va = primitive._vaSwap;
        primitive._vaSwap = temp;

        primitive._batchedIndices = newBatchedIndices;
    }

    function compareColors(a, b) {
        return b.color.toRgba() - a.color.toRgba();
    }

    // PERFORMANCE_IDEA: For WebGL 2, we can use copyBufferSubData for buffer-to-buffer copies.
    // PERFORMANCE_IDEA: Not supported, but we could use glMultiDrawElements here.
    function rebatchCommands(primitive, context) {
        if (!primitive._batchDirty) {
            return false;
        }

        var batchedIndices = primitive._batchedIndices;
        var length = batchedIndices.length;

        var needToRebatch = false;
        var colorCounts = {};

        for (var i = 0; i < length; ++i) {
            var color = batchedIndices[i].color;
            var rgba = color.toRgba();
            if (defined(colorCounts[rgba])) {
                needToRebatch = true;
                break;
            } else {
                colorCounts[rgba] = true;
            }
        }

        if (!needToRebatch) {
            primitive._batchDirty = false;
            return false;
        }

        if (needToRebatch && primitive._framesSinceLastRebatch < 120) {
            ++primitive._framesSinceLastRebatch;
            return;
        }

        batchedIndices.sort(compareColors);

        if (context.webgl2) {
            rebatchGPU(primitive, batchedIndices);
        } else {
            rebatchCPU(primitive, batchedIndices);
        }

        primitive._framesSinceLastRebatch = 0;
        primitive._batchDirty = false;
        primitive._pickCommandsDirty = true;
        return true;
    }

    function createColorCommands(primitive, context) {
        if (defined(primitive._commands) && !rebatchCommands(primitive, context) && primitive._commands.length / 3 === primitive._batchedIndices.length) {
            return;
        }

        var batchedIndices = primitive._batchedIndices;
        var length = batchedIndices.length;

        var commands = primitive._commands;
        commands.length = length * 3;

        var vertexArray = primitive._va;
        var sp = primitive._sp;
        var modelMatrix = primitive._modelMatrix;
        var uniformMap = primitive._batchTable.getUniformMapCallback()(primitive._uniformMap);
        var bv = primitive._boundingVolume;

        var owner = primitive._pickObject;
        if (!defined(owner)) {
            owner = primitive;
        }

        for (var j = 0; j < length; ++j) {
            var offset = batchedIndices[j].offset;
            var count = batchedIndices[j].count;

            var stencilPreloadCommand = commands[j * 3];
            if (!defined(stencilPreloadCommand)) {
                stencilPreloadCommand = commands[j * 3] = new DrawCommand({
                    owner : owner
                });
            }

            stencilPreloadCommand.vertexArray = vertexArray;
            stencilPreloadCommand.modelMatrix = modelMatrix;
            stencilPreloadCommand.offset = offset;
            stencilPreloadCommand.count = count;
            stencilPreloadCommand.renderState = primitive._rsStencilPreloadPass;
            stencilPreloadCommand.shaderProgram = sp;
            stencilPreloadCommand.uniformMap = uniformMap;
            stencilPreloadCommand.boundingVolume = bv;
            stencilPreloadCommand.pass = Pass.GROUND;

            var stencilDepthCommand = commands[j * 3 + 1];
            if (!defined(stencilDepthCommand)) {
                stencilDepthCommand = commands[j * 3 + 1] = new DrawCommand({
                    owner : owner
                });
            }

            stencilDepthCommand.vertexArray = vertexArray;
            stencilDepthCommand.modelMatrix = modelMatrix;
            stencilDepthCommand.offset = offset;
            stencilDepthCommand.count = count;
            stencilDepthCommand.renderState = primitive._rsStencilDepthPass;
            stencilDepthCommand.shaderProgram = sp;
            stencilDepthCommand.uniformMap = uniformMap;
            stencilDepthCommand.boundingVolume = bv;
            stencilDepthCommand.pass = Pass.GROUND;

            var colorCommand = commands[j * 3 + 2];
            if (!defined(colorCommand)) {
                colorCommand = commands[j * 3 + 2] = new DrawCommand({
                    owner : owner
                });
            }

            colorCommand.vertexArray = vertexArray;
            colorCommand.modelMatrix = modelMatrix;
            colorCommand.offset = offset;
            colorCommand.count = count;
            colorCommand.renderState = primitive._rsColorPass;
            colorCommand.shaderProgram = sp;
            colorCommand.uniformMap = uniformMap;
            colorCommand.boundingVolume = bv;
            colorCommand.pass = Pass.GROUND;
        }
    }

    function createPickCommands(primitive) {
        if (!primitive._pickCommandsDirty) {
            return;
        }

        var length = primitive._indexOffsets.length;
        var pickCommands = primitive._pickCommands;
        pickCommands.length = length * 3;

        var vertexArray = primitive._va;
        var sp = primitive._sp;
        var spPick = primitive._spPick;
        var modelMatrix = primitive._modelMatrix;
        var uniformMap = primitive._batchTable.getPickUniformMapCallback()(primitive._uniformMap);

        var owner = primitive._pickObject;
        if (!defined(owner)) {
            owner = primitive;
        }

        for (var j = 0; j < length; ++j) {
            var offset = primitive._indexOffsets[j];
            var count = primitive._indexCounts[j];
            var bv = primitive._boundingVolumes[j];

            var stencilPreloadCommand = pickCommands[j * 3];
            if (!defined(stencilPreloadCommand)) {
                stencilPreloadCommand = pickCommands[j * 3] = new DrawCommand({
                    owner : owner
                });
            }

            stencilPreloadCommand.vertexArray = vertexArray;
            stencilPreloadCommand.modelMatrix = modelMatrix;
            stencilPreloadCommand.offset = offset;
            stencilPreloadCommand.count = count;
            stencilPreloadCommand.renderState = primitive._rsStencilPreloadPass;
            stencilPreloadCommand.shaderProgram = sp;
            stencilPreloadCommand.uniformMap = uniformMap;
            stencilPreloadCommand.boundingVolume = bv;
            stencilPreloadCommand.pass = Pass.GROUND;

            var stencilDepthCommand = pickCommands[j * 3 + 1];
            if (!defined(stencilDepthCommand)) {
                stencilDepthCommand = pickCommands[j * 3 + 1] = new DrawCommand({
                    owner : owner
                });
            }

            stencilDepthCommand.vertexArray = vertexArray;
            stencilDepthCommand.modelMatrix = modelMatrix;
            stencilDepthCommand.offset = offset;
            stencilDepthCommand.count = count;
            stencilDepthCommand.renderState = primitive._rsStencilDepthPass;
            stencilDepthCommand.shaderProgram = sp;
            stencilDepthCommand.uniformMap = uniformMap;
            stencilDepthCommand.boundingVolume = bv;
            stencilDepthCommand.pass = Pass.GROUND;

            var colorCommand = pickCommands[j * 3 + 2];
            if (!defined(colorCommand)) {
                colorCommand = pickCommands[j * 3 + 2] = new DrawCommand({
                    owner : owner
                });
            }

            colorCommand.vertexArray = vertexArray;
            colorCommand.modelMatrix = modelMatrix;
            colorCommand.offset = offset;
            colorCommand.count = count;
            colorCommand.renderState = primitive._rsPickPass;
            colorCommand.shaderProgram = spPick;
            colorCommand.uniformMap = uniformMap;
            colorCommand.boundingVolume = bv;
            colorCommand.pass = Pass.GROUND;
        }

        primitive._pickCommandsDirty = false;
    }

    /**
     * Colors the entire tile when enabled is true. The resulting color will be (polygon batch table color * color).
     *
     * @param {Boolean} enabled Whether to enable debug coloring.
     * @param {Color} color The debug color.
     */
    GroundPrimitiveBatch.prototype.applyDebugSettings = function(enabled, color) {
        this._highlightColor = enabled ? color : this._constantColor;
    };

    /**
     * Call when updating the color of a polygon with batchId changes color. The polygons will need to be re-batched
     * on the next update.
     *
     * @param {Number} batchId The batch id of the polygon whose color has changed.
     * @param {Color} color The new polygon color.
     */
    GroundPrimitiveBatch.prototype.updateCommands = function(batchId, color) {
        var offset = this._indexOffsets[batchId];
        var count = this._indexCounts[batchId];

        var batchedIndices = this._batchedIndices;
        var length = batchedIndices.length;

        var i;
        for (i = 0; i < length; ++i) {
            var batchedOffset = batchedIndices[i].offset;
            var batchedCount = batchedIndices[i].count;

            if (offset >= batchedOffset && offset < batchedOffset + batchedCount) {
                break;
            }
        }

        batchedIndices.push({
            color : Color.clone(color),
            offset : offset,
            count : count,
            batchIds : [batchId]
        });

        var startIds = [];
        var endIds = [];

        var batchIds = batchedIndices[i].batchIds;
        var batchIdsLength = batchIds.length;

        for (var j = 0; j < batchIdsLength; ++j) {
            var id = batchIds[j];
            if (id === batchId) {
                continue;
            }

            if (this._indexOffsets[id] < offset) {
                startIds.push(id);
            } else {
                endIds.push(id);
            }
        }

        if (endIds.length !== 0) {
            batchedIndices.push({
                color : Color.clone(batchedIndices[i].color),
                offset : offset + count,
                count : batchedIndices[i].offset + batchedIndices[i].count - (offset + count),
                batchIds : endIds
            });
        }

        if (startIds.length !== 0) {
            batchedIndices[i].count = offset - batchedIndices[i].offset;
            batchedIndices[i].batchIds = startIds;
        } else {
            batchedIndices.splice(i, 1);
        }

        this._batchDirty = true;
    };

    /**
     * Updates the batches and queues the commands for rendering.
     *
     * @param {FrameState} frameState The current frame state.
     */
    GroundPrimitiveBatch.prototype.update = function(frameState) {
        var context = frameState.context;

        createVertexArray(this, context);
        createShaders(this, context);
        createRenderStates(this);
        createUniformMap(this, context);

        if (!this._ready) {
            return;
        }

        var passes = frameState.passes;
        if (passes.render) {
            createColorCommands(this, context);
            var commandLength = this._commands.length;
            for (var i = 0; i < commandLength; ++i) {
                frameState.commandList.push(this._commands[i]);
            }
        }

        if (passes.pick) {
            createPickCommands(this);
            var pickCommandLength = this._pickCommands.length;
            for (var j = 0; j < pickCommandLength; ++j) {
                frameState.commandList.push(this._pickCommands[j]);
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     */
    GroundPrimitiveBatch.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    GroundPrimitiveBatch.prototype.destroy = function() {
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.destroy();
        this._spPick = this._spPick && this._spPick.destroy();
        this._vaSwap = this._vaSwap && this._vaSwap.destroy();
        return destroyObject(this);
    };

    return GroundPrimitiveBatch;
});
