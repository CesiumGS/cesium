/*global define*/
define([
        '../Core/defaultValue',
        '../Core/getHostname',
        '../Core/jsonp',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Cartesian2',
        './DiscardMissingTileImagePolicy',
        './ImageryProvider',
        './WebMercatorTilingScheme',
        './GeographicTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        getHostname,
        jsonp,
        writeTextToCanvas,
        DeveloperError,
        Cartesian2,
        DiscardMissingTileImagePolicy,
        ImageryProvider,
        WebMercatorTilingScheme,
        GeographicTilingScheme,
        when) {
    "use strict";

    /**
     * Provides tiled imagery hosted by an ArcGIS MapServer.
     *
     * @alias ArcGisMapServerImageryProvider
     * @constructor
     *
     * @param {String} description.url The URL of the ArcGIS MapServer service.
     * @param {TileDiscardPolicy} [description.tileDiscardPolicy] If the service returns "missing" tiles,
     *        these can be filtered out by providing an object which is expected to have a
     *        shouldDiscardImage function.  By default, no tiles will be filtered.
     * @param {Proxy} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     *
     * @see <a href='http://resources.esri.com/help/9.3/arcgisserver/apis/rest/'>ArcGIS Server REST API</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * var esri = new ArcGisMapServerImageryProvider({
     *     url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
     * });
     */
    var ArcGisMapServerImageryProvider = function(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        this._url = description.url;
        this._tileDiscardPolicy = description.tileDiscardPolicy;
        this._proxy = description.proxy;
        this._imageUrlHostnames = [getHostname(this.url)];

        this._tileWidth = undefined;
        this._tileHeight = undefined;
        this._maximumLevel = undefined;
        this._tilingScheme = undefined;
        this._logo = undefined;

        this._ready = false;

        // Grab the details of this MapServer.
        var metadata = jsonp(this._url, {
            parameters : {
                f : 'json'
            },
            proxy : this._proxy
        });

        var that = this;
        this._isReady = when(metadata, function(data) {
            // TODO: support non-tiled MapServers.
            var tileInfo = data.tileInfo;

            that._tileWidth = tileInfo.rows;
            that._tileHeight = tileInfo.cols;

            if (tileInfo.spatialReference.wkid === 102100) {
                that._tilingScheme = new WebMercatorTilingScheme();
            } else if (data.tileInfo.spatialReference.wkid === 4326) {
                that._tilingScheme = new GeographicTilingScheme();
            }
            that._maximumLevel = data.tileInfo.lods.length - 1;

            // Create the copyright message.
            that._logo = writeTextToCanvas(data.copyrightText, {
                font : '12px sans-serif'
            });

            // Install the default tile discard policy if none has been supplied.
            if (typeof that._tileDiscardPolicy === 'undefined') {
                that._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
                    missingImageUrl : that._buildImageUrl(0, 0, that._maximumLevel),
                    pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)],
                    disableCheckIfAllPixelsAreTransparent : true
                });
            }

            that._ready = true;

            return true;
        }, function(e) {
            /*global console*/
            console.error('failed to load metadata: ' + e);
        });
    };

    /**
     * Gets the URL of the ArcGIS MapServer.
     * @returns {String} The URL.
     */
    ArcGisMapServerImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the width of each tile, in pixels.
     *
     * @returns {Number} The width.
     */
    ArcGisMapServerImageryProvider.prototype.getTileWidth = function() {
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.
     *
     * @returns {Number} The height.
     */
    ArcGisMapServerImageryProvider.prototype.getTileHeight = function() {
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.
     *
     * @returns {Number} The maximum level.
     */
    ArcGisMapServerImageryProvider.prototype.getMaximumLevel = function() {
        return this._maximumLevel;
    };

    /**
     * Gets the tiling scheme used by this provider.
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    ArcGisMapServerImageryProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.
     *
     * @returns {Extent} The extent.
     */
    ArcGisMapServerImageryProvider.prototype.getExtent = function() {
        return this._tilingScheme.extent;
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.
     * By default, no tiles will be filtered.
     * @returns {TileDiscardPolicy} The discard policy.
     */
    ArcGisMapServerImageryProvider.prototype.getTileDiscardPolicy = function() {
        return this._tileDiscardPolicy;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    ArcGisMapServerImageryProvider.prototype.isReady = function() {
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
    ArcGisMapServerImageryProvider.prototype.getAvailableHostnames = function(x, y, level) {
        return this._imageUrlHostnames;
    };

    /**
     * Build a URL to retrieve the image for a tile.
     *
     * @param {Number} x The x coordinate of the tile.
     * @param {Number} y The y coordinate of the tile.
     * @param {Number} level The level-of-detail of the tile.
     *
     * @return {String|Promise} Either a string containing the URL, or a Promise for a string
     *                          if the URL needs to be built asynchronously.
     */
    ArcGisMapServerImageryProvider.prototype._buildImageUrl = function(x, y, level) {
        var url = this._url + '/tile/' + level + '/' + y + '/' + x;

        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        return url;
    };

    /**
     * Requests the image for a given tile.
     *
     * @param {Array} hostnames The list of available hostnames, as returned by
     *                {@see getAvailableHostnames}.
     * @param {Number} hostnameIndex The index in the hostnames array of the suggested
     *                 host from which to request the image.
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @return {Promise} A promise for the image that will resolve when the image is available.
     *         If the image is not suitable for display, the promise can resolve to undefined.
     *         The resolved image may be either an Image or a Canvas DOM object.
     */
    ArcGisMapServerImageryProvider.prototype.requestImage = function(hostnames, hostnameIndex, x, y, level) {
        var url = this._buildImageUrl(x, y, level);
        return ImageryProvider.loadImageAndCheckDiscardPolicy(url, this._tileDiscardPolicy);
    };

    /**
     * DOC_TBA
     * @memberof ArcGisMapServerImageryProvider
     */
    ArcGisMapServerImageryProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return ArcGisMapServerImageryProvider;
});