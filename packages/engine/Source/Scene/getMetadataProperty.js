import defined from "../Core/defined.js";

/**
 * Return the `PropertyTextureProperty` or `PropertyAttributeProperty` from
 * the given `StructuralMetadata` that matches the given description.
 *
 * If the given structural metadata is `undefined`, then `undefined` is returned.
 *
 * Otherwise, this method will check all the property textures and property
 * attributes in the given structural metadata.
 *
 * If it finds a property texture that has a class with an `_id` that matches
 * the given name, and that contains a property for the given property name, then
 * this property is returned.
 *
 * If it finds a property attribute that has a class with an `_id` that matches
 * the given name, and that contains a property for the given property name, then
 * this property is returned.
 *
 * Otherwise, `undefined` is returned
 *
 * @param {StructuralMetadata} structuralMetadata The structural metadata
 * @param {string} className The name of the metadata class
 * @param {string} propertyName The name of the metadata property
 * @returns {PropertyTextureProperty|PropertyAttributeProperty|undefined}
 * @private
 */
function getMetadataProperty(structuralMetadata, className, propertyName) {
  if (!defined(structuralMetadata)) {
    return undefined;
  }
  const propertyTextures = structuralMetadata.propertyTextures;
  for (const propertyTexture of propertyTextures) {
    const metadataClass = propertyTexture.class;
    if (metadataClass.id === className) {
      const properties = propertyTexture.properties;
      const property = properties[propertyName];
      if (defined(property)) {
        return property;
      }
    }
  }
  const propertyAttributes = structuralMetadata.propertyAttributes;
  for (const propertyAttribute of propertyAttributes) {
    const metadataClass = propertyAttribute.class;
    if (metadataClass.id === className) {
      const properties = propertyAttribute.properties;
      const property = properties[propertyName];
      if (defined(property)) {
        return property;
      }
    }
  }
}

export default getMetadataProperty;
