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

    return GeometryAttribute;
});
