/*global define*/
define([
        'Core/binarySearch',
       ], function(binarySearch) {
    "use strict";

    var typicalMultipliers = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 30.0, 60.0, 120.0, 300.0, 600.0, 900.0, 1800.0, 3600.0, 7200.0, 14400.0, 21600.0,
            43200.0, 86400.0];

    function AnimationController(clock) {
        this.clock = clock;
        this._animating = true;
    }

    AnimationController.prototype.isAnimating = function() {
        return this._animating;
    };

    AnimationController.prototype.reset = function() {
        this.clock.currentTime = this.clock.startTime;
        this._animating = false;
    };

    AnimationController.prototype.update = function() {
        return this._animating ? this.clock.tick() : this.clock.currentTime;
    };

    AnimationController.prototype.pause = function() {
        this._animating = false;
    };

    AnimationController.prototype.play = function() {
        this._animating = true;
        var clock = this.clock;
        if (clock.multiplier < 0) {
            clock.multiplier = -clock.multiplier;
        }
        this.clock.tick(0);
    };

    AnimationController.prototype.playReverse = function() {
        this._animating = true;
        var clock = this.clock;
        if (clock.multiplier > 0) {
            clock.multiplier = -clock.multiplier;
        }
        this.clock.tick(0);
    };

    AnimationController.prototype.slower = function() {
        var clock = this.clock;
        var multiplier = clock.multiplier > 0 ? clock.multiplier : -clock.multiplier;
        var index = binarySearch(typicalMultipliers, multiplier, function(left, right) {
            return left - right;
        });

        if (index < 0) {
            index = ~index;
        }
        index--;

        if (index === -1) {
            clock.multiplier *= 0.5;
        } else if (clock.multiplier >= 0) {
            clock.multiplier = typicalMultipliers[index];
        } else {
            clock.multiplier = -typicalMultipliers[index];
        }
    };

    AnimationController.prototype.faster = function() {
        var clock = this.clock;
        var multiplier = clock.multiplier > 0 ? clock.multiplier : -clock.multiplier;
        var index = binarySearch(typicalMultipliers, multiplier, function(left, right) {
            return left - right;
        });

        if (index < 0) {
            index = ~index;
        } else {
            index++;
        }

        if (index === typicalMultipliers.length) {
            clock.multiplier *= 2.0;
        } else if (clock.multiplier >= 0) {
            clock.multiplier = typicalMultipliers[index];
        } else {
            clock.multiplier = -typicalMultipliers[index];
        }
    };

    return AnimationController;
});