import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import MetadataClassProperty from "./MetadataClassProperty.js";

/**
 * A metadata class.
 *
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the class.
 * @param {Object} options.class The class JSON object.
 * @param {Object.<String, MetadataEnum>} [options.enums] A dictionary of enums.
 *
 * @alias MetadataClass
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataClass(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const id = options.id;
  const classDefinition = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.class", classDefinition);
  //>>includeEnd('debug');

  const properties = {};
  const propertiesBySemantic = {};
  for (const propertyId in classDefinition.properties) {
    if (classDefinition.properties.hasOwnProperty(propertyId)) {
      const property = new MetadataClassProperty({
        id: propertyId,
        property: classDefinition.properties[propertyId],
        enums: options.enums,
      });
      properties[propertyId] = property;
      if (defined(property.semantic)) {
        propertiesBySemantic[property.semantic] = property;
      }
    }
  }

  this._properties = properties;
  this._propertiesBySemantic = propertiesBySemantic;
  this._id = id;
  this._name = classDefinition.name;
  this._description = classDefinition.description;
  this._extras = classDefinition.extras;
  this._extensions = classDefinition.extensions;
}

Object.defineProperties(MetadataClass.prototype, {
  /**
   * The class properties.
   *
   * @memberof MetadataClass.prototype
   * @type {Object.<String, MetadataClassProperty>}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * A dictionary mapping semantics to class properties.
   *
   * @memberof MetadataClass.prototype
   * @type {Object.<String, MetadataClassProperty>}
   * @readonly
   *
   * @private
   */
  propertiesBySemantic: {
    get: function () {
      return this._propertiesBySemantic;
    },
  },

  /**
   * The ID of the class.
   *
   * @memberof MetadataClass.prototype
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
   * @memberof MetadataClass.prototype
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
   * @memberof MetadataClass.prototype
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
   * Extras in the JSON object.
   *
   * @memberof MetadataClass.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * Extensions in the JSON object.
   *
   * @memberof MetadataClass.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

/**
 * The class name given to the metadata class when a batch
 * table is loaded from 3D Tiles 1.0 formats.
 *
 * @private
 */
MetadataClass.BATCH_TABLE_CLASS_NAME = "_batchTable";

export default MetadataClass;
