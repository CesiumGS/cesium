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

        /**
         * The current morph time between 2D and 3D, with 0.0 being 2D and 1.0 being 3D.
         */
        this.morphTime = 0.0;
    }

    return SceneState;
});