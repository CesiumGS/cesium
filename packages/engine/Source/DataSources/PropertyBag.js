import { DeveloperError, Event, JulianDate, defined } from "@cesium/core";
import ConstantProperty from "./ConstantProperty.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";
import Property from "./Property.js";

/**
 * A {@link Property} whose value is a key-value mapping of property names to the computed value of other properties.
 *
 * @implements Record<string, any>
 */
class PropertyBag {
  /**
   * @param {object} [value] An object, containing key-value mapping of property names to properties.
   * @param {Function} [createPropertyCallback] A function that will be called when the value of any of the properties in value are not a Property.
   */
  constructor(value, createPropertyCallback) {
    this._propertyNames = [];
    this._definitionChanged = new Event();

    if (defined(value)) {
      this.merge(value, createPropertyCallback);
    }
  }

  /**
   * Gets the names of all properties registered on this instance.
   * @type {Array}
   */
  get propertyNames() {
    return this._propertyNames;
  }

  /**
   * Gets a value indicating if this property is constant.  This property
   * is considered constant if all property items in this object are constant.
   *
   * @type {boolean}
   * @readonly
   */
  get isConstant() {
    const propertyNames = this._propertyNames;
    for (let i = 0, len = propertyNames.length; i < len; i++) {
      if (!Property.isConstant(this[propertyNames[i]])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Gets the event that is raised whenever the set of properties contained in this
   * object changes, or one of the properties itself changes.
   *
   * @type {Event}
   * @readonly
   */
  get definitionChanged() {
    return this._definitionChanged;
  }

  /**
   * Determines if this object has defined a property with the given name.
   *
   * @param {string} propertyName The name of the property to check for.
   *
   * @returns {boolean} True if this object has defined a property with the given name, false otherwise.
   */
  hasProperty(propertyName) {
    return this._propertyNames.indexOf(propertyName) !== -1;
  }

  /**
   * Adds a property to this object.
   *
   * @param {string} propertyName The name of the property to add.
   * @param {*} [value] The value of the new property, if provided.
   * @param {Function} [createPropertyCallback] A function that will be called when the value of this new property is set to a value that is not a Property.
   *
   * @exception {DeveloperError} "propertyName" is already a registered property.
   */
  addProperty(propertyName, value, createPropertyCallback) {
    const propertyNames = this._propertyNames;

    //>>includeStart('debug', pragmas.debug);
    if (!defined(propertyName)) {
      throw new DeveloperError("propertyName is required.");
    }
    if (propertyNames.indexOf(propertyName) !== -1) {
      throw new DeveloperError(
        `${propertyName} is already a registered property.`,
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
        createPropertyCallback ?? createConstantProperty,
      ),
    );

    if (defined(value)) {
      this[propertyName] = value;
    }

    this._definitionChanged.raiseEvent(this);
  }

  /**
   * Removed a property previously added with addProperty.
   *
   * @param {string} propertyName The name of the property to remove.
   *
   * @exception {DeveloperError} "propertyName" is not a registered property.
   */
  removeProperty(propertyName) {
    const propertyNames = this._propertyNames;
    const index = propertyNames.indexOf(propertyName);

    //>>includeStart('debug', pragmas.debug);
    if (!defined(propertyName)) {
      throw new DeveloperError("propertyName is required.");
    }
    if (index === -1) {
      throw new DeveloperError(`${propertyName} is not a registered property.`);
    }
    //>>includeEnd('debug');

    this._propertyNames.splice(index, 1);
    delete this[propertyName];

    this._definitionChanged.raiseEvent(this);
  }

  /**
   * Gets the value of this property.  Each contained property will be evaluated at the given time, and the overall
   * result will be an object, mapping property names to those values.
   *
   * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
   * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
   * Note that any properties in result which are not part of this PropertyBag will be left as-is.
   * @returns {object} The modified result parameter or a new instance if the result parameter was not supplied.
   */
  getValue(time, result) {
    if (!defined(time)) {
      time = JulianDate.now(timeScratch);
    }

    if (!defined(result)) {
      result = {};
    }

    const propertyNames = this._propertyNames;
    for (let i = 0, len = propertyNames.length; i < len; i++) {
      const propertyName = propertyNames[i];
      result[propertyName] = Property.getValueOrUndefined(
        this[propertyName],
        time,
        result[propertyName],
      );
    }
    return result;
  }

  /**
   * Assigns each unassigned property on this object to the value
   * of the same property on the provided source object.
   *
   * @param {object} source The object to be merged into this object.
   * @param {Function} [createPropertyCallback] A function that will be called when the value of any of the properties in value are not a Property.
   */
  merge(source, createPropertyCallback) {
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
  }

  /**
   * Compares this property to the provided property and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Property} [other] The other property.
   * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  equals(other) {
    return (
      this === other || //
      (other instanceof PropertyBag && //
        propertiesEqual(this, other))
    );
  }
}

function createConstantProperty(value) {
  return new ConstantProperty(value);
}

const timeScratch = new JulianDate();

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

export default PropertyBag;
