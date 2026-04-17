import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import MVTVectorContent from "./MVTVectorContent.js";
import VectorTileRuntime, {
  createUrlTemplateTileFetcher,
} from "./VectorTileRuntime.js";

/**
 * @alias MVTDataProvider
 * @constructor
 *
 * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
 * @param {object} [options] Provider options.
 * @param {number} [options.minZoom=0] Minimum requested zoom level.
 * @param {number} [options.maxZoom=14] Maximum requested zoom level.
 * @param {Rectangle} [options.extent] Optional geographic extent in radians to limit tile requests.
 */
function MVTDataProvider(urlTemplate, options) {
  options = options ?? {};

  this._tileFetcher = createUrlTemplateTileFetcher(urlTemplate);
  this._runtime = new VectorTileRuntime({
    minZoom: options.minZoom,
    maxZoom: options.maxZoom,
    extent: options.extent,
    createTileContent: createMvtTileContentFactory(this._tileFetcher),
  });
}

Object.defineProperties(MVTDataProvider.prototype, {
  /**
   * The URL template used by this provider.
   *
   * @memberof MVTDataProvider.prototype
   * @type {string}
   * @readonly
   */
  urlTemplate: {
    get: function () {
      return this._tileFetcher.urlTemplate;
    },
  },

  /**
   * Resource derived from the URL template.
   *
   * @memberof MVTDataProvider.prototype
   * @type {Resource}
   * @readonly
   */
  resource: {
    get: function () {
      return this._tileFetcher.resource;
    },
  },

  /**
   * Optional geographic extent in radians used to limit tile requests.
   *
   * @memberof MVTDataProvider.prototype
   * @type {Rectangle|undefined}
   * @readonly
   */
  extent: {
    get: function () {
      return this._runtime.extent;
    },
  },
});

/**
 * Creates a provider from an MVT URL template.
 *
 * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
 * @param {object} [options] Provider options.
 * @param {number} [options.minZoom=0] Minimum requested zoom level.
 * @param {number} [options.maxZoom=14] Maximum requested zoom level.
 * @param {Rectangle} [options.extent] Optional geographic extent in radians to limit tile requests.
 * @returns {Promise<MVTDataProvider>}
 */
MVTDataProvider.fromUrlTemplate = async function (urlTemplate, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("urlTemplate", urlTemplate);
  if (defined(options)) {
    if (defined(options.minZoom)) {
      Check.typeOf.number("options.minZoom", options.minZoom);
    }
    if (defined(options.maxZoom)) {
      Check.typeOf.number("options.maxZoom", options.maxZoom);
    }
    if (defined(options.extent)) {
      Check.typeOf.object("options.extent", options.extent);
    }
  }
  //>>includeEnd('debug');
  return new MVTDataProvider(urlTemplate, options);
};

MVTDataProvider.prototype.update = function (frameState) {
  this._runtime.update(frameState);
};

MVTDataProvider.prototype.isDestroyed = function () {
  return false;
};

MVTDataProvider.prototype.destroy = function () {
  this._runtime.destroy();
  this._runtime = undefined;
  this._tileFetcher = undefined;
  return destroyObject(this);
};

function createMvtTileContentFactory(tileFetcher) {
  return async function createMvtTileContent(level, x, y) {
    const tileResult = await tileFetcher.fetchTile(level, x, y);
    if (!defined(tileResult)) {
      return undefined;
    }
    if (tileResult.status === "missing") {
      return { status: "missing" };
    }

    const content = await MVTVectorContent.fromArrayBuffer(
      tileResult.resource,
      tileResult.arrayBuffer,
      {
        tileX: x,
        tileY: y,
        tileZ: level,
      },
    );

    if (!defined(content)) {
      return { status: "missing" };
    }

    return {
      status: "ready",
      content: content,
    };
  };
}

export default MVTDataProvider;
