/*global define*/
define([
        './createPropertyDescriptor'
    ], function(
        createPropertyDescriptor) {
    "use strict";

    function createRawProperty(value) {
        return value;
    }

    /**
     * @private
     */
    function createRawPropertyDescriptor(name, configurable) {
        return createPropertyDescriptor(name, configurable, createRawProperty);
    }

    return createRawPropertyDescriptor;
});