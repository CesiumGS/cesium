/*global define*/
define([
        './defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias GeometryIndices
     * @constructor
     */
    var GeometryIndices = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.primitiveType = options.primitiveType;

        /**
         * DOC_TBA
         */
        this.values = options.values;
    };

    return GeometryIndices;
});
