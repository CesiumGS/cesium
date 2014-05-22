/*global define*/
define(function() {
    "use strict";

    /**
     * The types of imagery provided by Bing Maps.
     *
     * @exports BingMapsStyle
     *
     * @see BingMapsImageryProvider
     */
    var BingMapsStyle = {
        /**
         * Aerial imagery.
         *
         * @type {String}
         * @constant
         * @default 0
         */
        AERIAL : 'Aerial',

        /**
         * Aerial imagery with a road overlay.
         *
         * @type {String}
         * @constant
         * @default 1
         */
        AERIAL_WITH_LABELS : 'AerialWithLabels',

        /**
         * Roads without additional imagery.
         *
         * @type {String}
         * @constant
         * @default 2
         */
        ROAD : 'Road',

        /**
         * Ordnance Survey imagery
         *
         * @type {String}
         * @constant
         * @default 3
         */
        ORDNANCE_SURVEY : 'OrdnanceSurvey',

        /**
         * Collins Bart imagery.
         *
         * @type {String}
         * @constant
         * @default 4
         */
        COLLINS_BART : 'CollinsBart'
    };

    return BingMapsStyle;
});