/*global define*/
define([
    '../Core/freezeObject'
], function(
    freezeObject) {
    'use strict';

    /**
     * Determines how billboards, points, and labels are rendered.
     *
     * @exports BillboardRenderTechnique
     */
    var BlendOption = {
        /**
         * The billboards, points, or labels in the collection are completely opaque.
         * @type {Number}
         * @constant
         */
        OPAQUE : 0,

        /**
         * The billboards, points, or labels in the collection are completely translucent.
         * @type {Number}
         * @constant
         */
        TRANSLUCENT : 1,

        /**
         * The billboards, points, or labels in the collection are both opaque and translucent.
         * @type {Number}
         * @constant
         */
        OPAQUE_AND_TRANSLUCENT : 2
    };

    return freezeObject(BlendOption);
});
