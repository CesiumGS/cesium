/*global define*/
define([], function() {
    "use strict";

    /**
     * State information about the current frame.  An instance of this class
     * is provided to update functions.
     *
     * @alias FrameState
     * @constructor
     */
    var FrameState = function() {
        /**
         * The current mode of the scene.
         *
         * @type SceneMode
         */
        this.mode = undefined;

        this.scene2D = {
            /**
             * The projection to use in 2D mode.
             */
            projection : undefined
        };

        /**
         * The current camera.
         *
         * @type Camera
         */
        this.camera = undefined;

        /**
         * The current occluder.
         *
         * @type Occluder
         */
        this.occluder = undefined;

        this.passes = {
                /**
                 * <code>true</code> if the primitive should update for a picking pass, <code>false</code> otherwise.
                 *
                 * @type Boolean
                 */
                pick : false
        };
    };

    return FrameState;
});