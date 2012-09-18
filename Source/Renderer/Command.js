/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * Represents a command to the renderer for drawing.
     *
     * @alias Command
     * @constructor
     */
    var Command = function() {
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
     * Clone only the properties of command that are passed to the draw function.
     *
     * @param Command command The command to clone.
     * @param Command [result] Clone command to result or create a new command if undefined.
     * @return Command A clone of command stored in result or a new command if result is undefined.
     *
     * @exception DeveloperError command is required.
     *
     * @see Context#draw
     * @see Context#beginDraw
     * @see Context#continueDraw
     * @see Context#endDraw
     */
    Command.cloneDrawArguments = function(command, result) {
        if (typeof command === 'undefined') {
            throw new DeveloperError('command is required.');
        }

        if (typeof result === 'undefined') {
            result = new Command();
        }

        result.primitiveType = command.primitiveType;
        result.vertexArray = command.vertexArray;
        result.count = command.count;
        result.offset = command.offset;
        result.shaderProgram = command.shaderProgram;
        result.uniformMap = command.uniformMap;
        result.renderState = command.renderState;
        result.framebuffer = command.framebuffer;
        return result;
    };

    /**
     * Clones a command.
     *
     * @param Command command The command to clone.
     * @param Command [result] Clone command to result or create a new command if undefined.
     * @return Command A clone of command stored in result or a new command if result is undefined.
     *
     * @exception DeveloperError command is required.
     */
    Command.clone = function(command, result) {
        if (typeof command === 'undefined') {
            throw new DeveloperError('command is required.');
        }

        result = Command.cloneDrawArguments(command, result);
        if (typeof result === 'undefined') {
            result = new Command();
        }

        result.boundingVolume = command.boundingVolume;
        result.modelMatrix = command.modelMatrix;
        return result;
    };

    /**
     * Clone only the properties of this command that are passed to the draw function.
     *
     * @param Command [result] Clone this command to result or create a new command if undefined.
     * @return Command A clone of this command stored in result or a new command if result is undefined.
     *
     * @see Context#draw
     * @see Context#beginDraw
     * @see Context#continueDraw
     * @see Context#endDraw
     */
    Command.prototype.cloneDrawArguments = function(result) {
        return Command.cloneDrawArguments(this, result);
    };

    /**
     * Clones this command.
     *
     * @param Command command The command to clone.
     * @param Command [result] Clone command to result or create a new command if undefined.
     * @return Command A clone of command stored in result or a new command if result is undefined.
     *
     * @exception DeveloperError command is required.
     */
    Command.prototype.clone = function(result) {
        return Command.clone(this, result);
    };

    return Command;
});