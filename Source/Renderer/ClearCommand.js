/*global define*/
define(function() {
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
    var ClearCommand = function(clearState, framebuffer) {
        /**
         * The clear state.  If this property is undefined, a default clear state is used.
         *
         * @type Object
         * @default undefined
         */
        this.clearState = undefined;

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