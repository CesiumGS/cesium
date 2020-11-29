import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import GltfFeaturePropertyComponentType from "./GltfFeaturePropertyComponentType.js";
import GltfFeaturePropertyType from "./GltfFeaturePropertyType.js";

/**
 * A feature class property.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the feature property.
 * @param {Object} options.property The property JSON object from the glTF.
 *
 * @alias GltfFeatureProperty
 * @constructor
 *
 * @private
 */
function GltfFeatureProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var id = options.id;
  var property = options.property;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.property", property);
  //>>includeEnd('debug');

  this._id = id;
  this._name = property.name;
  this._description = property.description;
  this._type = GltfFeaturePropertyType[property.type];
  this._componentType =
    GltfFeaturePropertyComponentType[property.componentType];
  this._componentCount = defaultValue(property.componentCount, 1);
  this._stringByteLength = property.stringByteLength;
  this._blobByteLength = property.blobByteLength;
  this._normalized = defaultValue(property.normalized, false);
  this._max = clone(property.max, true); // Clone so that this object doesn't hold on to a reference to the glTF JSON
  this._min = clone(property.min, true); // Clone so that this object doesn't hold on to a reference to the glTF JSON
  this._extras = clone(property.extras, true); // Clone so that this object doesn't hold on to a reference to the glTF JSON
}

Object.defineProperties(GltfFeatureProperty.prototype, {
  /**
   * The ID of the property.
   *
   * @memberof GltfFeatureProperty.prototype
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
   * The name of the property.
   *
   * @memberof GltfFeatureProperty.prototype
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
   * The description of the property.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * The type of the property.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {GltfFeaturePropertyType}
   * @readonly
   * @private
   */
  type: {
    get: function () {
      return this._type;
    },
  },

  /**
   * The component type of the property.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {GltfFeaturePropertyComponentType}
   * @readonly
   * @private
   */
  componentType: {
    get: function () {
      return this._componentType;
    },
  },

  /**
   * The number of components per element.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  componentCount: {
    get: function () {
      return this._componentCount;
    },
  },

  /**
   * The byte length of all string elements.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  stringByteLength: {
    get: function () {
      return this._stringByteLength;
    },
  },

  /**
   * The byte length of all blob elements.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  blobByteLength: {
    get: function () {
      return this._blobByteLength;
    },
  },

  /**
   * Whether the property is normalized.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  normalized: {
    get: function () {
      return this._normalized;
    },
  },

  /**
   * An array storing the maximum value of each component.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {Number[]}
   * @readonly
   * @private
   */
  max: {
    get: function () {
      return this._max;
    },
  },

  /**
   * An array storing the minimum value of each component.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {Number[]}
   * @readonly
   * @private
   */
  min: {
    get: function () {
      return this._min;
    },
  },

  /**
   * Extras in the feature property JSON object from the glTF.
   *
   * @memberof GltfFeatureProperty.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },
});

export default GltfFeatureProperty;
