import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import PropertyTextureProperty from "./PropertyTextureProperty.js";

/**
 * A property texture.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata|EXT_structural_metadata Extension} as well as the
 * previous {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {object} options Object with the following properties:
 * @param {string} [options.name] Optional human-readable name to describe the texture
 * @param {string|number} [options.id] A unique id to identify the property texture, useful for debugging. For <code>EXT_structural_metadata</code>, this is the array index in the property textures array, for <code>EXT_feature_metadata</code> this is the dictionary key in the property textures dictionary.
 * @param {object} options.propertyTexture The property texture JSON, following the EXT_structural_metadata schema.
 * @param {MetadataClass} options.class The class that properties conform to.
 * @param {Object<string, Texture>} options.textures An object mapping texture IDs to {@link Texture} objects.
 *
 * @alias PropertyTexture
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function PropertyTexture(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const propertyTexture = options.propertyTexture;
  const classDefinition = options.class;
  const textures = options.textures;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.propertyTexture", propertyTexture);
  Check.typeOf.object("options.class", classDefinition);
  Check.typeOf.object("options.textures", textures);
  //>>includeEnd('debug');

  const extensions = propertyTexture.extensions;
  const extras = propertyTexture.extras;

  const properties = {};
  if (defined(propertyTexture.properties)) {
    for (const propertyId in propertyTexture.properties) {
      if (propertyTexture.properties.hasOwnProperty(propertyId)) {
        properties[propertyId] = new PropertyTextureProperty({
          property: propertyTexture.properties[propertyId],
          classProperty: classDefinition.properties[propertyId],
          textures: textures,
        });
      }
    }
  }

  this._name = options.name;
  this._id = options.id;
  this._class = classDefinition;
  this._properties = properties;
  this._extras = extras;
  this._extensions = extensions;
}

Object.defineProperties(PropertyTexture.prototype, {
  /**
   * A human-readable name for this texture
   *
   * @memberof PropertyTexture.prototype
   * @type {string}
   * @readonly
   * @private
   */
  name: {
    get: function () {
      return this._name;
    },
  },
  /**
   * An identifier for this texture. Useful for debugging.
   *
   * @memberof PropertyTexture.prototype
   * @type {string|number}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },
  /**
   * The class that properties conform to.
   *
   * @memberof PropertyTexture.prototype
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
   * The properties in this property texture.
   *
   * @memberof PropertyTexture.prototype
   *
   * @type {PropertyTextureProperty}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * Extra user-defined properties.
   *
   * @memberof PropertyTexture.prototype
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
   * An object containing extensions.
   *
   * @memberof PropertyTexture.prototype
   * @type {object}
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
 * Gets the property with the given property ID.
 *
 * @param {string} propertyId The case-sensitive ID of the property.
 * @returns {PropertyTextureProperty|undefined} The property, or <code>undefined</code> if the property does not exist.
 * @private
 */
PropertyTexture.prototype.getProperty = function (propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  return this._properties[propertyId];
};

export default PropertyTexture;
