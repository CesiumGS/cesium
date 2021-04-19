import arrayFill from "../Core/arrayFill.js";
import AttributeType from "./AttributeType.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import combine from "../Core/combine.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import defaultValue from "../Core/defaultValue.js";
import DeveloperError from "../Core/DeveloperError.js";
import getBinaryAccessor from "./getBinaryAccessor.js";
import RuntimeError from "../Core/RuntimeError.js";

/**
 * Object for handling the <code>3DTILES_batch_table_hierarchy</code> extension
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.extension The <code>3DTILES_batch_table_hierarchy</code> extension object.
 * @param {Uint8Array} [options.binaryBody] The binary body of the batch table
 *
 * @alias BatchTableHierarchy
 * @constructor
 *
 * @private
 */
export default function BatchTableHierarchy(options) {
  this._classes = undefined;
  this._classIds = undefined;
  this._classIndexes = undefined;
  this._parentCounts = undefined;
  this._parentIndexes = undefined;
  this._parentIds = undefined;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.extension", options.extension);
  //>>includeEnd('debug');

  initialize(this, options.extension, options.binaryBody);

  //>>includeStart('debug', pragmas.debug);
  validateHierarchy(this);
  //>>includeEnd('debug');
}

/**
 * Parse the batch table hierarchy from the
 * <code>3DTILES_batch_table_hierarchy</code> extension.
 *
 * @param {BatchTableHierarchy} hierarchy The hierarchy instance
 * @param {Object} hierarchyJson The JSON of the extension
 * @param {Uint8Array} [binaryBody] The binary body of the batch table for accessing binary properties
 * @private
 */
function initialize(hierarchy, hierarchyJson, binaryBody) {
  var i;
  var classId;
  var binaryAccessor;

  var instancesLength = hierarchyJson.instancesLength;
  var classes = hierarchyJson.classes;
  var classIds = hierarchyJson.classIds;
  var parentCounts = hierarchyJson.parentCounts;
  var parentIds = hierarchyJson.parentIds;
  var parentIdsLength = instancesLength;

  if (defined(classIds.byteOffset)) {
    classIds.componentType = defaultValue(
      classIds.componentType,
      ComponentDatatype.UNSIGNED_SHORT
    );
    classIds.type = AttributeType.SCALAR;
    binaryAccessor = getBinaryAccessor(classIds);
    classIds = binaryAccessor.createArrayBufferView(
      binaryBody.buffer,
      binaryBody.byteOffset + classIds.byteOffset,
      instancesLength
    );
  }

  var parentIndexes;
  if (defined(parentCounts)) {
    if (defined(parentCounts.byteOffset)) {
      parentCounts.componentType = defaultValue(
        parentCounts.componentType,
        ComponentDatatype.UNSIGNED_SHORT
      );
      parentCounts.type = AttributeType.SCALAR;
      binaryAccessor = getBinaryAccessor(parentCounts);
      parentCounts = binaryAccessor.createArrayBufferView(
        binaryBody.buffer,
        binaryBody.byteOffset + parentCounts.byteOffset,
        instancesLength
      );
    }
    parentIndexes = new Uint16Array(instancesLength);
    parentIdsLength = 0;
    for (i = 0; i < instancesLength; ++i) {
      parentIndexes[i] = parentIdsLength;
      parentIdsLength += parentCounts[i];
    }
  }

  if (defined(parentIds) && defined(parentIds.byteOffset)) {
    parentIds.componentType = defaultValue(
      parentIds.componentType,
      ComponentDatatype.UNSIGNED_SHORT
    );
    parentIds.type = AttributeType.SCALAR;
    binaryAccessor = getBinaryAccessor(parentIds);
    parentIds = binaryAccessor.createArrayBufferView(
      binaryBody.buffer,
      binaryBody.byteOffset + parentIds.byteOffset,
      parentIdsLength
    );
  }

  var classesLength = classes.length;
  for (i = 0; i < classesLength; ++i) {
    var classInstancesLength = classes[i].length;
    var properties = classes[i].instances;
    var binaryProperties = getBinaryProperties(
      classInstancesLength,
      properties,
      binaryBody
    );
    classes[i].instances = combine(binaryProperties, properties);
  }

  var classCounts = arrayFill(new Array(classesLength), 0);
  var classIndexes = new Uint16Array(instancesLength);
  for (i = 0; i < instancesLength; ++i) {
    classId = classIds[i];
    classIndexes[i] = classCounts[classId];
    ++classCounts[classId];
  }

  hierarchy._classes = classes;
  hierarchy._classIds = classIds;
  hierarchy._classIndexes = classIndexes;
  hierarchy._parentCounts = parentCounts;
  hierarchy._parentIndexes = parentIndexes;
  hierarchy._parentIds = parentIds;
}

function getBinaryProperties(featuresLength, properties, binaryBody) {
  var binaryProperties;
  for (var name in properties) {
    if (properties.hasOwnProperty(name)) {
      var property = properties[name];
      var byteOffset = property.byteOffset;
      if (defined(byteOffset)) {
        // This is a binary property
        var componentType = property.componentType;
        var type = property.type;
        if (!defined(componentType)) {
          throw new RuntimeError("componentType is required.");
        }
        if (!defined(type)) {
          throw new RuntimeError("type is required.");
        }
        if (!defined(binaryBody)) {
          throw new RuntimeError(
            "Property " + name + " requires a batch table binary."
          );
        }

        var binaryAccessor = getBinaryAccessor(property);
        var componentCount = binaryAccessor.componentsPerAttribute;
        var classType = binaryAccessor.classType;
        var typedArray = binaryAccessor.createArrayBufferView(
          binaryBody.buffer,
          binaryBody.byteOffset + byteOffset,
          featuresLength
        );

        if (!defined(binaryProperties)) {
          binaryProperties = {};
        }

        // Store any information needed to access the binary data, including the typed array,
        // componentCount (e.g. a VEC4 would be 4), and the type used to pack and unpack (e.g. Cartesian4).
        binaryProperties[name] = {
          typedArray: typedArray,
          componentCount: componentCount,
          type: classType,
        };
      }
    }
  }
  return binaryProperties;
}

//>>includeStart('debug', pragmas.debug);
var scratchValidateStack = [];
function validateHierarchy(hierarchy) {
  var stack = scratchValidateStack;
  stack.length = 0;

  var classIds = hierarchy._classIds;
  var instancesLength = classIds.length;

  for (var i = 0; i < instancesLength; ++i) {
    validateInstance(hierarchy, i, stack);
  }
}

function validateInstance(hierarchy, instanceIndex, stack) {
  var parentCounts = hierarchy._parentCounts;
  var parentIds = hierarchy._parentIds;
  var parentIndexes = hierarchy._parentIndexes;
  var classIds = hierarchy._classIds;
  var instancesLength = classIds.length;

  if (!defined(parentIds)) {
    // No need to validate if there are no parents
    return;
  }

  if (instanceIndex >= instancesLength) {
    throw new DeveloperError(
      "Parent index " +
        instanceIndex +
        " exceeds the total number of instances: " +
        instancesLength
    );
  }
  if (stack.indexOf(instanceIndex) > -1) {
    throw new DeveloperError(
      "Circular dependency detected in the batch table hierarchy."
    );
  }

  stack.push(instanceIndex);
  var parentCount = defined(parentCounts) ? parentCounts[instanceIndex] : 1;
  var parentIndex = defined(parentCounts)
    ? parentIndexes[instanceIndex]
    : instanceIndex;
  for (var i = 0; i < parentCount; ++i) {
    var parentId = parentIds[parentIndex + i];
    // Stop the traversal when the instance has no parent (its parentId equals itself), else continue the traversal.
    if (parentId !== instanceIndex) {
      validateInstance(hierarchy, parentId, stack);
    }
  }
  stack.pop(instanceIndex);
}
//>>includeEnd('debug');

// The size of this array equals the maximum instance count among all loaded tiles, which has the potential to be large.
var scratchVisited = [];
var scratchStack = [];
var marker = 0;
function traverseHierarchyMultipleParents(
  hierarchy,
  instanceIndex,
  endConditionCallback
) {
  var classIds = hierarchy._classIds;
  var parentCounts = hierarchy._parentCounts;
  var parentIds = hierarchy._parentIds;
  var parentIndexes = hierarchy._parentIndexes;
  var instancesLength = classIds.length;

  // Ignore instances that have already been visited. This occurs in diamond inheritance situations.
  // Use a marker value to indicate that an instance has been visited, which increments with each run.
  // This is more efficient than clearing the visited array every time.
  var visited = scratchVisited;
  visited.length = Math.max(visited.length, instancesLength);
  var visitedMarker = ++marker;

  var stack = scratchStack;
  stack.length = 0;
  stack.push(instanceIndex);

  while (stack.length > 0) {
    instanceIndex = stack.pop();
    if (visited[instanceIndex] === visitedMarker) {
      // This instance has already been visited, stop traversal
      continue;
    }
    visited[instanceIndex] = visitedMarker;
    var result = endConditionCallback(hierarchy, instanceIndex);
    if (defined(result)) {
      // The end condition was met, stop the traversal and return the result
      return result;
    }
    var parentCount = parentCounts[instanceIndex];
    var parentIndex = parentIndexes[instanceIndex];
    for (var i = 0; i < parentCount; ++i) {
      var parentId = parentIds[parentIndex + i];
      // Stop the traversal when the instance has no parent (its parentId equals itself)
      // else add the parent to the stack to continue the traversal.
      if (parentId !== instanceIndex) {
        stack.push(parentId);
      }
    }
  }
}

function traverseHierarchySingleParent(
  hierarchy,
  instanceIndex,
  endConditionCallback
) {
  var hasParent = true;
  while (hasParent) {
    var result = endConditionCallback(hierarchy, instanceIndex);
    if (defined(result)) {
      // The end condition was met, stop the traversal and return the result
      return result;
    }
    var parentId = hierarchy._parentIds[instanceIndex];
    hasParent = parentId !== instanceIndex;
    instanceIndex = parentId;
  }
}

function traverseHierarchy(hierarchy, instanceIndex, endConditionCallback) {
  // Traverse over the hierarchy and process each instance with the endConditionCallback.
  // When the endConditionCallback returns a value, the traversal stops and that value is returned.
  var parentCounts = hierarchy._parentCounts;
  var parentIds = hierarchy._parentIds;
  if (!defined(parentIds)) {
    return endConditionCallback(hierarchy, instanceIndex);
  } else if (defined(parentCounts)) {
    return traverseHierarchyMultipleParents(
      hierarchy,
      instanceIndex,
      endConditionCallback
    );
  }
  return traverseHierarchySingleParent(
    hierarchy,
    instanceIndex,
    endConditionCallback
  );
}

/**
 * Returns whether this property exists.
 *
 * @param {Number} batchId the batch ID of the feature
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 * @private
 */
BatchTableHierarchy.prototype.hasProperty = function (batchId, propertyId) {
  var result = traverseHierarchy(this, batchId, function (
    hierarchy,
    instanceIndex
  ) {
    var classId = hierarchy._classIds[instanceIndex];
    var instances = hierarchy._classes[classId].instances;
    if (defined(instances[propertyId])) {
      return true;
    }
  });
  return defined(result);
};

/**
 * Returns an array of property IDs.
 *
 * @param {Number} batchId the batch ID of the feature
 * @param {Number} index The index of the entity.
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
BatchTableHierarchy.prototype.getPropertyIds = function (batchId, results) {
  results = defined(results) ? results : [];
  results.length = 0;

  traverseHierarchy(this, batchId, function (hierarchy, instanceIndex) {
    var classId = hierarchy._classIds[instanceIndex];
    var instances = hierarchy._classes[classId].instances;
    for (var name in instances) {
      if (instances.hasOwnProperty(name)) {
        if (results.indexOf(name) === -1) {
          results.push(name);
        }
      }
    }
  });

  return results;
};

/**
 * Returns a copy of the value of the property with the given ID.
 *
 * @param {Number} batchId the batch ID of the feature
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 * @private
 */
BatchTableHierarchy.prototype.getProperty = function (batchId, propertyId) {
  return traverseHierarchy(this, batchId, function (hierarchy, instanceIndex) {
    var classId = hierarchy._classIds[instanceIndex];
    var instanceClass = hierarchy._classes[classId];
    var indexInClass = hierarchy._classIndexes[instanceIndex];
    var propertyValues = instanceClass.instances[propertyId];
    if (defined(propertyValues)) {
      if (defined(propertyValues.typedArray)) {
        return getBinaryProperty(propertyValues, indexInClass);
      }
      return clone(propertyValues[indexInClass], true);
    }
  });
};

function getBinaryProperty(binaryProperty, index) {
  var typedArray = binaryProperty.typedArray;
  var componentCount = binaryProperty.componentCount;
  if (componentCount === 1) {
    return typedArray[index];
  }
  return binaryProperty.type.unpack(typedArray, index * componentCount);
}

/**
 * Sets the value of the property with the given ID. Only properties of the
 * instance may be set; parent properties may not be set.
 *
 * @param {Number} batchId The batchId of the feature
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 *
 * @exception {DeveloperError} when setting an inherited property
 * @private
 */
BatchTableHierarchy.prototype.setProperty = function (
  batchId,
  propertyId,
  value
) {
  var result = traverseHierarchy(this, batchId, function (
    hierarchy,
    instanceIndex
  ) {
    var classId = hierarchy._classIds[instanceIndex];
    var instanceClass = hierarchy._classes[classId];
    var indexInClass = hierarchy._classIndexes[instanceIndex];
    var propertyValues = instanceClass.instances[propertyId];
    if (defined(propertyValues)) {
      //>>includeStart('debug', pragmas.debug);
      if (instanceIndex !== batchId) {
        throw new DeveloperError(
          'Inherited property "' + propertyId + '" is read-only.'
        );
      }
      //>>includeEnd('debug');
      if (defined(propertyValues.typedArray)) {
        setBinaryProperty(propertyValues, indexInClass, value);
      } else {
        propertyValues[indexInClass] = clone(value, true);
      }
      return true;
    }
  });
  return defined(result);
};

function setBinaryProperty(binaryProperty, index, value) {
  var typedArray = binaryProperty.typedArray;
  var componentCount = binaryProperty.componentCount;
  if (componentCount === 1) {
    typedArray[index] = value;
  } else {
    binaryProperty.type.pack(value, typedArray, index * componentCount);
  }
}

/**
 * Check if a feature belongs to a class with the given name
 *
 * @param {Number} batchId The batch ID of the feature
 * @param {String} className The name of the class
 * @return {Boolean} <code>true</code> if the feature belongs to the class given by className, or <code>false</code> otherwise
 * @private
 */
BatchTableHierarchy.prototype.isClass = function (batchId, className) {
  // PERFORMANCE_IDEA : cache results in the ancestor classes to speed up this check if this area becomes a hotspot
  // PERFORMANCE_IDEA : treat class names as integers for faster comparisons
  var result = traverseHierarchy(this, batchId, function (
    hierarchy,
    instanceIndex
  ) {
    var classId = hierarchy._classIds[instanceIndex];
    var instanceClass = hierarchy._classes[classId];
    if (instanceClass.name === className) {
      return true;
    }
  });
  return defined(result);
};

/**
 * Get the name of the class a given feature belongs to
 *
 * @param {Number} batchId The batch ID of the feature
 * @return {String} The name of the class this feature belongs to
 */
BatchTableHierarchy.prototype.getClassName = function (batchId) {
  var classId = this._classIds[batchId];
  var instanceClass = this._classes[classId];
  return instanceClass.name;
};
