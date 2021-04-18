/**
 * Components for building models.
 *
 * @namespace ModelComponents
 *
 * @private
 */
var ModelComponents = {};

/**
 * Information about the quantized attribute.
 *
 * @alias ModelComponents.Quantization
 * @constructor
 *
 * @private
 */
function Quantization() {
  /**
   * Whether the quantized attribute is oct-encoded.
   *
   * @type {Boolean}
   */
  this.octEncoded = false;

  /**
   * The range used to convert buffer values to normalized values [0.0, 1.0]
   * This is typically computed as (1 << quantizationBits) - 1
   *
   * @type {Number}
   */
  this.normalizationRange = undefined;

  /**
   * The bottom-left corner of the quantization volume. Not applicable for oct encoded attributes.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   */
  this.quantizedVolumeOffset = undefined;

  /**
   * The dimensions of the quantization volume. Not applicable for oct encoded attributes.
   *
   * @type {Number|Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4}
   */
  this.quantizedVolumeDimensions = undefined;

  /**
   * The component data type of the attribute, e.g. ComponentDatatype.UNSIGNED_SHORT.
   *
   * @type {ComponentDatatype}
   */
  this.componentDatatype = undefined;
}

ModelComponents.Quantization = Quantization;

export default ModelComponents;
