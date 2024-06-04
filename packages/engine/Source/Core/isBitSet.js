/**
 * @param bits
 * @param mask
 * @private
 */
function isBitSet(bits, mask) {
  return (bits & mask) !== 0;
}
export default isBitSet;
