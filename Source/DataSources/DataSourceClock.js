/*global define*/
define([
        '../Core/Clock',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/JulianDate',
        './createPropertyDescriptor'
    ], function(
        Clock,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        JulianDate,
        createPropertyDescriptor) {
    "use strict";

    /**
     * Represents CZML document-level clock settings.
     *
     * @alias DataSourceClock
     * @constructor
     */
    var DataSourceClock = function() {
        this._startTime = undefined;
        this._stopTime = undefined;
        this._currentTime = undefined;
        this._clockRange = undefined;
        this._clockStep = undefined;
        this._multiplier = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DataSourceClock.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DataSourceClock.prototype
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
         * @memberof DataSourceClock.prototype
         * @type {JulianDate}
         */
        startTime : createPropertyDescriptor('startTime'),

        /**
         * Gets or sets the stop time of the clock to use when looping or clamped.
         * @memberof DataSourceClock.prototype
         * @type {JulianDate}
         */
        stopTime : createPropertyDescriptor('stopTime'),

        /**
         * Gets or sets the initial time to use when switching to this clock.
         * @memberof DataSourceClock.prototype
         * @type {JulianDate}
         */
        currentTime : createPropertyDescriptor('currentTime'),

        /**
         * Gets or sets how the clock should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @memberof DataSourceClock.prototype
         * @type {ClockRange}
         */
        clockRange : createPropertyDescriptor('clockRange'),

        /**
         * Gets or sets if clock advancement is frame dependent or system clock dependent.
         * @memberof DataSourceClock.prototype
         * @type {ClockStep}
         */
        clockStep : createPropertyDescriptor('clockStep'),

        /**
         * Gets or sets how much time advances with each tick, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.
         * @memberof DataSourceClock.prototype
         * @type {Number}
         */
        multiplier : createPropertyDescriptor('multiplier')
    });

    /**
     * Duplicates a DataSourceClock instance.
     *
     * @param {DataSourceClock} [result] The object onto which to store the result.
     * @returns {DataSourceClock} The modified result parameter or a new instance if one was not provided.
     */
    DataSourceClock.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DataSourceClock();
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
     * Returns true if this DataSourceClock is equivalent to the other
     *
     * @param {DataSourceClock} other The other DataSourceClock to compare to.
     * @returns {Boolean} <code>true</code> if the DataSourceClocks are equal; otherwise, <code>false</code>.
     */
    DataSourceClock.prototype.equals = function(other) {
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
     * @param {DataSourceClock} source The object to be merged into this object.
     */
    DataSourceClock.prototype.merge = function(source) {
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
    DataSourceClock.prototype.getValue = function(result) {
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

    return DataSourceClock;
});
