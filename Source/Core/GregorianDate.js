import defaultValue from "./defaultValue.js";
import DeveloperError from "./DeveloperError.js";
import isLeapYear from "./isLeapYear.js";

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
  year,
  month,
  day,
  hour,
  minute,
  second,
  millisecond,
  isLeapSecond
) {
  const minimumYear = 1;
  const minimumMonth = 1;
  const minimumDay = 1;
  const minimumHour = 0;
  const minimumMinute = 0;
  const minimumSecond = 0;
  const minimumMillisecond = 0;

  year = defaultValue(year, minimumYear);
  month = defaultValue(month, minimumMonth);
  day = defaultValue(day, minimumDay);
  hour = defaultValue(hour, minimumHour);
  minute = defaultValue(minute, minimumMinute);
  second = defaultValue(second, minimumSecond);
  millisecond = defaultValue(millisecond, minimumMillisecond);
  validateRange();
  validateDate();

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
    const maximumYear = 9999;
    const maximumMonth = 12;
    const maximumDay = 31;
    const maximumHour = 23;
    const maximumMinute = 59;
    const maximumSecond = 59;
    const excludedMaximumMilisecond = 1000;

    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      isNaN(hour) ||
      isNaN(minute) ||
      isNaN(second) ||
      isNaN(millisecond)
    )
      throw new DeveloperError("Invalid value passed in parameter");

    if (year < minimumYear || year > maximumYear)
      throw new DeveloperError("Year parameter represent an invalid date");
    if (month < minimumMonth || month > maximumMonth)
      throw new DeveloperError("Month parameter represent an invalid date");
    if (day < minimumDay || day > maximumDay)
      throw new DeveloperError("Day parameter represent an invalid date");
    if (hour < minimumHour || hour > maximumHour)
      throw new DeveloperError("Hour parameter represent an invalid date");
    if (minute < minimumMinute || minute > maximumMinute)
      throw new DeveloperError(
        "Combination of Minute and IsLeapSecond parameters represent an invalid date"
      );
    if (
      second < minimumSecond ||
      (second > maximumSecond && !isLeapSecond) ||
      (second > maximumSecond + 1 && isLeapSecond)
    )
      throw new DeveloperError("Second parameter represent an invalid date");
    if (
      millisecond < minimumMillisecond ||
      millisecond >= excludedMaximumMilisecond
    )
      throw new DeveloperError(
        "Millisecond parameter represent an invalid date"
      );
  }

  // Javascript date object supports only dates greater than 1901. Thus validating with custom logic
  function validateDate() {
    const minimumDaysInMonth = 28;
    const daysInYear = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (
      month === 2 &&
      ((isLeapYear(year) && day > minimumDaysInMonth + 1) ||
        (!isLeapYear(year) && day > minimumDaysInMonth))
    )
      throw new DeveloperError("Year, Month and Day represents invalid date");
    else if (month !== 2 && day > daysInYear[month - 1])
      throw new DeveloperError("Month and Day represents invalid date");
  }
}
export default GregorianDate;
