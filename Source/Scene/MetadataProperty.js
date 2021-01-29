import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataEnum from "./MetadataEnum.js";
import MetadataType from "./MetadataType.js";

/**
 * A metadata property.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the property.
 * @param {Object} options.property The property JSON object.
 * @param {Object.<String, MetadataEnum>} [options.enums] A dictionary of enums.
 *
 * @alias MetadataProperty
 * @constructor
 *
 * @private
 */
function MetadataProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var id = options.id;
  var property = options.property;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.property", property);
  //>>includeEnd('debug');

  var enumType;
  if (defined(property.enumType)) {
    enumType = options.enums[property.enumType];
  }

  this._id = id;
  this._name = property.name;
  this._description = property.description;
  this._type = MetadataType[property.type];
  this._enumType = enumType;
  this._componentType = MetadataComponentType[property.componentType];
  this._componentCount = property.componentCount;
  this._normalized = defaultValue(property.normalized, false);
  this._max = clone(property.max, true); // Clone so that this object doesn't hold on to a reference to the JSON
  this._min = clone(property.min, true); // Clone so that this object doesn't hold on to a reference to the JSON
  this._default = clone(property.default, true); // Clone so that this object doesn't hold on to a reference to the JSON
  this._optional = defaultValue(property.optional, false);
  this._semantic = property.semantic;
  this._extras = clone(property.extras, true); // Clone so that this object doesn't hold on to a reference to the JSON
}

Object.defineProperties(MetadataProperty.prototype, {
  /**
   * The ID of the property.
   *
   * @memberof MetadataProperty.prototype
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
   * @memberof MetadataProperty.prototype
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
   * @memberof MetadataProperty.prototype
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
   * @memberof MetadataProperty.prototype
   * @type {MetadataType}
   * @readonly
   * @private
   */
  type: {
    get: function () {
      return this._type;
    },
  },

  /**
   * The enum type of the property. Only defined when type or componentType is ENUM.
   *
   * @memberof MetadataProperty.prototype
   * @type {MetadataEnum}
   * @readonly
   * @private
   */
  enumType: {
    get: function () {
      return this._enumType;
    },
  },

  /**
   * The component type of the property. Only defined when type is ARRAY.
   *
   * @memberof MetadataProperty.prototype
   * @type {MetadataComponentType}
   * @readonly
   * @private
   */
  componentType: {
    get: function () {
      return this._componentType;
    },
  },

  /**
   * The number of components per element. Only defined when type is a fixed size ARRAY.
   *
   * @memberof MetadataProperty.prototype
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
   * Whether the property is normalized.
   *
   * @memberof MetadataProperty.prototype
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
   * An array storing the maximum value of each component. Only defined when type or componentType is a numeric type.
   *
   * @memberof MetadataProperty.prototype
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
   * An array storing the minimum value of each component. Only defined when type or componentType is a numeric type.
   *
   * @memberof MetadataProperty.prototype
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
   * A default value to use when an entity's property value is not defined.
   *
   * @memberof MetadataProperty.prototype
   * @type {Boolean|Number|String|Array}
   * @readonly
   * @private
   */
  default: {
    get: function () {
      return this._default;
    },
  },

  /**
   * Whether the property is optional.
   *
   * @memberof MetadataProperty.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  optional: {
    get: function () {
      return this._optional;
    },
  },

  /**
   * An identifier that describes how this property should be interpreted.
   *
   * @memberof MetadataProperty.prototype
   * @type {String}
   * @readonly
   * @private
   */
  semantic: {
    get: function () {
      return this._semantic;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataProperty.prototype
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

export default MetadataProperty;
