import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import DeveloperError from "../Core/DeveloperError.js";
import getBinaryAccessor from "./getBinaryAccessor.js";
import JsonMetadataTable from "./JsonMetadataTable.js";
import MetadataTable from "./MetadataTable.js";
import MetadataClass from "./MetadataClass.js";

/**
 * An object that adapts the 3D Tiles 1.0 batch table to be compatible with
 * feature metadata from the `EXT_feature_metadata` glTF extension
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.batchTable The batch table JSON
 * @param {Uint8Array} options.binaryBody The batch table binary body
 *
 * @alias BatchTableMetadata
 * @constructor
 *
 * @private
 */
export default function BatchTableMetadata(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.count", options.count);
  Check.typeOf.object("options.batchTable", options.batchTable);
  Check.typeOf.object("options.binaryBody", options.binaryBody);
  //>>includeEnd('debug');

  var batchTable = options.batchTable;
  var extensions = batchTable.extensions;
  var extras = batchTable.extras;
  var legacyHierarchy = batchTable.HIERARCHY;

  var jsonProperties = {};
  var binaryProperties = {};
  for (var propertyId in batchTable) {
    if (
      !batchTable.hasOwnProperty(propertyId) ||
      // these cases were handled above;
      propertyId === "HIERARCHY" ||
      propertyId === "extensions" ||
      propertyId === "extras"
    ) {
      continue;
    }

    var property = batchTable[propertyId];
    if (Array.isArray(property)) {
      jsonProperties[propertyId] = property;
    } else {
      binaryProperties[propertyId] = property;
    }
  }

  if (defined(legacyHierarchy)) {
    BatchTableMetadata._deprecationWarning(
      "batchTableHierarchyExtension",
      "The batch table HIERARCHY property has been moved to an extension. Use extensions.3DTILES_batch_table_hierarchy instead."
    );
    extensions = defined(extensions) ? extensions : {};
    extensions["3DTILES_batch_table_hierarchy"] = legacyHierarchy;
  }

  var count = options.count;
  this._jsonMetadataTable = new JsonMetadataTable({
    count: options.count,
    properties: jsonProperties,
  });
  this._binaryMetadataTable = transcodeBinaryProperties(
    count,
    binaryProperties,
    options.binaryBody
  );
  this._hierarchy = initializeHierarchy(extensions);

  this._count = count;
  this._extras = extras;
  this._extensions = extensions;
}

// This can be overridden for testing purposes
BatchTableMetadata._deprecationWarning = deprecationWarning;

function transcodeBinaryProperties(featureCount, binaryProperties, binaryBody) {
  var classProperties = {};
  var featureTableJson = {};
  var bufferViewsU8 = {};
  var bufferViewCount = 0;
  for (var propertyId in binaryProperties) {
    if (!binaryProperties.hasOwnProperty(propertyId)) {
      continue;
    }
    var property = binaryProperties[propertyId];
    var binaryAccessor = getBinaryAccessor(property);

    featureTableJson[propertyId] = {
      bufferView: bufferViewCount,
    };

    classProperties[propertyId] = getPropertyType(property);

    bufferViewsU8[bufferViewCount] = binaryAccessor.createArrayBufferView(
      binaryBody.buffer,
      binaryBody.byteOffset + property.byteOffset,
      featureCount
    );

    bufferViewCount++;
  }
  var transcodedClass = new MetadataClass({
    id: "batchTable",
    class: {
      properties: classProperties,
    },
  });

  return new MetadataTable({
    count: featureCount,
    properties: featureTableJson,
    class: transcodedClass,
    bufferViews: bufferViewsU8,
  });
}

function getPropertyType(property) {
  var componentType = transcodeComponentType(property.componentType);

  var propertyType = property.type;
  if (propertyType === "SCALAR") {
    return {
      type: componentType,
    };
  }

  // propertyType is one of VEC2, VEC3, or VEC4
  var componentCount = parseInt(propertyType.charAt(3));

  return {
    type: "ARRAY",
    componentType: componentType,
    componentCount: componentCount,
  };
}

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

function initializeHierarchy(extensions) {
  if (!defined(extensions)) {
    return undefined;
  }

  var hierarchy = extensions["3DTILES_batch_table_hierarchy"];
  if (!defined(hierarchy)) {
    return undefined;
  }

  throw new DeveloperError("Not implemented yet");
}

/**
 * Returns whether this property exists.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 * @private
 */
BatchTableMetadata.prototype.hasProperty = function (propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  return (
    this._binaryMetadataTable.hasProperty(propertyId) ||
    this._jsonMetadataTable.hasProperty(propertyId) ||
    (defined(this._hierarchy) && this._hierarchy.hasProperty(propertyId))
  );
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
BatchTableMetadata.prototype.getPropertyIds = function (results) {
  results = this._binaryMetadataTable.getPropertyIds(results);
  results = this._jsonMetadataTable.getPropertyIds(results);

  if (defined(this._hierarchy)) {
    results = this._hierarchy.getPropertyIds(results);
  }

  return results;
};

/**
 * Returns a copy of the value of the property with the given ID.
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 * @exception {DeveloperError} index is out of bounds
 * @private
 */
BatchTableMetadata.prototype.getProperty = function (index, propertyId) {
  var result = this._binaryMetadataTable.getProperty(index, propertyId);
  if (defined(result)) {
    return result;
  }

  result = this._jsonMetadataTable.getProperty(index, propertyId);
  if (defined(result)) {
    return result;
  }

  if (defined(this._hierarchy)) {
    result = this._hierarchy.getProperty(index, propertyId);
  }
  if (defined(result)) {
    return result;
  }
};

/**
 * Sets the value of the property with the given ID.
 *
 * @param {Number} index The index of the entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @exception {DeveloperError} A property with the given ID doesn't exist.
 * @exception {DeveloperError} index is out of bounds
 * @private
 */
JsonMetadataTable.prototype.setProperty = function (index, propertyId, value) {
  // TODO: This one is trickier
  throw new DeveloperError("Not implemented yet");
};
