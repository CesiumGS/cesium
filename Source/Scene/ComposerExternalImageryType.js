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
     * @param {ComposerExternalImageryType} type The imagery provider type
     * @param {Object} metadata The asset metadata
     * @return {ImageryProvider}
     */
    ComposerExternalImageryType.getProvider = function(type, metadata) {
        if (type === ComposerExternalImageryType.ARCGIS_MAPSERVER) {
            return new ArcGisMapServerImageryProvider(metadata);
        } else if (type === ComposerExternalImageryType.BING) {
            return new BingMapsImageryProvider(metadata);
        } else if (type === ComposerExternalImageryType.GOOGLE_EARTH) {
            return new GoogleEarthEnterpriseMapsProvider(metadata);
        } else if (type === ComposerExternalImageryType.MAPBOX) {
            return new MapboxImageryProvider(metadata);
        } else if (type === ComposerExternalImageryType.SINGLE_TILE) {
            return new SingleTileImageryProvider(metadata);
        } else if (type === ComposerExternalImageryType.TMS) {
            return createTileMapServiceImageryProvider(metadata);
        } else if (type === ComposerExternalImageryType.URL_TEMPLATE) {
            return new UrlTemplateImageryProvider(metadata);
        } else if (type === ComposerExternalImageryType.WMS) {
            return new WebMapServiceImageryProvider(metadata);
        } else if (type === ComposerExternalImageryType.WMTS) {
            return new WebMapTileServiceImageryProvider(metadata);
        }
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('Unrecognized external imagery type: ' + type);
        //>>includeEnd('debug');
    };

    return freezeObject(ComposerExternalImageryType);
});

