import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import PropertyTable from "./PropertyTable.js";
import PropertyTexture from "./PropertyTexture.js";
import PropertyAttribute from "./PropertyAttribute.js";
import StructuralMetadata from "./StructuralMetadata.js";
import MetadataTable from "./MetadataTable.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import PixelFormat from "../Core/PixelFormat.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RuntimeError from "../Core/RuntimeError.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import ContextLimits from "../Renderer/ContextLimits.js";

/**
 * Parse the <code>EXT_structural_metadata</code> glTF extension to create a
 * structural metadata object.
 *
 * @param {object} options Object with the following properties:
 * @param {object} options.extension The extension JSON object.
 * @param {MetadataSchema} options.schema The parsed schema.
 * @param {Object<string, Uint8Array>} [options.bufferViews] An object mapping bufferView IDs to Uint8Array objects.
 * @param {Object<string, Texture>} [options.textures] An object mapping texture IDs to {@link Texture} objects.
 * @param {Context} [options.context] The current rendering context.
 * @return {StructuralMetadata} A structural metadata object
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function parseStructuralMetadata(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
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
      const propertyTableTexture = createTextureForPropertyTable(
        propertyTable,
        options.bufferViews,
        classDefinition,
        options.context,
      );

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
          texture: propertyTableTexture,
        }),
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
        }),
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
        }),
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

// Always use four channels for property table textures.
const NUM_CHANNELS = 4;

/**
 * Creates a texture from a set of property table properties (those which are GPU compatible).
 * Each row of the texture is a property, with each column corresponding to a given feature.
 *
 * @param {PropertyTable} propertyTable The property table.
 * @param {Object<string, Uint8Array>} bufferViews An object mapping bufferView IDs to Uint8Array objects for the given property table.
 * @param {MetadataClass} classDefinition Class defined in the schema
 * @param {Context} context The rendering context.
 * @returns {Texture|undefined} The created texture, or <code>undefined</code> if no properties are GPU compatible.
 *
 * @private
 */
function createTextureForPropertyTable(
  propertyTable,
  bufferViews,
  classDefinition,
  context,
) {
  const properties = propertyTable.properties;
  if (!defined(properties)) {
    return undefined;
  }

  const numFeatures = propertyTable.count;
  const gpuCompatiblePropertyBufferViews =
    collectGpuCompatiblePropertyBufferViews(
      properties,
      bufferViews,
      classDefinition,
      numFeatures,
    );

  const numGpuCompatibleProperties = gpuCompatiblePropertyBufferViews.length;

  if (numGpuCompatibleProperties === 0) {
    return undefined;
  }

  // In the future, we could use multiple textures if we would exceed the maximum texture size.
  if (
    numFeatures > ContextLimits.maximumTextureSize ||
    numGpuCompatibleProperties > ContextLimits.maximumTextureSize
  ) {
    oneTimeWarning(
      `Cannot create a texture for the property table "${propertyTable.name}" because it exceeds the maximum texture size of ${ContextLimits.maximumTextureSize}.`,
    );
    return undefined;
  }

  const packedBufferView = packPropertyTablePropertiesIntoRGBA8(
    gpuCompatiblePropertyBufferViews,
    numFeatures,
  );

  // Create a sampler fit for sampling raw data without mipmapping / filtering etc.
  const sampler = new Sampler({
    wrapS: TextureWrap.CLAMP_TO_EDGE,
    wrapT: TextureWrap.CLAMP_TO_EDGE,
    minificationFilter: TextureMinificationFilter.NEAREST,
    magnificationFilter: TextureMagnificationFilter.NEAREST,
  });

  return Texture.create({
    context: context,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    sampler: sampler,
    source: {
      width: numFeatures,
      height: numGpuCompatibleProperties,
      arrayBufferView: packedBufferView,
    },
  });
}

function collectGpuCompatiblePropertyBufferViews(
  properties,
  bufferViews,
  classDefinition,
  numFeatures,
) {
  const bufferViewsForThisTable = [];

  for (const propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      const property = properties[propertyId];
      const bufferView = bufferViews[property.values];
      const classProperty = classDefinition.properties[propertyId];

      // Certain properties like strings, dynamic-sized arrays, and 64-bit types cannot be represented easily on the GPU.
      if (!classProperty.isGpuCompatible(NUM_CHANNELS)) {
        continue;
      }

      const bufferViewLength = bufferView.length;
      const bytesPerElement = classProperty.bytesPerElement();
      const numBufferElements = bufferViewLength / bytesPerElement;
      if (numBufferElements !== numFeatures) {
        throw new RuntimeError(
          `Property with ID: "${propertyId}" has (${numBufferElements}), which does not match number of features in the property table: (${numFeatures}).`,
        );
      }

      bufferViewsForThisTable.push({
        view: bufferView,
        bytesPerElement: bytesPerElement,
      });
    }
  }

  return bufferViewsForThisTable;
}

// Make one big buffer view to load into the texture
// Since each texel is always 4 bytes (RGBA8 format), elements less than 4 bytes need to be padded (respecting little-endian order).
function packPropertyTablePropertiesIntoRGBA8(
  bufferViewsForThisTable,
  numFeatures,
) {
  const numGpuCompatibleProperties = bufferViewsForThisTable.length;
  const packedBufferView = new Uint8Array(
    numGpuCompatibleProperties * numFeatures * NUM_CHANNELS,
  );

  for (let i = 0, offset = 0; i < bufferViewsForThisTable.length; i++) {
    const bufferView = bufferViewsForThisTable[i].view;
    const bytesPerElement = bufferViewsForThisTable[i].bytesPerElement;
    const numElements = bufferView.length / bytesPerElement;

    for (let j = 0; j < numElements; j++) {
      const sourceOffset = j * bytesPerElement;
      const destOffset = offset + j * NUM_CHANNELS;

      packedBufferView.set(
        bufferView.subarray(sourceOffset, sourceOffset + bytesPerElement),
        destOffset,
      );

      // Pad remaining channels with 0
      for (let k = bytesPerElement; k < NUM_CHANNELS; k++) {
        packedBufferView[destOffset + k] = 0;
      }
    }

    offset += numElements * NUM_CHANNELS;
  }

  return packedBufferView;
}

export default parseStructuralMetadata;
