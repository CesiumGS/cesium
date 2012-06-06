/*global define*/
define([], function() {
    "use strict";

    /**
     * State information about the current scene.  An instance of this class
     * is provided to update functions.
     *
     * @name SceneState
     * @constructor
     */
    function SceneState() {
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
         */
        this.camera = undefined;
    }

    return SceneState;
});