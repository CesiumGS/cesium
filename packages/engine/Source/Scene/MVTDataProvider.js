import Axis from "./Axis.js";
import Cartographic from "../Core/Cartographic.js";
import Cesium3DTileset from "./Cesium3DTileset.js";
import Check from "../Core/Check.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import WebMercatorTilingScheme from "../Core/WebMercatorTilingScheme.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

const DEFAULT_MIN_ZOOM = 0;
const DEFAULT_MAX_ZOOM = 14;
const DEFAULT_MAX_TILESET_NODE_COUNT = 50000;
const DEFAULT_REGION_MINIMUM_HEIGHT = -1000.0;
const DEFAULT_REGION_MAXIMUM_HEIGHT = 10000.0;
const EARTH_CIRCUMFERENCE_METERS =
  2.0 * Math.PI * Ellipsoid.WGS84.maximumRadius;
const WEB_MERCATOR_TILE_SIZE = 256.0;
const MVT_MISSING_CONTENT_STATUS_CODES = [404, 204];
const MVT_TILE_URL_PATTERN = /\.(?:pbf|mvt)(?:[?#]|$)/i;

const scratchTileRectangle = new Rectangle();
const scratchIntersectionRectangle = new Rectangle();

/**
 * Runtime provider for Mapbox Vector Tiles backed by a real {@link Cesium3DTileset}.
 */
class MVTDataProvider {
  /**
   * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
   * @param {object} [options] Provider options.
   * @param {number} [options.minZoom=0] Minimum zoom level represented in the generated tileset.
   * @param {number} [options.maxZoom=14] Maximum zoom level represented in the generated tileset.
   * @param {Rectangle} [options.extent] Optional geographic extent in radians to constrain the generated tile tree.
   * @param {number} [options.maxTilesetNodeCount=50000] Maximum number of generated 3D Tiles nodes.
   * @param {string} [options.featureIdProperty] MVT property name to use as feature ID.
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
    this._maxTilesetNodeCount = normalizeIntegerOption(
      options.maxTilesetNodeCount,
      DEFAULT_MAX_TILESET_NODE_COUNT,
      1,
    );
    this._featureIdProperty = options.featureIdProperty;
    this._show = true;
    this._tileset = undefined;
    this._tilesetJsonUrl = undefined;
  }

  /**
   * Creates a provider from an MVT URL template.
   *
   * @param {Resource|string} urlTemplate URL template containing {z}, {x}, and {y} placeholders.
   * @param {object} [options] Provider options.
   * @param {number} [options.minZoom=0] Minimum zoom level represented in the generated tileset.
   * @param {number} [options.maxZoom=14] Maximum zoom level represented in the generated tileset.
   * @param {Rectangle} [options.extent] Optional geographic extent in radians to constrain the generated tile tree.
   * @param {number} [options.maxTilesetNodeCount=50000] Maximum number of generated 3D Tiles nodes.
   * @param {string} [options.featureIdProperty] MVT property name to use as feature ID.
   * @returns {Promise<MVTDataProvider>}
   */
  static async fromUrlTemplate(urlTemplate, options) {
    const resolvedOptions = await resolveProviderOptionsFromMetadata(
      urlTemplate,
      options,
    );

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
      if (defined(resolvedOptions.maxTilesetNodeCount)) {
        Check.typeOf.number(
          "options.maxTilesetNodeCount",
          resolvedOptions.maxTilesetNodeCount,
        );
      }
      if (defined(resolvedOptions.featureIdProperty)) {
        Check.typeOf.string(
          "options.featureIdProperty",
          resolvedOptions.featureIdProperty,
        );
      }
    }
    //>>includeEnd('debug');

    const provider = new MVTDataProvider(urlTemplate, resolvedOptions);
    await provider._initializeTileset();
    return provider;
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
  async _initializeTileset() {
    const tilesetJson = buildRuntimeTilesetJson(this._resource, {
      minZoom: this._minZoom,
      maxZoom: this._maxZoom,
      extent: this._extent,
      maxTilesetNodeCount: this._maxTilesetNodeCount,
    });

    const tilesetBlob = new Blob([JSON.stringify(tilesetJson)], {
      type: "application/json",
    });
    const tilesetUrl = URL.createObjectURL(tilesetBlob);
    this._tilesetJsonUrl = tilesetUrl;

    try {
      this._tileset = await Cesium3DTileset.fromUrl(tilesetUrl, {
        enablePick: true,
        featureIdLabel: "featureId_0",
        instanceFeatureIdLabel: "instanceFeatureId_0",
      });
    } catch (error) {
      URL.revokeObjectURL(tilesetUrl);
      this._tilesetJsonUrl = undefined;
      throw error;
    }

    this._tileset._modelUpAxis = Axis.Z;
    this._tileset._modelForwardAxis = Axis.X;
    this._tileset._vectorTileFeatureIdProperty = this._featureIdProperty;
    this._tileset._treatMissingTileContentAsEmpty = true;
    this._tileset._missingTileContentStatusCodes =
      MVT_MISSING_CONTENT_STATUS_CODES.slice();
    this._tileset._missingTileContentUrlPattern = MVT_TILE_URL_PATTERN;
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

async function resolveProviderOptionsFromMetadata(urlTemplate, options) {
  const resolvedOptions = Object.assign({}, options);
  const needsMinZoom = !defined(resolvedOptions.minZoom);
  const needsMaxZoom = !defined(resolvedOptions.maxZoom);
  const needsExtent = !defined(resolvedOptions.extent);
  if (!needsMinZoom && !needsMaxZoom && !needsExtent) {
    return resolvedOptions;
  }

  const metadata = await fetchMvtMetadata(urlTemplate);
  if (!defined(metadata)) {
    return resolvedOptions;
  }

  if (needsMinZoom) {
    const parsedMinZoom = parseFiniteNumber(metadata.minzoom);
    if (Number.isFinite(parsedMinZoom)) {
      resolvedOptions.minZoom = Math.max(0, Math.floor(parsedMinZoom));
    }
  }

  if (needsMaxZoom) {
    const parsedMaxZoom = parseFiniteNumber(metadata.maxzoom);
    if (Number.isFinite(parsedMaxZoom)) {
      resolvedOptions.maxZoom = Math.max(0, Math.floor(parsedMaxZoom));
    }
  }

  if (needsExtent) {
    const parsedBounds = parseBoundsRectangle(metadata.bounds);
    if (defined(parsedBounds)) {
      resolvedOptions.extent = parsedBounds;
    }
  }

  return resolvedOptions;
}

async function fetchMvtMetadata(urlTemplate) {
  const resource = Resource.createIfNeeded(urlTemplate);
  const metadataUrl = resolveMetadataUrl(resource.url);
  if (!defined(metadataUrl)) {
    return undefined;
  }

  const metadataResource = resource.getDerivedResource({
    url: metadataUrl,
  });
  return metadataResource.fetchJson();
}

function resolveMetadataUrl(templateUrl) {
  if (!defined(templateUrl)) {
    return undefined;
  }

  const match = templateUrl.match(
    /^(.*)\/\{z\}\/\{x\}\/\{y\}\.(?:pbf|mvt)(?:[?#].*)?$/i,
  );
  if (!defined(match) || !defined(match[1])) {
    return undefined;
  }

  return `${match[1]}/metadata.json`;
}

function parseFiniteNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function parseBoundsRectangle(boundsValue) {
  if (!defined(boundsValue)) {
    return undefined;
  }

  if (typeof boundsValue !== "string") {
    return undefined;
  }

  const parts = boundsValue.split(",");
  if (parts.length !== 4) {
    return undefined;
  }

  const west = parseFiniteNumber(parts[0]);
  const south = parseFiniteNumber(parts[1]);
  const east = parseFiniteNumber(parts[2]);
  const north = parseFiniteNumber(parts[3]);
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
 * @param {Resource} resource
 * @param {object} options
 * @param {number} options.minZoom
 * @param {number} options.maxZoom
 * @param {Rectangle} [options.extent]
 * @param {number} options.maxTilesetNodeCount
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
  const rootTileCount =
    (minLevelRange.maxX - minLevelRange.minX + 1) *
    (minLevelRange.maxY - minLevelRange.minY + 1);
  const effectiveMaxZoom = computeEffectiveMaxZoom(
    options.minZoom,
    options.maxZoom,
    rootTileCount,
    options.maxTilesetNodeCount,
  );

  const state = {
    nodeCount: 1,
    maxNodeCount: options.maxTilesetNodeCount,
    hitNodeBudget: false,
  };

  const root = {
    boundingVolume: {
      region: rectangleToRegion(extent),
    },
    geometricError: computeGeometricError(Math.max(options.minZoom - 1, 0)),
    refine: "REPLACE",
    children: [],
  };

  for (let y = minLevelRange.minY; y <= minLevelRange.maxY; y++) {
    for (let x = minLevelRange.minX; x <= minLevelRange.maxX; x++) {
      if (state.nodeCount >= state.maxNodeCount) {
        state.hitNodeBudget = true;
        break;
      }
      const child = buildTileNode(
        tilingScheme,
        resource,
        extent,
        state,
        options.minZoom,
        effectiveMaxZoom,
        x,
        y,
      );
      if (defined(child)) {
        root.children.push(child);
      }
    }
    if (state.hitNodeBudget) {
      break;
    }
  }

  if (root.children.length === 0) {
    root.geometricError = 0.0;
  }

  if (state.hitNodeBudget) {
    console.warn(
      `MVTDataProvider generated ${state.maxNodeCount} tile headers and stopped. Increase options.maxTilesetNodeCount for deeper refinement.`,
    );
  } else if (effectiveMaxZoom < options.maxZoom) {
    console.warn(
      `MVTDataProvider capped maxZoom from ${options.maxZoom} to ${effectiveMaxZoom} to satisfy options.maxTilesetNodeCount=${options.maxTilesetNodeCount}.`,
    );
  }

  return {
    asset: {
      version: "1.1",
    },
    geometricError: root.geometricError,
    root: root,
  };
}

function buildTileNode(
  tilingScheme,
  resource,
  extent,
  state,
  level,
  maxZoom,
  x,
  y,
) {
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

  if (state.nodeCount >= state.maxNodeCount) {
    state.hitNodeBudget = true;
    return undefined;
  }

  state.nodeCount++;

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

  if (level >= maxZoom || state.nodeCount >= state.maxNodeCount) {
    if (state.nodeCount >= state.maxNodeCount) {
      state.hitNodeBudget = true;
      node.geometricError = 0.0;
    }
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
        state,
        childLevel,
        maxZoom,
        childX,
        childY,
      );
      if (defined(child)) {
        children.push(child);
      }
    }
    if (state.hitNodeBudget) {
      break;
    }
  }

  if (children.length > 0) {
    node.children = children;
  } else {
    node.geometricError = 0.0;
  }

  return node;
}

function computeEffectiveMaxZoom(
  minZoom,
  requestedMaxZoom,
  rootTileCount,
  maxNodeCount,
) {
  const safeRootTileCount = Math.max(1, rootTileCount);
  let effectiveMaxZoom = minZoom;
  let usedNodes = 1;
  let levelNodeCount = safeRootTileCount;

  for (let level = minZoom; level <= requestedMaxZoom; level++) {
    if (usedNodes + levelNodeCount > maxNodeCount) {
      break;
    }
    usedNodes += levelNodeCount;
    effectiveMaxZoom = level;
    if (levelNodeCount > Number.MAX_SAFE_INTEGER / 4) {
      break;
    }
    levelNodeCount *= 4;
  }

  return effectiveMaxZoom;
}

function resolveTileUrl(resource, level, x, y) {
  const template = resource.url;
  const url = template
    .replace(/\{z\}/gi, `${level}`)
    .replace(/\{x\}/gi, `${x}`)
    .replace(/\{y\}/gi, `${y}`);
  return resource.getDerivedResource({ url: url }).url;
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

export default MVTDataProvider;
