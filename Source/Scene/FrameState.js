/*global define*/
define([
        '../Core/Cartesian2',
        './SceneMode'
    ], function(
        Cartesian2,
        SceneMode) {
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
         * @type {SceneMode}
         * @default {@link SceneMode.SCENE3D}
         */
        this.mode = SceneMode.SCENE3D;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type {Number}
         * @default {@link SceneMode.SCENE3D.morphTime}
         */
        this.morphTime = SceneMode.SCENE3D.morphTime;

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

        this.scene2D = {
            /**
             * The projection to use in 2D mode.
             * @default undefined
             */
            projection : undefined
        };

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

        /**
         * The dimensions of the canvas.
         * @type {Cartesian2}
         * @default Cartesian2(0.0, 0.0)
         */
        this.canvasDimensions = new Cartesian2();

        this.passes = {
            /**
             * <code>true</code> if the primitive should update for a color pass, <code>false</code> otherwise.
             * @type {Boolean}
             * @default false
             */
            color : false,
            /**
             * <code>true</code> if the primitive should update for a picking pass, <code>false</code> otherwise.
             * @type {Boolean}
             * @default false
             */
            pick : false,
            /**
             * <code>true</code> if the primitive should update for an overlay pass, <code>false</code> otherwise.
             * @type {Boolean}
             * @default false
             */
            overlay : false
        };
    };

    return FrameState;
});
