/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports MipmapHint
     */
    var MipmapHint = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1100
         */
        DONT_CARE : new Enumeration(0x1100, 'DONT_CARE'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1101
         */
        FASTEST : new Enumeration(0x1101, 'FASTEST'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x1102
         */
        NICEST : new Enumeration(0x1102, 'NICEST'),

        /**
         * DOC_TBA
         *
         * @param {MipmapHint} mipmapHint
         *
         * @returns {Boolean}
         */
        validate : function(mipmapHint) {
            return ((mipmapHint === MipmapHint.DONT_CARE) ||
                    (mipmapHint === MipmapHint.FASTEST) ||
                    (mipmapHint === MipmapHint.NICEST));
        }
    };

    return MipmapHint;
});
