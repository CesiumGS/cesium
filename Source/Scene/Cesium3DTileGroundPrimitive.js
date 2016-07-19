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
        this._indices = options.indices;
        this._decodeMatrix = options.decodeMatrix;

        this._ellispoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._minimumHeight = options.minimumHeight;
        this._maximumHeight = options.maximumHeight;
        this._center = options.center;
        this._color = options.color;

        this._va = undefined;
        this._sp = undefined;

        this._rsStencilPreloadPass = undefined;
        this._rsStencilDepthPass = undefined;
        this._rsColorPass = undefined;
        this._rsPickPass = undefined;

        this._stencilPreloadCommand = undefined;
        this._stencilDepthCommand = undefined;
        this._colorCommand = undefined;
    }

    var attributeLocations = {
        position : 0,
        color : 1
    };

    function createVertexArray(primitive, context) {
        if (!defined(primitive._positions)) {
            return;
        }

        var positions = primitive._positions;
        var offsets = primitive._offsets;
        var counts = primitive._counts;
        var indices = primitive._indices;
        var decodeMatrix = primitive._decodeMatrix;
        var center = primitive._center;
        var ellipsoid = primitive._ellispoid;
        var color = primitive._color;

        var positionsLength = positions.length;
        var colorsLength = positionsLength / 3 * 4;
        var extrudedPositions = new Float32Array(positionsLength * 2.0);
        var colors = new Uint8Array(colorsLength * 2);
        var positionIndex = 0;
        var colorIndex = 0;

        var minHeight = primitive._minimumHeight;
        var maxHeight = primitive._maximumHeight;

        var i;
        for (i = 0; i < positionsLength; i += 3) {
            var encodedPosition = Cartesian3.unpack(positions, i);
            var rtcPosition = Matrix4.multiplyByPoint(decodeMatrix, encodedPosition, encodedPosition);
            var position = Cartesian3.add(rtcPosition, center, rtcPosition);

            var normal = ellipsoid.geodeticSurfaceNormal(position);
            var scaledPosition = ellipsoid.scaleToGeodeticSurface(position);
            var scaledNormal = Cartesian3.multiplyByScalar(normal, minHeight, new Cartesian3());
            var minHeightPosition = Cartesian3.add(scaledPosition, scaledNormal, new Cartesian3());

            scaledNormal = Cartesian3.multiplyByScalar(normal, maxHeight, new Cartesian3());
            var maxHeightPosition = Cartesian3.add(scaledPosition, scaledNormal, new Cartesian3());

            Cartesian3.subtract(maxHeightPosition, center, maxHeightPosition);
            Cartesian3.subtract(minHeightPosition, center, minHeightPosition);

            Cartesian3.pack(maxHeightPosition, extrudedPositions, positionIndex);
            Cartesian3.pack(minHeightPosition, extrudedPositions, positionIndex + positionsLength);

            colors[colorIndex] = Color.floatToByte(color.red);
            colors[colorIndex + 1] = Color.floatToByte(color.green);
            colors[colorIndex + 2] = Color.floatToByte(color.blue);
            colors[colorIndex + 3] = Color.floatToByte(color.alpha);

            colors[colorIndex + colorsLength] = Color.floatToByte(color.red);
            colors[colorIndex + 1 + colorsLength] = Color.floatToByte(color.green);
            colors[colorIndex + 2 + colorsLength] = Color.floatToByte(color.blue);
            colors[colorIndex + 3 + colorsLength] = Color.floatToByte(color.alpha);

            positionIndex += 3;
            colorIndex += 4;
        }

        var positionIndicesLength = positions.length / 3;
        var wallIndicesLength = positions.length / 3 * 6;
        var indicesLength = indices.length;
        var extrudedIndices = new Uint32Array(indicesLength * 2 + wallIndicesLength);

        for (i = 0; i < indicesLength; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            extrudedIndices[i]     = i0;
            extrudedIndices[i + 1] = i1;
            extrudedIndices[i + 2] = i2;

            extrudedIndices[i + indicesLength]     = i2 + positionIndicesLength;
            extrudedIndices[i + 1 + indicesLength] = i1 + positionIndicesLength;
            extrudedIndices[i + 2 + indicesLength] = i0 + positionIndicesLength;
        }

        var indicesIndex = indicesLength * 2;
        var length = offsets.length;

        for (i = 0; i < length; ++i) {
            var offset = offsets[i];
            var count = counts[i];

            for (var j = 0; j < count - 1; ++j) {
                extrudedIndices[indicesIndex++] = positionIndicesLength + offset + j;
                extrudedIndices[indicesIndex++] = offset + j + 1;
                extrudedIndices[indicesIndex++] = offset + j;

                extrudedIndices[indicesIndex++] = positionIndicesLength + offset + j;
                extrudedIndices[indicesIndex++] = positionIndicesLength + offset + j + 1;
                extrudedIndices[indicesIndex++] = offset + j + 1;
            }
        }

        primitive._positions = undefined;
        primitive._offsets = undefined;
        primitive._counts = undefined;
        primitive._decodeMatrix = undefined;

        var positionBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : extrudedPositions,
            usage : BufferUsage.STATIC_DRAW
        });
        var colorBuffer = Buffer.createVertexBuffer({
            context : context,
            typedArray : colors,
            usage : BufferUsage.STATIC_DRAW
        });
        var indexBuffer = Buffer.createIndexBuffer({
            context : context,
            typedArray : extrudedIndices,
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

    function createColorCommands(primitive, context) {
        if (defined(primitive._stencilPreloadCommand)) {
            return;
        }

        // stencil preload command
        var command = new DrawCommand({
            owner : primitive,
            primitiveType : PrimitiveType.TRIANGLES,
            vertexArray : primitive._va,
            shaderProgram : primitive._sp,
            uniformMap : primitive._uniformMap,
            modelMatrix : Matrix4.IDENTITY,
            pass : Pass.GROUND
        });

        primitive._stencilPreloadCommand = command;
        primitive._stencilDepthCommand = DrawCommand.shallowClone(command);
        primitive._colorCommand = DrawCommand.shallowClone(command);

        primitive._stencilPreloadCommand.renderState = primitive._rsStencilPreloadPass;
        primitive._stencilDepthCommand.renderState = primitive._rsStencilDepthPass;
        primitive._colorCommand.renderState = primitive._rsColorPass;
    }

    Cesium3DTileGroundPrimitive.prototype.update = function(frameState) {
        var context = frameState.context;

        createVertexArray(this, context);
        createShaders(this, context);
        createRenderStates(this);
        createUniformMap(this, context);
        createColorCommands(this, context);

        var passes = frameState.passes;
        if (passes.render) {
            frameState.commandList.push(this._stencilPreloadCommand, this._stencilDepthCommand, this._colorCommand);
        }
    };

    Cesium3DTileGroundPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    Cesium3DTileGroundPrimitive.prototype.destroy = function() {
        // TODO
        return destroyObject(this);
    };

    return Cesium3DTileGroundPrimitive;
});
