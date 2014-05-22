/*global define*/
define([
        '../Core/Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * The state of a {@link QuadtreeTile} in the tile load pipeline.
     * @exports QuadtreeTileLoadState
     */
    var QuadtreeTileLoadState = {
        /**
         * The tile is new and loading has not yet begun.
         * @type QuadtreeTileLoadState
         * @constant
         * @default 0
         */
        START : new Enumeration(0, 'START'),

        /**
         * Loading is in progress.
         * @type QuadtreeTileLoadState
         * @constant
         * @default 1
         */
        LOADING : new Enumeration(1, 'LOADING'),

        /**
         * Loading is complete.
         * @type QuadtreeTileLoadState
         * @constant
         * @default 2
         */
        DONE : new Enumeration(2, 'DONE'),

        /**
         * The tile has failed to load.
         * @type QuadtreeTileLoadState
         * @constant
         * @default 3
         */
        FAILED : new Enumeration(3, 'FAILED')
    };

    return QuadtreeTileLoadState;
});
