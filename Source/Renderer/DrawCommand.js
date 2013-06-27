/*global define*/
define(function() {
    "use strict";

    /**
     * Represents a command to the renderer for drawing.
     *
     * @alias DrawCommand
     * @constructor
     *
     * @see ClearCommand
     * @see PassState
     */
    var DrawCommand = function() {
        /**
         * The bounding volume of the geometry.
         * @type DOC_TBA
         * @default undefined
         */
        this.boundingVolume = undefined;

        /**
         * When <code>true</code>, the renderer frustum and horizon culls the command based on its {@link DrawCommand#boundingVolume}.
         * If the command was already culled, set this to <code>false</code> for a performance improvement.
         *
         * @type {Boolean}
         * @default true
         */
        this.cull = true;

        /**
         * The transformation from the geometry in model space to world space.
         * @type {Matrix4}
         * @default undefined
         */
        this.modelMatrix = undefined;

        /**
         * The type of geometry in the vertex array.
         * @type {PrimitiveType}
         * @default undefined
         */
        this.primitiveType = undefined;

        /**
         * The vertex array.
         * @type {VertexArray}
         * @default undefined
         */
        this.vertexArray = undefined;

        /**
         * The number of vertices to draw in the vertex array.
         * @type {Number}
         * @default undefined
         */
        this.count = undefined;

        /**
         * The offset to start drawing in the vertex array.
         * @type {Number}
         * @default undefined
         */
        this.offset = undefined;

        /**
         * The shader program to apply.
         * @type {ShaderProgram}
         * @default undefined
         */
        this.shaderProgram = undefined;

        /**
         * An object with functions whose names match the uniforms in the shader program
         * and return values to set those uniforms.
         * @type {Object}
         * @default undefined
         */
        this.uniformMap = undefined;

        /**
         * The render state.
         * @type {Object}
         * @default undefined
         *
         * @see Context#createRenderState
         */
        this.renderState = undefined;

        /**
         * The framebuffer to draw to.
         * @type {Framebuffer}
         * @default undefined
         */
        this.framebuffer = undefined;

        /**
         * Specifies if this command is only to be executed in the frustum closest
         * to the eye containing the bounding volume. Defaults to <code>false</code>.
         * @type {Boolean}
         * @default false 
         */
        this.executeInClosestFrustum = false;
    };

    /**
     * Executes the draw command.
     *
     * @memberof DrawCommand
     *
     * @param {Context} context The renderer context in which to draw.
     * @param {PassState} [passState] TBA.
     */
    DrawCommand.prototype.execute = function(context, passState) {
        context.draw(this, passState);
    };

    return DrawCommand;
});
