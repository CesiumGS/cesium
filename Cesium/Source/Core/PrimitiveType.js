/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports PrimitiveType
     */
    var PrimitiveType = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        POINTS : new Enumeration(0x0000, "points"), // POINTS
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LINES : new Enumeration(0x0001, "lines"), // LINES
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LINE_LOOP : new Enumeration(0x0002, "lineLoop"), // LINE_LOOP
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LINE_STRIP : new Enumeration(0x0003, "lineStrip"), // LINE_STRIP
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        TRIANGLES : new Enumeration(0x0004, "triangles"), // TRIANGLES
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        TRIANGLE_STRIP : new Enumeration(0x0005, "triangleStrip"), // TRIANGLE_STRIP
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        TRIANGLE_FAN : new Enumeration(0x0006, "trangleFan") // TRIANGLE_FAN
    };

    return PrimitiveType;
});
