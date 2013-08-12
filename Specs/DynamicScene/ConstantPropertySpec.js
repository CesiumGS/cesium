/*global defineSuite*/
defineSuite([
             'DynamicScene/ConstantProperty',
             'Core/Cartesian3'
     ], function(
             ConstantProperty,
             Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('works with basic types', function() {
        var expected = 5;
        var property = new ConstantProperty(expected);
        expect(property.getIsTimeVarying()).toEqual(false);
        expect(property.getValue()).toBe(expected);
    });

    it('works with clone function', function() {
        var expected = {};
        var cloneCalled = false;
        var cloneFunction = function() {
            cloneCalled = true;
            return expected;
        };
        var property = new ConstantProperty(expected, cloneFunction);
        expect(property.getIsTimeVarying()).toEqual(false);
        expect(property.getValue()).toBe(expected);
        expect(cloneCalled).toEqual(true);
    });

    it('works with clonable objects', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantProperty(value);
        expect(property.getIsTimeVarying()).toEqual(false);

        var result = property.getValue();
        expect(result).not.toBe(value);
        expect(result).toEqual(value);
    });

    it('works with clonable objects with result parameter', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantProperty(value);
        expect(property.getIsTimeVarying()).toEqual(false);

        var expected = new Cartesian3();
        var result = property.getValue(undefined, expected);
        expect(result).toBe(expected);
        expect(expected).toEqual(value);
    });

    it('constructor throws with undefined value', function() {
        expect(function() {
            return new ConstantProperty(undefined, function() {
            });
        }).toThrow();
    });

    it('constructor throws with undefined clone function on non-basic type', function() {
        expect(function() {
            return new ConstantProperty({}, undefined);
        }).toThrow();
    });
});