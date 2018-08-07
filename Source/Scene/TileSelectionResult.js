define([
    ], function() {
    'use strict';

    /**
     * Indicates what happened the last time this tile was visited for selection.
     * @private
     */
    var TileSelectionResult = {
        /**
         * This tile was deemed not visible and culled.
         */
        CULLED: 0,

        /**
         * The tile was selected for rendering.
         */
        RENDERED: 1,

        /**
         * This tile did not meet the required screen-space error and was refined.
         */
        REFINED: 2,

        /**
         * This tile was originally refined or rendered, but it or its descendants got kicked out of the render list
         * in favor of an ancestor because it is not yet renderable.
         */
        KICKED: 3
    };

    return TileSelectionResult;
});
