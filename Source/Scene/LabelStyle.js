/*global define*/
define(function() {
    "use strict";

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
         * @default 0
         */
        FILL : 0,

        /**
         * Outline the text of the label, but do not fill.
         *
         * @type {Number}
         * @constant
         * @default 1
         */
        OUTLINE : 1,

        /**
         * Fill and outline the text of the label.
         *
         * @type {Number}
         * @constant
         * @default 2
         */
        FILL_AND_OUTLINE : 2
    };

    return LabelStyle;
});