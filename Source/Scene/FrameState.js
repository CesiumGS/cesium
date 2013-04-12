/*global define*/
define(['../Core/Cartesian2'], function(Cartesian2) {
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
         * @type SceneMode
         */
        this.mode = undefined;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = undefined;

        /**
         * The current frame number.
         *
         * @type Number
         */
        this.frameNumber = undefined;

        /**
         * The scene's current time.
         *
         * @type JulianDate
         */
        this.time = undefined;

        this.scene2D = {
            /**
             * The projection to use in 2D mode.
             */
            projection : undefined
        };

        /**
         * The current camera.
         * @type Camera
         */
        this.camera = undefined;

        /**
         * The culling volume.
         * @type CullingVolume
         */
        this.cullingVolume = undefined;

        /**
         * The current occluder.
         * @type Occluder
         */
        this.occluder = undefined;

        /**
         * The dimensions of the canvas.
         * @type {Cartesian2}
         */
        this.canvasDimensions = new Cartesian2();

        this.passes = {
                /**
                 * <code>true</code> if the primitive should update for a color pass, <code>false</code> otherwise.
                 * @type Boolean
                 */
                color : false,
                /**
                 * <code>true</code> if the primitive should update for a picking pass, <code>false</code> otherwise.
                 * @type Boolean
                 */
                pick : false,
                /**
                 * <code>true</code> if the primitive should update for an overlay pass, <code>false</code> otherwise.
                 * @type Boolean
                 */
                overlay : false
        };
    };

    return FrameState;
});