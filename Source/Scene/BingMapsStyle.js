define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

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
         */
        AERIAL : 'Aerial',

        /**
         * Aerial imagery with a road overlay.
         *
         * @type {String}
         * @constant
         */
        AERIAL_WITH_LABELS : 'AerialWithLabels',

        /**
         * Roads without additional imagery.
         *
         * @type {String}
         * @constant
         */
        ROAD : 'Road',

        /**
         * A dark version of the road maps.
         *
         * @type {String}
         * @constant
         */
        CANVAS_DARK : 'CanvasDark',

        /**
         * A lighter version of the road maps.
         *
         * @type {String}
         * @constant
         */
        CANVAS_LIGHT : 'CanvasLight',

        /**
         * A grayscale version of the road maps.
         *
         * @type {String}
         * @constant
         */
        CANVAS_GRAY : 'CanvasGray',

        /**
         * Ordnance Survey imagery. This imagery is visible only for the London, UK area.
         *
         * @type {String}
         * @constant
         */
        ORDNANCE_SURVEY : 'OrdnanceSurvey',

        /**
         * Collins Bart imagery.
         *
         * @type {String}
         * @constant
         */
        COLLINS_BART : 'CollinsBart'
    };

    return freezeObject(BingMapsStyle);
});
