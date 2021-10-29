import Color from "../../Core/Color.js";
import defined from "../../Core/defined.js";

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
 * picking using {@link Scene#pick}.
 * </p>
 *
 * @alias ModelFeature
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {ModelExperimental} options.model The model the feature belongs to.
 * @param {Number} options.featureId The unique integral identifier for this feature.
 * @param {ModelFeatureTable} options.featureTable The {@link ModelFeatureTable} that this feature belongs to.
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
  this._featureTable = options.featureTable;
  this._featureId = options.featureId;
  this._color = undefined; // for calling getColor
}

Object.defineProperties(ModelFeature.prototype, {
  /**
   * Gets or sets if the feature will be shown. This is set for all features
   * when a style's show is evaluated.
   *
   * @memberof ModelFeature.prototype
   *
   * @type {Boolean}
   *
   * @default true
   */
  show: {
    get: function () {
      return this._featureTable.getShow(this._featureId);
    },
    set: function (value) {
      this._featureTable.setShow(this._featureId, value);
    },
  },

  /**
   * Gets or sets the highlight color multiplied with the feature's color.  When
   * this is white, the feature's color is not changed. This is set for all features
   * when a style's color is evaluated.
   *
   * @memberof ModelFeature.prototype
   *
   * @type {Color}
   *
   * @default {@link Color.WHITE}
   */
  color: {
    get: function () {
      if (!defined(this._color)) {
        this._color = new Color();
      }
      return this._featureTable.getColor(this._featureId, this._color);
    },
    set: function (value) {
      this._featureTable.setColor(this._featureId, value);
    },
  },
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
   *  The {@link ModelFeatureTable} that this feature belongs to.
   *
   * @memberof ModelFeature.prototype
   *
   * @type {ModelFeatureTable}
   *
   * @readonly
   * @private
   */
  featureTable: {
    get: function () {
      return this._featureTable;
    },
  },
});

/**
 * Returns whether the feature contains this property.
 *
 * @param {String} name The case-sensitive name of the property.
 * @returns {Boolean} Whether the feature contains this property.
 */
ModelFeature.prototype.hasProperty = function (name) {
  return this._featureTable.hasProperty(this._featureId, name);
};

/**
 * Returns a copy of the value of the feature's property with the given name.
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
  return this._featureTable.getProperty(this._featureId, name);
};

/**
 * @private
 */
ModelFeature.prototype.getPropertyInherited = function (name) {
  var value = this._featureTable.getProperty(this._featureId, name);
  if (defined(value)) {
    return value;
  }

  return this._featureTable.getPropertyBySemantic(this._featureId, name);
};

/**
 * Returns an array of property names for the feature.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The names of the feature's properties.
 */
ModelFeature.prototype.getPropertyNames = function (results) {
  return this._featureTable.getPropertyNames(results);
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
  return this._featureTable.setProperty(this._featureId, name, value);
};
