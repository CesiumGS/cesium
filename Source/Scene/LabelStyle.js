/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * An enumeration describing how to draw a label.
     *
     * @exports LabelStyle
     *
     * @see Label#style
     */
    var LabelStyle = {
        /**
         * Fill the text of the label, but do not outline.
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        FILL : new Enumeration(0, 'FILL'),

        /**
         * Outline the text of the label, but do not fill.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        OUTLINE : new Enumeration(1, 'OUTLINE'),

        /**
         * Fill and outline the text of the label.
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        FILL_AND_OUTLINE : new Enumeration(2, 'FILL_AND_OUTLINE')
    };

    return LabelStyle;
});
