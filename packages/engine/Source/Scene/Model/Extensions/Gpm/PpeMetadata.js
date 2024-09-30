import Check from "../../../../Core/Check.js";

/**
 * @typedef {object} PpeMetadata.ConstructorOptions
 *
 * Initialization options for the PpeMetadata constructor
 *
 * @property {PpeSource} source The source of the error data
 * @property {number|undefined} [min] Minimum allowed value for the property.
 * @property {number|undefined} [max] Maximum allowed value for the property.
 */

/**
 * Metadata related to the stored PPE (Per-Point Error) data.
 *
 * This reflects the `ppeMetadata` definition of the
 * {@link https://nsgreg.nga.mil/csmwg.jsp|NGA_gpm_local} glTF extension.
 *
 * @constructor
 * @param {PpeMetadata.ConstructorOptions} options An object describing initialization options
 *
 * @private
 */
function PpeMetadata(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.source", options.source);
  //>>includeEnd('debug');

  this._min = options.min;
  this._max = options.max;
  this._source = options.source;
}

Object.defineProperties(PpeMetadata.prototype, {
  /**
   * Minimum allowed value for the property. This is the minimum of all
   * values after the transforms based on the offset and scale properties
   * have been applied.
   *
   * @memberof PpeMetadata.prototype
   * @type {number|undefined}
   * @readonly
   */
  min: {
    get: function () {
      return this._min;
    },
  },

  /**
   * Maximum allowed value for the property. This is the maximum of all
   * values after the transforms based on the offset and scale properties
   * have been applied.
   *
   * @memberof PpeMetadata.prototype
   * @type {number|undefined}
   * @readonly
   */
  max: {
    get: function () {
      return this._max;
    },
  },

  /**
   * Possible error source contents
   *
   * @memberof PpeMetadata.prototype
   * @type {PpeSource}
   * @readonly
   */
  source: {
    get: function () {
      return this._source;
    },
  },
});

export default PpeMetadata;
