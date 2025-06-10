import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import MetadataClassProperty from "./MetadataClassProperty.js";

/**
 * A metadata class.
 *
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata|3D Metadata Specification} for 3D Tiles
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.id The ID of the class.
 * @param {string} [options.name] The name of the class.
 * @param {string} [options.description] The description of the class.
 * @param {Object<string, MetadataClassProperty>} [options.properties] The class properties, where each key is the property ID.
 * @param {*} [options.extras] Extra user-defined properties.
 * @param {object} [options.extensions] An object containing extensions.
 *
 * @alias MetadataClass
 * @constructor
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataClass(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const id = options.id;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  //>>includeEnd('debug');

  const properties = options.properties ?? {};
  const propertiesBySemantic = {};
  for (const propertyId in properties) {
    if (properties.hasOwnProperty(propertyId)) {
      const property = properties[propertyId];
      if (defined(property.semantic)) {
        propertiesBySemantic[property.semantic] = property;
      }
    }
  }

  this._id = id;
  this._name = options.name;
  this._description = options.description;
  this._properties = properties;
  this._propertiesBySemantic = propertiesBySemantic;
  this._extras = clone(options.extras, true);
  this._extensions = clone(options.extensions, true);
}

/**
 * Creates a {@link MetadataClass} from either 3D Tiles 1.1, 3DTILES_metadata, EXT_structural_metadata, or EXT_feature_metadata.
 *
 * @param {object} options Object with the following properties:
 * @param {string} options.id The ID of the class.
 * @param {object} options.class The class JSON object.
 * @param {Object<string, MetadataEnum>} [options.enums] A dictionary of enums.
 *
 * @returns {MetadataClass} The newly created metadata class.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
MetadataClass.fromJson = function (options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const id = options.id;
  const classDefinition = options.class;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.class", classDefinition);
  //>>includeEnd('debug');

  const properties = {};
  for (const propertyId in classDefinition.properties) {
    if (classDefinition.properties.hasOwnProperty(propertyId)) {
      const property = MetadataClassProperty.fromJson({
        id: propertyId,
        property: classDefinition.properties[propertyId],
        enums: options.enums,
      });
      properties[propertyId] = property;
    }
  }

  return new MetadataClass({
    id: id,
    name: classDefinition.name,
    description: classDefinition.description,
    properties: properties,
    extras: classDefinition.extras,
    extensions: classDefinition.extensions,
  });
};

Object.defineProperties(MetadataClass.prototype, {
  /**
   * The class properties.
   *
   * @memberof MetadataClass.prototype
   * @type {Object<string, MetadataClassProperty>}
   * @readonly
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
   * @type {Object<string, MetadataClassProperty>}
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
   * @type {string}
   * @readonly
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
   * @type {string}
   * @readonly
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
   * @type {string}
   * @readonly
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * Extra user-defined properties.
   *
   * @memberof MetadataClass.prototype
   * @type {*}
   * @readonly
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },

  /**
   * An object containing extensions.
   *
   * @memberof MetadataClass.prototype
   * @type {object}
   * @readonly
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
