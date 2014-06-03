/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/EventHelper',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Event,
        EventHelper,
        Property) {
    "use strict";

    /**
     * A {@link Property} whose value is an array whose items are the computed value
     * of other property instances.
     *
     * @alias PropertyArray
     * @constructor
     *
     * @param {Property[]} [value] An array of Property instances.
     */
    var PropertyArray = function(value) {
        this._value = undefined;
        this._definitionChanged = new Event();
        this._eventHelper = new EventHelper();
        this.setValue(value);
    };

    defineProperties(PropertyArray.prototype, {
        /**
         * Gets a value indicating if this property is constant.  This property
         * is considered constant if all property items in the array are constant.
         * @memberof PropertyArray.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                var value = this._value;
                if (!defined(value)) {
                    return true;
                }
                var length = value.length;
                for (var i = 0; i < length; i++) {
                    if (!Property.isConstant(value[i])) {
                        return false;
                    }
                }
                return true;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is changed whenever setValue is called with data different
         * than the current value or one of the properties in the array also changes.
         * @memberof PropertyArray.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        }
    });

    /**
     * Gets the value of the property.
     *
     * @param {JulianDate} [time] The time for which to retrieve the value.  This parameter is unused since the value does not change with respect to time.
     * @param {Object[]} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object[]} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    PropertyArray.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var value = this._value;
        if (!defined(value)) {
            return undefined;
        }

        var length = value.length;
        if (!defined(result)) {
            result = new Array(length);
        }
        var i = 0;
        var x = 0;
        while (i < length) {
            var property = this._value[i];
            var itemValue = property.getValue(time, result[i]);
            if (defined(itemValue)) {
                result[x] = itemValue;
                x++;
            }
            i++;
        }
        result.length = x;
        return result;
    };

    /**
     * Sets the value of the property.
     *
     * @param {Property[]} value An array of Property instances.
     */
    PropertyArray.prototype.setValue = function(value) {
        var eventHelper = this._eventHelper;
        eventHelper.removeAll();

        if (defined(value)) {
            this._value = value.slice();
            var length = value.length;
            for (var i = 0; i < length; i++) {
                var property = value[i];
                if (defined(property)) {
                    eventHelper.add(property.definitionChanged, PropertyArray.prototype._raiseDefinitionChanged, this);
                }
            }
        } else {
            this._value = undefined;
        }
        this._definitionChanged.raiseEvent(this);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    PropertyArray.prototype.equals = function(other) {
        return this === other || //
               (other instanceof PropertyArray && //
                Property.arrayEquals(this._value, other._value));
    };

    PropertyArray.prototype._raiseDefinitionChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return PropertyArray;
});
