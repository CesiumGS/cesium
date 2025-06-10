import Frozen from "../Core/Frozen.js";

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
  options = options ?? Frozen.EMPTY_OBJECT;
  this.webp = options.webp ?? false;
  this.basis = options.basis ?? false;
}

export default SupportedImageFormats;
