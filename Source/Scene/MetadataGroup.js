import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * Metadata about a group of content.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.id The ID of the group.
 * @param {Object} options.group The group JSON object.
 * @param {MetadataClass} [options.class] The class that group metadata conforms to.
 *
 * @alias MetadataGroup
 * @constructor
 *
 * @private
 */
function MetadataGroup(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var id = options.id;
  var group = options.group;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.id", id);
  Check.typeOf.object("options.group", group);
  //>>includeEnd('debug');

  this._class = options.class;
  this._properties = clone(group.properties, true); // Clone so that this object doesn't hold on to a reference to the JSON
  this._id = id;
  this._name = group.name;
  this._description = group.description;
  this._extras = clone(group.extras, true); // Clone so that this object doesn't hold on to a reference to the JSON
}

Object.defineProperties(MetadataGroup.prototype, {
  /**
   * The class that group metadata conform to.
   *
   * @memberof MetadataGroup.prototype
   * @type {MetadataClass}
   * @readonly
   * @private
   */
  class: {
    get: function () {
      return this._class;
    },
  },

  /**
   * A dictionary containing group properties.
   *
   * @memberof MetadataGroup.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * The ID of the group.
   *
   * @memberof MetadataGroup.prototype
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
   * The name of the group.
   *
   * @memberof MetadataGroup.prototype
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
   * The description of the group.
   *
   * @memberof MetadataGroup.prototype
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
   * @memberof MetadataGroup.prototype
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

export default MetadataGroup;
