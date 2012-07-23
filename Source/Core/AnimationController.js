/*global define*/
define([
    './binarySearch',
    './DeveloperError'
], function(
    binarySearch,
    DeveloperError
) {
    "use strict";

    /**
     * This controls animation by manipulating a Clock object.
     * @alias AnimationController
     * @constructor
     *
     * @param {Clock} clock The clock that will be controlled.
     *
     * @see Clock
     */
    var AnimationController = function(clock) {
        this.clock = clock;
        this._animating = true;
        if (typeof clock !== 'object') {
            throw new DeveloperError('Clock parameter required to construct AnimationController.');
        }
    };

    var typicalMultipliers = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 30.0, 60.0, 120.0, 300.0, 600.0, 900.0, 1800.0, 3600.0, 7200.0, 14400.0, 21600.0,
                              43200.0, 86400.0];

    /**
     * Test if the AnimationController is playing or paused.
     * @memberof AnimationController
     *
     * @returns Boolean <code>true</code> if the AnimationController is animating in either direction.
     */
    AnimationController.prototype.isAnimating = function() {
        return this._animating;
    };

    /**
     * Stop animating, and reset the clock back to the start time.
     * @memberof AnimationController
     */
    AnimationController.prototype.reset = function() {
        this.clock.currentTime = this.clock.startTime;
        this._animating = false;
    };

    /**
     * Update the clock to the appropriate animation time.  This function
     * should be called exactly once per animation frame, prior to updating
     * any other objects that depend on the animation time.
     * @memberof AnimationController
     *
     * @returns {JulianDate} The updated time if animating, or <code>currentTime</code> if paused.
     */
    AnimationController.prototype.update = function() {
        return this._animating ? this.clock.tick() : this.clock.currentTime;
    };

    /**
     * Stop animating, and hold on the current time.
     * @memberof AnimationController
     */
    AnimationController.prototype.pause = function() {
        this._animating = false;
    };

    /**
     * Begin or resume animating in a forward direction.
     * @memberof AnimationController
     */
    AnimationController.prototype.play = function() {
        this._animating = true;
        var clock = this.clock;
        if (clock.multiplier < 0) {
            clock.multiplier = -clock.multiplier;
        }
        this.clock.tick(0);
    };

    /**
     * Begin or resume animating in a reverse direction.
     * @memberof AnimationController
     */
    AnimationController.prototype.playReverse = function() {
        this._animating = true;
        var clock = this.clock;
        if (clock.multiplier > 0) {
            clock.multiplier = -clock.multiplier;
        }
        this.clock.tick(0);
    };

    /**
     * Slow down the speed of animation, so time appears to pass more slowly.
     * @memberof AnimationController
     */
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

    /**
     * Speed up the animation, so time appears to pass more quickly.
     * @memberof AnimationController
     */
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