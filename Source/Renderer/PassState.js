/*global define*/
define(function() {
    "use strict";

    /**
     * The state for a particular rendering pass.  This is used to supplement the state
     * in a command being executed.
     *
     * @alias PassState
     * @constructor
     *
     * @see DrawCommand
     * @see ClearCommand
     */
    var PassState = function() {
        /**
         * The framebuffer to render to.  This framebuffer is used unless a {@link DrawCommand}
         * or {@link ClearCommand} explicitly define a framebuffer, which is used for off-screen
         * rendering.
         *
         * @type Framebuffer
         */
        this.framebuffer = undefined;

        /**
         * When defined, this overrides the blending property of a {@link DrawCommand}'s render state.
         * This is used to, for example, to allow the renderer to turn off blending during the picking pass.
         * <p>
         * When this is <code>undefined</code>, the {@link DrawCommand}'s property is used.
         * </p>
         *
         * @type Boolean
         * @default undefined
         */
        this.blendingEnabled = undefined;

        /**
         * When defined, this overrides the scissor test property of a {@link DrawCommand}'s render state.
         * This is used to, for example, to allow the renderer to scissor out the pick region during the picking pass.
         * <p>
         * When this is <code>undefined</code>, the {@link DrawCommand}'s property is used.
         * </p>
         */
        this.scissorTest = undefined;
    };

    return PassState;
});