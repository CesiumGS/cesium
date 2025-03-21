import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
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

const scratchPixelSize = new Cartesian2();
/**
 *
 * @param {Camera} camera
 * @returns
 */
function getPixelSize(camera, context, pixelRatio) {
  // const canvas = viewer.scene.canvas;
  // const centerPixel = new Cartesian2(
  //   canvas.clientWidth / 2.0,
  //   canvas.clientHeight / 2.0,
  // );
  // const ellipsoid = viewer.scene.ellipsoid;
  // const center = viewer.camera.pickEllipsoid(centerPixel, ellipsoid);

  // const pixelSize = viewer.camera.getPixelSize(
  //   new BoundingSphere(center, 1),
  //   viewer.canvas.clientWidth,
  //   viewer.canvas.clientHeight,
  // );

  // alternative from only camera height
  const cameraHeight = camera.positionCartographic.height;
  const pixelDimensions = camera.frustum.getPixelDimensions(
    context.drawingBufferWidth,
    context.drawingBufferHeight,
    cameraHeight,
    pixelRatio,
    scratchPixelSize,
  );
  const pixelSize = Math.max(pixelDimensions.x, pixelDimensions.y);

  return pixelSize;
}

function rectangleWidth(rect) {
  // Check top and bottom due to curvature of the earth potentially causing
  // the width at the poles to be super small and not really representative
  const topWidth = Cartesian3.distance(
    Cartographic.toCartesian(Rectangle.northwest(rect)),
    Cartographic.toCartesian(Rectangle.northeast(rect)),
  );
  const bottomWidth = Cartesian3.distance(
    Cartographic.toCartesian(Rectangle.southwest(rect)),
    Cartographic.toCartesian(Rectangle.southeast(rect)),
  );
  return Math.max(topWidth, bottomWidth);
}

function rectangleHeight(rect) {
  return Cartesian3.distance(
    Cartographic.toCartesian(Rectangle.northwest(rect)),
    Cartographic.toCartesian(Rectangle.southwest(rect)),
  );
}

function findTileLevel(tilingScheme, pixelSize) {
  for (let level = 0; level < 15; level++) {
    const levelTileRect = tilingScheme.tileXYToRectangle(
      level * 2,
      level * 2,
      level,
    );
    const width = rectangleWidth(levelTileRect);
    const pixelWidth = width / pixelSize;
    const height = rectangleHeight(levelTileRect);
    const pixelHeight = height / pixelSize;

    if (Math.max(pixelWidth, pixelHeight) < 100) {
      // TODO: tune this number or pick a different method of deciding
      // If the rectangle would be smaller than X pixels return the level above it
      return Math.max(level - 1, 0);
    }
  }
  return 0;
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
 * @property {boolean} isEmpty defaults to false
 * @property {string | undefined} nextLink defaults to undefined
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
    numberOfLevelZeroTilesY: 1,
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

  if (!defined(json)) {
    return;
  }

  this._collectionLoaded = true;
  this._metadata = json;
  if (defined(json.extent?.spatial)) {
    const rect = bboxToRect(json.extent.spatial.bbox[0]);
    this._bbox = rect;
    const rectAspectRatio =
      Rectangle.computeWidth(rect) / Rectangle.computeHeight(rect);
    this._tilingScheme = new GeographicTilingScheme({
      numberOfLevelZeroTilesX: Math.max(Math.round(rectAspectRatio), 1),
      numberOfLevelZeroTilesY: 1,
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
 * @param {JulianDate | undefined} time
 * @returns {Promise<void>}
 */
OgcFeatureProvider.prototype._requestTile = async function (tileKey, time) {
  const [x, y, level] = tileKey.split(" ").map((n) => Number.parseInt(n));
  const tileTracker = this._loadedTiles.get(tileKey);
  console.log("_requestTile", { x, y, level });

  if (!defined(tileTracker) || tileTracker.active || tileTracker.isEmpty) {
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
    // console.log(tileKey, "cancelled loading during first request");
    tileTracker.active = false;
    return;
  }

  if (!defined(json)) {
    tileTracker.active = false;
    return;
  }

  const featuresReturned = json.numberReturned ?? json.features?.length;
  itemsLoadedThisRequest += featuresReturned;
  tileTracker.featuresLoaded += featuresReturned;
  if (featuresReturned === 0) {
    tileTracker.isEmpty = true;
  }
  tileTracker.nextLink = json.links?.find((link) => link.rel === "next")?.href;

  this.dataLoaded.raiseEvent(json);

  while (
    defined(tileTracker.nextLink) &&
    itemsLoadedThisRequest < this.maxItems
  ) {
    if (localAbortController.signal.aborted) {
      // console.log(tileKey, "cancelled loading at start of while loop");
      tileTracker.active = false;
      return;
    }

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
      ?.catch((error) => {
        if (resource.request.state === RequestState.CANCELLED) {
          return;
        }
        throw error;
      });
    if (!defined(nextPageRequest)) {
      // TODO: this can happen if the request scheduler doesn't create the request
      // figure out a nice way to handle this?
      tileTracker.active = false;
      return;
    }

    const nextPage = await nextPageRequest;
    if (localAbortController.signal.aborted) {
      // console.log(tileKey, "cancelled loading during page request");
      tileTracker.active = false;
      return;
    }

    if (!defined(nextPage)) {
      // TODO: check if this can even happen?
      // It can if the request is cancelled but the abort check should catch that?
      // maybe if the reqest fully fails?
      // but then it should throw an error which wouldn't get here anyway
      tileTracker.active = false;
      return;
    }

    this.dataLoaded.raiseEvent(nextPage);

    const featuresReturned = json.numberReturned ?? json.features?.length;
    itemsLoadedThisRequest += featuresReturned;
    tileTracker.featuresLoaded += featuresReturned;
    tileTracker.nextLink = nextPage.links?.find(
      (link) => link.rel === "next",
    )?.href;
  }

  tileTracker.active = false;

  if (itemsLoadedThisRequest >= this.maxItems) {
    console.log(tileKey, "max items per request hit", itemsLoadedThisRequest);
  } else {
    // console.log(tileKey, "no more next link for current request");
  }
};

const scratchViewRectangle = new Rectangle();

/**
 * @param {Object} options
 * @param {Camera} options.camera
 * @param {Object} options.context
 * @param {number} options.pixelRatio
 * @param {JulianDate} [options.time]
 * @returns {Promise<undefined>}
 */
OgcFeatureProvider.prototype.requestFeatures = async function ({
  camera,
  time,
  context,
  pixelRatio,
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

  const pixelSize = getPixelSize(camera, context, pixelRatio);

  const level = findTileLevel(this._tilingScheme, pixelSize);
  console.log("request level", level);
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
        isEmpty: false,
        nextLink: undefined,
        abortController: undefined,
      });
      tileTracker = this._loadedTiles.get(tileKey);
    }

    if (!tileTracker.active && !tileTracker.isEmpty) {
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
