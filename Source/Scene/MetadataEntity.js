import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

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

  if (defined(entity.class)) {
    var classProperty = entity.class.properties[propertyId];
    if (defined(classProperty) && defined(classProperty.default)) {
      return true;
    }
  }

  return false;
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

  var classProperty;
  if (defined(entity.class)) {
    classProperty = entity.class.properties[propertyId];
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

  if (defined(classProperty)) {
    value = classProperty.normalize(value);
  }

  return value;
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

  if (defined(entity.class)) {
    var classProperty = entity.class.properties[propertyId];
    if (defined(classProperty)) {
      value = classProperty.unnormalize(value);
    }
  }

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

export default MetadataEntity;
