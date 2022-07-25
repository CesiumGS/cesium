import Cartesian2 from "./Cartesian2.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
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
 * A {@link TerrainProvider} that produces terrain geometry by tessellating height maps
 * retrieved from Elevation Tiles of an an ArcGIS ImageService.
 *
 * @alias ArcGISTiledElevationTerrainProvider
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String|Promise<Resource>|Promise<String>} options.url The URL of the ArcGIS ImageServer service.
 * @param {String} [options.token] The authorization token to use to connect to the service.
 * @param {Ellipsoid} [options.ellipsoid] The ellipsoid.  If the tilingScheme is specified,
 *                    this parameter is ignored and the tiling scheme's ellipsoid is used instead.
 *                    If neither parameter is specified, the WGS84 ellipsoid is used.
 *
 * @example
 * const terrainProvider = new Cesium.ArcGISTiledElevationTerrainProvider({
 *   url : 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer',
 *   token : 'KED1aF_I4UzXOHy3BnhwyBHU4l5oY6rO6walkmHoYqGp4XyIWUd5YZUC1ZrLAzvV40pR6gBXQayh0eFA8m6vPg..'
 * });
 * viewer.terrainProvider = terrainProvider;
 *
 *  @see TerrainProvider
 */
function ArcGISTiledElevationTerrainProvider(options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options) || !defined(options.url)) {
    throw new DeveloperError("options.url is required.");
  }
  //>>includeEnd('debug');

  this._resource = undefined;
  this._credit = undefined;
  this._tilingScheme = undefined;
  this._levelZeroMaximumGeometricError = undefined;
  this._maxLevel = undefined;
  this._terrainDataStructure = undefined;
  this._ready = false;
  this._width = undefined;
  this._height = undefined;
  this._encoding = undefined;
  const token = options.token;

  this._hasAvailability = false;
  this._tilesAvailable = undefined;
  this._tilesAvailablityLoaded = undefined;
  this._availableCache = {};

  const that = this;
  const ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
  this._readyPromise = Promise.resolve(options.url)
    .then(function (url) {
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

      return metadataResource.fetchJson();
    })
    .then(function (metadata) {
      const copyrightText = metadata.copyrightText;
      if (defined(copyrightText)) {
        that._credit = new Credit(copyrightText);
      }

      const spatialReference = metadata.spatialReference;
      const wkid = defaultValue(
        spatialReference.latestWkid,
        spatialReference.wkid
      );
      const extent = metadata.extent;
      const tilingSchemeOptions = {
        ellipsoid: ellipsoid,
      };
      if (wkid === 4326) {
        tilingSchemeOptions.rectangle = Rectangle.fromDegrees(
          extent.xmin,
          extent.ymin,
          extent.xmax,
          extent.ymax
        );
        that._tilingScheme = new GeographicTilingScheme(tilingSchemeOptions);
      } else if (wkid === 3857) {
        tilingSchemeOptions.rectangleSouthwestInMeters = new Cartesian2(
          extent.xmin,
          extent.ymin
        );
        tilingSchemeOptions.rectangleNortheastInMeters = new Cartesian2(
          extent.xmax,
          extent.ymax
        );
        that._tilingScheme = new WebMercatorTilingScheme(tilingSchemeOptions);
      } else {
        return Promise.reject(new RuntimeError("Invalid spatial reference"));
      }

      const tileInfo = metadata.tileInfo;
      if (!defined(tileInfo)) {
        return Promise.reject(new RuntimeError("tileInfo is required"));
      }

      that._width = tileInfo.rows + 1;
      that._height = tileInfo.cols + 1;
      that._encoding =
        tileInfo.format === "LERC"
          ? HeightmapEncoding.LERC
          : HeightmapEncoding.NONE;
      that._lodCount = tileInfo.lods.length - 1;

      const hasAvailability = (that._hasAvailability =
        metadata.capabilities.indexOf("Tilemap") !== -1);
      if (hasAvailability) {
        that._tilesAvailable = new TileAvailability(
          that._tilingScheme,
          that._lodCount
        );
        that._tilesAvailable.addAvailableTileRange(
          0,
          0,
          0,
          that._tilingScheme.getNumberOfXTilesAtLevel(0),
          that._tilingScheme.getNumberOfYTilesAtLevel(0)
        );
        that._tilesAvailablityLoaded = new TileAvailability(
          that._tilingScheme,
          that._lodCount
        );
      }

      that._levelZeroMaximumGeometricError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
        that._tilingScheme.ellipsoid,
        that._width,
        that._tilingScheme.getNumberOfXTilesAtLevel(0)
      );

      if (metadata.bandCount > 1) {
        console.log(
          "ArcGISTiledElevationTerrainProvider: Terrain data has more than 1 band. Using the first one."
        );
      }

      that._terrainDataStructure = {
        elementMultiplier: 1.0,
        lowestEncodedHeight: metadata.minValues[0],
        highestEncodedHeight: metadata.maxValues[0],
      };

      that._ready = true;

      return true;
    })
    .catch(function (error) {
      const message = `An error occurred while accessing ${that._resource.url}.`;
      TileProviderError.reportError(undefined, that, that._errorEvent, message);
      return Promise.reject(error);
    });

  this._errorEvent = new Event();
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
   * the source of the terrain.  This function should not be called before {@link ArcGISTiledElevationTerrainProvider#ready} returns true.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this.ready) {
        throw new DeveloperError(
          "credit must not be called before ready returns true."
        );
      }
      //>>includeEnd('debug');
      return this._credit;
    },
  },

  /**
   * Gets the tiling scheme used by this provider.  This function should
   * not be called before {@link ArcGISTiledElevationTerrainProvider#ready} returns true.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {GeographicTilingScheme}
   * @readonly
   */
  tilingScheme: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this.ready) {
        throw new DeveloperError(
          "tilingScheme must not be called before ready returns true."
        );
      }
      //>>includeEnd('debug');
      return this._tilingScheme;
    },
  },

  /**
   * Gets a value indicating whether or not the provider is ready for use.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets a promise that resolves to true when the provider is ready for use.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {Promise.<Boolean>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  /**
   * Gets a value indicating whether or not the provider includes a water mask.  The water mask
   * indicates which areas of the globe are water rather than land, so they can be rendered
   * as a reflective surface with animated waves.  This function should not be
   * called before {@link ArcGISTiledElevationTerrainProvider#ready} returns true.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
   */
  hasWaterMask: {
    get: function () {
      return false;
    },
  },

  /**
   * Gets a value indicating whether or not the requested tiles include vertex normals.
   * This function should not be called before {@link ArcGISTiledElevationTerrainProvider#ready} returns true.
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {Boolean}
   * @readonly
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
   * @memberof ArcGISTiledElevationTerrainProvider.prototype
   * @type {TileAvailability|undefined}
   * @readonly
   */
  availability: {
    get: function () {
      //>>includeStart('debug', pragmas.debug)
      if (!this._ready) {
        throw new DeveloperError(
          "availability must not be called before the terrain provider is ready."
        );
      }
      //>>includeEnd('debug');
      return this._tilesAvailable;
    },
  },
});

/**
 * Requests the geometry for a given tile.  This function should not be called before
 * {@link ArcGISTiledElevationTerrainProvider#ready} returns true.  The result includes terrain
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
ArcGISTiledElevationTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  //>>includeStart('debug', pragmas.debug)
  if (!this._ready) {
    throw new DeveloperError(
      "requestTileGeometry must not be called before the terrain provider is ready."
    );
  }
  //>>includeEnd('debug');

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

  const tilesAvailablityLoaded = that._tilesAvailablityLoaded;
  const tilesAvailable = that._tilesAvailable;

  if (level > that._lodCount) {
    return false;
  }

  // Check if tiles are known to be available
  if (tilesAvailable.isTileAvailable(level, x, y)) {
    return true;
  }

  // or to not be available
  if (tilesAvailablityLoaded.isTileAvailable(level, x, y)) {
    return false;
  }

  return undefined;
}

/**
 * Gets the maximum geometric error allowed in a tile at a given level.
 *
 * @param {Number} level The tile level for which to get the maximum geometric error.
 * @returns {Number} The maximum geometric error.
 */
ArcGISTiledElevationTerrainProvider.prototype.getLevelMaximumGeometricError = function (
  level
) {
  //>>includeStart('debug', pragmas.debug);
  if (!this.ready) {
    throw new DeveloperError(
      "getLevelMaximumGeometricError must not be called before ready returns true."
    );
  }
  //>>includeEnd('debug');

  return this._levelZeroMaximumGeometricError / (1 << level);
};

/**
 * Determines whether data for a tile is available to be loaded.
 *
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
 * @returns {Boolean|undefined} Undefined if not supported, otherwise true or false.
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
 * @param {Number} x The X coordinate of the tile for which to request geometry.
 * @param {Number} y The Y coordinate of the tile for which to request geometry.
 * @param {Number} level The level of the tile for which to request geometry.
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
    that._tilesAvailablityLoaded.addAvailableTileRange(
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
