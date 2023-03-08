/**
 * Describes a renderable batch of geometry.
 *
 * @alias Vector3DTileBatch
 * @constructor
 *
 * @param {object} options An object with the following properties:
 * @param {number} options.offset The offset of the batch into the indices buffer.
 * @param {number} options.count The number of indices in the batch.
 * @param {Color} options.color The color of the geometry in the batch.
 * @param {number[]} options.batchIds An array where each element is the batch id of the geometry in the batch.
 *
 * @private
 */
function Vector3DTileBatch(options) {
  /**
   * The offset of the batch into the indices buffer.
   * @type {number}
   */
  this.offset = options.offset;
  /**
   * The number of indices in the batch.
   * @type {number}
   */
  this.count = options.count;
  /**
   * The color of the geometry in the batch.
   * @type {Color}
   */
  this.color = options.color;
  /**
   * An array where each element is the batch id of the geometry in the batch.
   * @type {number[]}
   */
  this.batchIds = options.batchIds;
}
export default Vector3DTileBatch;
