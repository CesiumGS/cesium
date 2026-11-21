// @ts-check

/**
 * When growing or shrinking a selection, what defines neighboring components.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
const SelectionStep = {
  /**
   * Vertices or faces sharing an edge.
   *
   * @type {number}
   * @constant
   */
  EDGE: 0,

  /**
   * Vertices sharing a face, or faces sharing a vertex.
   *
   * @type {number}
   * @constant
   */
  FACE: 1,
};

Object.freeze(SelectionStep);

export default SelectionStep;
