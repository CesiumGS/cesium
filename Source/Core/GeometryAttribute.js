/*global define*/
define([
        './defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias GeometryAttribute
     * @constructor
     */
    var GeometryAttribute = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.componentDatatype = options.componentDatatype;

        /**
         * DOC_TBA
         */
        this.componentsPerAttribute = options.componentsPerAttribute;

        /**
         * DOC_TBA
         */
        this.normalize = defaultValue(options.normalize, false);

        /**
         * DOC_TBA
         */
        this.values = options.values;
    };

    /**
     * DOC_TBA
     */
    GeometryAttribute.prototype.clone = function(result) {
        if (typeof result === 'undefined') {
            result = new GeometryAttribute();
        }

        result.componentDatatype = this.componentDatatype;              // Shallow copy enum
        result.componentsPerAttribute = this.componentsPerAttribute;
        result.normalize = this.normalize;

// TODO: typed array or not.  fastest way to copy?
// TODO: attribute not backed by buffer?
        var sourceValues = this.values;
        var length = sourceValues.length;
        var values = new Array(length);
        for (var i = 0; i < length; ++i) {
            values[i] = sourceValues[i];
        }
        result.values = values;

        return result;
    };

    return GeometryAttribute;
});
