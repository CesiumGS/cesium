/*global define*/
define([
        '../Core/deprecationWarning',
        './GoogleEarthEnterpriseMapsProvider'
    ], function(
        deprecationWarning,
        GoogleEarthEnterpriseMapsProvider) {
    'use strict';

    /**
     * Provides tiled imagery using the Google Earth Imagery API.
     *
     * Notes: This imagery provider was deprecated in Cesium 1.35 and replaced with {@link GoogleEarthEnterpriseMapsProvider}.
     *        These are for use with the 2D Maps API. For 3D Earth API uses, see {@link GoogleEarthEngerpriseImageryProvider}.
     *        GoogleEarthImageryProvider will be removed in Cesium 1.37.
     *
     * @alias GoogleEarthImageryProvider
     * @constructor
     * @deprecated
     *
     * @see GoogleEarthEnterpriseMapsProvider
     *
     * @example
     * var google = new Cesium.GoogleEarthImageryProvider({
     *     url : 'https://earth.localdomain',
     *     channel : 1008
     * });
     */
    function GoogleEarthImageryProvider(options) {
        deprecationWarning('GoogleEarthImageryProvider', 'GoogleEarthImageryProvider was deprecated in Cesium 1.35, it will be removed in 1.37. Use GoogleEarthEnterpriseMapsProvider instead.');

        return new GoogleEarthEnterpriseMapsProvider(options);
    }

    return GoogleEarthImageryProvider;
});

