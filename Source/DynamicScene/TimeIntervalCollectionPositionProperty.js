/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/ReferenceFrame',
        '../Core/TimeIntervalCollection',
        './PositionProperty',
        './Property'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        ReferenceFrame,
        TimeIntervalCollection,
        PositionProperty,
        Property) {
    "use strict";

    /**
     * A {@link TimeIntervalCollectionProperty} which is also a {@link PositionProperty}.
     *
     * @alias TimeIntervalCollectionPositionProperty
     * @constructor
     *
     * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
     */
    var TimeIntervalCollectionPositionProperty = function(referenceFrame) {
        this._intervals = new TimeIntervalCollection();
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    };

    defineProperties(TimeIntervalCollectionPositionProperty.prototype, {
        /**
         * Gets the interval collection.
         * @memberof TimeIntervalCollectionPositionProperty.prototype
         * @type {TimeIntervalCollection}
         */
        intervals : {
            get : function() {
                return this._intervals;
            }
        },
        /**
         * Gets the reference frame in which the position is defined.
         * @memberof TimeIntervalCollectionPositionProperty.prototype
         * @Type {ReferenceFrame}
         * @default ReferenceFrame.FIXED;
         */
        referenceFrame : {
            get : function() {
                return this._referenceFrame;
            }
        }
    });

    /**
     * Gets the value of the property at the provided time in the fixed frame.
     * @memberof CompositePositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    TimeIntervalCollectionPositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    /**
     * Gets the value of the property at the provided time and in the provided reference frame.
     * @memberof CompositePositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    TimeIntervalCollectionPositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(referenceFrame)) {
            throw new DeveloperError('referenceFrame is required.');
        }
        //>>includeEnd('debug');

        var position = this._intervals.findDataForIntervalContainingDate(time);
        if (defined(position)) {
            return PositionProperty.convertToReferenceFrame(time, position, this._referenceFrame, referenceFrame, result);
        }
        return undefined;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof TimeIntervalCollectionPositionProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    TimeIntervalCollectionPositionProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof TimeIntervalCollectionPositionProperty && //
                this._intervals.equals(other._intervals, Property.equals) && //
                this._referenceFrame === other._referenceFrame);
    };

    return TimeIntervalCollectionPositionProperty;
});