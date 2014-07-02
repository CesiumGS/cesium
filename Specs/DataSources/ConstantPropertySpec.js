/*global defineSuite*/
defineSuite([
        'DataSources/ConstantProperty',
        'Core/Cartesian3',
        'Core/JulianDate'
    ], function(
        ConstantProperty,
        Cartesian3,
        JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    it('works with basic types', function() {
        var expected = 5;
        var property = new ConstantProperty(expected);
        expect(property.getValue(time)).toBe(expected);
    });

    it('works with objects', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantProperty(value);

        var result = property.getValue(time);
        expect(result).not.toBe(value);
        expect(result).toEqual(value);
    });

    it('setValue rasies definitionChanged event', function() {
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
        expect(listener.callCount).toBe(0);
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
    });

    it('constructor throws with undefined clone function on non-basic type', function() {
        expect(function() {
            return new ConstantProperty({
                equals : function() {
                    return true;
                }
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with undefined equals function on non-basic type', function() {
        expect(function() {
            return new ConstantProperty({
                clone : function() {
                    return {};
                }
            });
        }).toThrowDeveloperError();
    });

    it('equals works for object types', function() {
        var left = new ConstantProperty(new Cartesian3(1, 2, 3));
        var right = new ConstantProperty(new Cartesian3(1, 2, 3));

        expect(left.equals(right)).toEqual(true);

        right = new ConstantProperty(new Cartesian3(1, 2, 4));
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