define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    // Note, these values map directly to ion asset ids.

    /**
     * The types of imagery provided by {@link createWorldImagery}.
     *
     * @exports IonWorldImageryStyle
     */
    var IonWorldImageryStyle = {
        /**
         * Aerial imagery.
         *
         * @type {String}
         * @constant
         */
        AERIAL : 2,

        /**
         * Aerial imagery with a road overlay.
         *
         * @type {String}
         * @constant
         */
        AERIAL_WITH_LABELS : 3,

        /**
         * Roads without additional imagery.
         *
         * @type {String}
         * @constant
         */
        ROAD : 4
    };

    return freezeObject(IonWorldImageryStyle);
});
