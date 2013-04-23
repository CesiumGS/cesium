/*global define*/
define([
        '../Core/destroyObject',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Renderer/RenderbufferFormat',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/PixelFormat',
        '../Renderer/PixelDatatype',
        '../Renderer/DrawCommand'
    ], function(
        destroyObject,
        ComponentDatatype,
        PrimitiveType,
        RenderbufferFormat,
        BufferUsage,
        BlendingState,
        PixelFormat,
        PixelDatatype,
        DrawCommand) {
    "use strict";

    /**
     * @private
     */
    var PostProcessEngine = function() {
        this._frameBuffer = undefined;
        this._command = undefined;
    };

    var attributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

// TODO: this is duplicate with ViewportQuad.js
    function getVertexArray(context) {
        // Per-context cache for viewport quads
        var vertexArray = context.cache.viewportQuad_vertexArray;

        if (typeof vertexArray !== 'undefined') {
            return vertexArray;
        }

        var mesh = {
            attributes : {
                position : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                       -1.0, -1.0,
                        1.0, -1.0,
                        1.0,  1.0,
                       -1.0,  1.0
                    ]
                },

                textureCoordinates : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ]
                }
            }
        };

        vertexArray = context.createVertexArrayFromMesh({
            mesh : mesh,
            attributeIndices : attributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        context.cache.viewportQuad_vertexArray = vertexArray;
        return vertexArray;
    }

    PostProcessEngine.prototype.update = function(context, filters) {
        var fb = this._postProcessFrameBuffer;

        if ((typeof filters !== 'undefined') && (filters.length > 0)) {
            var width = context.getCanvas().clientWidth;
            var height = context.getCanvas().clientHeight;

            // Create framebuffer if it doesn't exist or the canvas changed size
            if ((typeof fb === 'undefined') ||
                (fb.getColorTexture().getWidth() !== width) ||
                (fb.getColorTexture().getHeight() !== height)) {

                fb = fb && fb.destroy();

                var colorTexture = context.createTexture2D({
                    width : width,
                    height : height
                });

                if (context.getDepthTexture()) {
// TODO: test this in Canary
// TODO: provide named access to depth texture
                    fb = context.createFramebuffer({
                        colorTexture : colorTexture,
                        depthTexture : context.createTexture2D({
                            width : width,
                            height : height,
                            pixelFormat : PixelFormat.DEPTH_COMPONENT,
                            pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                        })
                    });
                } else {
                    fb = context.createFramebuffer({
                        colorTexture : colorTexture,
                        depthRenderbuffer : context.createRenderbuffer({
                            format : RenderbufferFormat.DEPTH_COMPONENT16
                        })
                    });
                }
            }

            var command = this._command;
            if (typeof command === 'undefined') {
// TODO: allow custom scissor test.  Custom viewport?
// TODO: render to framebuffer and ping-pong
                command = new DrawCommand();
                command.primitiveType = PrimitiveType.TRIANGLE_FAN;
                command.vertexArray = getVertexArray(context);
                command.renderState = context.createRenderState({
                    blending : BlendingState.ALPHA_BLEND,
                });

                this._command = command;
            }

            var length = filters.length;
            for (var i = 0; i < length; ++i) {
                filters[i].update(context);
            }
        } else  {
            fb = fb && fb.destroy();
        }

        this._postProcessFrameBuffer = fb;
    };

    PostProcessEngine.prototype.executeCommands = function(context, passState, filters) {
        var command = this._command;

        var length = filters.length;
        for (var i = 0; i < length; ++i) {
            var filter = filters[i];
            command.shaderProgram = filter.shaderProgram;
            command.uniformMap = filter.uniformMap;
            command.execute(context, passState);
        }
    };

    PostProcessEngine.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessEngine.prototype.destroy = function() {
        this._frameBuffer = this._frameBuffer && this._frameBuffer.destroy();

        return destroyObject(this);
    };

    return PostProcessEngine;
});
