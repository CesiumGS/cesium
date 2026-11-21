// @ts-check

import { DeveloperError } from "@cesium/core";
/** @import FeatureLayerCollection from "./FeatureLayerCollection.js"; */

/**
 * Provides {@link FeatureLayer}s from a data source.
 * <p>
 * Members for styling and drawing features, such as notifications as features
 * load and unload, will be added with a vector styling API.
 * </p>
 *
 * @interface
 *
 * @see GeoJsonFeatureLayerProvider
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class FeatureLayerProvider {
  constructor() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * The feature layers provided by this instance.
   *
   * @type {FeatureLayerCollection}
   * @readonly
   * @constant
   */
  get featureLayers() {
    return DeveloperError.throwInstantiationError();
  }
}

export default FeatureLayerProvider;
