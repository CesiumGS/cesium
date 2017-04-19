/*global defineSuite*/
defineSuite([
        'DataSources/ConstantProperty',
        'Core/Cartesian3',
        'Core/JulianDate'
    ], function(
        ConstantProperty,
        Cartesian3,
        JulianDate) {
    'use strict';

    var time = JulianDate.now();

    it('works with basic types', function() {
        var expected = 5;
        var property = new ConstantProperty(expected);
        expect(property.getValue(time)).toBe(expected);

        expect(property.valueOf()).toBe(expected);
        expect(property.toString()).toBe(expected.toString());
        expect(0 + property).toBe(expected);
        expect('0' + property).toBe('0' + expected);
    });

    it('works with objects', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantProperty(value);

        var result = property.getValue(time);
        expect(result).not.toBe(value);
        expect(result).toEqual(value);

        expect(property.valueOf()).toEqual(value);
        expect(property.toString()).toEqual(value.toString());
    });

    it('works with objects without clone', function() {
        var value = {};
        var property = new ConstantProperty(value);

        var result = property.getValue(time);
        expect(result).toBe(value);
        expect(result).toEqual(value);

        expect(property.valueOf()).toEqual(value);
        expect(property.toString()).toEqual(value.toString());
    });

    it('setValue raises definitionChanged event', function() {
        var property = new ConstantProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.setValue(5);
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('setValue does not raise definitionChanged event with equal data', function() {
        var property = new ConstantProperty(new Cartesian3(0, 0, 0));
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.setValue(new Cartesian3(0, 0, 0));
        expect(listener.calls.count()).toBe(0);
    });

    it('works with objects with result parameter', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantProperty(value);

        var expected = new Cartesian3();
        var result = property.getValue(time, expected);
        expect(result).toBe(expected);
        expect(expected).toEqual(value);
    });

    it('works with undefined value', function() {
        var property = new ConstantProperty(undefined);
        expect(property.getValue()).toBeUndefined();

        expect(property.valueOf()).toBeUndefined();
        expect(0 + property).toBeNaN();
        expect('0' + property).toBe('0' + 'undefined');
    });

    it('equals works for object types with "equals" function', function() {
        var left = new ConstantProperty(new Cartesian3(1, 2, 3));
        var right = new ConstantProperty(new Cartesian3(1, 2, 3));

        expect(left.equals(right)).toEqual(true);

        right = new ConstantProperty(new Cartesian3(1, 2, 4));
        expect(left.equals(right)).toEqual(false);
    });

    it('equals works for object types without "equals" function', function() {
        var value = {};
        var left = new ConstantProperty(value);
        var right = new ConstantProperty(value);

        expect(left.equals(right)).toEqual(true);

        right = new ConstantProperty({});
        expect(left.equals(right)).toEqual(false);
    });

    it('equals works for simple types', function() {
        var left = new ConstantProperty(1);
        var right = new ConstantProperty(1);

        expect(left.equals(right)).toEqual(true);

        right = new ConstantProperty(2);
        expect(left.equals(right)).toEqual(false);
    });
});
