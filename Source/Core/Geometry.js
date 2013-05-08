/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Geometry
     * @constructor
     */
    var Geometry = function(options) {
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
