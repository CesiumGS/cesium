/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor,
        Property) {
    "use strict";

    /**
     * A property that holds a bag of arbitrary properties, each of which may be time-varying.
     *
     * @alias PropertyBagProperty
     * @constructor
     *
     * @see CompositeProperty
     * @see ConstantProperty
     * @see SampledProperty
     * @see TimeIntervalCollectionProperty
     * @see MaterialProperty
     * @see PositionProperty
     * @see ReferenceProperty
     */
    var PropertyBagProperty = function() {
        this._definitionChanged = new Event();
    };

    defineProperties(PropertyBagProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof Property.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                for (var property in this) {
                    if (this.hasOwnProperty(property) && isPrivateBagProperty(property)) {
                        if (!Property.isConstant(this[property])) {
                            return false;
                        }
                    }
                }
                return true;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof PropertyBagProperty.prototype
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

    PropertyBagProperty.prototype.addProperty = function(name) {
        if (!defined(this[name])) {
            Object.defineProperty(this, name, createPropertyDescriptor(name));

            if (name === 'boolean' || name === 'string' || name === 'number') {
                this._primitiveName = name;
            }
        }
    };

    /**
     * Gets the value of the property at the provided time.
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    PropertyBagProperty.prototype.getValue = function(time, result) {
        if (!defined(result)) {
            result = {};

            // Use a defined property so it won't show up in enumeration.
            Object.defineProperty(result, 'propertyBagChanged', {
                writable : true
            });
        }

        result.propertyBagChanged = false;

        var property;

        for (property in this) {
            if (this.hasOwnProperty(property) && isPrivateBagProperty(property)) {
                var publicName = property.substring(1);
                var previousValue = result[publicName];
                result[publicName] = Property.getValueOrUndefined(this[property], time, result[publicName]);

                if (result[publicName] !== previousValue || (defined(previousValue) && previousValue.propertyBagChanged)) {
                    result.propertyBagChanged = true;
                }
            }
        }

        // Check for properties of the result object that no longer exist.
        for (property in result) {
            if (!this.hasOwnProperty(property) && result.hasOwnProperty(property)) {
                delete result[property];
                result.propertyBagChanged = true;
            }
        }

        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @function
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    PropertyBagProperty.prototype.equals = function(other) {
        if (this === other) {
            return true;
        } else if (other instanceof PropertyBagProperty) {
            var property;

            for (property in this) {
                if (this.hasOwnProperty(property) && isPrivateBagProperty(property)) {
                    if (!Property.equals(this[property], other[property])) {
                        return false;
                    }
                }
            }

            for (property in other) {
                if (other.hasOwnProperty(property) && isPrivateBagProperty(property)) {
                    if (!Property.equals(this[property], other[property])) {
                        return false;
                    }
                }
            }

            return true;
        } else {
            return false;
        }
    };

    function isPrivateBagProperty(name) {
        return name.length > 0 &&
               name[0] === '_' &&
               name !== '_definitionChanged' &&
               name.lastIndexOf('Subscription') !== name.length - 12;
    }

    return PropertyBagProperty;
});
