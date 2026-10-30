// @ts-check

/**
 * Which mesh components a {@link MeshEditor} edits. Combine components with
 * <code>|</code>, e.g. <code>EditMode.VERTEX | EditMode.EDGE</code>. The
 * editor decides which components to draw and select for each mode.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
const EditMode = {
  /**
   * Object mode.
   *
   * @type {number}
   * @constant
   */
  NONE: 0,

  /**
   * Vertices are edited.
   *
   * @type {number}
   * @constant
   */
  VERTEX: 1,

  /**
   * Edges are edited.
   *
   * @type {number}
   * @constant
   */
  EDGE: 2,

  /**
   * Faces are edited.
   *
   * @type {number}
   * @constant
   */
  FACE: 4,
};

Object.freeze(EditMode);

export default EditMode;
