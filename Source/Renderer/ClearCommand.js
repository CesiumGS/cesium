/*global define*/
define(function() {
    "use strict";

    /**
     * Represents a command to the renderer for clearing.
     *
     * @alias ClearCommand
     * @constructor
     *
     * @param {ClearState} [clearState] The clear state.
     * @param {Framebuffer} [framebuffer] The framebuffer to clear when the command is executed.
     *
     * @see DrawCommand
     * @see PassState
     */
    var ClearCommand = function(clearState, framebuffer) {
        /**
         * The clear state.  If this property is undefined, a default clear state is used.
         * @type Object
         */
        this.clearState = clearState;

        /**
         * The framebuffer to clear.
         * @type Framebuffer
         */
        this.framebuffer = framebuffer;
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