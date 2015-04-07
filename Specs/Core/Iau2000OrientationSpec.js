/*global defineSuite*/
defineSuite([
        'Core/Iau2000Orientation',
        'Core/JulianDate',
        'Core/TimeStandard'
    ], function(
        Iau2000Orientation,
        JulianDate,
        TimeStandard) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('compute moon', function() {
        var date = new JulianDate(2451545.0, -32.184, TimeStandard.TAI);
        var param = Iau2000Orientation.ComputeMoon(date);

        // expected results taken from STK Components:
        //    Iau2000Orientation.ComputeMoon(TimeConstants.J2000);
        var expectedRightAscension = 4.6575460830237914;
        var expectedDeclination = 1.1456533675897986;
        var expectedRotation = 0.71899299269222972;
        var expectedRotationRate = 0.0000026518066425764541;

        expect(param.rightAscension).toEqual(expectedRightAscension);
        expect(param.declination).toEqual(expectedDeclination);
        expect(param.rotation).toEqual(expectedRotation);
        expect(param.rotationRate).toEqual(expectedRotationRate);
    });
});
