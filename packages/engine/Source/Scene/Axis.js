import Check from "../Core/Check.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";

/**
 * An enum describing the x, y, and z axes and helper conversion functions.
 *
 * @enum {number}
 */
const Axis = {
  /**
   * Denotes the x-axis.
   *
   * @type {number}
   * @constant
   */
  X: 0,

  /**
   * Denotes the y-axis.
   *
   * @type {number}
   * @constant
   */
  Y: 1,

  /**
   * Denotes the z-axis.
   *
   * @type {number}
   * @constant
   */
  Z: 2,
};

/**
 * Matrix used to convert from y-up to z-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.Y_UP_TO_Z_UP = Matrix4.fromRotationTranslation(
  Matrix3.fromRotationX(CesiumMath.PI_OVER_TWO)
);

/**
 * Matrix used to convert from z-up to y-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.Z_UP_TO_Y_UP = Matrix4.fromRotationTranslation(
  Matrix3.fromRotationX(-CesiumMath.PI_OVER_TWO)
);

/**
 * Matrix used to convert from x-up to z-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.X_UP_TO_Z_UP = Matrix4.fromRotationTranslation(
  Matrix3.fromRotationY(-CesiumMath.PI_OVER_TWO)
);

/**
 * Matrix used to convert from z-up to x-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.Z_UP_TO_X_UP = Matrix4.fromRotationTranslation(
  Matrix3.fromRotationY(CesiumMath.PI_OVER_TWO)
);

/**
 * Matrix used to convert from x-up to y-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.X_UP_TO_Y_UP = Matrix4.fromRotationTranslation(
  Matrix3.fromRotationZ(CesiumMath.PI_OVER_TWO)
);

/**
 * Matrix used to convert from y-up to x-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.Y_UP_TO_X_UP = Matrix4.fromRotationTranslation(
  Matrix3.fromRotationZ(-CesiumMath.PI_OVER_TWO)
);

/**
 * Gets the axis by name
 *
 * @param {string} name The name of the axis.
 * @returns {number} The axis enum.
 */
Axis.fromName = function (name) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("name", name);
  //>>includeEnd('debug');

  return Axis[name];
};

export default Object.freeze(Axis);
