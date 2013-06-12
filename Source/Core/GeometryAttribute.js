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
        result.values = new this.values.constructor(this.values);

        return result;
    };

    return GeometryAttribute;
});
