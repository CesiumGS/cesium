import Check from "../Core/Check.js";
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
  // Rotation about PI/2 around the X-axis
  Matrix3.fromArray([1, 0, 0, 0, 0, 1, 0, -1, 0])
);

/**
 * Matrix used to convert from z-up to y-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.Z_UP_TO_Y_UP = Matrix4.fromRotationTranslation(
  // Rotation about -PI/2 around the X-axis
  Matrix3.fromArray([1, 0, 0, 0, 0, -1, 0, 1, 0])
);

/**
 * Matrix used to convert from x-up to z-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.X_UP_TO_Z_UP = Matrix4.fromRotationTranslation(
  // Rotation about -PI/2 around the Y-axis
  Matrix3.fromArray([0, 0, 1, 0, 1, 0, -1, 0, 0])
);

/**
 * Matrix used to convert from z-up to x-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.Z_UP_TO_X_UP = Matrix4.fromRotationTranslation(
  // Rotation about PI/2 around the Y-axis
  Matrix3.fromArray([0, 0, -1, 0, 1, 0, 1, 0, 0])
);

/**
 * Matrix used to convert from x-up to y-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.X_UP_TO_Y_UP = Matrix4.fromRotationTranslation(
  // Rotation about PI/2 around the Z-axis
  Matrix3.fromArray([0, 1, 0, -1, 0, 0, 0, 0, 1])
);

/**
 * Matrix used to convert from y-up to x-up
 *
 * @type {Matrix4}
 * @constant
 */
Axis.Y_UP_TO_X_UP = Matrix4.fromRotationTranslation(
  // Rotation about -PI/2 around the Z-axis
  Matrix3.fromArray([0, -1, 0, 1, 0, 0, 0, 0, 1])
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
