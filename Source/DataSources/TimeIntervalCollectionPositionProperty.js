/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/ReferenceFrame',
        '../Core/TimeIntervalCollection',
        './PositionProperty',
        './Property'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        ReferenceFrame,
        TimeIntervalCollection,
        PositionProperty,
        Property) {
    'use strict';

    /**
     * A {@link TimeIntervalCollectionProperty} which is also a {@link PositionProperty}.
     *
     * @alias TimeIntervalCollectionPositionProperty
     * @constructor
     *
     * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
     */
    function TimeIntervalCollectionPositionProperty(referenceFrame) {
        this._definitionChanged = new Event();
        this._intervals = new TimeIntervalCollection();
        this._intervals.changedEvent.addEventListener(TimeIntervalCollectionPositionProperty.prototype._intervalsChanged, this);
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    }

    defineProperties(TimeIntervalCollectionPositionProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof TimeIntervalCollectionPositionProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return this._intervals.isEmpty;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof TimeIntervalCollectionPositionProperty.prototype
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
         * @type {ReferenceFrame}
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

    /**
     * @private
     */
    TimeIntervalCollectionPositionProperty.prototype._intervalsChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return TimeIntervalCollectionPositionProperty;
});
