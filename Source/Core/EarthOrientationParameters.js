import when from "../ThirdParty/when.js";
import binarySearch from "./binarySearch.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import EarthOrientationParametersSample from "./EarthOrientationParametersSample.js";
import JulianDate from "./JulianDate.js";
import LeapSecond from "./LeapSecond.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";
import TimeConstants from "./TimeConstants.js";
import TimeStandard from "./TimeStandard.js";

/**
 * Specifies Earth polar motion coordinates and the difference between UT1 and UTC.
 * These Earth Orientation Parameters (EOP) are primarily used in the transformation from
 * the International Celestial Reference Frame (ICRF) to the International Terrestrial
 * Reference Frame (ITRF).
 *
 * @alias EarthOrientationParameters
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Resource|String} [options.url] The URL from which to obtain EOP data.  If neither this
 *                 parameter nor options.data is specified, all EOP values are assumed
 *                 to be 0.0.  If options.data is specified, this parameter is
 *                 ignored.
 * @param {Object} [options.data] The actual EOP data.  If neither this
 *                 parameter nor options.data is specified, all EOP values are assumed
 *                 to be 0.0.
 * @param {Boolean} [options.addNewLeapSeconds=true] True if leap seconds that
 *                  are specified in the EOP data but not in {@link JulianDate.leapSeconds}
 *                  should be added to {@link JulianDate.leapSeconds}.  False if
 *                  new leap seconds should be handled correctly in the context
 *                  of the EOP data but otherwise ignored.
 *
 * @example
 * // An example EOP data file, EOP.json:
 * {
 *   "columnNames" : ["dateIso8601","modifiedJulianDateUtc","xPoleWanderRadians","yPoleWanderRadians","ut1MinusUtcSeconds","lengthOfDayCorrectionSeconds","xCelestialPoleOffsetRadians","yCelestialPoleOffsetRadians","taiMinusUtcSeconds"],
 *   "samples" : [
 *      "2011-07-01T00:00:00Z",55743.0,2.117957047295119e-7,2.111518721609984e-6,-0.2908948,-2.956e-4,3.393695767766752e-11,3.3452143996557983e-10,34.0,
 *      "2011-07-02T00:00:00Z",55744.0,2.193297093339541e-7,2.115460256837405e-6,-0.29065,-1.824e-4,-8.241832578862112e-11,5.623838700870617e-10,34.0,
 *      "2011-07-03T00:00:00Z",55745.0,2.262286080161428e-7,2.1191157519929706e-6,-0.2905572,1.9e-6,-3.490658503988659e-10,6.981317007977318e-10,34.0
 *   ]
 * }
 *
 * @example
 * // Loading the EOP data
 * const eop = new Cesium.EarthOrientationParameters({ url : 'Data/EOP.json' });
 * Cesium.Transforms.earthOrientationParameters = eop;
 *
 * @private
 */
function EarthOrientationParameters(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._dates = undefined;
  this._samples = undefined;

  this._dateColumn = -1;
  this._xPoleWanderRadiansColumn = -1;
  this._yPoleWanderRadiansColumn = -1;
  this._ut1MinusUtcSecondsColumn = -1;
  this._xCelestialPoleOffsetRadiansColumn = -1;
  this._yCelestialPoleOffsetRadiansColumn = -1;
  this._taiMinusUtcSecondsColumn = -1;

  this._columnCount = 0;
  this._lastIndex = -1;

  this._downloadPromise = undefined;
  this._dataError = undefined;

  this._addNewLeapSeconds = defaultValue(options.addNewLeapSeconds, true);

  if (defined(options.data)) {
    // Use supplied EOP data.
    onDataReady(this, options.data);
  } else if (defined(options.url)) {
    const resource = Resource.createIfNeeded(options.url);

    // Download EOP data.
    const that = this;
    this._downloadPromise = resource
      .fetchJson()
      .then(function (eopData) {
        onDataReady(that, eopData);
      })
      .otherwise(function () {
        that._dataError =
          "An error occurred while retrieving the EOP data from the URL " +
          resource.url +
          ".";
      });
  } else {
    // Use all zeros for EOP data.
    onDataReady(this, {
      columnNames: [
        "dateIso8601",
        "modifiedJulianDateUtc",
        "xPoleWanderRadians",
        "yPoleWanderRadians",
        "ut1MinusUtcSeconds",
        "lengthOfDayCorrectionSeconds",
        "xCelestialPoleOffsetRadians",
        "yCelestialPoleOffsetRadians",
        "taiMinusUtcSeconds",
      ],
      samples: [],
    });
  }
}

/**
 * A default {@link EarthOrientationParameters} instance that returns zero for all EOP values.
 */
EarthOrientationParameters.NONE = Object.freeze({
  getPromiseToLoad: function () {
    return when.resolve();
  },
  compute: function (date, result) {
    if (!defined(result)) {
      result = new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0);
    } else {
      result.xPoleWander = 0.0;
      result.yPoleWander = 0.0;
      result.xPoleOffset = 0.0;
      result.yPoleOffset = 0.0;
      result.ut1MinusUtc = 0.0;
    }
    return result;
  },
});

/**
 * Gets a promise that, when resolved, indicates that the EOP data has been loaded and is
 * ready to use.
 *
 * @returns {Promise<void>} The promise.
 */
EarthOrientationParameters.prototype.getPromiseToLoad = function () {
  return when(this._downloadPromise);
};

/**
 * Computes the Earth Orientation Parameters (EOP) for a given date by interpolating.
 * If the EOP data has not yet been download, this method returns undefined.
 *
 * @param {JulianDate} date The date for each to evaluate the EOP.
 * @param {EarthOrientationParametersSample} [result] The instance to which to copy the result.
 *        If this parameter is undefined, a new instance is created and returned.
 * @returns {EarthOrientationParametersSample} The EOP evaluated at the given date, or
 *          undefined if the data necessary to evaluate EOP at the date has not yet been
 *          downloaded.
 *
 * @exception {RuntimeError} The loaded EOP data has an error and cannot be used.
 *
 * @see EarthOrientationParameters#getPromiseToLoad
 */
EarthOrientationParameters.prototype.compute = function (date, result) {
  // We cannot compute until the samples are available.
  if (!defined(this._samples)) {
    if (defined(this._dataError)) {
      throw new RuntimeError(this._dataError);
    }

    return undefined;
  }

  if (!defined(result)) {
    result = new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0);
  }

  if (this._samples.length === 0) {
    result.xPoleWander = 0.0;
    result.yPoleWander = 0.0;
    result.xPoleOffset = 0.0;
    result.yPoleOffset = 0.0;
    result.ut1MinusUtc = 0.0;
    return result;
  }

  const dates = this._dates;
  const lastIndex = this._lastIndex;

  let before = 0;
  let after = 0;
  if (defined(lastIndex)) {
    const previousIndexDate = dates[lastIndex];
    const nextIndexDate = dates[lastIndex + 1];
    const isAfterPrevious = JulianDate.lessThanOrEquals(
      previousIndexDate,
      date
    );
    const isAfterLastSample = !defined(nextIndexDate);
    const isBeforeNext =
      isAfterLastSample || JulianDate.greaterThanOrEquals(nextIndexDate, date);

    if (isAfterPrevious && isBeforeNext) {
      before = lastIndex;

      if (!isAfterLastSample && nextIndexDate.equals(date)) {
        ++before;
      }
      after = before + 1;

      interpolate(this, dates, this._samples, date, before, after, result);
      return result;
    }
  }

  let index = binarySearch(dates, date, JulianDate.compare, this._dateColumn);
  if (index >= 0) {
    // If the next entry is the same date, use the later entry.  This way, if two entries
    // describe the same moment, one before a leap second and the other after, then we will use
    // the post-leap second data.
    if (index < dates.length - 1 && dates[index + 1].equals(date)) {
      ++index;
    }
    before = index;
    after = index;
  } else {
    after = ~index;
    before = after - 1;

    // Use the first entry if the date requested is before the beginning of the data.
    if (before < 0) {
      before = 0;
    }
  }

  this._lastIndex = before;

  interpolate(this, dates, this._samples, date, before, after, result);
  return result;
};

function compareLeapSecondDates(leapSecond, dateToFind) {
  return JulianDate.compare(leapSecond.julianDate, dateToFind);
}

function onDataReady(eop, eopData) {
  if (!defined(eopData.columnNames)) {
    eop._dataError =
      "Error in loaded EOP data: The columnNames property is required.";
    return;
  }

  if (!defined(eopData.samples)) {
    eop._dataError =
      "Error in loaded EOP data: The samples property is required.";
    return;
  }

  const dateColumn = eopData.columnNames.indexOf("modifiedJulianDateUtc");
  const xPoleWanderRadiansColumn = eopData.columnNames.indexOf(
    "xPoleWanderRadians"
  );
  const yPoleWanderRadiansColumn = eopData.columnNames.indexOf(
    "yPoleWanderRadians"
  );
  const ut1MinusUtcSecondsColumn = eopData.columnNames.indexOf(
    "ut1MinusUtcSeconds"
  );
  const xCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf(
    "xCelestialPoleOffsetRadians"
  );
  const yCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf(
    "yCelestialPoleOffsetRadians"
  );
  const taiMinusUtcSecondsColumn = eopData.columnNames.indexOf(
    "taiMinusUtcSeconds"
  );

  if (
    dateColumn < 0 ||
    xPoleWanderRadiansColumn < 0 ||
    yPoleWanderRadiansColumn < 0 ||
    ut1MinusUtcSecondsColumn < 0 ||
    xCelestialPoleOffsetRadiansColumn < 0 ||
    yCelestialPoleOffsetRadiansColumn < 0 ||
    taiMinusUtcSecondsColumn < 0
  ) {
    eop._dataError =
      "Error in loaded EOP data: The columnNames property must include modifiedJulianDateUtc, xPoleWanderRadians, yPoleWanderRadians, ut1MinusUtcSeconds, xCelestialPoleOffsetRadians, yCelestialPoleOffsetRadians, and taiMinusUtcSeconds columns";
    return;
  }

  const samples = (eop._samples = eopData.samples);
  const dates = (eop._dates = []);

  eop._dateColumn = dateColumn;
  eop._xPoleWanderRadiansColumn = xPoleWanderRadiansColumn;
  eop._yPoleWanderRadiansColumn = yPoleWanderRadiansColumn;
  eop._ut1MinusUtcSecondsColumn = ut1MinusUtcSecondsColumn;
  eop._xCelestialPoleOffsetRadiansColumn = xCelestialPoleOffsetRadiansColumn;
  eop._yCelestialPoleOffsetRadiansColumn = yCelestialPoleOffsetRadiansColumn;
  eop._taiMinusUtcSecondsColumn = taiMinusUtcSecondsColumn;

  eop._columnCount = eopData.columnNames.length;
  eop._lastIndex = undefined;

  let lastTaiMinusUtc;

  const addNewLeapSeconds = eop._addNewLeapSeconds;

  // Convert the ISO8601 dates to JulianDates.
  for (let i = 0, len = samples.length; i < len; i += eop._columnCount) {
    const mjd = samples[i + dateColumn];
    const taiMinusUtc = samples[i + taiMinusUtcSecondsColumn];
    const day = mjd + TimeConstants.MODIFIED_JULIAN_DATE_DIFFERENCE;
    const date = new JulianDate(day, taiMinusUtc, TimeStandard.TAI);
    dates.push(date);

    if (addNewLeapSeconds) {
      if (taiMinusUtc !== lastTaiMinusUtc && defined(lastTaiMinusUtc)) {
        // We crossed a leap second boundary, so add the leap second
        // if it does not already exist.
        const leapSeconds = JulianDate.leapSeconds;
        const leapSecondIndex = binarySearch(
          leapSeconds,
          date,
          compareLeapSecondDates
        );
        if (leapSecondIndex < 0) {
          const leapSecond = new LeapSecond(date, taiMinusUtc);
          leapSeconds.splice(~leapSecondIndex, 0, leapSecond);
        }
      }
      lastTaiMinusUtc = taiMinusUtc;
    }
  }
}

function fillResultFromIndex(eop, samples, index, columnCount, result) {
  const start = index * columnCount;
  result.xPoleWander = samples[start + eop._xPoleWanderRadiansColumn];
  result.yPoleWander = samples[start + eop._yPoleWanderRadiansColumn];
  result.xPoleOffset = samples[start + eop._xCelestialPoleOffsetRadiansColumn];
  result.yPoleOffset = samples[start + eop._yCelestialPoleOffsetRadiansColumn];
  result.ut1MinusUtc = samples[start + eop._ut1MinusUtcSecondsColumn];
}

function linearInterp(dx, y1, y2) {
  return y1 + dx * (y2 - y1);
}

function interpolate(eop, dates, samples, date, before, after, result) {
  const columnCount = eop._columnCount;

  // First check the bounds on the EOP data
  // If we are after the bounds of the data, return zeros.
  // The 'before' index should never be less than zero.
  if (after > dates.length - 1) {
    result.xPoleWander = 0;
    result.yPoleWander = 0;
    result.xPoleOffset = 0;
    result.yPoleOffset = 0;
    result.ut1MinusUtc = 0;
    return result;
  }

  const beforeDate = dates[before];
  const afterDate = dates[after];
  if (beforeDate.equals(afterDate) || date.equals(beforeDate)) {
    fillResultFromIndex(eop, samples, before, columnCount, result);
    return result;
  } else if (date.equals(afterDate)) {
    fillResultFromIndex(eop, samples, after, columnCount, result);
    return result;
  }

  const factor =
    JulianDate.secondsDifference(date, beforeDate) /
    JulianDate.secondsDifference(afterDate, beforeDate);

  const startBefore = before * columnCount;
  const startAfter = after * columnCount;

  // Handle UT1 leap second edge case
  let beforeUt1MinusUtc = samples[startBefore + eop._ut1MinusUtcSecondsColumn];
  let afterUt1MinusUtc = samples[startAfter + eop._ut1MinusUtcSecondsColumn];

  const offsetDifference = afterUt1MinusUtc - beforeUt1MinusUtc;
  if (offsetDifference > 0.5 || offsetDifference < -0.5) {
    // The absolute difference between the values is more than 0.5, so we may have
    // crossed a leap second.  Check if this is the case and, if so, adjust the
    // afterValue to account for the leap second.  This way, our interpolation will
    // produce reasonable results.
    const beforeTaiMinusUtc =
      samples[startBefore + eop._taiMinusUtcSecondsColumn];
    const afterTaiMinusUtc =
      samples[startAfter + eop._taiMinusUtcSecondsColumn];
    if (beforeTaiMinusUtc !== afterTaiMinusUtc) {
      if (afterDate.equals(date)) {
        // If we are at the end of the leap second interval, take the second value
        // Otherwise, the interpolation below will yield the wrong side of the
        // discontinuity
        // At the end of the leap second, we need to start accounting for the jump
        beforeUt1MinusUtc = afterUt1MinusUtc;
      } else {
        // Otherwise, remove the leap second so that the interpolation is correct
        afterUt1MinusUtc -= afterTaiMinusUtc - beforeTaiMinusUtc;
      }
    }
  }

  result.xPoleWander = linearInterp(
    factor,
    samples[startBefore + eop._xPoleWanderRadiansColumn],
    samples[startAfter + eop._xPoleWanderRadiansColumn]
  );
  result.yPoleWander = linearInterp(
    factor,
    samples[startBefore + eop._yPoleWanderRadiansColumn],
    samples[startAfter + eop._yPoleWanderRadiansColumn]
  );
  result.xPoleOffset = linearInterp(
    factor,
    samples[startBefore + eop._xCelestialPoleOffsetRadiansColumn],
    samples[startAfter + eop._xCelestialPoleOffsetRadiansColumn]
  );
  result.yPoleOffset = linearInterp(
    factor,
    samples[startBefore + eop._yCelestialPoleOffsetRadiansColumn],
    samples[startAfter + eop._yCelestialPoleOffsetRadiansColumn]
  );
  result.ut1MinusUtc = linearInterp(
    factor,
    beforeUt1MinusUtc,
    afterUt1MinusUtc
  );
  return result;
}
export default EarthOrientationParameters;
