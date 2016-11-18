/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/IndexDatatype',
        '../Core/Matrix4',
        '../Core/TranslationRotationScale',
        '../Renderer/Buffer',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArray',
        '../Shaders/GroundPolylineBatchVS',
        '../Shaders/PolylineCommon',
        './BlendingState',
        './Pass'
    ], function(
        Cartesian3,
        Color,
        ComponentDatatype,
        defined,
        destroyObject,
        IndexDatatype,
        Matrix4,
        TranslationRotationScale,
        Buffer,
        BufferUsage,
        DrawCommand,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArray,
        GroundPolylineBatchVS,
        PolylineCommon,
        BlendingState,
        Pass) {
    'use strict';

    /**
     * Renders a batch of polylines that have been subdivided to be draped on terrain.
     *
     * @alias GroundPolylineBatch
     * @constructor
     *
     * @param {Object} options An object with following properties:
     * @param {Float32Array|Uint16Array} options.positions The positions of the polylines
     * @param {Number[]} options.counts The number or positions in the each polyline.
     * @param {Number[]} options.widths The width of each polyline.
     * @param {Cartesian3} [options.center=Cartesian3.ZERO] The RTC center.
     * @param {Number} [options.quantizedOffset] The quantized offset. If undefined, the positions should be in Float32Array and are not quantized.
     * @param {Number} [options.quantizedScale] The quantized scale. If undefined, the positions should be in Float32Array and are not quantized.
     * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched polylines.
     * @param {Number[]} options.batchIds The batch ids for each polyline.
     * @param {BoundingSphere} options.boundingVolume The bounding volume for the entire batch of polylines.
     *
     * @private
     */
    function GroundPolylineBatch(options) {
        // these arrays are all released after the first update.
        this._positions = options.positions;
        this._widths = options.widths;
        this._counts = options.counts;
        this._batchIds = options.batchIds;

        this._center = options.center;
        this._quantizedOffset = options.quantizedOffset;
        this._quantizedScale = options.quantizedScale;

        this._boundingVolume = options.boundingVolume;
        this._batchTable = options.batchTable;

        this._va = undefined;
        this._sp = undefined;
        this._rs = undefined;
        this._uniformMap = undefined;
        this._command = undefined;

        this._spPick = undefined;
        this._rsPick = undefined;
        this._pickCommand = undefined;

        this._constantColor = Color.clone(Color.WHITE);
        this._highlightColor = this._constantColor;
    }

    var attributeLocations = {
        previousPosition : 0,
        currentPosition : 1,
        nextPosition : 2,
        expandAndWidth : 3,
        a_batchId : 4
    };

    function decodePosition(positions, index, decodeMatrix, center, result) {
        var encodedPosition = Cartesian3.unpack(positions, index, result);
        var rtcPosition = Matrix4.multiplyByPoint(decodeMatrix, encodedPosition, encodedPosition);
        return Cartesian3.add(rtcPosition, center, rtcPosition);
    }

    var scratchDecodeMatrix = new Matrix4();
    var scratchP0 = new Cartesian3();
    var scratchP1 = new Cartesian3();
    var scratchPrev = new Cartesian3();
    var scratchCur = new Cartesian3();
    var scratchNext = new Cartesian3();

    function createVertexArray(primitive, context) {
        if (defined(primitive._va)) {
            return;
        }

        var positions = primitive._positions;
        var widths = primitive._widths;
        var ids = primitive._batchIds;
        var counts = primitive._counts;

        var positionsLength = positions.length / 3;
        var size = positionsLength * 4 - 4;

        var curPositions = new Float32Array(size * 3);
        var prevPositions = new Float32Array(size * 3);
        var nextPositions = new Float32Array(size * 3);
        var expandAndWidth = new Float32Array(size * 2);
        var batchIds = new Uint16Array(size);

        var positionIndex = 0;
        var expandAndWidthIndex = 0;
        var batchIdIndex = 0;

        var center = primitive._center;
        var quantizedOffset = primitive._quantizedOffset;
        var quantizedScale = primitive._quantizedScale;

        var decodeMatrix;
        if (defined(quantizedOffset) && defined(quantizedScale)) {
            decodeMatrix = Matrix4.fromTranslationRotationScale(new TranslationRotationScale(quantizedOffset, undefined, quantizedScale), scratchDecodeMatrix);
        } else {
            decodeMatrix = Matrix4.IDENTITY;
        }

        var i;
        var offset = 0;
        var length = counts.length;

        for (i = 0; i < length; ++i) {
            var count = counts [i];
            var width = widths[i];
            var id = ids[i];

            for (var j = 0; j < count; ++j) {
                var previous;
                if (j === 0) {
                    var p0 = decodePosition(positions, offset * 3, decodeMatrix, center, scratchP0);
                    var p1 = decodePosition(positions, (offset + 1) * 3, decodeMatrix, center, scratchP1);

                    previous = Cartesian3.subtract(p0, p1, scratchPrev);
                    Cartesian3.add(p0, previous, previous);
                } else {
                    previous = decodePosition(positions, (offset + j - 1) * 3, decodeMatrix, center, scratchPrev);
                }

                var current = decodePosition(positions, (offset + j) * 3, decodeMatrix, center, scratchCur);

                var next;
                if (j === count - 1) {
                    var p2 = decodePosition(positions, (offset + count - 1) * 3, decodeMatrix, center, scratchP0);
                    var p3 = decodePosition(positions, (offset + count - 2) * 3, decodeMatrix, center, scratchP1);

                    next = Cartesian3.subtract(p2, p3, scratchNext);
                    Cartesian3.add(p2, next, next);
                } else {
                    next = decodePosition(positions, (offset + j + 1) * 3, decodeMatrix, center, scratchNext);
                }

                Cartesian3.subtract(previous, center, previous);
                Cartesian3.subtract(current, center, current);
                Cartesian3.subtract(next, center, next);

                var startK = j === 0 ? 2 : 0;
                var endK = j === count - 1 ? 2 : 4;

                for (var k = startK; k < endK; ++k) {
                    Cartesian3.pack(current, curPositions, positionIndex);
                    Cartesian3.pack(previous, prevPositions, positionIndex);
                    Cartesian3.pack(next, nextPositions, positionIndex);
                    positionIndex += 3;

                    var direction = (k - 2 < 0) ? -1.0 : 1.0;
                    expandAndWidth[expandAndWidthIndex++] = 2 * (k % 2) - 1;
                    expandAndWidth[expandAndWidthIndex++] = direction * width;

                    batchIds[batchIdIndex++] = id;
                }
            }

            offset += count;
        }

        primitive._positions = undefined;
        primitive._widths = undefined;
        primitive._batchIds = undefined;
        primitive._counts = undefined;

        var indices = IndexDatatype.createTypedArray(size, positionsLength * 6 - 6);
        var index = 0;
        var indicesIndex = 0;
        length = positionsLength - 1;
        for (i = 0; i < length; ++i) {
            indices[indicesIndex++] = index;
            indices[indicesIndex++] = index + 2;
            indices[indicesIndex++] = index + 1;

            indices[indicesIndex++] = index + 1;
            indices[indicesIndex++] = index + 2;
            indices[indicesIndex++] = index + 3;

            index += 4;
        }

        var prevPositionBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : prevPositions,
            usage : BufferUsage.STATIC_DRAW
        });
        var curPositionBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : curPositions,
            usage : BufferUsage.STATIC_DRAW
        });
        var nextPositionBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : nextPositions,
            usage : BufferUsage.STATIC_DRAW
        });
        var expandAndWidthBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : expandAndWidth,
            usage : BufferUsage.STATIC_DRAW
        });
        var idBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : batchIds,
            usage : BufferUsage.STATIC_DRAW
        });

        var indexBuffer = Buffer.createIndexBuffer({
            context : context,
            typedArray : indices,
            usage : BufferUsage.STATIC_DRAW,
            indexDatatype : (indices.BYTES_PER_ELEMENT === 2) ?  IndexDatatype.UNSIGNED_SHORT : IndexDatatype.UNSIGNED_INT
        });

        var vertexAttributes = [{
            index : attributeLocations.previousPosition,
            vertexBuffer : prevPositionBuffer,
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3
        }, {
            index : attributeLocations.currentPosition,
            vertexBuffer : curPositionBuffer,
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3
        }, {
            index : attributeLocations.nextPosition,
            vertexBuffer : nextPositionBuffer,
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3
        }, {
            index : attributeLocations.expandAndWidth,
            vertexBuffer : expandAndWidthBuffer,
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 2
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

    var modifiedModelViewScratch = new Matrix4();
    var rtcScratch = new Cartesian3();

    function createUniformMap(primitive, context) {
        if (defined(primitive._uniformMap)) {
            return;
        }

        primitive._uniformMap = {
            u_modifiedModelView : function() {
                var viewMatrix = context.uniformState.view;
                Matrix4.clone(viewMatrix, modifiedModelViewScratch);
                Matrix4.multiplyByPoint(modifiedModelViewScratch, primitive._center, rtcScratch);
                Matrix4.setTranslation(modifiedModelViewScratch, rtcScratch, modifiedModelViewScratch);
                return modifiedModelViewScratch;
            },
            u_highlightColor : function() {
                return primitive._highlightColor;
            }
        };
    }

    function createRenderStates(primitive) {
        if (defined(primitive._rs)) {
            return;
        }

        var polygonOffset = {
            enabled : true,
            factor : -5.0,
            units : -5.0
        };

        primitive._rs = RenderState.fromCache({
            blending : BlendingState.ALPHA_BLEND,
            depthMask : false,
            depthTest : {
                enabled : true
            },
            polygonOffset : polygonOffset
        });

        primitive._rsPick = RenderState.fromCache({
            depthMask : false,
            depthTest : {
                enabled : true
            },
            polygonOffset : polygonOffset
        });
    }

    var PolylineFS =
        'uniform vec4 u_highlightColor; \n' +
        'void main()\n' +
        '{\n' +
        '    gl_FragColor = u_highlightColor;\n' +
        '}\n';

    function createShaders(primitive, context) {
        if (defined(primitive._sp)) {
            return;
        }

        var batchTable = primitive._batchTable;

        var vsSource = batchTable.getVertexShaderCallback(false, 'a_batchId')(GroundPolylineBatchVS);
        var fsSource = batchTable.getFragmentShaderCallback()(PolylineFS);

        var vs = new ShaderSource({
            defines : ['VECTOR_TILE'],
            sources : [PolylineCommon, vsSource]
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

        vsSource = batchTable.getPickVertexShaderCallback('a_batchId')(GroundPolylineBatchVS);
        fsSource = batchTable.getPickFragmentShaderCallback()(PolylineFS);

        var pickVS = new ShaderSource({
            defines : ['VECTOR_TILE'],
            sources : [PolylineCommon, vsSource]
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

    function queueCommands(primitive, frameState) {
        if (!defined(primitive._command)) {
            var uniformMap = primitive._batchTable.getUniformMapCallback()(primitive._uniformMap);
            primitive._command = new DrawCommand({
                owner : primitive,
                vertexArray : primitive._va,
                renderState : primitive._rs,
                shaderProgram : primitive._sp,
                uniformMap : uniformMap,
                boundingVolume : primitive._boundingVolume,
                //pass : Pass.GROUND
                pass : Pass.TRANSLUCENT
            });
        }

        frameState.commandList.push(primitive._command);
    }

    function queuePickCommands(primitive, frameState) {
        if (!defined(primitive._pickCommand)) {
            var uniformMap = primitive._batchTable.getPickUniformMapCallback()(primitive._uniformMap);
            primitive._pickCommand = new DrawCommand({
                owner : primitive,
                vertexArray : primitive._va,
                renderState : primitive._rsPick,
                shaderProgram : primitive._spPick,
                uniformMap : uniformMap,
                boundingVolume : primitive._boundingVolume,
                //pass : Pass.GROUND
                pass : Pass.TRANSLUCENT
            });
        }

        frameState.commandList.push(primitive._pickCommand);
    }

    /**
     * Colors the entire tile when enabled is true. The resulting color will be (polyline batch table color * color).
     *
     * @param {Boolean} enabled Whether to enable debug coloring.
     * @param {Color} color The debug color.
     */
    GroundPolylineBatch.prototype.applyDebugSettings = function(enabled, color) {
        this._highlightColor = enabled ? color : this._constantColor;
    };

    /**
     * Updates the batches and queues the commands for rendering.
     *
     * @param {FrameState} frameState The current frame state.
     */
    GroundPolylineBatch.prototype.update = function(frameState) {
        var context = frameState.context;

        createVertexArray(this, context);
        createUniformMap(this, context);
        createShaders(this, context);
        createRenderStates(this);

        var passes = frameState.passes;
        if (passes.render) {
            queueCommands(this, frameState);
        }

        if (passes.pick) {
            queuePickCommands(this, frameState);
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
    GroundPolylineBatch.prototype.isDestroyed = function() {
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
    GroundPolylineBatch.prototype.destroy = function() {
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.destroy();
        this._spPick = this._spPick && this._spPick.destroy();
        return destroyObject(this);
    };

    return GroundPolylineBatch;
});