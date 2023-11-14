/**
 * Represents a Gregorian date in a more precise format than the JavaScript Date object.
 * In addition to submillisecond precision, this object can also represent leap seconds.
 * @alias GregorianDate
 * @constructor
 *
 * @param {number} [year] The year as a whole number.
 * @param {number} [month] The month as a whole number with range [1, 12].
 * @param {number} [day] The day of the month as a whole number starting at 1.
 * @param {number} [hour] The hour as a whole number with range [0, 23].
 * @param {number} [minute] The minute of the hour as a whole number with range [0, 59].
 * @param {number} [second] The second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
 * @param {number} [millisecond] The millisecond of the second as a floating point number with range [0.0, 1000.0).
 * @param {boolean} [isLeapSecond] Whether this time is during a leap second.
 *
 * @see JulianDate#toGregorianDate
 */
function GregorianDate(
  year,
  month,
  day,
  hour,
  minute,
  second,
  millisecond,
  isLeapSecond
) {
  /**
   * Gets or sets the year as a whole number.
   * @type {number}
   */
  this.year = year;
  /**
   * Gets or sets the month as a whole number with range [1, 12].
   * @type {number}
   */
  this.month = month;
  /**
   * Gets or sets the day of the month as a whole number starting at 1.
   * @type {number}
   */
  this.day = day;
  /**
   * Gets or sets the hour as a whole number with range [0, 23].
   * @type {number}
   */
  this.hour = hour;
  /**
   * Gets or sets the minute of the hour as a whole number with range [0, 59].
   * @type {number}
   */
  this.minute = minute;
  /**
   * Gets or sets the second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
   * @type {number}
   */
  this.second = second;
  /**
   * Gets or sets the millisecond of the second as a floating point number with range [0.0, 1000.0).
   * @type {number}
   */
  this.millisecond = millisecond;
  /**
   * Gets or sets whether this time is during a leap second.
   * @type {boolean}
   */
  this.isLeapSecond = isLeapSecond;
}
export default GregorianDate;
