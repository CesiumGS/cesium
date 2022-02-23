import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PropertyTable from "./PropertyTable.js";
import PropertyTexture from "./PropertyTexture.js";
import PropertyAttribute from "./PropertyAttribute.js";
import StructuralMetadata from "./StructuralMetadata.js";
import MetadataTable from "./MetadataTable.js";

/**
 * Parse the <code>EXT_structural_metadata</code> glTF extension to create a
 * structural metadata object.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.extension The extension JSON object.
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {Object.<String, Uint8Array>} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 * @param {Object.<String, Texture>} [options.textures] An object mapping texture IDs to {@link Texture} objects.
 * @return {StructuralMetadata} A structural metadata object
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function parseStructuralMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const extension = options.extension;

  // The calling code is responsible for loading the schema.
  // This keeps metadata parsing synchronous.
  const schema = options.schema;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.extension", extension);
  Check.typeOf.object("options.schema", schema);
  //>>includeEnd('debug');

  const propertyTables = [];
  if (defined(extension.propertyTables)) {
    for (let i = 0; i < extension.propertyTables.length; i++) {
      const propertyTable = extension.propertyTables[i];
      const classDefinition = schema.classes[propertyTable.class];
      const metadataTable = new MetadataTable({
        count: propertyTable.count,
        properties: propertyTable.properties,
        class: classDefinition,
        bufferViews: options.bufferViews,
      });
      propertyTables.push(
        new PropertyTable({
          id: i,
          name: propertyTable.name,
          count: propertyTable.count,
          metadataTable: metadataTable,
          extras: propertyTable.extras,
          extensions: propertyTable.extensions,
        })
      );
    }
  }

  const propertyTextures = [];
  if (defined(extension.propertyTextures)) {
    for (let i = 0; i < extension.propertyTextures.length; i++) {
      const propertyTexture = extension.propertyTextures[i];
      propertyTextures.push(
        new PropertyTexture({
          id: i,
          name: propertyTexture.name,
          propertyTexture: propertyTexture,
          class: schema.classes[propertyTexture.class],
          textures: options.textures,
        })
      );
    }
  }

  const propertyAttributes = [];
  if (defined(extension.propertyAttributes)) {
    for (let i = 0; i < extension.propertyAttributes.length; i++) {
      const propertyAttribute = extension.propertyAttributes[i];
      propertyAttributes.push(
        new PropertyAttribute({
          id: i,
          name: propertyAttribute.name,
          class: schema.classes[propertyAttribute.class],
          propertyAttribute: propertyAttribute,
        })
      );
    }
  }

  return new StructuralMetadata({
    schema: schema,
    propertyTables: propertyTables,
    propertyTextures: propertyTextures,
    propertyAttributes: propertyAttributes,
    statistics: extension.statistics,
    extras: extension.extras,
    extensions: extension.extensions,
  });
}
