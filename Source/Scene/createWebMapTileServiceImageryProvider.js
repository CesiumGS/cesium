/*global define*/
define([
    '../Core/combine',
    '../Core/Credit',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/Event',
    '../Core/freezeObject',
    '../Core/objectToQuery',
    '../Core/queryToObject',
    '../Core/Rectangle',
    '../Core/WebMercatorTilingScheme',
    '../ThirdParty/Uri',
    '../ThirdParty/when',
    './ImageryProvider',
    './UrlTemplateImageryProvider'
], function(
    combine,
    Credit,
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    Event,
    freezeObject,
    objectToQuery,
    queryToObject,
    Rectangle,
    WebMercatorTilingScheme,
    Uri,
    when,
    ImageryProvider,
    UrlTemplateImageryProvider) {
    "use strict";

    /**
     * Provides tiled imagery served by {@link http://www.opengeospatial.org/standards/wmts|WMTS 1.0.0} compliant servers.
     * This provider supports HTTP KVP-encoded and RESTful GetTile requests, but does not yet support the SOAP encoding.
     *
     * @exports createWebMapTileServiceImageryProvider
     *
     * @param {Object} options Object with the following properties:
     * @param {String} options.url The base URL for the WMTS GetTile operation (for KVP-encoded requests) or the tile-URL template (for RESTful requests). The tile-URL template should contain the following variables: &#123;style&#125;, &#123;TileMatrixSet&#125;, &#123;TileMatrix&#125;, &#123;TileRow&#125;, &#123;TileCol&#125;. The first two are optional if actual values are hardcoded or not required by the server. The &#123;s&#125; keyword may be used to specify subdomains.
     * @param {String} [options.format='image/jpeg'] The MIME type for images to retrieve from the server.
     * @param {String} options.layer The layer name for WMTS requests.
     * @param {String} options.style The style name for WMTS requests.
     * @param {String} options.tileMatrixSetID The identifier of the TileMatrixSet to use for WMTS requests.
     * @param {Array} [options.tileMatrixLabels] A list of identifiers in the TileMatrix to use for WMTS requests, one per TileMatrix level.
     * @param {Number} [options.tileWidth=256] The tile width in pixels.
     * @param {Number} [options.tileHeight=256] The tile height in pixels.
     * @param {TilingScheme} [options.tilingScheme] The tiling scheme corresponding to the organization of the tiles in the TileMatrixSet.
     * @param {Object} [options.proxy] A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle covered by the layer.
     * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.
     * @param {Number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
     * @param {String|String[]} [options.subdomains='abc'] The subdomains to use for the <code>{s}</code> placeholder in the URL template.
     *                          If this parameter is a single string, each character in the string is a subdomain.  If it is
     *                          an array, each element in the array is a subdomain.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see UrlTemplateImageryProvider
     *
     * @example
     * // Example 1. USGS shaded relief tiles (KVP)
     * var shadedRelief1 = Cesium.createWebMapTileServiceImageryProvider({
     *     url : 'http://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS',
     *     layer : 'USGSShadedReliefOnly',
     *     style : 'default',
     *     format : 'image/jpeg',
     *     tileMatrixSetID : 'default028mm',
     *     // tileMatrixLabels : ['default028mm:0', 'default028mm:1', 'default028mm:2' ...],
     *     maximumLevel: 19,
     *     credit : new Cesium.Credit('U. S. Geological Survey')
     * });
     * viewer.imageryLayers.addImageryProvider(shadedRelief1);
     *
     * @example
     * // Example 2. USGS shaded relief tiles (RESTful)
     * var shadedRelief2 = Cesium.createWebMapTileServiceImageryProvider({
     *     url : 'http://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/WMTS/tile/1.0.0/USGSShadedReliefOnly/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
     *     layer : 'USGSShadedReliefOnly',
     *     style : 'default',
     *     format : 'image/jpeg',
     *     tileMatrixSetID : 'default028mm',
     *     maximumLevel: 19,
     *     credit : new Cesium.Credit('U. S. Geological Survey')
     * });
     * viewer.imageryLayers.addImageryProvider(shadedRelief2);
     */

    var createWebMapTileServiceImageryProvider = function WebMapTileServiceImageryProvider(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        if (!defined(options.layer)) {
            throw new DeveloperError('options.layer is required.');
        }
        if (!defined(options.style)) {
            throw new DeveloperError('options.style is required.');
        }
        if (!defined(options.tileMatrixSetID)) {
            throw new DeveloperError('options.tileMatrixSetID is required.');
        }

        var style = options.style;
        var tileMatrixSetID = options.tileMatrixSetID;
        var proxy = options.proxy;
        var tileDiscardPolicy = options.tileDiscardPolicy;
        var format = defaultValue(options.format, 'image/jpeg');


        var tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new WebMercatorTilingScheme({ ellipsoid : options.ellipsoid });
        var tileWidth = defaultValue(options.tileWidth, 256);
        var tileHeight = defaultValue(options.tileHeight, 256);

        var minimumLevel = defaultValue(options.minimumLevel, 0);
        var maximumLevel = options.maximumLevel;

        var rectangle = defaultValue(options.rectangle, tilingScheme.rectangle);

        // Check the number of tiles at the minimum level.  If it's more than four,
        // throw an exception, because starting at the higher minimum
        // level will cause too many tiles to be downloaded and rendered.
        var swTile = tilingScheme.positionToTileXY(Rectangle.southwest(rectangle), minimumLevel);
        var neTile = tilingScheme.positionToTileXY(Rectangle.northeast(rectangle), minimumLevel);
        var tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
        if (tileCount > 4) {
            throw new DeveloperError('The imagery provider\'s rectangle and minimumLevel indicate that there are ' + tileCount + ' tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.');
        }

        var credit = options.credit;
        credit = typeof credit === 'string' ? new Credit(credit) : credit;

        var subdomains = options.subdomains;
        if (Array.isArray(subdomains)) {
            subdomains = subdomains.slice();
        } else if (defined(subdomains) && subdomains.length > 0) {
            subdomains = subdomains.split('');
        } else {
            subdomains = ['a', 'b', 'c'];
        }

        // construct templateUrl
        var templateUrl;
        if (options.url.indexOf('{') >= 0) {
             templateUrl = options.url
                .replace('{style}', style)
                .replace('{Style}', style)
                .replace('{TileMatrixSet}', tileMatrixSetID)
                .replace('{TileMatrix}', "{z}")
                .replace('{TileRow}', "{y}")
                .replace('{TileCol}', "{x}");
        }  else {
            var defaultParameters = freezeObject({
                service : 'WMTS',
                version : '1.0.0',
                request : 'GetTile'
            });
            // build KVP request
            var uri = new Uri(options.url);
            var queryOptions = queryToObject(defaultValue(uri.query, ''));

            queryOptions = combine(defaultParameters, queryOptions);
            queryOptions.layer = options.layer;
            queryOptions.style = style;
            queryOptions.tilematrixset = tileMatrixSetID;
            queryOptions.format = format;

            uri.query = objectToQuery(queryOptions);
            uri += "&tilematrix={z}&tilerow={y}&tilecol={x}";
            templateUrl = uri.toString();
        }

        return new UrlTemplateImageryProvider({
            url : templateUrl,
            tilingScheme : tilingScheme,
            rectangle : rectangle,
            tileWidth : tileWidth,
            tileHeight : tileHeight,
            minimumLevel : minimumLevel,
            maximumLevel : maximumLevel,
            proxy : proxy,
            subdomains: subdomains,
            tileDiscardPolicy : tileDiscardPolicy,
            credit : credit
        });
    };

    return createWebMapTileServiceImageryProvider;
});
