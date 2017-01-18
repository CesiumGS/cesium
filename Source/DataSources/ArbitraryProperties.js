/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createMaterialPropertyDescriptor',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createMaterialPropertyDescriptor,
        createPropertyDescriptor) {
    'use strict';

    /**
     * Describes arbitrary properties of an {@link Entity}.
     *
     * @alias ArbitraryProperties
     * @constructor
     *
     * @param {Object} [options] Object with arbitrary properties to assign to this instance.
     *
     * @see Entity
     */
    function ArbitraryProperties(options) {
        this._definitionChanged = new Event();
        this._propertyNames = [];
        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(ArbitraryProperties.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof ArbitraryProperties.prototype
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
     * Duplicates this instance.
     *
     * @param {ArbitraryProperties} [result] The object onto which to store the result.
     * @returns {ArbitraryProperties} The modified result parameter or a new instance if one was not provided.
     */
    ArbitraryProperties.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new ArbitraryProperties();
        }

        for (var i = 0; i < this._propertyNames.length; ++i) {
            var propertyName = this._propertyNames[i];
            result.addProperty(propertyName);
            result[propertyName] = this[propertyName];
        }

        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {ArbitraryProperties} source The object to be merged into this object.
     */
    ArbitraryProperties.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        var propertyNames = source._propertyNames || Object.keys(source);
        for (var i = 0; i < propertyNames.length; ++i) {
            var propertyName = propertyNames[i];
            this.addProperty(propertyName);
            this[propertyName] = defaultValue(this[propertyName], source[propertyName]);
        }
    };

    /**
     * Adds a property if it doesn't already exist.  If it does exist, this function does nothing.
     *
     * @param {String} propertyName The name of the property to add.
     */
    ArbitraryProperties.prototype.addProperty = function(propertyName) {
        if (!defined(Object.getOwnPropertyDescriptor(this, propertyName))) {
            Object.defineProperty(this, propertyName, createPropertyDescriptor(propertyName));
            this._propertyNames.push(propertyName);
        }
    };

    return ArbitraryProperties;
});
