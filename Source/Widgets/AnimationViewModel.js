/*global define*/
define(['./Command',
        './ToggleButtonViewModel',
        '../Core/DeveloperError',
        '../Core/binarySearch',
        '../Core/ClockStep',
        '../Core/ClockRange',
        '../Core/Color',
        '../Core/JulianDate',
        '../Core/defaultValue',
        '../ThirdParty/sprintf',
        '../ThirdParty/knockout'
        ], function(
         Command,
         ToggleButtonViewModel,
         DeveloperError,
         binarySearch,
         ClockStep,
         ClockRange,
         Color,
         JulianDate,
         defaultValue,
         sprintf,
         knockout) {
    "use strict";

    var _monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var _realtimeShuttleRingAngle = 15;
    var _maxShuttleRingAngle = 105;

    function _cancelRealtime(clockViewModel) {
        if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK) {
            clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
            clockViewModel.multiplier(1);
        }
    }

    function _unpause(clockViewModel) {
        _cancelRealtime(clockViewModel);
        clockViewModel.shouldAnimate(true);
    }

    function numberComparator(left, right) {
        return left - right;
    }

    function _getTypicalMultiplierIndex(multiplier, shuttleRingTicks) {
        var index = binarySearch(shuttleRingTicks, multiplier, numberComparator);
        return index < 0 ? ~index : index;
    }

    function angle2Multiplier(angle, shuttleRingTicks) {
        var minp = _realtimeShuttleRingAngle;
        var maxp = _maxShuttleRingAngle;
        var maxv = Math.log(shuttleRingTicks[shuttleRingTicks.length - 1]);
        var minv = 0;
        var scale = (maxv - minv) / (maxp - minp);
        var speed = Math.exp(minv + scale * (Math.abs(angle) - minp));

        if (speed > 1e-8) {
            var round = Math.pow(10, Math.floor((Math.log(speed) / Math.LN10) + 0.0001) - 1);
            speed = Math.round(speed / round) * round;
            if (speed > 10) {
                speed = Math.round(speed);
            }
        }
        if (angle < 0) {
            speed = -speed;
        }
        return speed;
    }

    function multiplier2Angle(multiplier, shuttleRingTicks) {
        var minp = _realtimeShuttleRingAngle;
        var maxp = _maxShuttleRingAngle;
        var maxv = Math.log(shuttleRingTicks[shuttleRingTicks.length - 1]);
        var minv = 0;
        var scale = (maxv - minv) / (maxp - minp);
        var angle = Math.max(1, (Math.log(Math.abs(multiplier)) - minv) / scale + minp);

        if (multiplier < 0) {
            angle = -angle;
        }
        return angle;
    }

    /**
     * The ViewModel for the {@link Animation} widget.
     * @alias AnimationViewModel
     * @constructor
     *
     * @param {ClockViewModel} [clockViewModel] The ClockViewModel instance to use.
     *
     * @see Animation
     */
    var AnimationViewModel = function(clockViewModel) {
        var that = this;

        /**
         * The ClockViewModel instance to use.
         * @type ClockViewModel
         */
        this.clockViewModel = clockViewModel;

        /**
         * Indicates if the shuttle ring is currently being dragged.
         * @type Observable
         */
        this.shuttleRingDragging = knockout.observable(false);

        this._shuttleRingTicks = knockout.observable();
        this.setShuttleRingTicks(AnimationViewModel.defaultTicks);

        this._dateFormatter = knockout.observable(AnimationViewModel.defaultDateFormatter);
        this._timeFormatter = knockout.observable(AnimationViewModel.defaultTimeFormatter);

        this._canAnimate = knockout.computed(function() {
            var clockRange = clockViewModel.clockRange();

            if (that.shuttleRingDragging() || clockRange === ClockRange.UNBOUNDED) {
                return true;
            }

            var multiplier = clockViewModel.multiplier();
            var currentTime = clockViewModel.currentTime();
            var startTime = clockViewModel.startTime();

            var result = false;
            if (clockRange === ClockRange.LOOP_STOP) {
                result = currentTime.greaterThan(startTime) || (currentTime.equals(startTime) && multiplier > 0);
            } else {
                var stopTime = clockViewModel.stopTime();
                result = (currentTime.greaterThan(startTime) && currentTime.lessThan(stopTime)) || //
                         (currentTime.equals(startTime) && multiplier > 0) || //
                         (currentTime.equals(stopTime) && multiplier < 0);
            }

            if (!result) {
                that.clockViewModel.shouldAnimate(false);
            }
            return result;
        });

        this._isSystemTimeAvailable = knockout.computed(function() {
            var clockRange = clockViewModel.clockRange();
            if (clockRange === ClockRange.UNBOUNDED) {
                return true;
            }

            var systemTime = clockViewModel.systemTime();
            var startTime = clockViewModel.startTime();
            var stopTime = clockViewModel.stopTime();
            return systemTime.greaterThanOrEquals(startTime) && systemTime.lessThanOrEquals(stopTime);
        });

        this._isAnimatingObs = knockout.computed(function() {
            return that.clockViewModel.shouldAnimate() && (that._canAnimate() || that.shuttleRingDragging());
        });

        /**
         * The string representation of the current time.
         * @type Observable
         */
        this.timeLabel = knockout.computed(function() {
            return that._timeFormatter()(clockViewModel.currentTime(), that);
        });

        /**
         * The string representation of the current date.
         * @type Observable
         */
        this.dateLabel = knockout.computed(function() {
            return that._dateFormatter()(clockViewModel.currentTime(), that);
        });

        /**
         * The string representation of the current multiplier.
         * @type Observable
         */
        this.multiplierLabel = knockout.computed(function() {
            if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK) {
                return 'Today';
            }

            var multiplier = clockViewModel.multiplier();
            var positiveMultiplier = Math.abs(multiplier);
            if (positiveMultiplier >= 10 || multiplier % 1 === 0) {
                return multiplier.toFixed(0) + 'x';
            }
            if (positiveMultiplier >= 1) {
                return multiplier.toFixed(1) + 'x';
            }
            if (positiveMultiplier >= 0.1) {
                return multiplier.toFixed(2) + 'x';
            }
            return multiplier.toFixed(3) + 'x';
        });

        /**
         * The pause toggle button.
         * @type ToggleButtonViewModel
         */
        this.pauseViewModel = new ToggleButtonViewModel({
            toggled : knockout.computed(function() {
                return !that._isAnimatingObs();
            }),
            toolTip : knockout.observable('Pause'),
            command : new Command(function() {
                if (that.clockViewModel.shouldAnimate()) {
                    _cancelRealtime(that.clockViewModel);
                    that.clockViewModel.shouldAnimate(false);
                } else if (that._canAnimate()) {
                    _unpause(that.clockViewModel);
                }
            })
        });

        /**
         * The reverse toggle button.
         * @type ToggleButtonViewModel
         */
        this.playReverseViewModel = new ToggleButtonViewModel({
            toggled : knockout.computed(function() {
                return that._isAnimatingObs() && (clockViewModel.multiplier() < 0);
            }),
            toolTip : knockout.observable('Play Reverse'),
            command : new Command(function() {
                _cancelRealtime(clockViewModel);
                var multiplier = clockViewModel.multiplier();
                if (multiplier > 0) {
                    clockViewModel.multiplier(-multiplier);
                }
                clockViewModel.shouldAnimate(true);
            })
        });

        /**
         * The play toggle button.
         * @type ToggleButtonViewModel
         */
        this.playForwardViewModel = new ToggleButtonViewModel({
            toggled : knockout.computed(function() {
                return that._isAnimatingObs() && clockViewModel.multiplier() > 0 && clockViewModel.clockStep() !== ClockStep.SYSTEM_CLOCK;
            }),
            toolTip : knockout.observable('Play Forward'),
            command : new Command(function() {
                _cancelRealtime(clockViewModel);
                var multiplier = clockViewModel.multiplier();
                if (multiplier < 0) {
                    clockViewModel.multiplier(-multiplier);
                }
                clockViewModel.shouldAnimate(true);
            })
        });

        /**
         * The realtime toggle button.
         * @type ToggleButtonViewModel
         */
        this.playRealtimeViewModel = new ToggleButtonViewModel({
            toggled : knockout.computed(function() {
                return clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK;
            }),
            toolTip : knockout.computed(function() {
                if (that._isSystemTimeAvailable()) {
                    return 'Today (real-time)';
                }
                return 'Current time not in range';
            }),
            command : new Command(function() {
                if (clockViewModel.clockStep() !== ClockStep.SYSTEM_CLOCK) {
                    if (that._isSystemTimeAvailable()) {
                        clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK);
                        clockViewModel.multiplier(1.0);
                        that.clockViewModel.shouldAnimate(true);
                    }
                }
            }, knockout.computed(function() {
                return that._isSystemTimeAvailable();
            }))
        });

        /**
         * The current shuttle ring Angle.
         * @type Observable
         */
        this.shuttleRingAngle = knockout.computed({
            read : function() {
                var multiplier = clockViewModel.clockStep() !== ClockStep.SYSTEM_CLOCK ? clockViewModel.multiplier() : 1.0;
                return Math.round(multiplier2Angle(multiplier, that._shuttleRingTicks()));
            },
            write : function(angle) {
                angle = Math.max(Math.min(angle, _maxShuttleRingAngle), -_maxShuttleRingAngle);
                var multiplier = angle2Multiplier(angle, that._shuttleRingTicks());
                if (multiplier !== 0) {
                    clockViewModel.multiplier(multiplier);
                    clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
                }
            }
        });

        /**
         * The command to decrease the speed of animation.
         * @type Command
         */
        this.slower = {
            canExecute : true,
            execute : function() {
                _cancelRealtime(that.clockViewModel);
                var clockViewModel = that.clockViewModel;
                var shuttleRingTicks = that._shuttleRingTicks();
                var multiplier = clockViewModel.multiplier();
                var index = _getTypicalMultiplierIndex(multiplier, shuttleRingTicks) - 1;
                if (index >= 0) {
                    clockViewModel.multiplier(shuttleRingTicks[index]);
                }
            }
        };

        /**
         * The command to increase the speed of animation.
         * @type Command
         */
        this.faster = {
            canExecute : true,
            execute : function() {
                _cancelRealtime(that.clockViewModel);
                var clockViewModel = that.clockViewModel;
                var shuttleRingTicks = that._shuttleRingTicks();
                var multiplier = clockViewModel.multiplier();
                var index = _getTypicalMultiplierIndex(multiplier, shuttleRingTicks) + 1;
                if (index < shuttleRingTicks.length) {
                    clockViewModel.multiplier(shuttleRingTicks[index]);
                }
            }
        };
    };

    /**
     * The default date formatter used by new instances.
     * @memberof AnimationViewModel
     *
     * @param {JulianDate} date The date to be formatted
     * @param {AnimationViewModel} viewModel The AnimationViewModel instsance requesting formatting.
     * @returns {String} The string representation of the calendar date portion of the provided date.
     */
    AnimationViewModel.defaultDateFormatter = function(date, viewModel) {
        var gregorianDate = date.toGregorianDate();
        return _monthNames[gregorianDate.month - 1] + ' ' + gregorianDate.day + ' ' + gregorianDate.year;
    };

    /**
     * @memberof AnimationViewModel
     * @returns The default array of known clock multipliers associated with new instances of the shuttle ring.
     */
    AnimationViewModel.defaultTicks = [//
    -0.001, -0.002, -0.005, -0.01, -0.02, -0.05, -0.1, -0.25, -0.5, -1.0, -2.0, -5.0, -10.0,//
    -15.0, -30.0, -60.0, -120.0, -300.0, -600.0, -900.0, -1800.0, -3600.0, -7200.0, -14400.0,//
    -21600.0, -43200.0, -86400.0, -172800.0, -345600.0, -604800.0,//
    0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0,//
    15.0, 30.0, 60.0, 120.0, 300.0, 600.0, 900.0, 1800.0, 3600.0, 7200.0, 14400.0,//
    21600.0, 43200.0, 86400.0, 172800.0, 345600.0, 604800.0];

    /**
     * @memberof AnimationViewModel
     * @returns The array of known clock multipliers associated with the shuttle ring.
     */
    AnimationViewModel.prototype.getShuttleRingTicks = function() {
        return this._shuttleRingTicks();
    };

    /**
     * Sets the array of known clock multipliers to associate with the shuttle ring.
     * This sets both the minimum and maximum range of values for the shuttle ring as well
     * as the values that are snapped to when a single click is made.  The values need
     * not be in order, as they will be sorted automatically.
     * @memberof AnimationViewModel
     *
     * @param ticks The list of known clock multipliers to associate with the shuttle ring.
     *
     * @exception {DeveloperError} ticks is required.
     */
    AnimationViewModel.prototype.setShuttleRingTicks = function(ticks) {
        if (typeof ticks === 'undefined') {
            throw new DeveloperError('ticks is required.');
        }
        var copy = ticks.slice(0);
        copy.sort(numberComparator);
        this._shuttleRingTicks(copy);
    };

    /**
     * The default time formatter used by new instances.
     * @memberof AnimationViewModel
     *
     * @param {JulianDate} date The date to be formatted
     * @param {AnimationViewModel} viewModel The AnimationViewModel instsance requesting formatting.
     * @returns {String} The string representation of the time portion of the provided date.
     */
    AnimationViewModel.defaultTimeFormatter = function(date, viewModel) {
        var gregorianDate = date.toGregorianDate();
        var millisecond = Math.round(gregorianDate.millisecond);
        if (Math.abs(viewModel.clockViewModel.multiplier()) < 1) {
            return sprintf("%02d:%02d:%02d.%03d", gregorianDate.hour, gregorianDate.minute, gregorianDate.second, millisecond);
        }
        return sprintf("%02d:%02d:%02d UTC", gregorianDate.hour, gregorianDate.minute, gregorianDate.second);
    };

    /**
     * @memberof AnimationViewModel
     * @returns {Function} The current date format function.
     */
    AnimationViewModel.prototype.getDateFormatter = function() {
        return this._dateFormatter();
    };

    /**
     * Sets the current date format function.
     * @memberof AnimationViewModel
     *
     * @param {Function} dateFormatter A function which takes a
     * {@link JulianDate} and an AnimationViewModel instance and
     * returns a string representation of the calendar date portion.
     *
     * @exception {DeveloperError} timeFormatter must be a function.
     */
    AnimationViewModel.prototype.setDateFormatter = function(dateFormatter) {
        if (typeof dateFormatter !== 'function') {
            throw new DeveloperError('dateFormatter must be a function');
        }
        this._dateFormatter(dateFormatter);
        this._dateFormatter.notifySubscribers();
    };

    /**
     * @memberof AnimationViewModel
     * @returns {Function} The current time format function.
     */
    AnimationViewModel.prototype.getTimeFormatter = function() {
        return this._timeFormatter();
    };

    /**
     * Sets the current time format function.
     * @memberof AnimationViewModel
     *
     * @param {Function} timeFormatter A function which takes a
     * {@link JulianDate} and an AnimationViewModel instance and
     * returns a string representation of the time portion.
     *
     * @exception {DeveloperError} timeFormatter must be a function.
     */
    AnimationViewModel.prototype.setTimeFormatter = function(timeFormatter) {
        if (typeof timeFormatter !== 'function') {
            throw new DeveloperError('timeFormatter must be a function.');
        }
        this._timeFormatter(timeFormatter);
        this._timeFormatter.notifySubscribers();
    };

    //Currently exposed for tests.
    AnimationViewModel._maxShuttleRingAngle = _maxShuttleRingAngle;

    return AnimationViewModel;
});
