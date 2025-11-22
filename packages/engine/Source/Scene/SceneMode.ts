/**
 * Indicates if the scene is viewed in 3D, 2D, or 2.5D Columbus view.
 *
 * @enum {number}
 * @see Scene#mode
 */
const SceneMode = {
  /**
   * Morphing between mode, e.g., 3D to 2D.
   *
   * @type {number}
   * @constant
   */
  MORPHING: 0,

  /**
   * Columbus View mode.  A 2.5D perspective view where the map is laid out
   * flat and objects with non-zero height are drawn above it.
   *
   * @type {number}
   * @constant
   */
  COLUMBUS_VIEW: 1,

  /**
   * 2D mode.  The map is viewed top-down with an orthographic projection.
   *
   * @type {number}
   * @constant
   */
  SCENE2D: 2,

  /**
   * 3D mode.  A traditional 3D perspective view of the globe.
   *
   * @type {number}
   * @constant
   */
  SCENE3D: 3,
};

/**
 * Returns the morph time for the given scene mode.
 *
 * @param {SceneMode} value The scene mode
 * @returns {number} The morph time
 */
SceneMode.getMorphTime = function (value) {
  if (value === SceneMode.SCENE3D) {
    return 1.0;
  } else if (value === SceneMode.MORPHING) {
    return undefined;
  }
  return 0.0;
};
export default Object.freeze(SceneMode);
