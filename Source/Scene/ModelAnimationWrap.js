/*global define*/
define([
        '../Core/Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias ComponentDatatype
     * @enumeration
     */
    var ModelAnimationWrap = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        CLAMP : new Enumeration(0, 'CLAMP'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        REPEAT : new Enumeration(1, 'REPEAT'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        MIRRORED_REPEAT : new Enumeration(2, 'MIRRORED_REPEAT')
    };

    return ModelAnimationWrap;
});