/**
 * @private
 */

var CloudType = {
  CUMULUS: 0,

  validate: function (cloudType) {
    return cloudType === CloudType.CUMULUS;
  },
};

export default Object.freeze(CloudType);
