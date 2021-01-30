import clone from "../Core/clone";
import defined from "../Core/defined";
import DeveloperError from "../Core/DeveloperError";

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
   * The class that properties conforms to.
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
  if (defined(entity.properties) && defined(entity.properties[propertyId])) {
    return true;
  }

  if (
    defined(entity.class) &&
    defined(entity.class.properties[propertyId]) &&
    defined(entity.class.properties[propertyId].default)
  ) {
    return true;
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
  results = defined(results) ? results : [];
  results.length = 0;

  // Add entity properties
  var properties = defaultValue(entity.properties, defaultValue.EMPTY_OBJECT);
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
 *
 * @param {MetadataEntity} entity The entity.
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 *
 * @private
 */
MetadataEntity.getProperty = function (entity, propertyId) {
  if (defined(entity.properties) && defined(entity.properties[propertyId])) {
    return clone(entity.properties[propertyId], true);
  }

  if (
    defined(entity.class) &&
    defined(entity.class.properties[propertyId]) &&
    defined(entity.class.properties[propertyId].default)
  ) {
    return clone(entity.class.properties[propertyId].default, true);
  }

  return undefined;
};

/**
 * Sets the value of the property with the given ID.
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
  if (!defined(entity.properties)) {
    entity.properties = {};
  }

  entity.properties[propertyId] = clone(value, true);
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
  if (defined(entity.class)) {
    var property = entity.class.propertiesBySemantic[semantic];
    if (defined(property)) {
      MetadataEntity.setProperty(entity, property.id, value);
    }
  }
};
