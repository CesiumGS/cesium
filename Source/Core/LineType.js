define([
        './freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * LineType defines the path that should be taken connecting vertices.
     *
     * @exports LineType
     */
    var LineType = {
        /**
         * Follow geodesic path.
         *
         * @type {Number}
         * @constant
         */
        GEODESIC : 0,

        /**
         * Follow rhumb or loxodrome path.
         *
         * @type {Number}
         * @constant
         */
        RHUMB : 1
    };

    return freezeObject(LineType);
});
