/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Enumeration',
        '../Core/ReferenceFrame',
        '../Core/TimeIntervalCollection',
        './PositionProperty'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Enumeration,
        ReferenceFrame,
        TimeIntervalCollection,
        PositionProperty) {
    "use strict";

    /**
     * A {@link Property} which is defined by an TimeIntervalCollection, where the
     * data property of the interval represents the value at simulation time.
     *
     * @alias TimeIntervalCollectionPositionProperty
     * @constructor
     */
    var TimeIntervalCollectionPositionProperty = function(referenceFrame) {
        this._intervals = new TimeIntervalCollection();
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    };

    defineProperties(TimeIntervalCollectionPositionProperty.prototype, {
        /**
         * Always returns true, since this property always varies with simulation time.
         * @memberof TimeIntervalCollectionPositionProperty
         *
         * @type {Boolean}
         */
        isTimeVarying : {
            get : function() {
                return true;
            }
        },
        /**
         * Gets the interval collection.
         * @memberof TimeIntervalCollectionPositionProperty
         *
         * @type {TimeIntervalCollection}
         */
        intervals : {
            get : function() {
                return this._intervals;
            }
        },
        /**
         * Gets the reference frame that the position is defined in.
         * @Type {ReferenceFrame}
         */
        referenceFrame : {
            get : function() {
                return this._referenceFrame;
            }
        }
    });

    /**
     * Returns the value of the property at the specified simulation time.
     * @memberof TimeIntervalCollectionPositionProperty
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    TimeIntervalCollectionPositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    /**
     * Returns the value of the property at the specified simulation time in the specified reference frame.
     * @memberof PositionProperty
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    TimeIntervalCollectionPositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }

        var interval = this._intervals.findIntervalContainingDate(time);
        if (defined(interval)) {
            var value = interval.data;
            if (defined(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Enumeration)) {
                return PositionProperty.convertToReferenceFrame(time, value, this._referenceFrame, referenceFrame, result);
            }
            return value;
        }
        return undefined;
    };

    return TimeIntervalCollectionPositionProperty;
});