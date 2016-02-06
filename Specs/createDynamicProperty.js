/*global define*/
define([
        'Core/defineProperties',
        'DataSources/ConstantProperty'
    ], function(
        defineProperties,
        ConstantProperty) {
    'use strict';

    return function(value) {
        var property = new ConstantProperty(value);
        defineProperties(property, {
            isConstant : {
                value : false
            }
        });
        return property;
    };
});
