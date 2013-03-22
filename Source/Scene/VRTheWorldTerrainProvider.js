/*global define*/
define([
        '../Core/defaultValue',
        '../Core/loadImage',
        '../Core/loadXML',
        '../Core/getImagePixels',
        '../Core/throttleRequestByServer',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Extent',
        '../Core/Math',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/RuntimeError',
        './TerrainProvider',
        './TileProviderError',
        './GeographicTilingScheme',
        './HeightmapTerrainData',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        loadImage,
        loadXML,
        getImagePixels,
        throttleRequestByServer,
        writeTextToCanvas,
        DeveloperError,
        Extent,
        CesiumMath,
        Ellipsoid,
        Event,
        RuntimeError,
        TerrainProvider,
        TileProviderError,
        GeographicTilingScheme,
        HeightmapTerrainData,
        when) {
    "use strict";

    function DataExtent(extent, maxLevel) {
        this.extent = extent;
        this.maxLevel = maxLevel;
    }

    /**
     * A {@link TerrainProvider} that produces terrain geometry by tessellating height maps
     * retrieved from a {@link http://vr-theworld.com/|VT MÄK VR-TheWorld server}.
     *
     * @alias VRTheWorldTerrainProvider
     * @constructor
     *
     * @param {String} description.url The URL of the VR-TheWorld TileMap.
     * @param {Object} [description.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL, if needed.
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid.  If this parameter is not
     *                    specified, the WGS84 ellipsoid is used.
     * @param {String} [description.credit] A string crediting the data source, which is displayed on the canvas.
     *
     * @see TerrainProvider
     *
     * @example
     * var terrainProvider = new VRTheWorldTerrainProvider({
     *   url : 'http://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/'
     * });
     * centralBody.terrainProvider = terrainProvider;
     */
    var VRTheWorldTerrainProvider = function VRTheWorldTerrainProvider(description) {
        if (typeof description === 'undefined' || typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        this._url = description.url;
        if (this._url.length > 0 && this._url[this._url.length - 1] !== '/') {
            this._url += '/';
        }

        this._errorEvent = new Event();
        this._ready = false;

        this._proxy = description.proxy;

        this._terrainDataStructure = {
                heightScale : 1.0 / 1000.0,
                heightOffset : -1000.0,
                elementsPerHeight : 3,
                stride : 4,
                elementMultiplier : 256.0,
                isBigEndian : true
            };

        if (typeof description.credit !== 'undefined') {
            // Create the copyright message.
            this._logo = writeTextToCanvas(description.credit, {
                font : '12px sans-serif'
            });
        }

        this._tilingScheme = undefined;
        this._extents = [];

        var that = this;
        var metadataError;
        var ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);

        function metadataSuccess(xml) {
            var srs = xml.getElementsByTagName('SRS')[0].textContent;
            if (srs === 'EPSG:4326') {
                that._tilingScheme = new GeographicTilingScheme({ ellipsoid : ellipsoid });
            } else {
                metadataFailure('SRS ' + srs + ' is not supported.');
                return;
            }

            var tileFormat = xml.getElementsByTagName('TileFormat')[0];
            that._heightmapWidth = parseInt(tileFormat.getAttribute('width'), 10);
            that._heightmapHeight = parseInt(tileFormat.getAttribute('height'), 10);
            that._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(ellipsoid, Math.min(that._heightmapWidth, that._heightmapHeight), that._tilingScheme.getNumberOfXTilesAtLevel(0));

            var dataExtents = xml.getElementsByTagName('DataExtent');

            for (var i = 0; i < dataExtents.length; ++i) {
                var dataExtent = dataExtents[i];

                var west = CesiumMath.toRadians(parseFloat(dataExtent.getAttribute('minx')));
                var south = CesiumMath.toRadians(parseFloat(dataExtent.getAttribute('miny')));
                var east = CesiumMath.toRadians(parseFloat(dataExtent.getAttribute('maxx')));
                var north = CesiumMath.toRadians(parseFloat(dataExtent.getAttribute('maxy')));
                var maxLevel = parseInt(dataExtent.getAttribute('maxlevel'), 10);

                that._extents.push(new DataExtent(new Extent(west, south, east, north), maxLevel));
            }

            that._ready = true;
        }

        function metadataFailure(e) {
            var message = typeof e === 'undefined' ? 'An error occurred while accessing ' + that._url + '.' : e;
            metadataError = TileProviderError.handleError(metadataError, that, that._errorEvent, message, undefined, undefined, undefined, requestMetadata);
        }

        function requestMetadata() {
            when(loadXML(that._url), metadataSuccess, metadataFailure);
        }

        requestMetadata();
    };

    /**
     * Requests the geometry for a given tile.  This function should not be called before
     * {@link ArcGisImageServerTerrainProvider#isReady} returns true.  The result includes terrain
     * data and indicates that all child tiles are available.
     *
     * @memberof VRTheWorldTerrainProvider
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
    VRTheWorldTerrainProvider.prototype.requestTileGeometry = function(x, y, level, throttleRequests) {
        if (!this.isReady()) {
            throw new DeveloperError('requestTileGeometry must not be called before isReady returns true.');
        }

        var yTiles = this._tilingScheme.getNumberOfYTilesAtLevel(level);
        var url = this._url + level + '/' + x + '/' + (yTiles - y - 1) + '.tif?cesium=true';

        var proxy = this._proxy;
        if (typeof proxy !== 'undefined') {
            url = proxy.getURL(url);
        }

        var promise;

        throttleRequests = defaultValue(throttleRequests, true);
        if (throttleRequests) {
            promise = throttleRequestByServer(url, loadImage);
            if (typeof promise === 'undefined') {
                return undefined;
            }
        } else {
            promise = loadImage(url);
        }

        var that = this;
        return when(promise, function(image) {
            return new HeightmapTerrainData({
                buffer : getImagePixels(image),
                width : that._heightmapWidth,
                height : that._heightmapHeight,
                childTileMask : getChildMask(that, x, y, level),
                structure : that._terrainDataStructure
            });
        });
    };

    /**
     * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
     * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
     * are passed an instance of {@link TileProviderError}.
     *
     * @memberof VRTheWorldTerrainProvider
     *
     * @returns {Event} The event.
     */
    VRTheWorldTerrainProvider.prototype.getErrorEvent = function() {
        return this._errorEvent;
    };

    /**
     * Gets the maximum geometric error allowed in a tile at a given level.
     *
     * @memberof VRTheWorldTerrainProvider
     *
     * @param {Number} level The tile level for which to get the maximum geometric error.
     * @returns {Number} The maximum geometric error.
     */
    VRTheWorldTerrainProvider.prototype.getLevelMaximumGeometricError = function(level) {
        if (!this.isReady()) {
            throw new DeveloperError('requestTileGeometry must not be called before isReady returns true.');
        }
        return this._levelZeroMaximumGeometricError / (1 << level);
    };

    /**
     * Gets the logo to display when this terrain provider is active.  Typically this is used to credit
     * the source of the terrain.  This function should not be called before {@link ArcGisImageServerTerrainProvider#isReady} returns true.
     *
     * @memberof VRTheWorldTerrainProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     *
     * @exception {DeveloperError} <code>getLogo</code> must not be called before the terrain provider is ready.
     */
    VRTheWorldTerrainProvider.prototype.getLogo = function() {
        return this._logo;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link ArcGisImageServerTerrainProvider#isReady} returns true.
     *
     * @memberof VRTheWorldTerrainProvider
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     *
     * @exception {DeveloperError} <code>getTilingScheme</code> must not be called before the terrain provider is ready.
     */
    VRTheWorldTerrainProvider.prototype.getTilingScheme = function() {
        if (!this.isReady()) {
            throw new DeveloperError('requestTileGeometry must not be called before isReady returns true.');
        }
        return this._tilingScheme;
    };

    /**
     * Gets a value indicating whether or not the provider includes a water mask.  The water mask
     * indicates which areas of the globe are water rather than land, so they can be rendered
     * as a reflective surface with animated waves.
     *
     * @memberof VRTheWorldTerrainProvider
     *
     * @returns {Boolean} True if the provider has a water mask; otherwise, false.
     */
    VRTheWorldTerrainProvider.prototype.hasWaterMask = function() {
        return false;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof VRTheWorldTerrainProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    VRTheWorldTerrainProvider.prototype.isReady = function() {
        return this._ready;
    };

    var extentScratch = new Extent();

    function getChildMask(provider, x, y, level) {
        var tilingScheme = provider._tilingScheme;
        var extents = provider._extents;
        var parentExtent = tilingScheme.tileXYToExtent(x, y, level);

        var childMask = 0;

        for (var i = 0; i < extents.length && childMask !== 15; ++i) {
            var extent = extents[i];
            if (extent.maxLevel <= level) {
                continue;
            }

            var testExtent = extent.extent;

            var intersection = testExtent.intersectWith(parentExtent, extentScratch);
            if (!intersection.isEmpty()) {
                // Parent tile is inside this extent, so at least one child is, too.
                if (isTileInExtent(tilingScheme, testExtent, x * 2, y * 2, level + 1)) {
                    childMask |= 4; // northwest
                }
                if (isTileInExtent(tilingScheme, testExtent, x * 2 + 1, y * 2, level + 1)) {
                    childMask |= 8; // northeast
                }
                if (isTileInExtent(tilingScheme, testExtent, x * 2, y * 2 + 1, level + 1)) {
                    childMask |= 1; // southwest
                }
                if (isTileInExtent(tilingScheme, testExtent, x * 2 + 1, y * 2 + 1, level + 1)) {
                    childMask |= 2; // southeast
                }
            }
        }

        return childMask;
    }

    function isTileInExtent(tilingScheme, extent, x, y, level) {
        var tileExtent = tilingScheme.tileXYToExtent(x, y, level);
        return !tileExtent.intersectWith(extent, extentScratch).isEmpty();
    }

    return VRTheWorldTerrainProvider;
});