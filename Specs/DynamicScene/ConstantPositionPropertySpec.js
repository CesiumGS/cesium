/*global defineSuite*/
defineSuite([
             'DynamicScene/ConstantPositionProperty',
             'DynamicScene/PositionProperty',
             'Core/Cartesian3',
             'Core/JulianDate',
             'Core/ReferenceFrame'
     ], function(
             ConstantPositionProperty,
             PositionProperty,
             Cartesian3,
             JulianDate,
             ReferenceFrame) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = new JulianDate();

    it('Constructor sets expected defaults', function() {
        var property = new ConstantPositionProperty(new Cartesian3(1, 2, 3));
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

    it('equals works', function() {
        var left = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.INERTIAL);
        var right = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.INERTIAL);

        expect(left.equals(right)).toEqual(true);

        right = new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.FIXED);
        expect(left.equals(right)).toEqual(false);

        right = new ConstantPositionProperty(new Cartesian3(1, 2, 4), ReferenceFrame.INERTIAL);
        expect(left.equals(right)).toEqual(false);
    });

    it('constructor throws with undefined value', function() {
        expect(function() {
            return new ConstantPositionProperty(undefined);
        }).toThrowDeveloperError();
    });

    it('getValue throws without time parameter', function() {
        var property = new ConstantPositionProperty(new Cartesian3(1, 2, 3));
        expect(function() {
            property.getValue(undefined);
        }).toThrowDeveloperError();
    });

    it('getValueInReferenceFrame throws with no referenceFrame parameter', function() {
        var property = new ConstantPositionProperty(new Cartesian3(1, 2, 3));
        var time = new JulianDate();
        expect(function() {
            property.getValueInReferenceFrame(time, undefined);
        }).toThrowDeveloperError();
    });
});