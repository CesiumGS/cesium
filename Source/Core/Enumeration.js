/*global define*/
define(['./defined'], function(defined) {
    "use strict";

    /**
     * Constructs an enumeration that contains both a numeric value and a name.
     * This is used so the name of the enumeration is available in the debugger.
     *
     * @param {Number} [value=undefined] The numeric value of the enumeration.
     * @param {String} [name=undefined] The name of the enumeration for debugging purposes.
     * @param {Object} [properties=undefined] An object containing extra properties to be added to the enumeration.
     *
     * @alias Enumeration
     * @constructor
     * @example
     * // Create an object with two enumerations.
     * var filter = {
     *     NEAREST : new Cesium.Enumeration(0x2600, 'NEAREST'),
     *     LINEAR : new Cesium.Enumeration(0x2601, 'LINEAR')
     * };
     */
    var Enumeration = function(value, name, properties) {
        /**
         * The numeric value of the enumeration.
         * @type {Number}
         * @default undefined
         */
        this.value = value;

        /**
         * The name of the enumeration for debugging purposes.
         * @type {String}
         * @default undefined
         */
        this.name = name;

        if (defined(properties)) {
            for ( var propertyName in properties) {
                if (properties.hasOwnProperty(propertyName)) {
                    this[propertyName] = properties[propertyName];
                }
            }
        }
    };

    /**
     * Returns the numeric value of the enumeration.
     *
     * @memberof Enumeration
     *
     * @returns {Number} The numeric value of the enumeration.
     */
    Enumeration.prototype.valueOf = function() {
        return this.value;
    };

    /**
     * Returns the name of the enumeration for debugging purposes.
     *
     * @memberof Enumeration
     *
     * @returns {String} The name of the enumeration for debugging purposes.
     */
    Enumeration.prototype.toString = function() {
        return this.name;
    };

    return Enumeration;
});
