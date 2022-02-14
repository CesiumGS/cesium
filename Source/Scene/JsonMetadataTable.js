import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * A table for storing free-form JSON metadata, as in the 3D Tiles batch table.
 *
 * @param {Object} options Object with the following properties:
 * @param {Number} options.count The number of entities in the table.
 * @param {Object.<String, Array>} options.properties The JSON representation of the metadata table. All the arrays must have exactly options.count elements.
 *
 * @alias JsonMetadataTable
 * @constructor
 * @private
 */

const emptyClass = {};

export default function JsonMetadataTable(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("options.count", options.count, 0);
  Check.typeOf.object("options.properties", options.properties);
  //>>includeEnd('debug');

  this._count = options.count;
  this._properties = clone(options.properties, true);
}

/**
 * Returns whether the table has this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the table has this property.
 * @private
 */
JsonMetadataTable.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, emptyClass);
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
JsonMetadataTable.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this._properties, emptyClass, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this property.
 *
 * @exception {DeveloperError} index is out of bounds
 * @private
 */
JsonMetadataTable.prototype.getProperty = function (index, propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  Check.typeOf.string("propertyId", propertyId);

  if (index < 0 || index >= this._count) {
    throw new DeveloperError(`index must be in the range [0, ${this._count})`);
  }
  //>>includeEnd('debug');

  const property = this._properties[propertyId];
  if (defined(property)) {
    return clone(property[index], true);
  }

  return undefined;
};

/**
 * Sets the value of the property with the given ID.
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 *
 * @exception {DeveloperError} index is out of bounds
 * @private
 */
JsonMetadataTable.prototype.setProperty = function (index, propertyId, value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  Check.typeOf.string("propertyId", propertyId);

  if (index < 0 || index >= this._count) {
    throw new DeveloperError(`index must be in the range [0, ${this._count})`);
  }
  //>>includeEnd('debug');

  const property = this._properties[propertyId];
  if (defined(property)) {
    property[index] = clone(value, true);
    return true;
  }

  return false;
};
