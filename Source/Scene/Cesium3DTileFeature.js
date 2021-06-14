import Color from "../Core/Color.js";
import defined from "../Core/defined.js";

/**
 * A feature of a {@link Cesium3DTileset}.
 * <p>
 * Provides access to a feature's properties stored in the tile's batch table, as well
 * as the ability to show/hide a feature and change its highlight color via
 * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color}, respectively.
 * </p>
 * <p>
 * Modifications to a <code>Cesium3DTileFeature</code> object have the lifetime of the tile's
 * content.  If the tile's content is unloaded, e.g., due to it going out of view and needing
 * to free space in the cache for visible tiles, listen to the {@link Cesium3DTileset#tileUnload} event to save any
 * modifications. Also listen to the {@link Cesium3DTileset#tileVisible} event to reapply any modifications.
 * </p>
 * <p>
 * Do not construct this directly.  Access it through {@link Cesium3DTileContent#getFeature}
 * or picking using {@link Scene#pick} and {@link Scene#pickPosition}.
 * </p>
 *
 * @alias Cesium3DTileFeature
 * @constructor
 *
 * @example
 * // On mouse over, display all the properties for a feature in the console log.
 * handler.setInputAction(function(movement) {
 *     var feature = scene.pick(movement.endPosition);
 *     if (feature instanceof Cesium.Cesium3DTileFeature) {
 *         var propertyNames = feature.getPropertyNames();
 *         var length = propertyNames.length;
 *         for (var i = 0; i < length; ++i) {
 *             var propertyName = propertyNames[i];
 *             console.log(propertyName + ': ' + feature.getProperty(propertyName));
 *         }
 *     }
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
function Cesium3DTileFeature(content, batchId) {
  this._content = content;
  this._batchId = batchId;
  this._color = undefined; // for calling getColor
}

Object.defineProperties(Cesium3DTileFeature.prototype, {
  /**
   * Gets or sets if the feature will be shown. This is set for all features
   * when a style's show is evaluated.
   *
   * @memberof Cesium3DTileFeature.prototype
   *
   * @type {Boolean}
   *
   * @default true
   */
  show: {
    get: function () {
      return this._content.batchTable.getShow(this._batchId);
    },
    set: function (value) {
      this._content.batchTable.setShow(this._batchId, value);
    },
  },

  /**
   * Gets or sets the highlight color multiplied with the feature's color.  When
   * this is white, the feature's color is not changed. This is set for all features
   * when a style's color is evaluated.
   *
   * @memberof Cesium3DTileFeature.prototype
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
      return this._content.batchTable.getColor(this._batchId, this._color);
    },
    set: function (value) {
      this._content.batchTable.setColor(this._batchId, value);
    },
  },

  /**
   * Gets the content of the tile containing the feature.
   *
   * @memberof Cesium3DTileFeature.prototype
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

  /**
   * Gets the tileset containing the feature.
   *
   * @memberof Cesium3DTileFeature.prototype
   *
   * @type {Cesium3DTileset}
   *
   * @readonly
   */
  tileset: {
    get: function () {
      return this._content.tileset;
    },
  },

  /**
   * All objects returned by {@link Scene#pick} have a <code>primitive</code> property. This returns
   * the tileset containing the feature.
   *
   * @memberof Cesium3DTileFeature.prototype
   *
   * @type {Cesium3DTileset}
   *
   * @readonly
   */
  primitive: {
    get: function () {
      return this._content.tileset;
    },
  },

  /**
   * @private
   */
  pickId: {
    get: function () {
      return this._content.batchTable.getPickColor(this._batchId);
    },
  },
});

/**
 * Returns whether the feature contains this property. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/master/extensions/3DTILES_batch_table_hierarchy}
 *
 * @param {String} name The case-sensitive name of the property.
 * @returns {Boolean} Whether the feature contains this property.
 */
Cesium3DTileFeature.prototype.hasProperty = function (name) {
  return this._content.batchTable.hasProperty(this._batchId, name);
};

/**
 * Returns an array of property names for the feature. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/master/extensions/3DTILES_batch_table_hierarchy}
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The names of the feature's properties.
 */
Cesium3DTileFeature.prototype.getPropertyNames = function (results) {
  return this._content.batchTable.getPropertyNames(this._batchId, results);
};

/**
 * Returns a copy of the value of the feature's property with the given name. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/master/extensions/3DTILES_batch_table_hierarchy}
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
Cesium3DTileFeature.prototype.getProperty = function (name) {
  return this._content.batchTable.getProperty(this._batchId, name);
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
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
Cesium3DTileFeature.prototype.getPropertyInherited = function (name) {
  var value;
  var content = this._content;
  var batchTable = this._content.batchTable;
  if (defined(batchTable)) {
    value = batchTable.getProperty(this._batchId, name);
    if (defined(value)) {
      return value;
    }
  }

  var tileMetadata = content.tile.metadata;
  if (defined(tileMetadata)) {
    value = tileMetadata.getPropertyBySemantic(name);
    if (defined(value)) {
      return value;
    }

    value = tileMetadata.getProperty(name);
    if (defined(value)) {
      return value;
    }
  }

  var groupMetadata = content.groupMetadata;
  if (defined(groupMetadata)) {
    value = groupMetadata.getPropertyBySemantic(name);
    if (defined(value)) {
      return value;
    }

    value = groupMetadata.getProperty(name);
    if (defined(value)) {
      return value;
    }
  }

  var tilesetMetadata = content.tileset.metadata;
  if (defined(tilesetMetadata) && defined(tilesetMetadata.tileset)) {
    tilesetMetadata = tilesetMetadata.tileset;
    value = tilesetMetadata.getPropertyBySemantic(name);
    if (defined(value)) {
      return value;
    }

    value = tilesetMetadata.getProperty(name);
    if (defined(value)) {
      return value;
    }
  }

  return undefined;
};

/**
 * Sets the value of the feature's property with the given name.
 * <p>
 * If a property with the given name doesn't exist, it is created.
 * </p>
 *
 * @param {String} name The case-sensitive name of the property.
 * @param {*} value The value of the property that will be copied.
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
Cesium3DTileFeature.prototype.setProperty = function (name, value) {
  this._content.batchTable.setProperty(this._batchId, name, value);

  // PERFORMANCE_IDEA: Probably overkill, but maybe only mark the tile dirty if the
  // property is in one of the style's expressions or - if it can be done quickly -
  // if the new property value changed the result of an expression.
  this._content.featurePropertiesDirty = true;
};

/**
 * Returns whether the feature's class name equals <code>className</code>. Unlike {@link Cesium3DTileFeature#isClass}
 * this function only checks the feature's exact class and not inherited classes.
 * <p>
 * This function returns <code>false</code> if no batch table hierarchy is present.
 * </p>
 *
 * @param {String} className The name to check against.
 * @returns {Boolean} Whether the feature's class name equals <code>className</code>
 *
 * @private
 */
Cesium3DTileFeature.prototype.isExactClass = function (className) {
  return this._content.batchTable.isExactClass(this._batchId, className);
};

/**
 * Returns whether the feature's class or any inherited classes are named <code>className</code>.
 * <p>
 * This function returns <code>false</code> if no batch table hierarchy is present.
 * </p>
 *
 * @param {String} className The name to check against.
 * @returns {Boolean} Whether the feature's class or inherited classes are named <code>className</code>
 *
 * @private
 */
Cesium3DTileFeature.prototype.isClass = function (className) {
  return this._content.batchTable.isClass(this._batchId, className);
};

/**
 * Returns the feature's class name.
 * <p>
 * This function returns <code>undefined</code> if no batch table hierarchy is present.
 * </p>
 *
 * @returns {String} The feature's class name.
 *
 * @private
 */
Cesium3DTileFeature.prototype.getExactClassName = function () {
  return this._content.batchTable.getExactClassName(this._batchId);
};
export default Cesium3DTileFeature;
