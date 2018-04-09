define([
    '../Core/Cartesian3',
    '../Core/Check',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/DeveloperError',
    '../Core/Event',
    '../Core/ReferenceFrame',
    './createPropertyDescriptor',
    './PositionProperty',
    './Property'
], function(
    Cartesian3,
    Check,
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    Event,
    ReferenceFrame,
    createPropertyDescriptor,
    PositionProperty,
    Property) {
    'use strict';

    function computeCentroid(positions, result) {
        var centroid = Cartesian3.clone(Cartesian3.ZERO, result);
        var length = positions.length;
        for (var i = 0; i < length; i++) {
            centroid = Cartesian3.add(positions[i], centroid, centroid);
        }
        return Cartesian3.multiplyByScalar(centroid, 1 / length, centroid);
    }

    /**
     * A {@link PositionProperty} whose value is the centroid of the given list of positions
     *
     * @alias CentroidPositionProperty
     * @constructor
     *
     * @param {Property} [positions] The property value that resolves to an array of Cartesian3 positions.
     */
    function CentroidPositionProperty(positions) {
        this._definitionChanged = new Event();
        this._positions = undefined;
        this._positionsSubscription = undefined;
        this._referenceFrame = ReferenceFrame.FIXED;

        this.positions = positions;
    }

    defineProperties(CentroidPositionProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof CentroidPositionProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._positions);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof CentroidPositionProperty.prototype
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
         * Gets the reference frame in which the position is defined.
         * @memberof CentroidPositionProperty.prototype
         * @type {ReferenceFrame}
         * @default ReferenceFrame.FIXED;
         */
        referenceFrame : {
            get : function() {
                return this._referenceFrame;
            }
        },
        /**
         * Gets or sets the positions property used to compute the value.
         * @memberof CentroidPositionProperty.prototype
         *
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions')
    });

    /**
     * Gets the value of the property at the provided time in the fixed frame.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    CentroidPositionProperty.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        //>>includeEnd('debug');

        var positions = Property.getValueOrUndefined(this._positions, time);
        if (!defined(positions)) {
            return;
        }
        return computeCentroid(positions, result);
    };

    /**
     * Gets the value of the property at the provided time and in the provided reference frame.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    CentroidPositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        Check.defined('referenceFrame', referenceFrame);
        //>>includeEnd('debug');
        var value = this.getValue(time, result);
        return PositionProperty.convertToReferenceFrame(time, value, this._referenceFrame, referenceFrame, result);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    CentroidPositionProperty.prototype.equals = function(other) {
        return this === other ||
               (other instanceof CentroidPositionProperty &&
                Cartesian3.equals(this._positions, other._positions));
    };

    return CentroidPositionProperty;
});
