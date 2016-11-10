/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
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
        '../Core/OrientedBoundingBox',
        '../Core/PrimitiveType',
        '../Core/Rectangle',
        '../Core/TranslationRotationScale',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArray',
        '../Shaders/ShadowVolumeFS',
        '../Shaders/ShadowVolumeVS',
        './BlendingState',
        './DepthFunction',
        './Pass',
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
        TranslationRotationScale,
        Buffer,
        BufferUsage,
        DrawCommand,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArray,
        ShadowVolumeFS,
        ShadowVolumeVS,
        BlendingState,
        DepthFunction,
        Pass,
        StencilFunction,
        StencilOperation) {
    'use strict';

    /**
     * Renders a batch of pre-triangulated polygons draped on terrain.
     *
     * @alias GroundPrimitiveBatch
     * @constructor
     * @private
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
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
     * @param {Cartesian3} [options.center=Cartesian3.ZERO] The RTC center.
     * @param {Number} [options.quantizedOffset] The quantized offset. If undefined, the positions should be in Float32Array and are not quantized.
     * @param {Number} [options.quantizedScale] The quantized scale. If undefined, the positions should be in Float32Array and are not quantized.
     * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched polygons.
     * @param {Number[]} options.batchIds The batch ids for each polygon.
     * @param {BoundingSphere} options.boundingVolume The bounding volume for the entire batch of polygons.
     */
    function GroundPrimitiveBatch(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._batchTable = options.batchTable;

        // These arrays are released after VAO creation
        this._batchIds = options.batchIds;
        this._positions = options.positions;
        this._counts = options.counts;

        // These arrays are kept for re-batching indices based on colors
        this._indexCounts = options.indexCounts;
        this._indices = options.indices;

        this._ellispoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._minimumHeight = options.minimumHeight;
        this._maximumHeight = options.maximumHeight;
        this._center = options.center;
        this._quantizedOffset = options.quantizedOffset;
        this._quantizedScale = options.quantizedScale;

        this._boundingVolume = options.boundingVolume;
        this._boundingVolumes = new Array(this._counts.length);

        this._batchedIndices = undefined;

        this._va = undefined;
        this._sp = undefined;
        this._spPick = undefined;

        this._rsStencilPreloadPass = undefined;
        this._rsStencilDepthPass = undefined;
        this._rsColorPass = undefined;
        this._rsPickPass = undefined;

        this._commands = [];
        this._pickCommands = [];

        this._constantColor = Color.clone(Color.WHITE);
        this._highlightColor = this._constantColor;

        this._batchDirty = false;
        this._pickCommandsDirty = true;
    }

    var attributeLocations = {
        position : 0,
        a_batchId : 1
    };

    var scratchDecodeMatrix = new Matrix4();
    var scratchEncodedPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchScaledNormal = new Cartesian3();
    var scratchMinHeightPosition = new Cartesian3();
    var scratchMaxHeightPosition = new Cartesian3();
    var scratchBVCartographic = new Cartographic();
    var scratchBVRectangle = new Rectangle();
    var scratchColor = new Color();

    function createVertexArray(primitive, context) {
        if (!defined(primitive._positions)) {
            return;
        }

        var positions = primitive._positions;
        var counts = primitive._counts;
        var indexCounts = primitive._indexCounts;
        var indices = primitive._indices;
        var boundingVolumes = primitive._boundingVolumes;
        var center = primitive._center;
        var ellipsoid = primitive._ellispoid;
        var batchIds = primitive._batchIds;
        var batchTable = primitive._batchTable;

        var minHeight = primitive._minimumHeight;
        var maxHeight = primitive._maximumHeight;

        var quantizedOffset = primitive._quantizedOffset;
        var quantizedScale = primitive._quantizedScale;

        var decodeMatrix;
        if (defined(quantizedOffset) && defined(quantizedScale)) {
            decodeMatrix = Matrix4.fromTranslationRotationScale(new TranslationRotationScale(quantizedOffset, undefined, quantizedScale), scratchDecodeMatrix);
        } else {
            decodeMatrix = Matrix4.IDENTITY;
        }

        var i;
        var j;
        var color;
        var rgba;

        var countsLength = counts.length;
        var offsets = new Array(countsLength);
        var indexOffsets = new Array(countsLength);
        var currentOffset = 0;
        var currentIndexOffset = 0;
        for (i = 0; i < countsLength; ++i) {
            offsets[i] = currentOffset;
            indexOffsets[i] = currentIndexOffset;

            currentOffset += counts[i];
            currentIndexOffset += indexCounts[i];
        }

        var positionsLength = positions.length;
        var batchedPositions = new Float32Array(positionsLength * 2);
        var batchedIds = new Uint16Array(positionsLength / 3 * 2);
        var batchedIndexOffsets = new Array(indexOffsets.length);
        var batchedIndexCounts = new Array(indexCounts.length);
        var batchedIndices = [];

        var colorToBuffers = {};
        for (i = 0; i < countsLength; ++i) {
            color = batchTable.getColor(batchIds[i], scratchColor);
            rgba = color.toRgba();
            if (!defined(colorToBuffers[rgba])) {
                colorToBuffers[rgba] = {
                    positionLength : counts[i],
                    indexLength : indexCounts[i],
                    offset : 0,
                    indexOffset : 0,
                    batchIds : [i]
                };
            } else {
                colorToBuffers[rgba].positionLength += counts[i];
                colorToBuffers[rgba].indexLength += indexCounts[i];
                colorToBuffers[rgba].batchIds.push(i);
            }
        }

        // get the offsets and counts for the positions and indices of each primitive
        var buffer;
        var byColorPositionOffset = 0;
        var byColorIndexOffset = 0;
        for (rgba in colorToBuffers) {
            if (colorToBuffers.hasOwnProperty(rgba)) {
                buffer = colorToBuffers[rgba];
                buffer.offset = byColorPositionOffset;
                buffer.indexOffset = byColorIndexOffset;

                var positionLength = buffer.positionLength * 2;
                var indexLength = buffer.indexLength * 2 + buffer.positionLength * 6;

                byColorPositionOffset += positionLength;
                byColorIndexOffset += indexLength;

                buffer.indexLength = indexLength;
            }
        }

        var batchedDrawCalls = [];

        for (rgba in colorToBuffers) {
            if (colorToBuffers.hasOwnProperty(rgba)) {
                buffer = colorToBuffers[rgba];

                batchedDrawCalls.push({
                    color : Color.fromRgba(parseInt(rgba)),
                    offset : buffer.indexOffset,
                    count : buffer.indexLength,
                    batchIds : buffer.batchIds
                });
            }
        }

        primitive._batchedIndices = batchedDrawCalls;

        for (i = 0; i < countsLength; ++i) {
            color = batchTable.getColor(batchIds[i], scratchColor);
            rgba = color.toRgba();

            buffer = colorToBuffers[rgba];
            var positionOffset = buffer.offset;
            var positionIndex = positionOffset * 3;
            var colorIndex = positionOffset * 4;
            var batchIdIndex = positionOffset;

            var polygonOffset = offsets[i];
            var polygonCount = counts[i];
            var batchId = batchIds[i];

            var minLat = Number.POSITIVE_INFINITY;
            var maxLat = Number.NEGATIVE_INFINITY;
            var minLon = Number.POSITIVE_INFINITY;
            var maxLon = Number.NEGATIVE_INFINITY;

            for (j = 0; j < polygonCount; ++j) {
                var encodedPosition = Cartesian3.unpack(positions, polygonOffset * 3 + j * 3, scratchEncodedPosition);
                var rtcPosition = Matrix4.multiplyByPoint(decodeMatrix, encodedPosition, encodedPosition);
                var position = Cartesian3.add(rtcPosition, center, rtcPosition);

                var carto = ellipsoid.cartesianToCartographic(position, scratchBVCartographic);
                var lat = carto.latitude;
                var lon = carto.longitude;

                minLat = Math.min(lat, minLat);
                maxLat = Math.max(lat, maxLat);
                minLon = Math.min(lon, minLon);
                maxLon = Math.max(lon, maxLon);

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

                batchedIds[batchIdIndex] = batchId;
                batchedIds[batchIdIndex + 1] = batchId;

                positionIndex += 6;
                colorIndex += 8;
                batchIdIndex += 2;
            }

            var rectangle = scratchBVRectangle;
            rectangle.west = minLon;
            rectangle.east = maxLon;
            rectangle.south = minLat;
            rectangle.north = maxLat;

            boundingVolumes[i] = OrientedBoundingBox.fromRectangle(rectangle, minHeight, maxHeight, ellipsoid);

            var indicesIndex = buffer.indexOffset;

            var indexOffset = indexOffsets[i];
            var indexCount = indexCounts[i];

            batchedIndexOffsets[i] = indicesIndex;

            for (j = 0; j < indexCount; j += 3) {
                var i0 = indices[indexOffset + j] - polygonOffset;
                var i1 = indices[indexOffset + j + 1] - polygonOffset;
                var i2 = indices[indexOffset + j + 2] - polygonOffset;

                // triangle on the top of the extruded polygon
                batchedIndices[indicesIndex++] = i0 * 2 + positionOffset;
                batchedIndices[indicesIndex++] = i1 * 2 + positionOffset;
                batchedIndices[indicesIndex++] = i2 * 2 + positionOffset;

                // triangle on the bottom of the extruded polygon
                batchedIndices[indicesIndex++] = i2 * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = i1 * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = i0 * 2 + 1 + positionOffset;
            }

            // indices for the walls of the extruded polygon
            for (j = 0; j < polygonCount - 1; ++j) {
                batchedIndices[indicesIndex++] = j * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = (j + 1) * 2 + positionOffset;
                batchedIndices[indicesIndex++] = j * 2 + positionOffset;

                batchedIndices[indicesIndex++] = j * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = (j + 1) * 2 + 1 + positionOffset;
                batchedIndices[indicesIndex++] = (j + 1) * 2 + positionOffset;
            }

            buffer.offset += polygonCount * 2;
            buffer.indexOffset = indicesIndex;

            batchedIndexCounts[i] = indicesIndex - batchedIndexOffsets[i];
        }

        batchedIndices = new Uint32Array(batchedIndices);

        primitive._positions = undefined;
        primitive._counts = undefined;
        primitive._batchIds = undefined;
        primitive._indices = batchedIndices;
        primitive._indexOffsets = batchedIndexOffsets;
        primitive._indexCounts = batchedIndexCounts;

        for (var m = 0; m < primitive._batchedIndices.length; ++m) {
            var tempIds = primitive._batchedIndices[m].batchIds;
            var count = 0;
            for (var n = 0; n < tempIds.length; ++n) {
                count += batchedIndexCounts[tempIds[n]];
            }
            primitive._batchedIndices[m].count = count;
        }

        var positionBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : batchedPositions,
            usage : BufferUsage.STATIC_DRAW
        });
        var idBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : batchedIds,
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
    }

    function createShaders(primitive, context) {
        if (defined(primitive._sp)) {
            return;
        }

        var batchTable = primitive._batchTable;

        var vsSource = batchTable.getVertexShaderCallback()(ShadowVolumeVS, false);
        var fsSource = batchTable.getFragmentShaderCallback()(ShadowVolumeFS, false);

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

        vsSource = batchTable.getPickVertexShaderCallback()(ShadowVolumeVS);
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

    function copyIndices(indices, newIndices, currentOffset, offsets, counts, batchIds) {
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

    function compareColors(a, b) {
        return b.color.toRgba() - a.color.toRgba();
    }

    // PERFORMANCE_IDEA: For WebGL 2, we can use copyBufferSubData for buffer-to-buffer copies.
    // PERFORMANCE_IDEA: Not supported, but we could use glMultiDrawElements here.
    function rebatchCommands(primitive) {
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

        batchedIndices.sort(compareColors);

        var newIndices = new primitive._indices.constructor(primitive._indices.length);

        var current = batchedIndices.pop();
        var newBatchedIndices = [current];

        var currentOffset = copyIndices(primitive._indices, newIndices, 0, primitive._indexOffsets, primitive._indexCounts, current.batchIds);

        current.offset = 0;
        current.count = currentOffset;

        while (batchedIndices.length > 0) {
            var next = batchedIndices.pop();
            if (Color.equals(next.color, current.color)) {
                currentOffset = copyIndices(primitive._indices, newIndices, currentOffset, primitive._indexOffsets, primitive._indexCounts, next.batchIds);
                current.batchIds = current.batchIds.concat(next.batchIds);
                current.count = currentOffset - current.offset;
            } else {
                var offset = currentOffset;
                currentOffset = copyIndices(primitive._indices, newIndices, currentOffset, primitive._indexOffsets, primitive._indexCounts, next.batchIds);

                next.offset = offset;
                next.count = currentOffset - offset;
                newBatchedIndices.push(next);
                current = next;
            }
        }

        primitive._va.indexBuffer.copyFromArrayView(newIndices);

        primitive._indices = newIndices;
        primitive._batchedIndices = newBatchedIndices;

        primitive._batchDirty = false;
        primitive._pickCommandsDirty = true;
        return true;
    }

    function createColorCommands(primitive) {
        if (defined(primitive._commands) && !rebatchCommands(primitive) && primitive._commands.length / 3 === primitive._batchedIndices.length) {
            return;
        }

        var batchedIndices = primitive._batchedIndices;
        var length = batchedIndices.length * 3;

        var commands = primitive._commands;
        commands.length = length;

        var vertexArray = primitive._va;
        var uniformMap = primitive._batchTable.getUniformMapCallback()(primitive._uniformMap);
        var bv = primitive._boundingVolume;

        for (var j = 0; j < length; j += 3) {
            var offset = batchedIndices[j / 3].offset;
            var count = batchedIndices[j / 3].count;

            // stencil preload command
            var command = commands[j];
            if (!defined(command)) {
                command = commands[j] = new DrawCommand({
                    owner : primitive
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = primitive._rsStencilPreloadPass;
            command.shaderProgram = primitive._sp;
            command.uniformMap = uniformMap;
            command.boundingVolume = bv;
            command.pass = Pass.GROUND;

            // stencil depth command
            command = commands[j + 1];
            if (!defined(command)) {
                command = commands[j + 1] = new DrawCommand({
                    owner : primitive
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = primitive._rsStencilDepthPass;
            command.shaderProgram = primitive._sp;
            command.uniformMap = uniformMap;
            command.boundingVolume = bv;
            command.pass = Pass.GROUND;

            // color command
            command = commands[j + 2];
            if (!defined(command)) {
                command = commands[j + 2] = new DrawCommand({
                    owner : primitive
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = primitive._rsColorPass;
            command.shaderProgram = primitive._sp;
            command.uniformMap = uniformMap;
            command.boundingVolume = bv;
            command.pass = Pass.GROUND;
        }
    }

    function createPickCommands(primitive) {
        if (!primitive._pickCommandsDirty) {
            return;
        }

        var length = primitive._indexOffsets.length * 3;
        var pickCommands = primitive._pickCommands;
        pickCommands.length = length;

        var vertexArray = primitive._va;
        var uniformMap = primitive._batchTable.getPickUniformMapCallback()(primitive._uniformMap);

        for (var j = 0; j < length; j += 3) {
            var offset = primitive._indexOffsets[j / 3];
            var count = primitive._indexCounts[j / 3];
            var bv = primitive._boundingVolumes[j / 3];

            // stencil preload command
            var command = pickCommands[j];
            if (!defined(command)) {
                command = pickCommands[j] = new DrawCommand({
                    owner : primitive
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = primitive._rsStencilPreloadPass;
            command.shaderProgram = primitive._sp;
            command.uniformMap = uniformMap;
            command.boundingVolume = bv;
            command.pass = Pass.GROUND;

            // stencil depth command
            command = pickCommands[j + 1];
            if (!defined(command)) {
                command = pickCommands[j + 1] = new DrawCommand({
                    owner : primitive
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = primitive._rsStencilDepthPass;
            command.shaderProgram = primitive._sp;
            command.uniformMap = uniformMap;
            command.boundingVolume = bv;
            command.pass = Pass.GROUND;

            // color command
            command = pickCommands[j + 2];
            if (!defined(command)) {
                command = pickCommands[j + 2] = new DrawCommand({
                    owner : primitive
                });
            }

            command.vertexArray = vertexArray;
            command.offset = offset;
            command.count = count;
            command.renderState = primitive._rsPickPass;
            command.shaderProgram = primitive._spPick;
            command.uniformMap = uniformMap;
            command.boundingVolume = bv;
            command.pass = Pass.GROUND;
        }

        primitive._pickCommandsDirty = false;
    }

    /**
     * Colors the entire tile when enabled is true. The resulting color will be (polygon batch table color * color).
     * @private
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
     * @private
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
            color : color,
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
                color : batchedIndices[i].color,
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
     * Updates the batches and queues the commands for rendering
     * @private
     *
     * @param {FrameState} frameState The current frame state.
     */
    GroundPrimitiveBatch.prototype.update = function(frameState) {
        var context = frameState.context;

        createVertexArray(this, context);
        createShaders(this, context);
        createRenderStates(this);
        createUniformMap(this, context);

        var passes = frameState.passes;
        if (passes.render) {
            createColorCommands(this);
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
     * @private
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
     * @private
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    GroundPrimitiveBatch.prototype.destroy = function() {
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.destroy();
        this._spPick = this._spPick && this._spPick.destroy();
        return destroyObject(this);
    };

    return GroundPrimitiveBatch;
});
