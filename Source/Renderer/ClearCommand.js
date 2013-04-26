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
         *
         * @type Object
         *
         * @default undefined
         */
        this.clearState = clearState;

        /**
         * The framebuffer to clear.
         *
         * @type Framebuffer
         *
         * @default undefined
         */
        this.framebuffer = framebuffer;

        /**
         * The object who created this command.  This is useful for debugging command
         * execution; it allows you to see who created a command when you only have a
         * reference to the command, and can be used to selectively execute commands
         * with {@link Scene#debugCommandFilter}.
         *
         * @type Object
         *
         * @default undefined
         *
         * @see Scene#debugCommandFilter
         */
        this.owner = undefined;
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