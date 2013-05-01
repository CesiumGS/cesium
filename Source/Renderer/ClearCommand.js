/*global define*/
define([
        '../Core/Color',
        '../Core/freezeObject'
    ], function(
        Color,
        freezeObject) {
    "use strict";

    /**
     * Represents a command to the renderer for clearing a framebuffer.
     *
     * @alias ClearCommand
     * @constructor
     *
     * @see DrawCommand
     * @see PassState
     */
    var ClearCommand = function() {
        /**
         * The value to clear the color buffer to.  When <code>undefined</code>, the color buffer is not cleared.
         *
         * @type Color
         * @default undefined
         */
        this.color = undefined;

        /**
         * The value to clear the depth buffer to.  When <code>undefined</code>, the depth buffer is not cleared.
         *
         * @type Number
         * @default undefined
         */
        this.depth = undefined;

        /**
         * The value to clear the stencil buffer to.  When <code>undefined</code>, the stencil buffer is not cleared.
         *
         * @type Number
         * @default undefined
         */
        this.stencil = undefined;

        /**
         * The render state to apply when executing the clear command.  The following states affect clearing:
         * scissor test, color mask, depth mask, stencil mask, and dither.  When the render state is
         * <code>undefined</code>, the default render state is used.
         *
         * @type Object
         * @default undefined
         *
         * @see Context#createRenderState
         */
        this.renderState = undefined;

        /**
         * The framebuffer to clear.
         *
         * @type Framebuffer
         * @default undefined
         */
        this.framebuffer = undefined;
    };

    var all = new ClearCommand();
    all.color = new Color(0.0, 0.0, 0.0, 0.0);
    all.depth = 1.0;
    all.stencil = 0.0;

    /**
     * Clears color to (0.0, 0.0, 0.0, 0.0); depth to 1.0; and stencil to 0.
     *
     * @constant
     * @type {ClearCommand}
     */
    ClearCommand.ALL = freezeObject(all);

    /**
     * Executes the clear command.
     *
     * @memberof ClearCommand
     *
     * @param {Context} context The renderer context in which to clear.
     * @param {PassState} [passState] The state for the current rendering pass.
     */
    ClearCommand.prototype.execute = function(context, passState) {
        context.clear(this, passState);
    };

    return ClearCommand;
});