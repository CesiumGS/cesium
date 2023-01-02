import defaultValue from "../Core/defaultValue.js";

/**
 * Image formats supported by the browser.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.webp=false] Whether the browser supports WebP images.
 * @param {Boolean} [options.basis=false] Whether the browser supports compressed textures required to view KTX2 + Basis Universal images.
 *
 * @private
 */
function SupportedImageFormats(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this.webp = defaultValue(options.webp, false);
  this.basis = defaultValue(options.basis, false);
}

export default SupportedImageFormats;
