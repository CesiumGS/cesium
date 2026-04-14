import Cartesian2 from "../Core/Cartesian2.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import Cesium3DTileStyle from "./Cesium3DTileStyle.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Frozen from "../Core/Frozen.js";
import Matrix4 from "../Core/Matrix4.js";
import MVTContent from "./MVTContent.js";
import Resource from "../Core/Resource.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";

const scratchCartographic = new Cartographic();
const scratchTileXY = new Cartesian2();

/**
 * @typedef {object} MVTDataProvider.ConstructorOptions
 *
 * @property {boolean} [show=true] Determines if this provider is shown.
 * @property {number} [level=14] Fixed zoom level to request from the MVT source.
 * @property {number} [tileRadius=1] Radius around the center tile to request each frame.
 * @property {number} [cacheSize=64] Maximum loaded tile count before pruning old tiles.
 * @property {Cesium3DTileStyle|object} [style] Style applied to loaded MVT tiles.
 * @property {string[]} [geometryTypes] Geometry types to build: any subset of ["Point", "LineString", "Polygon"].
 */

/**
 * MVTDataProvider streams Mapbox Vector Tiles from a URL template such as
 * <code>https://host/path/{z}/{x}/{y}.mvt</code>.
 *
 * <p>
 * This provider is independent from 3D Tiles tileset loading. Internally it
 * reuses the MVT decoding and rendering path and can be added directly to
 * <code>scene.primitives</code>.
 * </p>
 *
 * @alias MVTDataProvider
 * @constructor
 *
 * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
 * @param {MVTDataProvider.ConstructorOptions} [options] Initialization options.
 */
function MVTDataProvider(urlTemplate, options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  const resource = Resource.createIfNeeded(urlTemplate);

  this._resource = resource;
  this._urlTemplate = resource.url;

  this._show = options.show ?? true;
  this._level = options.level ?? 14;
  this._tileRadius = options.tileRadius ?? 1;
  this._cacheSize = options.cacheSize ?? 64;
  this._style = normalizeStyle(options.style);

  this._tilingScheme = new WebMercatorTilingScheme();
  this._tileContents = new Map();
  this._tilePromises = new Map();
  this._frameNumber = 0;

  this._geometryTypes = options.geometryTypes;
  this._modelMatrix = Matrix4.clone(Matrix4.IDENTITY);
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

  /**
   * Determines if this provider is shown.
   *
   * @memberof MVTDataProvider.prototype
   * @type {boolean}
   */
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      this._show = value;
    },
  },

  /**
   * Fixed zoom level used for tile requests.
   *
   * @memberof MVTDataProvider.prototype
   * @type {number}
   */
  level: {
    get: function () {
      return this._level;
    },
    set: function (value) {
      this._level = value;
    },
  },

  /**
   * Number of neighbor tiles to request around the center tile.
   *
   * @memberof MVTDataProvider.prototype
   * @type {number}
   */
  tileRadius: {
    get: function () {
      return this._tileRadius;
    },
    set: function (value) {
      this._tileRadius = value;
    },
  },

  /**
   * Maximum loaded tile count before pruning.
   *
   * @memberof MVTDataProvider.prototype
   * @type {number}
   */
  cacheSize: {
    get: function () {
      return this._cacheSize;
    },
    set: function (value) {
      this._cacheSize = value;
    },
  },

  /**
   * Style applied to loaded tile contents.
   *
   * @memberof MVTDataProvider.prototype
   * @type {Cesium3DTileStyle}
   */
  style: {
    get: function () {
      return this._style;
    },
    set: function (value) {
      this._style = normalizeStyle(value);
      for (const { content } of this._tileContents.values()) {
        applyContentStyle(content, this._style);
      }
    },
  },
});

/**
 * Creates a provider from an MVT URL template.
 *
 * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
 * @param {MVTDataProvider.ConstructorOptions} [options] Initialization options.
 * @returns {Promise<MVTDataProvider>}
 */
MVTDataProvider.fromUrlTemplate = async function (urlTemplate, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("urlTemplate", urlTemplate);
  //>>includeEnd('debug');

  return new MVTDataProvider(urlTemplate, options);
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

      const content = await MVTContent.fromArrayBuffer(
        resource,
        arrayBuffer,
        this._geometryTypes,
      );
      Matrix4.clone(this._modelMatrix, content.modelMatrix);
      applyContentStyle(content, this._style);

      this._tileContents.set(key, {
        content: content,
        lastTouchedFrame: this._frameNumber,
      });
    })
    .catch(function () {
      // Network/content errors are isolated per tile and do not fail traversal.
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
  if (!this._show) {
    return;
  }

  this._frameNumber = frameState.frameNumber;

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

  const level = Math.max(0, this._level | 0);
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

  for (let dy = -this._tileRadius; dy <= this._tileRadius; dy++) {
    const y = centerTile.y + dy;
    if (y < 0 || y > maxCoordinate) {
      continue;
    }

    for (let dx = -this._tileRadius; dx <= this._tileRadius; dx++) {
      const rawX = centerTile.x + dx;
      const x = CesiumMath.mod(rawX, maxCoordinate + 1);
      const key = makeTileKey(level, x, y);
      desiredTiles.add(key);

      if (!this._tileContents.has(key) && !this._tilePromises.has(key)) {
        // Fire and forget; completion is tracked in _tilePromises/_tileContents.
        void this._requestTile(level, x, y);
      }
    }
  }

  for (const key of desiredTiles) {
    const entry = this._tileContents.get(key);
    if (!defined(entry)) {
      continue;
    }

    entry.lastTouchedFrame = this._frameNumber;
    entry.content.update(frameState);
  }

  pruneTiles(this, desiredTiles);
};

MVTDataProvider.prototype.isDestroyed = function () {
  return false;
};

MVTDataProvider.prototype.destroy = function () {
  for (const { content } of this._tileContents.values()) {
    content.destroy();
  }
  this._tileContents.clear();
  this._tilePromises.clear();
  return destroyObject(this);
};

function normalizeStyle(style) {
  if (!defined(style)) {
    return undefined;
  }

  return style instanceof Cesium3DTileStyle
    ? style
    : new Cesium3DTileStyle(style);
}

function applyContentStyle(content, style) {
  if (!defined(style)) {
    return;
  }

  content.applyStyle(style);
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

function pruneTiles(provider, desiredTiles) {
  if (provider._tileContents.size <= provider._cacheSize) {
    return;
  }

  const candidates = [];
  for (const [key, entry] of provider._tileContents.entries()) {
    if (desiredTiles.has(key)) {
      continue;
    }
    candidates.push({
      key: key,
      lastTouchedFrame: entry.lastTouchedFrame,
    });
  }

  candidates.sort(function (a, b) {
    return a.lastTouchedFrame - b.lastTouchedFrame;
  });

  for (let i = 0; i < candidates.length; i++) {
    if (provider._tileContents.size <= provider._cacheSize) {
      break;
    }

    const key = candidates[i].key;
    const entry = provider._tileContents.get(key);
    if (!defined(entry)) {
      continue;
    }
    entry.content.destroy();
    provider._tileContents.delete(key);
  }
}

export default MVTDataProvider;
