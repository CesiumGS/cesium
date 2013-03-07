/*global define*/
define(function() {
    "use strict";

    /**
     * Represents a command to the renderer for clearing.
     *
     * @alias ClearCommand
     * @constructor
     *
     * @param {ClearState}[clearState=undefined] The clear state.
     * @param {Object}[owner=undefined] The object who created this command.
     */
    var ClearCommand = function(clearState, owner) {
        /**
         * The clear state.  If this property is undefined, a default clear state is used.
         * @type Object
         */
        this.clearState = clearState;

        /**
         * The framebuffer to clear.
         * @type Framebuffer
         */
        this.framebuffer = undefined;

        /**
         * The object who created this command.  This is useful for debugging command execution.
         *
         * @type Object
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