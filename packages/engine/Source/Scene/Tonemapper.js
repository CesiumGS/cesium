/**
 * A tonemapping algorithm when rendering with high dynamic range.
 *
 * @enum {string}
 */
const Tonemapper = {
  /**
   * Use the Reinhard tonemapping operator.
   *
   * @type {string}
   * @constant
   */
  REINHARD: "REINHARD",

  /**
   * Use the modified Reinhard tonemapping operator.
   *
   * @type {string}
   * @constant
   */
  MODIFIED_REINHARD: "MODIFIED_REINHARD",

  /**
   * Use the Filmic tonemapping operator.
   *
   * @type {string}
   * @constant
   */
  FILMIC: "FILMIC",

  /**
   * Use the ACES tonemapping operator.
   *
   * @type {string}
   * @constant
   */
  ACES: "ACES",

  /**
   * Use the PBRNeutral tonemapping operator.
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
export function validateToneMapper(tonemapper) {
  return (
    tonemapper === Tonemapper.REINHARD ||
    tonemapper === Tonemapper.MODIFIED_REINHARD ||
    tonemapper === Tonemapper.FILMIC ||
    tonemapper === Tonemapper.ACES ||
    tonemapper === Tonemapper.PBR_NEUTRAL
  );
}

export default Object.freeze(Tonemapper);
