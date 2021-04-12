import defaultValue from "../Core/defaultValue.js";

/**
 * Image formats supported by the browser.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.webp=false] Whether the browser supports WebP images.
 * @param {Boolean} [options.s3tc=false] Whether the browser supports s3tc compressed images.
 * @param {Boolean} [options.pvrtc=false] Whether the browser supports pvrtc compressed images.
 * @param {Boolean} [options.etc1=false] Whether the browser supports etc1 compressed images.
 *
 * @private
 */
export default function SupportedImageFormats(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this.webp = defaultValue(options.webp, false);
  this.s3tc = defaultValue(options.s3tc, false);
  this.pvrtc = defaultValue(options.pvrtc, false);
  this.etc1 = defaultValue(options.etc1, false);
}
