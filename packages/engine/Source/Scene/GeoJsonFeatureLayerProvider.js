// @ts-check

import { Check, Ellipsoid, RuntimeError, defined } from "@cesium/core";
import Resource from "../Core/Resource.js";
import FeatureLayer from "./FeatureLayer.js";
import FeatureLayerCollection from "./FeatureLayerCollection.js";
import { createGeoJsonCollections } from "./GeoJsonPrimitive.js";
import HeightReference from "./HeightReference.js";
/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import { GeoJson } from "../Core/globalTypes.js"; */
/** @import FeatureLayerProvider from "./FeatureLayerProvider.js"; */

/**
 * @typedef {object} GeoJsonFeatureLayerProviderOptions
 * @property {string} [name]
 * @private
 */

/**
 * A {@link FeatureLayerProvider} for a GeoJSON object. Provides one
 * {@link FeatureLayer} containing all of its features.
 * <p>
 * Do not construct this directly. Use {@link GeoJsonFeatureLayerProvider.fromGeoJson}
 * or {@link GeoJsonFeatureLayerProvider.fromUrl}.
 * </p>
 *
 * @implements {FeatureLayerProvider}
 *
 * @example
 * const provider = await Cesium.GeoJsonFeatureLayerProvider.fromUrl(
 *   "roads.geojson",
 *   { name: "Roads" },
 * );
 * provider.featureLayers.get(0).show = false;
 *
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class GeoJsonFeatureLayerProvider {
  /**
   * @privateParam {object} geoJson A GeoJSON object.
   * @privateParam {object} [options] An object with the following properties:
   * @privateParam {string} [options.name] The layer name.
   */
  constructor(
    /** @type {object} */ geoJson,
    /** @type {GeoJsonFeatureLayerProviderOptions|undefined} */ options,
  ) {
    this._geoJson = geoJson;
    this._featureLayers = new FeatureLayerCollection();
    const featureLayer = new FeatureLayer({ name: options?.name });
    featureLayer._createCollections = () =>
      createCollections(/** @type {GeoJson} */ (geoJson), featureLayer);
    this._featureLayers._add(featureLayer);
  }

  /**
   * The feature layers provided by this instance. A GeoJSON document is one
   * layer, so this always contains exactly one.
   *
   * @type {FeatureLayerCollection}
   * @readonly
   */
  get featureLayers() {
    return this._featureLayers;
  }

  /**
   * Creates a provider for the features of a GeoJSON object.
   *
   * @param {object} geoJson A GeoJSON object.
   * @param {object} [options] An object with the following properties:
   * @param {string} [options.name] The layer name.
   * @returns {GeoJsonFeatureLayerProvider} The provider.
   */
  static fromGeoJson(geoJson, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("geoJson", geoJson);
    //>>includeEnd('debug');

    return new GeoJsonFeatureLayerProvider(geoJson, options);
  }

  /**
   * Fetches a GeoJSON file and creates a provider for its features.
   *
   * @param {Resource|string} url The URL of the GeoJSON file.
   * @param {object} [options] An object with the following properties:
   * @param {string} [options.name] The layer name.
   * @returns {Promise<GeoJsonFeatureLayerProvider>} A promise that resolves to the provider.
   *
   * @exception {RuntimeError} Failed to load GeoJSON.
   */
  static async fromUrl(url, options) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("url", url);
    //>>includeEnd('debug');

    const resource = Resource.createIfNeeded(url);
    const geoJson = await resource.fetchJson();
    if (!defined(geoJson)) {
      throw new RuntimeError(
        `Failed to load GeoJSON from ${resource.getUrlComponent(true)}.`,
      );
    }
    return GeoJsonFeatureLayerProvider.fromGeoJson(geoJson, options);
  }
}

/**
 * Creates the point, polyline, and polygon collections of a GeoJSON object.
 * Each primitive's pick object exposes the feature's properties to styling
 * expressions.
 *
 * @param {GeoJson} geoJson
 * @param {FeatureLayer} featureLayer
 * @returns {Array<BufferPrimitiveCollection<BufferPrimitive>>}
 * @ignore
 */
function createCollections(geoJson, featureLayer) {
  const { points, polylines, polygons } = createGeoJsonCollections(geoJson, {
    ellipsoid: Ellipsoid.default,
    heightReference: HeightReference.NONE,
    createPickObject: (
      featureId,
      index,
      collection,
      PrimitiveClass,
      properties,
    ) => ({
      featureLayer,
      properties,
      // Own keys only, so inherited names such as "constructor" are not properties.
      getPropertyInherited: (/** @type {string} */ name) =>
        Object.hasOwn(properties, name) ? properties[name] : undefined,
    }),
  });
  return [points, polylines, polygons].filter(defined);
}

export default GeoJsonFeatureLayerProvider;
