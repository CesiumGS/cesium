/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/freezeObject',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Extent',
        './ImageryProvider',
        './WebMercatorTilingScheme',
        './GeographicTilingScheme'
    ], function(
        clone,
        defaultValue,
        freezeObject,
        writeTextToCanvas,
        DeveloperError,
        Event,
        Extent,
        ImageryProvider,
        WebMercatorTilingScheme,
        GeographicTilingScheme) {
    "use strict";

    /**
     * Provides tiled imagery hosted by a Web Map Service (WMS) server.
     *
     * @alias WebMapServiceImageryProvider
     * @constructor
     *
     * @param {String} description.url The URL of the WMS service.
     * @param {String} description.layers The layers to include, separated by commas.
     * @param {Object} [description.parameters=WebMapServiceImageryProvider.DefaultParameters] Additional parameters to pass to the WMS server in the GetMap URL.
     * @param {Extent} [description.extent=Extent.MAX_VALUE] The extent of the layer.
     * @param {Number} [description.maximumLevel] The maximum level-of-detail supported by the imagery provider.
     *        If not specified, there is no limit.
     * @param {String} [description.credit] A string crediting the data source, which is displayed on the canvas.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     * @exception {DeveloperError} <code>description.layers</code> is required.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see OpenStreetMapImageryProvider
     *
     * @see <a href='http://resources.esri.com/help/9.3/arcgisserver/apis/rest/'>ArcGIS Server REST API</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * var provider = new WebMapServiceImageryProvider({
     *     url: 'http://sampleserver1.arcgisonline.com/ArcGIS/services/Specialty/ESRI_StatesCitiesRivers_USA/MapServer/WMSServer',
     *     layers : '0',
     *     proxy: new Cesium.DefaultProxy('/proxy/')
     * });
     */
    var WebMapServiceImageryProvider = function WebMapServiceImageryProvider(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        if (typeof description.layers === 'undefined') {
            throw new DeveloperError('description.layers is required.');
        }

        this._url = description.url;
        this._tileDiscardPolicy = description.tileDiscardPolicy;
        this._proxy = description.proxy;
        this._layers = description.layers;

        // Merge the parameters with the defaults, and make all parameter names lowercase
        var parameters = clone(WebMapServiceImageryProvider.DefaultParameters);
        if (typeof description.parameters !== 'undefined') {
            for (var parameter in description.parameters) {
                if (description.parameters.hasOwnProperty(parameter)) {
                    var parameterLowerCase = parameter.toLowerCase();
                    parameters[parameterLowerCase] = description.parameters[parameter];
                }
            }
        }

        this._parameters = parameters;

        this._tileWidth = 256;
        this._tileHeight = 256;
        this._maximumLevel = description.maximumLevel; // undefined means no limit

        var extent = defaultValue(description.extent, Extent.MAX_VALUE);
        this._tilingScheme = new GeographicTilingScheme({
            extent : extent
        });

        if (typeof description.credit !== 'undefined') {
            this._logo = writeTextToCanvas(description.credit, {
                font : '12px sans-serif'
            });
        }

        this._errorEvent = new Event();

        this._ready = true;
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var url = imageryProvider._url;
        var indexOfQuestionMark = url.indexOf('?');
        if (indexOfQuestionMark >= 0 && indexOfQuestionMark < url.length - 1) {
            if (url[url.length - 1] !== '&') {
                url += '&';
            }
        } else if (indexOfQuestionMark < 0) {
            url += '?';
        }

        var parameters = imageryProvider._parameters;
        for (var parameter in parameters) {
            if (parameters.hasOwnProperty(parameter)) {
                url += parameter + '=' + parameters[parameter] + '&';
            }
        }

        if (typeof parameters.layers === 'undefined') {
            url += 'layers=' + imageryProvider._layers + '&';
        }

        if (typeof parameters.srs === 'undefined') {
            url += 'srs=EPSG:4326&';
        }

        if (typeof parameters.bbox === 'undefined') {
            var nativeExtent = imageryProvider._tilingScheme.tileXYToNativeExtent(x, y, level);
            var bbox = nativeExtent.west + ',' + nativeExtent.south + ',' + nativeExtent.east + ',' + nativeExtent.north;
            url += 'bbox=' + bbox + '&';
        }

        if (typeof parameters.width === 'undefined') {
            url += 'width=256&';
        }

        if (typeof parameters.height === 'undefined') {
            url += 'height=256&';
        }

        var proxy = imageryProvider._proxy;
        if (typeof proxy !== 'undefined') {
            url = proxy.getURL(url);
        }

        return url;
    }

    /**
     * Gets the URL of the WMS server.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {String} The URL.
     */
    WebMapServiceImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the proxy used by this provider.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {Proxy} The proxy.
     *
     * @see DefaultProxy
     */
    WebMapServiceImageryProvider.prototype.getProxy = function() {
        return this._proxy;
    };

    /**
     * Gets the names of the WMS layers, separated by commas.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {String} The layer names.
     */
    WebMapServiceImageryProvider.prototype.getLayers = function() {
        return this._layers;
    };

    /**
     * Gets the width of each tile, in pixels.  This function should
     * not be called before {@link WebMapServiceImageryProvider#isReady} returns true.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {Number} The width.
     *
     * @exception {DeveloperError} <code>getTileWidth</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.getTileWidth = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileWidth must not be called before the imagery provider is ready.');
        }
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link WebMapServiceImageryProvider#isReady} returns true.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {Number} The height.
     *
     * @exception {DeveloperError} <code>getTileHeight</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.getTileHeight = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileHeight must not be called before the imagery provider is ready.');
        }
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link WebMapServiceImageryProvider#isReady} returns true.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {Number} The maximum level.
     *
     * @exception {DeveloperError} <code>getMaximumLevel</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.getMaximumLevel = function() {
        if (!this._ready) {
            throw new DeveloperError('getMaximumLevel must not be called before the imagery provider is ready.');
        }
        return this._maximumLevel;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link WebMapServiceImageryProvider#isReady} returns true.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.getTilingScheme = function() {
        if (!this._ready) {
            throw new DeveloperError('getTilingScheme must not be called before the imagery provider is ready.');
        }
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link WebMapServiceImageryProvider#isReady} returns true.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {Extent} The extent.
     *
     * @exception {DeveloperError} <code>getExtent</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.getExtent = function() {
        if (!this._ready) {
            throw new DeveloperError('getExtent must not be called before the imagery provider is ready.');
        }
        return this._tilingScheme.getExtent();
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.  This function should
     * not be called before {@link WebMapServiceImageryProvider#isReady} returns true.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {TileDiscardPolicy} The discard policy.
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     *
     * @exception {DeveloperError} <code>getTileDiscardPolicy</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.getTileDiscardPolicy = function() {
        if (!this._ready) {
            throw new DeveloperError('getTileDiscardPolicy must not be called before the imagery provider is ready.');
        }
        return this._tileDiscardPolicy;
    };

    /**
     * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {Event} The event.
     */
    WebMapServiceImageryProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    WebMapServiceImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link WebMapServiceImageryProvider#isReady} returns true.
     *
     * @memberof WebMapServiceImageryProvider
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
     * @exception {DeveloperError} <code>requestImage</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.requestImage = function(x, y, level) {
        if (!this._ready) {
            throw new DeveloperError('requestImage must not be called before the imagery provider is ready.');
        }
        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(url);
    };

    /**
     * Gets the logo to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link WebMapServiceImageryProvider#isReady} returns true.
     *
     * @memberof WebMapServiceImageryProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     *
     * @exception {DeveloperError} <code>getLogo</code> must not be called before the imagery provider is ready.
     */
    WebMapServiceImageryProvider.prototype.getLogo = function() {
        if (!this._ready) {
            throw new DeveloperError('getLogo must not be called before the imagery provider is ready.');
        }
        return this._logo;
    };

    /**
     * The default parameters to include in the WMS URL to obtain images.  The values are as follows:
     *    service=WMS
     *    version=1.1.1
     *    request=GetMap
     *    styles=
     *    format=image/jpeg
     *
     * @memberof WebMapServiceImageryProvider
     */
    WebMapServiceImageryProvider.DefaultParameters = freezeObject({
        service : 'WMS',
        version : '1.1.1',
        request : 'GetMap',
        styles : '',
        format : 'image/jpeg'
    });

    return WebMapServiceImageryProvider;
});
