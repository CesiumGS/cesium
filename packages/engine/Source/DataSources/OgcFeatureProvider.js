import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Event from "../Core/Event.js";
import GeographicTilingScheme from "../Core/GeographicTilingScheme.js";
import JulianDate from "../Core/JulianDate.js";
import Rectangle from "../Core/Rectangle.js";
import RequestState from "../Core/RequestState.js";
import Resource from "../Core/Resource.js";
import FeatureLayer from "./FeatureLayer.js";

/**
 * @import Camera from "../Scene/Camera"
 */
/**
 * @typedef {Object} OgcFeatureProvider.ConstructorOptions
 * @property {string} baseUrl
 */

/**
 * @private
 * @param {number[]} bbox array of 4 numbers representing a rectangle
 * @returns {Rectangle}
 */
function bboxToRect(bbox) {
  return Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]);
}

/**
 * @private
 * @param {Rectangle} rectangle
 * @returns {number[]} array of 4 numbers representing a rectangle
 */
function rectToBbox(rectangle) {
  const { west, south, east, north } = rectangle.toDegrees();
  return [west, south, east, north];
}

/**
 * @private
 * @param {GeographicTilingScheme} tilingScheme
 * @param {Rectangle} rectangle
 * @param {number} level
 * @returns {Map<string, Rectangle>} keys will equal "[x] [y] [level]"
 */
function tileRectanglesInRectangle(tilingScheme, rectangle, level = 0) {
  /** @type {Map<string, Rectangle>} */
  const result = new Map();

  // TODO: should this be moved into the TilingScheme classes itself? seems very handy to have in general
  // This is very similar to ImageryLayer._createTileImagerySkeletons
  if (!defined(rectangle)) {
    return result;
  }

  // use the intersection as the basis in case any points of rect are
  // outside the bounds of the tiling scheme
  const intersection = Rectangle.intersection(
    rectangle,
    tilingScheme.rectangle,
  );

  if (!defined(intersection)) {
    return result;
  }

  const northWest = Rectangle.northwest(intersection);
  const southEast = Rectangle.southeast(intersection);

  const posNW = tilingScheme.positionToTileXY(northWest, level);
  const posSE = tilingScheme.positionToTileXY(southEast, level);

  // console.log({ posNW, posSE });

  const minX = posNW?.x ?? 0;
  const maxX = posSE?.x ?? tilingScheme.getNumberOfXTilesAtLevel(level) - 1;
  const minY = posNW?.y ?? 0;
  const maxY = posSE?.y ?? tilingScheme.getNumberOfYTilesAtLevel(level) - 1;

  // TODO: trim out south/east tiles if SE corner is near NW corner of SE most tile
  // TODO: trim out the north/west tiles if NW corner is near SE corner of NW most tile

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const tileKey = `${x} ${y} ${level}`;
      const tileRect = tilingScheme.tileXYToRectangle(x, y, level);
      result.set(tileKey, tileRect);
      // console.log(x, y, level, tileRect.toString());
    }
  }

  return result;
}

/**
 * An object to keep track of the state of each "tile" we're loading data for
 * @typedef {Object} TileTracker
 * @private
 * @property {number} featuresLoaded defaults to 0
 * @property {boolean} active defaults to false
 * @property {string | undefined} nextLink defaults to undefined
 * @property {boolean} fullyLoaded defaults to false
 * @property {AbortController | undefined} abortController defaults to undefined
 */

/**
 * A class for things
 * @constructor
 * @extends FeatureProvider
 * @param {OgcFeatureProvider.ConstructorOptions} options
 */
function OgcFeatureProvider(baseUrl, collectionId, options) {
  this.baseUrl = baseUrl;
  this.id = collectionId;
  // TODO: how do auth? this works but might not align with other parts of the API
  this.queryParameters = options.queryParameters;
  this.headers = options.headers;

  // TODO: decide what defaults make sense here
  this.maxItems = options?.maxItems ?? 10000;
  this.limitPerRequest = options?.limitPerRequest ?? 1000;

  this._ellipsoid = options.ellipsoid ?? Ellipsoid.default;

  this._itemsLoaded = 0;
  this._nextLink = undefined;
  this._collectionLoaded = false;
  this._metadata = undefined;
  this._bbox = undefined;
  this._availability = undefined;
  this._tilingScheme = new GeographicTilingScheme({
    numberOfLevelZeroTilesX: 2,
    numberOfLevelZeroTilesY: 2,
    ellipsoid: this._ellipsoid,
  });
  /** @type {Map<string, TileTracker>} */
  this._loadedTiles = new Map();

  this.dataLoaded = new Event();
}

// TODO: remove if still empty
Object.defineProperties(OgcFeatureProvider.prototype, {});

OgcFeatureProvider.prototype.loadCollection = async function () {
  const resource = new Resource({
    url: `${this.baseUrl}/collections/${this.id}`,
    queryParameters: this.queryParameters,
    headers: this.headers,
  });
  const json = await resource.fetchJson();
  this._collectionLoaded = true;
  this._metadata = json;
  if (defined(json.extent?.spatial)) {
    const rect = bboxToRect(json.extent.spatial.bbox[0]);
    this._bbox = rect;
    this._tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 2,
      ellipsoid: this._ellipsoid,
      rectangle: rect,
    });
  }
  if (defined(json.extent?.temporal)) {
    if (
      defined(json.extent.temporal.trs) &&
      json.extent.temporal.trs !==
        "http://www.opengis.net/def/uom/ISO-8601/0/Gregorian"
    ) {
      console.warn(
        "OgcFeatureProvider does not support alternative TRS, ignoring",
        json.extent.temporal.trs,
      );
    } else {
      this._availability = json.extent.temporal?.interval[0].map((time) =>
        defined(time) ? JulianDate.fromIso8601(time) : null,
      );
    }
  }
};

/**
 * @param {string} baseUrl
 * @param {string} collectionId
 * @param {Object} options
 * @param {number} [options.limit]
 * @param {Rectangle} [options.bbox]
 * @param {Object} [options.queryParameters]
 * @param {Object} [options.headers]
 * @returns {Resource}
 */
function createCollectionResource(baseUrl, collectionId, options = {}) {
  const resource = new Resource({
    url: `${baseUrl}/collections/${collectionId}/items`,
  });
  const { queryParameters, headers, limit, bbox } = options;
  if (queryParameters) {
    resource.setQueryParameters(queryParameters);
  }
  if (headers) {
    resource.headers = headers;
  }
  if (defined(limit) && limit > 0) {
    resource.appendQueryParameters({ limit });
  }
  if (bbox) {
    resource.appendQueryParameters({ bbox: rectToBbox(bbox).join(",") });
  }

  return resource;
}

// /**
//  * @param {Resource} resource
//  */
// function cancelResource(resource) {
//   // TODO: This logic was copied from the RequestScheduler.
//   // Not sure the best way to tie it in or if we even want to
//   // it definitely seems to be better when actually aborting things instead of waiting
//   // and ignoring the responses
//   // if (resource.request.cancelFunction) {
//   //   resource.request.cancelFunction();
//   //   resource.request.state = RequestState.CANCELLED;
//   //   resource.request.deferred.reject();
//   // }
//   resource.request.cancel();
// }

/**
 * @param {string} tileKey
 * @param {JulianDate} time
 * @returns {Promise<void>}
 */
OgcFeatureProvider.prototype._requestTile = async function (tileKey, time) {
  const [x, y, level] = tileKey.split(" ").map(Number.parseInt);
  const tileTracker = this._loadedTiles.get(tileKey);

  if (!defined(tileTracker) || tileTracker.fullyLoaded || tileTracker.active) {
    return;
  }

  // This is for the entire MULTI-PAGE request, maybe need a better name
  // TODO: this feels like it works nicer than a total "max items" for the whole provider
  let itemsLoadedThisRequest = 0;

  if (defined(tileTracker.abortController)) {
    tileTracker.abortController.abort();
  }
  const localAbortController = new AbortController();
  tileTracker.abortController = localAbortController;
  localAbortController.signal.addEventListener("abort", () => {
    // console.warn(tile, "aborted from controller!");
    tileTracker.active = false;
  });

  // TODO: this should start with the previous nextLink if it exists
  // But only if we're still in the same bbox and time of request so may be not actually
  const resource = createCollectionResource(this.baseUrl, this.id, {
    limit: this.limitPerRequest,
    bbox: this._tilingScheme.tileXYToRectangle(x, y, level),
    queryParameters: this.queryParameters,
    headers: this.headers,
  });
  tileTracker.active = true;
  const jsonRequest = resource
    .fetchJson({ signal: localAbortController.signal })
    ?.catch((error) => {
      if (resource.request.state === RequestState.CANCELLED) {
        return;
      }
      throw error;
    });
  const json = await jsonRequest;

  if (localAbortController.signal.aborted) {
    console.log(tileKey, "cancelled loading during first request");
    tileTracker.active = false;
    return;
  }

  if (!defined(json)) {
    tileTracker.active = false;
    return;
  }

  itemsLoadedThisRequest += json.numberReturned ?? json.features?.length;
  tileTracker.featuresLoaded += json.numberReturned ?? json.features?.length;
  tileTracker.nextLink = json.links?.find((link) => link.rel === "next")?.href;

  this.dataLoaded.raiseEvent(json);

  while (
    defined(tileTracker.nextLink) &&
    itemsLoadedThisRequest < this.maxItems
  ) {
    if (localAbortController.signal.aborted) {
      console.log(tileKey, "cancelled loading at start of while loop");
      tileTracker.active = false;
      return;
    }
    // console.log("loading next page", this._nextLink);

    let currentLimit = this.limitPerRequest;
    if (itemsLoadedThisRequest + currentLimit > this.maxItems) {
      // if a "full page" would load more than maxItems load the remaining difference instead
      currentLimit = this.maxItems - itemsLoadedThisRequest;
    }

    const nextUrlPath = new URL(tileTracker.nextLink);
    if (defined(this.queryParameters)) {
      Object.entries(this.queryParameters).forEach(([key, value]) => {
        nextUrlPath.searchParams.set(key, value);
      });
    }
    nextUrlPath.searchParams.set("limit", currentLimit);

    // TODO: really would like a way to tie into a way to cancel the actual request on Resource
    const nextPageResource = new Resource({
      url: nextUrlPath.href,
      headers: this.headers,
    });
    const nextPageRequest = nextPageResource
      .fetchJson({
        signal: localAbortController.signal,
      })
      .catch((error) => {
        if (resource.request.state === RequestState.CANCELLED) {
          tileTracker.active = false;
          return;
        }
        throw error;
      });
    const nextPage = await nextPageRequest;
    if (localAbortController.signal.aborted) {
      console.log(tileKey, "cancelled loading during page request");
      tileTracker.active = false;
      return;
    }

    this.dataLoaded.raiseEvent(nextPage);

    itemsLoadedThisRequest +=
      nextPage.numberReturned ?? nextPage.features?.length;
    tileTracker.featuresLoaded +=
      nextPage.numberReturned ?? nextPage.features?.length;
    tileTracker.nextLink = nextPage.links?.find(
      (link) => link.rel === "next",
    )?.href;
  }

  tileTracker.fullyLoaded = true;
  tileTracker.active = false;

  if (itemsLoadedThisRequest >= this.maxItems) {
    console.log(tileKey, "max items per request hit", itemsLoadedThisRequest);
  } else {
    console.log(tileKey, "no more next link for current request");
    tileTracker.fullyLoaded = true;
  }
};

const scratchViewRectangle = new Rectangle();

/**
 * @param {Object} options
 * @param {Camera} options.camera
 * @param {JulianDate} [options.time]
 * @returns {Promise<undefined>}
 */
OgcFeatureProvider.prototype.requestFeatures = async function ({
  camera,
  time,
}) {
  if (!this._collectionLoaded) {
    await this.loadCollection();
  }

  if (defined(this._availability) && defined(time)) {
    const [start, end] = this._availability;
    if (
      // !this.ignoreAvailability && // TODO: do we want this kind of option how do other classes handle availability?
      !JulianDate.equals(start, end) && // TODO: I'm not sure if we want this check
      (JulianDate.lessThan(time, start) || JulianDate.greaterThan(time, end))
    ) {
      // TODO: remove log
      console.log("Skipping request, outside of time extent");
      return;
    }
  }

  const cameraRect = camera.computeViewRectangle(
    this._ellipsoid,
    scratchViewRectangle,
  );

  // console.log("requestFeatures", cameraRect, time, time?.toString());

  const level = 0;
  const tiles = tileRectanglesInRectangle(
    this._tilingScheme,
    cameraRect,
    level,
  );

  // TODO: I don't like this spread, is there a better way to track active items?
  [...this._loadedTiles.entries()]
    .filter(([tileKey, tileTracker]) => {
      return tileTracker.active && !tiles.has(tileKey);
    })
    .forEach(([, tileTracker]) => {
      // cancel loading of tiles that are no longer visible
      tileTracker.abortController?.abort();
    });

  const requestedTiles = tiles.keys();
  for (const tileKey of requestedTiles) {
    let tileTracker = this._loadedTiles.get(tileKey);

    if (!defined(tileTracker)) {
      this._loadedTiles.set(tileKey, {
        featuresLoaded: 0,
        active: false,
        nextLink: undefined,
        fullyLoaded: false,
        abortController: undefined,
      });
      tileTracker = this._loadedTiles.get(tileKey);
      // console.log("created loaded tile record", tileKey);
    }

    if (!tileTracker.active) {
      this._requestTile(tileKey, time);
    }
  }
};

OgcFeatureProvider.prototype.cancelRequests = async function () {
  [...this._loadedTiles.values()]
    .filter((tileTracker) => {
      return tileTracker.active;
    })
    .forEach((tileTracker) => {
      // cancel any active tile requests
      tileTracker.abortController?.abort();
    });
};

OgcFeatureProvider.prototype.createLayer = function (options) {
  return new FeatureLayer(this, {
    ...options,
    id: this.id,
  });
};

export default OgcFeatureProvider;
