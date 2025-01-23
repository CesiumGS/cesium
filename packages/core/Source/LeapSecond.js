/**
 * Describes a single leap second, which is constructed from a {@link JulianDate} and a
 * numerical offset representing the number of seconds TAI is ahead of the UTC time standard.
 * @alias LeapSecond
 * @constructor
 *
 * @param {JulianDate} [date] A Julian date representing the time of the leap second.
 * @param {number} [offset] The cumulative number of seconds that TAI is ahead of UTC at the provided date.
 */
function LeapSecond(date, offset) {
  /**
   * Gets or sets the date at which this leap second occurs.
   * @type {JulianDate}
   */
  this.julianDate = date;

  /**
   * Gets or sets the cumulative number of seconds between the UTC and TAI time standards at the time
   * of this leap second.
   * @type {number}
   */
  this.offset = offset;
}
export default LeapSecond;
