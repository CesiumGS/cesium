/**
 * A tonemapping algorithm when rendering with high dynamic range.
 *
 * @enum {string}
 */
const Tonemapper = {
  /**
   * Use the Reinhard tonemapping.
   *
   * @type {string}
   * @constant
   */
  REINHARD: "REINHARD",

  /**
   * Use the modified Reinhard tonemapping.
   *
   * @type {string}
   * @constant
   */
  MODIFIED_REINHARD: "MODIFIED_REINHARD",

  /**
   * Use the Filmic tonemapping.
   *
   * @type {string}
   * @constant
   */
  FILMIC: "FILMIC",

  /**
   * Use the ACES tonemapping.
   *
   * @type {string}
   * @constant
   */
  ACES: "ACES",

  /**
   * Use the PBR Neutral tonemapping {@link https://github.com/KhronosGroup/ToneMapping/tree/main/PBR_Neutral|from Khronos}.
   *
   * @type {string}
   * @constant
   */
  PBR_NEUTRAL: "PBR_NEUTRAL",
};

/**
 * Validate whether the provided value is a known Tonemapper type
 * @private
 *
 * @param {string} tonemapper
 */
export function validateTonemapper(tonemapper) {
  return (
    tonemapper === Tonemapper.REINHARD ||
    tonemapper === Tonemapper.MODIFIED_REINHARD ||
    tonemapper === Tonemapper.FILMIC ||
    tonemapper === Tonemapper.ACES ||
    tonemapper === Tonemapper.PBR_NEUTRAL
  );
}

export default Object.freeze(Tonemapper);
