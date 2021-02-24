/**
 * @private
 */
var PrimitiveState = {
  READY: 0,
  CREATING: 1,
  CREATED: 2,
  COMBINING: 3,
  COMBINED: 4,
  COMPLETE: 5,
  FAILED: 6,
};
export default Object.freeze(PrimitiveState);
