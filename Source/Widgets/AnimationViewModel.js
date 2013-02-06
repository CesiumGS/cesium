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
         ko) {
    "use strict";

    var _monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var _maxShuttleAngle = 105;

    var AnimationViewModel = function(clockViewModel) {
        this.clockViewModel = clockViewModel;

        var that = this;

        this._canAnimate = ko.computed(function() {
            var clockRange = clockViewModel.clockRange();

            if (clockRange === ClockRange.UNBOUNDED) {
                return true;
            }

            var multiplier = clockViewModel.multiplier();
            var currentTime = clockViewModel.currentTime();
            var startTime = clockViewModel.startTime();

            if (clockRange === ClockRange.LOOP_STOP) {
                return currentTime.greaterThan(startTime) || (currentTime.equals(startTime) && multiplier > 0);
            }

            var stopTime = clockViewModel.stopTime();
            return (currentTime.greaterThan(startTime) && currentTime.lessThan(stopTime)) ||
                   (currentTime.equals(startTime) && multiplier > 0) ||
                   (currentTime.equals(stopTime) && multiplier < 0);
        });

        this._shouldAnimate = ko.observable(false);

        this._isSystemTimeAvailable = ko.computed(function() {
            var clockRange = clockViewModel.clockRange();
            if (clockRange === ClockRange.UNBOUNDED) {
                return true;
            }

            var systemTime = clockViewModel.systemTime();
            var startTime = clockViewModel.startTime();
            var stopTime = clockViewModel.stopTime();
            return systemTime.greaterThanOrEquals(startTime) && systemTime.lessThanOrEquals(stopTime);
        });

        this.timeLabel = ko.computed(function() {
            return that.makeTimeLabel(clockViewModel.currentTime());
        });

        this.dateLabel = ko.computed(function() {
            return that.makeDateLabel(clockViewModel.currentTime());
        });

        this.speedLabel = ko.computed(function() {
            if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK_TIME) {
                return 'Today';
            }
            return clockViewModel.multiplier() + 'x';
        });

        var srd = ko.observable(false);
        this.shuttleRingDragging = ko.computed({
            read : function() {
                return srd();
            },
            write : function(value) {
                srd(value);
                if (!value) {
                    that._shouldAnimate(that._shouldAnimate() && that._canAnimate());
                }
            }
        });

        var isAnimatingObs = ko.computed(function() {
            return that._shouldAnimate() && (that._canAnimate() || that.shuttleRingDragging());
        });

        this.isAnimatingObs = isAnimatingObs;

        var pauseToggled = ko.computed({
            read : function() {
                return !isAnimatingObs();
            },
            write : function(value) {
                if (value && isAnimatingObs()) {
                    that._cancelRealtime();
                    that._shouldAnimate(false);
                } else if (!value && !isAnimatingObs()) {
                    that._unpause();
                }
            }
        });

        this.pauseViewModel = new ToggleButtonViewModel({
            toggled : pauseToggled,
            toolTip : ko.observable('Pause'),
            command : new Command(function() {
                pauseToggled(!pauseToggled());
            })
        });

        var playReverseToggled = ko.computed(function() {
            return isAnimatingObs() && (clockViewModel.multiplier() < 0);
        });

        this.playReverseViewModel = new ToggleButtonViewModel({
            toggled : playReverseToggled,
            toolTip : ko.observable('Play Reverse'),
            command : new Command(function() {
                if (!playReverseToggled()) {
                    that._cancelRealtime();
                    var multiplier = clockViewModel.multiplier();
                    if (multiplier > 0) {
                        clockViewModel.multiplier(-multiplier);
                    }
                    that._unpause();
                }
            })
        });

        var playToggled = ko.computed(function() {
            return isAnimatingObs() && clockViewModel.multiplier() > 0 && clockViewModel.clockStep() !== ClockStep.SYSTEM_CLOCK_TIME;
        });

        this.playViewModel = new ToggleButtonViewModel({
            toggled : playToggled,
            toolTip : ko.observable('Play Forward'),
            command : new Command(function() {
                if (!playToggled()) {
                    that._cancelRealtime();
                    var multiplier = clockViewModel.multiplier();
                    if (multiplier < 0) {
                        clockViewModel.multiplier(-multiplier);
                    }
                    that._unpause();
                }
            })
        });

        var playRealtimeToggled = ko.computed(function() {
            return clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK_TIME;
        });

        var playRealtimeCanExecute = ko.computed(function() {
            return that._isSystemTimeAvailable();
        });

        this.playRealtimeViewModel = new ToggleButtonViewModel({
            toggled : playRealtimeToggled,
            toolTip : ko.computed(function() {
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

        var positiveTicks = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0,//
                             15.0, 30.0, 60.0, 120.0, 300.0, 600.0, 900.0, 1800.0, 3600.0, 7200.0, 14400.0,//
                             21600.0, 43200.0, 86400.0, 172800.0, 345600.0, 604800.0];

        var tickIndex;
        var allTicks = [];
        var len = positiveTicks.length;
        for (tickIndex = len - 1; tickIndex >= 0; tickIndex--) {
            allTicks.push(-positiveTicks[tickIndex]);
        }
        for (tickIndex = 0; tickIndex < len; tickIndex++) {
            allTicks.push(positiveTicks[tickIndex]);
        }
        this._shuttleRingTicks = allTicks;

        this.shuttleRingAngle = ko.computed({
            read : function() {
                var speed = clockViewModel.multiplier();
                var angle = Math.log(Math.abs(speed)) / 0.15 + 15;
                angle = Math.max(Math.min(angle, _maxShuttleAngle), 0);
                if (speed < 0) {
                    angle *= -1.0;
                }
                return angle;
            },
            write : function(angle) {
                if (Math.abs(angle) < 5) {
                    return 0;
                }

                angle = Math.max(Math.min(angle, _maxShuttleAngle), -_maxShuttleAngle);
                var speed = Math.exp(((Math.abs(angle) - 15.0) * 0.15));
                if (speed > 10.0) {
                    var scale = Math.pow(10, Math.floor((Math.log(speed) / Math.LN10) + 0.0001) - 1.0);
                    speed = Math.round(Math.round(speed / scale) * scale);
                } else if (speed > 0.8) {
                    speed = Math.round(speed);
                } else {
                    speed = that._shuttleRingTicks[that._getTypicalSpeedIndex(speed)];
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
                that._cancelRealtime();
                var clockViewModel = that.clockViewModel;
                var multiplier = clockViewModel.multiplier();
                var index = that._getTypicalSpeedIndex(multiplier) - 1;
                if (index > 0) {
                    clockViewModel.multiplier(that._shuttleRingTicks[index]);
                }
            }
        };

        this.faster = {
            canExecute : true,
            execute : function() {
                that._cancelRealtime();
                var clockViewModel = that.clockViewModel;
                var multiplier = clockViewModel.multiplier();
                var index = that._getTypicalSpeedIndex(multiplier) + 1;
                if (index < that._shuttleRingTicks.length) {
                    clockViewModel.multiplier(that._shuttleRingTicks[index]);
                }
            }
        };
    };

    AnimationViewModel.prototype.update = function() {
        if (this.isAnimatingObs()) {
            this.clockViewModel.clock.tick();
        }
        this.clockViewModel.update();
    };

    /**
     * Override this function to change the format of the date label on the widget.
     * The returned string will be displayed as the middle line of text on the widget.
     *
     * @function
     * @memberof AnimationViewModel
     * @returns {String} The human-readable version of the current date.
     */
    AnimationViewModel.prototype.makeDateLabel = function(date) {
        var gregorianDate = date.toGregorianDate();
        return _monthNames[gregorianDate.month - 1] + ' ' + gregorianDate.day + ' ' + gregorianDate.year;
    };

    /**
     * Override this function to change the format of the time label on the widget.
     * The returned string will be displayed as the bottom line of text on the widget.
     *
     * @function
     * @memberof AnimationViewModel.prototype
     * @returns {String} The human-readable version of the current time.
     */
    AnimationViewModel.prototype.makeTimeLabel = function(date) {
        var gregorianDate = date.toGregorianDate();
        var millisecond = gregorianDate.millisecond;
        if (Math.abs(this.clockViewModel.multiplier()) < 1) {
            return sprintf("%02d:%02d:%02d.%03d", gregorianDate.hour, gregorianDate.minute, gregorianDate.second, millisecond);
        }
        return sprintf("%02d:%02d:%02d UTC", gregorianDate.hour, gregorianDate.minute, gregorianDate.second);
    };

    AnimationViewModel.prototype._cancelRealtime = function() {
        var clockViewModel = this.clockViewModel;
        if (clockViewModel.clockStep() === ClockStep.SYSTEM_CLOCK_TIME) {
            clockViewModel.clockStep(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
            clockViewModel.multiplier(1);
        }
    };

    AnimationViewModel.prototype._unpause = function() {
        this._cancelRealtime();
        this.clockViewModel.currentTime(this.clockViewModel.clock.tick(0));
        this._shouldAnimate(true);
    };

    AnimationViewModel.prototype._getTypicalSpeedIndex = function(speed) {
        var index = binarySearch(this._shuttleRingTicks, speed, binarySearch.numericComparator);
        return index < 0 ? ~index : index;
    };

    return AnimationViewModel;
});
