/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Indicates if the scene is viewed in 3D, 2D, or 2.5D Columbus view.
     *
     * @exports SceneMode
     *
     * @see Scene#mode
     */
    var SceneMode = {
        /**
         * Morphing between mode, e.g., 3D to 2D.
         *
         * @type {Number}
         * @constant
         */
        MORPHING : 0,

        /**
         * Columbus View mode.  A 2.5D perspective view where the map is laid out
         * flat and objects with non-zero height are drawn above it.
         *
         * @type {Number}
         * @constant
         */
        COLUMBUS_VIEW : 1,

        /**
         * 2D mode.  The map is viewed top-down with an orthographic projection.
         *
         * @type {Number}
         * @constant
         */
        SCENE2D : 2,

        /**
         * 3D mode.  A traditional 3D perspective view of the globe.
         *
         * @type {Number}
         * @constant
         */
        SCENE3D : 3
    };

    /**
     * Returns the morph time for the given scene mode.
     *
     * @param {SceneMode} value The scene mode
     * @returns {Number} The morph time
     */
    SceneMode.getMorphTime = function(value) {
        if (value === SceneMode.SCENE3D) {
            return 1.0;
        } else if (value === SceneMode.MORPHING) {
            return undefined;
        }
        return 0.0;
    };

    return freezeObject(SceneMode);
});
