import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";

/**
 * A property in a feature texture.
 *
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features|EXT_mesh_features Extension} as well as the
 * previous {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata|EXT_feature_metadata Extension} for glTF.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.property The property JSON object.
 * @param {MetadataClassProperty} options.classProperty The class property.
 * @param {Object.<Number, Texture>} options.textures An object mapping texture IDs to {@link Texture} objects.
 *
 * @alias PropertyTextureProperty
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function PropertyTextureProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const property = options.property;
  const classProperty = options.classProperty;
  const textures = options.textures;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.classProperty", classProperty);
  Check.typeOf.object("options.textures", textures);
  //>>includeEnd('debug');

  const textureInfo = property.texture;
  const textureReader = GltfLoaderUtil.createModelTextureReader({
    textureInfo: textureInfo,
    channels: property.channels,
    texture: textures[textureInfo.index],
  });

  this._textureReader = textureReader;
  this._classProperty = classProperty;
  this._extras = property.extras;
  this._extensions = property.extensions;
}

Object.defineProperties(PropertyTextureProperty.prototype, {
  /**
   * The texture reader.
   *
   * @memberof PropertyTextureProperty.prototype
   * @type {ModelComponents.TextureReader}
   * @readonly
   * @private
   */
  textureReader: {
    get: function () {
      return this._textureReader;
    },
  },

  /**
   * Extras in the JSON object.
   *
   * @memberof PropertyTextureProperty.prototype
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
   * @memberof PropertyTextureProperty.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extensions: {
    get: function () {
      return this._extensions;
    },
  },
});

// uint8, normalized:
// float property = texture2D(...).r;
// vec2 property = texture2D(...).rg;
// vec3 property = texture2D(...).rgb;
// vec4 property = texture2D(...).rgba;

// int8, normalized:
// float property = 1.0 + 2.0 * (texture2D(...).r)

PropertyTextureProperty.prototype.getGlslType = function () {
  // TODO: fill this out
  return "float";
  //var classProperty = this._classProperty;

  // Supported types:
  // UINT8, normalized -> float
  // FLOAT -> float

  //var componentCount = classProperty.componentCount;

  //var normalized = classProperty.normalized;

  //if (classProperty.isFloat)
  // FLOAT -> float
  // VECn -> vecn
  // ARRAY[FLOAT, 1] -> float
  // ARRAY[FLOAT, 2] -> vec2
  // ARRAY[FLOAT, 3] -> vec3
  // ARRAY[FLOAT, 4] -> vec4
  // ARRAY[FLOAT]
};

export default PropertyTextureProperty;
