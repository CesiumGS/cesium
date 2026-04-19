import Axis from "./Axis.js";
import Cesium3DTileset from "./Cesium3DTileset.js";
import VectorTileRuntime from "./VectorTileRuntime.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

/**
 * Shared base data provider for tiled vector formats.
 *
 * @alias VectorTileDataProviderBase
 * @constructor
 * @private
 *
 * @param {object} [options]
 * @param {number} [options.minZoom=0]
 * @param {number} [options.maxZoom=14]
 * @param {Rectangle} [options.extent]
 */
function VectorTileDataProviderBase(options) {
  options = options ?? {};

  this._tileset = createTilesetParent();
  this._tileSource = this.createTileSource(options);
  this._tileDecoder = this.createTileDecoder(options);
  this._tileContentBuilder = this.createTileContentBuilder(options);
  this._runtime = new VectorTileRuntime({
    minZoom: options.minZoom,
    maxZoom: options.maxZoom,
    extent: options.extent,
    createTileContent: createTileContentFactory(
      this._tileset,
      this._tileSource,
      this._tileDecoder,
      this._tileContentBuilder,
    ),
  });
}

Object.defineProperties(VectorTileDataProviderBase.prototype, {
  /**
   * The URL template used by this provider when available.
   *
   * @memberof VectorTileDataProviderBase.prototype
   * @type {string|undefined}
   * @readonly
   */
  urlTemplate: {
    get: function () {
      return this._tileSource.urlTemplate;
    },
  },

  /**
   * Resource derived from tile source when available.
   *
   * @memberof VectorTileDataProviderBase.prototype
   * @type {Resource|undefined}
   * @readonly
   */
  resource: {
    get: function () {
      return this._tileSource.resource;
    },
  },

  /**
   * Optional geographic extent in radians used to limit tile requests.
   *
   * @memberof VectorTileDataProviderBase.prototype
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
 * @param {object} _options
 * @returns {object}
 */
VectorTileDataProviderBase.prototype.createTileSource = function (_options) {
  throw new Error("createTileSource must be overridden.");
};

/**
 * @param {object} _options
 * @returns {{decode:function}}
 */
VectorTileDataProviderBase.prototype.createTileDecoder = function (_options) {
  throw new Error("createTileDecoder must be overridden.");
};

/**
 * @param {object} _options
 * @returns {{build:function}}
 */
VectorTileDataProviderBase.prototype.createTileContentBuilder = function (
  _options,
) {
  throw new Error("createTileContentBuilder must be overridden.");
};

/**
 * @param {FrameState} frameState
 */
VectorTileDataProviderBase.prototype.update = function (frameState) {
  this._runtime.update(frameState);
};

VectorTileDataProviderBase.prototype.isDestroyed = function () {
  return false;
};

VectorTileDataProviderBase.prototype.destroy = function () {
  this._runtime.destroy();
  this._tileset.destroy();
  this._runtime = undefined;
  this._tileset = undefined;
  this._tileSource = undefined;
  this._tileDecoder = undefined;
  this._tileContentBuilder = undefined;
  return destroyObject(this);
};

function createTilesetParent() {
  const tileset = new Cesium3DTileset({
    enablePick: true,
    featureIdLabel: "featureId_0",
    instanceFeatureIdLabel: "instanceFeatureId_0",
  });
  tileset._modelUpAxis = Axis.Z;
  tileset._modelForwardAxis = Axis.X;
  return tileset;
}

function createTileContentFactory(
  tilesetContext,
  tileSource,
  tileDecoder,
  tileContentBuilder,
) {
  return async function createTileContent(level, x, y) {
    const tileResult = await tileSource.fetchTile(level, x, y);
    if (!defined(tileResult)) {
      return undefined;
    }
    if (tileResult.status === "missing") {
      return { status: "missing" };
    }

    const decodedTile = await tileDecoder.decode(
      tileResult.resource,
      tileResult.arrayBuffer,
    );
    if (!defined(decodedTile)) {
      return { status: "missing" };
    }

    const builtContent = await tileContentBuilder.build(
      tilesetContext,
      tileResult.resource,
      decodedTile,
      {
        tileX: x,
        tileY: y,
        tileZ: level,
      },
    );
    if (!defined(builtContent)) {
      return { status: "missing" };
    }

    return {
      status: "ready",
      content: createRuntimeContentAdapter(builtContent, tilesetContext),
    };
  };
}

function createRuntimeContentAdapter(content, tilesetContext) {
  return {
    update: function (frameState) {
      if (content.update.length >= 2) {
        content.update(tilesetContext, frameState);
        return;
      }
      content.update(frameState);
    },
    destroy: function () {
      content.destroy();
    },
  };
}

export default VectorTileDataProviderBase;
