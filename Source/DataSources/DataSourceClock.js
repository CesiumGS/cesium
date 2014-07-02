/*global define*/
define([
        '../Core/Clock',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/JulianDate',
        './createDynamicPropertyDescriptor'
    ], function(
        Clock,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        JulianDate,
        createDynamicPropertyDescriptor) {
    "use strict";

    /**
     * Represents CZML document-level clock settings.
     *
     * @alias DynamicClock
     * @constructor
     */
    var DynamicClock = function() {
        this._startTime = undefined;
        this._stopTime = undefined;
        this._currentTime = undefined;
        this._clockRange = undefined;
        this._clockStep = undefined;
        this._multiplier = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicClock.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicClock.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the start time of the clock to use when looping or clamped.
         * @memberof DynamicClock.prototype
         * @type {JulianDate}
         */
        startTime : createDynamicPropertyDescriptor('startTime'),

        /**
         * Gets or sets the stop time of the clock to use when looping or clamped.
         * @memberof DynamicClock.prototype
         * @type {JulianDate}
         */
        stopTime : createDynamicPropertyDescriptor('stopTime'),

        /**
         * Gets or sets the initial time to use when switching to this clock.
         * @memberof DynamicClock.prototype
         * @type {JulianDate}
         */
        currentTime : createDynamicPropertyDescriptor('currentTime'),

        /**
         * Gets or sets how the clock should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @memberof DynamicClock.prototype
         * @type {ClockRange}
         */
        clockRange : createDynamicPropertyDescriptor('clockRange'),

        /**
         * Gets or sets if clock advancement is frame dependent or system clock dependent.
         * @memberof DynamicClock.prototype
         * @type {ClockStep}
         */
        clockStep : createDynamicPropertyDescriptor('clockStep'),

        /**
         * Gets or sets how much time advances with each tick, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.
         * @memberof DynamicClock.prototype
         * @type {Number}
         */
        multiplier : createDynamicPropertyDescriptor('multiplier')
    });

    /**
     * Duplicates a DynamicClock instance.
     *
     * @param {DynamicClock} [result] The object onto which to store the result.
     * @returns {DynamicClock} The modified result parameter or a new instance if one was not provided.
     */
    DynamicClock.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicClock();
        }
        result.startTime = this.startTime;
        result.stopTime = this.stopTime;
        result.currentTime = this.currentTime;
        result.clockRange = this.clockRange;
        result.clockStep = this.clockStep;
        result.multiplier = this.multiplier;
        return result;
    };

    /**
     * Returns true if this DynamicClock is equivalent to the other
     *
     * @param {DynamicClock} other The other DynamicClock to compare to.
     * @returns {Boolean} <code>true</code> if the DynamicClocks are equal; otherwise, <code>false</code>.
     */
    DynamicClock.prototype.equals = function(other) {
        return this === other ||
               defined(other) &&
               JulianDate.equals(this.startTime, other.startTime) &&
               JulianDate.equals(this.stopTime, other.stopTime) &&
               JulianDate.equals(this.currentTime, other.currentTime) &&
               this.clockRange === other.clockRange &&
               this.clockStep === other.clockStep &&
               this.multiplier === other.multiplier;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicClock} source The object to be merged into this object.
     */
    DynamicClock.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.startTime = defaultValue(this.startTime, source.startTime);
        this.stopTime = defaultValue(this.stopTime, source.stopTime);
        this.currentTime = defaultValue(this.currentTime, source.currentTime);
        this.clockRange = defaultValue(this.clockRange, source.clockRange);
        this.clockStep = defaultValue(this.clockStep, source.clockStep);
        this.multiplier = defaultValue(this.multiplier, source.multiplier);
    };

    /**
     * Gets the value of this clock instance as a {@link Clock} object.
     *
     * @returns {Clock} The modified result parameter or a new instance if one was not provided.
     */
    DynamicClock.prototype.getValue = function(result) {
        if (!defined(result)) {
            result = new Clock();
        }
        result.startTime = this.startTime;
        result.stopTime = this.stopTime;
        result.clockRange = this.clockRange;
        result.clockStep = this.clockStep;
        result.multiplier = this.multiplier;
        result.currentTime = this.currentTime;
        return result;
    };

    return DynamicClock;
});
