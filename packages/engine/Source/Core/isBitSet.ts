/**
 * @private
 */
function isBitSet(bits, mask) {
  return (bits & mask) !== 0;
}
export { isBitSet };
export default isBitSet;
