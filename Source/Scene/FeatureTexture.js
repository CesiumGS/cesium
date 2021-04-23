import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import FeatureTextureProperty from "./FeatureTextureProperty.js";

/**
 * A feature texture.
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.featureTexture The feature texture JSON.
 * @param {MetadataClass} options.class The class that properties conform to.
 * @param {Object.<String, Texture>} options.textures An object mapping texture IDs to {@link Texture} objects.
 *
 * @alias FeatureTexture
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function FeatureTexture(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var featureTexture = options.featureTexture;
  var classDefinition = options.class;
  var textures = options.textures;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.featureTexture", featureTexture);
  Check.typeOf.object("options.class", classDefinition);
  Check.typeOf.object("options.textures", textures);
  //>>includeEnd('debug');

  var extensions = featureTexture.extensions;
  var extras = featureTexture.extras;

  var properties = {};
  if (defined(featureTexture.properties)) {
    for (var propertyId in featureTexture.properties) {
      if (featureTexture.properties.hasOwnProperty(propertyId)) {
        properties[propertyId] = new FeatureTextureProperty({
          property: featureTexture.properties[propertyId],
          classProperty: classDefinition.properties[propertyId],
          textures: textures,
        });
      }
    }
  }

  this._class = classDefinition;
  this._properties = properties;
  this._extras = extras;
  this._extensions = extensions;
}

Object.defineProperties(FeatureTexture.prototype, {
  /**
   * The class that properties conform to.
   *
   * @memberof FeatureTexture.prototype
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
   * @memberof FeatureTexture.prototype
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
   * @memberof FeatureTexture.prototype
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
 * Gets the property with the given property ID.
 *
 * @param {String} propertyId The case-sensitive ID of the property.
 * @returns {FeatureTextureProperty|undefined} The property, or undefined if there is no match.
 * @private
 */
FeatureTexture.prototype.getProperty = function (propertyId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("propertyId", propertyId);
  //>>includeEnd('debug');

  return this._properties[propertyId];
};

export default FeatureTexture;
