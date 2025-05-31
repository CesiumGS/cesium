/**
 * A class containing a set of flags indicating which parts of an
 * <code>ImageryLayer</code> need to be processed.
 *
 * This is used in the <code>ImageryPipelineStage</code> to decide the
 * structure of the function that blends the imagery texture information
 * with the previous pixels.
 *
 * Each flag indicates that at least one of the <code>ImageryLayer</code> objects
 * that are part of the input did <b>not</b> have the default value that
 * was defined via the corresponding <code>ImageryLayer.DEFAULT_...</code>>.
 *
 * Note that the type of the flags can be <code>boolean</code> or
 * <code>number</code>. Users should check for these flags having
 * a 'truthy' or 'falsy' value.
 *
 * @private
 */
class ImageryFlags {
  constructor() {
    this.alpha = false;
    this.brightness = false;
    this.contrast = false;
    this.hue = false;
    this.saturation = false;
    this.gamma = false;
    this.colorToAlpha = false;
  }
}

export default ImageryFlags;
