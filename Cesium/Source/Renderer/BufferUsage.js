/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports BufferUsage
     */
    var BufferUsage = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        STREAM_DRAW : new Enumeration(0x88E0, "STREAM_DRAW"),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        STATIC_DRAW : new Enumeration(0x88E4, "STATIC_DRAW"),
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        DYNAMIC_DRAW : new Enumeration(0x88E8, "DYNAMIC_DRAW")
    };

    return BufferUsage;
});