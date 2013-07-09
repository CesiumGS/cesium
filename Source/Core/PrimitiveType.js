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
         * @type {Enumeration}
         * @constant
         * @default 0x0000
         */
        POINTS : new Enumeration(0x0000, 'POINTS'),
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0001
         */
        LINES : new Enumeration(0x0001, 'LINES'),
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0002
         */
        LINE_LOOP : new Enumeration(0x0002, 'LINE_LOOP'),
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0003
         */
        LINE_STRIP : new Enumeration(0x0003, 'LINE_STRIP'),
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0004
         */
        TRIANGLES : new Enumeration(0x0004, 'TRIANGLES'),
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0004
         */
        TRIANGLE_STRIP : new Enumeration(0x0005, 'TRIANGLE_STRIP'),
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0006
         */
        TRIANGLE_FAN : new Enumeration(0x0006, 'TRIANGLE_FAN'),

        /**
         * DOC_TBA
         *
         * @param {PrimitiveType} primitiveType
         *
         * @returns {Boolean}
         */
        validate : function(primitiveType) {
            return ((primitiveType === PrimitiveType.POINTS) ||
                    (primitiveType === PrimitiveType.LINES) ||
                    (primitiveType === PrimitiveType.LINE_LOOP) ||
                    (primitiveType === PrimitiveType.LINE_STRIP) ||
                    (primitiveType === PrimitiveType.TRIANGLES) ||
                    (primitiveType === PrimitiveType.TRIANGLE_STRIP) ||
                    (primitiveType === PrimitiveType.TRIANGLE_FAN));
        }
    };

    return PrimitiveType;
});
