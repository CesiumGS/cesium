/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Represents a command to the renderer for drawing.
     *
     * @alias Command
     * @constructor
     */
    var DrawCommand = function() {
        /**
         * The bounding volume of the geometry.
         * @type DOC_TBA
         */
        this.boundingVolume = undefined;

        /**
         * The transformation from the geometry in model space to world space.
         * @type Matrix4
         */
        this.modelMatrix = undefined;

        /**
         * The type of geometry in the vertex array.
         * @type PrimitiveType
         */
        this.primitiveType = undefined;

        /**
         * The vertex array.
         * @type VertexArray
         */
        this.vertexArray = undefined;

        /**
         * The number of vertices to draw in the vertex array.
         * @type Number
         */
        this.count = undefined;

        /**
         * The offset to start drawing in the vertex array.
         * @type Number
         */
        this.offset = undefined;

        /**
         * The shader program to apply.
         * @type ShaderProgram
         */
        this.shaderProgram = undefined;

        /**
         * An object with functions whose names match the uniforms in the shader program
         * and return values to set those uniforms.
         * @type Object
         */
        this.uniformMap = undefined;

        /**
         * The render state.
         * @type Object
         *
         * @see Context#createRenderState
         */
        this.renderState = undefined;

        /**
         * The framebuffer to draw to.
         * @type Framebuffer
         */
        this.framebuffer = undefined;
    };

    /**
     * Executes the draw command.
     *
     * @memberof DrawCommand
     *
     * @param {Context} context The renderer context in which to draw.
     * @param {Framebuffer} [framebuffer] The framebuffer to which to draw if one is not specified by the command.
     */
    DrawCommand.prototype.execute = function(context, framebuffer) {
        context.draw(this, framebuffer);
    };

    return DrawCommand;
});