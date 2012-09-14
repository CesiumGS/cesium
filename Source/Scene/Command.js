/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Command
     * @constructor
     */
    var Command = function() {
        /**
         * DOC_TBA
         * @type DOC_TBA
         */
        this.boundingVolume = undefined;

        /**
         * DOC_TBA
         * @type Matrix4
         */
        this.modelMatrix = undefined;

        /**
         * DOC_TBA
         * @type PrimitiveType
         */
        this.primitiveType = undefined;

        /**
         * DOC_TBA
         * @type VertexArray
         */
        this.vertexArray = undefined;

        /**
         * DOC_TBA
         * @type Number
         */
        this.count = undefined;

        /**
         * DOC_TBA
         * @type Number
         */
        this.offset = undefined;

        /**
         * DOC_TBA
         * @type ShaderProgram
         */
        this.shaderProgram = undefined;

        /**
         * DOC_TBA
         * @type Object
         */
        this.uniformMap = undefined;

        /**
         * DOC_TBA
         * @type Object
         */
        this.renderState = undefined;

        /**
         * DOC_TBA
         * @type Framebuffer
         */
        this.framebuffer = undefined;
    };

    /**
     * DOC_TBA
     *
     * @param Command command The command to clone.
     * @param Command [result] Clone command to result or create a new command if undefined.
     * @return Command A clone of command stored in result or a new command if result is undefined.
     *
     * @exception DeveloperError command is required.
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
     * DOC_TBA
     *
     * @param Command [result] Clone this command to result or create a new command if undefined.
     * @return Command A clone of this command stored in result or a new command if result is undefined.
     */
    Command.prototype.cloneDrawArguments = function(result) {
        return Command.cloneDrawArguments(this, result);
    };

    return Command;
});