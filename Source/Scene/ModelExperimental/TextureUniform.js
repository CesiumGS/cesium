import defaultValue from "../../Core/defaultValue.js";
import Resource from "../../Core/Resource.js";
import PixelFormat from "../../Core/PixelFormat.js";
import PixelDataType from "../../Renderer/PixelDatatype.js";
import Sampler from "../../Renderer/Sampler.js";
import TextureWrap from "../../Renderer/TextureWrap.js";

/**
 * A simple struct that serves as a value of a <code>sampler2D</code>-valued
 * uniform. This is used with {@link CustomShader} and {@link TextureManager}
 *
 * @param {Object} options An object with the following properties:
 * @param {Uint8Array} [options.typedArray] A typed array storing the contents of a texture.
 * @param {String|Resource} [options.url] A URL string or resource pointing to a texture image.
 * @param {Boolean} [options.repeat=true] When defined, the texture sampler will be set to wrap in both directions
 * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGBA] When options.typedArray is defined, this is used to determine the pixel format of the texture
 * @param {PixelDataType} [options.pixelDataType=PixelDataType.UNSIGNED_BYTE] When options.typedArray is defined, this is the
 * @param {TextureMinificationFilter} [textureMinificationFilter=TextureMinificationFilter.LINEAR] The minification filter of the texture sampler.
 * @param {TextureMagnificationFilter} [textureMagnificationFilter=TextureMagnificationFilter.LINEAR] The magnification filter of the texture sampler.
 * @param {Number} [options.maximumAnisotropy=1.0] The maximum anisotropy of the texture sampler
 *
 * @alias TextureUniform
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function TextureUniform(options) {
  this.typedArray = options.typedArray;
  this.width = options.width;
  this.height = options.height;
  this.pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
  this.pixelDataType = defaultValue(
    options.pixelDataType,
    PixelDataType.UNSIGNED_BYTE
  );

  var resource = options.url;
  if (typeof resource === "string") {
    resource = Resource.createIfNeeded(resource);
  }
  this.resource = resource;

  var repeat = defaultValue(options.repeat, true);
  var wrap = repeat ? TextureWrap.REPEAT : TextureWrap.CLAMP_TO_EDGE;
  this.sampler = new Sampler({
    wrapS: wrap,
    wrapT: wrap,
    minificationFilter: options.minificationFilter,
    magnificationFilter: options.magnificationFilter,
    maximumAnisotropy: options.maximumAnisotropy,
  });
}
