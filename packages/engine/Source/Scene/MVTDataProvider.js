import Axis from "./Axis.js";
import Cesium3DTileContentType from "./Cesium3DTileContentType.js";
import Resource from "../Core/Resource.js";
import UrlTemplate3DTilesDataProvider from "./UrlTemplate3DTilesDataProvider.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import defined from "../Core/defined.js";

const MVT_TILE_URL_PATTERN = /\/\d+\/\d+\/\d+(?:\.[^/?#]+)?(?:[?#]|$)/i;

/**
 * Runtime provider for Mapbox Vector Tiles backed by a real {@link Cesium3DTileset}.
 */
class MVTDataProvider extends UrlTemplate3DTilesDataProvider {
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
    return super.fromUrlTemplate(urlTemplate, options);
  }

  /**
   * @protected
   * @param {Resource|string} urlTemplate
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  static async _resolveOptionsFromMetadata(urlTemplate, options) {
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
      const parsedMinZoom = this._parseFiniteNumber(metadata.minzoom);
      if (Number.isFinite(parsedMinZoom)) {
        resolvedOptions.minZoom = Math.max(0, Math.floor(parsedMinZoom));
      }
    }

    if (needsMaxZoom) {
      const parsedMaxZoom = this._parseFiniteNumber(metadata.maxzoom);
      if (Number.isFinite(parsedMaxZoom)) {
        resolvedOptions.maxZoom = Math.max(0, Math.floor(parsedMaxZoom));
      }
    }

    if (needsExtent) {
      const parsedBounds = this._parseBoundsRectangle(metadata.bounds);
      if (defined(parsedBounds)) {
        resolvedOptions.extent = parsedBounds;
      }
    }

    return resolvedOptions;
  }

  /**
   * @private
   * @returns {object}
   */
  _createTilesetLoadOptions() {
    return {
      enablePick: true,
      featureIdLabel: "featureId_0",
      instanceFeatureIdLabel: "instanceFeatureId_0",
    };
  }

  /**
   * @private
   * @param {Cesium3DTileset} tileset
   */
  _configureTileset(tileset) {
    tileset._modelUpAxis = Axis.Z;
    tileset._modelForwardAxis = Axis.X;
  }

  /**
   * @private
   * @returns {RegExp}
   */
  _getMissingContentUrlPattern() {
    return MVT_TILE_URL_PATTERN;
  }

  /**
   * @private
   * @returns {string}
   */
  _getUrlTemplateContentType() {
    return Cesium3DTileContentType.MVT;
  }
}

async function fetchMvtMetadata(urlTemplate) {
  const resource = Resource.createIfNeeded(urlTemplate);
  const metadataUrl = resolveMetadataUrl(resource.url);
  if (!defined(metadataUrl)) {
    return undefined;
  }

  const metadataResource = Resource.createIfNeeded(getAbsoluteUri(metadataUrl));
  return metadataResource.fetchJson();
}

function resolveMetadataUrl(templateUrl) {
  if (!defined(templateUrl)) {
    return undefined;
  }
  const match = templateUrl.match(
    /^(.*)\/\{z\}\/\{x\}\/\{y\}(?:\.[^/?#]+)?(?:[?#].*)?$/i,
  );
  if (!defined(match) || !defined(match[1])) {
    return undefined;
  }
  return `${match[1]}/metadata.json`;
}

export default MVTDataProvider;
