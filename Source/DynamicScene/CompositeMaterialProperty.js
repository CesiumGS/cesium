/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/TimeIntervalCollection',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        TimeIntervalCollection,
        Property) {
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
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

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
     */
    CompositeMaterialProperty.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

        var innerProperty = this._intervals.findDataForIntervalContainingDate(time);
        if (defined(innerProperty)) {
            return innerProperty.getValue(time, result);
        }
        return undefined;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof CompositeMaterialProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    CompositeMaterialProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof CompositeMaterialProperty && //
                this._intervals.equals(other._intervals, Property.equals));
    };

    return CompositeMaterialProperty;
});