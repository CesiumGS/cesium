define([
    '../Core/freezeObject',
    '../Core/DeveloperError',
    './createTileMapServiceImageryProvider',
    './ArcGisMapServerImageryProvider',
    './BingMapsImageryProvider',
    './GoogleEarthEnterpriseMapsProvider',
    './MapboxImageryProvider',
    './SingleTileImageryProvider',
    './UrlTemplateImageryProvider',
    './WebMapServiceImageryProvider',
    './WebMapTileServiceImageryProvider'
], function (freezeObject,
             DeveloperError,
             createTileMapServiceImageryProvider,
             ArcGisMapServerImageryProvider,
             BingMapsImageryProvider,
             GoogleEarthEnterpriseMapsProvider,
             MapboxImageryProvider,
             SingleTileImageryProvider,
             UrlTemplateImageryProvider,
             WebMapServiceImageryProvider,
             WebMapTileServiceImageryProvider) {
    'use strict';

    /**
     * Aliases of available imagery providers.
     * @exports ComposerExternalImageryType
     */
    var ComposerExternalImageryType = {
        ARCGIS_MAPSERVER: 'ARCGIS_MAPSERVER',
        BING: 'BING',
        GOOGLE_EARTH: 'GOOGLE_EARTH',
        MAPBOX: 'MAPBOX',
        SINGLE_TILE: 'SINGLE_TILE',
        TMS: 'TMS',
        URL_TEMPLATE: 'TEMPLATE',
        WMS: 'WMS',
        WMTS: 'WMTS'
    };

    /**
     * Creates an imagery provider from the external imagery type
     * @param {Object} configuration The asset configuration
     * @return {ImageryProvider}
     */
    ComposerExternalImageryType.getProvider = function(configuration) {
        var type = configuration.type;
        if (type === ComposerExternalImageryType.ARCGIS_MAPSERVER) {
            return new ArcGisMapServerImageryProvider(configuration);
        } else if (type === ComposerExternalImageryType.BING) {
            return new BingMapsImageryProvider(configuration);
        } else if (type === ComposerExternalImageryType.GOOGLE_EARTH) {
            return new GoogleEarthEnterpriseMapsProvider(configuration);
        } else if (type === ComposerExternalImageryType.MAPBOX) {
            return new MapboxImageryProvider(configuration);
        } else if (type === ComposerExternalImageryType.SINGLE_TILE) {
            return new SingleTileImageryProvider(configuration);
        } else if (type === ComposerExternalImageryType.TMS) {
            return createTileMapServiceImageryProvider(configuration);
        } else if (type === ComposerExternalImageryType.URL_TEMPLATE) {
            return new UrlTemplateImageryProvider(configuration);
        } else if (type === ComposerExternalImageryType.WMS) {
            return new WebMapServiceImageryProvider(configuration);
        } else if (type === ComposerExternalImageryType.WMTS) {
            return new WebMapTileServiceImageryProvider(configuration);
        }
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('Unrecognized external imagery type: ' + type);
        //>>includeEnd('debug');
    };

    return freezeObject(ComposerExternalImageryType);
});
