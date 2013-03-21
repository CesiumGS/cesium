/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Ellipsoid',
        '../Core/Event',
        './HeightmapTerrainData',
        './TerrainProvider',
        './GeographicTilingScheme'
    ], function(
        defaultValue,
        Ellipsoid,
        Event,
        HeightmapTerrainData,
        TerrainProvider,
        GeographicTilingScheme) {
    "use strict";

    /**
     * A very simple {@link TerrainProvider} that produces geometry by tessellating an ellipsoidal
     * surface.
     *
     * @alias EllipsoidTerrainProvider
     * @constructor
     *
     * @param {TilingScheme} [description.tilingScheme] The tiling scheme specifying how the ellipsoidal
     * surface is broken into tiles.  If this parameter is not provided, a {@link GeographicTilingScheme}
     * is used.
     * @param {Ellipsoid} [description.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     * this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
     * parameter is specified, the WGS84 ellipsoid is used.
     *
     * @see TerrainProvider
     */
    var EllipsoidTerrainProvider = function EllipsoidTerrainProvider(description) {
        description = defaultValue(description, {});

        this._tilingScheme = description.tilingScheme;
        if (typeof this._tilingScheme === 'undefined') {
            this._tilingScheme = new GeographicTilingScheme({
                ellipsoid : defaultValue(description.ellipsoid, Ellipsoid.WGS84)
            });
        }

        // Note: the 64 below does NOT need to match the actual vertex dimensions, because
        // the ellipsoid is significantly smoother than actual terrain.
        this._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(this._tilingScheme.getEllipsoid(), 64, this._tilingScheme.getNumberOfXTilesAtLevel(0));

        var width = 16;
        var height = 16;
        this._terrainData = new HeightmapTerrainData({
            buffer : new Uint8Array(width * height),
            width : 16,
            height : 16
        });

        this._errorEvent = new Event();
    };

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link TerrainProvider#isReady} returns true.  The result includes terrain
     * data and indicates that all child tiles are available.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @param {Boolean} [throttleRequests=true] True if the number of simultaneous requests should be limited,
     *                  or false if the request should be initiated regardless of the number of requests
     *                  already in progress.
     * @returns {Promise|TerrainData} A promise for the requested geometry.  If this method
     *          returns undefined instead of a promise, it is an indication that too many requests are already
     *          pending and the request will be retried later.
     */
    EllipsoidTerrainProvider.prototype.requestTileGeometry = function(x, y, level, throttleRequests) {
        return this._terrainData;
    };

    /**
     * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @returns {Event} The event.
     */
    EllipsoidTerrainProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
    };

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    EllipsoidTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    /**
     * Gets the logo to display when this terrain provider is active.  Typically this is used to credit
     * the source of the terrain.  This function should not be called before {@link EllipsoidTerrainProvider#isReady} returns true.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     *
     * @exception {DeveloperError} <code>getLogo</code> must not be called before the terrain provider is ready.
     */
    EllipsoidTerrainProvider.prototype.getLogo = function() {
        return undefined;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link EllipsoidTerrainProvider#isReady} returns true.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @returns {GeographicTilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the terrain provider is ready.
     */
    EllipsoidTerrainProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets a value indicating whether or not the provider includes a water mask.  The water mask
     * indicates which areas of the globe are water rather than land, so they can be rendered
     * as a reflective surface with animated waves.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @returns {Boolean} True if the provider has a water mask; otherwise, false.
     */
    EllipsoidTerrainProvider.prototype.hasWaterMask = function() {
        return false;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof EllipsoidTerrainProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    EllipsoidTerrainProvider.prototype.isReady = function() {
        return true;
    };

    return EllipsoidTerrainProvider;
});