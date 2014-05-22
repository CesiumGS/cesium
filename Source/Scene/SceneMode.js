/*global define*/
define([
        '../Core/Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * Indicates if the scene is viewed in 3D, 2D, or 2.5D Columbus view.
     *
     * @exports SceneMode
     *
     * @see Scene#mode
     */
    var SceneMode = {
        /**
         * 2D mode.  The map is viewed top-down with an orthographic projection.
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        SCENE2D : new Enumeration(0, 'SCENE2D', {
            morphTime : 0.0
        }),

        /**
         * Columbus View mode.  A 2.5D perspective view where the map is laid out
         * flat and objects with non-zero height are drawn above it.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        COLUMBUS_VIEW : new Enumeration(1, 'COLUMBUS_VIEW', {
            morphTime : 0.0
        }),

        /**
         * 3D mode.  A traditional 3D perspective view of the globe.
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        SCENE3D : new Enumeration(2, 'SCENE3D', {
            morphTime : 1.0
        }),

        /**
         * Morphing between mode, e.g., 3D to 2D.
         *
         * @type {Enumeration}
         * @constant
         * @default 3
         */
        MORPHING : new Enumeration(3, 'MORPHING')
    };

    return SceneMode;
});
