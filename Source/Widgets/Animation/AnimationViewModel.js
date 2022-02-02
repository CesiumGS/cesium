import binarySearch from "../../Core/binarySearch.js";
import ClockRange from "../../Core/ClockRange.js";
import ClockStep from "../../Core/ClockStep.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import JulianDate from "../../Core/JulianDate.js";
import knockout from "../../ThirdParty/knockout.js";
import createCommand from "../createCommand.js";
import ToggleButtonViewModel from "../ToggleButtonViewModel.js";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const realtimeShuttleRingAngle = 15;
const maxShuttleRingAngle = 105;

function numberComparator(left, right) {
  return left - right;
}

function getTypicalMultiplierIndex(multiplier, shuttleRingTicks) {
  const index = binarySearch(shuttleRingTicks, multiplier, numberComparator);
  return index < 0 ? ~index : index;
}

function angleToMultiplier(angle, shuttleRingTicks) {
  //Use a linear scale for -1 to 1 between -15 < angle < 15 degrees
  if (Math.abs(angle) <= realtimeShuttleRingAngle) {
    return angle / realtimeShuttleRingAngle;
  }

  const minp = realtimeShuttleRingAngle;
  const maxp = maxShuttleRingAngle;
  let maxv;
  const minv = 0;
  let scale;
  if (angle > 0) {
    maxv = Math.log(shuttleRingTicks[shuttleRingTicks.length - 1]);
    scale = (maxv - minv) / (maxp - minp);
    return Math.exp(minv + scale * (angle - minp));
  }

  maxv = Math.log(-shuttleRingTicks[0]);
  scale = (maxv - minv) / (maxp - minp);
  return -Math.exp(minv + scale * (Math.abs(angle) - minp));
}

function multiplierToAngle(multiplier, shuttleRingTicks, clockViewModel) {
  if (clockViewModel.clockStep === ClockStep.SYSTEM_CLOCK) {
    return realtimeShuttleRingAngle;
  }

  if (Math.abs(multiplier) <= 1) {
    return multiplier * realtimeShuttleRingAngle;
  }

  const fastedMultipler = shuttleRingTicks[shuttleRingTicks.length - 1];
  if (multiplier > fastedMultipler) {
    multiplier = fastedMultipler;
  } else if (multiplier < -fastedMultipler) {
    multiplier = -fastedMultipler;
  }

  const minp = realtimeShuttleRingAngle;
  const maxp = maxShuttleRingAngle;
  let maxv;
  const minv = 0;
  let scale;

  if (multiplier > 0) {
    maxv = Math.log(fastedMultipler);
    scale = (maxv - minv) / (maxp - minp);
    return (Math.log(multiplier) - minv) / scale + minp;
  }

  maxv = Math.log(-shuttleRingTicks[0]);
  scale = (maxv - minv) / (maxp - minp);
  return -((Math.log(Math.abs(multiplier)) - minv) / scale + minp);
}

/**
 * The view model for the {@link Animation} widget.
 * @alias AnimationViewModel
 * @constructor
 *
 * @param {ClockViewModel} clockViewModel The ClockViewModel instance to use.
 *
 * @see Animation
 */
function AnimationViewModel(clockViewModel) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(clockViewModel)) {
    throw new DeveloperError("clockViewModel is required.");
  }
  //>>includeEnd('debug');

  const that = this;
  this._clockViewModel = clockViewModel;
  this._allShuttleRingTicks = [];
  this._dateFormatter = AnimationViewModel.defaultDateFormatter;
  this._timeFormatter = AnimationViewModel.defaultTimeFormatter;

  /**
   * Gets or sets whether the shuttle ring is currently being dragged.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.shuttleRingDragging = false;

  /**
   * Gets or sets whether dragging the shuttle ring should cause the multiplier
   * to snap to the defined tick values rather than interpolating between them.
   * This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.snapToTicks = false;

  knockout.track(this, [
    "_allShuttleRingTicks",
    "_dateFormatter",
    "_timeFormatter",
    "shuttleRingDragging",
    "snapToTicks",
  ]);

  this._sortedFilteredPositiveTicks = [];

  this.setShuttleRingTicks(AnimationViewModel.defaultTicks);

  /**
   * Gets the string representation of the current time.  This property is observable.
   * @type {String}
   */
  this.timeLabel = undefined;
  knockout.defineProperty(this, "timeLabel", function () {
    return that._timeFormatter(that._clockViewModel.currentTime, that);
  });

  /**
   * Gets the string representation of the current date.  This property is observable.
   * @type {String}
   */
  this.dateLabel = undefined;
  knockout.defineProperty(this, "dateLabel", function () {
    return that._dateFormatter(that._clockViewModel.currentTime, that);
  });

  /**
   * Gets the string representation of the current multiplier.  This property is observable.
   * @type {String}
   */
  this.multiplierLabel = undefined;
  knockout.defineProperty(this, "multiplierLabel", function () {
    const clockViewModel = that._clockViewModel;
    if (clockViewModel.clockStep === ClockStep.SYSTEM_CLOCK) {
      return "Today";
    }

    const multiplier = clockViewModel.multiplier;

    //If it's a whole number, just return it.
    if (multiplier % 1 === 0) {
      return multiplier.toFixed(0) + "x";
    }

    //Convert to decimal string and remove any trailing zeroes
    return multiplier.toFixed(3).replace(/0{0,3}$/, "") + "x";
  });

  /**
   * Gets or sets the current shuttle ring angle.  This property is observable.
   * @type {Number}
   */
  this.shuttleRingAngle = undefined;
  knockout.defineProperty(this, "shuttleRingAngle", {
    get: function () {
      return multiplierToAngle(
        clockViewModel.multiplier,
        that._allShuttleRingTicks,
        clockViewModel
      );
    },
    set: function (angle) {
      angle = Math.max(
        Math.min(angle, maxShuttleRingAngle),
        -maxShuttleRingAngle
      );
      const ticks = that._allShuttleRingTicks;

      const clockViewModel = that._clockViewModel;
      clockViewModel.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;

      //If we are at the max angle, simply return the max value in either direction.
      if (Math.abs(angle) === maxShuttleRingAngle) {
        clockViewModel.multiplier =
          angle > 0 ? ticks[ticks.length - 1] : ticks[0];
        return;
      }

      let multiplier = angleToMultiplier(angle, ticks);
      if (that.snapToTicks) {
        multiplier = ticks[getTypicalMultiplierIndex(multiplier, ticks)];
      } else if (multiplier !== 0) {
        const positiveMultiplier = Math.abs(multiplier);

        if (positiveMultiplier > 100) {
          const numDigits = positiveMultiplier.toFixed(0).length - 2;
          const divisor = Math.pow(10, numDigits);
          multiplier = (Math.round(multiplier / divisor) * divisor) | 0;
        } else if (positiveMultiplier > realtimeShuttleRingAngle) {
          multiplier = Math.round(multiplier);
        } else if (positiveMultiplier > 1) {
          multiplier = +multiplier.toFixed(1);
        } else if (positiveMultiplier > 0) {
          multiplier = +multiplier.toFixed(2);
        }
      }
      clockViewModel.multiplier = multiplier;
    },
  });

  this._canAnimate = undefined;
  knockout.defineProperty(this, "_canAnimate", function () {
    const clockViewModel = that._clockViewModel;
    const clockRange = clockViewModel.clockRange;

    if (that.shuttleRingDragging || clockRange === ClockRange.UNBOUNDED) {
      return true;
    }

    const multiplier = clockViewModel.multiplier;
    const currentTime = clockViewModel.currentTime;
    const startTime = clockViewModel.startTime;

    let result = false;
    if (clockRange === ClockRange.LOOP_STOP) {
      result =
        JulianDate.greaterThan(currentTime, startTime) ||
        (currentTime.equals(startTime) && multiplier > 0);
    } else {
      const stopTime = clockViewModel.stopTime;
      result =
        (JulianDate.greaterThan(currentTime, startTime) &&
          JulianDate.lessThan(currentTime, stopTime)) || //
        (currentTime.equals(startTime) && multiplier > 0) || //
        (currentTime.equals(stopTime) && multiplier < 0);
    }

    if (!result) {
      clockViewModel.shouldAnimate = false;
    }
    return result;
  });

  this._isSystemTimeAvailable = undefined;
  knockout.defineProperty(this, "_isSystemTimeAvailable", function () {
    const clockViewModel = that._clockViewModel;
    const clockRange = clockViewModel.clockRange;
    if (clockRange === ClockRange.UNBOUNDED) {
      return true;
    }

    const systemTime = clockViewModel.systemTime;
    return (
      JulianDate.greaterThanOrEquals(systemTime, clockViewModel.startTime) &&
      JulianDate.lessThanOrEquals(systemTime, clockViewModel.stopTime)
    );
  });

  this._isAnimating = undefined;
  knockout.defineProperty(this, "_isAnimating", function () {
    return (
      that._clockViewModel.shouldAnimate &&
      (that._canAnimate || that.shuttleRingDragging)
    );
  });

  const pauseCommand = createCommand(function () {
    const clockViewModel = that._clockViewModel;
    if (clockViewModel.shouldAnimate) {
      clockViewModel.shouldAnimate = false;
    } else if (that._canAnimate) {
      clockViewModel.shouldAnimate = true;
    }
  });

  this._pauseViewModel = new ToggleButtonViewModel(pauseCommand, {
    toggled: knockout.computed(function () {
      return !that._isAnimating;
    }),
    tooltip: "Pause",
  });

  const playReverseCommand = createCommand(function () {
    const clockViewModel = that._clockViewModel;
    const multiplier = clockViewModel.multiplier;
    if (multiplier > 0) {
      clockViewModel.multiplier = -multiplier;
    }
    clockViewModel.shouldAnimate = true;
  });

  this._playReverseViewModel = new ToggleButtonViewModel(playReverseCommand, {
    toggled: knockout.computed(function () {
      return that._isAnimating && clockViewModel.multiplier < 0;
    }),
    tooltip: "Play Reverse",
  });

  const playForwardCommand = createCommand(function () {
    const clockViewModel = that._clockViewModel;
    const multiplier = clockViewModel.multiplier;
    if (multiplier < 0) {
      clockViewModel.multiplier = -multiplier;
    }
    clockViewModel.shouldAnimate = true;
  });

  this._playForwardViewModel = new ToggleButtonViewModel(playForwardCommand, {
    toggled: knockout.computed(function () {
      return (
        that._isAnimating &&
        clockViewModel.multiplier > 0 &&
        clockViewModel.clockStep !== ClockStep.SYSTEM_CLOCK
      );
    }),
    tooltip: "Play Forward",
  });

  const playRealtimeCommand = createCommand(function () {
    that._clockViewModel.clockStep = ClockStep.SYSTEM_CLOCK;
  }, knockout.getObservable(this, "_isSystemTimeAvailable"));

  this._playRealtimeViewModel = new ToggleButtonViewModel(playRealtimeCommand, {
    toggled: knockout.computed(function () {
      return clockViewModel.clockStep === ClockStep.SYSTEM_CLOCK;
    }),
    tooltip: knockout.computed(function () {
      return that._isSystemTimeAvailable
        ? "Today (real-time)"
        : "Current time not in range";
    }),
  });

  this._slower = createCommand(function () {
    const clockViewModel = that._clockViewModel;
    const shuttleRingTicks = that._allShuttleRingTicks;
    const multiplier = clockViewModel.multiplier;
    const index = getTypicalMultiplierIndex(multiplier, shuttleRingTicks) - 1;
    if (index >= 0) {
      clockViewModel.multiplier = shuttleRingTicks[index];
    }
  });

  this._faster = createCommand(function () {
    const clockViewModel = that._clockViewModel;
    const shuttleRingTicks = that._allShuttleRingTicks;
    const multiplier = clockViewModel.multiplier;
    const index = getTypicalMultiplierIndex(multiplier, shuttleRingTicks) + 1;
    if (index < shuttleRingTicks.length) {
      clockViewModel.multiplier = shuttleRingTicks[index];
    }
  });
}

/**
 * Gets or sets the default date formatter used by new instances.
 *
 * @member
 * @type {AnimationViewModel.DateFormatter}
 */
AnimationViewModel.defaultDateFormatter = function (date, viewModel) {
  const gregorianDate = JulianDate.toGregorianDate(date);
  return (
    monthNames[gregorianDate.month - 1] +
    " " +
    gregorianDate.day +
    " " +
    gregorianDate.year
  );
};

/**
 * Gets or sets the default array of known clock multipliers associated with new instances of the shuttle ring.
 * @type {Number[]}
 */
AnimationViewModel.defaultTicks = [
  //
  0.001,
  0.002,
  0.005,
  0.01,
  0.02,
  0.05,
  0.1,
  0.25,
  0.5,
  1.0,
  2.0,
  5.0,
  10.0, //
  15.0,
  30.0,
  60.0,
  120.0,
  300.0,
  600.0,
  900.0,
  1800.0,
  3600.0,
  7200.0,
  14400.0, //
  21600.0,
  43200.0,
  86400.0,
  172800.0,
  345600.0,
  604800.0,
];

/**
 * Gets or sets the default time formatter used by new instances.
 *
 * @member
 * @type {AnimationViewModel.TimeFormatter}
 */
AnimationViewModel.defaultTimeFormatter = function (date, viewModel) {
  const gregorianDate = JulianDate.toGregorianDate(date);
  const millisecond = Math.round(gregorianDate.millisecond);
  if (Math.abs(viewModel._clockViewModel.multiplier) < 1) {
    return (
      gregorianDate.hour.toString().padStart(2, "0") +
      ":" +
      gregorianDate.minute.toString().padStart(2, "0") +
      ":" +
      gregorianDate.second.toString().padStart(2, "0") +
      "." +
      millisecond.toString().padStart(3, "0")
    );
  }
  return (
    gregorianDate.hour.toString().padStart(2, "0") +
    ":" +
    gregorianDate.minute.toString().padStart(2, "0") +
    ":" +
    gregorianDate.second.toString().padStart(2, "0") +
    " UTC"
  );
};

/**
 * Gets a copy of the array of positive known clock multipliers to associate with the shuttle ring.
 *
 * @returns {Number[]} The array of known clock multipliers associated with the shuttle ring.
 */
AnimationViewModel.prototype.getShuttleRingTicks = function () {
  return this._sortedFilteredPositiveTicks.slice(0);
};

/**
 * Sets the array of positive known clock multipliers to associate with the shuttle ring.
 * These values will have negative equivalents created for them and sets both the minimum
 * and maximum range of values for the shuttle ring as well as the values that are snapped
 * to when a single click is made.  The values need not be in order, as they will be sorted
 * automatically, and duplicate values will be removed.
 *
 * @param {Number[]} positiveTicks The list of known positive clock multipliers to associate with the shuttle ring.
 */
AnimationViewModel.prototype.setShuttleRingTicks = function (positiveTicks) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(positiveTicks)) {
    throw new DeveloperError("positiveTicks is required.");
  }
  //>>includeEnd('debug');

  let i;
  let len;
  let tick;

  const hash = {};
  const sortedFilteredPositiveTicks = this._sortedFilteredPositiveTicks;
  sortedFilteredPositiveTicks.length = 0;
  for (i = 0, len = positiveTicks.length; i < len; ++i) {
    tick = positiveTicks[i];
    //filter duplicates
    if (!hash.hasOwnProperty(tick)) {
      hash[tick] = true;
      sortedFilteredPositiveTicks.push(tick);
    }
  }
  sortedFilteredPositiveTicks.sort(numberComparator);

  const allTicks = [];
  for (len = sortedFilteredPositiveTicks.length, i = len - 1; i >= 0; --i) {
    tick = sortedFilteredPositiveTicks[i];
    if (tick !== 0) {
      allTicks.push(-tick);
    }
  }
  Array.prototype.push.apply(allTicks, sortedFilteredPositiveTicks);

  this._allShuttleRingTicks = allTicks;
};

Object.defineProperties(AnimationViewModel.prototype, {
  /**
   * Gets a command that decreases the speed of animation.
   * @memberof AnimationViewModel.prototype
   * @type {Command}
   */
  slower: {
    get: function () {
      return this._slower;
    },
  },

  /**
   * Gets a command that increases the speed of animation.
   * @memberof AnimationViewModel.prototype
   * @type {Command}
   */
  faster: {
    get: function () {
      return this._faster;
    },
  },

  /**
   * Gets the clock view model.
   * @memberof AnimationViewModel.prototype
   *
   * @type {ClockViewModel}
   */
  clockViewModel: {
    get: function () {
      return this._clockViewModel;
    },
  },

  /**
   * Gets the pause toggle button view model.
   * @memberof AnimationViewModel.prototype
   *
   * @type {ToggleButtonViewModel}
   */
  pauseViewModel: {
    get: function () {
      return this._pauseViewModel;
    },
  },

  /**
   * Gets the reverse toggle button view model.
   * @memberof AnimationViewModel.prototype
   *
   * @type {ToggleButtonViewModel}
   */
  playReverseViewModel: {
    get: function () {
      return this._playReverseViewModel;
    },
  },

  /**
   * Gets the play toggle button view model.
   * @memberof AnimationViewModel.prototype
   *
   * @type {ToggleButtonViewModel}
   */
  playForwardViewModel: {
    get: function () {
      return this._playForwardViewModel;
    },
  },

  /**
   * Gets the realtime toggle button view model.
   * @memberof AnimationViewModel.prototype
   *
   * @type {ToggleButtonViewModel}
   */
  playRealtimeViewModel: {
    get: function () {
      return this._playRealtimeViewModel;
    },
  },

  /**
   * Gets or sets the function which formats a date for display.
   * @memberof AnimationViewModel.prototype
   *
   * @type {AnimationViewModel.DateFormatter}
   * @default AnimationViewModel.defaultDateFormatter
   */
  dateFormatter: {
    //TODO:@exception {DeveloperError} dateFormatter must be a function.
    get: function () {
      return this._dateFormatter;
    },
    set: function (dateFormatter) {
      //>>includeStart('debug', pragmas.debug);
      if (typeof dateFormatter !== "function") {
        throw new DeveloperError("dateFormatter must be a function");
      }
      //>>includeEnd('debug');

      this._dateFormatter = dateFormatter;
    },
  },

  /**
   * Gets or sets the function which formats a time for display.
   * @memberof AnimationViewModel.prototype
   *
   * @type {AnimationViewModel.TimeFormatter}
   * @default AnimationViewModel.defaultTimeFormatter
   */
  timeFormatter: {
    //TODO:@exception {DeveloperError} timeFormatter must be a function.
    get: function () {
      return this._timeFormatter;
    },
    set: function (timeFormatter) {
      //>>includeStart('debug', pragmas.debug);
      if (typeof timeFormatter !== "function") {
        throw new DeveloperError("timeFormatter must be a function");
      }
      //>>includeEnd('debug');

      this._timeFormatter = timeFormatter;
    },
  },
});

//Currently exposed for tests.
AnimationViewModel._maxShuttleRingAngle = maxShuttleRingAngle;
AnimationViewModel._realtimeShuttleRingAngle = realtimeShuttleRingAngle;

/**
 * A function that formats a date for display.
 * @callback AnimationViewModel.DateFormatter
 *
 * @param {JulianDate} date The date to be formatted
 * @param {AnimationViewModel} viewModel The AnimationViewModel instance requesting formatting.
 * @returns {String} The string representation of the calendar date portion of the provided date.
 */

/**
 * A function that formats a time for display.
 * @callback AnimationViewModel.TimeFormatter
 *
 * @param {JulianDate} date The date to be formatted
 * @param {AnimationViewModel} viewModel The AnimationViewModel instance requesting formatting.
 * @returns {String} The string representation of the time portion of the provided date.
 */
export default AnimationViewModel;
