/*global define*/
define([
        './SceneMode'
    ], function(
        SceneMode) {
    'use strict';

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
    function FrameState(context, creditDisplay) {
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
         * An array of shadow maps.
         * @type {ShadowMap[]}
         */
        this.shadowMaps = [];

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

        this.fog = {
            /**
             * <code>true</code> if fog is enabled, <code>false</code> otherwise.
             * @type {Boolean}
             * @default false
             */
            enabled : false,
            /**
             * A positive number used to mix the color and fog color based on camera distance.
             * @type {Number}
             * @default undefined
             */
            density : undefined,
            /**
             * A scalar used to modify the screen space error of geometry partially in fog.
             * @type {Number}
             * @default undefined
             */
            sse : undefined
        };

        /**
        * A scalar used to exaggerate the terrain.
        * @type {Number}
        */
        this.terrainExaggeration = 1.0;

        this.shadowHints = {
            /**
             * The near plane of the scene's frustum commands. Used for fitting cascaded shadow maps.
             * @type {Number}
             */
            nearPlane : 1.0,

            /**
             * The far plane of the scene's frustum commands. Used for fitting cascaded shadow maps.
             * @type {Number}
             */
            farPlane : 5000.0,

            /**
             * The size of the bounding volume that is closest to the camera. This is used to place more shadow detail near the object.
             * @type {Number}
             */
            closestObjectSize : 1000.0,

            /**
             * The time when a shadow map was last dirty
             * @type {Number}
             */
            lastDirtyTime : 0,

            /**
             * Whether the shadows maps are out of view this frame
             * @type {Boolean}
             */
            outOfView : true
        };
    }

    /**
     * A function that will be called at the end of the frame.
     * @callback FrameState~AfterRenderCallback
     */

    return FrameState;
});
