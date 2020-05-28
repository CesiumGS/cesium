import when from "../ThirdParty/when.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import Event from "./Event.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import getImagePixels from "./getImagePixels.js";
import HeightmapTerrainData from "./HeightmapTerrainData.js";
import CesiumMath from "./Math.js";
import Rectangle from "./Rectangle.js";
import Resource from "./Resource.js";
import TerrainProvider from "./TerrainProvider.js";
import TileProviderError from "./TileProviderError.js";

function DataRectangle(rectangle, maxLevel) {
  this.rectangle = rectangle;
  this.maxLevel = maxLevel;
}

/**
 * A {@link TerrainProvider} that produces terrain geometry by tessellating height maps
 * retrieved from a {@link http://vr-theworld.com/|VT MÄK VR-TheWorld server}.
 *
 * @alias VRTheWorldTerrainProvider
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The URL of the VR-TheWorld TileMap.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.  If this parameter is not
 *                    specified, the WGS84 ellipsoid is used.
 * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 *
 * @example
 * var terrainProvider = new Cesium.VRTheWorldTerrainProvider({
 *   url : 'https://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/'
 * });
 * viewer.terrainProvider = terrainProvider;
 *
 * @see TerrainProvider
 */
function VRTheWorldTerrainProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.url)) {
    throw new DeveloperError("options.url is required.");
  }
  //>>includeEnd('debug');

  var resource = Resource.createIfNeeded(options.url);

  this._resource = resource;

  this._errorEvent = new Event();
  this._ready = false;
  this._readyPromise = when.defer();

  this._terrainDataStructure = {
    heightScale: 1.0 / 1000.0,
    heightOffset: -1000.0,
    elementsPerHeight: 3,
    stride: 4,
    elementMultiplier: 256.0,
    isBigEndian: true,
    lowestEncodedHeight: 0,
    highestEncodedHeight: 256 * 256 * 256 - 1,
  };

  var credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  this._tilingScheme = undefined;
  this._rectangles = [];

  var that = this;
  var metadataError;
  var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

  function metadataSuccess(xml) {
    var srs = xml.getElementsByTagName("SRS")[0].textContent;
    if (srs === "EPSG:4326") {
      that._tilingScheme = new GeographicTilingScheme({ ellipsoid: ellipsoid });
    } else {
      metadataFailure("SRS " + srs + " is not supported.");
      return;
    }

    var tileFormat = xml.getElementsByTagName("TileFormat")[0];
    that._heightmapWidth = parseInt(tileFormat.getAttribute("width"), 10);
    that._heightmapHeight = parseInt(tileFormat.getAttribute("height"), 10);
    that._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
      ellipsoid,
      Math.min(that._heightmapWidth, that._heightmapHeight),
      that._tilingScheme.getNumberOfXTilesAtLevel(0)
    );

    var dataRectangles = xml.getElementsByTagName("DataExtent");

    for (var i = 0; i < dataRectangles.length; ++i) {
      var dataRectangle = dataRectangles[i];

      var west = CesiumMath.toRadians(
        parseFloat(dataRectangle.getAttribute("minx"))
      );
      var south = CesiumMath.toRadians(
        parseFloat(dataRectangle.getAttribute("miny"))
      );
      var east = CesiumMath.toRadians(
        parseFloat(dataRectangle.getAttribute("maxx"))
      );
      var north = CesiumMath.toRadians(
        parseFloat(dataRectangle.getAttribute("maxy"))
      );
      var maxLevel = parseInt(dataRectangle.getAttribute("maxlevel"), 10);

      that._rectangles.push(
        new DataRectangle(new Rectangle(west, south, east, north), maxLevel)
      );
    }

    that._ready = true;
    that._readyPromise.resolve(true);
  }

  function metadataFailure(e) {
    var message = defaultValue(
      e,
      "An error occurred while accessing " + that._resource.url + "."
    );
    metadataError = TileProviderError.handleError(
      metadataError,
      that,
      that._errorEvent,
      message,
      undefined,
      undefined,
      undefined,
      requestMetadata
    );
  }

  function requestMetadata() {
    when(that._resource.fetchXML(), metadataSuccess, metadataFailure);
  }

  requestMetadata();
}

Object.defineProperties(VRTheWorldTerrainProvider.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {Event}
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
   * the source of the terrain.  This function should not be called before {@link VRTheWorldTerrainProvider#ready} returns true.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {Credit}
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.  This function should
   * not be called before {@link VRTheWorldTerrainProvider#ready} returns true.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {GeographicTilingScheme}
   */
  tilingScheme: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this.ready) {
        throw new DeveloperError(
          "requestTileGeometry must not be called before ready returns true."
        );
      }
      //>>includeEnd('debug');

      return this._tilingScheme;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {Boolean}
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * Gets a value indicating whether or not the provider includes a water mask.  The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.  This function should not be
   * called before {@link VRTheWorldTerrainProvider#ready} returns true.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {Boolean}
   */
  hasWaterMask: {
    get: function () {
      return false;
    },
  },

  /**
   * Gets a value indicating whether or not the requested tiles include vertex normals.
   * This function should not be called before {@link VRTheWorldTerrainProvider#ready} returns true.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {Boolean}
   */
  hasVertexNormals: {
    get: function () {
      return false;
    },
  },
  /**
   * Gets an object that can be used to determine availability of terrain from this provider, such as
   * at points and in rectangles.  This function should not be called before
   * {@link TerrainProvider#ready} returns true.  This property may be undefined if availability
   * information is not available.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {TileAvailability}
   */
  availability: {
    get: function () {
      return undefined;
    },
  },
});

/**
 * Requests the geometry for a given tile.  This function should not be called before
 * {@link VRTheWorldTerrainProvider#ready} returns true.  The result includes terrain
 * data and indicates that all child tiles are available.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise.<TerrainData>|undefined} A promise for the requested geometry.  If this method
 *          returns undefined instead of a promise, it is an indication that too many requests are already
 *          pending and the request will be retried later.
 */
VRTheWorldTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  //>>includeStart('debug', pragmas.debug);
  if (!this.ready) {
    throw new DeveloperError(
      "requestTileGeometry must not be called before ready returns true."
    );
  }
  //>>includeEnd('debug');

  var yTiles = this._tilingScheme.getNumberOfYTilesAtLevel(level);
  var resource = this._resource.getDerivedResource({
    url: level + "/" + x + "/" + (yTiles - y - 1) + ".tif",
    queryParameters: {
      cesium: true,
    },
    request: request,
  });
  var promise = resource.fetchImage({
    preferImageBitmap: true,
  });
  if (!defined(promise)) {
    return undefined;
  }

  var that = this;
  return when(promise).then(function (image) {
    return new HeightmapTerrainData({
      buffer: getImagePixels(image),
      width: that._heightmapWidth,
      height: that._heightmapHeight,
      childTileMask: getChildMask(that, x, y, level),
      structure: that._terrainDataStructure,
    });
  });
};

/**
 * Gets the maximum geometric error allowed in a tile at a given level.
 *
 * @param {Number} level The tile level for which to get the maximum geometric error.
 * @returns {Number} The maximum geometric error.
 */
VRTheWorldTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  //>>includeStart('debug', pragmas.debug);
  if (!this.ready) {
    throw new DeveloperError(
      "requestTileGeometry must not be called before ready returns true."
    );
  }
  //>>includeEnd('debug');
  return this._levelZeroMaximumGeometricError / (1 << level);
};

var rectangleScratch = new Rectangle();

function getChildMask(provider, x, y, level) {
  var tilingScheme = provider._tilingScheme;
  var rectangles = provider._rectangles;
  var parentRectangle = tilingScheme.tileXYToRectangle(x, y, level);

  var childMask = 0;

  for (var i = 0; i < rectangles.length && childMask !== 15; ++i) {
    var rectangle = rectangles[i];
    if (rectangle.maxLevel <= level) {
      continue;
    }

    var testRectangle = rectangle.rectangle;

    var intersection = Rectangle.intersection(
      testRectangle,
      parentRectangle,
      rectangleScratch
    );
    if (defined(intersection)) {
      // Parent tile is inside this rectangle, so at least one child is, too.
      if (
        isTileInRectangle(tilingScheme, testRectangle, x * 2, y * 2, level + 1)
      ) {
        childMask |= 4; // northwest
      }
      if (
        isTileInRectangle(
          tilingScheme,
          testRectangle,
          x * 2 + 1,
          y * 2,
          level + 1
        )
      ) {
        childMask |= 8; // northeast
      }
      if (
        isTileInRectangle(
          tilingScheme,
          testRectangle,
          x * 2,
          y * 2 + 1,
          level + 1
        )
      ) {
        childMask |= 1; // southwest
      }
      if (
        isTileInRectangle(
          tilingScheme,
          testRectangle,
          x * 2 + 1,
          y * 2 + 1,
          level + 1
        )
      ) {
        childMask |= 2; // southeast
      }
    }
  }

  return childMask;
}

function isTileInRectangle(tilingScheme, rectangle, x, y, level) {
  var tileRectangle = tilingScheme.tileXYToRectangle(x, y, level);
  return defined(
    Rectangle.intersection(tileRectangle, rectangle, rectangleScratch)
  );
}

/**
 * Determines whether data for a tile is available to be loaded.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {Boolean} Undefined if not supported, otherwise true or false.
 */
VRTheWorldTerrainProvider.prototype.getTileDataAvailable = function (
  x,
  y,
  level
) {
  return undefined;
};

/**
 * Makes sure we load availability data for a tile
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {undefined|Promise<void>} Undefined if nothing need to be loaded or a Promise that resolves when all required tiles are loaded
 */
VRTheWorldTerrainProvider.prototype.loadTileDataAvailability = function (
  x,
  y,
  level
) {
  return undefined;
};
export default VRTheWorldTerrainProvider;
