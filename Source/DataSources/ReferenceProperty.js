import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Property from "./Property.js";

function resolve(that) {
  let targetProperty = that._targetProperty;

  if (!defined(targetProperty)) {
    let targetEntity = that._targetEntity;

    if (!defined(targetEntity)) {
      targetEntity = that._targetCollection.getById(that._targetId);

      if (!defined(targetEntity)) {
        // target entity not found
        that._targetEntity = that._targetProperty = undefined;
        return;
      }

      // target entity was found. listen for changes to entity definition
      targetEntity.definitionChanged.addEventListener(
        ReferenceProperty.prototype._onTargetEntityDefinitionChanged,
        that
      );
      that._targetEntity = targetEntity;
    }

    // walk the list of property names and resolve properties
    const targetPropertyNames = that._targetPropertyNames;
    targetProperty = that._targetEntity;
    for (
      let i = 0, len = targetPropertyNames.length;
      i < len && defined(targetProperty);
      ++i
    ) {
      targetProperty = targetProperty[targetPropertyNames[i]];
    }

    // target property may or may not be defined, depending on if it was found
    that._targetProperty = targetProperty;
  }

  return targetProperty;
}

/**
 * A {@link Property} which transparently links to another property on a provided object.
 *
 * @alias ReferenceProperty
 * @constructor
 *
 * @param {EntityCollection} targetCollection The entity collection which will be used to resolve the reference.
 * @param {String} targetId The id of the entity which is being referenced.
 * @param {String[]} targetPropertyNames The names of the property on the target entity which we will use.
 *
 * @example
 * var collection = new Cesium.EntityCollection();
 *
 * //Create a new entity and assign a billboard scale.
 * var object1 = new Cesium.Entity({id:'object1'});
 * object1.billboard = new Cesium.BillboardGraphics();
 * object1.billboard.scale = new Cesium.ConstantProperty(2.0);
 * collection.add(object1);
 *
 * //Create a second entity and reference the scale from the first one.
 * var object2 = new Cesium.Entity({id:'object2'});
 * object2.model = new Cesium.ModelGraphics();
 * object2.model.scale = new Cesium.ReferenceProperty(collection, 'object1', ['billboard', 'scale']);
 * collection.add(object2);
 *
 * //Create a third object, but use the fromString helper function.
 * var object3 = new Cesium.Entity({id:'object3'});
 * object3.billboard = new Cesium.BillboardGraphics();
 * object3.billboard.scale = Cesium.ReferenceProperty.fromString(collection, 'object1#billboard.scale');
 * collection.add(object3);
 *
 * //You can refer to an entity with a # or . in id and property names by escaping them.
 * var object4 = new Cesium.Entity({id:'#object.4'});
 * object4.billboard = new Cesium.BillboardGraphics();
 * object4.billboard.scale = new Cesium.ConstantProperty(2.0);
 * collection.add(object4);
 *
 * var object5 = new Cesium.Entity({id:'object5'});
 * object5.billboard = new Cesium.BillboardGraphics();
 * object5.billboard.scale = Cesium.ReferenceProperty.fromString(collection, '\\#object\\.4#billboard.scale');
 * collection.add(object5);
 */
function ReferenceProperty(targetCollection, targetId, targetPropertyNames) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(targetCollection)) {
    throw new DeveloperError("targetCollection is required.");
  }
  if (!defined(targetId) || targetId === "") {
    throw new DeveloperError("targetId is required.");
  }
  if (!defined(targetPropertyNames) || targetPropertyNames.length === 0) {
    throw new DeveloperError("targetPropertyNames is required.");
  }
  for (let i = 0; i < targetPropertyNames.length; i++) {
    const item = targetPropertyNames[i];
    if (!defined(item) || item === "") {
      throw new DeveloperError("reference contains invalid properties.");
    }
  }
  //>>includeEnd('debug');

  this._targetCollection = targetCollection;
  this._targetId = targetId;
  this._targetPropertyNames = targetPropertyNames;
  this._targetProperty = undefined;
  this._targetEntity = undefined;
  this._definitionChanged = new Event();

  targetCollection.collectionChanged.addEventListener(
    ReferenceProperty.prototype._onCollectionChanged,
    this
  );
}

Object.defineProperties(ReferenceProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.
   * @memberof ReferenceProperty.prototype
   * @type {Boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return Property.isConstant(resolve(this));
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is changed whenever the referenced property's definition is changed.
   * @memberof ReferenceProperty.prototype
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
  /**
   * Gets the reference frame that the position is defined in.
   * This property is only valid if the referenced property is a {@link PositionProperty}.
   * @memberof ReferenceProperty.prototype
   * @type {ReferenceFrame}
   * @readonly
   */
  referenceFrame: {
    get: function () {
      const target = resolve(this);
      return defined(target) ? target.referenceFrame : undefined;
    },
  },
  /**
   * Gets the id of the entity being referenced.
   * @memberof ReferenceProperty.prototype
   * @type {String}
   * @readonly
   */
  targetId: {
    get: function () {
      return this._targetId;
    },
  },
  /**
   * Gets the collection containing the entity being referenced.
   * @memberof ReferenceProperty.prototype
   * @type {EntityCollection}
   * @readonly
   */
  targetCollection: {
    get: function () {
      return this._targetCollection;
    },
  },
  /**
   * Gets the array of property names used to retrieve the referenced property.
   * @memberof ReferenceProperty.prototype
   * @type {String[]}
   * @readonly
   */
  targetPropertyNames: {
    get: function () {
      return this._targetPropertyNames;
    },
  },
  /**
   * Gets the resolved instance of the underlying referenced property.
   * @memberof ReferenceProperty.prototype
   * @type {Property|undefined}
   * @readonly
   */
  resolvedProperty: {
    get: function () {
      return resolve(this);
    },
  },
});

/**
 * Creates a new instance given the entity collection that will
 * be used to resolve it and a string indicating the target entity id and property.
 * The format of the string is "objectId#foo.bar", where # separates the id from
 * property path and . separates sub-properties.  If the reference identifier or
 * or any sub-properties contains a # . or \ they must be escaped.
 *
 * @param {EntityCollection} targetCollection
 * @param {String} referenceString
 * @returns {ReferenceProperty} A new instance of ReferenceProperty.
 *
 * @exception {DeveloperError} invalid referenceString.
 */
ReferenceProperty.fromString = function (targetCollection, referenceString) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(targetCollection)) {
    throw new DeveloperError("targetCollection is required.");
  }
  if (!defined(referenceString)) {
    throw new DeveloperError("referenceString is required.");
  }
  //>>includeEnd('debug');

  let identifier;
  const values = [];

  let inIdentifier = true;
  let isEscaped = false;
  let token = "";
  for (let i = 0; i < referenceString.length; ++i) {
    const c = referenceString.charAt(i);

    if (isEscaped) {
      token += c;
      isEscaped = false;
    } else if (c === "\\") {
      isEscaped = true;
    } else if (inIdentifier && c === "#") {
      identifier = token;
      inIdentifier = false;
      token = "";
    } else if (!inIdentifier && c === ".") {
      values.push(token);
      token = "";
    } else {
      token += c;
    }
  }
  values.push(token);

  return new ReferenceProperty(targetCollection, identifier, values);
};

/**
 * Gets the value of the property at the provided time.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
ReferenceProperty.prototype.getValue = function (time, result) {
  const target = resolve(this);
  return defined(target) ? target.getValue(time, result) : undefined;
};

/**
 * Gets the value of the property at the provided time and in the provided reference frame.
 * This method is only valid if the property being referenced is a {@link PositionProperty}.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
 * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
 */
ReferenceProperty.prototype.getValueInReferenceFrame = function (
  time,
  referenceFrame,
  result
) {
  const target = resolve(this);
  return defined(target)
    ? target.getValueInReferenceFrame(time, referenceFrame, result)
    : undefined;
};

/**
 * Gets the {@link Material} type at the provided time.
 * This method is only valid if the property being referenced is a {@link MaterialProperty}.
 *
 * @param {JulianDate} time The time for which to retrieve the type.
 * @returns {String} The type of material.
 */
ReferenceProperty.prototype.getType = function (time) {
  const target = resolve(this);
  return defined(target) ? target.getType(time) : undefined;
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
ReferenceProperty.prototype.equals = function (other) {
  if (this === other) {
    return true;
  }

  const names = this._targetPropertyNames;
  const otherNames = other._targetPropertyNames;

  if (
    this._targetCollection !== other._targetCollection || //
    this._targetId !== other._targetId || //
    names.length !== otherNames.length
  ) {
    return false;
  }

  const length = this._targetPropertyNames.length;
  for (let i = 0; i < length; i++) {
    if (names[i] !== otherNames[i]) {
      return false;
    }
  }

  return true;
};

ReferenceProperty.prototype._onTargetEntityDefinitionChanged = function (
  targetEntity,
  name,
  value,
  oldValue
) {
  if (defined(this._targetProperty) && this._targetPropertyNames[0] === name) {
    this._targetProperty = undefined;
    this._definitionChanged.raiseEvent(this);
  }
};

ReferenceProperty.prototype._onCollectionChanged = function (
  collection,
  added,
  removed
) {
  let targetEntity = this._targetEntity;
  if (defined(targetEntity) && removed.indexOf(targetEntity) !== -1) {
    targetEntity.definitionChanged.removeEventListener(
      ReferenceProperty.prototype._onTargetEntityDefinitionChanged,
      this
    );
    this._targetEntity = this._targetProperty = undefined;
  } else if (!defined(targetEntity)) {
    targetEntity = resolve(this);
    if (defined(targetEntity)) {
      this._definitionChanged.raiseEvent(this);
    }
  }
};
export default ReferenceProperty;
