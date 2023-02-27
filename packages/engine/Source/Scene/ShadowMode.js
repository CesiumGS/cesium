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
 * @private
 */
ShadowMode.castShadows = function (shadowMode) {
  return (
    shadowMode === ShadowMode.ENABLED || shadowMode === ShadowMode.CAST_ONLY
  );
};

/**
 * @private
 */
ShadowMode.receiveShadows = function (shadowMode) {
  return (
    shadowMode === ShadowMode.ENABLED || shadowMode === ShadowMode.RECEIVE_ONLY
  );
};

/**
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

export default Object.freeze(ShadowMode);
