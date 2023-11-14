/**
 * Specifies the type of the cloud that is added to a {@link CloudCollection} in {@link CloudCollection#add}.
 *
 * @enum {Number}
 */

const CloudType = {
  /**
   * Cumulus cloud.
   *
   * @type {Number}
   * @constant
   */
  CUMULUS: 0,
};

/**
 * Validates that the provided cloud type is a valid {@link CloudType}
 *
 * @param {CloudType} cloudType The cloud type to validate.
 * @returns {Boolean} <code>true</code> if the provided cloud type is a valid value; otherwise, <code>false</code>.
 *
 * @example
 * if (!Cesium.CloudType.validate(cloudType)) {
 *   throw new Cesium.DeveloperError('cloudType must be a valid value.');
 * }
 */

CloudType.validate = function (cloudType) {
  return cloudType === CloudType.CUMULUS;
};

export default Object.freeze(CloudType);
