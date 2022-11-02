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
function BatchTableHierarchy(options) {
  this._classes = undefined;
  this._classIds = undefined;
  this._classIndexes = undefined;
  this._parentCounts = undefined;
  this._parentIndexes = undefined;
  this._parentIds = undefined;

  // Total memory used by the typed arrays
  this._byteLength = 0;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.extension", options.extension);
  //>>includeEnd('debug');

  initialize(this, options.extension, options.binaryBody);

  //>>includeStart('debug', pragmas.debug);
  validateHierarchy(this);
  //>>includeEnd('debug');
}

Object.defineProperties(BatchTableHierarchy.prototype, {
  byteLength: {
    get: function () {
      return this._byteLength;
    },
  },
});

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
  let i;
  let classId;
  let binaryAccessor;

  const instancesLength = hierarchyJson.instancesLength;
  const classes = hierarchyJson.classes;
  let classIds = hierarchyJson.classIds;
  let parentCounts = hierarchyJson.parentCounts;
  let parentIds = hierarchyJson.parentIds;
  let parentIdsLength = instancesLength;
  let byteLength = 0;

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
    byteLength += classIds.byteLength;
  }

  let parentIndexes;
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
      byteLength += parentCounts.byteLength;
    }
    parentIndexes = new Uint16Array(instancesLength);
    parentIdsLength = 0;
    for (i = 0; i < instancesLength; ++i) {
      parentIndexes[i] = parentIdsLength;
      parentIdsLength += parentCounts[i];
    }

    byteLength += parentIndexes.byteLength;
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

    byteLength += parentIds.byteLength;
  }

  const classesLength = classes.length;
  for (i = 0; i < classesLength; ++i) {
    const classInstancesLength = classes[i].length;
    const properties = classes[i].instances;
    const binaryProperties = getBinaryProperties(
      classInstancesLength,
      properties,
      binaryBody
    );
    byteLength += countBinaryPropertyMemory(binaryProperties);
    classes[i].instances = combine(binaryProperties, properties);
  }

  const classCounts = new Array(classesLength).fill(0);
  const classIndexes = new Uint16Array(instancesLength);
  for (i = 0; i < instancesLength; ++i) {
    classId = classIds[i];
    classIndexes[i] = classCounts[classId];
    ++classCounts[classId];
  }
  byteLength += classIndexes.byteLength;

  hierarchy._classes = classes;
  hierarchy._classIds = classIds;
  hierarchy._classIndexes = classIndexes;
  hierarchy._parentCounts = parentCounts;
  hierarchy._parentIndexes = parentIndexes;
  hierarchy._parentIds = parentIds;
  hierarchy._byteLength = byteLength;
}

function getBinaryProperties(featuresLength, properties, binaryBody) {
  let binaryProperties;
  for (const name in properties) {
    if (properties.hasOwnProperty(name)) {
      const property = properties[name];
      const byteOffset = property.byteOffset;
      if (defined(byteOffset)) {
        // This is a binary property
        const componentType = property.componentType;
        const type = property.type;
        if (!defined(componentType)) {
          throw new RuntimeError("componentType is required.");
        }
        if (!defined(type)) {
          throw new RuntimeError("type is required.");
        }
        if (!defined(binaryBody)) {
          throw new RuntimeError(
            `Property ${name} requires a batch table binary.`
          );
        }

        const binaryAccessor = getBinaryAccessor(property);
        const componentCount = binaryAccessor.componentsPerAttribute;
        const classType = binaryAccessor.classType;
        const typedArray = binaryAccessor.createArrayBufferView(
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

function countBinaryPropertyMemory(binaryProperties) {
  let byteLength = 0;
  for (const name in binaryProperties) {
    if (binaryProperties.hasOwnProperty(name)) {
      byteLength += binaryProperties[name].typedArray.byteLength;
    }
  }
  return byteLength;
}

//>>includeStart('debug', pragmas.debug);
const scratchValidateStack = [];
function validateHierarchy(hierarchy) {
  const stack = scratchValidateStack;
  stack.length = 0;

  const classIds = hierarchy._classIds;
  const instancesLength = classIds.length;

  for (let i = 0; i < instancesLength; ++i) {
    validateInstance(hierarchy, i, stack);
  }
}

function validateInstance(hierarchy, instanceIndex, stack) {
  const parentCounts = hierarchy._parentCounts;
  const parentIds = hierarchy._parentIds;
  const parentIndexes = hierarchy._parentIndexes;
  const classIds = hierarchy._classIds;
  const instancesLength = classIds.length;

  if (!defined(parentIds)) {
    // No need to validate if there are no parents
    return;
  }

  if (instanceIndex >= instancesLength) {
    throw new DeveloperError(
      `Parent index ${instanceIndex} exceeds the total number of instances: ${instancesLength}`
    );
  }
  if (stack.indexOf(instanceIndex) > -1) {
    throw new DeveloperError(
      "Circular dependency detected in the batch table hierarchy."
    );
  }

  stack.push(instanceIndex);
  const parentCount = defined(parentCounts) ? parentCounts[instanceIndex] : 1;
  const parentIndex = defined(parentCounts)
    ? parentIndexes[instanceIndex]
    : instanceIndex;
  for (let i = 0; i < parentCount; ++i) {
    const parentId = parentIds[parentIndex + i];
    // Stop the traversal when the instance has no parent (its parentId equals itself), else continue the traversal.
    if (parentId !== instanceIndex) {
      validateInstance(hierarchy, parentId, stack);
    }
  }
  stack.pop(instanceIndex);
}
//>>includeEnd('debug');

// The size of this array equals the maximum instance count among all loaded tiles, which has the potential to be large.
const scratchVisited = [];
const scratchStack = [];
let marker = 0;
function traverseHierarchyMultipleParents(
  hierarchy,
  instanceIndex,
  endConditionCallback
) {
  const classIds = hierarchy._classIds;
  const parentCounts = hierarchy._parentCounts;
  const parentIds = hierarchy._parentIds;
  const parentIndexes = hierarchy._parentIndexes;
  const instancesLength = classIds.length;

  // Ignore instances that have already been visited. This occurs in diamond inheritance situations.
  // Use a marker value to indicate that an instance has been visited, which increments with each run.
  // This is more efficient than clearing the visited array every time.
  const visited = scratchVisited;
  visited.length = Math.max(visited.length, instancesLength);
  const visitedMarker = ++marker;

  const stack = scratchStack;
  stack.length = 0;
  stack.push(instanceIndex);

  while (stack.length > 0) {
    instanceIndex = stack.pop();
    if (visited[instanceIndex] === visitedMarker) {
      // This instance has already been visited, stop traversal
      continue;
    }
    visited[instanceIndex] = visitedMarker;
    const result = endConditionCallback(hierarchy, instanceIndex);
    if (defined(result)) {
      // The end condition was met, stop the traversal and return the result
      return result;
    }
    const parentCount = parentCounts[instanceIndex];
    const parentIndex = parentIndexes[instanceIndex];
    for (let i = 0; i < parentCount; ++i) {
      const parentId = parentIds[parentIndex + i];
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
  let hasParent = true;
  while (hasParent) {
    const result = endConditionCallback(hierarchy, instanceIndex);
    if (defined(result)) {
      // The end condition was met, stop the traversal and return the result
      return result;
    }
    const parentId = hierarchy._parentIds[instanceIndex];
    hasParent = parentId !== instanceIndex;
    instanceIndex = parentId;
  }
}

function traverseHierarchy(hierarchy, instanceIndex, endConditionCallback) {
  // Traverse over the hierarchy and process each instance with the endConditionCallback.
  // When the endConditionCallback returns a value, the traversal stops and that value is returned.
  const parentCounts = hierarchy._parentCounts;
  const parentIds = hierarchy._parentIds;
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
 * Returns whether the feature has this property.
 *
 * @param {Number} batchId the batch ID of the feature
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the feature has this property.
 * @private
 */
BatchTableHierarchy.prototype.hasProperty = function (batchId, propertyId) {
  const result = traverseHierarchy(this, batchId, function (
    hierarchy,
    instanceIndex
  ) {
    const classId = hierarchy._classIds[instanceIndex];
    const instances = hierarchy._classes[classId].instances;
    if (defined(instances[propertyId])) {
      return true;
    }
  });
  return defined(result);
};

/**
 * Returns whether any feature has this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether any feature has this property.
 * @private
 */
BatchTableHierarchy.prototype.propertyExists = function (propertyId) {
  const classes = this._classes;
  const classesLength = classes.length;
  for (let i = 0; i < classesLength; ++i) {
    const instances = classes[i].instances;
    if (defined(instances[propertyId])) {
      return true;
    }
  }
  return false;
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
    const classId = hierarchy._classIds[instanceIndex];
    const instances = hierarchy._classes[classId].instances;
    for (const name in instances) {
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
 * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
 * @private
 */
BatchTableHierarchy.prototype.getProperty = function (batchId, propertyId) {
  return traverseHierarchy(this, batchId, function (hierarchy, instanceIndex) {
    const classId = hierarchy._classIds[instanceIndex];
    const instanceClass = hierarchy._classes[classId];
    const indexInClass = hierarchy._classIndexes[instanceIndex];
    const propertyValues = instanceClass.instances[propertyId];
    if (defined(propertyValues)) {
      if (defined(propertyValues.typedArray)) {
        return getBinaryProperty(propertyValues, indexInClass);
      }
      return clone(propertyValues[indexInClass], true);
    }
  });
};

function getBinaryProperty(binaryProperty, index) {
  const typedArray = binaryProperty.typedArray;
  const componentCount = binaryProperty.componentCount;
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
  const result = traverseHierarchy(this, batchId, function (
    hierarchy,
    instanceIndex
  ) {
    const classId = hierarchy._classIds[instanceIndex];
    const instanceClass = hierarchy._classes[classId];
    const indexInClass = hierarchy._classIndexes[instanceIndex];
    const propertyValues = instanceClass.instances[propertyId];
    if (defined(propertyValues)) {
      //>>includeStart('debug', pragmas.debug);
      if (instanceIndex !== batchId) {
        throw new DeveloperError(
          `Inherited property "${propertyId}" is read-only.`
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
  const typedArray = binaryProperty.typedArray;
  const componentCount = binaryProperty.componentCount;
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
  const result = traverseHierarchy(this, batchId, function (
    hierarchy,
    instanceIndex
  ) {
    const classId = hierarchy._classIds[instanceIndex];
    const instanceClass = hierarchy._classes[classId];
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
  const classId = this._classIds[batchId];
  const instanceClass = this._classes[classId];
  return instanceClass.name;
};

export default BatchTableHierarchy;
