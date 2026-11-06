import { Check, RuntimeError, defined } from "@cesium/core";
import Resource from "../Core/Resource.js";
import FeatureLayer from "./FeatureLayer.js";

/**
 * Creates {@link FeatureLayer}s from GeoJSON.
 *
 * @namespace GeoJsonFeatureLoader
 *
 * @example
 * const layer = await Cesium.GeoJsonFeatureLoader.fromUrl("roads.geojson", {
 *   name: "Roads",
 * });
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
const GeoJsonFeatureLoader = {};

/**
 * Creates a layer containing the features of a GeoJSON object.
 *
 * @param {object} geoJson A GeoJSON object.
 * @param {object} [options] An object with the following properties:
 * @param {string} [options.name] The layer name.
 * @returns {FeatureLayer} The layer.
 */
GeoJsonFeatureLoader.fromJson = function (geoJson, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("geoJson", geoJson);
  //>>includeEnd('debug');

  return new FeatureLayer({
    name: options?.name,
    geoJson: geoJson,
  });
};

/**
 * Fetches a GeoJSON file and creates a layer containing its features.
 *
 * @param {Resource|string} url The URL of the GeoJSON file.
 * @param {object} [options] An object with the following properties:
 * @param {string} [options.name] The layer name.
 * @returns {Promise<FeatureLayer>} A promise that resolves to the layer.
 *
 * @exception {RuntimeError} Failed to load GeoJSON.
 */
GeoJsonFeatureLoader.fromUrl = async function (url, options) {
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
  return GeoJsonFeatureLoader.fromJson(geoJson, options);
};

export default GeoJsonFeatureLoader;
