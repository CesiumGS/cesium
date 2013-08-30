/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/TimeIntervalCollection'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        TimeIntervalCollection) {
    "use strict";

    /**
     * A {@link CompositeProperty} which is also a {@link MaterialProperty}.
     *
     * @alias CompositeMaterialProperty
     * @constructor
     */
    var CompositeMaterialProperty = function() {
        this._intervals = new TimeIntervalCollection();
    };

    defineProperties(CompositeMaterialProperty.prototype, {
        /**
         * Gets the interval collection.
         * @memberof CompositeMaterialProperty.prototype
         *
         * @type {TimeIntervalCollection}
         */
        intervals : {
            get : function() {
                return this._intervals;
            }
        }
    });

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof CompositeMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    CompositeMaterialProperty.prototype.getType = function(time) {
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }

        var innerProperty = this._intervals.findDataForIntervalContainingDate(time);
        if (defined(innerProperty)) {
            return innerProperty.getType(time);
        }
        return undefined;
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof CompositeMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    CompositeMaterialProperty.prototype.getValue = function(time, result) {
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }

        var innerProperty = this._intervals.findDataForIntervalContainingDate(time);
        if (defined(innerProperty)) {
            return innerProperty.getValue(time, result);
        }
        return undefined;
    };

    return CompositeMaterialProperty;
});