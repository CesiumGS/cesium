import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import defaultValue from "../Core/defaultValue.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";
import BatchTableHierarchy from "./BatchTableHierarchy.js";
import StructuralMetadata from "./StructuralMetadata.js";
import PropertyAttribute from "./PropertyAttribute.js";
import PropertyTable from "./PropertyTable.js";
import getBinaryAccessor from "./getBinaryAccessor.js";
import JsonMetadataTable from "./JsonMetadataTable.js";
import MetadataClass from "./MetadataClass.js";
import MetadataSchema from "./MetadataSchema.js";
import MetadataTable from "./MetadataTable.js";
import ModelComponents from "./ModelComponents.js";
import ModelUtility from "./Model/ModelUtility.js";

/**
 * An object that parses the the 3D Tiles 1.0 batch table and transcodes it to
 * be compatible with structural metadata from the <code>EXT_structural_metadata</code> glTF extension
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata|EXT_structural_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Number} options.count The number of features in the batch table.
 * @param {Object} options.batchTable The batch table JSON
 * @param {Uint8Array} [options.binaryBody] The batch table binary body
 * @param {Boolean} [options.parseAsPropertyAttributes=false] If true, binary properties are parsed as property attributes instead of a property table. This is used for .pnts models for GPU styling.
 * @param {ModelComponents.Attribute[]} [options.customAttributeOutput] Pass in an empty array here and this method will populate it with a list of custom attributes that will store the values of the property attributes. The attributes will be created with typed arrays, the caller is responsible for uploading them to the GPU. This option is required when options.parseAsPropertyAttributes is true.
 * @return {StructuralMetadata} A transcoded structural metadata object
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function parseBatchTable(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.count", options.count);
  Check.typeOf.object("options.batchTable", options.batchTable);
  //>>includeEnd('debug');

  const featureCount = options.count;
  const batchTable = options.batchTable;
  const binaryBody = options.binaryBody;
  const parseAsPropertyAttributes = defaultValue(
    options.parseAsPropertyAttributes,
    false
  );
  const customAttributeOutput = options.customAttributeOutput;

  //>>includeStart('debug', pragmas.debug);
  if (parseAsPropertyAttributes && !defined(customAttributeOutput)) {
    throw new DeveloperError(
      "customAttributeOutput is required when parsing batch table as property attributes"
    );
  }
  //>>includeEnd('debug');

  // divide properties into binary, json and hierarchy
  const partitionResults = partitionProperties(batchTable);

  const jsonMetadataTable = new JsonMetadataTable({
    count: featureCount,
    properties: partitionResults.jsonProperties,
  });

  const hierarchy = initializeHierarchy(partitionResults.hierarchy, binaryBody);

  const className = MetadataClass.BATCH_TABLE_CLASS_NAME;

  let metadataTable;
  let propertyAttributes;
  let transcodedSchema;
  if (parseAsPropertyAttributes) {
    const attributeResults = transcodeBinaryPropertiesAsPropertyAttributes(
      featureCount,
      className,
      partitionResults.binaryProperties,
      binaryBody,
      customAttributeOutput
    );
    transcodedSchema = attributeResults.transcodedSchema;
    const propertyAttribute = new PropertyAttribute({
      propertyAttribute: attributeResults.propertyAttributeJson,
      class: attributeResults.transcodedClass,
    });

    propertyAttributes = [propertyAttribute];
  } else {
    const binaryResults = transcodeBinaryProperties(
      featureCount,
      className,
      partitionResults.binaryProperties,
      binaryBody
    );
    transcodedSchema = binaryResults.transcodedSchema;
    const featureTableJson = binaryResults.featureTableJson;
    metadataTable = new MetadataTable({
      count: featureTableJson.count,
      properties: featureTableJson.properties,
      class: binaryResults.transcodedClass,
      bufferViews: binaryResults.bufferViewsTypedArrays,
    });
    propertyAttributes = [];
  }

  const propertyTable = new PropertyTable({
    id: 0,
    name: "Batch Table",
    count: featureCount,
    metadataTable: metadataTable,
    jsonMetadataTable: jsonMetadataTable,
    batchTableHierarchy: hierarchy,
  });

  const metadataOptions = {
    schema: transcodedSchema,
    propertyTables: [propertyTable],
    propertyAttributes: propertyAttributes,
    extensions: partitionResults.extensions,
    extras: partitionResults.extras,
  };

  return new StructuralMetadata(metadataOptions);
}

/**
 * Divide the batch table's properties into binary, JSON and hierarchy
 * extension as each is handled separately
 *
 * @param {Object} batchTable The batch table JSON
 * @returns {Object} The batch table divided into binary, JSON and hierarchy portions. Extras and extensions are also divided out for ease of processing.
 *
 * @private
 */
function partitionProperties(batchTable) {
  const legacyHierarchy = batchTable.HIERARCHY;
  const extras = batchTable.extras;
  const extensions = batchTable.extensions;

  let hierarchyExtension;
  if (defined(legacyHierarchy)) {
    parseBatchTable._deprecationWarning(
      "batchTableHierarchyExtension",
      "The batch table HIERARCHY property has been moved to an extension. Use extensions.3DTILES_batch_table_hierarchy instead."
    );
    hierarchyExtension = legacyHierarchy;
  } else if (defined(extensions)) {
    hierarchyExtension = extensions["3DTILES_batch_table_hierarchy"];
  }

  const jsonProperties = {};
  const binaryProperties = {};
  for (const propertyId in batchTable) {
    if (
      !batchTable.hasOwnProperty(propertyId) ||
      // these cases were handled above;
      propertyId === "HIERARCHY" ||
      propertyId === "extensions" ||
      propertyId === "extras"
    ) {
      continue;
    }

    const property = batchTable[propertyId];
    if (Array.isArray(property)) {
      jsonProperties[propertyId] = property;
    } else {
      binaryProperties[propertyId] = property;
    }
  }

  return {
    binaryProperties: binaryProperties,
    jsonProperties: jsonProperties,
    hierarchy: hierarchyExtension,
    extras: extras,
    extensions: extensions,
  };
}

/**
 * Transcode the binary properties of the batch table to be compatible with
 * <code>EXT_structural_metadata</code>
 *
 * @param {Number} featureCount The number of features in the batch table
 * @param {String} className The name of the metadata class to be created.
 * @param {Object.<String, Object>} binaryProperties A dictionary of property ID to property definition
 * @param {Uint8Array} [binaryBody] The binary body of the batch table
 * @return {Object} Transcoded data needed for constructing a {@link StructuralMetadata} object.
 *
 * @private
 */
function transcodeBinaryProperties(
  featureCount,
  className,
  binaryProperties,
  binaryBody
) {
  const classProperties = {};
  const featureTableProperties = {};
  const bufferViewsTypedArrays = {};
  let bufferViewCount = 0;
  for (const propertyId in binaryProperties) {
    if (!binaryProperties.hasOwnProperty(propertyId)) {
      continue;
    }

    if (!defined(binaryBody)) {
      throw new RuntimeError(
        `Property ${propertyId} requires a batch table binary.`
      );
    }

    const property = binaryProperties[propertyId];
    const binaryAccessor = getBinaryAccessor(property);

    featureTableProperties[propertyId] = {
      bufferView: bufferViewCount,
    };

    classProperties[propertyId] = transcodePropertyType(property);

    bufferViewsTypedArrays[
      bufferViewCount
    ] = binaryAccessor.createArrayBufferView(
      binaryBody.buffer,
      binaryBody.byteOffset + property.byteOffset,
      featureCount
    );

    bufferViewCount++;
  }

  const schemaJson = {
    classes: {},
  };
  schemaJson.classes[className] = {
    properties: classProperties,
  };

  const transcodedSchema = new MetadataSchema(schemaJson);

  const featureTableJson = {
    class: className,
    count: featureCount,
    properties: featureTableProperties,
  };

  return {
    featureTableJson: featureTableJson,
    bufferViewsTypedArrays: bufferViewsTypedArrays,
    transcodedSchema: transcodedSchema,
    transcodedClass: transcodedSchema.classes[className],
  };
}

function transcodeBinaryPropertiesAsPropertyAttributes(
  featureCount,
  className,
  binaryProperties,
  binaryBody,
  customAttributeOutput
) {
  const classProperties = {};
  const propertyAttributeProperties = {};
  let nextPlaceholderId = 0;

  for (const propertyId in binaryProperties) {
    if (!binaryProperties.hasOwnProperty(propertyId)) {
      continue;
    }

    // For draco-compressed attributes from .pnts files, the results will be
    // stored in separate typed arrays. These will be used in place of the
    // binary body
    const property = binaryProperties[propertyId];
    if (!defined(binaryBody) && !defined(property.typedArray)) {
      throw new RuntimeError(
        `Property ${propertyId} requires a batch table binary.`
      );
    }

    let sanitizedPropertyId = ModelUtility.sanitizeGlslIdentifier(propertyId);

    // If the sanitized string is empty or a duplicate, use a placeholder
    // name instead. This will work for styling, but it may lead to undefined
    // behavior in CustomShader, since
    // - different tiles may pick a different placeholder ID due to the
    //    collection being unordered
    // - different tiles may have different number of properties.
    if (
      sanitizedPropertyId === "" ||
      classProperties.hasOwnProperty(sanitizedPropertyId)
    ) {
      sanitizedPropertyId = `property_${nextPlaceholderId}`;
      nextPlaceholderId++;
    }

    const classProperty = transcodePropertyType(property);
    classProperty.name = propertyId;
    classProperties[sanitizedPropertyId] = classProperty;

    // Extract the typed array and create a custom attribute as a typed array.
    // The caller must add the results to the ModelComponents, and upload the
    // typed array to the GPU. The attribute name is converted to all capitals
    // and underscores, like a glTF custom attribute.
    //
    // For example, if the original property ID was 'Temperature ℃', the result
    // is _TEMPERATURE
    let customAttributeName = sanitizedPropertyId.toUpperCase();
    if (!customAttributeName.startsWith("_")) {
      customAttributeName = `_${customAttributeName}`;
    }

    // for .pnts with draco compression, property.typedArray is used
    // instead of the binary body.
    let attributeTypedArray = property.typedArray;
    if (!defined(attributeTypedArray)) {
      const binaryAccessor = getBinaryAccessor(property);
      attributeTypedArray = binaryAccessor.createArrayBufferView(
        binaryBody.buffer,
        binaryBody.byteOffset + property.byteOffset,
        featureCount
      );
    }

    const attribute = new ModelComponents.Attribute();
    attribute.name = customAttributeName;
    attribute.count = featureCount;
    attribute.type = property.type;
    attribute.componentDatatype = ComponentDatatype.fromTypedArray(
      attributeTypedArray
    );
    attribute.typedArray = attributeTypedArray;
    customAttributeOutput.push(attribute);

    // Refer to the custom attribute name from the property attribute
    propertyAttributeProperties[sanitizedPropertyId] = {
      attribute: customAttributeName,
    };
  }

  const schemaJson = {
    classes: {},
  };
  schemaJson.classes[className] = {
    properties: classProperties,
  };

  const transcodedSchema = new MetadataSchema(schemaJson);

  const propertyAttributeJson = {
    properties: propertyAttributeProperties,
  };

  return {
    class: className,
    propertyAttributeJson: propertyAttributeJson,
    transcodedSchema: transcodedSchema,
    transcodedClass: transcodedSchema.classes[className],
  };
}

/**
 * Given a property definition from the batch table, compute the equivalent
 * <code>EXT_structural_metadata</code> type definition
 *
 * @param {Object} property The batch table property definition
 * @return {Object} The corresponding structural metadata property definition
 * @private
 */
function transcodePropertyType(property) {
  const componentType = transcodeComponentType(property.componentType);

  return {
    type: property.type,
    componentType: componentType,
  };
}

/**
 * Convert the component type of a batch table property to the corresponding
 * type used with structural metadata
 *
 * @property {String} componentType the batch table's component type
 * @return {String} The corresponding structural metadata data type
 *
 * @private
 */
function transcodeComponentType(componentType) {
  switch (componentType) {
    case "BYTE":
      return "INT8";
    case "UNSIGNED_BYTE":
      return "UINT8";
    case "SHORT":
      return "INT16";
    case "UNSIGNED_SHORT":
      return "UINT16";
    case "INT":
      return "INT32";
    case "UNSIGNED_INT":
      return "UINT32";
    case "FLOAT":
      return "FLOAT32";
    case "DOUBLE":
      return "FLOAT64";
  }
}

/**
 * Construct a batch table hierarchy object if the <code>3DTILES_batch_table_hierarchy</code> extension is present
 *
 * @param {Object} [hierarchyExtension] The <code>3DTILES_batch_table_hierarchy</code> extension object.
 * @param {Uint8Array} binaryBody The binary body of the batch table
 * @return {BatchTableHierarchy} A batch table hierarchy, or <code>undefined</code> if the extension is not present.
 *
 * @private
 */
function initializeHierarchy(hierarchyExtension, binaryBody) {
  if (defined(hierarchyExtension)) {
    return new BatchTableHierarchy({
      extension: hierarchyExtension,
      binaryBody: binaryBody,
    });
  }

  return undefined;
}

// exposed for testing
parseBatchTable._deprecationWarning = deprecationWarning;
