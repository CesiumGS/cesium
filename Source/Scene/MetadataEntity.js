import clone from "../Core/clone";
import defined from "../Core/defined";

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
 * @param {MetadataEntity} entity The entity.
 * @param {String} id The case-sensitive ID of the property.
 * @returns {Boolean} Whether this property exists.
 */
MetadataEntity.hasProperty = function (entity, id) {
  if (defined(entity.properties) && defined(entity.properties[id])) {
    return true;
  }

  if (
    defined(entity.class) &&
    defined(entity.class.properties) &&
    defined(entity.class.properties[id]) &&
    defined(entity.class.properties[id].default)
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
    classProperties = defaultValue(classProperties, defaultValue.EMPTY_OBJECT);
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
 * @param {String} id The case-sensitive ID of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
 */
MetadataEntity.getProperty = function (entity, id) {
  if (defined(entity.properties) && defined(entity.properties[id])) {
    return clone(entity.properties[id], true);
  }

  if (
    defined(entity.class) &&
    defined(entity.class.properties) &&
    defined(entity.class.properties[id]) &&
    defined(entity.class.properties[id].default)
  ) {
    return clone(entity.class.properties[id].default, true);
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
 * @param {String} id The case-sensitive ID of the property.
 * @param {*} value The value of the property that will be copied.
 */
MetadataEntity.setProperty = function (entity, id, value) {
  if (!defined(entity.properties)) {
    entity.properties = {};
  }

  entity.properties[id] = clone(value, true);
};
