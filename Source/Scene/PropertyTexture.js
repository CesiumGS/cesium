import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PropertyTextureProperty from "./PropertyTextureProperty.js";

/**
 * A feature texture.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features|EXT_mesh_features Extension} as well as the
 * previous {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String} [options.name] Optional human-readable name to describe the table
 * @param {String|Number} [options.id] A unique id to identify the feature table, useful for debugging. For <code>EXT_mesh_features</code>, this is the array index in the feature tables array, for <code>EXT_feature_metadata</code> this is the dictionary key in the feature tables dictionary.
 * @param {Object} options.propertyTexture The property texture JSON, following the schema of <code>EXT_mesh_features</code>.
 * @param {MetadataClass} options.class The class that properties conform to.
 * @param {Object.<String, Texture>} options.textures An object mapping texture IDs to {@link Texture} objects.
 *
 * @alias PropertyTexture
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function PropertyTexture(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const propertyTexture = options.propertyTexture;
  const classDefinition = options.class;
  const textures = options.textures;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.propertyTexture", propertyTexture);
  Check.typeOf.object("options.class", classDefinition);
  Check.typeOf.object("options.textures", textures);
  //>>includeEnd('debug');

  // The property texture schema is a glTF textureInfo plus a few additional
  // fields
  const textureInfo = propertyTexture;
  const texture = textures[textureInfo.index];

  const properties = {};
  const jsonProperties = propertyTexture.properties;
  if (defined(jsonProperties)) {
    for (const propertyId in jsonProperties) {
      if (jsonProperties.hasOwnProperty(propertyId)) {
        const channels = jsonProperties[propertyId];
        const classProperty = classDefinition.properties[propertyId];

        properties[propertyId] = new PropertyTextureProperty({
          textureInfo: textureInfo,
          channels: channels,
          classProperty: classProperty,
          texture: texture,
        });
      }
    }
  }

  this._name = options.name;
  this._id = options.id;
  this._class = classDefinition;
  this._properties = properties;
  this._texture = texture;
  this._extras = propertyTexture.extras;
  this._extensions = propertyTexture.extensions;
}

Object.defineProperties(PropertyTexture.prototype, {
  /**
   * A human-readable name for this texture
   *
   * @memberof PropertyTexture.prototype
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
   * An identifier for this texture. Useful for debugging.
   *
   * @memberof PropertyTexture.prototype
   * @type {String|Number}
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
   * Extras in the JSON object.
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
   * Extensions in the JSON object.
   *
   * @memberof PropertyTexture.prototype
   * @type {Object}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },

  /**
   * Properties in the property texture
   *
   * @memberof PropertyTexture.prototype
   * @type {PropertyTextureProperty[]}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * The texture used by all the properties
   * @type {Texture}
   * @readonly
   * @private
   */
  texture: {
    get: function () {
      return this._texture;
    },
  },
});

/**
 * Gets the property with the given property ID.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
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
