/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports LabelStyle
     *
     * @see Label#setStyle
     */
    var LabelStyle = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        FILL : new Enumeration(0, 'FILL'),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        OUTLINE : new Enumeration(1, 'OUTLINE'),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        FILL_AND_OUTLINE : new Enumeration(2, 'FILL_AND_OUTLINE')
    };

    return LabelStyle;
});