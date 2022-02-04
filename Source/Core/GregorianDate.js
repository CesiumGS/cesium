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
    const maxYear = 9999;
    const minYear = 1;
    const minMonth = 1;
    const maxMonth = 12;
    const maxDay = 31;
    const minDay = 1;
    const minHour = 0;
    const maxHour = 23;
    const maxMinute = 59;
    const minMinute = 0;
    const minSecond = 0;
    const maxSecond = 59;
    const minMilisecond = 0;
    const excludedMaxMilisecond = 1000;

    if (year < minYear || year > maxYear)
      throw "Year parameter represent an invalid date";
    if (month < minMonth || month > maxMonth)
      throw "Month parameter represent an invalid date";
    if (day < minDay || day > maxDay)
      throw "Day parameter represent an invalid date";
    if (hour < minHour || hour > maxHour)
      throw "Hour parameter represent an invalid date";
    if (minute < minMinute || minute > maxMinute)
      throw "Combination of Minute and IsLeapSecond parameters represent an invalid date";
    if (
      second < minSecond ||
      (second > maxSecond && !isLeapSecond) ||
      (second > maxSecond + 1 && isLeapSecond)
    )
      throw "Second parameter represent an invalid date";
    if (millisecond < minMilisecond || millisecond >= excludedMaxMilisecond)
      throw "Millisecond parameter represent an invalid date";
  }

  // Javascript date object supports only dates greater than 1901. Thus validating with custom logic
  function validateDate() {
    const minNumberOfDaysInMonth = 28;
    const monthsWith31Days = [1, 3, 5, 7, 8, 10, 12];

    if (
      month === 2 &&
      ((year % 4 === 0 && day > minNumberOfDaysInMonth + 1) ||
        (year % 4 !== 0 && day > minNumberOfDaysInMonth))
    )
      throw "Year, Month and Day represents invalid date";
    else if (
      monthsWith31Days.indexOf(month) === -1 &&
      day > minNumberOfDaysInMonth + 2
    )
      throw "Month and Day represents invalid date";
  }
}
export default GregorianDate;
