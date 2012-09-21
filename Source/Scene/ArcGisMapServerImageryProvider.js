/*global define*/
define([
        '../Core/defaultValue',
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
     * Provides tiled imagery hosted by an ArcGIS MapServer.  The server's pre-cached tiles are
     * used, if available.
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
     * @see OpenStreetMapImageryProvider
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

        this._tileWidth = undefined;
        this._tileHeight = undefined;
        this._maximumLevel = undefined;
        this._tilingScheme = undefined;
        this._logo = undefined;
		this._useTiles = true;

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
            if (typeof tileInfo === 'undefined') {
                that._tileWidth = 256;
                that._tileHeight = 256;
                that._tilingScheme = new GeographicTilingScheme();
                that._maximumLevel = 25;
                that._useTiles = false;
            } else {
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
                        missingImageUrl : buildImageUrl(that, 0, 0, that._maximumLevel),
                        pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)],
                        disableCheckIfAllPixelsAreTransparent : true
				    });
                }
            }

            that._ready = true;

            return true;
        }, function(e) {
            /*global console*/
            console.error('failed to load metadata: ' + e);
        });
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var url;
        if (imageryProvider._useTiles) {
            url = imageryProvider._url + '/tile/' + level + '/' + y + '/' + x;
        } else {
            var nativeExtent = imageryProvider._tilingScheme.tileXYToNativeExtent(x, y, level);
            var bbox = nativeExtent.west + '%2C' + nativeExtent.south + '%2C' + nativeExtent.east + '%2C' + nativeExtent.north;

            url = imageryProvider._url + '/export?';
            url += 'bbox=' + bbox;
            url += '&bboxSR=4326&layers=&layerDefs=&size=256%2C256&imageSR=4326&format=png&transparent=true&dpi=&time=&layerTimeOptions=&dynamicLayers=&gdbVersion=&mapScale=&f=image';
        }

        var proxy = imageryProvider._proxy;
        if (typeof proxy !== 'undefined') {
            url = proxy.getURL(url);
        }

        return url;
    }

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
     * Requests the image for a given tile.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @return {Promise} A promise for the image that will resolve when the image is available, or
     *         undefined if there are too many active requests to the server, and the request
     *         should be retried later.  If the resulting image is not suitable for display,
     *         the promise can resolve to undefined.  The resolved image may be either an
     *         Image or a Canvas DOM object.
     */
    ArcGisMapServerImageryProvider.prototype.requestImage = function(x, y, level) {
        var url = buildImageUrl(this, x, y, level);
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