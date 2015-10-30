/*global define*/
define([
        './SceneMode'
    ], function(
        SceneMode) {
    "use strict";

    /**
     * State information about the current frame.  An instance of this class
     * is provided to update functions.
     *
     * @param {CreditDisplay} creditDisplay Handles adding and removing credits from an HTML element
     *
     * @alias FrameState
     * @constructor
     *
     * @private
     */
    var FrameState = function(context, creditDisplay) {
        /**
         * The rendering context.
         * @type {Context}
         */
        this.context = context;

        /**
         * An array of rendering commands.
         * @type {DrawCommand[]}
         */
        this.commandList = [];

        /**
         * The current mode of the scene.
         * @type {SceneMode}
         * @default {@link SceneMode.SCENE3D}
         */
        this.mode = SceneMode.SCENE3D;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type {Number}
         */
        this.morphTime = SceneMode.getMorphTime(SceneMode.SCENE3D);

        /**
         * The current frame number.
         *
         * @type {Number}
         * @default 0
         */
        this.frameNumber = 0;

        /**
         * The scene's current time.
         *
         * @type {JulianDate}
         * @default undefined
         */
        this.time = undefined;

        /**
         * The map projection to use in 2D and Columbus View modes.
         *
         * @type {MapProjection}
         * @default undefined
         */
        this.mapProjection = undefined;

        /**
         * The current camera.
         * @type {Camera}
         * @default undefined
         */
        this.camera = undefined;

        /**
         * The culling volume.
         * @type {CullingVolume}
         * @default undefined
         */
        this.cullingVolume = undefined;

        /**
         * The current occluder.
         * @type {Occluder}
         * @default undefined
         */
        this.occluder = undefined;

        this.passes = {
            /**
             * <code>true</code> if the primitive should update for a render pass, <code>false</code> otherwise.
             * @type {Boolean}
             * @default false
             */
            render : false,
            /**
             * <code>true</code> if the primitive should update for a picking pass, <code>false</code> otherwise.
             * @type {Boolean}
             * @default false
             */
            pick : false
        };

        /**
        * The credit display.
        * @type {CreditDisplay}
        */
        this.creditDisplay = creditDisplay;

        /**
         * An array of functions to be called at the end of the frame.  This array
         * will be cleared after each frame.
         * <p>
         * This allows queueing up events in <code>update</code> functions and
         * firing them at a time when the subscribers are free to change the
         * scene state, e.g., manipulate the camera, instead of firing events
         * directly in <code>update</code> functions.
         * </p>
         *
         * @type {FrameState~AfterRenderCallback[]}
         *
         * @example
         * frameState.afterRender.push(function() {
         *   // take some action, raise an event, etc.
         * });
         */
        this.afterRender = [];

        /**
         * Gets whether or not to optimized for 3D only.
         * @type {Boolean}
         * @default false
         */
        this.scene3DOnly = false;
    };

    /**
     * A function that will be called at the end of the frame.
     * @callback FrameState~AfterRenderCallback
     */

    return FrameState;
});
