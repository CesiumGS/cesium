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
        '../ThirdParty/knockout-2.2.1'
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
    var _maxShuttleRingAngle = 105;
    var _shuttleRingTicks = [];

    //TODO: Make _shuttleRingTicks part of AnimationViewModel and user settable.
    var positiveTicks = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0,//
                         15.0, 30.0, 60.0, 120.0, 300.0, 600.0, 900.0, 1800.0, 3600.0, 7200.0, 14400.0,//
                         21600.0, 43200.0, 86400.0, 172800.0, 345600.0, 604800.0];
    var tickIndex;
    var len = positiveTicks.length;
    for (tickIndex = len - 1; tickIndex >= 0; tickIndex--) {
        _shuttleRingTicks.push(-positiveTicks[tickIndex]);
    }
    for (tickIndex = 0; tickIndex < len; tickIndex++) {
        _shuttleRingTicks.push(positiveTicks[tickIndex]);
    }

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

    function _getTypicalSpeedIndex(speed) {
        var index = binarySearch(_shuttleRingTicks, speed, numberComparator);
        return index < 0 ? ~index : index;
    }

    function angle2Multiplier(angle) {
        //If the angle is less than 1, just use it for the position
        if (Math.abs(angle) < 1) {
            return angle;
        }

        var minp = 1;
        var maxp = _maxShuttleRingAngle;
        var maxv;
        var minv = 0;
        var scale;

        if (angle > 0) {
            maxv = Math.log(_shuttleRingTicks[_shuttleRingTicks.length - 1]);
            scale = (maxv - minv) / (maxp - minp);
            return Math.exp(minv + scale * (angle - minp));
        }

        maxv = Math.log(-_shuttleRingTicks[0]);
        scale = (maxv - minv) / (maxp - minp);
        return -Math.exp(minv + scale * (Math.abs(angle) - minp));
    }

    function multiplier2Angle(multiplier) {
        if (Math.abs(multiplier) < 1) {
            return multiplier;
        }

        var minp = 1;
        var maxp = _maxShuttleRingAngle;
        var maxv;
        var minv = 0;
        var scale;

        if (multiplier > 0) {
            maxv = Math.log(_shuttleRingTicks[_shuttleRingTicks.length - 1]);
            scale = (maxv - minv) / (maxp - minp);
            return (Math.log(multiplier) - minv) / scale + minp;
        }

        maxv = Math.log(-_shuttleRingTicks[0]);
        scale = (maxv - minv) / (maxp - minp);
        return -((Math.log(Math.abs(multiplier)) - minv) / scale + minp);
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
         * The string representation of the current speed.
         * @type Observable
         */
        this.speedLabel = knockout.computed(function() {
            if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK) {
                return 'Today';
            }

            var multiplier = clockViewModel.multiplier();
            if (multiplier % 1 === 0) {
                return multiplier + 'x';
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
                return Math.round(multiplier2Angle(multiplier));
            },
            write : function(angle) {
                angle = Math.max(Math.min(angle, _maxShuttleRingAngle), -_maxShuttleRingAngle);
                var speed = angle2Multiplier(angle);
                if (speed !== 0) {
                    if (Math.abs(speed) > 1) {
                        speed = Math.round(speed);
                    }
                    clockViewModel.multiplier(speed);
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
                var multiplier = clockViewModel.multiplier();
                var index = _getTypicalSpeedIndex(multiplier) - 1;
                if (index >= 0) {
                    clockViewModel.multiplier(_shuttleRingTicks[index]);
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
                var multiplier = clockViewModel.multiplier();
                var index = _getTypicalSpeedIndex(multiplier) + 1;
                if (index < _shuttleRingTicks.length) {
                    clockViewModel.multiplier(_shuttleRingTicks[index]);
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
    AnimationViewModel._shuttleRingTicks = _shuttleRingTicks;
    AnimationViewModel._maxShuttleRingAngle = _maxShuttleRingAngle;

    return AnimationViewModel;
});
