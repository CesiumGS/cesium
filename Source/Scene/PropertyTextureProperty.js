import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import MetadataType from "./MetadataType.js";
import MetadataComponentType from "./MetadataComponentType.js";

/**
 * A property in a property texture.
 *
 * <p>
 * See the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata|EXT_structural_metadata Extension} as well as the
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

  // in EXT_structural_metadata, the property is a valid glTF textureInfo
  const channels = defined(property.channels) ? property.channels : [0];
  const textureInfo = property;
  const textureReader = GltfLoaderUtil.createModelTextureReader({
    textureInfo: textureInfo,
    channels: reformatChannels(channels),
    texture: textures[textureInfo.index],
  });

  this._min = property.min;
  this._max = property.max;

  let offset = property.offset;
  let scale = property.scale;

  // This needs to be set before handling default values
  const hasValueTransform =
    classProperty.hasValueTransform || defined(offset) || defined(scale);

  // If the property attribute does not define an offset/scale, it inherits from
  // the class property. The class property handles setting the default of
  // identity: (offset 0, scale 1) with the same scalar/vector/matrix types.
  // array types are disallowed by the spec.
  offset = defaultValue(offset, classProperty.offset);
  scale = defaultValue(scale, classProperty.scale);

  // offset and scale are applied on the GPU, so unpack the values
  // as math types we can use in uniform callbacks.
  offset = classProperty.unpackVectorAndMatrixTypes(offset);
  scale = classProperty.unpackVectorAndMatrixTypes(scale);

  this._offset = offset;
  this._scale = scale;
  this._hasValueTransform = hasValueTransform;

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
   * True if offset/scale should be applied. If both offset/scale were
   * undefined, they default to identity so this property is set false
   *
   * @memberof PropertyTextureProperty.prototype
   * @type {Boolean}
   * @readonly
   * @private
   */
  hasValueTransform: {
    get: function () {
      return this._hasValueTransform;
    },
  },

  /**
   * The offset to be added to property values as part of the value transform.
   *
   * @memberof PropertyTextureProperty.prototype
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @readonly
   * @private
   */
  offset: {
    get: function () {
      return this._offset;
    },
  },

  /**
   * The scale to be multiplied to property values as part of the value transform.
   *
   * @memberof PropertyTextureProperty.prototype
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   * @readonly
   * @private
   */
  scale: {
    get: function () {
      return this._scale;
    },
  },

  /**
   * The properties inherited from this property's class
   *
   * @memberof PropertyTextureProperty.prototype
   * @type {MetadataClassProperty}
   * @readonly
   * @private
   */
  classProperty: {
    get: function () {
      return this._classProperty;
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

PropertyTextureProperty.prototype.isGpuCompatible = function () {
  const classProperty = this._classProperty;
  const type = classProperty.type;
  const componentType = classProperty.componentType;

  if (classProperty.isArray) {
    // only support arrays of 1-4 UINT8 scalars (normalized or unnormalized)
    return (
      !classProperty.isVariableLengthArray &&
      classProperty.arrayLength <= 4 &&
      type === MetadataType.SCALAR &&
      componentType === MetadataComponentType.UINT8
    );
  }

  if (MetadataType.isVectorType(type) || type === MetadataType.SCALAR) {
    return componentType === MetadataComponentType.UINT8;
  }

  // For this initial implementation, only UINT8-based properties
  // are supported.
  return false;
};

const floatTypesByComponentCount = [undefined, "float", "vec2", "vec3", "vec4"];
const integerTypesByComponentCount = [
  undefined,
  "int",
  "ivec2",
  "ivec3",
  "ivec4",
];
PropertyTextureProperty.prototype.getGlslType = function () {
  const classProperty = this._classProperty;

  let componentCount = MetadataType.getComponentCount(classProperty.type);
  if (classProperty.isArray) {
    // fixed-sized arrays of length 2-4 UINT8s are represented as vectors as the
    // shader since those are more useful in GLSL.
    componentCount = classProperty.arrayLength;
  }

  // Normalized UINT8 properties are float types in the shader
  if (classProperty.normalized) {
    return floatTypesByComponentCount[componentCount];
  }

  // other UINT8-based properties are represented as integer types.
  return integerTypesByComponentCount[componentCount];
};

PropertyTextureProperty.prototype.unpackInShader = function (packedValueGlsl) {
  const classProperty = this._classProperty;

  // no unpacking needed if for normalized types
  if (classProperty.normalized) {
    return packedValueGlsl;
  }

  // integer types are read from the texture as normalized float values.
  // these need to be rescaled to [0, 255] and cast to the appropriate integer
  // type.
  const glslType = this.getGlslType();
  return `${glslType}(255.0 * ${packedValueGlsl})`;
};

/**
 * Reformat from an array of channel indices like <code>[0, 1]</code> to a
 * string of channels as would be used in GLSL swizzling (e.g. "rg")
 *
 * @param {Number[]} channels the channel indices
 * @return {String} The channels as a string of "r", "g", "b" or "a" characters.
 * @private
 */
function reformatChannels(channels) {
  return channels
    .map(function (channelIndex) {
      return "rgba".charAt(channelIndex);
    })
    .join("");
}

export default PropertyTextureProperty;
