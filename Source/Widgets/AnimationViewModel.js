/*global define*/
define(['../Core/DeveloperError',
        '../Core/ClockStep',
        '../Core/Color',
        '../Core/JulianDate',
        '../Core/defaultValue',
        './Command',
        './ButtonViewModel',
        '../ThirdParty/sprintf',
        '../ThirdParty/knockout-2.2.1'
        ], function(
         DeveloperError,
         ClockStep,
         Color,
         JulianDate,
         defaultValue,
         Command,
         ButtonViewModel,
         sprintf,
         ko) {
    "use strict";

    var _monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var _maxShuttleAngle = 105;

    var AnimationViewModel = function(animationController) {
        this.animationController = animationController;

        var isAnimatingObs = this.isAnimatingObs = ko.observable(animationController.isAnimating());
        var multiplierObs = this.multiplierObs = ko.observable(animationController._clock.multiplier);
        var isSystemTimeAvailable = this.isSystemTimeAvailable = ko.observable(animationController._clock.isSystemTimeAvailable());

        var timeObs = this.timeObs = ko.observable(animationController._clock.currentTime);
        timeObs.equalityComparer = JulianDate.equals;

        var clockStep = this.clockStep = ko.observable(animationController._clock.clockStep);
        clockStep.equalityComparer = function(a, b) {
            return a === b;
        };

        var that = this;
        this.timeLabel = ko.computed(function() {
            return that.makeTimeLabel(timeObs());
        });

        this.dateLabel = ko.computed(function() {
            return that.makeDateLabel(timeObs());
        });

        this.speedLabel = ko.computed(function() {
            if (clockStep() === ClockStep.SYSTEM_CLOCK_TIME) {
                return 'Today';
            }
            return multiplierObs() + 'x';
        });

        var pauseSelected = ko.computed({
            read : function() {
                return !isAnimatingObs();
            },
            write : function(value) {
                if (value && isAnimatingObs()) {
                    animationController.pause();
                } else if (!value && !isAnimatingObs()) {
                    animationController.unpause();
                }
            }
        });

        this.pauseViewModel = new ButtonViewModel({
            selected : pauseSelected,
            toolTip : ko.observable('Pause'),
            command : new Command(function() {
                pauseSelected(!pauseSelected());
            })
        });

        var playReverseSelected = ko.computed(function() {
            return isAnimatingObs() && (multiplierObs() < 0);
        });

        this.playReverseViewModel = new ButtonViewModel({
            selected : playReverseSelected,
            toolTip : ko.observable('Play Reverse'),
            command : new Command(function() {
                if (!playReverseSelected()) {
                    animationController.playReverse();
                }
            })
        });

        var playSelected = ko.computed(function() {
            return isAnimatingObs() && multiplierObs() > 0 && clockStep() !== ClockStep.SYSTEM_CLOCK_TIME;
        });

        this.playViewModel = new ButtonViewModel({
            selected : playSelected,
            toolTip : ko.observable('Play Forward'),
            command : new Command(function() {
                if (!playSelected()) {
                    animationController.play();
                }
            })
        });

        var playRealtimeSelected = ko.computed(function() {
            return clockStep() === ClockStep.SYSTEM_CLOCK_TIME;
        });

        var playRealtimeCanExecute = ko.computed(function() {
            return isSystemTimeAvailable();
        });

        this.playRealtimeViewModel = new ButtonViewModel({
            selected : playRealtimeSelected,
            toolTip : ko.computed(function() {
                if (isSystemTimeAvailable()) {
                    return 'Today (real-time)';
                }
                return 'Current time not in range';
            }),
            command : new Command(function() {
                if (!playRealtimeSelected()) {
                    animationController.playRealtime();
                }
            }, playRealtimeCanExecute)
        });

        this.shuttleRingAngle = ko.computed({
            read : function() {
                var speed = multiplierObs();
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
                    speed = this.animationController.getTypicalSpeed(speed);
                }
                if (angle < 0) {
                    speed *= -1.0;
                }

                that.animationController._clock.multiplier = speed;
                that.animationController._clock.clockStep = ClockStep.SPEED_MULTIPLIER;
                if (speed !== 0) {
                    multiplierObs(speed);
                    clockStep(ClockStep.SPEED_MULTIPLIER);
                }
            },
            owner : this
        });

        this.moreReverse = {
            canExecute : true,
            execute : function() {
                that.animationController.moreReverse();
            }
        };

        this.moreForward = {
            canExecute : true,
            execute : function() {
                that.animationController.moreForward();
            }
        };
    };

    AnimationViewModel.prototype.update = function() {
        this.timeObs(this.animationController._clock.currentTime);
        this.multiplierObs(this.animationController._clock.multiplier);
        this.clockStep(this.animationController._clock.clockStep);
        this.isAnimatingObs(this.animationController.isAnimating());
        this.isSystemTimeAvailable(this.animationController._clock.isSystemTimeAvailable());
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
        if (Math.abs(this.animationController._clock.multiplier) < 1) {
            return sprintf("%02d:%02d:%02d.%03d", gregorianDate.hour, gregorianDate.minute, gregorianDate.second, millisecond);
        }
        return sprintf("%02d:%02d:%02d UTC", gregorianDate.hour, gregorianDate.minute, gregorianDate.second);
    };

    return AnimationViewModel;
});
