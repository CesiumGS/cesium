import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import destroyObject from "../Core/destroyObject.js";
import when from "../ThirdParty/when.js";
import GltfFeatureTableProperty from "./GltfFeatureTableProperty.js";

/**
 * A feature table within the the glTF feature metadata extension.
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfContainer} options.gltfContainer The glTF container.
 * @param {String} options.id The ID of the feature table.
 * @param {Object} options.featureTable The feature table JSON object from the glTF.
 * @param {GltfFeatureClass} options.featureClass The feature class.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTable
 * @constructor
 *
 * @private
 */
function GltfFeatureTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfContainer = options.gltfContainer;
  var id = options.id;
  var featureTable = options.featureTable;
  var featureClass = options.featureClass;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfContainer", gltfContainer);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.featureClass", featureClass);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var properties = {};
  var promises = [];

  for (var propertyId in featureTable.properties) {
    if (featureTable.properties.hasOwnProperty(propertyId)) {
      var property = new GltfFeatureTableProperty({
        gltfContainer: gltfContainer,
        featureTable: this,
        id: propertyId,
        property: featureTable.properties[propertyId],
        cache: cache,
      });
      properties[propertyId] = property;
      promises.push(property.readyPromise);
    }
  }

  var that = this;
  var readyPromise = when.all(promises).then(function () {
    return that;
  });

  this._featureClass = featureClass;
  this._properties = properties;
  this._featureCount = featureTable.featureCount;
  this._elementCount = featureTable.elementCount;
  this._id = id;
  this._name = featureTable.name;
  this._description = featureTable.description;
  this._extras = clone(featureTable.extras, true); // Clone so that this object doesn't hold on to a reference to the gltf JSON
  this._readyPromise = readyPromise;
}

Object.defineProperties(GltfFeatureTable.prototype, {
  /**
   * The feature table properties.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {Object.<String, GltfFeatureTableProperty>}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * The number of features in the feature table.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  featureCount: {
    get: function () {
      return this._featureCount;
    },
  },

  /**
   * The number of elements in the property arrays.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  elementCount: {
    get: function () {
      return this._featureCount;
    },
  },

  /**
   * The ID of the feature table.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {String}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * The name of the feature table.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {String}
   * @readonly
   * @private
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * Extras in the feature table JSON object from the glTF.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * Promise that resolves when the feature table is ready.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {Promise.<GltfFeatureTable>}
   * @readonly
   * @private
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },
});

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GltfFeatureTable#destroy
 *
 * @private
 */
GltfFeatureTable.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the object. Destroying an object allows for deterministic release of
 * resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception. Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see GltfFeatureTable#isDestroyed
 *
 * @private
 */
GltfFeatureTable.prototype.destroy = function () {
  var properties = this._properties;
  for (var name in properties) {
    if (properties.hasOwnProperty(name)) {
      properties[name].destroy();
    }
  }

  return destroyObject(this);
};

export default GltfFeatureTable;
