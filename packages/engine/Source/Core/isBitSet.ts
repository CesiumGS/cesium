/**
 * @private
 */
function isBitSet(bits: any, mask: any) {
  return (bits & mask) !== 0;
}
export default isBitSet;
