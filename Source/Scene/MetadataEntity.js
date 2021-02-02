import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import MetadataType from "./MetadataType.js";

/**
 * An entity containing metadata.
 * <p>
 * This type describes an interface and is not intended to be instantiated directly.
 * </p>
 *
 * @alias MetadataEntity
 * @constructor
 *
 * @private
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

  /**
   * A dictionary containing properties.
   *
   * @memberof MetadataEntity.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  properties: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },
});

/**
 * Returns whether this property exists.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 */
MetadataEntity.prototype.hasProperty = function (propertyId) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns an array of property IDs.
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
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
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
MetadataEntity.prototype.getProperty = function (propertyId) {
  DeveloperError.throwInstantiationError();
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 * <p>
 * If a property with the given ID doesn't exist, it is created.
 * </p>
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataEntity.prototype.setProperty = function (propertyId, value) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
MetadataEntity.prototype.getPropertyBySemantic = function (semantic) {
  DeveloperError.throwInstantiationError();
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataEntity.prototype.setPropertyBySemantic = function (semantic, value) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns whether this property exists.
 *
 * @param {MetadataEntity} entity The entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 *
 * @private
 */
MetadataEntity.hasProperty = function (entity, propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("entity", entity);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  if (defined(entity.properties[propertyId])) {
    return true;
  }

  return defined(getDefault(entity.class, propertyId));
};

/**
 * Returns an array of property IDs.
 *
 * @param {MetadataEntity} entity The entity.
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The property IDs.
 *
 * @private
 */
MetadataEntity.getPropertyIds = function (entity, results) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("entity", entity);
  //>>includeEnd('debug');

  results = defined(results) ? results : [];
  results.length = 0;

  // Add entity properties
  var properties = entity.properties;
  for (var propertyId in properties) {
    if (
      properties.hasOwnProperty(propertyId) &&
      defined(properties[propertyId])
    ) {
      results.push(propertyId);
    }
  }

  // Add default properties
  if (defined(entity.class)) {
    var classProperties = entity.class.properties;
    for (var classPropertyId in classProperties) {
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
 * @param {MetadataEntity} entity The entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 *
 * @private
 */
MetadataEntity.getProperty = function (entity, propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("entity", entity);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  var value = entity.properties[propertyId];

  if (!defined(value)) {
    value = getDefault(entity.class, propertyId);
  }

  if (!defined(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    value = value.slice(); // clone
  }

  return MetadataEntity.normalize(entity.class, propertyId, value);
};

/**
 * Sets the value of the property with the given ID.
 * <p>
 * If the property is normalized a normalized value must be provided to this function.
 * </p>
 * <p>
 * If a property with the given ID doesn't exist, it is created.
 * </p>
 *
 * @param {MetadataEntity} entity The entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 *
 * @private
 */
MetadataEntity.setProperty = function (entity, propertyId, value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("entity", entity);
  Check.typeOf.string("propertyId", propertyId);
  Check.defined("value", value);
  //>>includeEnd('debug');

  if (Array.isArray(value)) {
    value = value.slice(); // clone
  }

  value = MetadataEntity.unnormalize(entity.class, propertyId, value);

  entity.properties[propertyId] = value;
};

/**
 * Returns a copy of the value of the property with the given semantic.
 *
 * @param {MetadataEntity} entity The entity.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 *
 * @private
 */
MetadataEntity.getPropertyBySemantic = function (entity, semantic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("entity", entity);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(entity.class)) {
    var property = entity.class.propertiesBySemantic[semantic];
    if (defined(property)) {
      return MetadataEntity.getProperty(entity, property.id);
    }
  }
  return undefined;
};

/**
 * Sets the value of the property with the given semantic.
 *
 * @param {MetadataEntity} entity The entity.
 * @param {String} semantic The case-sensitive semantic of the property.
 * @param {*} value The value of the property that will be copied.
 *
 * @private
 */
MetadataEntity.setPropertyBySemantic = function (entity, semantic, value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("entity", entity);
  Check.typeOf.string("semantic", semantic);
  //>>includeEnd('debug');

  if (defined(entity.class)) {
    var property = entity.class.propertiesBySemantic[semantic];
    if (defined(property)) {
      MetadataEntity.setProperty(entity, property.id, value);
    }
  }
};

/**
 * Normalizes integer property values. If the property is not normalized
 * the value is returned unmodified.
 *
 * @param {MetadataClass} classDefinition The class.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The integer value.
 * @returns {*} The normalized value.
 *
 * @private
 */
MetadataEntity.normalize = function (classDefinition, propertyId, value) {
  return normalize(classDefinition, propertyId, value, MetadataType.normalize);
};

/**
 * Unnormalizes integer property values. If the property is not normalized
 * the value is returned unmodified.
 *
 * @param {MetadataClass} classDefinition The class.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @param {*} value The normalized value.
 * @returns {*} The integer value.
 *
 * @private
 */
MetadataEntity.unnormalize = function (classDefinition, propertyId, value) {
  return normalize(
    classDefinition,
    propertyId,
    value,
    MetadataType.unnormalize
  );
};

function getDefault(classDefinition, propertyId) {
  if (defined(classDefinition)) {
    var classProperty = classDefinition.properties[propertyId];
    if (defined(classProperty)) {
      return classProperty.default;
    }
  }
}

function normalize(classDefinition, propertyId, value, normalizeFunction) {
  var type;
  var valueType;

  var normalized = false;
  if (defined(classDefinition)) {
    var classProperty = classDefinition.properties[propertyId];
    if (defined(classProperty)) {
      type = classProperty.type;
      valueType = classProperty.valueType;
      normalized = classProperty.normalized;
    }
  }

  if (normalized) {
    if (type === MetadataType.ARRAY) {
      var length = value.length;
      for (var i = 0; i < length; ++i) {
        value[i] = normalizeFunction(value[i], valueType);
      }
    } else {
      value = normalizeFunction(value, valueType);
    }
  }
  return value;
}

export default MetadataEntity;
