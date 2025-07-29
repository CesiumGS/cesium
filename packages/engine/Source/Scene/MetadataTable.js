import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import MetadataEntity from "./MetadataEntity.js";
import MetadataTableProperty from "./MetadataTableProperty.js";

/**
 * A table containing binary metadata for a collection of entities. This is
 * used for representing binary properties of a batch table, as well as binary
 * metadata in 3D Tiles next extensions.
 * <p>
 * For 3D Tiles Next details, see the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles, as well as the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {number} options.count The number of entities in the table.
 * @param {object} [options.properties] A dictionary containing properties.
 * @param {MetadataClass} options.class The class that properties conform to.
 * @param {Object<string, Uint8Array>} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 *
 * @alias MetadataTable
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataTable(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const count = options.count;
  const metadataClass = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("options.count", count, 0);
  Check.typeOf.object("options.class", metadataClass);
  //>>includeEnd('debug');

  let byteLength = 0;
  const properties = {};
  if (defined(options.properties)) {
    for (const propertyId in options.properties) {
      if (options.properties.hasOwnProperty(propertyId)) {
        const property = new MetadataTableProperty({
          count: count,
          property: options.properties[propertyId],
          classProperty: metadataClass.properties[propertyId],
          bufferViews: options.bufferViews,
        });
        properties[propertyId] = property;
        byteLength += property.byteLength;
      }
    }
  }

  this._count = count;
  this._class = metadataClass;
  this._properties = properties;
  this._byteLength = byteLength;
}

Object.defineProperties(MetadataTable.prototype, {
  /**
   * The number of entities in the table.
   *
   * @memberof MetadataTable.prototype
   * @type {number}
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

  /**
   * The size of all typed arrays used in this table.
   *
   * @memberof MetadataTable.prototype
   * @type {number}
   * @readonly
   * @private
   */
  byteLength: {
    get: function () {
      return this._byteLength;
    },
  },
});

/**
 * Returns whether the table has this property.
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {boolean} Whether the table has this property.
 * @private
 */
MetadataTable.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, this._class);
};

/**
 * Returns whether the table has a property with the given semantic.
 *
 * @param {string} semantic The case-sensitive semantic of the property.
 * @returns {boolean} Whether the table has a property with the given semantic.
 * @private
 */
MetadataTable.prototype.hasPropertyBySemantic = function (semantic) {
  return MetadataEntity.hasPropertyBySemantic(
    semantic,
    this._properties,
    this._class,
  );
};

/**
 * Returns an array of property IDs.
 *
 * @param {string[]} [results] An array into which to store the results.
 * @returns {string[]} The property IDs.
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
 * @param {number} index The index of the entity.
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this property.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 * @private
 */
MetadataTable.prototype.getProperty = function (index, propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  const property = this._properties[propertyId];

  let value;
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
 * @param {number} index The index of the entity.
 * @param {string} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
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

  const property = this._properties[propertyId];
  if (defined(property)) {
    property.set(index, value);
    return true;
  }

  return false;
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {number} index The index of the entity.
 * @param {string} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this semantic.
 *
 * @exception {DeveloperError} index is required and between zero and count - 1
 * @private
 */
MetadataTable.prototype.getPropertyBySemantic = function (index, semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  let property;
  const propertiesBySemantic = this._class.propertiesBySemantic;
  if (defined(propertiesBySemantic)) {
    property = propertiesBySemantic[semantic];
  }

  if (defined(property)) {
    return this.getProperty(index, property.id);
  }

  return undefined;
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {number} index The index of the entity.
 * @param {string} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
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
  value,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  let property;
  const propertiesBySemantic = this._class.propertiesBySemantic;
  if (defined(propertiesBySemantic)) {
    property = propertiesBySemantic[semantic];
  }

  if (defined(property)) {
    return this.setProperty(index, property.id, value);
  }

  return false;
};

/**
 * Returns a typed array containing the property values for a given propertyId.
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {*} The typed array containing the property values or <code>undefined</code> if the property values are not stored in a typed array.
 *
 * @private
 */
MetadataTable.prototype.getPropertyTypedArray = function (propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  const property = this._properties[propertyId];

  if (defined(property)) {
    return property.getTypedArray();
  }

  return undefined;
};

/**
 * Returns a typed array containing the property values for the property with the given semantic.
 *
 * @param {string} semantic The case-sensitive semantic of the property.
 * @returns {*} The typed array containing the property values or <code>undefined</code> if the property values are not stored in a typed array.
 *
 * @private
 */
MetadataTable.prototype.getPropertyTypedArrayBySemantic = function (semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  let property;
  const propertiesBySemantic = this._class.propertiesBySemantic;
  if (defined(propertiesBySemantic)) {
    property = propertiesBySemantic[semantic];
  }

  if (defined(property)) {
    return this.getPropertyTypedArray(property.id);
  }

  return undefined;
};

function getDefault(classDefinition, propertyId) {
  const classProperties = classDefinition.properties;
  if (!defined(classProperties)) {
    return undefined;
  }

  const classProperty = classProperties[propertyId];
  if (defined(classProperty) && defined(classProperty.default)) {
    let value = classProperty.default;
    if (classProperty.isArray) {
      value = clone(value, true);
    }
    value = classProperty.normalize(value);
    return classProperty.unpackVectorAndMatrixTypes(value);
  }
}

export default MetadataTable;
