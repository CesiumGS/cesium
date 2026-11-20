// @ts-check

/**
 * How to compare a value to another value.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @enum {number}
 */
const ComparisonOperator = {
  /**
   * Equal to the value.
   *
   * @type {number}
   * @constant
   */
  EQUAL: 0,

  /**
   * Not equal to the value.
   *
   * @type {number}
   * @constant
   */
  NOT_EQUAL: 1,

  /**
   * Less than the value.
   *
   * @type {number}
   * @constant
   */
  LESS: 2,

  /**
   * Less than or equal to the value.
   *
   * @type {number}
   * @constant
   */
  LESS_OR_EQUAL: 3,

  /**
   * Greater than the value.
   *
   * @type {number}
   * @constant
   */
  GREATER: 4,

  /**
   * Greater than or equal to the value.
   *
   * @type {number}
   * @constant
   */
  GREATER_OR_EQUAL: 5,
};

Object.freeze(ComparisonOperator);

export default ComparisonOperator;
