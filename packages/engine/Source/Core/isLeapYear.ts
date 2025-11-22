import DeveloperError from "./DeveloperError.js";

/**
 * Determines if a given date is a leap year.
 *
 * @function isLeapYear
 *
 * @param {number} year The year to be tested.
 * @returns {boolean} True if <code>year</code> is a leap year.
 *
 * @example
 * const leapYear = Cesium.isLeapYear(2000); // true
 */
function isLeapYear(year) {
  ;

  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
export { isLeapYear };
export default isLeapYear;
