/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './CompositeProperty',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Event,
        CompositeProperty,
        Property) {
    "use strict";

    /**
     * A {@link CompositeProperty} which is also an {@link ImageryProviderProperty}.
     *
     * @alias CompositeImageryProviderProperty
     * @constructor
     */
    var CompositeImageryProviderProperty = function() {
        this._definitionChanged = new Event();
        this._composite = new CompositeProperty();
        this._composite.definitionChanged.addEventListener(CompositeImageryProviderProperty.prototype._raiseDefinitionChanged, this);
    };

    defineProperties(CompositeImageryProviderProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof CompositeImageryProviderProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return this._composite.isConstant;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is changed whenever setValue is called with data different
         * than the current value.
         * @memberof CompositeImageryProviderProperty.prototype
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
         * @memberof CompositeImageryProviderProperty.prototype
         *
         * @type {TimeIntervalCollection}
         */
        intervals : {
            get : function() {
                return this._composite._intervals;
            }
        }
    });

    /**
     * Gets the {@link ImageryProvider} type at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of imagery provider.
     */
    CompositeImageryProviderProperty.prototype.getType = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

        var innerProperty = this._composite._intervals.findDataForIntervalContainingDate(time);
        if (defined(innerProperty)) {
            return innerProperty.getType(time);
        }
        return undefined;
    };

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    CompositeImageryProviderProperty.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

        var innerProperty = this._composite._intervals.findDataForIntervalContainingDate(time);
        if (defined(innerProperty)) {
            return innerProperty;
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
    CompositeImageryProviderProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof CompositeImageryProviderProperty && //
                this._composite.equals(other._composite, Property.equals));
    };

    /**
     * @private
     */
    CompositeImageryProviderProperty.prototype._raiseDefinitionChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return CompositeImageryProviderProperty;
});