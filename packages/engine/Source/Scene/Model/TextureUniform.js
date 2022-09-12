import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Resource from "../../Core/Resource.js";
import PixelFormat from "../../Core/PixelFormat.js";
import PixelDatatype from "../../Renderer/PixelDatatype.js";
import Sampler from "../../Renderer/Sampler.js";
import TextureWrap from "../../Renderer/TextureWrap.js";

/**
 * A simple struct that serves as a value of a <code>sampler2D</code>-valued
 * uniform. This is used with {@link CustomShader} and {@link TextureManager}
 *
 * @param {Object} options An object with the following properties:
 * @param {Uint8Array} [options.typedArray] A typed array storing the contents of a texture. Values are stored in row-major order. Since WebGL uses a y-up convention for textures, rows are listed from bottom to top.
 * @param {Number} [options.width] The width of the image. Required when options.typedArray is present
 * @param {Number} [options.height] The height of the image. Required when options.typedArray is present.
 * @param {String|Resource} [options.url] A URL string or resource pointing to a texture image.
 * @param {Boolean} [options.repeat=true] When defined, the texture sampler will be set to wrap in both directions
 * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGBA] When options.typedArray is defined, this is used to determine the pixel format of the texture
 * @param {PixelDatatype} [options.pixelDatatype=PixelDatatype.UNSIGNED_BYTE] When options.typedArray is defined, this is the data type of pixel values in the typed array.
 * @param {TextureMinificationFilter} [options.minificationFilter=TextureMinificationFilter.LINEAR] The minification filter of the texture sampler.
 * @param {TextureMagnificationFilter} [options.magnificationFilter=TextureMagnificationFilter.LINEAR] The magnification filter of the texture sampler.
 * @param {Number} [options.maximumAnisotropy=1.0] The maximum anisotropy of the texture sampler
 *
 * @alias TextureUniform
 * @constructor
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function TextureUniform(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  const hasTypedArray = defined(options.typedArray);
  const hasUrl = defined(options.url);
  if (hasTypedArray === hasUrl) {
    throw new DeveloperError(
      "exactly one of options.typedArray, options.url must be defined"
    );
  }
  if (hasTypedArray && (!defined(options.width) || !defined(options.height))) {
    throw new DeveloperError(
      "options.width and options.height are required when options.typedArray is defined"
    );
  }
  //>>includeEnd('debug');

  this.typedArray = options.typedArray;
  this.width = options.width;
  this.height = options.height;
  this.pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
  this.pixelDatatype = defaultValue(
    options.pixelDatatype,
    PixelDatatype.UNSIGNED_BYTE
  );

  let resource = options.url;
  if (typeof resource === "string") {
    resource = Resource.createIfNeeded(resource);
  }
  this.resource = resource;

  const repeat = defaultValue(options.repeat, true);
  const wrap = repeat ? TextureWrap.REPEAT : TextureWrap.CLAMP_TO_EDGE;
  this.sampler = new Sampler({
    wrapS: wrap,
    wrapT: wrap,
    minificationFilter: options.minificationFilter,
    magnificationFilter: options.magnificationFilter,
    maximumAnisotropy: options.maximumAnisotropy,
  });
}

export default TextureUniform;
