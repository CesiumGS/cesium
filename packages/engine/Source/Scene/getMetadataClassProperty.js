import defined from "../Core/defined.js";

/**
 * Return the `MetadataClassProperty` from the given schema that
 * matches the given description.
 *
 * If the given schema is `undefined`, then `undefined` is returned.
 * If the given `schemaId` is defined but does not match the ID
 * of the given schema, then `undefined` is returned.
 * If the given schema does not have a class with the given name,
 * or the class does not have a property with the given name,
 * then `undefined` is returned.
 *
 * Otherwise, the `MetadataClassProperty` is returned.
 *
 * @param {object} schema The schema object
 * @param {string|undefined} schemaId The ID of the metadata schema
 * @param {string} className The name of the metadata class
 * @param {string} propertyName The name of the metadata property
 * @returns {MetadataClassProperty|undefined}
 * @private
 */
function getMetadataClassProperty(schema, schemaId, className, propertyName) {
  if (!defined(schema)) {
    return undefined;
  }
  if (defined(schemaId) && schema.id !== schemaId) {
    return undefined;
  }
  const classes = schema.classes || {};
  const metadataClass = classes[className];
  if (!defined(metadataClass)) {
    return undefined;
  }
  const properties = metadataClass.properties || {};
  const metadataProperty = properties[propertyName];
  if (!defined(metadataProperty)) {
    return undefined;
  }
  return metadataProperty;
}

export default getMetadataClassProperty;
