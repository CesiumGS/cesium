/**
 * A class containing a the values that affect the appearance of
 * an <code>ImageryLayer</code>.
 *
 * This is used in the <code>ModelImagery</code> to detect changes in
 * the imagery settings: The <code>ModelImagery</code> stores one
 * instance per imagery layer. During the <code>update</code>
 * call, it checks whether any of the settings was changed.
 * If this is the case, the draw commands of the model are reset.
 *
 * @private
 */
class ImageryConfiguration {
  constructor(imageryLayer) {
    this.show = imageryLayer.show;
    this.alpha = imageryLayer.alpha;
    this.brightness = imageryLayer.brightness;
    this.contrast = imageryLayer.contrast;
    this.hue = imageryLayer.hue;
    this.saturation = imageryLayer.saturation;
    this.gamma = imageryLayer.gamma;
    this.colorToAlpha = imageryLayer.colorToAlpha;
  }
}

export default ImageryConfiguration;
