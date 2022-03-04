import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * An entity containing metadata.
 * <p>
 * This type describes an interface and is not intended to be instantiated directly.
 * </p>
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @alias MetadataEntity
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataEntity() {}

Object.defineProperties(MetadataEntity.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof MetadataEntity.prototype
   * @type {MetadataClass}
   * @readonly
   * @private
   */
  class: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },
});

/**
 * Returns whether the entity has this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether the entity has this property.
 * @private
 */
MetadataEntity.prototype.hasProperty = function (propertyId) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns whether the entity has a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {Boolean} Whether the entity has a property with the given semantic.
 * @private
 */
MetadataEntity.prototype.hasPropertyBySemantic = function (semantic) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 * @private
 */
MetadataEntity.prototype.getPropertyIds = function (results) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this property.
 * @private
 */
MetadataEntity.prototype.getProperty = function (propertyId) {
  DeveloperError.throwInstantiationError();
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
MetadataEntity.prototype.setProperty = function (propertyId, value) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this property.
 * @private
 */
MetadataEntity.prototype.getPropertyBySemantic = function (semantic) {
  DeveloperError.throwInstantiationError();
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
MetadataEntity.prototype.setPropertyBySemantic = function (semantic, value) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns whether the entity has this property.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {Object} properties The dictionary containing properties.
 * @param {MetadataClass} classDefinition The class.
 * @returns {Boolean} Whether the entity has this property.
 *
 * @private
 */
MetadataEntity.hasProperty = function (
  propertyId,
  properties,
  classDefinition
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  Check.typeOf.object("properties", properties);
  Check.typeOf.object("classDefinition", classDefinition);
  //>>includeEnd('debug');

  if (defined(properties[propertyId])) {
    return true;
  }

  const classProperties = classDefinition.properties;
  if (!defined(classProperties)) {
    return false;
  }

  const classProperty = classProperties[propertyId];
  if (defined(classProperty) && defined(classProperty.default)) {
    return true;
  }

  return false;
};

/**
 * Returns whether the entity has a property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {Object} properties The dictionary containing properties.
 * @param {MetadataClass} classDefinition The class.
 * @returns {Boolean} Whether the entity has a property with the given semantic.
 *
 * @private
 */
MetadataEntity.hasPropertyBySemantic = function (
  semantic,
  properties,
  classDefinition
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  Check.typeOf.object("properties", properties);
  Check.typeOf.object("classDefinition", classDefinition);
  //>>includeEnd('debug');

  const propertiesBySemantic = classDefinition.propertiesBySemantic;
  if (!defined(propertiesBySemantic)) {
    return false;
  }

  const property = propertiesBySemantic[semantic];
  return defined(property);
};

/**
 * Returns an array of property IDs.
 *
 * @param {Object} properties The dictionary containing properties.
 * @param {MetadataClass} classDefinition The class.
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 *
 * @private
 */
MetadataEntity.getPropertyIds = function (
  properties,
  classDefinition,
  results
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("properties", properties);
  Check.typeOf.object("classDefinition", classDefinition);
  //>>includeEnd('debug');

  results = defined(results) ? results : [];
  results.length = 0;

  // Add entity properties
  for (const propertyId in properties) {
    if (
      properties.hasOwnProperty(propertyId) &&
      defined(properties[propertyId])
    ) {
      results.push(propertyId);
    }
  }

  // Add default properties
  const classProperties = classDefinition.properties;
  if (defined(classProperties)) {
    for (const classPropertyId in classProperties) {
      if (
        classProperties.hasOwnProperty(classPropertyId) &&
        !defined(properties[classPropertyId]) &&
        defined(classProperties[classPropertyId].default)
      ) {
        results.push(classPropertyId);
      }
    }
  }

  return results;
};

/**
 * Returns a copy of the value of the property with the given ID.
 * <p>
 * If the property is normalized the normalized value is returned.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {Object} properties The dictionary containing properties.
 * @param {MetadataClass} classDefinition The class.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this property.
 *
 * @private
 */
MetadataEntity.getProperty = function (
  propertyId,
  properties,
  classDefinition
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  Check.typeOf.object("properties", properties);
  Check.typeOf.object("classDefinition", classDefinition);
  //>>includeEnd('debug');

  let value = properties[propertyId];

  let classProperty;
  const classProperties = classDefinition.properties;
  if (defined(classProperties)) {
    classProperty = classProperties[propertyId];
  }

  if (!defined(value) && defined(classProperty)) {
    value = classProperty.default;
  }

  if (!defined(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    value = value.slice(); // clone
  }

  // Arrays of vectors are represented as nested arrays in JSON
  const enableNestedArrays = true;
  if (defined(classProperty)) {
    value = classProperty.normalize(value);
    value = classProperty.unpackVectorAndMatrixTypes(value, enableNestedArrays);
  }

  return value;
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 * @param {Object} properties The dictionary containing properties.
 * @param {MetadataClass} classDefinition The class.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 *
 * @private
 */
MetadataEntity.setProperty = function (
  propertyId,
  value,
  properties,
  classDefinition
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  Check.defined("value", value);
  Check.typeOf.object("properties", properties);
  Check.typeOf.object("classDefinition", classDefinition);
  //>>includeEnd('debug');

  if (!defined(properties[propertyId])) {
    return false;
  }

  if (Array.isArray(value)) {
    value = value.slice(); // clone
  }

  let classProperty;
  const classProperties = classDefinition.properties;
  if (defined(classProperties)) {
    classProperty = classProperties[propertyId];
  }

  // arrays of vectors are represented as nested arrays in JSON
  const enableNestedArrays = true;
  if (defined(classProperty)) {
    value = classProperty.packVectorAndMatrixTypes(value, enableNestedArrays);
    value = classProperty.unnormalize(value);
  }

  properties[propertyId] = value;
  return true;
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {Object} properties The dictionary containing properties.
 * @param {MetadataClass} classDefinition The class.
 * @returns {*} The value of the property or <code>undefined</code> if the entity does not have this property.
 *
 * @private
 */
MetadataEntity.getPropertyBySemantic = function (
  semantic,
  properties,
  classDefinition
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  Check.typeOf.object("properties", properties);
  Check.typeOf.object("classDefinition", classDefinition);
  //>>includeEnd('debug');

  const propertiesBySemantic = classDefinition.propertiesBySemantic;
  if (!defined(propertiesBySemantic)) {
    return undefined;
  }

  const property = propertiesBySemantic[semantic];
  if (defined(property)) {
    return MetadataEntity.getProperty(property.id, properties, classDefinition);
  }
  return undefined;
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 * @param {Object} properties The dictionary containing properties.
 * @param {MetadataClass} classDefinition The class.
 * @returns {Boolean} <code>true</code> if the property was set, <code>false</code> otherwise.
 * @private
 */
MetadataEntity.setPropertyBySemantic = function (
  semantic,
  value,
  properties,
  classDefinition
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("semantic", semantic);
  Check.defined("value", value);
  Check.typeOf.object("properties", properties);
  Check.typeOf.object("classDefinition", classDefinition);
  //>>includeEnd('debug');

  const propertiesBySemantic = classDefinition.propertiesBySemantic;
  if (!defined(propertiesBySemantic)) {
    return false;
  }

  const property = classDefinition.propertiesBySemantic[semantic];
  if (defined(property)) {
    return MetadataEntity.setProperty(
      property.id,
      value,
      properties,
      classDefinition
    );
  }

  return false;
};

export default MetadataEntity;
