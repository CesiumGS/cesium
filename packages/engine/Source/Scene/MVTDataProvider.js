import Cartesian2 from "../Core/Cartesian2.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import MVTVectorContent from "./MVTVectorContent.js";
import Resource from "../Core/Resource.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";

const REQUEST_RADIUS = 2;
const DEFAULT_MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 14;
const EARTH_CIRCUMFERENCE_METERS = 40075016.68557849;

const scratchCartographic = new Cartographic();
const scratchTileXY = new Cartesian2();

/**
 * @alias MVTDataProvider
 * @constructor
 *
 * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
 * @param {object} [options] Provider options.
 * @param {number} [options.minZoom=0] Minimum requested zoom level.
 * @param {number} [options.maxZoom=14] Maximum requested zoom level.
 */
function MVTDataProvider(urlTemplate, options) {
  options = options ?? {};

  const resource = Resource.createIfNeeded(urlTemplate);
  this._resource = resource;
  this._urlTemplate = resource.url;
  this._tilingScheme = new WebMercatorTilingScheme();
  this._tileContents = new Map();
  this._tilePromises = new Map();
  this._missingTiles = new Set();

  const minZoom = normalizeZoom(options.minZoom, DEFAULT_MIN_ZOOM);
  const maxZoom = normalizeZoom(options.maxZoom, DEFAULT_MAX_ZOOM);
  this._minZoom = Math.min(minZoom, maxZoom);
  this._maxZoom = Math.max(minZoom, maxZoom);
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
      return this._urlTemplate;
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
      return this._resource;
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
  }
  //>>includeEnd('debug');
  return new MVTDataProvider(urlTemplate, options);
};

/**
 * @private
 * @param {number} level
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
MVTDataProvider.prototype._requestTile = function (level, x, y) {
  const key = makeTileKey(level, x, y);
  if (
    this._tileContents.has(key) ||
    this._tilePromises.has(key) ||
    this._missingTiles.has(key)
  ) {
    return;
  }

  const url = buildTileUrl(this._urlTemplate, level, x, y);
  const resource = this._resource.getDerivedResource({ url: url });

  const promise = resource
    .fetchArrayBuffer()
    .then(async (arrayBuffer) => {
      if (!defined(arrayBuffer)) {
        return;
      }

      const content = await MVTVectorContent.fromArrayBuffer(
        resource,
        arrayBuffer,
      );
      if (!defined(content)) {
        return;
      }

      this._tileContents.set(key, content);
    })
    .catch((error) => {
      if (defined(error) && error.statusCode === 404) {
        this._missingTiles.add(key);
      }
    })
    .finally(() => {
      this._tilePromises.delete(key);
    });

  this._tilePromises.set(key, promise);
};

/**
 * @private
 * @param {FrameState} frameState
 */
MVTDataProvider.prototype.update = function (frameState) {
  const camera = frameState.camera;
  let centerCartographic = camera.positionCartographic;
  if (!defined(centerCartographic)) {
    centerCartographic = Cartographic.fromCartesian(
      camera.positionWC,
      this._tilingScheme.ellipsoid,
      scratchCartographic,
    );
  }
  if (!defined(centerCartographic)) {
    return;
  }

  const level = estimateRequestLevel(
    centerCartographic.height,
    this._minZoom,
    this._maxZoom,
  );
  const centerTile = this._tilingScheme.positionToTileXY(
    centerCartographic,
    level,
    scratchTileXY,
  );
  if (!defined(centerTile)) {
    return;
  }

  const maxCoordinate = (1 << level) - 1;
  const desiredTiles = new Set();

  for (let dy = -REQUEST_RADIUS; dy <= REQUEST_RADIUS; dy++) {
    const y = centerTile.y + dy;
    if (y < 0 || y > maxCoordinate) {
      continue;
    }
    for (let dx = -REQUEST_RADIUS; dx <= REQUEST_RADIUS; dx++) {
      const rawX = centerTile.x + dx;
      const x = CesiumMath.mod(rawX, maxCoordinate + 1);
      const key = makeTileKey(level, x, y);
      desiredTiles.add(key);
      if (
        !this._tileContents.has(key) &&
        !this._tilePromises.has(key) &&
        !this._missingTiles.has(key)
      ) {
        this._requestTile(level, x, y);
      }
    }
  }

  for (const key of desiredTiles) {
    const content = this._tileContents.get(key);
    if (!defined(content)) {
      continue;
    }
    content.update(frameState);
  }

  for (const [key, content] of this._tileContents.entries()) {
    if (desiredTiles.has(key)) {
      continue;
    }
    content.destroy();
    this._tileContents.delete(key);
  }
};

MVTDataProvider.prototype.isDestroyed = function () {
  return false;
};

MVTDataProvider.prototype.destroy = function () {
  for (const content of this._tileContents.values()) {
    content.destroy();
  }
  this._tileContents.clear();
  this._tilePromises.clear();
  this._missingTiles.clear();
  return destroyObject(this);
};

function normalizeZoom(value, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function estimateRequestLevel(heightMeters, minZoom, maxZoom) {
  if (!Number.isFinite(heightMeters)) {
    return minZoom;
  }

  const clampedHeight = Math.max(1.0, heightMeters);
  const desiredTileSpan = clampedHeight * 2.0;
  const estimated = Math.floor(
    Math.log2(EARTH_CIRCUMFERENCE_METERS / desiredTileSpan),
  );
  return CesiumMath.clamp(estimated, minZoom, maxZoom);
}

function makeTileKey(level, x, y) {
  return `${level}/${x}/${y}`;
}

function buildTileUrl(template, level, x, y) {
  return template
    .replace(/\{z\}/gi, `${level}`)
    .replace(/\{x\}/gi, `${x}`)
    .replace(/\{y\}/gi, `${y}`);
}

export default MVTDataProvider;
