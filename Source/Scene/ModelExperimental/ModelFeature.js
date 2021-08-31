/**
 * A feature of a {@link ModelExperimental}.
 * <p>
 * Provides access to a feature's properties stored in the tile's feature table.
 * </p>
 * <p>
 * Modifications to a <code>ModelFeature</code> object have the lifetime of the model.
 * </p>
 * <p>
 * Do not construct this directly. Access it through {@link ModelFeatureTable#getFeature} or
 * picking using {@link Scene#pick} and {@link Scene#pickPosition}.
 * </p>
 *
 * @alias ModelFeature
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {ModelExperimental} options.model The loader responsible for loading the 3D model.
 * @param {Number} options.featureId The unique identifier for this feature.
 * @param {Cesium3DTileContent|ModelFeatureTable} options.content the content of the tile containing the feature.
 *
 * @example
 * // On mouse over, display all the properties for a feature in the console log.
 * handler.setInputAction(function(movement) {
 *     var feature = scene.pick(movement.endPosition);
 *     if (feature instanceof Cesium.ModelFeature) {
 *         console.log(feature);
 *     }
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */

export default function ModelFeature(options) {
  this._model = options.model;
  this._content = options.content;
  this._featureId = options.featureId;
}

Object.defineProperties(ModelFeature.prototype, {
  /**
   * All objects returned by {@link Scene#pick} have a <code>primitive</code> property. This returns
   * the tileset containing the feature.
   *
   * @memberof ModelFeature.prototype
   *
   * @type {ModelExperimental}
   *
   * @readonly
   * @private
   */
  primitive: {
    get: function () {
      return this._model;
    },
  },

  /**
   * Gets the content of the tile containing the feature.
   *
   * @memberof ModelFeature.prototype
   *
   * @type {Cesium3DTileContent|ModelFeatureTable}
   *
   * @readonly
   * @private
   */
  content: {
    get: function () {
      return this._content;
    },
  },
});

ModelFeature.prototype.getProperty = function (name) {
  return this._content.getProperty(this._featureId, name);
};

ModelFeature.prototype.getPropertyInherited = function (name) {
  return this._content.getPropertyInherited(this._featureId, name);
};
