/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * An enumeration describing how to draw a label.
     *
     * @exports LabelStyle
     *
     * @see Label#setStyle
     */
    var LabelStyle = {
        /**
         * Fill the text of the label, but do not outline.
         *
         * @constant
         * @type {Enumeration}
         */
        FILL : new Enumeration(0, 'FILL'),

        /**
         * Outline the text of the label, but do not fill.
         *
         * @constant
         * @type {Enumeration}
         */
        OUTLINE : new Enumeration(1, 'OUTLINE'),

        /**
         * Fill and outline the text of the label.
         *
         * @constant
         * @type {Enumeration}
         */
        FILL_AND_OUTLINE : new Enumeration(2, 'FILL_AND_OUTLINE')
    };

    return LabelStyle;
});