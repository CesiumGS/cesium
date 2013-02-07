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
    var positiveTicks = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0,//
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
        if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK_TIME) {
            clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
            clockViewModel.multiplier(1);
        }
    }

    function _unpause(viewModel) {
        _cancelRealtime(viewModel.clockViewModel);
        viewModel.clockViewModel.currentTime(viewModel.clockViewModel.clock.tick(0));
        viewModel._shouldAnimate(true);
    }

    function _getTypicalSpeedIndex(speed) {
        var index = binarySearch(_shuttleRingTicks, speed, binarySearch.numericComparator);
        return index < 0 ? ~index : index;
    }

    var AnimationViewModel = function(clockViewModel) {
        this.clockViewModel = clockViewModel;

        var that = this;

        this._dateFormatter = knockout.observable(function(date) {
            var gregorianDate = date.toGregorianDate();
            return _monthNames[gregorianDate.month - 1] + ' ' + gregorianDate.day + ' ' + gregorianDate.year;
        });

        this._timeFormatter = knockout.observable(function(date) {
            var gregorianDate = date.toGregorianDate();
            var millisecond = Math.round(gregorianDate.millisecond);
            if (Math.abs(that.clockViewModel.multiplier()) < 1) {
                return sprintf("%02d:%02d:%02d.%03d", gregorianDate.hour, gregorianDate.minute, gregorianDate.second, millisecond);
            }
            return sprintf("%02d:%02d:%02d UTC", gregorianDate.hour, gregorianDate.minute, gregorianDate.second);
        });

        this.shuttleRingDragging = knockout.observable(false);
        this._shouldAnimate = knockout.observable(false);

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
                that._shouldAnimate(false);
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

        this.timeLabel = knockout.computed(function() {
            return that._timeFormatter()(clockViewModel.currentTime());
        });

        this.dateLabel = knockout.computed(function() {
            return that._dateFormatter()(clockViewModel.currentTime());
        });

        this.speedLabel = knockout.computed(function() {
            if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK_TIME) {
                return 'Today';
            }
            return clockViewModel.multiplier() + 'x';
        });

        this._isAnimatingObs = knockout.computed(function() {
            return that._shouldAnimate() && (that._canAnimate() || that.shuttleRingDragging());
        });

        this.pauseViewModel = new ToggleButtonViewModel({
            toggled : knockout.computed(function() {
                return !that._isAnimatingObs();
            }),
            toolTip : knockout.observable('Pause'),
            command : new Command(function() {
                if (that._shouldAnimate()) {
                    _cancelRealtime(that.clockViewModel);
                    that._shouldAnimate(false);
                } else if (that._canAnimate()) {
                    _unpause(that);
                }
            })
        });

        var playReverseToggled = knockout.computed(function() {
            return that._isAnimatingObs() && (clockViewModel.multiplier() < 0);
        });

        this.playReverseViewModel = new ToggleButtonViewModel({
            toggled : playReverseToggled,
            toolTip : knockout.observable('Play Reverse'),
            command : new Command(function() {
                if (!playReverseToggled()) {
                    _cancelRealtime(that.clockViewModel);
                    var multiplier = clockViewModel.multiplier();
                    if (multiplier > 0) {
                        clockViewModel.multiplier(-multiplier);
                    }
                    _unpause(that);
                }
            })
        });

        var playToggled = knockout.computed(function() {
            return that._isAnimatingObs() && clockViewModel.multiplier() > 0 && clockViewModel.clockStep() !== ClockStep.SYSTEM_CLOCK_TIME;
        });

        this.playForwardViewModel = new ToggleButtonViewModel({
            toggled : playToggled,
            toolTip : knockout.observable('Play Forward'),
            command : new Command(function() {
                if (!playToggled()) {
                    _cancelRealtime(that.clockViewModel);
                    var multiplier = clockViewModel.multiplier();
                    if (multiplier < 0) {
                        clockViewModel.multiplier(-multiplier);
                    }
                    _unpause(that);
                }
            })
        });

        var playRealtimeToggled = knockout.computed(function() {
            return clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK_TIME;
        });

        var playRealtimeCanExecute = knockout.computed(function() {
            return that._isSystemTimeAvailable();
        });

        this.playRealtimeViewModel = new ToggleButtonViewModel({
            toggled : playRealtimeToggled,
            toolTip : knockout.computed(function() {
                if (that._isSystemTimeAvailable()) {
                    return 'Today (real-time)';
                }
                return 'Current time not in range';
            }),
            command : new Command(function() {
                if (!playRealtimeToggled()) {
                    if (that._isSystemTimeAvailable()) {
                        clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK_TIME);
                        clockViewModel.multiplier(1.0);
                        clockViewModel.currentTime(that.clockViewModel.clock.tick(0));
                        that._shouldAnimate(true);
                    }
                }
            }, playRealtimeCanExecute)
        });

        this.shuttleRingAngle = knockout.computed({
            read : function() {
                var speed = clockViewModel.multiplier();
                var angle = Math.log(Math.abs(speed)) / 0.15 + 15;
                angle = Math.max(Math.min(angle, _maxShuttleRingAngle), 0);
                if (speed < 0) {
                    angle *= -1.0;
                }
                return angle;
            },
            write : function(angle) {
                if (Math.abs(angle) < 5) {
                    return 0;
                }

                angle = Math.max(Math.min(angle, _maxShuttleRingAngle), -_maxShuttleRingAngle);
                var speed = Math.exp(((Math.abs(angle) - 15.0) * 0.15));
                if (speed > 10.0) {
                    var scale = Math.pow(10, Math.floor((Math.log(speed) / Math.LN10) + 0.0001) - 1.0);
                    speed = Math.round(Math.round(speed / scale) * scale);
                } else if (speed > 0.8) {
                    speed = Math.round(speed);
                } else {
                    speed = _shuttleRingTicks[_getTypicalSpeedIndex(speed)];
                }
                if (angle < 0) {
                    speed *= -1.0;
                }

                if (speed !== 0) {
                    clockViewModel.multiplier(speed);
                    clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
                }
            }
        });

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

    AnimationViewModel.prototype.update = function() {
        if (this._isAnimatingObs()) {
            this.clockViewModel.clock.tick();
        }
        this.clockViewModel.update();
    };

    AnimationViewModel.prototype.getDateFormatter = function() {
        return this._dateFormatter();
    };

    AnimationViewModel.prototype.setDateFormatter = function(dateFormatter) {
        if (typeof dateFormatter !== 'function') {
            throw new DeveloperError('dateFormatter must be a function');
        }
        this._dateFormatter(dateFormatter);
        this._dateFormatter.notifySubscribers();
    };

    AnimationViewModel.prototype.getTimeFormatter = function() {
        return this._timeFormatter();
    };

    AnimationViewModel.prototype.setTimeFormatter = function(timeFormatter) {
        if (typeof timeFormatter !== 'function') {
            throw new DeveloperError('timeFormatter must be a function');
        }
        this._timeFormatter(timeFormatter);
        this._timeFormatter.notifySubscribers();
    };

    //Currently exposed for tests.
    AnimationViewModel._shuttleRingTicks = _shuttleRingTicks;

    return AnimationViewModel;
});
