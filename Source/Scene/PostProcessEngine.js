/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Cartesian2',
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
        Cartesian2,
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
        this.framebuffer = undefined;
        this._colorStep = new Cartesian2();
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
        var fb = this.framebuffer;

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

                this._colorStep.x = 1.0 / fb.getColorTexture().getWidth();
                this._colorStep.y = 1.0 / fb.getColorTexture().getHeight();
            }

            var command = this._command;
            if (typeof command === 'undefined') {
                var that = this;

// TODO: allow custom scissor test.  Custom viewport?
// TODO: render to framebuffer and ping-pong
                command = new DrawCommand();
                command.primitiveType = PrimitiveType.TRIANGLE_FAN;
                command.vertexArray = getVertexArray(context);
                command.renderState = context.createRenderState({
                    blending : BlendingState.ALPHA_BLEND,
                });
                command.uniformMap = {
// TODO: use semantics in Touch Up to access color/depth textures
                    czm_color : function() {
                        return that.framebuffer.getColorTexture();
                    },

                    czm_colorStep : function() {
                        return that._colorStep;
                    }
                };

                this._command = command;
            }

            var length = filters.length;
            for (var i = 0; i < length; ++i) {
                filters[i].update(context);
            }
        } else  {
            fb = fb && fb.destroy();
        }

        this.framebuffer = fb;
    };

    PostProcessEngine.prototype.executeCommands = function(context, passState, filters) {
        var command = this._command;

        var length = filters.length;
        for (var i = 0; i < length; ++i) {
            var filter = filters[i];
            command.shaderProgram = filter.shaderProgram;
            command.execute(context, passState);
        }
    };

    PostProcessEngine.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessEngine.prototype.destroy = function() {
        this.framebuffer = this.framebuffer && this.framebuffer.destroy();

        return destroyObject(this);
    };

    return PostProcessEngine;
});
