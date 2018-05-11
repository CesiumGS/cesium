define([
        'DataSources/ConstantProperty'
    ], function(
        ConstantProperty) {
    'use strict';

    function testDefinitionChanged(property, name, value1, value2) {
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var oldValue = property[name];
        property[name] = new ConstantProperty(value1);
        expect(listener).toHaveBeenCalledWith(property, name, property[name], oldValue);
        listener.calls.reset();

        property[name].setValue(value2);
        expect(listener).toHaveBeenCalledWith(property, name, property[name], property[name]);
        listener.calls.reset();

        property[name] = property[name];
        expect(listener.calls.count()).toEqual(0);
    }

    return testDefinitionChanged;
});
