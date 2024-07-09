import defined from "../Core/defined.js";

/**
 * Check if the given schema has a property that matches the
 * given description.
 *
 * If the given schema is `undefined`, then `false` is returned.
 * If the given `schemaId` is defined but does not match the ID
 * of the given schema, then `false` is returned.
 * Otherwise, this function returns whether the given schema
 * has a class with the given name, that has a property with
 * the given name.
 *
 * @param {object} schema The schema object
 * @param {string|undefined} schemaId The ID of the metadata schema
 * @param {string} className The name of the metadata class
 * @param {string} propertyName The Name of the metadata property
 * @returns {boolean} True if the property is present
 * @private
 */
function hasMetadataProperty(schema, schemaId, className, propertyName) {
  if (!defined(schema)) {
    return false;
  }
  if (defined(schemaId) && schema.id !== schemaId) {
    return false;
  }
  const classes = schema.classes || {};
  const metadataClass = classes[className];
  if (!defined(metadataClass)) {
    return false;
  }
  const properties = metadataClass.properties || {};
  const metadataProperty = properties[propertyName];
  if (!defined(metadataProperty)) {
    return false;
  }
  return true;
}

export default hasMetadataProperty;
