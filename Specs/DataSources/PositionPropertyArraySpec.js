defineSuite([
        'DataSources/PositionPropertyArray',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/ReferenceFrame',
        'DataSources/ConstantPositionProperty',
        'DataSources/SampledPositionProperty'
    ], function(
        PositionPropertyArray,
        Cartesian3,
        JulianDate,
        ReferenceFrame,
        ConstantPositionProperty,
        SampledPositionProperty) {
    'use strict';

    var time = JulianDate.now();

    it('default constructor sets expected values', function() {
        var property = new PositionPropertyArray();
        expect(property.isConstant).toBe(true);
        expect(property.getValue(time)).toBeUndefined();
    });

    it('constructor sets expected values', function() {
        var expected = [Cartesian3.UNIT_X, Cartesian3.UNIT_Z];
        var value = [new ConstantPositionProperty(Cartesian3.UNIT_X), new ConstantPositionProperty(Cartesian3.UNIT_Z)];
        var property = new PositionPropertyArray(value);
        expect(property.getValue(time)).toEqual(expected);
    });

    it('setValue raises definitionChanged event', function() {
        var property = new PositionPropertyArray();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.setValue([]);
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('changing array member raises definitionChanged event', function() {
        var property = new PositionPropertyArray();
        var item = new ConstantPositionProperty(Cartesian3.UNIT_X);
        property.setValue([item]);
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        item.setValue(Cartesian3.UNIT_Z);
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('works with result parameter', function() {
        var expected = [Cartesian3.UNIT_X, Cartesian3.UNIT_Z];
        var expectedResult = [];
        var value = [new ConstantPositionProperty(Cartesian3.UNIT_X), new ConstantPositionProperty(Cartesian3.UNIT_Z)];
        var property = new PositionPropertyArray(value);
        var result = property.getValue(time, expectedResult);
        expect(result).toEqual(expected);
        expect(result).toBe(expectedResult);
    });

    it('works with  reference frame parameter', function() {
        var value = [new ConstantPositionProperty(Cartesian3.UNIT_X, ReferenceFrame.INERTIAL), new ConstantPositionProperty(Cartesian3.UNIT_Z, ReferenceFrame.FIXED)];
        var expected = [value[0].getValueInReferenceFrame(time, ReferenceFrame.INERTIAL), value[1].getValueInReferenceFrame(time, ReferenceFrame.INERTIAL)];
        var property = new PositionPropertyArray(value);
        var result = property.getValueInReferenceFrame(time, ReferenceFrame.INERTIAL);
        expect(result).toEqual(expected);
    });

    it('works with undefined value', function() {
        var property = new PositionPropertyArray();
        property.setValue(undefined);
        expect(property.getValue(time)).toBeUndefined();
    });

    it('works with undefined propertyvalue', function() {
        var property = new PositionPropertyArray();
        property.setValue([new ConstantPositionProperty()]);
        expect(property.getValue(time)).toEqual([]);
    });

    it('works with empty array', function() {
        var property = new PositionPropertyArray();
        property.setValue([]);
        expect(property.getValue(time)).toEqual([]);
    });

    it('equals works', function() {
        var left = new PositionPropertyArray([new ConstantPositionProperty(Cartesian3.UNIT_X)]);
        var right = new PositionPropertyArray([new ConstantPositionProperty(Cartesian3.UNIT_X)]);

        expect(left.equals(right)).toEqual(true);

        right = new PositionPropertyArray([new ConstantPositionProperty(Cartesian3.UNIT_Z)]);
        expect(left.equals(right)).toEqual(false);

        left = new PositionPropertyArray();
        right = new PositionPropertyArray();
        expect(left.equals(right)).toEqual(true);
    });

    it('isConstant is true only if all members are constant', function() {
        var property = new PositionPropertyArray();

        property.setValue([new ConstantPositionProperty(Cartesian3.UNIT_X)]);
        expect(property.isConstant).toBe(true);

        var sampledProperty = new SampledPositionProperty();
        sampledProperty.addSample(time, Cartesian3.UNIT_X);
        property.setValue([new ConstantPositionProperty(Cartesian3.UNIT_Z), sampledProperty]);

        expect(property.isConstant).toBe(false);
    });
});
