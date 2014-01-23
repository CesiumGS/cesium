/*global define*/
define(['./PositionProperty',
        './Property',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/ReferenceFrame',
        '../Core/TimeIntervalCollection',
        '../Core/wrapFunction'
    ], function(
        PositionProperty,
        Property,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        ReferenceFrame,
        TimeIntervalCollection,
        wrapFunction) {
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
        var intervals = new TimeIntervalCollection();
        var definitionChanged = new Event();

        //For now, we patch our instance of TimeIntervalCollection to raise our definitionChanged event.
        //We might want to consider adding events to TimeIntervalCollection itself for us to listen to,
        var that = this;
        var raiseDefinitionChanged = function() {
            definitionChanged.raiseEvent(that);
        };
        intervals.addInterval = wrapFunction(intervals, intervals.addInterval, raiseDefinitionChanged);
        intervals.removeInterval = wrapFunction(intervals, intervals.removeInterval, raiseDefinitionChanged);
        intervals.clear = wrapFunction(intervals, intervals.clear, raiseDefinitionChanged);

        this._intervals = intervals;
        this._definitionChanged = definitionChanged;
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    };

    defineProperties(TimeIntervalCollectionPositionProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A value is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof TimeIntervalCollectionPositionProperty.prototype
         * @type {Boolean}
         */
        isConstant : {
            get : function() {
                return this._intervals.isEmpty();
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof TimeIntervalCollectionPositionProperty.prototype
         * @type {Event}
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
     *
     * @exception {DeveloperError} time is required.
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
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} referenceFrame is required.
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