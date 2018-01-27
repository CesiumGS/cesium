define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Describes how to draw a label.
     *
     * @exports LabelStyle
     *
     * @see Label#style
     */
    var LabelStyle = {
        /**
         * Fill the text of the label, but do not outline.
         *
         * @type {Number}
         * @constant
         */
        FILL : 0,

        /**
         * Outline the text of the label, but do not fill.
         *
         * @type {Number}
         * @constant
         */
        OUTLINE : 1,

        /**
         * Fill and outline the text of the label.
         *
         * @type {Number}
         * @constant
         */
        FILL_AND_OUTLINE : 2
    };

    return freezeObject(LabelStyle);
});
