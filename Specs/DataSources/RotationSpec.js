/*global defineSuite*/
defineSuite([
        'DataSources/Rotation',
        'Core/JulianDate',
        'Core/Math',
        'DataSources/SampledProperty',
        'Specs/createPackableSpecs'
    ], function(
        Rotation,
        JulianDate,
        CesiumMath,
        SampledProperty,
        createPackableSpecs) {
    'use strict';

    it('Interpolates towards the closest angle.', function() {
        var time1 = JulianDate.fromIso8601('2010-05-07T00:00:00');
        var time2 = JulianDate.fromIso8601('2010-05-07T00:01:00');
        var time3 = JulianDate.fromIso8601('2010-05-07T00:02:00');
        var time4 = JulianDate.fromIso8601('2010-05-07T00:03:00');
        var time5 = JulianDate.fromIso8601('2010-05-07T00:04:00');

        var property = new SampledProperty(Rotation);
        property.addSample(time1, 0);
        property.addSample(time3, CesiumMath.toRadians(350));
        property.addSample(time5, CesiumMath.toRadians(10));

        expect(property.getValue(time2)).toEqual(CesiumMath.toRadians(355));
        expect(property.getValue(time4)).toEqual(0);
    });

    createPackableSpecs(Rotation, 1, [1]);
});
