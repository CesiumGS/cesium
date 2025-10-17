import binarySearch from "../Core/binarySearch.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import ExtrapolationType from "../Core/ExtrapolationType.js";
import JulianDate from "../Core/JulianDate.js";
import LinearApproximation from "../Core/LinearApproximation.js";

const PackableNumber = {
  packedLength: 1,
  pack: function (value, array, startingIndex) {
    startingIndex = startingIndex ?? 0;
    array[startingIndex] = value;
  },
  unpack: function (array, startingIndex, result) {
    startingIndex = startingIndex ?? 0;
    return array[startingIndex];
  },
};

//We can't use splice for inserting new elements because function apply can't handle
//a huge number of arguments.  See https://code.google.com/p/chromium/issues/detail?id=56588
function arrayInsert(array, startIndex, items) {
  let i;
  const arrayLength = array.length;
  const itemsLength = items.length;
  const newLength = arrayLength + itemsLength;

  array.length = newLength;
  if (arrayLength !== startIndex) {
    let q = arrayLength - 1;
    for (i = newLength - 1; i >= startIndex; i--) {
      array[i] = array[q--];
    }
  }

  for (i = 0; i < itemsLength; i++) {
    array[startIndex++] = items[i];
  }
}

function convertDate(date, epoch) {
  if (date instanceof JulianDate) {
    return date;
  }
  if (typeof date === "string") {
    return JulianDate.fromIso8601(date);
  }
  return JulianDate.addSeconds(epoch, date, new JulianDate());
}

const timesSpliceArgs = [];
const valuesSpliceArgs = [];

function mergeNewSamples(epoch, times, values, newData, packedLength) {
  let newDataIndex = 0;
  let i;
  let prevItem;
  let timesInsertionPoint;
  let valuesInsertionPoint;
  let currentTime;
  let nextTime;

  while (newDataIndex < newData.length) {
    currentTime = convertDate(newData[newDataIndex], epoch);
    timesInsertionPoint = binarySearch(times, currentTime, JulianDate.compare);
    let timesSpliceArgsCount = 0;
    let valuesSpliceArgsCount = 0;

    if (timesInsertionPoint < 0) {
      //Doesn't exist, insert as many additional values as we can.
      timesInsertionPoint = ~timesInsertionPoint;

      valuesInsertionPoint = timesInsertionPoint * packedLength;
      prevItem = undefined;
      nextTime = times[timesInsertionPoint];
      while (newDataIndex < newData.length) {
        currentTime = convertDate(newData[newDataIndex], epoch);
        if (
          (defined(prevItem) &&
            JulianDate.compare(prevItem, currentTime) >= 0) ||
          (defined(nextTime) && JulianDate.compare(currentTime, nextTime) >= 0)
        ) {
          break;
        }
        timesSpliceArgs[timesSpliceArgsCount++] = currentTime;
        newDataIndex = newDataIndex + 1;
        for (i = 0; i < packedLength; i++) {
          valuesSpliceArgs[valuesSpliceArgsCount++] = newData[newDataIndex];
          newDataIndex = newDataIndex + 1;
        }
        prevItem = currentTime;
      }

      if (timesSpliceArgsCount > 0) {
        valuesSpliceArgs.length = valuesSpliceArgsCount;
        arrayInsert(values, valuesInsertionPoint, valuesSpliceArgs);

        timesSpliceArgs.length = timesSpliceArgsCount;
        arrayInsert(times, timesInsertionPoint, timesSpliceArgs);
      }
    } else {
      //Found an exact match
      for (i = 0; i < packedLength; i++) {
        newDataIndex++;
        values[timesInsertionPoint * packedLength + i] = newData[newDataIndex];
      }
      newDataIndex++;
    }
  }
}

/**
 * A {@link Property} whose value is interpolated for a given time from the
 * provided set of samples and specified interpolation algorithm and degree.
 * @alias SampledProperty
 * @constructor
 *
 * @param {number|Packable} type The type of property.
 * @param {Packable[]} [derivativeTypes] When supplied, indicates that samples will contain derivative information of the specified types.
 *
 *
 * @example
 * //Create a linearly interpolated Cartesian2
 * const property = new Cesium.SampledProperty(Cesium.Cartesian2);
 *
 * //Populate it with data
 * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:00:00.00Z'), new Cesium.Cartesian2(0, 0));
 * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-02T00:00:00.00Z'), new Cesium.Cartesian2(4, 7));
 *
 * //Retrieve an interpolated value
 * const result = property.getValue(Cesium.JulianDate.fromIso8601('2012-08-01T12:00:00.00Z'));
 *
 * @example
 * //Create a simple numeric SampledProperty that uses third degree Hermite Polynomial Approximation
 * const property = new Cesium.SampledProperty(Number);
 * property.setInterpolationOptions({
 *     interpolationDegree : 3,
 *     interpolationAlgorithm : Cesium.HermitePolynomialApproximation
 * });
 *
 * //Populate it with data
 * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:00:00.00Z'), 1.0);
 * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:01:00.00Z'), 6.0);
 * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:02:00.00Z'), 12.0);
 * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:03:30.00Z'), 5.0);
 * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:06:30.00Z'), 2.0);
 *
 * //Samples can be added in any order.
 * property.addSample(Cesium.JulianDate.fromIso8601('2012-08-01T00:00:30.00Z'), 6.2);
 *
 * //Retrieve an interpolated value
 * const result = property.getValue(Cesium.JulianDate.fromIso8601('2012-08-01T00:02:34.00Z'));
 *
 * @see SampledPositionProperty
 */
function SampledProperty(type, derivativeTypes) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("type", type);
  //>>includeEnd('debug');

  let innerType = type;
  if (innerType === Number) {
    innerType = PackableNumber;
  }
  let packedLength = innerType.packedLength;
  let packedInterpolationLength =
    innerType.packedInterpolationLength ?? packedLength;

  let inputOrder = 0;
  let innerDerivativeTypes;
  if (defined(derivativeTypes)) {
    const length = derivativeTypes.length;
    innerDerivativeTypes = new Array(length);
    for (let i = 0; i < length; i++) {
      let derivativeType = derivativeTypes[i];
      if (derivativeType === Number) {
        derivativeType = PackableNumber;
      }
      const derivativePackedLength = derivativeType.packedLength;
      packedLength += derivativePackedLength;
      packedInterpolationLength +=
        derivativeType.packedInterpolationLength ?? derivativePackedLength;
      innerDerivativeTypes[i] = derivativeType;
    }
    inputOrder = length;
  }

  this._type = type;
  this._innerType = innerType;
  this._interpolationDegree = 1;
  this._interpolationAlgorithm = LinearApproximation;
  this._numberOfPoints = 0;
  this._times = [];
  this._values = [];
  this._xTable = [];
  this._yTable = [];
  this._packedLength = packedLength;
  this._packedInterpolationLength = packedInterpolationLength;
  this._updateTableLength = true;
  this._interpolationResult = new Array(packedInterpolationLength);
  this._definitionChanged = new Event();
  this._derivativeTypes = derivativeTypes;
  this._innerDerivativeTypes = innerDerivativeTypes;
  this._inputOrder = inputOrder;
  this._forwardExtrapolationType = ExtrapolationType.NONE;
  this._forwardExtrapolationDuration = 0;
  this._backwardExtrapolationType = ExtrapolationType.NONE;
  this._backwardExtrapolationDuration = 0;
}

Object.defineProperties(SampledProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof SampledProperty.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return this._values.length === 0;
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is considered to have changed if a call to getValue would return
   * a different result for the same time.
   * @memberof SampledProperty.prototype
   *
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
  /**
   * Gets the type of property.
   * @memberof SampledProperty.prototype
   * @type {*}
   */
  type: {
    get: function () {
      return this._type;
    },
  },
  /**
   * Gets the derivative types used by this property.
   * @memberof SampledProperty.prototype
   * @type {Packable[]}
   */
  derivativeTypes: {
    get: function () {
      return this._derivativeTypes;
    },
  },
  /**
   * Gets the degree of interpolation to perform when retrieving a value.
   * @memberof SampledProperty.prototype
   * @type {number}
   * @default 1
   */
  interpolationDegree: {
    get: function () {
      return this._interpolationDegree;
    },
  },
  /**
   * Gets the interpolation algorithm to use when retrieving a value.
   * @memberof SampledProperty.prototype
   * @type {InterpolationAlgorithm}
   * @default LinearApproximation
   */
  interpolationAlgorithm: {
    get: function () {
      return this._interpolationAlgorithm;
    },
  },
  /**
   * Gets or sets the type of extrapolation to perform when a value
   * is requested at a time after any available samples.
   * @memberof SampledProperty.prototype
   * @type {ExtrapolationType}
   * @default ExtrapolationType.NONE
   */
  forwardExtrapolationType: {
    get: function () {
      return this._forwardExtrapolationType;
    },
    set: function (value) {
      if (this._forwardExtrapolationType !== value) {
        this._forwardExtrapolationType = value;
        this._definitionChanged.raiseEvent(this);
      }
    },
  },
  /**
   * Gets or sets the amount of time to extrapolate forward before
   * the property becomes undefined.  A value of 0 will extrapolate forever.
   * @memberof SampledProperty.prototype
   * @type {number}
   * @default 0
   */
  forwardExtrapolationDuration: {
    get: function () {
      return this._forwardExtrapolationDuration;
    },
    set: function (value) {
      if (this._forwardExtrapolationDuration !== value) {
        this._forwardExtrapolationDuration = value;
        this._definitionChanged.raiseEvent(this);
      }
    },
  },
  /**
   * Gets or sets the type of extrapolation to perform when a value
   * is requested at a time before any available samples.
   * @memberof SampledProperty.prototype
   * @type {ExtrapolationType}
   * @default ExtrapolationType.NONE
   */
  backwardExtrapolationType: {
    get: function () {
      return this._backwardExtrapolationType;
    },
    set: function (value) {
      if (this._backwardExtrapolationType !== value) {
        this._backwardExtrapolationType = value;
        this._definitionChanged.raiseEvent(this);
      }
    },
  },
  /**
   * Gets or sets the amount of time to extrapolate backward
   * before the property becomes undefined.  A value of 0 will extrapolate forever.
   * @memberof SampledProperty.prototype
   * @type {number}
   * @default 0
   */
  backwardExtrapolationDuration: {
    get: function () {
      return this._backwardExtrapolationDuration;
    },
    set: function (value) {
      if (this._backwardExtrapolationDuration !== value) {
        this._backwardExtrapolationDuration = value;
        this._definitionChanged.raiseEvent(this);
      }
    },
  },
});

const timeScratch = new JulianDate();

/**
 * Gets the value of the property at the provided time.
 *
 * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
 * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {object} The modified result parameter or a new instance if the result parameter was not supplied.
 */
SampledProperty.prototype.getValue = function (time, result) {
  if (!defined(time)) {
    time = JulianDate.now(timeScratch);
  }

  const times = this._times;
  const timesLength = times.length;
  if (timesLength === 0) {
    return undefined;
  }

  let timeout;
  const innerType = this._innerType;
  const values = this._values;
  let index = binarySearch(times, time, JulianDate.compare);

  if (index < 0) {
    index = ~index;

    if (index === 0) {
      const startTime = times[index];
      timeout = this._backwardExtrapolationDuration;
      if (
        this._backwardExtrapolationType === ExtrapolationType.NONE ||
        (timeout !== 0 &&
          JulianDate.secondsDifference(startTime, time) > timeout)
      ) {
        return undefined;
      }
      if (this._backwardExtrapolationType === ExtrapolationType.HOLD) {
        return innerType.unpack(values, 0, result);
      }
    }

    if (index >= timesLength) {
      index = timesLength - 1;
      const endTime = times[index];
      timeout = this._forwardExtrapolationDuration;
      if (
        this._forwardExtrapolationType === ExtrapolationType.NONE ||
        (timeout !== 0 && JulianDate.secondsDifference(time, endTime) > timeout)
      ) {
        return undefined;
      }
      if (this._forwardExtrapolationType === ExtrapolationType.HOLD) {
        index = timesLength - 1;
        return innerType.unpack(values, index * innerType.packedLength, result);
      }
    }

    const xTable = this._xTable;
    const yTable = this._yTable;
    const interpolationAlgorithm = this._interpolationAlgorithm;
    const packedInterpolationLength = this._packedInterpolationLength;
    const inputOrder = this._inputOrder;

    if (this._updateTableLength) {
      this._updateTableLength = false;
      const numberOfPoints = Math.min(
        interpolationAlgorithm.getRequiredDataPoints(
          this._interpolationDegree,
          inputOrder,
        ),
        timesLength,
      );
      if (numberOfPoints !== this._numberOfPoints) {
        this._numberOfPoints = numberOfPoints;
        xTable.length = numberOfPoints;
        yTable.length = numberOfPoints * packedInterpolationLength;
      }
    }

    const degree = this._numberOfPoints - 1;
    if (degree < 1) {
      return undefined;
    }

    let firstIndex = 0;
    let lastIndex = timesLength - 1;
    const pointsInCollection = lastIndex - firstIndex + 1;

    if (pointsInCollection >= degree + 1) {
      let computedFirstIndex = index - ((degree / 2) | 0) - 1;
      if (computedFirstIndex < firstIndex) {
        computedFirstIndex = firstIndex;
      }
      let computedLastIndex = computedFirstIndex + degree;
      if (computedLastIndex > lastIndex) {
        computedLastIndex = lastIndex;
        computedFirstIndex = computedLastIndex - degree;
        if (computedFirstIndex < firstIndex) {
          computedFirstIndex = firstIndex;
        }
      }

      firstIndex = computedFirstIndex;
      lastIndex = computedLastIndex;
    }
    const length = lastIndex - firstIndex + 1;

    // Build the tables
    for (let i = 0; i < length; ++i) {
      xTable[i] = JulianDate.secondsDifference(
        times[firstIndex + i],
        times[lastIndex],
      );
    }

    if (!defined(innerType.convertPackedArrayForInterpolation)) {
      let destinationIndex = 0;
      const packedLength = this._packedLength;
      let sourceIndex = firstIndex * packedLength;
      const stop = (lastIndex + 1) * packedLength;

      while (sourceIndex < stop) {
        yTable[destinationIndex] = values[sourceIndex];
        sourceIndex++;
        destinationIndex++;
      }
    } else {
      innerType.convertPackedArrayForInterpolation(
        values,
        firstIndex,
        lastIndex,
        yTable,
      );
    }

    // Interpolate!
    const x = JulianDate.secondsDifference(time, times[lastIndex]);
    let interpolationResult;
    if (inputOrder === 0 || !defined(interpolationAlgorithm.interpolate)) {
      interpolationResult = interpolationAlgorithm.interpolateOrderZero(
        x,
        xTable,
        yTable,
        packedInterpolationLength,
        this._interpolationResult,
      );
    } else {
      const yStride = Math.floor(packedInterpolationLength / (inputOrder + 1));
      interpolationResult = interpolationAlgorithm.interpolate(
        x,
        xTable,
        yTable,
        yStride,
        inputOrder,
        inputOrder,
        this._interpolationResult,
      );
    }

    if (!defined(innerType.unpackInterpolationResult)) {
      return innerType.unpack(interpolationResult, 0, result);
    }
    return innerType.unpackInterpolationResult(
      interpolationResult,
      values,
      firstIndex,
      lastIndex,
      result,
    );
  }
  return innerType.unpack(values, index * this._packedLength, result);
};

/**
 * Sets the algorithm and degree to use when interpolating a value.
 *
 * @param {object} [options] Object with the following properties:
 * @param {InterpolationAlgorithm} [options.interpolationAlgorithm] The new interpolation algorithm.  If undefined, the existing property will be unchanged.
 * @param {number} [options.interpolationDegree] The new interpolation degree.  If undefined, the existing property will be unchanged.
 */
SampledProperty.prototype.setInterpolationOptions = function (options) {
  if (!defined(options)) {
    return;
  }

  let valuesChanged = false;

  const interpolationAlgorithm = options.interpolationAlgorithm;
  const interpolationDegree = options.interpolationDegree;

  if (
    defined(interpolationAlgorithm) &&
    this._interpolationAlgorithm !== interpolationAlgorithm
  ) {
    this._interpolationAlgorithm = interpolationAlgorithm;
    valuesChanged = true;
  }

  if (
    defined(interpolationDegree) &&
    this._interpolationDegree !== interpolationDegree
  ) {
    this._interpolationDegree = interpolationDegree;
    valuesChanged = true;
  }

  if (valuesChanged) {
    this._updateTableLength = true;
    this._definitionChanged.raiseEvent(this);
  }
};

/**
 * Adds a new sample.
 *
 * @param {JulianDate} time The sample time.
 * @param {Packable} value The value at the provided time.
 * @param {Packable[]} [derivatives] The array of derivatives at the provided time.
 */
SampledProperty.prototype.addSample = function (time, value, derivatives) {
  const innerDerivativeTypes = this._innerDerivativeTypes;
  const hasDerivatives = defined(innerDerivativeTypes);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  Check.defined("value", value);
  if (hasDerivatives) {
    Check.defined("derivatives", derivatives);
  }
  //>>includeEnd('debug');

  const innerType = this._innerType;
  const data = [];
  data.push(time);
  innerType.pack(value, data, data.length);

  if (hasDerivatives) {
    const derivativesLength = innerDerivativeTypes.length;
    for (let x = 0; x < derivativesLength; x++) {
      innerDerivativeTypes[x].pack(derivatives[x], data, data.length);
    }
  }
  mergeNewSamples(
    undefined,
    this._times,
    this._values,
    data,
    this._packedLength,
  );
  this._updateTableLength = true;
  this._definitionChanged.raiseEvent(this);
};

/**
 * Adds an array of samples.
 *
 * @param {JulianDate[]} times An array of JulianDate instances where each index is a sample time.
 * @param {Packable[]} values The array of values, where each value corresponds to the provided times index.
 * @param {Array[]} [derivativeValues] An array where each item is the array of derivatives at the equivalent time index.
 *
 * @exception {DeveloperError} times and values must be the same length.
 * @exception {DeveloperError} times and derivativeValues must be the same length.
 */
SampledProperty.prototype.addSamples = function (
  times,
  values,
  derivativeValues,
) {
  const innerDerivativeTypes = this._innerDerivativeTypes;
  const hasDerivatives = defined(innerDerivativeTypes);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("times", times);
  Check.defined("values", values);
  if (times.length !== values.length) {
    throw new DeveloperError("times and values must be the same length.");
  }
  if (
    hasDerivatives &&
    (!defined(derivativeValues) || derivativeValues.length !== times.length)
  ) {
    throw new DeveloperError(
      "times and derivativeValues must be the same length.",
    );
  }
  //>>includeEnd('debug');

  const innerType = this._innerType;
  const length = times.length;
  const data = [];
  for (let i = 0; i < length; i++) {
    data.push(times[i]);
    innerType.pack(values[i], data, data.length);

    if (hasDerivatives) {
      const derivatives = derivativeValues[i];
      const derivativesLength = innerDerivativeTypes.length;
      for (let x = 0; x < derivativesLength; x++) {
        innerDerivativeTypes[x].pack(derivatives[x], data, data.length);
      }
    }
  }
  mergeNewSamples(
    undefined,
    this._times,
    this._values,
    data,
    this._packedLength,
  );
  this._updateTableLength = true;
  this._definitionChanged.raiseEvent(this);
};

/**
 * Retrieves the time of the provided sample associated with the index. A negative index accesses the list of samples in reverse order.
 *
 * @param {number} index The index of samples list.
 * @returns {JulianDate | undefined} The JulianDate time of the sample, or undefined if failed.
 */
SampledProperty.prototype.getSample = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  const times = this._times;
  const len = times.length;
  if (!defined(len)) {
    return undefined;
  }

  if (index < 0) {
    index += len;
  }

  return times[index];
};

/**
 * Adds samples as a single packed array where each new sample is represented as a date,
 * followed by the packed representation of the corresponding value and derivatives.
 *
 * @param {number[]} packedSamples The array of packed samples.
 * @param {JulianDate} [epoch] If any of the dates in packedSamples are numbers, they are considered an offset from this epoch, in seconds.
 */
SampledProperty.prototype.addSamplesPackedArray = function (
  packedSamples,
  epoch,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("packedSamples", packedSamples);
  //>>includeEnd('debug');

  mergeNewSamples(
    epoch,
    this._times,
    this._values,
    packedSamples,
    this._packedLength,
  );
  this._updateTableLength = true;
  this._definitionChanged.raiseEvent(this);
};

/**
 * Removes a sample at the given time, if present.
 *
 * @param {JulianDate} time The sample time.
 * @returns {boolean} <code>true</code> if a sample at time was removed, <code>false</code> otherwise.
 */
SampledProperty.prototype.removeSample = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  //>>includeEnd('debug');

  const index = binarySearch(this._times, time, JulianDate.compare);
  if (index < 0) {
    return false;
  }
  removeSamples(this, index, 1);
  return true;
};

function removeSamples(property, startIndex, numberToRemove) {
  const packedLength = property._packedLength;
  property._times.splice(startIndex, numberToRemove);
  property._values.splice(
    startIndex * packedLength,
    numberToRemove * packedLength,
  );
  property._updateTableLength = true;
  property._definitionChanged.raiseEvent(property);
}

/**
 * Removes all samples for the given time interval.
 *
 * @param {TimeInterval} time The time interval for which to remove all samples.
 */
SampledProperty.prototype.removeSamples = function (timeInterval) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("timeInterval", timeInterval);
  //>>includeEnd('debug');

  const times = this._times;
  let startIndex = binarySearch(times, timeInterval.start, JulianDate.compare);
  if (startIndex < 0) {
    startIndex = ~startIndex;
  } else if (!timeInterval.isStartIncluded) {
    ++startIndex;
  }
  let stopIndex = binarySearch(times, timeInterval.stop, JulianDate.compare);
  if (stopIndex < 0) {
    stopIndex = ~stopIndex;
  } else if (timeInterval.isStopIncluded) {
    ++stopIndex;
  }

  removeSamples(this, startIndex, stopIndex - startIndex);
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
SampledProperty.prototype.equals = function (other) {
  if (this === other) {
    return true;
  }
  if (!defined(other)) {
    return false;
  }

  if (
    this._type !== other._type || //
    this._interpolationDegree !== other._interpolationDegree || //
    this._interpolationAlgorithm !== other._interpolationAlgorithm
  ) {
    return false;
  }

  const derivativeTypes = this._derivativeTypes;
  const hasDerivatives = defined(derivativeTypes);
  const otherDerivativeTypes = other._derivativeTypes;
  const otherHasDerivatives = defined(otherDerivativeTypes);
  if (hasDerivatives !== otherHasDerivatives) {
    return false;
  }

  let i;
  let length;
  if (hasDerivatives) {
    length = derivativeTypes.length;
    if (length !== otherDerivativeTypes.length) {
      return false;
    }

    for (i = 0; i < length; i++) {
      if (derivativeTypes[i] !== otherDerivativeTypes[i]) {
        return false;
      }
    }
  }

  const times = this._times;
  const otherTimes = other._times;
  length = times.length;

  if (length !== otherTimes.length) {
    return false;
  }

  for (i = 0; i < length; i++) {
    if (!JulianDate.equals(times[i], otherTimes[i])) {
      return false;
    }
  }

  const values = this._values;
  const otherValues = other._values;
  length = values.length;

  //Since time lengths are equal, values length and other length are guaranteed to be equal.
  for (i = 0; i < length; i++) {
    if (values[i] !== otherValues[i]) {
      return false;
    }
  }

  return true;
};

//Exposed for testing.
SampledProperty._mergeNewSamples = mergeNewSamples;
export default SampledProperty;
