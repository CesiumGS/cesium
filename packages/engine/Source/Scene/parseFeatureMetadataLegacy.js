import Check from "../Core/Check.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PropertyTable from "./PropertyTable.js";
import PropertyTexture from "./PropertyTexture.js";
import StructuralMetadata from "./StructuralMetadata.js";
import MetadataTable from "./MetadataTable.js";

/**
 * Parse the <code>EXT_feature_metadata</code> glTF extension to create a
 * structural metadata object.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.extension The extension JSON object.
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {Object<string, Uint8Array>} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 * @param {Object<string, Texture>} [options.textures] An object mapping texture IDs to {@link Texture} objects.
 * @return {StructuralMetadata} A structural metadata object
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function parseFeatureMetadataLegacy(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const extension = options.extension;

  // The calling code is responsible for loading the schema.
  // This keeps metadata parsing synchronous.
  const schema = options.schema;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.extension", extension);
  Check.typeOf.object("options.schema", schema);
  //>>includeEnd('debug');

  let i;
  const propertyTables = [];
  let sortedIds;
  if (defined(extension.featureTables)) {
    // Store textures in an array sorted by the dictionary keys. This
    // allows compatibility with the newer EXT_structural_metadata extension
    // which is array-based.
    sortedIds = Object.keys(extension.featureTables).sort();
    for (i = 0; i < sortedIds.length; i++) {
      const featureTableId = sortedIds[i];
      const featureTable = extension.featureTables[featureTableId];
      const classDefinition = schema.classes[featureTable.class];

      const metadataTable = new MetadataTable({
        count: featureTable.count,
        properties: featureTable.properties,
        class: classDefinition,
        bufferViews: options.bufferViews,
      });

      propertyTables.push(
        new PropertyTable({
          id: featureTableId,
          count: featureTable.count,
          metadataTable: metadataTable,
          extras: featureTable.extras,
          extensions: featureTable.extensions,
        })
      );
    }
  }

  const propertyTextures = [];
  if (defined(extension.featureTextures)) {
    // Store textures in an array sorted by the dictionary keys. This
    // allows compatibility with the newer EXT_structural_metadata extension
    // which is array-based.
    sortedIds = Object.keys(extension.featureTextures).sort();
    for (i = 0; i < sortedIds.length; i++) {
      const featureTextureId = sortedIds[i];
      const featureTexture = extension.featureTextures[featureTextureId];
      propertyTextures.push(
        new PropertyTexture({
          id: featureTextureId,
          propertyTexture: transcodeToPropertyTexture(featureTexture),
          class: schema.classes[featureTexture.class],
          textures: options.textures,
        })
      );
    }
  }

  return new StructuralMetadata({
    schema: schema,
    propertyTables: propertyTables,
    propertyTextures: propertyTextures,
    statistics: extension.statistics,
    extras: extension.extras,
    extensions: extension.extensions,
  });
}

function transcodeToPropertyTexture(featureTexture) {
  const propertyTexture = {
    class: featureTexture.class,
    properties: {},
  };

  const properties = featureTexture.properties;
  for (const propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      const oldProperty = properties[propertyId];
      const property = {
        // EXT_structural_metadata uses numeric channel indices instead of
        // a string of channel letters like "rgba".
        channels: reformatChannels(oldProperty.channels),
        extras: oldProperty.extras,
        extensions: oldProperty.extensions,
      };

      // EXT_feature_metadata puts the textureInfo in property.texture.
      // EXT_structural_metadata flattens this structure; essentially a
      // textureInfo + channels
      propertyTexture.properties[propertyId] = combine(
        oldProperty.texture,
        property,
        true
      );
    }
  }

  return propertyTexture;
}

function reformatChannels(channelsString) {
  const length = channelsString.length;
  const result = new Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = "rgba".indexOf(channelsString[i]);
  }
  return result;
}

export default parseFeatureMetadataLegacy;
