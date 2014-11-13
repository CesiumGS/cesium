/*global defineSuite*/
defineSuite([
        'DataSources/ConstantPositionProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/ReferenceFrame',
        'DataSources/PositionProperty'
    ], function(
        ConstantPositionProperty,
        Cartesian3,
        JulianDate,
        ReferenceFrame,
        PositionProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    it('Constructor sets expected defaults', function() {
        var property = new ConstantPositionProperty();
        expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);

        property = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.INERTIAL);
        expect(property.referenceFrame).toBe(ReferenceFrame.INERTIAL);
    });

    it('getValue works without a result parameter', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantPositionProperty(value);

        var result = property.getValue(time);
        expect(result).not.toBe(value);
        expect(result).toEqual(value);
    });

    it('getValue works with a result parameter', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantPositionProperty(value);

        var expected = new Cartesian3();
        var result = property.getValue(time, expected);
        expect(result).toBe(expected);
        expect(expected).toEqual(value);
    });

    it('getValue returns in fixed frame', function() {
        var valueInertial = new Cartesian3(1, 2, 3);
        var valueFixed = PositionProperty.convertToReferenceFrame(time, valueInertial, ReferenceFrame.INERTIAL, ReferenceFrame.FIXED);
        var property = new ConstantPositionProperty(valueInertial, ReferenceFrame.INERTIAL);

        var result = property.getValue(time);
        expect(result).toEqual(valueFixed);
    });

    it('getValue works with undefined fixed value', function() {
        var property = new ConstantPositionProperty(undefined);
        expect(property.getValue(time)).toBeUndefined();
    });

    it('getValue work swith undefined inertial value', function() {
        var property = new ConstantPositionProperty(undefined, ReferenceFrame.INERTIAL);
        expect(property.getValue(time)).toBeUndefined();
    });

    it('getValueInReferenceFrame works without a result parameter', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantPositionProperty(value);

        var result = property.getValueInReferenceFrame(time, ReferenceFrame.INERTIAL);
        expect(result).not.toBe(value);
        expect(result).toEqual(PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.FIXED, ReferenceFrame.INERTIAL));
    });

    it('getValueInReferenceFrame works with a result parameter', function() {
        var value = new Cartesian3(1, 2, 3);
        var property = new ConstantPositionProperty(value, ReferenceFrame.INERTIAL);

        var expected = new Cartesian3();
        var result = property.getValueInReferenceFrame(time, ReferenceFrame.FIXED, expected);
        expect(result).toBe(expected);
        expect(expected).toEqual(PositionProperty.convertToReferenceFrame(time, value, ReferenceFrame.INERTIAL, ReferenceFrame.FIXED));
    });

    it('setValue raises definitionChanged event', function() {
        var property = new ConstantPositionProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.setValue(new Cartesian3(1, 2, 3));
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('setValue does not raise definitionChanged event with equal data', function() {
        var property = new ConstantPositionProperty(new Cartesian3(0, 0, 0));
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.setValue(new Cartesian3(0, 0, 0));
        expect(listener.callCount).toBe(0);
    });

    it('setValue raises definitionChanged when referenceFrame changes', function() {
        var property = new ConstantPositionProperty(new Cartesian3(0, 0, 0), ReferenceFrame.FIXED);
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);
        property.setValue(new Cartesian3(0, 0, 0), ReferenceFrame.INERTIAL);
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('equals works', function() {
        var left = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.INERTIAL);
        var right = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.INERTIAL);

        expect(left.equals(right)).toEqual(true);

        right = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.FIXED);
        expect(left.equals(right)).toEqual(false);

        right = new ConstantPositionProperty(new Cartesian3(1, 2, 4), ReferenceFrame.INERTIAL);
        expect(left.equals(right)).toEqual(false);
    });

    it('getValue throws without time parameter', function() {
        var property = new ConstantPositionProperty(new Cartesian3(1, 2, 3));
        expect(function() {
            property.getValue(undefined);
        }).toThrowDeveloperError();
    });

    it('getValueInReferenceFrame throws with no referenceFrame parameter', function() {
        var property = new ConstantPositionProperty(new Cartesian3(1, 2, 3));
        expect(function() {
            property.getValueInReferenceFrame(time, undefined);
        }).toThrowDeveloperError();
    });
});