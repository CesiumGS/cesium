define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * An enum for setting what tile variable the heatmap colorization should be based on.
     *
     * @exports Cesium3DTilesetHeatmapOption
     */
    var Cesium3DTilesetHeatmapOption = {
        /**
         * Turns off the heatmap
         *
         * @type {String}
         * @constant
         */
        NONE : undefined,

        /**
         * Heatmap colorized based on the camera depth.
         *
         * @type {String}
         * @constant
         */
        CAMERA_DEPTH : '_centerZDepth',

        /**
         * Heatmap colorized based on the camera distance.
         *
         * @type {String}
         * @constant
         */
        CAMERA_DISTANCE : '_distanceToCamera',

        /**
         * Heatmap colorized based on the geometric error.
         *
         * @type {String}
         * @constant
         */
        GEOMETRIC_ERROR : 'geometricError',

        /**
         * Heatmap colorized based on the screen space error.
         *
         * @type {String}
         * @constant
         */
        SCREEN_SPACE_ERROR : '_screenSpaceError',

        /**
         * Heatmap colorized based on the tree depth.
         *
         * @type {String}
         * @constant
         */
        TREE_DEPTH : '_depth'
    };

    return freezeObject(Cesium3DTilesetHeatmapOption);
});
