/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * An enumeration of the types of imagery provided by Bing Maps.
     *
     * @exports BingMapsStyle
     *
     * @see BingMapsImageryProvider
     */
    var BingMapsStyle = {
        /**
         * Aerial imagery.
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        AERIAL : new Enumeration(0, 'AERIAL', { imagerySetName : 'Aerial' }),

        /**
         * Aerial imagery with a road overlay.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        AERIAL_WITH_LABELS : new Enumeration(1, 'AERIAL_WITH_LABELS', { imagerySetName : 'AerialWithLabels' }),

        /**
         * Roads without additional imagery.
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        ROAD : new Enumeration(2, 'ROAD', { imagerySetName : 'Road' }),

        /**
         * Ordnance Survey imagery
         *
         * @type {Enumeration}
         * @constant
         * @default 3
         */
        ORDNANCE_SURVEY : new Enumeration(3, 'ORDNANCE_SURVEY', { imagerySetName : 'OrdnanceSurvey' }),

        /**
         * Collins Bart imagery.
         *
         * @type {Enumeration}
         * @constant
         * @default 4
         */
        COLLINS_BART : new Enumeration(4, 'COLLINS_BART', { imagerySetName : 'CollinsBart' })
    };

    return BingMapsStyle;
});
