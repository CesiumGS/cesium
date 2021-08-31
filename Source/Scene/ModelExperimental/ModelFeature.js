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
 * @example
 * // On mouse over, display all the properties for a feature in the console log.
 * handler.setInputAction(function(movement) {
 *     var feature = scene.pick(movement.endPosition);
 *     if (feature instanceof Cesium.ModelFeature) {
 *         console.log(feature);
 *     }
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
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
   * @type {Cesium3DTileContent}
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
