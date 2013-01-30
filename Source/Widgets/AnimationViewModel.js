/*global define*/
define(['../Core/DeveloperError',
        '../Core/ClockStep',
        '../Core/Color',
        '../Core/JulianDate',
        '../ThirdParty/sprintf'
        ], function(
         DeveloperError,
         ClockStep,
         Color,
         JulianDate,
         sprintf) {
    "use strict";

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
        this.timeLabel = 'time';
        this.dateLabel = 'date';
        this.speedLabel = 'speedLabel';
        this.toolTip = 'toolTip';
        this.shuttleRingAngle = 0;
        this.currentTime = new JulianDate();

        this.playChecked = false;
        this.pauseChecked = true;
        this.playReverseChecked = false;
        this.realTimeChecked = false;
        this.realTimeEnabled = true;

        this.animationController = animationController;
    };

    AnimationViewModel.prototype.update = function() {
    };

    AnimationViewModel.prototype.playRealtime = function() {
        this.realTimeChecked = true;
        this.playChecked = false;
        this.pauseChecked = false;
        this.playReverseChecked = false;
    };

    AnimationViewModel.prototype.playReverse = function() {
        this.realTimeChecked = false;
        this.playChecked = false;
        this.pauseChecked = false;
        this.playReverseChecked = true;
    };

    AnimationViewModel.prototype.play = function() {
        this.realTimeChecked = false;
        this.playChecked = true;
        this.pauseChecked = false;
        this.playReverseChecked = false;
    };

    AnimationViewModel.prototype.isAnimating = function() {
        return !this.pauseChecked;
    };

    AnimationViewModel.prototype.pause = function() {
        this.realTimeChecked = false;
        this.playChecked = false;
        this.pauseChecked = true;
        this.playReverseChecked = false;
    };

    AnimationViewModel.prototype.unpause = function() {
        this.realTimeChecked = false;
        this.playChecked = !this.playChecked;
        this.pauseChecked = false;
        this.playReverseChecked = !this.playReverseChecked;
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
        if (Math.abs(this._clock.multiplier) < 1) {
            return sprintf("%02d:%02d:%02d.%03d", gregorianDate.hour, gregorianDate.minute, gregorianDate.second, millisecond);
        }
        return sprintf("%02d:%02d:%02d UTC", gregorianDate.hour, gregorianDate.minute, gregorianDate.second);
    };

    return AnimationViewModel;
});
