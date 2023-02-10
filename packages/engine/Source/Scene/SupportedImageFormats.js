import defaultValue from "../Core/defaultValue.js";

/**
 * Image formats supported by the browser.
 *
 * @param {object} [options] Object with the following properties:
 * @param {boolean} [options.webp=false] Whether the browser supports WebP images.
 * @param {boolean} [options.basis=false] Whether the browser supports compressed textures required to view KTX2 + Basis Universal images.
 *
 * @private
 */
function SupportedImageFormats(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this.webp = defaultValue(options.webp, false);
  this.basis = defaultValue(options.basis, false);
}

export default SupportedImageFormats;
