/*global define*/
define([
        '../Core/defaultValue',
        '../Core/getHostname',
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        '../Core/writeTextToCanvas',
        './ImageryProvider',
        './WebMercatorTilingScheme'
    ], function(
        defaultValue,
        getHostname,
        DeveloperError,
        Extent,
        CesiumMath,
        writeTextToCanvas,
        ImageryProvider,
        WebMercatorTilingScheme) {
    "use strict";

    /**
     * Provides tile images hosted by OpenStreetMap.
     *
     * @alias OpenStreetMapImageryProvider
     * @constructor
     *
     * @param {String} description.url The OpenStreetMap url.
     * @param {String} [description.fileExtension='png'] The file extension for images on the server.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {String} [description.credit='MapQuest, Open Street Map and contributors, CC-BY-SA'] A string crediting the data source, which is displayed on the canvas.
     *
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see ArcGisMapServerImageryProvider
     * @see CompositeTileProvider
     *
     * @see <a href='http://wiki.openstreetmap.org/wiki/Main_Page'>OpenStreetMap Wiki</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * // OpenStreetMap tile provider
     * var osm = new OpenStreetMapImageryProvider({
     *     url : 'http://tile.openstreetmap.org/'
     * });
     */
    var OpenStreetMapImageryProvider = function(description) {
        description = defaultValue(description, {});

        this._url = defaultValue(description.url, 'http://tile.openstreetmap.org/');
        this._fileExtension = defaultValue(description.fileExtension, 'png');
        this._proxy = description.proxy;
        this._tileDiscardPolicy = description.tileDiscardPolicy;
        this._imageUrlHostnames = [getHostname(this._url)];

        // TODO: should not hard-code, get from server?
        this._credit = defaultValue(description.credit, 'MapQuest, Open Street Map and contributors, CC-BY-SA');

        this._tilingScheme = new WebMercatorTilingScheme();

        this._tileWidth = 256;
        this._tileHeight = 256;

        this._maximumLevel = 18;

        this._ready = true;

        this._logo = undefined;
    };

    /**
     * Gets the URL of the service hosting the imagery.
     * @returns {String} The URL.
     */
    OpenStreetMapImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the width of each tile, in pixels.
     *
     * @returns {Number} The width.
     */
    OpenStreetMapImageryProvider.prototype.getTileWidth = function() {
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.
     *
     * @returns {Number} The height.
     */
    OpenStreetMapImageryProvider.prototype.getTileHeight = function() {
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.
     *
     * @returns {Number} The maximum level.
     */
    OpenStreetMapImageryProvider.prototype.getMaximumLevel = function() {
        return this._maximumLevel;
    };

    /**
     * Gets the tiling scheme used by this provider.
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    OpenStreetMapImageryProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.
     *
     * @returns {Extent} The extent.
     */
    OpenStreetMapImageryProvider.prototype.getExtent = function() {
        return this._tilingScheme.extent;
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.
     * By default, no tiles will be filtered.
     * @returns {TileDiscardPolicy} The discard policy.
     */
    OpenStreetMapImageryProvider.prototype.getTileDiscardPolicy = function() {
        return this._tileDiscardPolicy;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    OpenStreetMapImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Gets an array containing the host names from which a particular tile image can
     * be requested.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Array} The host name(s) from which the tile can be requested.  The return
     * value may be undefined if this imagery provider does not download data from any hosts.
     */
    OpenStreetMapImageryProvider.prototype.getAvailableHostnames = function(x, y, level) {
        return this._imageUrlHostnames;
    };

    /**
     * Loads the image for <code>tile</code>.
     *
     * @memberof OpenStreetMapImageryProvider
     *
     * @param {Tile} tile The tile to load the image for.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     *
     * @exception {DeveloperError} <code>tile.level</code> is less than zero
     * or greater than <code>maxLevel</code>.
     */
    OpenStreetMapImageryProvider.prototype.requestImage = function(hostnames, hostnameIndex, x, y, level) {
        if (level < 0 || level > this._maximumLevel) {
            throw new DeveloperError('tile.level must be in the range [0, maxLevel].');
        }

        var url = this._url + level + '/' + x + '/' + y + '.' + this._fileExtension;
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        return ImageryProvider.loadImageAndCheckDiscardPolicy(url, this._tileDiscardPolicy);
    };

    /**
     * DOC_TBA
     * @memberof OpenStreetMapImageryProvider
     */
    OpenStreetMapImageryProvider.prototype.getLogo = function() {
        if (!this._logo) {
            this._logo = writeTextToCanvas(this._credit, {
                font : '12px sans-serif'
            });
        }

        return this._logo;
    };

    return OpenStreetMapImageryProvider;
});