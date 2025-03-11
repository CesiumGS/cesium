import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import MetadataClass from "./MetadataClass.js";
import MetadataEnum from "./MetadataEnum.js";

/**
 * A schema containing classes and enums.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Metadata|3D Metadata Specification} for 3D Tiles
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {string} [options.id] The ID of the schema
 * @param {string} [options.name] The name of the schema.
 * @param {string} [options.description] The description of the schema.
 * @param {string} [options.version] The application-specific version of the schema.
 * @param {Object<string, MetadataClass>} [options.classes] Classes defined in the schema, where each key is the class ID.
 * @param {Object<string, MetadataEnum>} [options.enums] Enums defined in the schema, where each key is the enum ID.
 * @param {*} [options.extras] Extra user-defined properties.
 * @param {object} [options.extensions] An object containing extensions.
 *
 * @alias MetadataSchema
 * @constructor
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataSchema(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  const classes = options.classes ?? {};
  const enums = options.enums ?? {};

  this._classes = classes;
  this._enums = enums;
  this._id = options.id;
  this._name = options.name;
  this._description = options.description;
  this._version = options.version;
  this._extras = clone(options.extras, true);
  this._extensions = clone(options.extensions, true);
}

/**
 * Creates a {@link MetadataSchema} from either 3D Tiles 1.1, 3DTILES_metadata, EXT_structural_metadata, or EXT_feature_metadata.
 *
 * @param {object} schema The schema JSON object.
 *
 * @returns {MetadataSchema} The newly created metadata schema
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
MetadataSchema.fromJson = function (schema) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("schema", schema);
  //>>includeEnd('debug');

  const enums = {};
  if (defined(schema.enums)) {
    for (const enumId in schema.enums) {
      if (schema.enums.hasOwnProperty(enumId)) {
        enums[enumId] = MetadataEnum.fromJson({
          id: enumId,
          enum: schema.enums[enumId],
        });
      }
    }
  }

  const classes = {};
  if (defined(schema.classes)) {
    for (const classId in schema.classes) {
      if (schema.classes.hasOwnProperty(classId)) {
        classes[classId] = MetadataClass.fromJson({
          id: classId,
          class: schema.classes[classId],
          enums: enums,
        });
      }
    }
  }

  return new MetadataSchema({
    id: schema.id,
    name: schema.name,
    description: schema.description,
    version: schema.version,
    classes: classes,
    enums: enums,
    extras: schema.extras,
    extensions: schema.extensions,
  });
};

Object.defineProperties(MetadataSchema.prototype, {
  /**
   * Classes defined in the schema.
   *
   * @memberof MetadataSchema.prototype
   * @type {Object<string, MetadataClass>}
   * @readonly
   */
  classes: {
    get: function () {
      return this._classes;
    },
  },

  /**
   * Enums defined in the schema.
   *
   * @memberof MetadataSchema.prototype
   * @type {Object<string, MetadataEnum>}
   * @readonly
   */
  enums: {
    get: function () {
      return this._enums;
    },
  },

  /**
   * The ID of the schema.
   *
   * @memberof MetadataSchema.prototype
   * @type {string}
   * @readonly
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * The name of the schema.
   *
   * @memberof MetadataSchema.prototype
   * @type {string}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The description of the schema.
   *
   * @memberof MetadataSchema.prototype
   * @type {string}
   * @readonly
   */
  description: {
    get: function () {
      return this._description;
    },
  },

  /**
   * The application-specific version of the schema.
   *
   * @memberof MetadataSchema.prototype
   * @type {string}
   * @readonly
   */
  version: {
    get: function () {
      return this._version;
    },
  },

  /**
   * Extra user-defined properties.
   *
   * @memberof MetadataSchema.prototype
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
   * @memberof MetadataSchema.prototype
   * @type {object}
   * @readonly
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

export default MetadataSchema;
