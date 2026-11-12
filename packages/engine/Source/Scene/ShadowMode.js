/**
 * Specifies whether the object casts or receives shadows from light sources when
 * shadows are enabled.
 *
 * @enum {number}
 */
const ShadowMode = {
  /**
   * The object does not cast or receive shadows.
   *
   * @type {number}
   * @constant
   */
  DISABLED: 0,

  /**
   * The object casts and receives shadows.
   *
   * @type {number}
   * @constant
   */
  ENABLED: 1,

  /**
   * The object casts shadows only.
   *
   * @type {number}
   * @constant
   */
  CAST_ONLY: 2,

  /**
   * The object receives shadows only.
   *
   * @type {number}
   * @constant
   */
  RECEIVE_ONLY: 3,
};

/**
 * @private
 */
ShadowMode.NUMBER_OF_SHADOW_MODES = 4;

/**
 * Determine whether a shadow mode casts shadows.
 *
 * @param {ShadowMode} shadowMode The shadow mode.
 * @returns {boolean} <code>true</code> if the shadow mode casts shadows; otherwise, <code>false</code>.
 *
 * @private
 */
ShadowMode.castShadows = function (shadowMode) {
  return (
    shadowMode === ShadowMode.ENABLED || shadowMode === ShadowMode.CAST_ONLY
  );
};

/**
 * Determine whether a shadow mode receives shadows.
 *
 * @param {ShadowMode} shadowMode The shadow mode.
 * @returns {boolean} <code>true</code> if the shadow mode receives shadows; otherwise, <code>false</code>.
 *
 * @private
 */
ShadowMode.receiveShadows = function (shadowMode) {
  return (
    shadowMode === ShadowMode.ENABLED || shadowMode === ShadowMode.RECEIVE_ONLY
  );
};

/**
 * Get the shadow mode that matches whether shadows are cast and received.
 *
 * @param {boolean} castShadows Whether shadows are cast.
 * @param {boolean} receiveShadows Whether shadows are received.
 * @returns {ShadowMode} The shadow mode that casts and receives shadows as specified.
 *
 * @private
 */
ShadowMode.fromCastReceive = function (castShadows, receiveShadows) {
  if (castShadows && receiveShadows) {
    return ShadowMode.ENABLED;
  } else if (castShadows) {
    return ShadowMode.CAST_ONLY;
  } else if (receiveShadows) {
    return ShadowMode.RECEIVE_ONLY;
  }
  return ShadowMode.DISABLED;
};

Object.freeze(ShadowMode);

export default ShadowMode;
