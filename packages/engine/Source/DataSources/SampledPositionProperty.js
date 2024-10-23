import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import JulianDate from "../Core/JulianDate.js";
import ReferenceFrame from "../Core/ReferenceFrame.js";
import PositionProperty from "./PositionProperty.js";
import Property from "./Property.js";
import SampledProperty from "./SampledProperty.js";

/**
 * A {@link SampledProperty} which is also a {@link PositionProperty}.
 *
 * @alias SampledPositionProperty
 * @constructor
 *
 * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
 * @param {number} [numberOfDerivatives=0] The number of derivatives that accompany each position; i.e. velocity, acceleration, etc...
 */
function SampledPositionProperty(referenceFrame, numberOfDerivatives) {
  numberOfDerivatives = numberOfDerivatives ?? 0;

  let derivativeTypes;
  if (numberOfDerivatives > 0) {
    derivativeTypes = new Array(numberOfDerivatives);
    for (let i = 0; i < numberOfDerivatives; i++) {
      derivativeTypes[i] = Cartesian3;
    }
  }

  this._numberOfDerivatives = numberOfDerivatives;
  this._property = new SampledProperty(Cartesian3, derivativeTypes);
  this._definitionChanged = new Event();
  this._referenceFrame = referenceFrame ?? ReferenceFrame.FIXED;

  this._property._definitionChanged.addEventListener(function () {
    this._definitionChanged.raiseEvent(this);
  }, this);
}

Object.defineProperties(SampledPositionProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.  A property is considered
   * constant if getValue always returns the same result for the current definition.
   * @memberof SampledPositionProperty.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return this._property.isConstant;
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * The definition is considered to have changed if a call to getValue would return
   * a different result for the same time.
   * @memberof SampledPositionProperty.prototype
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
   * Gets the reference frame in which the position is defined.
   * @memberof SampledPositionProperty.prototype
   * @type {ReferenceFrame}
   * @default ReferenceFrame.FIXED;
   */
  referenceFrame: {
    get: function () {
      return this._referenceFrame;
    },
  },
  /**
   * Gets the degree of interpolation to perform when retrieving a value. Call <code>setInterpolationOptions</code> to set this.
   * @memberof SampledPositionProperty.prototype
   *
   * @type {number}
   * @default 1
   * @readonly
   */
  interpolationDegree: {
    get: function () {
      return this._property.interpolationDegree;
    },
  },
  /**
   * Gets the interpolation algorithm to use when retrieving a value. Call <code>setInterpolationOptions</code> to set this.
   * @memberof SampledPositionProperty.prototype
   *
   * @type {InterpolationAlgorithm}
   * @default LinearApproximation
   * @readonly
   */
  interpolationAlgorithm: {
    get: function () {
      return this._property.interpolationAlgorithm;
    },
  },
  /**
   * The number of derivatives contained by this property; i.e. 0 for just position, 1 for velocity, etc.
   * @memberof SampledPositionProperty.prototype
   *
   * @type {number}
   * @default 0
   */
  numberOfDerivatives: {
    get: function () {
      return this._numberOfDerivatives;
    },
  },
  /**
   * Gets or sets the type of extrapolation to perform when a value
   * is requested at a time after any available samples.
   * @memberof SampledPositionProperty.prototype
   * @type {ExtrapolationType}
   * @default ExtrapolationType.NONE
   */
  forwardExtrapolationType: {
    get: function () {
      return this._property.forwardExtrapolationType;
    },
    set: function (value) {
      this._property.forwardExtrapolationType = value;
    },
  },
  /**
   * Gets or sets the amount of time to extrapolate forward before
   * the property becomes undefined.  A value of 0 will extrapolate forever.
   * @memberof SampledPositionProperty.prototype
   * @type {number}
   * @default 0
   */
  forwardExtrapolationDuration: {
    get: function () {
      return this._property.forwardExtrapolationDuration;
    },
    set: function (value) {
      this._property.forwardExtrapolationDuration = value;
    },
  },
  /**
   * Gets or sets the type of extrapolation to perform when a value
   * is requested at a time before any available samples.
   * @memberof SampledPositionProperty.prototype
   * @type {ExtrapolationType}
   * @default ExtrapolationType.NONE
   */
  backwardExtrapolationType: {
    get: function () {
      return this._property.backwardExtrapolationType;
    },
    set: function (value) {
      this._property.backwardExtrapolationType = value;
    },
  },
  /**
   * Gets or sets the amount of time to extrapolate backward
   * before the property becomes undefined.  A value of 0 will extrapolate forever.
   * @memberof SampledPositionProperty.prototype
   * @type {number}
   * @default 0
   */
  backwardExtrapolationDuration: {
    get: function () {
      return this._property.backwardExtrapolationDuration;
    },
    set: function (value) {
      this._property.backwardExtrapolationDuration = value;
    },
  },
});

const timeScratch = new JulianDate();

/**
 * Gets the position at the provided time.
 *
 * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
 * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3 | undefined} The modified result parameter or a new instance if the result parameter was not supplied.
 */
SampledPositionProperty.prototype.getValue = function (time, result) {
  if (!defined(time)) {
    time = JulianDate.now(timeScratch);
  }
  return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
};

/**
 * Gets the position at the provided time and in the provided reference frame.
 *
 * @param {JulianDate} time The time for which to retrieve the value.
 * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
 * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3 | undefined} The modified result parameter or a new instance if the result parameter was not supplied.
 */
SampledPositionProperty.prototype.getValueInReferenceFrame = function (
  time,
  referenceFrame,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  Check.defined("referenceFrame", referenceFrame);
  //>>includeEnd('debug');

  result = this._property.getValue(time, result);
  if (defined(result)) {
    return PositionProperty.convertToReferenceFrame(
      time,
      result,
      this._referenceFrame,
      referenceFrame,
      result,
    );
  }
  return undefined;
};

/**
 * Sets the algorithm and degree to use when interpolating a position.
 *
 * @param {object} [options] Object with the following properties:
 * @param {InterpolationAlgorithm} [options.interpolationAlgorithm] The new interpolation algorithm.  If undefined, the existing property will be unchanged.
 * @param {number} [options.interpolationDegree] The new interpolation degree.  If undefined, the existing property will be unchanged.
 */
SampledPositionProperty.prototype.setInterpolationOptions = function (options) {
  this._property.setInterpolationOptions(options);
};

/**
 * Adds a new sample.
 *
 * @param {JulianDate} time The sample time.
 * @param {Cartesian3} position The position at the provided time.
 * @param {Cartesian3[]} [derivatives] The array of derivative values at the provided time.
 */
SampledPositionProperty.prototype.addSample = function (
  time,
  position,
  derivatives,
) {
  const numberOfDerivatives = this._numberOfDerivatives;
  //>>includeStart('debug', pragmas.debug);
  if (
    numberOfDerivatives > 0 &&
    (!defined(derivatives) || derivatives.length !== numberOfDerivatives)
  ) {
    throw new DeveloperError(
      "derivatives length must be equal to the number of derivatives.",
    );
  }
  //>>includeEnd('debug');
  this._property.addSample(time, position, derivatives);
};

/**
 * Adds multiple samples via parallel arrays.
 *
 * @param {JulianDate[]} times An array of JulianDate instances where each index is a sample time.
 * @param {Cartesian3[]} positions An array of Cartesian3 position instances, where each value corresponds to the provided time index.
 * @param {Array[]} [derivatives] An array where each value is another array containing derivatives for the corresponding time index.
 *
 * @exception {DeveloperError} All arrays must be the same length.
 */
SampledPositionProperty.prototype.addSamples = function (
  times,
  positions,
  derivatives,
) {
  this._property.addSamples(times, positions, derivatives);
};

/**
 * Adds samples as a single packed array where each new sample is represented as a date,
 * followed by the packed representation of the corresponding value and derivatives.
 *
 * @param {number[]} packedSamples The array of packed samples.
 * @param {JulianDate} [epoch] If any of the dates in packedSamples are numbers, they are considered an offset from this epoch, in seconds.
 */
SampledPositionProperty.prototype.addSamplesPackedArray = function (
  packedSamples,
  epoch,
) {
  this._property.addSamplesPackedArray(packedSamples, epoch);
};

/**
 * Removes a sample at the given time, if present.
 *
 * @param {JulianDate} time The sample time.
 * @returns {boolean} <code>true</code> if a sample at time was removed, <code>false</code> otherwise.
 */
SampledPositionProperty.prototype.removeSample = function (time) {
  return this._property.removeSample(time);
};

/**
 * Removes all samples for the given time interval.
 *
 * @param {TimeInterval} time The time interval for which to remove all samples.
 */
SampledPositionProperty.prototype.removeSamples = function (timeInterval) {
  this._property.removeSamples(timeInterval);
};

/**
 * Compares this property to the provided property and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Property} [other] The other property.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
SampledPositionProperty.prototype.equals = function (other) {
  return (
    this === other || //
    (other instanceof SampledPositionProperty &&
      Property.equals(this._property, other._property) && //
      this._referenceFrame === other._referenceFrame)
  );
};
export default SampledPositionProperty;
