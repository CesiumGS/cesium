/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartographic',
        '../Core/Math',
        '../Core/Credit',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/GeographicTilingScheme',
        '../Core/loadXML',
        '../Core/Rectangle',
        '../Core/TileProviderError',
        '../Core/WebMercatorTilingScheme',
        '../ThirdParty/when',
        './ImageryProvider'
    ], function(
        Cartesian2,
        Cartographic,
        CesiumMath,
        Credit,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        GeographicTilingScheme,
        loadXML,
        Rectangle,
        TileProviderError,
        WebMercatorTilingScheme,
        when,
        ImageryProvider) {
    "use strict";

    /**
     * Provides imagery by requesting tiles using a specified URL template.
     *
     * @alias UrlTemplateImageryProvider
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {String} [options.url='']  The URL template to use to request tiles.  It has the following keywords:
     * <ul>
     *  <li> <code>{z}</code>: The level of the tile in the tiling scheme.  Level zero is the root of the quadtree pyramid.</li>
     *  <li> <code>{x}</code>: The tile X coordinate in the tiling scheme, where 0 is the Westernmost tile.</li>
     *  <li> <code>{y}</code>: The tile Y coordinate in the tiling scheme, where 0 is the Northernmost tile.</li>
     *  <li> <code>{s}</code>: One of the available subdomains, used to overcome browser limits on the number of simultaneous requests per host.</li>
     *  <li> <code>{reverseX}</code>: The tile X coordinate in the tiling scheme, where 0 is the Easternmost tile.</li>
     *  <li> <code>{reverseY}</code>: The tile Y coordinate in the tiling scheme, where 0 is the Southernmost tile.</li>
     *  <li> <code>{westDegrees}</code>: The Western edge of the tile in geodetic degrees.</li>
     *  <li> <code>{southDegrees}</code>: The Southern edge of the tile in geodetic degrees.</li>
     *  <li> <code>{eastDegrees}</code>: The Eastern edge of the tile in geodetic degrees.</li>
     *  <li> <code>{northDegrees}</code>: The Northern edge of the tile in geodetic degrees.</li>
     *  <li> <code>{westProjected}</code>: The Western edge of the tile in projected coordinates of the tiling scheme.</li>
     *  <li> <code>{southProjected}</code>: The Southern edge of the tile in projected coordinates of the tiling scheme.</li>
     *  <li> <code>{eastProjected}</code>: The Eastern edge of the tile in projected coordinates of the tiling scheme.</li>
     *  <li> <code>{northProjected}</code>: The Northern edge of the tile in projected coordinates of the tiling scheme.</li>
     * </ul>
     * @param {String|String[]} [options.subdomains='abc'] The subdomains to use for the <code>{s}</code> placeholder in the URL template.
     *                          If this parameter is a single string, each character in the string is a subdomain.  If it is
     *                          an array, each element in the array is a subdomain.
     * @param {Object} [options.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {Credit|String} [options.credit=''] A credit for the data source, which is displayed on the canvas.
     * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.  Take care when specifying
     *                 this that the number of tiles at the minimum level is small, such as four or less.  A larger number is likely
     *                 to result in rendering problems.
     * @param {Number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle, in radians, covered by the image.
     * @param {TilingScheme} [options.tilingScheme=WebMercatorTilingScheme] The tiling scheme specifying how the ellipsoidal
     * surface is broken into tiles.  If this parameter is not provided, a {@link WebMercatorTilingScheme}
     * is used.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
     *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead. If neither
     *                    parameter is specified, the WGS84 ellipsoid is used.
     * @param {Number} [options.tileWidth=256] Pixel width of image tiles.
     * @param {Number} [options.tileHeight=256] Pixel height of image tiles.
     * @param {Boolean} [options.hasAlphaChannel=true] true if the images provided by this imagery provider
     *                  include an alpha channel; otherwise, false.  If this property is false, an alpha channel, if
     *                  present, will be ignored.  If this property is true, any images without an alpha channel will
     *                  be treated as if their alpha is 1.0 everywhere.  When this property is false, memory usage
     *                  and texture upload time are potentially reduced.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     *
     * @example
     * // Access Natural Earth II imagery, which uses a TMS tiling scheme and Geographic (EPSG:4326) project
     * var tms = new Cesium.UrlTemplateImageryProvider({
     *     url : '//cesiumjs.org/tilesets/imagery/naturalearthii/{z}/{x}/{reverseY}.jpg',
     *     credit : '© Analytical Graphics, Inc.',
     *     tilingScheme : new Cesium.GeographicTilingScheme(),
     *     maximumLevel : 5
     * });
     * // Access the CartoDB Positron basemap, which uses an OpenStreetMap-like tiling scheme.
     * var positron = new Cesium.UrlTemplateImageryProvider({
     *     url : 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
     *     credit : 'Map tiles by CartoDB, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
     * });
     * // Access a Web Map Service (WMS) server.
     * var wms = new Cesium.UrlTemplateImageryProvider({
     *    url : 'https://programs.communications.gov.au/geoserver/ows?tiled=true&' +
     *          'transparent=true&format=image%2Fpng&exceptions=application%2Fvnd.ogc.se_xml&' +
     *          'styles=&service=WMS&version=1.1.1&request=GetMap&' +
     *          'layers=public%3AMyBroadband_Availability&srs=EPSG%3A3857&' +
     *          'bbox={westProjected}%2C{southProjected}%2C{eastProjected}%2C{northProjected}&' +
     *          'width=256&height=256',
     *    rectangle : Cesium.Rectangle.fromDegrees(96.799393, -43.598214999057824, 153.63925700000001, -9.2159219997013)
     * });
     */
    var UrlTemplateImageryProvider = function UrlTemplateImageryProvider(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this._url = options.url;
        this._proxy = options.proxy;
        this._tileDiscardPolicy = options.tileDiscardPolicy;
        this._errorEvent = new Event();
        
        this._subdomains = options.subdomains;
        if (Array.isArray(this._subdomains)) {
            this._subdomains = this._subdomains.slice();
        } else if (defined(this._subdomains) && this._subdomains.length > 0) {
            this._subdomains = this._subdomains.split('');
        } else {
            this._subdomains = ['a', 'b', 'c'];
        }

        this._tileWidth = defaultValue(options.tileWidth, 256);
        this._tileHeight = defaultValue(options.tileHeight, 256);
        this._minimumLevel = defaultValue(options.minimumLevel, 0);
        this._maximumLevel = options.maximumLevel;
        this._tilingScheme = defaultValue(options.tilingScheme, new WebMercatorTilingScheme({ ellipsoid : options.ellipsoid }));
        this._rectangle = defaultValue(options.rectangle, this._tilingScheme.rectangle);
        this._hasAlphaChannel = defaultValue(options.hasAlphaChannel, true);

        var credit = options.credit;
        if (typeof credit === 'string') {
            credit = new Credit(credit);
        }
        this._credit = credit;

        var url = this._url;
        var parts = [];
        var nextIndex = 0;
        var minIndex;
        var minTag;
        var tagList = Object.keys(tags);

        while (nextIndex < url.length) {
            minIndex = Number.MAX_VALUE;
            minTag = undefined;

            for (var i = 0; i < tagList.length; ++i) {
                var thisIndex = url.indexOf(tagList[i], nextIndex);
                if (thisIndex >= 0 && thisIndex < minIndex) {
                    minIndex = thisIndex;
                    minTag = tagList[i];
                }
            }

            if (!defined(minTag)) {
                parts.push(url.substring(nextIndex));
                nextIndex = url.length;
            } else {
                if (nextIndex < minIndex) {
                    parts.push(url.substring(nextIndex, minIndex));
                }
                parts.push(tags[minTag]);
                nextIndex = minIndex + minTag.length;
            }
        }

        this._urlParts = parts;
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        degreesScratchComputed = false;
        projectedScratchComputed = false;

        var url = '';
        var parts = imageryProvider._urlParts;
        for (var i = 0; i < parts.length; ++i) {
            var part = parts[i];
            if (typeof part === 'string') {
                url += part;
            } else {
                url += encodeURIComponent(part(imageryProvider, x, y, level));
            }
        }

        var proxy = imageryProvider._proxy;
        if (defined(proxy)) {
            url = proxy.getURL(url);
        }

        return url;
    }

    defineProperties(UrlTemplateImageryProvider.prototype, {
        /**
         * Gets the URL template to use to request tiles.  It has the following keywords:
         * <ul>
         *  <li> <code>{z}</code>: The level of the tile in the tiling scheme.  Level zero is the root of the quadtree pyramid.</li>
         *  <li> <code>{x}</code>: The tile X coordinate in the tiling scheme, where 0 is the Westernmost tile.</li>
         *  <li> <code>{y}</code>: The tile Y coordinate in the tiling scheme, where 0 is the Northernmost tile.</li>
         *  <li> <code>{s}</code>: One of the available subdomains, used to overcome browser limits on the number of simultaneous requests per host.</li>
         *  <li> <code>{reverseX}</code>: The tile X coordinate in the tiling scheme, where 0 is the Easternmost tile.</li>
         *  <li> <code>{reverseY}</code>: The tile Y coordinate in the tiling scheme, where 0 is the Southernmost tile.</li>
         *  <li> <code>{westDegrees}</code>: The Western edge of the tile in geodetic degrees.</li>
         *  <li> <code>{southDegrees}</code>: The Southern edge of the tile in geodetic degrees.</li>
         *  <li> <code>{eastDegrees}</code>: The Eastern edge of the tile in geodetic degrees.</li>
         *  <li> <code>{northDegrees}</code>: The Northern edge of the tile in geodetic degrees.</li>
         *  <li> <code>{westProjected}</code>: The Western edge of the tile in projected coordinates of the tiling scheme.</li>
         *  <li> <code>{southProjected}</code>: The Southern edge of the tile in projected coordinates of the tiling scheme.</li>
         *  <li> <code>{eastProjected}</code>: The Eastern edge of the tile in projected coordinates of the tiling scheme.</li>
         *  <li> <code>{northProjected}</code>: The Northern edge of the tile in projected coordinates of the tiling scheme.</li>
         * </ul>
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {String}
         * @readonly
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets the proxy used by this provider.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Proxy}
         * @readonly
         * @default undefined
         */
        proxy : {
            get : function() {
                return this._proxy;
            }
        },

        /**
         * Gets the width of each tile, in pixels. This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Number}
         * @readonly
         * @default 256
         */
        tileWidth : {
            get : function() {
                return this._tileWidth;
            }
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Number}
         * @readonly
         * @default 256
         */
        tileHeight: {
            get : function() {
                return this._tileHeight;
            }
        },

        /**
         * Gets the maximum level-of-detail that can be requested, or undefined if there is no limit.
         * This function should not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Number}
         * @readonly
         * @default undefined
         */
        maximumLevel : {
            get : function() {
                return this._maximumLevel;
            }
        },

        /**
         * Gets the minimum level-of-detail that can be requested.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Number}
         * @readonly
         * @default 0
         */
        minimumLevel : {
            get : function() {
                return this._minimumLevel;
            }
        },

        /**
         * Gets the tiling scheme used by this provider.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {TilingScheme}
         * @readonly
         * @default new WebMercatorTilingScheme()
         */
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },

        /**
         * Gets the rectangle, in radians, of the imagery provided by this instance.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Rectangle}
         * @readonly
         * @default tilingScheme.rectangle
         */
        rectangle : {
            get : function() {
                return this._rectangle;
            }
        },

        /**
         * Gets the tile discard policy.  If not undefined, the discard policy is responsible
         * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
         * returns undefined, no tiles are filtered.  This function should
         * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {TileDiscardPolicy}
         * @readonly
         * @default undefined
         */
        tileDiscardPolicy : {
            get : function() {
                return this._tileDiscardPolicy;
            }
        },

        /**
         * Gets an event that is raised when the imagery provider encounters an asynchronous error.  By subscribing
         * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
         * are passed an instance of {@link TileProviderError}.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Event}
         * @readonly
         */
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },

        /**
         * Gets a value indicating whether or not the provider is ready for use.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : function() {
                return true;
            }
        },

        /**
         * Gets the credit to display when this imagery provider is active.  Typically this is used to credit
         * the source of the imagery.  This function should not be called before {@link UrlTemplateImageryProvider#ready} returns true.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Credit}
         * @readonly
         * @default undefined
         */
        credit : {
            get : function() {
                return this._credit;
            }
        },

        /**
         * Gets a value indicating whether or not the images provided by this imagery provider
         * include an alpha channel.  If this property is false, an alpha channel, if present, will
         * be ignored.  If this property is true, any images without an alpha channel will be treated
         * as if their alpha is 1.0 everywhere.  When this property is false, memory usage
         * and texture upload time are reduced.
         * @memberof UrlTemplateImageryProvider.prototype
         * @type {Boolean}
         * @readonly
         * @default true
         */
        hasAlphaChannel : {
            get : function() {
                return this._hasAlphaChannel;
            }
        }
    });

    /**
     * Gets the credits to be displayed when a given tile is displayed.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level;
     * @returns {Credit[]} The credits to be displayed when the tile is displayed.
     *
     * @exception {DeveloperError} <code>getTileCredits</code> must not be called before the imagery provider is ready.
     */
    UrlTemplateImageryProvider.prototype.getTileCredits = function(x, y, level) {
        return undefined;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link UrlTemplateImageryProvider#ready} returns true.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    UrlTemplateImageryProvider.prototype.requestImage = function(x, y, level) {
        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(this, url);
    };

    /**
     * Picking features is not currently supported by this imagery provider, so this function simply returns
     * undefined.
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     * @param {Number} longitude The longitude at which to pick features.
     * @param {Number} latitude  The latitude at which to pick features.
     * @return {Promise} A promise for the picked features that will resolve when the asynchronous
     *                   picking completes.  The resolved value is an array of {@link ImageryLayerFeatureInfo}
     *                   instances.  The array may be empty if no features are found at the given location.
     *                   It may also be undefined if picking is not supported.
     */
    UrlTemplateImageryProvider.prototype.pickFeatures = function() {
        return undefined;
    };

    function xTag(imageryProvider, x, y, level) {
        return x;
    }

    function reverseXTag(imageryProvider, x, y, level) {
        return imageryProvider.tilingScheme.getNumberOfXTilesAtLevel(level) - x - 1;
    }

    function yTag(imageryProvider, x, y, level) {
        return y;
    }

    function reverseYTag(imageryProvider, x, y, level) {
        return imageryProvider.tilingScheme.getNumberOfYTilesAtLevel(level) - y - 1;
    }

    function zTag(imageryProvider, x, y, level) {
        return level;
    }

    function sTag(imageryProvider, x, y, level) {
        var index = (x + y + level) % imageryProvider._subdomains.length;
        return imageryProvider._subdomains[index];
    }

    var degreesScratchComputed = false;
    var degreesScratch = new Rectangle();

    function computeDegrees(imageryProvider, x, y, level) {
        if (degreesScratchComputed) {
            return;
        }

        imageryProvider.tilingScheme.tileXYToRectangle(x, y, level, degreesScratch);
        degreesScratch.west = CesiumMath.toDegrees(degreesScratch.west);
        degreesScratch.south = CesiumMath.toDegrees(degreesScratch.south);
        degreesScratch.east = CesiumMath.toDegrees(degreesScratch.east);
        degreesScratch.north = CesiumMath.toDegrees(degreesScratch.north);

        degreesScratchComputed = true;
    }

    function westDegreesTag(imageryProvider, x, y, level) {
        computeDegrees(imageryProvider, x, y, level);
        return degreesScratch.west;
    }

    function southDegreesTag(imageryProvider, x, y, level) {
        computeDegrees(imageryProvider, x, y, level);
        return degreesScratch.south;
    }

    function eastDegreesTag(imageryProvider, x, y, level) {
        computeDegrees(imageryProvider, x, y, level);
        return degreesScratch.east;
    }

    function northDegreesTag(imageryProvider, x, y, level) {
        computeDegrees(imageryProvider, x, y, level);
        return degreesScratch.north;
    }

    var projectedScratchComputed = false;
    var projectedScratch = new Rectangle();

    function computeProjected(imageryProvider, x, y, level) {
        if (projectedScratchComputed) {
            return;
        }

        imageryProvider.tilingScheme.tileXYToNativeRectangle(x, y, level, projectedScratch);

        projectedScratchComputed = true;
    }

    function westProjectedTag(imageryProvider, x, y, level) {
        computeProjected(imageryProvider, x, y, level);
        return projectedScratch.west;
    }

    function southProjectedTag(imageryProvider, x, y, level) {
        computeProjected(imageryProvider, x, y, level);
        return projectedScratch.south;
    }

    function eastProjectedTag(imageryProvider, x, y, level) {
        computeProjected(imageryProvider, x, y, level);
        return projectedScratch.east;
    }

    function northProjectedTag(imageryProvider, x, y, level) {
        computeProjected(imageryProvider, x, y, level);
        return projectedScratch.north;
    }

    var tags = {
        '{x}': xTag,
        '{y}': yTag,
        '{z}': zTag,
        '{s}': sTag,
        '{reverseX}': reverseXTag,
        '{reverseY}': reverseYTag,
        '{westDegrees}': westDegreesTag,
        '{southDegrees}': southDegreesTag,
        '{eastDegrees}': eastDegreesTag,
        '{northDegrees}': northDegreesTag,
        '{westProjected}': westProjectedTag,
        '{southProjected}': southProjectedTag,
        '{eastProjected}': eastProjectedTag,
        '{northProjected}': northProjectedTag
    };

    return UrlTemplateImageryProvider;
});
