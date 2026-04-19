import Cartesian2 from "../Core/Cartesian2.js";
import Cartographic from "../Core/Cartographic.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import defined from "../Core/defined.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";

const DEFAULT_REQUEST_RADIUS = 2;
const EARTH_CIRCUMFERENCE_METERS = 40075016.68557849;

const scratchCartographic = new Cartographic();
const scratchTileXY = new Cartesian2();
const scratchTileRectangle = new Rectangle();
const scratchIntersectionRectangle = new Rectangle();

/**
 * @typedef {object} VectorTileCreateContentReadyResult
 * @property {string} status
 * @property {object} content
 */

/**
 * @typedef {object} VectorTileCreateContentMissingResult
 * @property {string} status
 */

/**
 * @typedef {VectorTileCreateContentReadyResult|VectorTileCreateContentMissingResult|undefined} VectorTileCreateContentResult
 */

/**
 * @callback CreateTileContentCallback
 * @param {number} level
 * @param {number} x
 * @param {number} y
 * @returns {Promise.<VectorTileCreateContentResult>}
 */

/**
 * Shared runtime for tiled vector data providers.
 *
 * @private
 * @alias VectorTileRuntime
 * @constructor
 *
 * @param {object} options Runtime options.
 * @param {TilingScheme} [options.tilingScheme] Tiling scheme for tile coordinates.
 * @param {number} [options.minZoom=0] Minimum requested zoom level.
 * @param {number} [options.maxZoom=14] Maximum requested zoom level.
 * @param {number} [options.requestRadius=2] Request radius around the center tile.
 * @param {Rectangle} [options.extent] Optional geographic extent in radians to limit tile requests.
 * @param {CreateTileContentCallback} options.createTileContent
 */
function VectorTileRuntime(options) {
  options = options ?? {};

  this._tilingScheme = options.tilingScheme ?? new WebMercatorTilingScheme();
  this._createTileContent = options.createTileContent;
  this._tileContents = new Map();
  this._tilePromises = new Map();
  this._missingTiles = new Set();

  const minZoom = normalizeZoom(options.minZoom, 0);
  const maxZoom = normalizeZoom(options.maxZoom, 14);
  this._minZoom = Math.min(minZoom, maxZoom);
  this._maxZoom = Math.max(minZoom, maxZoom);
  this._requestRadius = normalizeRequestRadius(
    options.requestRadius,
    DEFAULT_REQUEST_RADIUS,
  );
  this._extent = Rectangle.clone(options.extent);
}

Object.defineProperties(VectorTileRuntime.prototype, {
  /**
   * Optional geographic extent in radians used to limit tile requests.
   *
   * @memberof VectorTileRuntime.prototype
   * @type {Rectangle|undefined}
   * @readonly
   */
  extent: {
    get: function () {
      return this._extent;
    },
  },
});

/**
 * @private
 * @param {number} level
 * @param {number} x
 * @param {number} y
 */
VectorTileRuntime.prototype._requestTile = function (level, x, y) {
  const key = makeTileKey(level, x, y);
  if (
    this._tileContents.has(key) ||
    this._tilePromises.has(key) ||
    this._missingTiles.has(key)
  ) {
    return;
  }

  const promise = this._createTileContent(level, x, y)
    .then((result) => {
      if (!defined(result)) {
        return;
      }

      if (result.status === "missing") {
        this._missingTiles.add(key);
        return;
      }

      if (result.status === "ready" && defined(result.content)) {
        this._tileContents.set(key, result.content);
      }
    })
    .catch((error) => {
      if (defined(error) && error.statusCode === 404) {
        this._missingTiles.add(key);
      }
      // Keep runtime resilient; retry transient failures on later frames.
    })
    .finally(() => {
      this._tilePromises.delete(key);
    });

  this._tilePromises.set(key, promise);
};

/**
 * @param {FrameState} frameState
 */
VectorTileRuntime.prototype.update = function (frameState) {
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

  for (let dy = -this._requestRadius; dy <= this._requestRadius; dy++) {
    const y = centerTile.y + dy;
    if (y < 0 || y > maxCoordinate) {
      continue;
    }

    for (let dx = -this._requestRadius; dx <= this._requestRadius; dx++) {
      const x = centerTile.x + dx;
      if (x < 0 || x > maxCoordinate) {
        continue;
      }

      if (
        !tileIntersectsExtent(
          this._tilingScheme,
          level,
          x,
          y,
          this._extent,
          scratchTileRectangle,
          scratchIntersectionRectangle,
        )
      ) {
        continue;
      }

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
    if (defined(content)) {
      content.update(frameState);
    }
  }

  for (const [key, content] of this._tileContents.entries()) {
    if (desiredTiles.has(key)) {
      continue;
    }

    content.destroy();
    this._tileContents.delete(key);
  }
};

VectorTileRuntime.prototype.destroy = function () {
  for (const content of this._tileContents.values()) {
    content.destroy();
  }

  this._tileContents.clear();
  this._tilePromises.clear();
  this._missingTiles.clear();
};

function normalizeZoom(value, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeRequestRadius(value, fallback) {
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

function tileIntersectsExtent(
  tilingScheme,
  level,
  x,
  y,
  extent,
  tileRectangleScratch,
  intersectionScratch,
) {
  if (!defined(extent)) {
    return true;
  }

  const tileRectangle = tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    tileRectangleScratch,
  );
  return defined(
    Rectangle.intersection(tileRectangle, extent, intersectionScratch),
  );
}

export default VectorTileRuntime;
