import defined from "../Core/defined.js";
import JulianDate from "../Core/JulianDate.js";
import Rectangle from "../Core/Rectangle.js";
import RequestState from "../Core/RequestState.js";
import Resource from "../Core/Resource.js";
import FeatureLayer from "./FeatureLayer.js";

/**
 * @typedef {Object} OgcFeatureProvider.ConstructorOptions
 * @property {string} baseUrl
 */

/**
 * @param {[number, number, number, number]} bbox
 * @returns {Rectangle}
 */
function bboxToRect(bbox) {
  return Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3]);
}

/**
 * @param {Rectangle} rectangle
 * @returns {[number, number, number, number]}
 */
function rectToBbox(rectangle) {
  const { west, south, east, north } = rectangle.toDegrees();
  return [west, south, east, north];
}

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

  this._itemsLoaded = 0;
  this._nextLink = undefined;
  this._collectionLoaded = false;
}

Object.defineProperties(OgcFeatureProvider.prototype, {
  canLoadMore: {
    get: function () {
      return defined(this._nextLink) && this._itemsLoaded < this.maxItems;
    },
  },
});

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
    this._bbox = bboxToRect(json.extent.spatial.bbox[0]);
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

/**
 * @param {Resource} resource
 */
function cancelResource(resource) {
  // TODO: This logic was copied from the RequestScheduler.
  // Not sure the best way to tie it in or if we even want to
  // it definitely seems to be better when actually aborting things instead of waiting
  // and ignoring the responses
  if (resource.request.cancelFunction) {
    resource.request.cancelFunction();
    resource.request.state = RequestState.CANCELLED;
    resource.request.deferred.reject();
  }
}

/**
 * @param {Object} options
 * @param {Rectangle} [options.bbox]
 * @param {JulianDate} [options.time]
 * @param {function} options.partialLoadCallback
 * @returns {Promise<undefined>}
 */
OgcFeatureProvider.prototype.requestFeatures = async function ({
  bbox,
  time,
  partialLoadCallback,
}) {
  console.log("requestFeatures", bbox, time, time?.toString());

  if (!this._collectionLoaded) {
    await this.loadCollection();
  }

  // TODO: compute if bbox arg is inside the extent bbox

  // TODO: Might be good to try and keep track of what areas we _have_ already loaded
  // and whether we've run out of `next` links for that area to indicate we've already
  // loaded all the data we possibly could there

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

  // This is for the entire MULTI-PAGE request, maybe need a better name
  // TODO: this feels like it works nicer than a total "max items" for the whole provider
  let itemsLoadedThisRequest = 0;

  // if (this._itemsLoaded >= this.maxItems) {
  //   // TODO: larger discussion, how should we manage `maxItems`? If we max out but then
  //   // move the camera somewhere else maybe there's more items over there that we should load
  //   // should we unload previous items and remove them from the max?
  //   // should we even track the maxItems period? maybe it's not needed with improvements to rendering?
  //   // this is mostly a memory concern I think and maybe prematurely trying to prevent it.

  //   // TODO: remove log
  //   console.log("Over max items already");
  //   return;
  // }

  if (defined(this._abortController)) {
    this._abortController.abort();
  }
  const localAbortController = new AbortController();
  this._abortController = localAbortController;

  if (defined(this._activeResource)) {
    cancelResource(this._activeResource);
    this._activeResource = undefined;
  }

  // TODO: this should start with the previous nextLink if it exists
  // But only if we're still in the same bbox and time of request so may be not actually
  const resource = createCollectionResource(this.baseUrl, this.id, {
    limit: this.limitPerRequest,
    bbox: bbox,
    queryParameters: this.queryParameters,
    headers: this.headers,
  });
  const jsonRequest = resource.fetchJson()?.catch((error) => {
    if (resource.request.state === RequestState.CANCELLED) {
      return;
    }
    throw error;
  });
  this._activeResource = resource;
  const json = await jsonRequest;

  if (localAbortController.signal.aborted) {
    console.log("cancelled loading during first request");
    return;
  }

  if (!defined(json)) {
    return;
  }

  itemsLoadedThisRequest += json.numberReturned ?? json.features?.length;
  this._itemsLoaded += json.numberReturned ?? json.features?.length;
  this._nextLink = json.links?.find((link) => link.rel === "next")?.href;

  partialLoadCallback(json);

  while (
    defined(this._nextLink) &&
    // this._itemsLoaded < this.maxItems
    itemsLoadedThisRequest < this.maxItems
  ) {
    if (localAbortController.signal.aborted) {
      console.log("cancelled loading at start of while loop");
      return;
    }
    // console.log("loading next page", this._nextLink);

    let currentLimit = this.limitPerRequest;
    // if (this._itemsLoaded + currentLimit > this.maxItems) {
    if (itemsLoadedThisRequest + currentLimit > this.maxItems) {
      // if a "full page" would load more than maxItems load the remaining difference instead
      currentLimit = this.maxItems - this._itemsLoaded;
    }

    const nextUrlPath = new URL(this._nextLink);
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
    const nextPageRequest = nextPageResource.fetchJson().catch((error) => {
      if (resource.request.state === RequestState.CANCELLED) {
        return;
      }
      throw error;
    });
    this._activeResource = nextPageResource;
    const nextPage = await nextPageRequest;
    if (localAbortController.signal.aborted) {
      console.log("cancelled loading during page request");
      return;
    }
    partialLoadCallback(nextPage);

    itemsLoadedThisRequest +=
      nextPage.numberReturned ?? nextPage.features?.length;
    this._itemsLoaded += nextPage.numberReturned ?? nextPage.features?.length;
    this._nextLink = nextPage.links?.find((link) => link.rel === "next")?.href;
  }

  if (itemsLoadedThisRequest >= this.maxItems) {
    console.log("max items per request hit", itemsLoadedThisRequest);
  } else {
    console.log("no more next link for current request");
  }
};

OgcFeatureProvider.prototype.cancelRequests = async function () {
  if (defined(this._abortController)) {
    this._abortController.abort();
  }
  if (defined(this._activeResource)) {
    cancelResource(this._activeResource);
    this._activeResource = undefined;
  }
};

OgcFeatureProvider.prototype.createLayer = function (options) {
  return new FeatureLayer(this, {
    ...options,
    id: this.id,
  });
};

export default OgcFeatureProvider;
