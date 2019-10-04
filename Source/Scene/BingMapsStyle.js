import freezeObject from '../Core/freezeObject.js';

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
         * @deprecated See https://github.com/AnalyticalGraphicsInc/cesium/issues/7128.
         * Use `BingMapsStyle.AERIAL_WITH_LABELS_ON_DEMAND` instead
         */
        AERIAL_WITH_LABELS : 'AerialWithLabels',

        /**
         * Aerial imagery with a road overlay.
         *
         * @type {String}
         * @constant
         */
        AERIAL_WITH_LABELS_ON_DEMAND : 'AerialWithLabelsOnDemand',

        /**
         * Roads without additional imagery.
         *
         * @type {String}
         * @constant
         * @deprecated See https://github.com/AnalyticalGraphicsInc/cesium/issues/7128.
         * Use `BingMapsStyle.ROAD_ON_DEMAND` instead
         */
        ROAD : 'Road',

        /**
         * Roads without additional imagery.
         *
         * @type {String}
         * @constant
         */
        ROAD_ON_DEMAND : 'RoadOnDemand',

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
export default freezeObject(BingMapsStyle);
