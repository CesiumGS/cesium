/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/Cartesian2',
        '../Core/DeveloperError',
        '../Core/Event',
        './BingMapsStyle',
        './DiscardMissingTileImagePolicy',
        './GeographicTilingScheme',
        './ImageryProvider',
        './TileProviderError',
        './WebMercatorTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        jsonp,
        Cartesian2,
        DeveloperError,
        Event,
        BingMapsStyle,
        DiscardMissingTileImagePolicy,
        GeographicTilingScheme,
        ImageryProvider,
        TileProviderError,
        WebMercatorTilingScheme,
        when) {
    "use strict";

    /**
     * An {@link ImageryProvider} that draws a box around every rendered tile in the tiling scheme, and draws
     * a label inside it indicating the X, Y, Level coordinates of the tile.  This is mostly useful for
     * debugging terrain and imagery rendering problems.
     *
     * @alias TileCoordinatesImageryProvider
     * @constructor
     *
     * @param {TilingScheme} [description.tilingScheme] The tiling scheme for which to draw tiles.
     * @param {String} [description.color] The color to draw the tile box and label, specified as a CSS color string.
     */
    var TileCoordinatesImageryProvider = function TileCoordinatesImageryProvider(description) {
        description = defaultValue(description, {});

        this._tilingScheme = defaultValue(description.tilingScheme, new GeographicTilingScheme());
        this._color = defaultValue(description.color, 'yellow');
        this._errorEvent = new Event();
        this._tileWidth = defaultValue(description.tileWidth, 256);
        this._tileHeight = defaultValue(description.tileHeight, 256);
    };

    /**
     * Gets the width of each tile, in pixels.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {Number} The width.
     *
     * @exception {DeveloperError} <code>getTileWidth</code> must not be called before the imagery provider is ready.
     */
    TileCoordinatesImageryProvider.prototype.getTileWidth = function() {
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {Number} The height.
     *
     * @exception {DeveloperError} <code>getTileHeight</code> must not be called before the imagery provider is ready.
     */
    TileCoordinatesImageryProvider.prototype.getTileHeight = function() {
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {Number} The maximum level.
     *
     * @exception {DeveloperError} <code>getMaximumLevel</code> must not be called before the imagery provider is ready.
     */
    TileCoordinatesImageryProvider.prototype.getMaximumLevel = function() {
        return undefined;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the imagery provider is ready.
     */
    TileCoordinatesImageryProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {Extent} The extent.
     *
     * @exception {DeveloperError} <code>getExtent</code> must not be called before the imagery provider is ready.
     */
    TileCoordinatesImageryProvider.prototype.getExtent = function() {
        return this._tilingScheme.getExtent();
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {TileDiscardPolicy} The discard policy.
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     *
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    TileCoordinatesImageryProvider.prototype.getTileDiscardPolicy = function() {
        return undefined;
    };

    /**
     * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {Event} The event.
     */
    TileCoordinatesImageryProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    TileCoordinatesImageryProvider.prototype.isReady = function() {
        return true;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     *
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    TileCoordinatesImageryProvider.prototype.requestImage = function(x, y, level) {
        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        var context = canvas.getContext('2d');

        context.strokeStyle = this._color;
        context.lineWidth = 2;
        context.strokeRect(1, 1, 255, 255);

        var label = 'L' + level + 'X' + x + 'Y' + y;
        context.font = 'bold 25px Arial';
        context.textAlign = 'center';
        context.fillStyle = 'black';
        context.fillText(label, 127, 127);
        context.fillStyle = this._color;
        context.fillText(label, 124, 124);

        return canvas;
    };

    /**
     * Gets the logo to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link BingMapsImageryProvider#isReady} returns true.
     *
     * @memberof TileCoordinatesImageryProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     *
     * @exception {DeveloperError} <code>getLogo</code> must not be called before the imagery provider is ready.
     */
    TileCoordinatesImageryProvider.prototype.getLogo = function() {
        return undefined;
    };

    return TileCoordinatesImageryProvider;
});