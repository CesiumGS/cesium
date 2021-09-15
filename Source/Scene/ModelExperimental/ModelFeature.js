/**
 * A feature of a {@link ModelExperimental}.
 * <p>
 * Provides access to a feature's properties stored in the model's feature table.
 * </p>
 * <p>
 * Modifications to a <code>ModelFeature</code> object have the lifetime of the model.
 * </p>
 * <p>
 * Do not construct this directly. Access it through {@link ModelFeatureTable#getFeature}, {@link Cesium3DTileContent#getFeature} or
 * picking using {@link Scene#pick} and {@link Scene#pickPosition}.
 * </p>
 *
 * @alias ModelFeature
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {ModelExperimental} options.model The model the feature belongs to.
 * @param {Number} options.featureId The unique integral identifier for this feature.
 * @param {Cesium3DTileContent|ModelFeatureTable} options.owner The owner of this feature. For 3D Tiles, this will be a {@link Cesium3DTileContent}. For glTF models, this will be a {@link ModelFeatureTable}.
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
  this._owner = options.owner;
  this._featureId = options.featureId;
}

Object.defineProperties(ModelFeature.prototype, {
  /**
   * All objects returned by {@link Scene#pick} have a <code>primitive</code> property. This returns
   * the model containing the feature.
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
   * Gets the owner of this feature. For 3D Tiles, this will be a {@link Cesium3DTileContent}. For glTF models, this will be a {@link ModelFeatureTable}.
   *
   * @memberof ModelFeature.prototype
   *
   * @type {Cesium3DTileContent|ModelFeatureTable}
   *
   * @readonly
   * @private
   */
  owner: {
    get: function () {
      return this._owner;
    },
  },
});

/**
 * Returns whether the feature contains this property. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
 *
 * @param {String} name The case-sensitive name of the property.
 * @returns {Boolean} Whether the feature contains this property.
 */
ModelFeature.prototype.hasProperty = function (name) {
  return this._owner.hasProperty(this._featureId, name);
};

/**
 * Returns a copy of the value of the feature's property with the given name. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
 *
 * @param {String} name The case-sensitive name of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
 *
 * @example
 * // Display all the properties for a feature in the console log.
 * var propertyNames = feature.getPropertyNames();
 * var length = propertyNames.length;
 * for (var i = 0; i < length; ++i) {
 *     var propertyName = propertyNames[i];
 *     console.log(propertyName + ': ' + feature.getProperty(propertyName));
 * }
 */
ModelFeature.prototype.getProperty = function (name) {
  return this._owner.getProperty(this._featureId, name);
};

/**
 * Returns an array of property names for the feature. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The names of the feature's properties.
 */
ModelFeature.prototype.getPropertyNames = function (results) {
  return this._owner.getPropertyNames(results);
};

/**
 * Returns a copy of the value of the feature's property with the given name.
 * If the feature is contained within a tileset that uses the
 * <code>3DTILES_metadata</code> extension, tileset, group and tile metadata is
 * inherited.
 * <p>
 * To resolve name conflicts, this method resolves names from most specific to
 * least specific by metadata granularity in the order: feature, tile, group,
 * tileset. Within each granularity, semantics are resolved first, then other
 * properties.
 * </p>
 * @param {String} name The case-sensitive name of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
 * @private
 */
ModelFeature.prototype.getPropertyInherited = function (name) {
  return this._owner.getPropertyInherited(this._featureId, name);
};

/**
 * Sets the value of the feature's property with the given name.
 *
 * @param {String} name The case-sensitive name of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 *
 * @exception {DeveloperError} Inherited batch table hierarchy property is read only.
 *
 * @example
 * var height = feature.getProperty('Height'); // e.g., the height of a building
 *
 * @example
 * var name = 'clicked';
 * if (feature.getProperty(name)) {
 *     console.log('already clicked');
 * } else {
 *     feature.setProperty(name, true);
 *     console.log('first click');
 * }
 */
ModelFeature.prototype.setProperty = function (name, value) {
  return this._owner.setProperty(this._featureId, name, value);
};
