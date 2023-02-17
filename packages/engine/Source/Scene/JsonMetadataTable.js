import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import MetadataEntity from "./MetadataEntity.js";

/**
 * A table for storing free-form JSON metadata, as in the 3D Tiles batch table.
 *
 * @param {object} options Object with the following properties:
 * @param {number} options.count The number of entities in the table.
 * @param {Object<string, Array>} options.properties The JSON representation of the metadata table. All the arrays must have exactly options.count elements.
 *
 * @alias JsonMetadataTable
 * @constructor
 * @private
 */

// An empty class is used because JsonMetadataTable is an older type of metadata table
// that does not have a class definition.
const emptyClass = {};

function JsonMetadataTable(options) {
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
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {boolean} Whether the table has this property.
 * @private
 */
JsonMetadataTable.prototype.hasProperty = function (propertyId) {
  return MetadataEntity.hasProperty(propertyId, this._properties, emptyClass);
};

/**
 * Returns an array of property IDs.
 *
 * @param {string[]} [results] An array into which to store the results.
 * @returns {string[]} The property IDs.
 * @private
 */
JsonMetadataTable.prototype.getPropertyIds = function (results) {
  return MetadataEntity.getPropertyIds(this._properties, emptyClass, results);
};

/**
 * Returns a copy of the value of the property with the given ID.
 *
 * @param {number} index The index of the entity.
 * @param {string} propertyId The case-sensitive ID of the property.
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
 * Sets the value of the property with the given ID. If the property did not
 * exist, it will be created.
 *
 * @param {number} index The index of the entity.
 * @param {string} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
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

  let property = this._properties[propertyId];
  if (!defined(property)) {
    // Property does not exist. Create it.
    property = new Array(this._count);
    this._properties[propertyId] = property;
  }

  property[index] = clone(value, true);
};

export default JsonMetadataTable;
