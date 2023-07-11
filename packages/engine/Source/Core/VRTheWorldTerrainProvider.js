import Check from "./Check.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import Event from "./Event.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import getImagePixels from "./getImagePixels.js";
import HeightmapTerrainData from "./HeightmapTerrainData.js";
import CesiumMath from "./Math.js";
import Rectangle from "./Rectangle.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";
import TerrainProvider from "./TerrainProvider.js";
import TileProviderError from "./TileProviderError.js";

function DataRectangle(rectangle, maxLevel) {
  this.rectangle = rectangle;
  this.maxLevel = maxLevel;
}

/**
 * @typedef {Object} VRTheWorldTerrainProvider.ConstructorOptions
 *
 * Initialization options for the VRTheWorldTerrainProvider constructor
 *
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If not specified, the WGS84 ellipsoid is used.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 */

/**
 * Used to track creation details while fetching initial metadata
 *
 * @constructor
 * @private
 *
 * @param {VRTheWorldTerrainProvider.ConstructorOptions} options An object describing initialization options
 */
function TerrainProviderBuilder(options) {
  this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this.tilingScheme = undefined;
  this.heightmapWidth = undefined;
  this.heightmapHeight = undefined;
  this.levelZeroMaximumGeometricError = undefined;
  this.rectangles = [];
}

TerrainProviderBuilder.prototype.build = function (provider) {
  provider._tilingScheme = this.tilingScheme;
  provider._heightmapWidth = this.heightmapWidth;
  provider._heightmapHeight = this.heightmapHeight;
  provider._levelZeroMaximumGeometricError = this.levelZeroMaximumGeometricError;
  provider._rectangles = this.rectangles;
};

function metadataSuccess(terrainProviderBuilder, xml) {
  const srs = xml.getElementsByTagName("SRS")[0].textContent;
  if (srs === "EPSG:4326") {
    terrainProviderBuilder.tilingScheme = new GeographicTilingScheme({
      ellipsoid: terrainProviderBuilder.ellipsoid,
    });
  } else {
    throw new RuntimeError(`SRS ${srs} is not supported`);
  }

  const tileFormat = xml.getElementsByTagName("TileFormat")[0];
  terrainProviderBuilder.heightmapWidth = parseInt(
    tileFormat.getAttribute("width"),
    10
  );
  terrainProviderBuilder.heightmapHeight = parseInt(
    tileFormat.getAttribute("height"),
    10
  );
  terrainProviderBuilder.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
    terrainProviderBuilder.ellipsoid,
    Math.min(
      terrainProviderBuilder.heightmapWidth,
      terrainProviderBuilder.heightmapHeight
    ),
    terrainProviderBuilder.tilingScheme.getNumberOfXTilesAtLevel(0)
  );

  const dataRectangles = xml.getElementsByTagName("DataExtent");

  for (let i = 0; i < dataRectangles.length; ++i) {
    const dataRectangle = dataRectangles[i];

    const west = CesiumMath.toRadians(
      parseFloat(dataRectangle.getAttribute("minx"))
    );
    const south = CesiumMath.toRadians(
      parseFloat(dataRectangle.getAttribute("miny"))
    );
    const east = CesiumMath.toRadians(
      parseFloat(dataRectangle.getAttribute("maxx"))
    );
    const north = CesiumMath.toRadians(
      parseFloat(dataRectangle.getAttribute("maxy"))
    );
    const maxLevel = parseInt(dataRectangle.getAttribute("maxlevel"), 10);

    terrainProviderBuilder.rectangles.push(
      new DataRectangle(new Rectangle(west, south, east, north), maxLevel)
    );
  }
}

function metadataFailure(resource, error, provider) {
  let message = `An error occurred while accessing ${resource.url}`;

  if (defined(error) && defined(error.message)) {
    message = `${message}: ${error.message}`;
  }

  TileProviderError.reportError(
    undefined,
    provider,
    defined(provider) ? provider._errorEvent : undefined,
    message
  );

  throw new RuntimeError(message);
}

async function requestMetadata(terrainProviderBuilder, resource, provider) {
  try {
    const xml = await resource.fetchXML();
    metadataSuccess(terrainProviderBuilder, xml);
  } catch (error) {
    metadataFailure(resource, error, provider);
  }
}

/**
 * <div class="notice">
 * To construct a VRTheWorldTerrainProvider, call {@link VRTheWorldTerrainProvider.fromUrl}. Do not call the constructor directly.
 * </div>
 *
 * A {@link TerrainProvider} that produces terrain geometry by tessellating height maps
 * retrieved from a {@link http://vr-theworld.com/|VT MÄK VR-TheWorld server}.
 *
 * @alias VRTheWorldTerrainProvider
 * @constructor
 *
 * @param {VRTheWorldTerrainProvider.ConstructorOptions} [options] An object describing initialization options.
 *
 * @example
 * const terrainProvider = await Cesium.VRTheWorldTerrainProvider.fromUrl(
 *   "https://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/"
 * );
 * viewer.terrainProvider = terrainProvider;
 *
 * @see TerrainProvider
 */
function VRTheWorldTerrainProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._errorEvent = new Event();

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

  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  this._tilingScheme = undefined;
  this._rectangles = [];
}

Object.defineProperties(VRTheWorldTerrainProvider.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets the credit to display when this terrain provider is active.  Typically this is used to credit
   * the source of the terrain.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {GeographicTilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets a value indicating whether or not the provider includes a water mask.  The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasWaterMask: {
    get: function () {
      return false;
    },
  },

  /**
   * Gets a value indicating whether or not the requested tiles include vertex normals.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {boolean}
   * @readonly
   */
  hasVertexNormals: {
    get: function () {
      return false;
    },
  },
  /**
   * Gets an object that can be used to determine availability of terrain from this provider, such as
   * at points and in rectangles. This property may be undefined if availability
   * information is not available.
   * @memberof VRTheWorldTerrainProvider.prototype
   * @type {TileAvailability}
   * @readonly
   */
  availability: {
    get: function () {
      return undefined;
    },
  },
});

/**
 * Creates a {@link TerrainProvider} that produces terrain geometry by tessellating height maps
 * retrieved from a {@link http://vr-theworld.com/|VT MÄK VR-TheWorld server}.
 *
 * @param {Resource|String} url The URL of the VR-TheWorld TileMap.
 * @param {VRTheWorldTerrainProvider.ConstructorOptions} [options] An object describing initialization options.
 * @returns {Promise<VRTheWorldTerrainProvider>}
 *
 * @example
 * const terrainProvider = await Cesium.VRTheWorldTerrainProvider.fromUrl(
 *   "https://www.vr-theworld.com/vr-theworld/tiles1.0.0/73/"
 * );
 * viewer.terrainProvider = terrainProvider;
 *
 * @exception {RuntimeError} metadata specifies and unknown SRS
 */
VRTheWorldTerrainProvider.fromUrl = async function (url, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const terrainProviderBuilder = new TerrainProviderBuilder(options);
  const resource = Resource.createIfNeeded(url);

  await requestMetadata(terrainProviderBuilder, resource);

  const provider = new VRTheWorldTerrainProvider(options);
  terrainProviderBuilder.build(provider);
  provider._resource = resource;

  return provider;
};

/**
 * Requests the geometry for a given tile. The result includes terrain
 * data and indicates that all child tiles are available.
 *
 * @param {number} x The X coordinate of the tile for which to request geometry.
 * @param {number} y The Y coordinate of the tile for which to request geometry.
 * @param {number} level The level of the tile for which to request geometry.
 * @param {Request} [request] The request object. Intended for internal use only.
 * @returns {Promise<TerrainData>|undefined} A promise for the requested geometry.  If this method
 *          returns undefined instead of a promise, it is an indication that too many requests are already
 *          pending and the request will be retried later.
 */
VRTheWorldTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  const yTiles = this._tilingScheme.getNumberOfYTilesAtLevel(level);
  const resource = this._resource.getDerivedResource({
    url: `${level}/${x}/${yTiles - y - 1}.tif`,
    queryParameters: {
      cesium: true,
    },
    request: request,
  });
  const promise = resource.fetchImage({
    preferImageBitmap: true,
  });
  if (!defined(promise)) {
    return undefined;
  }

  const that = this;
  return Promise.resolve(promise).then(function (image) {
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
 * @param {number} level The tile level for which to get the maximum geometric error.
 * @returns {number} The maximum geometric error.
 */
VRTheWorldTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  return this._levelZeroMaximumGeometricError / (1 << level);
};

const rectangleScratch = new Rectangle();

function getChildMask(provider, x, y, level) {
  const tilingScheme = provider._tilingScheme;
  const rectangles = provider._rectangles;
  const parentRectangle = tilingScheme.tileXYToRectangle(x, y, level);

  let childMask = 0;

  for (let i = 0; i < rectangles.length && childMask !== 15; ++i) {
    const rectangle = rectangles[i];
    if (rectangle.maxLevel <= level) {
      continue;
    }

    const testRectangle = rectangle.rectangle;

    const intersection = Rectangle.intersection(
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
  const tileRectangle = tilingScheme.tileXYToRectangle(x, y, level);
  return defined(
    Rectangle.intersection(tileRectangle, rectangle, rectangleScratch)
  );
}

/**
 * Determines whether data for a tile is available to be loaded.
 *
 * @param {number} x The X coordinate of the tile for which to request geometry.
 * @param {number} y The Y coordinate of the tile for which to request geometry.
 * @param {number} level The level of the tile for which to request geometry.
 * @returns {boolean|undefined} Undefined if not supported, otherwise true or false.
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
 * @param {number} x The X coordinate of the tile for which to request geometry.
 * @param {number} y The Y coordinate of the tile for which to request geometry.
 * @param {number} level The level of the tile for which to request geometry.
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
