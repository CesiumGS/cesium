import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";

var defaultCredit = new Credit(
  "MapQuest, Open Street Map and contributors, CC-BY-SA"
);

/**
 * @typedef {Object} OpenStreetMapImageryProvider.ConstructorOptions
 *
 * Initialization options for the OpenStreetMapImageryProvider constructor
 *
 * @property {String} [url='https://a.tile.openstreetmap.org'] The OpenStreetMap server url.
 * @property {String} [fileExtension='png'] The file extension for images on the server.
 * @property {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle of the layer.
 * @property {Number} [minimumLevel=0] The minimum level-of-detail supported by the imagery provider.
 * @property {Number} [maximumLevel] The maximum level-of-detail supported by the imagery provider, or undefined if there is no limit.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @property {Credit|String} [credit='MapQuest, Open Street Map and contributors, CC-BY-SA'] A credit for the data source, which is displayed on the canvas.
 */

/**
 * An imagery provider that provides tiled imagery hosted by OpenStreetMap
 * or another provider of Slippy tiles.  The default url connects to OpenStreetMap's volunteer-run
 * servers, so you must conform to their
 * {@link http://wiki.openstreetmap.org/wiki/Tile_usage_policy|Tile Usage Policy}.
 *
 * @alias OpenStreetMapImageryProvider
 * @constructor
 * @extends UrlTemplateImageryProvider
 *
 * @param {OpenStreetMapImageryProvider.ConstructorOptions} options Object describing initialization options
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
 * @example
 * var osm = new Cesium.OpenStreetMapImageryProvider({
 *     url : 'https://a.tile.openstreetmap.org/'
 * });
 *
 * @see {@link http://wiki.openstreetmap.org/wiki/Main_Page|OpenStreetMap Wiki}
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 */
function OpenStreetMapImageryProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var resource = Resource.createIfNeeded(
    defaultValue(options.url, "https://a.tile.openstreetmap.org/")
  );
  resource.appendForwardSlash();
  resource.url += "{z}/{x}/{y}." + defaultValue(options.fileExtension, "png");

  var tilingScheme = new WebMercatorTilingScheme({
    ellipsoid: options.ellipsoid,
  });

  var tileWidth = 256;
  var tileHeight = 256;

  var minimumLevel = defaultValue(options.minimumLevel, 0);
  var maximumLevel = options.maximumLevel;

  var rectangle = defaultValue(options.rectangle, tilingScheme.rectangle);

  // Check the number of tiles at the minimum level.  If it's more than four,
  // throw an exception, because starting at the higher minimum
  // level will cause too many tiles to be downloaded and rendered.
  var swTile = tilingScheme.positionToTileXY(
    Rectangle.southwest(rectangle),
    minimumLevel
  );
  var neTile = tilingScheme.positionToTileXY(
    Rectangle.northeast(rectangle),
    minimumLevel
  );
  var tileCount =
    (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
  //>>includeStart('debug', pragmas.debug);
  if (tileCount > 4) {
    throw new DeveloperError(
      "The rectangle and minimumLevel indicate that there are " +
        tileCount +
        " tiles at the minimum level. Imagery providers with more than four tiles at the minimum level are not supported."
    );
  }
  //>>includeEnd('debug');

  var credit = defaultValue(options.credit, defaultCredit);
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }

  UrlTemplateImageryProvider.call(this, {
    url: resource,
    credit: credit,
    tilingScheme: tilingScheme,
    tileWidth: tileWidth,
    tileHeight: tileHeight,
    minimumLevel: minimumLevel,
    maximumLevel: maximumLevel,
    rectangle: rectangle,
  });
}

if (defined(Object.create)) {
  OpenStreetMapImageryProvider.prototype = Object.create(
    UrlTemplateImageryProvider.prototype
  );
  OpenStreetMapImageryProvider.prototype.constructor = OpenStreetMapImageryProvider;
}

export default OpenStreetMapImageryProvider;
