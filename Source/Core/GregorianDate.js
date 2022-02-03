/**
 * Represents a Gregorian date in a more precise format than the JavaScript Date object.
 * In addition to submillisecond precision, this object can also represent leap seconds.
 * @alias GregorianDate
 * @constructor
 *
 * @param {Number} [year] The year as a whole number.
 * @param {Number} [month] The month as a whole number with range [1, 12].
 * @param {Number} [day] The day of the month as a whole number starting at 1.
 * @param {Number} [hour] The hour as a whole number with range [0, 23].
 * @param {Number} [minute] The minute of the hour as a whole number with range [0, 59].
 * @param {Number} [second] The second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
 * @param {Number} [millisecond] The millisecond of the second as a floating point number with range [0.0, 1000.0).
 * @param {Boolean} [isLeapSecond] Whether this time is during a leap second.
 *
 * @see JulianDate#toGregorianDate
 */
function GregorianDate(
  year = 1,
  month = 1,
  day = 1,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
  isLeapSecond = false
) {
  validateRange();

  /**
   * Gets or sets the year as a whole number.
   * @type {Number}
   */
  this.year = year;
  /**
   * Gets or sets the month as a whole number with range [1, 12].
   * @type {Number}
   */
  this.month = month;
  /**
   * Gets or sets the day of the month as a whole number starting at 1.
   * @type {Number}
   */
  this.day = day;
  /**
   * Gets or sets the hour as a whole number with range [0, 23].
   * @type {Number}
   */
  this.hour = hour;
  /**
   * Gets or sets the minute of the hour as a whole number with range [0, 59].
   * @type {Number}
   */
  this.minute = minute;
  /**
   * Gets or sets the second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
   * @type {Number}
   */
  this.second = second;
  /**
   * Gets or sets the millisecond of the second as a floating point number with range [0.0, 1000.0]).
   * @type {Number}
   */
  this.millisecond = millisecond;
  /**
   * Gets or sets whether this time is during a leap second.
   * @type {Boolean}
   */
  this.isLeapSecond = isLeapSecond;

  function validateRange() {
    if (year < 1 || year > 9999)
      throw "Year parameter represent an invalid date";
    if (month < 1 || month > 12)
      throw "Month parameter represent an invalid date";
    if (day < 1 || day > 31) throw "Day parameter represent an invalid date";
    if (hour < 0 || hour > 23) throw "Hour parameter represent an invalid date";
    if (minute < 0 || minute > 59)
      throw "Combination of Minute and IsLeapSecond parameters represent an invalid date";
    if (
      second < 0 ||
      (second > 59 && !isLeapSecond) ||
      (second > 60 && isLeapSecond)
    )
      throw "Second parameter represent an invalid date";
    if (millisecond < 0 || millisecond >= 1000)
      throw "Millisecond parameter represent an invalid date";
  }
}
export default GregorianDate;
