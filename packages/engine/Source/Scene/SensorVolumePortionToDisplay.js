import DeveloperError from "../Core/DeveloperError.js";

/**
 * Constants used to indicated what part of the sensor volume to display.
 *
 * @enum {Number}
 */
const SensorVolumePortionToDisplay = {
  /**
   * 0x0000.  Display the complete sensor volume.
   *
   * @type {Number}
   * @constant
   */
  COMPLETE: 0x0000,
  /**
   * 0x0001.  Display the portion of the sensor volume that lies below the true horizon of the ellipsoid.
   *
   * @type {Number}
   * @constant
   */
  BELOW_ELLIPSOID_HORIZON: 0x0001,
  /**
   * 0x0002.  Display the portion of the sensor volume that lies above the true horizon of the ellipsoid.
   *
   * @type {Number}
   * @constant
   */
  ABOVE_ELLIPSOID_HORIZON: 0x0002,
};

/**
 * Validates that the provided value is a valid {@link SensorVolumePortionToDisplay} enumeration value.
 *
 * @param {SensorVolumePortionToDisplay} portionToDisplay The value to validate.
 *
 * @returns {Boolean} <code>true</code> if the provided value is a valid enumeration value; otherwise, <code>false</code>.
 */
SensorVolumePortionToDisplay.validate = function (portionToDisplay) {
  return (
    portionToDisplay === SensorVolumePortionToDisplay.COMPLETE ||
    portionToDisplay === SensorVolumePortionToDisplay.BELOW_ELLIPSOID_HORIZON ||
    portionToDisplay === SensorVolumePortionToDisplay.ABOVE_ELLIPSOID_HORIZON
  );
};

/**
 * Converts the provided value to its corresponding enumeration string.
 *
 * @param {SensorVolumePortionToDisplay} portionToDisplay The value to be converted to its corresponding enumeration string.
 *
 * @returns {String} The enumeration string corresponding to the value.
 */
SensorVolumePortionToDisplay.toString = function (portionToDisplay) {
  switch (portionToDisplay) {
    case SensorVolumePortionToDisplay.COMPLETE:
      return "COMPLETE";
    case SensorVolumePortionToDisplay.BELOW_ELLIPSOID_HORIZON:
      return "BELOW_ELLIPSOID_HORIZON";
    case SensorVolumePortionToDisplay.ABOVE_ELLIPSOID_HORIZON:
      return "ABOVE_ELLIPSOID_HORIZON";
    default:
      throw new DeveloperError(
        "SensorVolumePortionToDisplay value is not valid and cannot be converted to a String.",
      );
  }
};

export default SensorVolumePortionToDisplay;
