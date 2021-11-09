import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import MetadataClass from "./MetadataClass.js";
import MetadataEnum from "./MetadataEnum.js";

/**
 * A schema containing classes and enums.
 * <p>
 * See the {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_metadata|3DTILES_metadata Extension} for 3D Tiles
 * </p>
 *
 * @param {Object} schema The schema JSON object.
 *
 * @alias MetadataSchema
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MetadataSchema(schema) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("schema", schema);
  //>>includeEnd('debug');

  var enums = {};
  if (defined(schema.enums)) {
    for (var enumId in schema.enums) {
      if (schema.enums.hasOwnProperty(enumId)) {
        enums[enumId] = new MetadataEnum({
          id: enumId,
          enum: schema.enums[enumId],
        });
      }
    }
  }

  var classes = {};
  if (defined(schema.classes)) {
    for (var classId in schema.classes) {
      if (schema.classes.hasOwnProperty(classId)) {
        classes[classId] = new MetadataClass({
          id: classId,
          class: schema.classes[classId],
          enums: enums,
        });
      }
    }
  }

  this._classes = classes;
  this._enums = enums;
  this._name = schema.name;
  this._description = schema.description;
  this._version = schema.version;
  this._extras = schema.extras;
  this._extensions = schema.extensions;
}

Object.defineProperties(MetadataSchema.prototype, {
  /**
   * Classes defined in the schema.
   *
   * @memberof MetadataSchema.prototype
   * @type {Object.<String, MetadataClass>}
   * @readonly
   * @private
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
   * @type {Object.<String, MetadataEnum>}
   * @readonly
   * @private
   */
  enums: {
    get: function () {
      return this._enums;
    },
  },

  /**
   * The name of the schema.
   *
   * @memberof MetadataSchema.prototype
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
   * The description of the schema.
   *
   * @memberof MetadataSchema.prototype
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
   * The application-specific version of the schema.
   *
   * @memberof MetadataSchema.prototype
   * @type {String}
   * @readonly
   * @private
   */
  version: {
    get: function () {
      return this._version;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof MetadataSchema.prototype
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
   * @memberof MetadataSchema.prototype
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

export default MetadataSchema;
