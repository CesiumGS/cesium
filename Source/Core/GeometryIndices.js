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

    /**
     * DOC_TBA
     */
    GeometryIndices.prototype.clone = function(result) {
        if (typeof result === 'undefined') {
            result = new GeometryIndices();
        }

        result.primitiveType = this.primitiveType; // Shallow copy enum

// TODO: typed array or not.  fastest way to copy?
        var sourceValues = this.values;
        var length = sourceValues.length;
        var values = new Array(length);
        for (var i = 0; i < length; ++i) {
            values[i] = sourceValues[i];
        }
        result.values = values;

        return result;
    };

    return GeometryIndices;
});
