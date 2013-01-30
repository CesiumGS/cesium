/*global define*/
define(['../Core/DeveloperError',
        '../Core/ClockStep',
        '../Core/Color',
        '../Core/JulianDate',
        '../Core/defaultValue',
        '../ThirdParty/sprintf'
        ], function(
         DeveloperError,
         ClockStep,
         Color,
         JulianDate,
         defaultValue,
         sprintf) {
    "use strict";

    var Command = function() {
        this.canExecute = false;
        this.execute = undefined;
    };

    var ButtonViewModel = function(template) {
        var t = defaultValue(template, {});
        this.command = defaultValue(t.command, undefined);
        this.enabled = defaultValue(t.enabled, false);
        this.selected = defaultValue(t.selected, false);
        this.toolTip = defaultValue(t.toolTip, '');
    };

    var _monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var _maxShuttleAngle = 105;

    function _shuttleAngletoSpeed(animationController, angle) {
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
            speed = animationController.getTypicalSpeed(speed);
        }
        if (angle < 0) {
            speed *= -1.0;
        }
        return speed;
    }

    function _shuttleSpeedtoAngle(speed) {
        var angle = Math.log(Math.abs(speed)) / 0.15 + 15;
        angle = Math.max(Math.min(angle, _maxShuttleAngle), 0);
        if (speed < 0) {
            angle *= -1.0;
        }
        return angle;
    }

    var AnimationViewModel = function(animationController) {
        this.animationController = animationController;

        this.timeLabel = 'time';
        this.dateLabel = 'date';
        this.speedLabel = 'speedLabel';

        var that = this;

        this.pauseViewModel = new ButtonViewModel({
            enabled : true,
            selected : false,
            toolTip : 'Pause',
            command : {
                canExecute : true,
                execute : function() {
                    that.pauseViewModel.selected = !that.pauseViewModel.selected;

                    that.playRealtimeViewModel.selected = false;
                    that.playViewModel.selected = !that.pauseViewModel.selected && animationController._clock.multiplier > 0;
                    that.playReverseViewModel.selected = !that.pauseViewModel.selected && animationController._clock.multiplier < 0;
                    if (that.pauseViewModel.selected) {
                        animationController.pause();
                    } else {
                        animationController.unpause();
                    }
                }
            }
        });

        this.playReverseViewModel = new ButtonViewModel({
            enabled : true,
            selected : false,
            toolTip : 'Play Reverse',
            command : {
                canExecute : true,
                execute : function() {
                    that.playRealtimeViewModel.selected = false;
                    that.playViewModel.selected = false;
                    that.pauseViewModel.selected = false;
                    that.playReverseViewModel.selected = true;
                    animationController.playReverse();
                }
            }
        });

        this.playViewModel = new ButtonViewModel({
            enabled : true,
            selected : false,
            toolTip : 'Play Forward',
            command : {
                canExecute : true,
                execute : function() {
                    that.playRealtimeViewModel.selected = false;
                    that.playViewModel.selected = true;
                    that.pauseViewModel.selected = false;
                    that.playReverseViewModel.selected = false;
                    animationController.play();
                }
            }
        });

        this.playRealtimeViewModel = new ButtonViewModel({
            enabled : true,
            selected : false,
            toolTip : 'Play Realtime',
            command : {
                canExecute : true,
                execute : function() {
                    that.playRealtimeViewModel.selected = true;
                    that.playViewModel.selected = false;
                    that.pauseViewModel.selected = false;
                    that.playReverseViewModel.selected = false;
                    animationController.playRealtime();
                }
            }
        });
    };

    AnimationViewModel.prototype.getShuttleRingAngle = function() {
        return _shuttleSpeedtoAngle(this.animationController._clock.multiplier);
    };

    AnimationViewModel.prototype.setShuttleRingAngle = function(angle) {
        var speed = _shuttleAngletoSpeed(this.animationController, angle);
        if (speed !== 0) {
            this.animationController._clock.multiplier = speed;
        }
    };

    AnimationViewModel.prototype.update = function() {
        var currentTime = this.animationController._clock.currentTime;
        this.timeLabel = this.makeTimeLabel(currentTime);
        this.dateLabel = this.makeDateLabel(currentTime);

        if (this.animationController._clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
            this.speedLabel = 'Today';
        } else {
            this.speedLabel = this.animationController._clock.multiplier + 'x';
        }

        if (this.playRealtimeViewModel.enabled) {
            this.playRealtimeViewModel.toolTip = 'Today (real-time)';
        } else {
            this.playRealtimeViewModel.toolTip = 'Current time not in range.';
        }
    };

    AnimationViewModel.prototype.isAnimating = function() {
        return this.pauseViewModel.selected;
    };

    AnimationViewModel.prototype.moreReverse = function() {
        this.animationController.moreReverse();
    };

    AnimationViewModel.prototype.moreForward = function() {
        this.animationController.moreForward();
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
