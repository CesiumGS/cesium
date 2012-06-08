/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports TextureMagnificationFilter
     */
    var TextureMagnificationFilter = {
        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        NEAREST : new Enumeration(0x2600, 'NEAREST'),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        LINEAR : new Enumeration(0x2601, 'LINEAR'),

        /**
         * DOC_TBA
         *
         * @param textureMagnificationFilter
         *
         * @returns {Boolean}
         */
        validate : function(textureMagnificationFilter) {
            return ((textureMagnificationFilter === TextureMagnificationFilter.NEAREST) ||
                    (textureMagnificationFilter === TextureMagnificationFilter.LINEAR));
        }
    };

    return TextureMagnificationFilter;
});