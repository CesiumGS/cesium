/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/PrimitiveType',
        '../Shaders/ViewportQuadVS',
        './BufferUsage',
        './ClearCommand',
        './DrawCommand',
        './Framebuffer',
        './RenderState',
        './ShaderProgram',
        './VertexArray'
    ], function(
        BoundingRectangle,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Geometry,
        GeometryAttribute,
        PrimitiveType,
        ViewportQuadVS,
        BufferUsage,
        ClearCommand,
        DrawCommand,
        Framebuffer,
        RenderState,
        ShaderProgram,
        VertexArray) {
    "use strict";

    /**
     * @private
     */
    var ComputeEngine = function(context) {
        this._context = context;
        this._viewportQuadVertexArray = undefined;
    };

    var viewportQuadAttributeLocations = {
        position : 0,
        textureCoordinates : 1
    };
    var renderStateScratch;
    var drawCommandScratch = new DrawCommand({
        primitiveType : PrimitiveType.TRIANGLES
    });
    var clearCommandScratch = new ClearCommand({
        color : new Color(0.0, 0.0, 0.0, 0.0)
    });

    function getViewportQuadVertexArray(computeEngine) {
        var vertexArray = computeEngine._viewportQuadVertexArray;

        if (!defined(vertexArray)) {
            var geometry = new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : [
                            -1.0, -1.0,
                            1.0, -1.0,
                            1.0,  1.0,
                            -1.0,  1.0
                        ]
                    }),

                    textureCoordinates : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : [
                            0.0, 0.0,
                            1.0, 0.0,
                            1.0, 1.0,
                            0.0, 1.0
                        ]
                    })
                },
                // Workaround Internet Explorer 11.0.8 lack of TRIANGLE_FAN
                indices : new Uint16Array([0, 1, 2, 0, 2, 3]),
                primitiveType : PrimitiveType.TRIANGLES
            });

            vertexArray = VertexArray.fromGeometry({
                context : computeEngine._context,
                geometry : geometry,
                attributeLocations : viewportQuadAttributeLocations,
                bufferUsage : BufferUsage.STATIC_DRAW,
                interleave : true
            });

            computeEngine._viewportQuadVertexArray = vertexArray;
        }

        return vertexArray;
    }

    function createFramebuffer(context, outputTexture) {
        var fbo = new Framebuffer({
            context : context,
            colorTextures : [outputTexture],
            destroyAttachments : false
        });
        return fbo;
    }

    function createViewportQuadShader(context, fragmentShaderSource) {
        return ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : ViewportQuadVS,
            fragmentShaderSource : fragmentShaderSource,
            attributeLocations : viewportQuadAttributeLocations
        });
    }

    function createRenderState(width, height) {
        if ((!defined(renderStateScratch)) ||
            (renderStateScratch.viewport.width !== width) ||
            (renderStateScratch.viewport.height !== height)) {

            renderStateScratch = RenderState.fromCache({
                viewport : new BoundingRectangle(0, 0, width, height)
            });
        }
        return renderStateScratch;
    }

    ComputeEngine.prototype.execute = function(computeCommand) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(computeCommand)) {
            throw new DeveloperError('computeCommand is required.');
        }
        //>>includeEnd('debug');

        if (defined(computeCommand.preExecute)) {
            computeCommand.preExecute(computeCommand);
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(computeCommand.fragmentShaderSource) && !defined(computeCommand.shaderProgram)) {
            throw new DeveloperError('computeCommand.fragmentShaderSource or computeCommand.shaderProgram is required.');
        }

        if (!defined(computeCommand.outputTexture)) {
            throw new DeveloperError('computeCommand.outputTexture is required.');
        }
        //>>includeEnd('debug');

        var outputTexture = computeCommand.outputTexture;
        var width = outputTexture.width;
        var height = outputTexture.height;

        var context = this._context;
        var vertexArray = defined(computeCommand.vertexArray) ? computeCommand.vertexArray : getViewportQuadVertexArray(this);
        var shaderProgram = defined(computeCommand.shaderProgram) ? computeCommand.shaderProgram : createViewportQuadShader(context, computeCommand.fragmentShaderSource);
        var framebuffer = createFramebuffer(context, outputTexture);
        var renderState = createRenderState(width, height);
        var uniformMap = computeCommand.uniformMap;

        var clearCommand = clearCommandScratch;
        clearCommand.framebuffer = framebuffer;
        clearCommand.renderState = renderState;
        clearCommand.execute(context);

        var drawCommand = drawCommandScratch;
        drawCommand.vertexArray = vertexArray;
        drawCommand.renderState = renderState;
        drawCommand.shaderProgram = shaderProgram;
        drawCommand.uniformMap = uniformMap;
        drawCommand.framebuffer = framebuffer;
        drawCommand.execute(context);

        framebuffer.destroy();

        if (!computeCommand.persists) {
            shaderProgram.destroy();
            if (defined(computeCommand.vertexArray)) {
                vertexArray.destroy();
            }
        }

        if (defined(computeCommand.postExecute)) {
            computeCommand.postExecute(outputTexture);
        }
    };

    ComputeEngine.prototype.isDestroyed = function() {
        return false;
    };

    ComputeEngine.prototype.destroy = function() {
        this._viewportQuadVertexArray = this._viewportQuadVertexArray && this._viewportQuadVertexArray.destroy();
        return destroyObject(this);
    };

    return ComputeEngine;
});
