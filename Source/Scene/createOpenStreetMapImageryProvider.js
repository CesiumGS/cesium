import deprecationWarning from '../Core/deprecationWarning.js';
import OpenStreetMapImageryProvider from './OpenStreetMapImageryProvider.js';

    /**
     * Creates a {@link UrlTemplateImageryProvider} instance that provides tiled imagery hosted by OpenStreetMap
     * or another provider of Slippy tiles.  The default url connects to OpenStreetMap's volunteer-run
     * servers, so you must conform to their
     * {@link http://wiki.openstreetmap.org/wiki/Tile_usage_policy|Tile Usage Policy}.
     *
     * @exports createOpenStreetMapImageryProvider
     *
     * @param {Object} [options] Object with the following properties:
     * @param {String} [options.url='https://a.tile.openstreetmap.org'] The OpenStreetMap server url.
     * @param {String} [options.fileExtension='png'] The file extension for images on the server.
     * @param {Rectangle} [options.rectangle=Rectangle.MAX_VALUE] The rectangle of the layer.
     * @param {Number} [options.minimumLevel=0] The minimum level-of-detail supported by the imagery provider.
     * @param {Number} [options.maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
     * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
     * @param {Credit|String} [options.credit='MapQuest, Open Street Map and contributors, CC-BY-SA'] A credit for the data source, which is displayed on the canvas.
     * @returns {UrlTemplateImageryProvider} The imagery provider.
     *
     * @deprecated
     *
     * @exception {DeveloperError} The rectangle and minimumLevel indicate that there are more than four tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported.
     *
     * @see ArcGisMapServerImageryProvider
     * @see BingMapsImageryProvider
     * @see GoogleEarthEnterpriseMapsProvider
     * @see SingleTileImageryProvider
     * @see TileMapServiceImageryProvider
     * @see WebMapServiceImageryProvider
     * @see WebMapTileServiceImageryProvider
     * @see UrlTemplateImageryProvider
     *
     *
     * @example
     * var osm = new Cesium.OpenStreetMapImageryProvider({
     *     url : 'https://a.tile.openstreetmap.org/'
     * });
     *
     * @see {@link http://wiki.openstreetmap.org/wiki/Main_Page|OpenStreetMap Wiki}
     * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
     */
    function createOpenStreetMapImageryProvider(options) {
        deprecationWarning('createOpenStreetMapImageryProvider', 'createOpenStreetMapImageryProvider is deprecated and will be removed in Cesium 1.65. Please use OpenStreetMapImageryProvider instead.');

        return new OpenStreetMapImageryProvider(options);
    }
export default createOpenStreetMapImageryProvider;
