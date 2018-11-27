define([
    ], function() {
    'use strict';

    /**
     * Indicates what happened the last time this tile was visited for selection.
     * @private
     */
    var TileSelectionResult = {
        /**
         * There was no selection result, perhaps because the tile wasn't visited
         * last frame.
         */
        NONE: 0,

        /**
         * This tile was deemed not visible and culled.
         */
        CULLED: 1,

        /**
         * The tile was selected for rendering.
         */
        RENDERED: 2,

        /**
         * This tile did not meet the required screen-space error and was refined.
         */
        REFINED: 3,

        /**
         * This tile was originally rendered, but it got kicked out of the render list
         * in favor of an ancestor because it is not yet renderable.
         */
        RENDERED_AND_KICKED: 2 | 4,

        /**
         * This tile was originally refined, but its rendered descendants got kicked out of the
         * render list in favor of an ancestor because it is not yet renderable.
         */
        REFINED_AND_KICKED: 3 | 4,

        /**
         * Determines if a selection result indicates that this tile or its descendants were
         * kicked from the render list. In other words, if it is <code>RENDERED_AND_KICKED</code>
         * or <code>REFINED_AND_KICKED</code>.
         *
         * @param {TileSelectionResult} value The selection result to test.
         * @returns {Boolean} true if the tile was kicked, no matter if it was originally rendered or refined.
         */
        wasKicked: function(value) {
            return value >= TileSelectionResult.RENDERED_AND_KICKED;
        },

        /**
         * Determines the original selection result prior to being kicked.
         * If the tile wasn't kicked, the original value is returned.
         * @param {TileSelectionResult} value The selection result.
         * @returns {TileSelectionResult} The original selection result prior to kicking.
         */
        originalResult: function(value) {
            return value & 3;
        },

        /**
         * Converts this selection result to a kick.
         * @param {TileSelectionResult} value The original selection result.
         * @returns {TileSelectionResult} The kicked form of the selection result.
         */
        kick: function(value) {
            return value | 4;
        }
    };

    return TileSelectionResult;
});
