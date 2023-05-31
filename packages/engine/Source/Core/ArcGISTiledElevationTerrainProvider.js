import Cartesian2 from "./Cartesian2.js";
import Check from "./Check.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import deprecationWarning from "./deprecationWarning.js";
import Ellipsoid from "./Ellipsoid.js";
import Event from "./Event.js";
import GeographicTilingScheme from "./GeographicTilingScheme.js";
import HeightmapEncoding from "./HeightmapEncoding.js";
import HeightmapTerrainData from "./HeightmapTerrainData.js";
import Rectangle from "./Rectangle.js";
import Request from "./Request.js";
import RequestState from "./RequestState.js";
import RequestType from "./RequestType.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";
import TerrainProvider from "./TerrainProvider.js";
import TileAvailability from "./TileAvailability.js";
import TileProviderError from "./TileProviderError.js";
import WebMercatorTilingScheme from "./WebMercatorTilingScheme.js";

const ALL_CHILDREN = 15;

/**
 * @typedef {Object} ArcGISTiledElevationTerrainProvider.ConstructorOptions
 *
 * Initialization options for the ArcGISTiledElevationTerrainProvider constructor
 *
 * @property {string} [token] The authorization token to use to connect to the service.
 * @property {Ellipsoid} [ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead.
 *                    If neither parameter is specified, the WGS84 ellipsoid is used.
 * @property {Resource|string|Promise<Resource>|Promise<string>} [url] The URL of the ArcGIS ImageServer service. Deprecated.
 */

/**
 * Used to track creation details while fetching initial metadata
 *
 * @constructor
 * @private
 *
 * @param {ArcGISTiledElevationTerrainProvider.ConstructorOptions} [options] An object describing initialization options.
 */
function TerrainProviderBuilder(options) {
  this.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

  this.credit = undefined;
  this.tilingScheme = undefined;
  this.height = undefined;
  this.width = undefined;
  this.encoding = undefined;
  this.lodCount = undefined;
  this.hasAvailability = false;
  this.tilesAvailable = undefined;
  this.tilesAvailabilityLoaded = undefined;
  this.levelZeroMaximumGeometricError = undefined;
  this.terrainDataStructure = undefined;
}

/**
 * Complete ArcGISTiledElevationTerrainProvider creation based on builder values.
 *
 * @private
 *
 * @param {ArcGISTiledElevationTerrainProvider} provider
 */
TerrainProviderBuilder.prototype.build = function (provider) {
  provider._credit = this.credit;
  provider._tilingScheme = this.tilingScheme;
  provider._height = this.height;
  provider._width = this.width;
  provider._encoding = this.encoding;
  provider._lodCount = this.lodCount;
  provider._hasAvailability = this.hasAvailability;
  provider._tilesAvailable = this.tilesAvailable;
  provider._tilesAvailabilityLoaded = this.tilesAvailabilityLoaded;
  provider._levelZeroMaximumGeometricError = this.levelZeroMaximumGeometricError;
  provider._terrainDataStructure = this.terrainDataStructure;

  provider._ready = true;
};

function parseMetadataSuccess(terrainProviderBuilder, metadata) {
  const copyrightText = metadata.copyrightText;
  if (defined(copyrightText)) {
    terrainProviderBuilder.credit = new Credit(copyrightText);
  }

  const spatialReference = metadata.spatialReference;
  const wkid = defaultValue(spatialReference.latestWkid, spatialReference.wkid);
  const extent = metadata.extent;
  const tilingSchemeOptions = {
    ellipsoid: terrainProviderBuilder.ellipsoid,
  };
  if (wkid === 4326) {
    tilingSchemeOptions.rectangle = Rectangle.fromDegrees(
      extent.xmin,
      extent.ymin,
      extent.xmax,
      extent.ymax
    );
    terrainProviderBuilder.tilingScheme = new GeographicTilingScheme(
      tilingSchemeOptions
    );
  } else if (wkid === 3857) {
    // Clamp extent to EPSG 3857 bounds
    const epsg3857Bounds =
      Math.PI * terrainProviderBuilder.ellipsoid.maximumRadius;
    if (metadata.extent.xmax > epsg3857Bounds) {
      metadata.extent.xmax = epsg3857Bounds;
    }
    if (metadata.extent.ymax > epsg3857Bounds) {
      metadata.extent.ymax = epsg3857Bounds;
    }
    if (metadata.extent.xmin < -epsg3857Bounds) {
      metadata.extent.xmin = -epsg3857Bounds;
    }
    if (metadata.extent.ymin < -epsg3857Bounds) {
      metadata.extent.ymin = -epsg3857Bounds;
    }

    tilingSchemeOptions.rectangleSouthwestInMeters = new Cartesian2(
      extent.xmin,
      extent.ymin
    );
    tilingSchemeOptions.rectangleNortheastInMeters = new Cartesian2(
      extent.xmax,
      extent.ymax
    );
    terrainProviderBuilder.tilingScheme = new WebMercatorTilingScheme(
      tilingSchemeOptions
    );
  } else {
    throw new RuntimeError("Invalid spatial reference");
  }

  const tileInfo = metadata.tileInfo;
  if (!defined(tileInfo)) {
    throw new RuntimeError("tileInfo is required");
  }

  terrainProviderBuilder.width = tileInfo.rows + 1;
  terrainProviderBuilder.height = tileInfo.cols + 1;
  terrainProviderBuilder.encoding =
    tileInfo.format === "LERC"
      ? HeightmapEncoding.LERC
      : HeightmapEncoding.NONE;
  terrainProviderBuilder.lodCount = tileInfo.lods.length - 1;

  const hasAvailability = (terrainProviderBuilder.hasAvailability =
    metadata.capabilities.indexOf("Tilemap") !== -1);
  if (hasAvailability) {
    terrainProviderBuilder.tilesAvailable = new TileAvailability(
      terrainProviderBuilder.tilingScheme,
      terrainProviderBuilder.lodCount
    );
    terrainProviderBuilder.tilesAvailable.addAvailableTileRange(
      0,
      0,
      0,
      terrainProviderBuilder.tilingScheme.getNumberOfXTilesAtLevel(0),
      terrainProviderBuilder.tilingScheme.getNumberOfYTilesAtLevel(0)
    );
    terrainProviderBuilder.tilesAvailabilityLoaded = new TileAvailability(
      terrainProviderBuilder.tilingScheme,
      terrainProviderBuilder.lodCount
    );
  }

  terrainProviderBuilder.levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
    terrainProviderBuilder.tilingScheme.ellipsoid,
    terrainProviderBuilder.width,
    terrainProviderBuilder.tilingScheme.getNumberOfXTilesAtLevel(0)
  );

  if (metadata.bandCount > 1) {
    console.log(
      "ArcGISTiledElevationTerrainProvider: Terrain data has more than 1 band. Using the first one."
    );
  }

  if (defined(metadata.minValues) && defined(metadata.maxValues)) {
    terrainProviderBuilder.terrainDataStructure = {
      elementMultiplier: 1.0,
      lowestEncodedHeight: metadata.minValues[0],
      highestEncodedHeight: metadata.maxValues[0],
    };
  } else {
    terrainProviderBuilder.terrainDataStructure = {
      elementMultiplier: 1.0,
    };
  }
}

async function requestMetadata(
  terrainProviderBuilder,
  metadataResource,
  provider
) {
  try {
    const metadata = await metadataResource.fetchJson();
    parseMetadataSuccess(terrainProviderBuilder, metadata);
  } catch (error) {
    const message = `An error occurred while accessing ${metadataResource}.`;
    TileProviderError.reportError(
      undefined,
      provider,
      defined(provider) ? provider._errorEvent : undefined,
      message
    );

    throw error;
  }
}

/**
 * <div class="notice">
 * To construct a CesiumTerrainProvider, call {@link ArcGISTiledElevationTerrainProvider.fromUrl}. Do not call the constructor directly.
 * </div>
 *
 * A {@link TerrainProvider} that produces terrain geometry by tessellating height maps
 * retrieved from Elevation Tiles of an an ArcGIS ImageService.
 *
 * @alias ArcGISTiledElevationTerrainProvider
 * @constructor
 *
 * @param {CesiumTerrainProvider.ConstructorOptions} [options] A url or an object describing initialization options
 *
 * @example
 * const terrainProvider = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl("https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer", {
 *   token: "KED1aF_I4UzXOHy3BnhwyBHU4l5oY6rO6walkmHoYqGp4XyIWUd5YZUC1ZrLAzvV40pR6gBXQayh0eFA8m6vPg.."
 * });
 * viewer.terrainProvider = terrainProvider;
 *
 * @see TerrainProvider
 */
function ArcGISTiledElevationTerrainProvider(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._resource = undefined;
  this._credit = undefined;
  this._tilingScheme = undefined;
  this._levelZeroMaximumGeometricError = undefined;
  this._maxLevel = undefined;
  this._terrainDataStructure = undefined;
  this._width = undefined;
  this._height = undefined;
  this._encoding = undefined;
  this._lodCount = undefined;
  const token = options.token;

  this._hasAvailability = false;
  this._tilesAvailable = undefined;
  this._tilesAvailabilityLoaded = undefined;
  this._availableCache = {};
  this._ready = false;

  this._errorEvent = new Event();

  if (defined(options.url)) {
    deprecationWarning(
      "ArcGISTiledElevationTerrainProvider options.url",
      "options.url was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ArcGISTiledElevationTerrainProvider.fromUrl instead."
    );

    const that = this;
    const terrainProviderBuilder = new TerrainProviderBuilder(options);
    this._readyPromise = Promise.resolve(options.url).then(async function (
      url
    ) {
      let resource = Resource.createIfNeeded(url);
      resource.appendForwardSlash();
      if (defined(token)) {
        resource = resource.getDerivedResource({
          queryParameters: {
            token: token,
          },
        });
      }
      that._resource = resource;

      const metadataResource = resource.getDerivedResource({
        queryParameters: {
          f: "pjson",
        },
      });

      await requestMetadata(terrainProviderBuilder, metadataResource, that);
      terrainProviderBuilder.build(that);

      return true;
    });
  }
}

Object.defineProperties(ArcGISTiledElevationTerrainProvider.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link TileProviderError}.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
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
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
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
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {GeographicTilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {boolean}
   * @readonly
   * @deprecated
   */
  ready: {
    get: function () {
      deprecationWarning(
        "ArcGISTiledElevationTerrainProvider.ready",
        "ArcGISTiledElevationTerrainProvider.ready was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ArcGISTiledElevationTerrainProvider.fromUrl instead."
      );
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {Promise<boolean>}
   * @readonly
   * @deprecated
   */
  readyPromise: {
    get: function () {
      deprecationWarning(
        "ArcGISTiledElevationTerrainProvider.readyPromise",
        "ArcGISTiledElevationTerrainProvider.readyPromise was deprecated in CesiumJS 1.104.  It will be removed in CesiumJS 1.107.  Use ArcGISTiledElevationTerrainProvider.fromUrl instead."
      );
      return this._readyPromise;
    },
  },

  /**
   * Gets a value indicating whether or not the provider includes a water mask.  The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
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
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
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
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {TileAvailability}
   * @readonly
   */
  availability: {
    get: function () {
      return this._tilesAvailable;
    },
  },
});

/**
 * Creates a {@link TerrainProvider} that produces terrain geometry by tessellating height maps
 * retrieved from Elevation Tiles of an an ArcGIS ImageService.
 *
 * @param {Resource|String|Promise<Resource>|Promise<String>} url The URL of the ArcGIS ImageServer service.
 * @param {ArcGISTiledElevationTerrainProvider.ConstructorOptions} [options] A url or an object describing initialization options.
 * @returns {Promise<ArcGISTiledElevationTerrainProvider>}
 *
 * @example
 * const terrainProvider = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl("https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer", {
 *   token: "KED1aF_I4UzXOHy3BnhwyBHU4l5oY6rO6walkmHoYqGp4XyIWUd5YZUC1ZrLAzvV40pR6gBXQayh0eFA8m6vPg.."
 * });
 * viewer.terrainProvider = terrainProvider;
 *
 * @exception {RuntimeError} metadata specifies invalid spatial reference
 * @exception {RuntimeError} metadata does not specify tileInfo
 */
ArcGISTiledElevationTerrainProvider.fromUrl = async function (url, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  url = await Promise.resolve(url);
  let resource = Resource.createIfNeeded(url);
  resource.appendForwardSlash();
  if (defined(options.token)) {
    resource = resource.getDerivedResource({
      queryParameters: {
        token: options.token,
      },
    });
  }

  const metadataResource = resource.getDerivedResource({
    queryParameters: {
      f: "pjson",
    },
  });

  const terrainProviderBuilder = new TerrainProviderBuilder(options);
  await requestMetadata(terrainProviderBuilder, metadataResource);

  const provider = new ArcGISTiledElevationTerrainProvider(options);
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
ArcGISTiledElevationTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  const tileResource = this._resource.getDerivedResource({
    url: `tile/${level}/${y}/${x}`,
    request: request,
  });

  const hasAvailability = this._hasAvailability;
  let availabilityPromise = Promise.resolve(true);
  let availabilityRequest;
  if (
    hasAvailability &&
    !defined(isTileAvailable(this, level + 1, x * 2, y * 2))
  ) {
    // We need to load child availability
    const availabilityResult = requestAvailability(
      this,
      level + 1,
      x * 2,
      y * 2
    );

    availabilityPromise = availabilityResult.promise;
    availabilityRequest = availabilityResult.request;
  }

  const promise = tileResource.fetchArrayBuffer();
  if (!defined(promise) || !defined(availabilityPromise)) {
    return undefined;
  }

  const that = this;
  const tilesAvailable = this._tilesAvailable;
  return Promise.all([promise, availabilityPromise])
    .then(function (result) {
      return new HeightmapTerrainData({
        buffer: result[0],
        width: that._width,
        height: that._height,
        childTileMask: hasAvailability
          ? tilesAvailable.computeChildMaskForTile(level, x, y)
          : ALL_CHILDREN,
        structure: that._terrainDataStructure,
        encoding: that._encoding,
      });
    })
    .catch(function (error) {
      if (
        defined(availabilityRequest) &&
        availabilityRequest.state === RequestState.CANCELLED
      ) {
        request.cancel();

        // Don't reject the promise till the request is actually cancelled
        // Otherwise it will think the request failed, but it didn't.
        return request.deferred.promise.finally(function () {
          request.state = RequestState.CANCELLED;
          return Promise.reject(error);
        });
      }
      return Promise.reject(error);
    });
};

function isTileAvailable(that, level, x, y) {
  if (!that._hasAvailability) {
    return undefined;
  }

  const tilesAvailabilityLoaded = that._tilesAvailabilityLoaded;
  const tilesAvailable = that._tilesAvailable;

  if (level > that._lodCount) {
    return false;
  }

  // Check if tiles are known to be available
  if (tilesAvailable.isTileAvailable(level, x, y)) {
    return true;
  }

  // or to not be available
  if (tilesAvailabilityLoaded.isTileAvailable(level, x, y)) {
    return false;
  }

  return undefined;
}

/**
 * Gets the maximum geometric error allowed in a tile at a given level.
 *
 * @param {number} level The tile level for which to get the maximum geometric error.
 * @returns {number} The maximum geometric error.
 */
ArcGISTiledElevationTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  return this._levelZeroMaximumGeometricError / (1 << level);
};

/**
 * Determines whether data for a tile is available to be loaded.
 *
 * @param {number} x The X coordinate of the tile for which to request geometry.
 * @param {number} y The Y coordinate of the tile for which to request geometry.
 * @param {number} level The level of the tile for which to request geometry.
 * @returns {boolean|undefined} Undefined if not supported, otherwise true or false.
 */
ArcGISTiledElevationTerrainProvider.prototype.getTileDataAvailable = function (
  x,
  y,
  level
) {
  if (!this._hasAvailability) {
    return undefined;
  }

  const result = isTileAvailable(this, level, x, y);
  if (defined(result)) {
    return result;
  }

  requestAvailability(this, level, x, y);

  return undefined;
};

/**
 * Makes sure we load availability data for a tile
 *
 * @param {number} x The X coordinate of the tile for which to request geometry.
 * @param {number} y The Y coordinate of the tile for which to request geometry.
 * @param {number} level The level of the tile for which to request geometry.
 * @returns {undefined} This provider does not support loading availability.
 */
ArcGISTiledElevationTerrainProvider.prototype.loadTileDataAvailability = function (
  x,
  y,
  level
) {
  return undefined;
};

function findRange(origin, width, height, data) {
  const endCol = width - 1;
  const endRow = height - 1;

  const value = data[origin.y * width + origin.x];
  const endingIndices = [];
  const range = {
    startX: origin.x,
    startY: origin.y,
    endX: 0,
    endY: 0,
  };

  const corner = new Cartesian2(origin.x + 1, origin.y + 1);
  let doneX = false;
  let doneY = false;
  while (!(doneX && doneY)) {
    // We want to use the original value when checking Y,
    //  so get it before it possibly gets incremented
    let endX = corner.x;

    // If we no longer move in the Y direction we need to check the corner tile in X pass
    const endY = doneY ? corner.y + 1 : corner.y;

    // Check X range
    if (!doneX) {
      for (let y = origin.y; y < endY; ++y) {
        if (data[y * width + corner.x] !== value) {
          doneX = true;
          break;
        }
      }

      if (doneX) {
        endingIndices.push(new Cartesian2(corner.x, origin.y));

        // Use the last good column so we can continue with Y
        --corner.x;
        --endX;
        range.endX = corner.x;
      } else if (corner.x === endCol) {
        range.endX = corner.x;
        doneX = true;
      } else {
        ++corner.x;
      }
    }

    // Check Y range - The corner tile is checked here
    if (!doneY) {
      const col = corner.y * width;
      for (let x = origin.x; x <= endX; ++x) {
        if (data[col + x] !== value) {
          doneY = true;
          break;
        }
      }

      if (doneY) {
        endingIndices.push(new Cartesian2(origin.x, corner.y));

        // Use the last good row so we can continue with X
        --corner.y;
        range.endY = corner.y;
      } else if (corner.y === endRow) {
        range.endY = corner.y;
        doneY = true;
      } else {
        ++corner.y;
      }
    }
  }

  return {
    endingIndices: endingIndices,
    range: range,
    value: value,
  };
}

function computeAvailability(x, y, width, height, data) {
  const ranges = [];

  const singleValue = data.every(function (val) {
    return val === data[0];
  });
  if (singleValue) {
    if (data[0] === 1) {
      ranges.push({
        startX: x,
        startY: y,
        endX: x + width - 1,
        endY: y + height - 1,
      });
    }

    return ranges;
  }

  let positions = [new Cartesian2(0, 0)];
  while (positions.length > 0) {
    const origin = positions.pop();
    const result = findRange(origin, width, height, data);

    if (result.value === 1) {
      // Convert range into the array into global tile coordinates
      const range = result.range;
      range.startX += x;
      range.endX += x;
      range.startY += y;
      range.endY += y;
      ranges.push(range);
    }

    const endingIndices = result.endingIndices;
    if (endingIndices.length > 0) {
      positions = positions.concat(endingIndices);
    }
  }

  return ranges;
}

function requestAvailability(that, level, x, y) {
  if (!that._hasAvailability) {
    return {};
  }

  // Fetch 128x128 availability list, so we make the minimum amount of requests
  const xOffset = Math.floor(x / 128) * 128;
  const yOffset = Math.floor(y / 128) * 128;

  const dim = Math.min(1 << level, 128);
  const url = `tilemap/${level}/${yOffset}/${xOffset}/${dim}/${dim}`;

  const availableCache = that._availableCache;
  if (defined(availableCache[url])) {
    return availableCache[url];
  }

  const request = new Request({
    throttle: false,
    throttleByServer: true,
    type: RequestType.TERRAIN,
  });

  const tilemapResource = that._resource.getDerivedResource({
    url: url,
    request: request,
  });

  let promise = tilemapResource.fetchJson();
  if (!defined(promise)) {
    return {};
  }

  promise = promise.then(function (result) {
    const available = computeAvailability(
      xOffset,
      yOffset,
      dim,
      dim,
      result.data
    );

    // Mark whole area as having availability loaded
    that._tilesAvailabilityLoaded.addAvailableTileRange(
      level,
      xOffset,
      yOffset,
      xOffset + dim,
      yOffset + dim
    );

    const tilesAvailable = that._tilesAvailable;
    for (let i = 0; i < available.length; ++i) {
      const range = available[i];
      tilesAvailable.addAvailableTileRange(
        level,
        range.startX,
        range.startY,
        range.endX,
        range.endY
      );
    }

    // Conveniently return availability of original tile
    return isTileAvailable(that, level, x, y);
  });

  availableCache[url] = {
    promise: promise,
    request: request,
  };

  promise = promise.finally(function (result) {
    delete availableCache[url];

    return result;
  });

  return {
    promise: promise,
    request: request,
  };
}
export default ArcGISTiledElevationTerrainProvider;
