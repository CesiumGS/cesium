import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import ConstantProperty from "./ConstantProperty.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";
import Property from "./Property.js";

/**
 * A {@link Property} whose value is a key-value mapping of property names to the computed value of other properties.
 *
 * @alias PropertyBag
 * @constructor
 * @implements {DictionaryLike}
 *
 * @param {Object} [value] An object, containing key-value mapping of property names to properties.
 * @param {Function} [createPropertyCallback] A function that will be called when the value of any of the properties in value are not a Property.
 */
function PropertyBag(value, createPropertyCallback) {
  this._propertyNames = [];
  this._definitionChanged = new Event();

  if (defined(value)) {
    this.merge(value, createPropertyCallback);
  }
}

Object.defineProperties(PropertyBag.prototype, {
  /**
   * Gets the names of all properties registered on this instance.
   * @memberof PropertyBag.prototype
   * @type {Array}
   */
  propertyNames: {
    get: function () {
      return this._propertyNames;
    },
  },
  /**
   * Gets a value indicating if this property is constant.  This property
   * is considered constant if all property items in this object are constant.
   * @memberof PropertyBag.prototype
   *
   * @type {Boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      const propertyNames = this._propertyNames;
      for (let i = 0, len = propertyNames.length; i < len; i++) {
        if (!Property.isConstant(this[propertyNames[i]])) {
          return false;
        }
      }
      return true;
    },
  },
  /**
   * Gets the event that is raised whenever the set of properties contained in this
   * object changes, or one of the properties itself changes.
   *
   * @memberof PropertyBag.prototype
   *
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
});

/**
 * Determines if this object has defined a property with the given name.
 *
 * @param {String} propertyName The name of the property to check for.
 *
 * @returns {Boolean} True if this object has defined a property with the given name, false otherwise.
 */
PropertyBag.prototype.hasProperty = function (propertyName) {
  return this._propertyNames.indexOf(propertyName) !== -1;
};

function createConstantProperty(value) {
  return new ConstantProperty(value);
}

/**
 * Adds a property to this object.
 *
 * @param {String} propertyName The name of the property to add.
 * @param {*} [value] The value of the new property, if provided.
 * @param {Function} [createPropertyCallback] A function that will be called when the value of this new property is set to a value that is not a Property.
 *
 * @exception {DeveloperError} "propertyName" is already a registered property.
 */
PropertyBag.prototype.addProperty = function (
  propertyName,
  value,
  createPropertyCallback
) {
  const propertyNames = this._propertyNames;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(propertyName)) {
    throw new DeveloperError("propertyName is required.");
  }
  if (propertyNames.indexOf(propertyName) !== -1) {
    throw new DeveloperError(
      propertyName + " is already a registered property."
    );
  }
  //>>includeEnd('debug');

  propertyNames.push(propertyName);
  Object.defineProperty(
    this,
    propertyName,
    createPropertyDescriptor(
      propertyName,
      true,
      defaultValue(createPropertyCallback, createConstantProperty)
    )
  );

  if (defined(value)) {
    this[propertyName] = value;
  }

  this._definitionChanged.raiseEvent(this);
};

/**
 * Removed a property previously added with addProperty.
 *
 * @param {String} propertyName The name of the property to remove.
 *
 * @exception {DeveloperError} "propertyName" is not a registered property.
 */
PropertyBag.prototype.removeProperty = function (propertyName) {
  const propertyNames = this._propertyNames;
  const index = propertyNames.indexOf(propertyName);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(propertyName)) {
    throw new DeveloperError("propertyName is required.");
  }
  if (index === -1) {
    throw new DeveloperError(propertyName + " is not a registered property.");
  }
  //>>includeEnd('debug');

  this._propertyNames.splice(index, 1);
  delete this[propertyName];

  this._definitionChanged.raiseEvent(this);
};

/**
 * Gets the value of this property.  Each contained property will be evaluated at the given time, and the overall
 * result will be an object, mapping property names to those values.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * Note that any properties in result which are not part of this PropertyBag will be left as-is.
 * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
PropertyBag.prototype.getValue = function (time, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = {};
  }

  const propertyNames = this._propertyNames;
  for (let i = 0, len = propertyNames.length; i < len; i++) {
    const propertyName = propertyNames[i];
    result[propertyName] = Property.getValueOrUndefined(
      this[propertyName],
      time,
      result[propertyName]
    );
  }
  return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {Object} source The object to be merged into this object.
 * @param {Function} [createPropertyCallback] A function that will be called when the value of any of the properties in value are not a Property.
 */
PropertyBag.prototype.merge = function (source, createPropertyCallback) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  const propertyNames = this._propertyNames;
  const sourcePropertyNames = defined(source._propertyNames)
    ? source._propertyNames
    : Object.keys(source);
  for (let i = 0, len = sourcePropertyNames.length; i < len; i++) {
    const name = sourcePropertyNames[i];

    const targetProperty = this[name];
    const sourceProperty = source[name];

    //Custom properties that are registered on the source must also be added to this.
    if (targetProperty === undefined && propertyNames.indexOf(name) === -1) {
      this.addProperty(name, undefined, createPropertyCallback);
    }

    if (sourceProperty !== undefined) {
      if (targetProperty !== undefined) {
        if (defined(targetProperty) && defined(targetProperty.merge)) {
          targetProperty.merge(sourceProperty);
        }
      } else if (
        defined(sourceProperty) &&
        defined(sourceProperty.merge) &&
        defined(sourceProperty.clone)
      ) {
        this[name] = sourceProperty.clone();
      } else {
        this[name] = sourceProperty;
      }
    }
  }
};

function propertiesEqual(a, b) {
  const aPropertyNames = a._propertyNames;
  const bPropertyNames = b._propertyNames;

  const len = aPropertyNames.length;
  if (len !== bPropertyNames.length) {
    return false;
  }

  for (let aIndex = 0; aIndex < len; ++aIndex) {
    const name = aPropertyNames[aIndex];
    const bIndex = bPropertyNames.indexOf(name);
    if (bIndex === -1) {
      return false;
    }
    if (!Property.equals(a[name], b[name])) {
      return false;
    }
  }
  return true;
}

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
PropertyBag.prototype.equals = function (other) {
  return (
    this === other || //
    (other instanceof PropertyBag && //
      propertiesEqual(this, other))
  );
};
export default PropertyBag;
