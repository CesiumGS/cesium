import buildModuleUrl from "./buildModuleUrl.js";
import defaultValue from "./defaultValue.js";
import defer from "./defer.js";
import defined from "./defined.js";
import Iau2006XysSample from "./Iau2006XysSample.js";
import JulianDate from "./JulianDate.js";
import Resource from "./Resource.js";
import TimeStandard from "./TimeStandard.js";

/**
 * A set of IAU2006 XYS data that is used to evaluate the transformation between the International
 * Celestial Reference Frame (ICRF) and the International Terrestrial Reference Frame (ITRF).
 *
 * @alias Iau2006XysData
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Resource|String} [options.xysFileUrlTemplate='Assets/IAU2006_XYS/IAU2006_XYS_{0}.json'] A template URL for obtaining the XYS data.  In the template,
 *                 `{0}` will be replaced with the file index.
 * @param {Number} [options.interpolationOrder=9] The order of interpolation to perform on the XYS data.
 * @param {Number} [options.sampleZeroJulianEphemerisDate=2442396.5] The Julian ephemeris date (JED) of the
 *                 first XYS sample.
 * @param {Number} [options.stepSizeDays=1.0] The step size, in days, between successive XYS samples.
 * @param {Number} [options.samplesPerXysFile=1000] The number of samples in each XYS file.
 * @param {Number} [options.totalSamples=27426] The total number of samples in all XYS files.
 *
 * @private
 */
function Iau2006XysData(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._xysFileUrlTemplate = Resource.createIfNeeded(
    options.xysFileUrlTemplate
  );
  this._interpolationOrder = defaultValue(options.interpolationOrder, 9);
  this._sampleZeroJulianEphemerisDate = defaultValue(
    options.sampleZeroJulianEphemerisDate,
    2442396.5
  );
  this._sampleZeroDateTT = new JulianDate(
    this._sampleZeroJulianEphemerisDate,
    0.0,
    TimeStandard.TAI
  );
  this._stepSizeDays = defaultValue(options.stepSizeDays, 1.0);
  this._samplesPerXysFile = defaultValue(options.samplesPerXysFile, 1000);
  this._totalSamples = defaultValue(options.totalSamples, 27426);
  this._samples = new Array(this._totalSamples * 3);
  this._chunkDownloadsInProgress = [];

  const order = this._interpolationOrder;

  // Compute denominators and X values for interpolation.
  const denom = (this._denominators = new Array(order + 1));
  const xTable = (this._xTable = new Array(order + 1));

  const stepN = Math.pow(this._stepSizeDays, order);

  for (let i = 0; i <= order; ++i) {
    denom[i] = stepN;
    xTable[i] = i * this._stepSizeDays;

    for (let j = 0; j <= order; ++j) {
      if (j !== i) {
        denom[i] *= i - j;
      }
    }

    denom[i] = 1.0 / denom[i];
  }

  // Allocate scratch arrays for interpolation.
  this._work = new Array(order + 1);
  this._coef = new Array(order + 1);
}

const julianDateScratch = new JulianDate(0, 0.0, TimeStandard.TAI);

function getDaysSinceEpoch(xys, dayTT, secondTT) {
  const dateTT = julianDateScratch;
  dateTT.dayNumber = dayTT;
  dateTT.secondsOfDay = secondTT;
  return JulianDate.daysDifference(dateTT, xys._sampleZeroDateTT);
}

/**
 * Preloads XYS data for a specified date range.
 *
 * @param {Number} startDayTT The Julian day number of the beginning of the interval to preload, expressed in
 *                 the Terrestrial Time (TT) time standard.
 * @param {Number} startSecondTT The seconds past noon of the beginning of the interval to preload, expressed in
 *                 the Terrestrial Time (TT) time standard.
 * @param {Number} stopDayTT The Julian day number of the end of the interval to preload, expressed in
 *                 the Terrestrial Time (TT) time standard.
 * @param {Number} stopSecondTT The seconds past noon of the end of the interval to preload, expressed in
 *                 the Terrestrial Time (TT) time standard.
 * @returns {Promise<void>} A promise that, when resolved, indicates that the requested interval has been
 *                    preloaded.
 */
Iau2006XysData.prototype.preload = function (
  startDayTT,
  startSecondTT,
  stopDayTT,
  stopSecondTT
) {
  const startDaysSinceEpoch = getDaysSinceEpoch(
    this,
    startDayTT,
    startSecondTT
  );
  const stopDaysSinceEpoch = getDaysSinceEpoch(this, stopDayTT, stopSecondTT);

  let startIndex =
    (startDaysSinceEpoch / this._stepSizeDays - this._interpolationOrder / 2) |
    0;
  if (startIndex < 0) {
    startIndex = 0;
  }

  let stopIndex =
    (stopDaysSinceEpoch / this._stepSizeDays - this._interpolationOrder / 2) |
    (0 + this._interpolationOrder);
  if (stopIndex >= this._totalSamples) {
    stopIndex = this._totalSamples - 1;
  }

  const startChunk = (startIndex / this._samplesPerXysFile) | 0;
  const stopChunk = (stopIndex / this._samplesPerXysFile) | 0;

  const promises = [];
  for (let i = startChunk; i <= stopChunk; ++i) {
    promises.push(requestXysChunk(this, i));
  }

  return Promise.all(promises);
};

/**
 * Computes the XYS values for a given date by interpolating.  If the required data is not yet downloaded,
 * this method will return undefined.
 *
 * @param {Number} dayTT The Julian day number for which to compute the XYS value, expressed in
 *                 the Terrestrial Time (TT) time standard.
 * @param {Number} secondTT The seconds past noon of the date for which to compute the XYS value, expressed in
 *                 the Terrestrial Time (TT) time standard.
 * @param {Iau2006XysSample} [result] The instance to which to copy the interpolated result.  If this parameter
 *                           is undefined, a new instance is allocated and returned.
 * @returns {Iau2006XysSample} The interpolated XYS values, or undefined if the required data for this
 *                             computation has not yet been downloaded.
 *
 * @see Iau2006XysData#preload
 */
Iau2006XysData.prototype.computeXysRadians = function (
  dayTT,
  secondTT,
  result
) {
  const daysSinceEpoch = getDaysSinceEpoch(this, dayTT, secondTT);
  if (daysSinceEpoch < 0.0) {
    // Can't evaluate prior to the epoch of the data.
    return undefined;
  }

  const centerIndex = (daysSinceEpoch / this._stepSizeDays) | 0;
  if (centerIndex >= this._totalSamples) {
    // Can't evaluate after the last sample in the data.
    return undefined;
  }

  const degree = this._interpolationOrder;

  let firstIndex = centerIndex - ((degree / 2) | 0);
  if (firstIndex < 0) {
    firstIndex = 0;
  }
  let lastIndex = firstIndex + degree;
  if (lastIndex >= this._totalSamples) {
    lastIndex = this._totalSamples - 1;
    firstIndex = lastIndex - degree;
    if (firstIndex < 0) {
      firstIndex = 0;
    }
  }

  // Are all the samples we need present?
  // We can assume so if the first and last are present
  let isDataMissing = false;
  const samples = this._samples;
  if (!defined(samples[firstIndex * 3])) {
    requestXysChunk(this, (firstIndex / this._samplesPerXysFile) | 0);
    isDataMissing = true;
  }

  if (!defined(samples[lastIndex * 3])) {
    requestXysChunk(this, (lastIndex / this._samplesPerXysFile) | 0);
    isDataMissing = true;
  }

  if (isDataMissing) {
    return undefined;
  }

  if (!defined(result)) {
    result = new Iau2006XysSample(0.0, 0.0, 0.0);
  } else {
    result.x = 0.0;
    result.y = 0.0;
    result.s = 0.0;
  }

  const x = daysSinceEpoch - firstIndex * this._stepSizeDays;

  const work = this._work;
  const denom = this._denominators;
  const coef = this._coef;
  const xTable = this._xTable;

  let i, j;
  for (i = 0; i <= degree; ++i) {
    work[i] = x - xTable[i];
  }

  for (i = 0; i <= degree; ++i) {
    coef[i] = 1.0;

    for (j = 0; j <= degree; ++j) {
      if (j !== i) {
        coef[i] *= work[j];
      }
    }

    coef[i] *= denom[i];

    let sampleIndex = (firstIndex + i) * 3;
    result.x += coef[i] * samples[sampleIndex++];
    result.y += coef[i] * samples[sampleIndex++];
    result.s += coef[i] * samples[sampleIndex];
  }

  return result;
};

function requestXysChunk(xysData, chunkIndex) {
  if (xysData._chunkDownloadsInProgress[chunkIndex]) {
    // Chunk has already been requested.
    return xysData._chunkDownloadsInProgress[chunkIndex];
  }

  const deferred = defer();

  xysData._chunkDownloadsInProgress[chunkIndex] = deferred;

  let chunkUrl;
  const xysFileUrlTemplate = xysData._xysFileUrlTemplate;
  if (defined(xysFileUrlTemplate)) {
    chunkUrl = xysFileUrlTemplate.getDerivedResource({
      templateValues: {
        0: chunkIndex,
      },
    });
  } else {
    chunkUrl = new Resource({
      url: buildModuleUrl(`Assets/IAU2006_XYS/IAU2006_XYS_${chunkIndex}.json`),
    });
  }

  chunkUrl.fetchJson().then(function (chunk) {
    xysData._chunkDownloadsInProgress[chunkIndex] = false;

    const samples = xysData._samples;
    const newSamples = chunk.samples;
    const startIndex = chunkIndex * xysData._samplesPerXysFile * 3;

    for (let i = 0, len = newSamples.length; i < len; ++i) {
      samples[startIndex + i] = newSamples[i];
    }

    deferred.resolve();
  });

  return deferred.promise;
}
export default Iau2006XysData;
