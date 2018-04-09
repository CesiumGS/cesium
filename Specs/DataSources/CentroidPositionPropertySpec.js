defineSuite([
    'DataSources/CentroidPositionProperty',
    'Core/Cartesian3',
    'Core/JulianDate',
    'Core/ReferenceFrame',
    'DataSources/ConstantProperty',
    'DataSources/PositionProperty'
], function(
    CentroidPositionProperty,
    Cartesian3,
    JulianDate,
    ReferenceFrame,
    ConstantProperty,
    PositionProperty) {
    'use strict';

    var time = JulianDate.now();

    it('Constructor sets expected defaults', function() {
        var positions = new ConstantProperty(Cartesian3.fromDegreesArray([0.0, 0.0,
                                                                         1.0, 0.0,
                                                                         1.0, 1.0,
                                                                         0.0, 1.0]));
        var property = new CentroidPositionProperty(positions);
        expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);
        expect(property.positions).toBe(positions);
    });

    it('getValue works without a result parameter', function() {
        var positions = new ConstantProperty(new Cartesian3(0.0, 0.0, 0.0),
                                             new Cartesian3(1.0, 0.0, 0.0),
                                             new Cartesian3(1.0, 1.0, 0.0),
                                             new Cartesian3(0.0, 1.0, 0.0));
        var property = new CentroidPositionProperty(positions);

        var result = property.getValue(time);
        expect(result).toEqual(new Cartesian3(0.5, 0.5, 0.0));
    });

    it('getValue works with a result parameter', function() {
        var positions = new ConstantProperty([new Cartesian3(0.0, 0.0, 0.0),
                                              new Cartesian3(1.0, 0.0, 0.0),
                                              new Cartesian3(1.0, 1.0, 0.0),
                                              new Cartesian3(0.0, 1.0, 0.0)]);
        var property = new CentroidPositionProperty(positions);

        var expected = new Cartesian3();
        var result = property.getValue(time, expected);
        expect(result).toBe(expected);
        expect(expected).toEqual(new Cartesian3(0.5, 0.5, 0.0));
    });

    it('getValueInReferenceFrame works without a result parameter', function() {
        var positions = new ConstantProperty([new Cartesian3(0.0, 0.0, 0.0),
                                              new Cartesian3(1.0, 0.0, 0.0),
                                              new Cartesian3(1.0, 1.0, 0.0),
                                              new Cartesian3(0.0, 1.0, 0.0)]);
        var property = new CentroidPositionProperty(positions);

        var result = property.getValueInReferenceFrame(time, ReferenceFrame.INERTIAL);
        expect(result).toEqual(PositionProperty.convertToReferenceFrame(time, new Cartesian3(0.5, 0.5, 0.0), ReferenceFrame.FIXED, ReferenceFrame.INERTIAL));
    });

    it('getValueInReferenceFrame works with a result parameter', function() {
        var positions = new ConstantProperty([new Cartesian3(0.0, 0.0, 0.0),
                                              new Cartesian3(1.0, 0.0, 0.0),
                                              new Cartesian3(1.0, 1.0, 0.0),
                                              new Cartesian3(0.0, 1.0, 0.0)]);
        var property = new CentroidPositionProperty(positions);

        var expected = new Cartesian3();
        var result = property.getValueInReferenceFrame(time, ReferenceFrame.FIXED, expected);
        expect(result).toBe(expected);
        expect(expected).toEqual(PositionProperty.convertToReferenceFrame(time, new Cartesian3(0.5, 0.5, 0.0), ReferenceFrame.INERTIAL, ReferenceFrame.FIXED));
    });

    it('equals works', function() {
        var left = new CentroidPositionProperty([new Cartesian3(1, 2, 3)]);
        var right = new CentroidPositionProperty([new Cartesian3(1, 2, 3)]);
        expect(left.equals(right)).toEqual(true);

        right = new CentroidPositionProperty([new Cartesian3(1, 2, 4)]);
        expect(left.equals(right)).toEqual(false);
    });

    it('getValue throws without time parameter', function() {
        var property = new CentroidPositionProperty([new Cartesian3(1, 2, 3)]);
        expect(function() {
            property.getValue(undefined);
        }).toThrowDeveloperError();
    });

    it('getValueInReferenceFrame throws with no referenceFrame parameter', function() {
        var property = new CentroidPositionProperty([new Cartesian3(1, 2, 3)]);
        expect(function() {
            property.getValueInReferenceFrame(time, undefined);
        }).toThrowDeveloperError();
    });
});
