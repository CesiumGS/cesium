import Cartesian2 from "../Core/Cartesian2.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import MVTContent from "./MVTContent.js";
import Resource from "../Core/Resource.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";

const REQUEST_LEVEL = 5;
const REQUEST_RADIUS = 1;
const scratchCartographic = new Cartographic();
const scratchTileXY = new Cartesian2();

/**
 * @alias MVTDataProvider
 * @constructor
 *
 * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
 */
function MVTDataProvider(urlTemplate) {
  const resource = Resource.createIfNeeded(urlTemplate);
  this._resource = resource;
  this._urlTemplate = resource.url;
  this._tilingScheme = new WebMercatorTilingScheme();
  this._tileContents = new Map();
  this._tilePromises = new Map();
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
 * @returns {Promise<MVTDataProvider>}
 */
MVTDataProvider.fromUrlTemplate = async function (urlTemplate) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("urlTemplate", urlTemplate);
  //>>includeEnd('debug');

  return new MVTDataProvider(urlTemplate);
};

/**
 * @private
 * @param {number} level
 * @param {number} x
 * @param {number} y
 * @returns {Promise<void>}
 */
MVTDataProvider.prototype._requestTile = async function (level, x, y) {
  const key = makeTileKey(level, x, y);
  if (this._tileContents.has(key) || this._tilePromises.has(key)) {
    return;
  }

  const url = buildTileUrl(this._urlTemplate, level, x, y);
  const resource = this._resource.getDerivedResource({
    url: url,
  });

  const promise = resource
    .fetchArrayBuffer()
    .then(async (arrayBuffer) => {
      if (!defined(arrayBuffer)) {
        return;
      }

      const content = await MVTContent.fromArrayBuffer(resource, arrayBuffer);
      this._tileContents.set(key, content);
    })
    .catch(function () {
      // Ignore per-tile request errors.
    })
    .finally(() => {
      this._tilePromises.delete(key);
    });

  this._tilePromises.set(key, promise);
  await promise;
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

  const level = REQUEST_LEVEL;
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

      if (!this._tileContents.has(key) && !this._tilePromises.has(key)) {
        void this._requestTile(level, x, y);
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

  pruneTiles(this, desiredTiles);
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
  return destroyObject(this);
};

function makeTileKey(level, x, y) {
  return `${level}/${x}/${y}`;
}

function buildTileUrl(template, level, x, y) {
  return template
    .replace(/\{z\}/gi, `${level}`)
    .replace(/\{x\}/gi, `${x}`)
    .replace(/\{y\}/gi, `${y}`);
}

function pruneTiles(provider, desiredTiles) {
  for (const [key, content] of provider._tileContents.entries()) {
    if (desiredTiles.has(key)) {
      continue;
    }
    content.destroy();
    provider._tileContents.delete(key);
  }
}

export default MVTDataProvider;
