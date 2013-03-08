/*global define*/
define(function() {
    "use strict";

    /**
     * Represents a command to the renderer for clearing.
     *
     * @alias ClearCommand
     * @constructor
     *
     * @param {Object}[owner=undefined] The object who created this command.
     * @param {ClearState}[clearState=undefined] The clear state.
     */
    var ClearCommand = function(owner, clearState) {
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
        this.framebuffer = undefined;

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
        this.owner = owner;
    };

    /**
     * Executes the clear command.
     *
     * @memberof ClearCommand
     *
     * @param {Context} context The renderer context in which to clear.
     * @param {Framebuffer} [framebuffer] The framebuffer to clear if one is not specified by the command.
     */
    ClearCommand.prototype.execute = function(context, framebuffer) {
        context.clear(this, framebuffer);
    };

    return ClearCommand;
});