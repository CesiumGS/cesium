/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/ReferenceFrame',
        './Property'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        ReferenceFrame,
        Property) {
    "use strict";

    /**
     * A {@link PositionProperty} whose value does not change in respect to the
     * {@link ReferenceFrame} in which is it defined.
     *
     * @alias SurfacePositionProperty
     * @constructor
     *
     * @param {PositionProperty} [value] The property value.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid onto which the position will be projected.
     */
    var SurfacePositionProperty = function(value, ellipsoid) {
        this._definitionChanged = new Event();
        this._value = undefined;
        this._ellipsoid = undefined;
        this._removeSubscription = undefined;
        this.setValue(value, ellipsoid);
    };

    defineProperties(SurfacePositionProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof SurfacePositionProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._value);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof SurfacePositionProperty.prototype
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
         * @memberof SurfacePositionProperty.prototype
         * @type {ReferenceFrame}
         * @default ReferenceFrame.FIXED;
         */
        referenceFrame : {
            get : function() {
                return defined(this._value) ? this._value.referenceFrame : ReferenceFrame.FIXED;
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
    SurfacePositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    /**
     * Sets the value of the property.
     *
     * @param {PositionProperty} [value] The property value.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid onto which the position will be projected.
     */
    SurfacePositionProperty.prototype.setValue = function(value, ellipsoid) {
        var changed = false;
        if (this._value !== value) {
            this._value = value;
            changed = true;
        }
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        if (this._ellipsoid !== ellipsoid) {
            this._ellipsoid = ellipsoid;
            changed = true;
        }
        if (changed) {
            if (defined(this._removeSubscription)) {
                this._removeSubscription();
                this._removeSubscription = undefined;
            }
            if (defined(value)) {
                this._removeSubscription = value.definitionChanged.addEventListener(this._raiseDefinitionChanged, this);
            }
            this._definitionChanged.raiseEvent(this);
        }
    };

    /**
     * Gets the value of the property at the provided time and in the provided reference frame.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    SurfacePositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(referenceFrame)) {
            throw new DeveloperError('referenceFrame is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this._value)) {
            return undefined;
        }

        result = this._value.getValueInReferenceFrame(time, referenceFrame, result);
        return defined(result) ? this._ellipsoid.scaleToGeodeticSurface(result, result) : undefined;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    SurfacePositionProperty.prototype.equals = function(other) {
        return this === other || (other instanceof SurfacePositionProperty && this._value === other._value);
    };

    /**
     * @private
     */
    SurfacePositionProperty.prototype._raiseDefinitionChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return SurfacePositionProperty;
});
