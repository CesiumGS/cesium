import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
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
import oneTimeWarning from "../Core/oneTimeWarning.js";

/**
 * An object that parses the the 3D Tiles 1.0 batch table and transcodes it to
 * be compatible with structural metadata from the <code>EXT_structural_metadata</code> glTF extension
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata|EXT_structural_metadata Extension} for glTF.
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {number} options.count The number of features in the batch table.
 * @param {object} options.batchTable The batch table JSON
 * @param {Uint8Array} [options.binaryBody] The batch table binary body
 * @param {boolean} [options.parseAsPropertyAttributes=false] If true, binary properties are parsed as property attributes instead of a property table. This is used for .pnts models for GPU styling.
 * @param {ModelComponents.Attribute[]} [options.customAttributeOutput] Pass in an empty array here and this method will populate it with a list of custom attributes that will store the values of the property attributes. The attributes will be created with typed arrays, the caller is responsible for uploading them to the GPU. This option is required when options.parseAsPropertyAttributes is true.
 * @return {StructuralMetadata} A transcoded structural metadata object
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function parseBatchTable(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.count", options.count);
  Check.typeOf.object("options.batchTable", options.batchTable);
  //>>includeEnd('debug');

  const featureCount = options.count;
  const batchTable = options.batchTable;
  const binaryBody = options.binaryBody;
  const parseAsPropertyAttributes = options.parseAsPropertyAttributes ?? false;
  const customAttributeOutput = options.customAttributeOutput;

  //>>includeStart('debug', pragmas.debug);
  if (parseAsPropertyAttributes && !defined(customAttributeOutput)) {
    throw new DeveloperError(
      "customAttributeOutput is required when parsing batch table as property attributes",
    );
  }
  //>>includeEnd('debug');

  // divide properties into binary, json and hierarchy
  const partitionResults = partitionProperties(batchTable);

  let jsonMetadataTable;
  if (defined(partitionResults.jsonProperties)) {
    jsonMetadataTable = new JsonMetadataTable({
      count: featureCount,
      properties: partitionResults.jsonProperties,
    });
  }

  let hierarchy;
  if (defined(partitionResults.hierarchy)) {
    hierarchy = new BatchTableHierarchy({
      extension: partitionResults.hierarchy,
      binaryBody: binaryBody,
    });
  }

  const className = MetadataClass.BATCH_TABLE_CLASS_NAME;
  const binaryProperties = partitionResults.binaryProperties;

  let metadataTable;
  let propertyAttributes;
  let transcodedSchema;
  if (parseAsPropertyAttributes) {
    const attributeResults = transcodeBinaryPropertiesAsPropertyAttributes(
      featureCount,
      className,
      binaryProperties,
      binaryBody,
      customAttributeOutput,
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
      binaryProperties,
      binaryBody,
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

  const propertyTables = [];
  if (
    defined(metadataTable) ||
    defined(jsonMetadataTable) ||
    defined(hierarchy)
  ) {
    const propertyTable = new PropertyTable({
      id: 0,
      name: "Batch Table",
      count: featureCount,
      metadataTable: metadataTable,
      jsonMetadataTable: jsonMetadataTable,
      batchTableHierarchy: hierarchy,
    });
    propertyTables.push(propertyTable);
  }

  const metadataOptions = {
    schema: transcodedSchema,
    propertyTables: propertyTables,
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
 * @param {object} batchTable The batch table JSON
 * @returns {object} The batch table divided into binary, JSON and hierarchy portions. Extras and extensions are also divided out for ease of processing.
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
      "The batch table HIERARCHY property has been moved to an extension. Use extensions.3DTILES_batch_table_hierarchy instead.",
    );
    hierarchyExtension = legacyHierarchy;
  } else if (defined(extensions)) {
    hierarchyExtension = extensions["3DTILES_batch_table_hierarchy"];
  }

  // A JsonMetadataTable is only allocated as needed.
  let jsonProperties;
  // A MetadataTable or PropertyAttribute will always be created, even if
  // there are no properties.
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
      jsonProperties = defined(jsonProperties) ? jsonProperties : {};
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
 * @param {number} featureCount The number of features in the batch table
 * @param {string} className The name of the metadata class to be created.
 * @param {Object<string, Object>} binaryProperties A dictionary of property ID to property definition
 * @param {Uint8Array} [binaryBody] The binary body of the batch table
 * @return {object} Transcoded data needed for constructing a {@link StructuralMetadata} object.
 *
 * @private
 */
function transcodeBinaryProperties(
  featureCount,
  className,
  binaryProperties,
  binaryBody,
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
        `Property ${propertyId} requires a batch table binary.`,
      );
    }

    const property = binaryProperties[propertyId];
    const binaryAccessor = getBinaryAccessor(property);

    featureTableProperties[propertyId] = {
      bufferView: bufferViewCount,
    };

    classProperties[propertyId] = transcodePropertyType(property);

    bufferViewsTypedArrays[bufferViewCount] =
      binaryAccessor.createArrayBufferView(
        binaryBody.buffer,
        binaryBody.byteOffset + property.byteOffset,
        featureCount,
      );

    bufferViewCount++;
  }

  const schemaJson = {
    classes: {},
  };
  schemaJson.classes[className] = {
    properties: classProperties,
  };

  const transcodedSchema = MetadataSchema.fromJson(schemaJson);

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
  customAttributeOutput,
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
        `Property ${propertyId} requires a batch table binary.`,
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
        featureCount,
      );
    }

    const attribute = new ModelComponents.Attribute();
    attribute.name = customAttributeName;
    attribute.count = featureCount;
    attribute.type = property.type;
    const componentDatatype =
      ComponentDatatype.fromTypedArray(attributeTypedArray);
    if (
      componentDatatype === ComponentDatatype.INT ||
      componentDatatype === ComponentDatatype.UNSIGNED_INT ||
      componentDatatype === ComponentDatatype.DOUBLE
    ) {
      parseBatchTable._oneTimeWarning(
        "Cast pnts property to floats",
        `Point cloud property "${customAttributeName}" will be cast to a float array because INT, UNSIGNED_INT, and DOUBLE are not valid WebGL vertex attribute types. Some precision may be lost.`,
      );
      attributeTypedArray = new Float32Array(attributeTypedArray);
    }
    attribute.componentDatatype =
      ComponentDatatype.fromTypedArray(attributeTypedArray);
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

  const transcodedSchema = MetadataSchema.fromJson(schemaJson);

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
 * @param {object} property The batch table property definition
 * @return {object} The corresponding structural metadata property definition
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
 * @property {string} componentType the batch table's component type
 * @return {string} The corresponding structural metadata data type
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

// exposed for testing
parseBatchTable._deprecationWarning = deprecationWarning;
parseBatchTable._oneTimeWarning = oneTimeWarning;

export default parseBatchTable;
