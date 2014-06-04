/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/freezeObject'
    ], function(
        Color,
        defaultValue,
        freezeObject) {
    "use strict";

    /**
     * Represents a command to the renderer for clearing a framebuffer.
     *
     * @private
     */
    var ClearCommand = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The value to clear the color buffer to.  When <code>undefined</code>, the color buffer is not cleared.
         *
         * @type {Color}
         *
         * @default undefined
         */
        this.color = options.color;

        /**
         * The value to clear the depth buffer to.  When <code>undefined</code>, the depth buffer is not cleared.
         *
         * @type {Number}
         *
         * @default undefined
         */
        this.depth = options.depth;

        /**
         * The value to clear the stencil buffer to.  When <code>undefined</code>, the stencil buffer is not cleared.
         *
         * @type {Number}
         *
         * @default undefined
         */
        this.stencil = options.stencil;

        /**
         * The render state to apply when executing the clear command.  The following states affect clearing:
         * scissor test, color mask, depth mask, and stencil mask.  When the render state is
         * <code>undefined</code>, the default render state is used.
         *
         * @type {RenderState}
         *
         * @default undefined
         *
         * @see Context#createRenderState
         */
        this.renderState = options.renderState;

        /**
         * The framebuffer to clear.
         *
         * @type {Framebuffer}
         *
         * @default undefined
         */
        this.framebuffer = options.framebuffer;

        /**
         * The object who created this command.  This is useful for debugging command
         * execution; it allows you to see who created a command when you only have a
         * reference to the command, and can be used to selectively execute commands
         * with {@link Scene#debugCommandFilter}.
         *
         * @type {Object}
         *
         * @default undefined
         *
         * @see Scene#debugCommandFilter
         */
        this.owner = options.owner;
    };

    /**
     * Clears color to (0.0, 0.0, 0.0, 0.0); depth to 1.0; and stencil to 0.
     *
     * @type {ClearCommand}
     *
     * @constant
     */
    ClearCommand.ALL = freezeObject(new ClearCommand({
        color : new Color(0.0, 0.0, 0.0, 0.0),
        depth : 1.0,
        stencil : 0.0
    }));

    ClearCommand.prototype.execute = function(context, passState) {
        context.clear(this, passState);
    };

    return ClearCommand;
});
