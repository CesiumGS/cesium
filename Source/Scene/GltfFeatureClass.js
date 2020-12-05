import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import GltfFeatureProperty from "./GltfFeatureProperty.js";

/**
 * A feature class.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the feature class.
 * @param {Object} options.class The class JSON object from the glTF.
 *
 * @alias GltfFeatureClass
 * @constructor
 *
 * @private
 */
function GltfFeatureClass(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var id = options.id;
  var classDefinition = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.class", classDefinition);
  //>>includeEnd('debug');

  var properties = {};
  for (var propertyId in classDefinition.properties) {
    if (classDefinition.properties.hasOwnProperty(propertyId)) {
      properties[propertyId] = new GltfFeatureProperty({
        id: propertyId,
        property: classDefinition.properties[propertyId],
      });
    }
  }

  this._properties = properties;
  this._id = id;
  this._name = classDefinition.name;
  this._description = classDefinition.description;
  this._extras = clone(classDefinition.extras, true); // Clone so that this object doesn't hold on to a reference to the glTF JSON
}

Object.defineProperties(GltfFeatureClass.prototype, {
  /**
   * The class properties.
   *
   * @memberof GltfFeatureClass.prototype
   * @type {Object.<String, GltfFeatureProperty>}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * The ID of the class.
   *
   * @memberof GltfFeatureClass.prototype
   * @type {String}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * The name of the class.
   *
   * @memberof GltfFeatureClass.prototype
   * @type {String}
   * @readonly
   * @private
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The description of the class.
   *
   * @memberof GltfFeatureClass.prototype
   * @type {String}
   * @readonly
   * @private
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * Extras in the class JSON object from the glTF.
   *
   * @memberof GltfFeatureClass.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },
});

export default GltfFeatureClass;
