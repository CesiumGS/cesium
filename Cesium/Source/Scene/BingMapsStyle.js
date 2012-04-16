/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * An enumeration of the types of imagery provided by Bing Maps.
     *
     * @exports BingMapsStyle
     *
     * @see BingMapsTileProvider
     */
    var BingMapsStyle = {
        /**
         * Aerial imagery.
         *
         * @constant
         * @type {Enumeration}
         */
        AERIAL : new Enumeration(0, "Aerial"),

        /**
         * Aerial imagery with a road overlay.
         *
         * @constant
         * @type {Enumeration}
         */
        AERIAL_WITH_LABELS : new Enumeration(1, "AerialwithLabels"),

        /**
         * Roads without additional imagery.
         *
         * @constant
         * @type {Enumeration}
         */
        ROAD : new Enumeration(2, "Road"),

        /**
         * Ordnance Survey imagery
         *
         * @constant
         * @type {Enumeration}
         */
        ORDNANCE_SURVEY : new Enumeration(3, "OrdnanceSurvey"),

        /**
         * Collins Bart imagery.
         *
         * @constant
         * @type {Enumeration}
         */
        COLLINS_BART : new Enumeration(4, "CollinsBart")
    };

    return BingMapsStyle;
});