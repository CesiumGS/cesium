import Cartographic from "../Core/Cartographic.js";
import Cesium3DTileset from "./Cesium3DTileset.js";
import Check from "../Core/Check.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

const DEFAULT_MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 14;
const DEFAULT_REGION_MINIMUM_HEIGHT = -1000.0;
const DEFAULT_REGION_MAXIMUM_HEIGHT = 10000.0;
const EARTH_CIRCUMFERENCE_METERS =
  2.0 * Math.PI * Ellipsoid.WGS84.maximumRadius;
const WEB_MERCATOR_TILE_SIZE = 256.0;

const scratchTileRectangle = new Rectangle();
const scratchIntersectionRectangle = new Rectangle();

/**
 * Base provider for URL-template vector sources that are rendered through a
 * runtime-generated 3D Tiles tileset.
 *
 * @private
 */
class UrlTemplate3DTilesDataProvider {
  /**
   * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
   * @param {object} [options] Provider options.
   * @param {number} [options.minZoom=0] Minimum zoom level represented in the generated tileset.
   * @param {number} [options.maxZoom=14] Maximum zoom level represented in the generated tileset.
   * @param {Rectangle} [options.extent] Optional geographic extent in radians to constrain the generated tile tree.
   * @param {string} [options.featureIdProperty] Feature property name to use as feature ID when supported by content decoding.
   */
  constructor(urlTemplate, options) {
    options = options ?? {};
    const minZoom = normalizeIntegerOption(
      options.minZoom,
      DEFAULT_MIN_ZOOM,
      0,
    );
    const maxZoom = normalizeIntegerOption(
      options.maxZoom,
      DEFAULT_MAX_ZOOM,
      0,
    );
    this._resource = Resource.createIfNeeded(urlTemplate);
    this._urlTemplate = this._resource.url;
    this._extent = Rectangle.clone(options.extent);
    this._minZoom = Math.min(minZoom, maxZoom);
    this._maxZoom = Math.max(minZoom, maxZoom);
    this._featureIdProperty = options.featureIdProperty;
    this._show = true;
    this._tileset = undefined;
    this._tilesetJsonUrl = undefined;
  }

  /**
   * Creates a provider from a URL template.
   *
   * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
   * @param {object} [options] Provider options.
   * @returns {Promise<UrlTemplate3DTilesDataProvider>}
   */
  static async fromUrlTemplate(urlTemplate, options) {
    const resolvedOptions = await this._resolveOptionsFromMetadata(
      urlTemplate,
      options,
    );
    this._validateFromUrlTemplateOptions(urlTemplate, resolvedOptions);

    const provider = new this(urlTemplate, resolvedOptions);
    await provider._initializeTileset();
    return provider;
  }

  /**
   * @protected
   * @param {Resource|string} _urlTemplate
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  static async _resolveOptionsFromMetadata(_urlTemplate, options) {
    return Object.assign({}, options);
  }

  /**
   * @protected
   * @param {Resource|string} urlTemplate
   * @param {object} [resolvedOptions]
   */
  static _validateFromUrlTemplateOptions(urlTemplate, resolvedOptions) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("urlTemplate", urlTemplate);
    if (defined(resolvedOptions)) {
      if (defined(resolvedOptions.minZoom)) {
        Check.typeOf.number("options.minZoom", resolvedOptions.minZoom);
      }
      if (defined(resolvedOptions.maxZoom)) {
        Check.typeOf.number("options.maxZoom", resolvedOptions.maxZoom);
      }
      if (defined(resolvedOptions.extent)) {
        Check.typeOf.object("options.extent", resolvedOptions.extent);
      }
      if (defined(resolvedOptions.featureIdProperty)) {
        Check.typeOf.string(
          "options.featureIdProperty",
          resolvedOptions.featureIdProperty,
        );
      }
      this._validateAdditionalOptions(resolvedOptions);
    }
    //>>includeEnd('debug');
  }

  /**
   * @protected
   * @param {object} _resolvedOptions
   */
  static _validateAdditionalOptions(_resolvedOptions) {}

  /**
   * @protected
   * @param {*} value
   * @returns {number|undefined}
   */
  static _parseFiniteNumber(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return parsed;
  }

  /**
   * @protected
   * @param {*} boundsValue
   * @returns {Rectangle|undefined}
   */
  static _parseBoundsRectangle(boundsValue) {
    if (!defined(boundsValue) || typeof boundsValue !== "string") {
      return undefined;
    }
    const parts = boundsValue.split(",");
    if (parts.length !== 4) {
      return undefined;
    }
    const west = this._parseFiniteNumber(parts[0]);
    const south = this._parseFiniteNumber(parts[1]);
    const east = this._parseFiniteNumber(parts[2]);
    const north = this._parseFiniteNumber(parts[3]);
    if (
      !Number.isFinite(west) ||
      !Number.isFinite(south) ||
      !Number.isFinite(east) ||
      !Number.isFinite(north)
    ) {
      return undefined;
    }
    return Rectangle.fromDegrees(west, south, east, north);
  }

  /**
   * URL template containing {z}/{x}/{y}.
   *
   * @type {string}
   * @readonly
   */
  get urlTemplate() {
    return this._urlTemplate;
  }

  /**
   * Resource derived from the URL template.
   *
   * @type {Resource}
   * @readonly
   */
  get resource() {
    return this._resource;
  }

  /**
   * Optional geographic extent in radians used to generate tile headers.
   *
   * @type {Rectangle|undefined}
   * @readonly
   */
  get extent() {
    return this._extent;
  }

  /**
   * Backing 3D Tileset.
   *
   * @type {Cesium3DTileset|undefined}
   * @readonly
   */
  get tileset() {
    return this._tileset;
  }

  /**
   * Determines if the generated tileset is shown.
   *
   * @type {boolean}
   */
  get show() {
    return this._show;
  }

  set show(value) {
    this._show = value;
    if (defined(this._tileset)) {
      this._tileset.show = value;
    }
  }

  /**
   * @private
   */
  _createRuntimeTilesetOptions() {
    return {
      minZoom: this._minZoom,
      maxZoom: this._maxZoom,
      extent: this._extent,
    };
  }

  /**
   * @private
   * @returns {object}
   */
  _createTilesetLoadOptions() {
    return {};
  }

  /**
   * @private
   * @param {Cesium3DTileset} _tileset
   */
  _configureTileset(_tileset) {}

  /**
   * Subclasses must return a runtime content codec describing how to turn
   * a downloaded tile payload into a {@link Cesium3DTileContent}. See
   * {@link Cesium3DTileset#_runtimeContentCodec} for the expected shape.
   *
   * @protected
   * @returns {object}
   */
  _createCodec() {
    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      "UrlTemplate3DTilesDataProvider subclasses must implement _createCodec().",
    );
    //>>includeEnd('debug');
  }

  /**
   * @private
   */
  async _initializeTileset() {
    const tilesetJson = buildRuntimeTilesetJson(
      this._resource,
      this._createRuntimeTilesetOptions(),
    );
    const tilesetBlob = new Blob([JSON.stringify(tilesetJson)], {
      type: "application/json",
    });
    const tilesetUrl = URL.createObjectURL(tilesetBlob);
    this._tilesetJsonUrl = tilesetUrl;

    try {
      this._tileset = await Cesium3DTileset.fromUrl(
        tilesetUrl,
        this._createTilesetLoadOptions(),
      );
    } catch (error) {
      URL.revokeObjectURL(tilesetUrl);
      this._tilesetJsonUrl = undefined;
      throw error;
    }
    URL.revokeObjectURL(tilesetUrl);
    this._tilesetJsonUrl = undefined;

    this._configureTileset(this._tileset);
    this._tileset._runtimeContentCodec = this._createCodec();
    this._tileset.show = this._show;
  }

  /**
   * @private
   * @param {FrameState} frameState
   */
  update(frameState) {
    if (defined(this._tileset)) {
      this._tileset.update(frameState);
    }
  }

  /**
   * @private
   * @param {FrameState} frameState
   */
  prePassesUpdate(frameState) {
    if (defined(this._tileset)) {
      this._tileset.prePassesUpdate(frameState);
    }
  }

  /**
   * @private
   * @param {FrameState} frameState
   */
  postPassesUpdate(frameState) {
    if (defined(this._tileset)) {
      this._tileset.postPassesUpdate(frameState);
    }
  }

  /**
   * @private
   * @param {FrameState} frameState
   * @param {PassState} passState
   */
  updateForPass(frameState, passState) {
    if (defined(this._tileset)) {
      this._tileset.updateForPass(frameState, passState);
    }
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    if (defined(this._tileset)) {
      this._tileset.destroy();
      this._tileset = undefined;
    }
    if (defined(this._tilesetJsonUrl)) {
      URL.revokeObjectURL(this._tilesetJsonUrl);
      this._tilesetJsonUrl = undefined;
    }
    this._resource = undefined;
    this._extent = undefined;
    this._featureIdProperty = undefined;
    return destroyObject(this);
  }
}

function normalizeIntegerOption(value, fallback, minimum) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(minimum, Math.floor(value));
}

/**
 * @param {Resource} resource
 * @param {object} options
 * @param {number} options.minZoom
 * @param {number} options.maxZoom
 * @param {Rectangle} [options.extent]
 * @returns {object}
 */
function buildRuntimeTilesetJson(resource, options) {
  const tilingScheme = new WebMercatorTilingScheme();
  const extent = defined(options.extent)
    ? Rectangle.clone(options.extent)
    : Rectangle.clone(tilingScheme.rectangle);
  const minLevelRange = computeTileRangeForExtent(
    tilingScheme,
    extent,
    options.minZoom,
  );
  const root = {
    boundingVolume: {
      region: rectangleToRegion(extent),
    },
    // Root has no renderable content, so keep a coarse error to ensure
    // refinement reaches the first renderable zoom even when minZoom is high.
    geometricError: computeGeometricError(0),
    refine: "REPLACE",
    children: [],
  };
  for (let y = minLevelRange.minY; y <= minLevelRange.maxY; y++) {
    for (let x = minLevelRange.minX; x <= minLevelRange.maxX; x++) {
      const child = buildTileNode(
        tilingScheme,
        resource,
        extent,
        options.minZoom,
        options.maxZoom,
        x,
        y,
      );
      if (defined(child)) {
        root.children.push(child);
      }
    }
  }
  if (root.children.length === 0) {
    root.geometricError = 0.0;
  }
  return {
    asset: {
      version: "1.1",
    },
    geometricError: root.geometricError,
    root: root,
  };
}

function buildTileNode(tilingScheme, resource, extent, level, maxZoom, x, y) {
  if (
    !tileIntersectsExtent(
      tilingScheme,
      level,
      x,
      y,
      extent,
      scratchTileRectangle,
      scratchIntersectionRectangle,
    )
  ) {
    return undefined;
  }
  const tileRectangle = tilingScheme.tileXYToRectangle(
    x,
    y,
    level,
    new Rectangle(),
  );
  const node = {
    boundingVolume: {
      region: rectangleToRegion(tileRectangle),
    },
    geometricError: level < maxZoom ? computeGeometricError(level) : 0.0,
    refine: "REPLACE",
    content: {
      uri: resolveTileUrl(resource, level, x, y),
    },
  };
  if (level >= maxZoom) {
    return node;
  }
  const childLevel = level + 1;
  const children = [];
  for (let childY = y * 2; childY <= y * 2 + 1; childY++) {
    for (let childX = x * 2; childX <= x * 2 + 1; childX++) {
      const child = buildTileNode(
        tilingScheme,
        resource,
        extent,
        childLevel,
        maxZoom,
        childX,
        childY,
      );
      if (defined(child)) {
        children.push(child);
      }
    }
  }
  if (children.length > 0) {
    node.children = children;
  } else {
    node.geometricError = 0.0;
  }
  return node;
}

function resolveTileUrl(resource, level, x, y) {
  const template = resource.url;
  const tileUrl = template
    .replace(/\{z\}/gi, `${level}`)
    .replace(/\{x\}/gi, `${x}`)
    .replace(/\{y\}/gi, `${y}`);
  return getAbsoluteUri(tileUrl);
}

function computeGeometricError(level) {
  return EARTH_CIRCUMFERENCE_METERS / ((1 << level) * WEB_MERCATOR_TILE_SIZE);
}

function rectangleToRegion(rectangle) {
  return [
    rectangle.west,
    rectangle.south,
    rectangle.east,
    rectangle.north,
    DEFAULT_REGION_MINIMUM_HEIGHT,
    DEFAULT_REGION_MAXIMUM_HEIGHT,
  ];
}

function computeTileRangeForExtent(tilingScheme, extent, level) {
  const maxIndex = (1 << level) - 1;
  const nw = Cartographic.fromRadians(extent.west, extent.north);
  const se = Cartographic.fromRadians(extent.east, extent.south);
  const nwTile = tilingScheme.positionToTileXY(nw, level);
  const seTile = tilingScheme.positionToTileXY(se, level);
  if (!defined(nwTile) || !defined(seTile) || extent.west > extent.east) {
    return {
      minX: 0,
      maxX: maxIndex,
      minY: 0,
      maxY: maxIndex,
    };
  }
  return {
    minX: clampToIntegerRange(Math.min(nwTile.x, seTile.x), 0, maxIndex),
    maxX: clampToIntegerRange(Math.max(nwTile.x, seTile.x), 0, maxIndex),
    minY: clampToIntegerRange(Math.min(nwTile.y, seTile.y), 0, maxIndex),
    maxY: clampToIntegerRange(Math.max(nwTile.y, seTile.y), 0, maxIndex),
  };
}

function clampToIntegerRange(value, min, max) {
  return Math.max(min, Math.min(max, Math.floor(value)));
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

export default UrlTemplate3DTilesDataProvider;
