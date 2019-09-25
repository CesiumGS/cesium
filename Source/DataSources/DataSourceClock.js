import Clock from '../Core/Clock.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import DeveloperError from '../Core/DeveloperError.js';
import Event from '../Core/Event.js';
import JulianDate from '../Core/JulianDate.js';
import createRawPropertyDescriptor from './createRawPropertyDescriptor.js';

    /**
     * Represents desired clock settings for a particular {@link DataSource}.  These settings may be applied
     * to the {@link Clock} when the DataSource is loaded.
     *
     * @alias DataSourceClock
     * @constructor
     */
    function DataSourceClock() {
        this._definitionChanged = new Event();
        this._startTime = undefined;
        this._stopTime = undefined;
        this._currentTime = undefined;
        this._clockRange = undefined;
        this._clockStep = undefined;
        this._multiplier = undefined;
    }

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
         * Gets or sets the desired start time of the clock.
         * See {@link Clock#startTime}.
         * @memberof DataSourceClock.prototype
         * @type {JulianDate}
         */
        startTime : createRawPropertyDescriptor('startTime'),

        /**
         * Gets or sets the desired stop time of the clock.
         * See {@link Clock#stopTime}.
         * @memberof DataSourceClock.prototype
         * @type {JulianDate}
         */
        stopTime : createRawPropertyDescriptor('stopTime'),

        /**
         * Gets or sets the desired current time when this data source is loaded.
         * See {@link Clock#currentTime}.
         * @memberof DataSourceClock.prototype
         * @type {JulianDate}
         */
        currentTime : createRawPropertyDescriptor('currentTime'),

        /**
         * Gets or sets the desired clock range setting.
         * See {@link Clock#clockRange}.
         * @memberof DataSourceClock.prototype
         * @type {ClockRange}
         */
        clockRange : createRawPropertyDescriptor('clockRange'),

        /**
         * Gets or sets the desired clock step setting.
         * See {@link Clock#clockStep}.
         * @memberof DataSourceClock.prototype
         * @type {ClockStep}
         */
        clockStep : createRawPropertyDescriptor('clockStep'),

        /**
         * Gets or sets the desired clock multiplier.
         * See {@link Clock#multiplier}.
         * @memberof DataSourceClock.prototype
         * @type {Number}
         */
        multiplier : createRawPropertyDescriptor('multiplier')
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
        result.startTime = defaultValue(this.startTime, result.startTime);
        result.stopTime = defaultValue(this.stopTime, result.stopTime);
        result.currentTime = defaultValue(this.currentTime, result.currentTime);
        result.clockRange = defaultValue(this.clockRange, result.clockRange);
        result.multiplier = defaultValue(this.multiplier, result.multiplier);
        result.clockStep = defaultValue(this.clockStep, result.clockStep);
        return result;
    };
export default DataSourceClock;
