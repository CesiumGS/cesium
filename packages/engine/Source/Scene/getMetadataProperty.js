import defined from "../Core/defined.js";

/**
 * Return the `PropertyTextureProperty` from the given `StructuralMetadata`
 * that matches the given description.
 *
 * If the given structural metadata is `undefined`, then `undefined` is returned.
 *
 * Otherwise, this method will check all the property textures in the given
 * structural metadata.
 *
 * If it finds a property texture that has a class with an `_id` that matches
 * the given name, and that contains a property for the given property name, then
 * this property is returned.
 *
 * Otherwise, `undefined` is returned
 *
 * @param {StructuralMetadata} structuralMetadata The structural metadata
 * @param {string} className The name of the metadata class
 * @param {string} propertyName The name of the metadata property
 * @returns {PropertyTextureProperty|undefined}
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
  // Note: This could check for property attributes in a similar
  // way. But since picking arbitrary property attributes via the
  // frame buffer is not supported yet, returning "undefined" here
  // causes the picking to bail out early and safely when no
  // property texture was found.
  // See https://github.com/CesiumGS/cesium/issues/12225
  return undefined;
}

export default getMetadataProperty;
