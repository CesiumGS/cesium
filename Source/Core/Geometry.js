/*global define*/
define([
        './defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Geometry
     * @constructor
     */
    var Geometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.attributes = options.attributes;

        /**
         * DOC_TBA
         */
        this.indexLists = options.indexLists;

        /**
         * DOC_TBA
         */
        this.boundingSphere = options.boundingSphere;
    };

    return Geometry;
});
