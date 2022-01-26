import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import PropertyTable from "./PropertyTable.js";
import PropertyTexture from "./PropertyTexture.js";
import FeatureMetadata from "./FeatureMetadata.js";
import MetadataTable from "./MetadataTable.js";

/**
 * Parse the <code>EXT_feature_metadata</code> glTF extension to create a
 * feature metadata object.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.extension The extension JSON object.
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {Object.<String, Uint8Array>} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 * @param {Object.<String, Texture>} [options.textures] An object mapping texture IDs to {@link Texture} objects.
 * @return {FeatureMetadata} A feature metadata object
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function parseFeatureMetadataLegacy(options) {
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
    // allows compatibility with the newer EXT_mesh_features extension
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
    // allows compatibility with the newer EXT_mesh_features extension
    // which is array-based.
    sortedIds = Object.keys(extension.featureTextures).sort();
    for (i = 0; i < sortedIds.length; i++) {
      const featureTextureId = sortedIds[i];
      const featureTexture = extension.featureTextures[featureTextureId];
      propertyTextures.push(
        new PropertyTexture({
          id: featureTextureId,
          propertyTexture: reformatPropertyTexture(featureTexture),
          class: schema.classes[featureTexture.class],
          textures: options.textures,
        })
      );
    }
  }

  return new FeatureMetadata({
    schema: schema,
    propertyTables: propertyTables,
    propertyTextures: propertyTextures,
    statistics: extension.statistics,
    extras: extension.extras,
    extensions: extension.extensions,
  });
}

/**
 * The EXT_feature_metadata schema allowed storing properties of a property
 * texture across multiple textures. This is now disallowed in EXT_mesh_features,
 * so CesiumJS will not support this capability.
 * <p>
 * This method transcodes the feature texture JSON to the newer
 * EXT_mesh_features format, throwing developer
 * </p>
 *
 * @param {Object} featureTexture The feature texture JSON from the legacy EXT_feature_metadata extension
 * @return {Object} The corresponding property texture JSON as in EXT_mesh_features.
 * @private
 */
function reformatPropertyTexture(featureTexture) {
  var propertyTexture = {
    class: featureTexture.class,
    index: undefined,
    texCoord: undefined,
    properties: {},
  };

  var textureInfos = [];

  var originalProperties = featureTexture.properties;
  for (var propertyId in originalProperties) {
    if (originalProperties.hasOwnProperty(propertyId)) {
      var originalProperty = originalProperties[propertyId];
      var channels = reformatChannels(originalProperty.channels);
      propertyTexture.properties[propertyId] = channels;
      textureInfos.push(originalProperty.texture);
    }
  }

  var index = textureInfos[0].index;
  var texCoord = textureInfos[0].texCoord;
  //>>includeStart('debug', pragmas.debug);
  for (var i = 1; i < textureInfos.length; i++) {
    var textureInfo = textureInfos[i];
    if (textureInfo.index !== index || textureInfo.texCoord !== texCoord) {
      throw new DeveloperError(
        "feature textures using multiple feature textures are not supported"
      );
    }
  }
  //>>includeEnd('debug');

  propertyTexture.index = index;
  propertyTexture.texCoord = texCoord;

  return propertyTexture;
}

function reformatChannels(channelsString) {
  var channels = [];
  for (var i = 0; i < channelsString.length; i++) {
    var channelCharacter = channelsString.charAt(i);
    var channelIndex = "rgba".indexOf(channelCharacter);
    channels.push(channelIndex);
  }
  return channels;
}
