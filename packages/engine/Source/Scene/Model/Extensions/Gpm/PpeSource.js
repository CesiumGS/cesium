/**
 * An enum of per-point error sources.
 *
 * This reflects the `ppeMetadata.source` definition of the
 * {@link https://nsgreg.nga.mil/csmwg.jsp|NGA_gpm_local} glTF extension.
 *
 * @enum {string}
 * @private
 */
const PpeSource = {
  /**
   * The PPE standard deviation of error in the x dimension of the MCS (sigma x). Value will be squared
   * and used to populate the (1,1) element in the PPE covariance matrix.
   *
   * @type {string}
   * @constant
   */
  SIGX: "SIGX",

  /**
   * The PPE standard deviation of error in the y dimension of the MCS (sigma y). Value will be squared
   * and used to populate the (2,2) element in the PPE covariance matrix.
   *
   * @type {string}
   * @constant
   */
  SIGY: "SIGY",

  /**
   * The PPE standard deviation of error in the z dimension of the MCS (sigma z). Value will be squared
   * and used to populate the (3,3) element in the PPE covariance matrix.
   *
   * @type {string}
   * @constant
   */
  SIGZ: "SIGZ",

  /**
   * The PPE variance of error in the x dimension of the MCS (sigma x2). Value will be used to populate
   * the (1,1) element in the PPE covariance matrix.
   *
   * @type {string}
   * @constant
   */
  VARX: "VARX",

  /**
   * The PPE variance of error in the y dimension of the MCS (sigma y2). Value will be used to populate
   * the (2,2) element in the PPE covariance matrix.
   *
   * @type {string}
   * @constant
   */
  VARY: "VARY",

  /**
   * The PPE variance of error in the z dimension of the MCS (sigma z2). Value will be used to populate
   * the (3,3) element in the PPE covariance matrix.
   *
   * @type {string}
   * @constant
   */
  VARZ: "VARZ",

  /**
   * The PPE radial error in the horizontal dimension (x-y) of the MCS (sigma radial) . Value will be squared
   * and used to populate the (1,1) and (2,2) element in the PPE covariance matrix.
   *
   * @type {string}
   * @constant
   */
  SIGR: "VARZ",
};

export default Object.freeze(PpeSource);
