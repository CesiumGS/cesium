import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataEntity from "./MetadataEntity.js";
import MetadataTableProperty from "./MetadataTableProperty.js";
import MetadataType from "./MetadataType.js";

/**
 * A table containing binary metadata for a collection of entities. This is
 * used for representing binary properties of a batch table, as well as binary
 * metadata in 3D Tiles next extensions.
 * <p>
 * For 3D Tiles Next details, see the {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_metadata/1.0.0|3DTILES_metadata Extension} for 3D Tiles, as well as the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Number} options.count The number of entities in the table.
 * @param {Object} [options.properties] A dictionary containing properties.
 * @param {MetadataClass} [options.class] The class that properties conform to.
 * @param {Object.<String, Uint8Array>} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 *
 * @alias MetadataTable
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var count = options.count;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("options.count", count, 0);
  //>>includeEnd('debug');

  var properties = {};
  if (defined(options.properties)) {
    for (var propertyId in options.properties) {
      if (options.properties.hasOwnProperty(propertyId)) {
        properties[propertyId] = new MetadataTableProperty({
          count: count,
          property: options.properties[propertyId],
          classProperty: options.class.properties[propertyId],
          bufferViews: options.bufferViews,
        });
      }
    }
  }

  this._count = count;
  this._class = options.class;
  this._properties = properties;
}

Object.defineProperties(MetadataTable.prototype, {
  /**
   * The number of entities in the table.
   *
   * @memberof MetadataTable.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  count: {
    get: function () {
      return this._count;
    },
  },

  /**
   * The class that properties conform to.
   *
   * @memberof MetadataTable.prototype
   * @type {MetadataClass}
   * @readonly
   * @private
   */
  class: {
    get: function () {
      return this._class;
    },
  },
});

/**
 * Returns whether the table has this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the table has this property.
 * @private
 */
MetadataTable.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, this._class);
};

/**
 * Returns whether the table has a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {Boolean} Whether the table has a property with the given semantic.
 * @private
 */
MetadataTable.prototype.hasPropertyBySemantic = function (semantic) {
  return MetadataEntity.hasPropertyBySemantic(
    semantic,
    this._properties,
    this._class
  );
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
MetadataTable.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this._properties, this._class, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is an enum the name of the enum is returned.
 * </p>
 * <p>
 * If the property is normalized the normalized value is returned. The value is
 * in the range [-1.0, 1.0] for signed integer types and [0.0, 1.0] for unsigned
 * integer types.
 * </p>
 * <p>
 * If the property is not normalized and type or componentType is INT64 or
 * UINT64 a BigInt will be returned. On platforms that don't support BigInt a
 * number will be returned instead. Note that numbers only support up to 52 bits
 * of integer precision. Values greater than 2^53 - 1 or less than -(2^53 - 1)
 * may lose precision when read.
 * </p>
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this property.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 * @private
 */
MetadataTable.prototype.getProperty = function (index, propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  var property = this._properties[propertyId];

  var value;
  if (defined(property)) {
    value = property.get(index);
  } else {
    value = getDefault(this._class, propertyId);
  }

  return value;
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is an enum the name of the enum must be provided, not the
 * integer value.
 * </p>
 * <p>
 * If the property is normalized a normalized value must be provided to this
 * function. The value must be in the range [-1.0, 1.0] for signed integer
 * types and [0.0, 1.0] for unsigned integer types.
 * </p>
 * <p>
 * If the property is not normalized and type or componentType is INT64 or
 * UINT64 a BigInt may be provided. On platforms that don't support BigInt a
 * number may be provided instead. Note that numbers only support up to 52 bits
 * of integer precision. Values greater than 2^53 - 1 or less than -(2^53 - 1)
 * may lose precision when set."
 * </p>
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 * @exception {DeveloperError} value does not match type
 * @exception {DeveloperError} value is out of range for type
 * @exception {DeveloperError} Array length does not match componentCount
 * @private
 */
MetadataTable.prototype.setProperty = function (index, propertyId, value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  var property = this._properties[propertyId];
  if (defined(property)) {
    property.set(index, value);
    return true;
  }

  return false;
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {Number} index The index of the entity.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this property.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 * @private
 */
MetadataTable.prototype.getPropertyBySemantic = function (index, semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(this._class)) {
    var property = this._class.propertiesBySemantic[semantic];
    if (defined(property)) {
      return this.getProperty(index, property.id);
    }
  }
  return undefined;
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {Number} index The index of the entity.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 * @exception {DeveloperError} value does not match type
 * @exception {DeveloperError} value is out of range for type
 * @exception {DeveloperError} Array length does not match componentCount
 * @private
 */
MetadataTable.prototype.setPropertyBySemantic = function (
  index,
  semantic,
  value
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(this._class)) {
    var property = this._class.propertiesBySemantic[semantic];
    if (defined(property)) {
      return this.setProperty(index, property.id, value);
    }
  }

  return false;
};

/**
 * Returns a typed array containing the property values for a given propertyId.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The typed array containing the property values or <code>undefined</code> if the property values are not stored in a typed array.
 *
 * @private
 */
MetadataTable.prototype.getPropertyTypedArray = function (propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  var property = this._properties[propertyId];

  if (defined(property)) {
    return property.getTypedArray();
  }

  return undefined;
};

/**
 * Returns a typed array containing the property values for the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The typed array containing the property values or <code>undefined</code> if the property values are not stored in a typed array.
 *
 * @private
 */
MetadataTable.prototype.getPropertyTypedArrayBySemantic = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(this._class)) {
    var property = this._class.propertiesBySemantic[semantic];
    if (defined(property)) {
      return this.getPropertyTypedArray(property.id);
    }
  }

  return undefined;
};

function getDefault(classDefinition, propertyId) {
  if (defined(classDefinition)) {
    var classProperty = classDefinition.properties[propertyId];
    if (defined(classProperty) && defined(classProperty.default)) {
      var value = classProperty.default;
      if (classProperty.type === MetadataType.ARRAY) {
        value = value.slice(); // clone
      }
      value = classProperty.normalize(value);
      return classProperty.unpackVectorTypes(value);
    }
  }
}

export default MetadataTable;
