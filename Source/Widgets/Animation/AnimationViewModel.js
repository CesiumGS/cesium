/*global define*/
define([
        '../createCommand',
        '../ToggleButtonViewModel',
        '../../Core/binarySearch',
        '../../Core/ClockStep',
        '../../Core/ClockRange',
        '../../Core/Color',
        '../../Core/DeveloperError',
        '../../Core/JulianDate',
        '../../Core/defaultValue',
        '../../ThirdParty/sprintf',
        '../../ThirdParty/knockout'
    ], function(
        createCommand,
        ToggleButtonViewModel,
        binarySearch,
        ClockStep,
        ClockRange,
        Color,
        DeveloperError,
        JulianDate,
        defaultValue,
        sprintf,
        knockout) {
    "use strict";

    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var realtimeShuttleRingAngle = 15;
    var maxShuttleRingAngle = 105;

    function cancelRealtime(clockViewModel) {
        if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK) {
            clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
            clockViewModel.multiplier(1);
        }
    }

    function unpause(clockViewModel) {
        cancelRealtime(clockViewModel);
        clockViewModel.shouldAnimate(true);
    }

    function numberComparator(left, right) {
        return left - right;
    }

    function getTypicalMultiplierIndex(multiplier, shuttleRingTicks) {
        var index = binarySearch(shuttleRingTicks, multiplier, numberComparator);
        return index < 0 ? ~index : index;
    }

    function angleToMultiplier(angle, shuttleRingTicks) {
        //Use a linear scale for -1 to 1 between -15 < angle < 15 degrees
        if (Math.abs(angle) <= realtimeShuttleRingAngle) {
            return angle / realtimeShuttleRingAngle;
        }

        var minp = realtimeShuttleRingAngle;
        var maxp = maxShuttleRingAngle;
        var maxv;
        var minv = 0;
        var scale;
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
        if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK) {
            return realtimeShuttleRingAngle;
        }

        if (Math.abs(multiplier) <= 1) {
            return multiplier * realtimeShuttleRingAngle;
        }

        var minp = realtimeShuttleRingAngle;
        var maxp = maxShuttleRingAngle;
        var maxv;
        var minv = 0;
        var scale;

        if (multiplier > 0) {
            maxv = Math.log(shuttleRingTicks[shuttleRingTicks.length - 1]);
            scale = (maxv - minv) / (maxp - minp);
            return (Math.log(multiplier) - minv) / scale + minp;
        }

        maxv = Math.log(-shuttleRingTicks[0]);
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
     * @exception {DeveloperError} clockViewModel is required.
     *
     * @see Animation
     */
    var AnimationViewModel = function(clockViewModel) {
        if (typeof clockViewModel === 'undefined') {
            throw new DeveloperError('clockViewModel is required.');
        }

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
            var clockViewModel = that.clockViewModel;
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
                clockViewModel.shouldAnimate(false);
            }
            return result;
        });

        this._isSystemTimeAvailable = knockout.computed(function() {
            var clockViewModel = that.clockViewModel;
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
            return that._timeFormatter()(that.clockViewModel.currentTime(), that);
        });

        /**
         * The string representation of the current date.
         * @type Observable
         */
        this.dateLabel = knockout.computed(function() {
            return that._dateFormatter()(that.clockViewModel.currentTime(), that);
        });

        /**
         * The string representation of the current multiplier.
         * @type Observable
         */
        this.multiplierLabel = knockout.computed(function() {
            var clockViewModel = that.clockViewModel;
            if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK) {
                return 'Today';
            }

            var multiplier = clockViewModel.multiplier();

            //If it's a whole number, just return it.
            if (multiplier % 1 === 0) {
                return multiplier.toFixed(0) + 'x';
            }

            //Convert to decimal string and remove any trailing zeroes
            return multiplier.toFixed(3).replace(/0{0,3}$/, "") + 'x';
        });

        /**
         * The pause toggle button.
         * @type ToggleButtonViewModel
         */
        this.pauseViewModel = new ToggleButtonViewModel({
            toggled : knockout.computed(function() {
                return !that._isAnimatingObs();
            }),
            tooltip : knockout.observable('Pause'),
            command : createCommand(function() {
                var clockViewModel = that.clockViewModel;
                if (clockViewModel.shouldAnimate()) {
                    cancelRealtime(clockViewModel);
                    clockViewModel.shouldAnimate(false);
                } else if (that._canAnimate()) {
                    unpause(clockViewModel);
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
            tooltip : knockout.observable('Play Reverse'),
            command : createCommand(function() {
                var clockViewModel = that.clockViewModel;
                cancelRealtime(clockViewModel);
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
            tooltip : knockout.observable('Play Forward'),
            command : createCommand(function() {
                var clockViewModel = that.clockViewModel;
                cancelRealtime(clockViewModel);
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
            tooltip : knockout.computed(function() {
                if (that._isSystemTimeAvailable()) {
                    return 'Today (real-time)';
                }
                return 'Current time not in range';
            }),
            command : createCommand(function() {
                var clockViewModel = that.clockViewModel;
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
         * A boolean observable indicating if dragging the shuttle ring should cause the multiplier
         * to snap to the defined tick values rather than interpolating between them.
         * @type Observable
         * @default false
         */
        this.snapToTicks = knockout.observable(false);

        /**
         * The current shuttle ring Angle.
         * @type Observable
         */
        this.shuttleRingAngle = knockout.computed({
            read : function() {
                return multiplierToAngle(clockViewModel.multiplier(), that._shuttleRingTicks(), clockViewModel);
            },
            write : function(angle) {
                angle = Math.max(Math.min(angle, maxShuttleRingAngle), -maxShuttleRingAngle);
                var ticks = that._shuttleRingTicks();

                var clockViewModel = that.clockViewModel;
                clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK_MULTIPLIER);

                //If we are at the max angle, simply return the max value in either direction.
                if (Math.abs(angle) === maxShuttleRingAngle) {
                    clockViewModel.multiplier(angle > 0 ? ticks[ticks.length - 1] : ticks[0]);
                    return;
                }

                var multiplier = angleToMultiplier(angle, ticks);
                if (that.snapToTicks()) {
                    multiplier = ticks[getTypicalMultiplierIndex(multiplier, ticks)];
                } else {
                    if (multiplier !== 0) {
                        var positiveMultiplier = Math.abs(multiplier);

                        if (positiveMultiplier > 100) {
                            var numDigits = positiveMultiplier.toFixed(0).length - 2;
                            var divisor = Math.pow(10, numDigits);
                            multiplier = (Math.round(multiplier / divisor) * divisor) | 0;
                        } else if (positiveMultiplier > realtimeShuttleRingAngle) {
                            multiplier = Math.round(multiplier);
                        } else if (positiveMultiplier > 1) {
                            multiplier = +multiplier.toFixed(1);
                        } else if (positiveMultiplier > 0) {
                            multiplier = +multiplier.toFixed(2);
                        }
                    }
                }
                clockViewModel.multiplier(multiplier);
            }
        });

        /**
         * The command to decrease the speed of animation.
         * @type Command
         */
        this.slower = createCommand(function() {
            var clockViewModel = that.clockViewModel;
            cancelRealtime(clockViewModel);
            var shuttleRingTicks = that._shuttleRingTicks();
            var multiplier = clockViewModel.multiplier();
            var index = getTypicalMultiplierIndex(multiplier, shuttleRingTicks) - 1;
            if (index >= 0) {
                clockViewModel.multiplier(shuttleRingTicks[index]);
            }
        });

        /**
         * The command to increase the speed of animation.
         * @type Command
         */
        this.faster = createCommand(function() {
            var clockViewModel = that.clockViewModel;
            cancelRealtime(clockViewModel);
            var shuttleRingTicks = that._shuttleRingTicks();
            var multiplier = clockViewModel.multiplier();
            var index = getTypicalMultiplierIndex(multiplier, shuttleRingTicks) + 1;
            if (index < shuttleRingTicks.length) {
                clockViewModel.multiplier(shuttleRingTicks[index]);
            }
        });
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
        return monthNames[gregorianDate.month - 1] + ' ' + gregorianDate.day + ' ' + gregorianDate.year;
    };

    /**
     * Gets or sets the default array of known clock multipliers associated with new instances of the shuttle ring.
     * @memberof AnimationViewModel
     */
    AnimationViewModel.defaultTicks = [//
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
     * Sets the array of positive known clock multipliers to associate with the shuttle ring.
     * These values will have negative equivalents created for them and sets both the minimum
     * and maximum range of values for the shuttle ring as well as the values that are snapped
     * to when a single click is made.  The values need not be in order, as they will be sorted
     * automatically.
     * @memberof AnimationViewModel
     *
     * @param positiveTicks The list of known positive clock multipliers to associate with the shuttle ring.
     *
     * @exception {DeveloperError} positiveTicks is required.
     */
    AnimationViewModel.prototype.setShuttleRingTicks = function(positiveTicks) {
        if (typeof positiveTicks === 'undefined') {
            throw new DeveloperError('positiveTicks is required.');
        }
        var len = positiveTicks.length;
        var ticks = [];
        for ( var iPos = 0; iPos < len; iPos++) {
            var tick = positiveTicks[iPos];
            ticks.push(tick);
            if (tick !== 0) {
                ticks.push(-tick);
            }
        }
        ticks.sort(numberComparator);
        this._shuttleRingTicks(ticks);
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
    };

    //Currently exposed for tests.
    AnimationViewModel._maxShuttleRingAngle = maxShuttleRingAngle;
    AnimationViewModel._realtimeShuttleRingAngle = realtimeShuttleRingAngle;

    return AnimationViewModel;
});