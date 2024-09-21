import Check from "../../../../Core/Check.js";

/**
 * Metadata related to the stored PPE data.
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
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
   * @private
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
   * @private
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
   * @private
   */
  source: {
    get: function () {
      return this._source;
    },
  },
});

export default PpeMetadata;
