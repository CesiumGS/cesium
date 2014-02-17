/*global defineSuite*/
defineSuite(['DynamicScene/PropertyArray',
             'DynamicScene/ConstantProperty',
             'DynamicScene/SampledProperty',
             'Core/Cartesian3',
             'Core/JulianDate'
     ], function(
             PropertyArray,
             ConstantProperty,
             SampledProperty,
             Cartesian3,
             JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = new JulianDate();

    it('default constructor sets expected values', function() {
        var property = new PropertyArray();
        expect(property.isConstant).toBe(true);
        expect(property.getValue(time)).toBeUndefined();
    });

    it('constructor sets expected values', function() {
        var expected = [1, 2];
        var value = [new ConstantProperty(1), new ConstantProperty(2)];
        var property = new PropertyArray(value);
        expect(property.getValue(time)).toEqual(expected);
    });

    it('setValue rasies definitionChanged event', function() {
        var property = new PropertyArray();
        spyOn(property.definitionChanged, 'raiseEvent');
        property.setValue([]);
        expect(property.definitionChanged.raiseEvent).toHaveBeenCalledWith(property);
    });

    it('changing array member raises definitionChanged event', function() {
        var property = new PropertyArray();
        var item = new ConstantProperty(1);
        property.setValue([item]);
        spyOn(property.definitionChanged, 'raiseEvent');
        item.setValue(2);
        expect(property.definitionChanged.raiseEvent).toHaveBeenCalledWith(property);
    });

    it('works with result parameter', function() {
        var expected = [1, 2];
        var expectedResult = [];
        var value = [new ConstantProperty(1), new ConstantProperty(2)];
        var property = new PropertyArray(value);
        var result = property.getValue(time, expectedResult);
        expect(result).toEqual(expected);
        expect(result).toBe(expectedResult);
    });

    it('works with undefined value', function() {
        var property = new PropertyArray();
        property.setValue(undefined);
        expect(property.getValue()).toBeUndefined();
    });

    it('ignores undefined property values', function() {
        var property = new PropertyArray();
        property.setValue([new ConstantProperty()]);
        expect(property.getValue()).toEqual([]);
    });

    it('works with empty array', function() {
        var property = new PropertyArray();
        property.setValue([]);
        expect(property.getValue()).toEqual([]);
    });

    it('equals works', function() {
        var left = new PropertyArray([new ConstantProperty(1)]);
        var right = new PropertyArray([new ConstantProperty(1)]);

        expect(left.equals(right)).toEqual(true);

        right = new PropertyArray([new ConstantProperty(2)]);
        expect(left.equals(right)).toEqual(false);
    });

    it('isConstant is true only if all members are constant', function() {
        var property = new PropertyArray();

        property.setValue([new ConstantProperty(2)]);
        expect(property.isConstant).toBe(true);

        var sampledProperty = new SampledProperty(Number);
        sampledProperty.addSample(time, 1);
        property.setValue([new ConstantProperty(2), sampledProperty]);

        expect(property.isConstant).toBe(false);
    });
});