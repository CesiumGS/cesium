/*global define*/
define([
        '../Core/defined'
    ], function(
        defined) {
    "use strict";

    /**
     * Describes a rasterized feature, such as a point, polygon, polyline, etc., in an imagery layer.
     *
     * @alias ImageryLayerFeatureInfo
     * @constructor
     */
    var ImageryLayerFeatureInfo = function() {
        /**
         * Gets or sets the name of the feature.
         * @type {String}
         */
        this.name = undefined;

        /**
         * Gets or sets an HTML description of the feature.  The HTML is not trusted and should
         * be sanitized before display to the user.
         * @type {String}
         */
        this.description = undefined;

        /**
         * Gets or sets the position of the feature, or undefined if the position is not known.
         *
         * @type {Cartographic}
         */
        this.position = undefined;

        /**
         * Gets or sets the raw data describing the feature.  The raw data may be in any
         * number of formats, such as GeoJSON, KML, etc.
         * @type {Object}
         */
        this.data = undefined;

        /**
         * Gets or sets the image layer of the feature.
         * @type {Object}
         */
        this.imageryLayer = undefined;
    };

    /**
     * Configures the name of this feature by selecting an appropriate property.  The name will be obtained from
     * one of the following sources, in this order: 1) the property with the name 'name', 2) the property with the name 'title',
     * 3) the first property containing the word 'name', 4) the first property containing the word 'title'.  If
     * the name cannot be obtained from any of these sources, the existing name will be left unchanged.
     *
     * @param {Object} properties An object literal containing the properties of the feature.
     */
    ImageryLayerFeatureInfo.prototype.configureNameFromProperties = function(properties) {
        var namePropertyPrecedence = 10;
        var nameProperty;

        for (var key in properties) {
            if (properties.hasOwnProperty(key) && properties[key]) {
                var lowerKey = key.toLowerCase();

                if (namePropertyPrecedence > 1 && lowerKey === 'name') {
                    namePropertyPrecedence = 1;
                    nameProperty = key;
                } else if (namePropertyPrecedence > 2 && lowerKey === 'title') {
                    namePropertyPrecedence = 2;
                    nameProperty = key;
                } else if (namePropertyPrecedence > 3 && /name/i.test(key)) {
                    namePropertyPrecedence = 3;
                    nameProperty = key;
                } else if (namePropertyPrecedence > 4 && /title/i.test(key)) {
                    namePropertyPrecedence = 4;
                    nameProperty = key;
                }
            }
        }

        if (defined(nameProperty)) {
            this.name = properties[nameProperty];
        }
    };

    /**
     * Configures the description of this feature by creating an HTML table of properties and their values.
     *
     * @param {Object} properties An object literal containing the properties of the feature.
     */
    ImageryLayerFeatureInfo.prototype.configureDescriptionFromProperties = function(properties) {
        function describe(properties) {
            var html = '<table class="cesium-infoBox-defaultTable">';
            for (var key in properties) {
                if (properties.hasOwnProperty(key)) {
                    var value = properties[key];
                    if (defined(value)) {
                        if (typeof value === 'object') {
                            html += '<tr><td>' + key + '</td><td>' + describe(value) + '</td></tr>';
                        } else {
                            html += '<tr><td>' + key + '</td><td>' + value + '</td></tr>';
                        }
                    }
                }
            }
            html += '</table>';

            return html;
        }

        this.description = describe(properties);
    };

    return ImageryLayerFeatureInfo;
});
