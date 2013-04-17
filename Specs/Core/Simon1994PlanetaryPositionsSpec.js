/*global defineSuite*/
defineSuite(['Core/Simon1994PlanetaryPositions',
             'Core/JulianDate',
             'Core/TimeStandard',
             'Core/TimeConstants',
             'Core/Math'],
function(PlanetaryPositions,
         JulianDate,
         TimeStandard,
         TimeConstants,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    // All exact Julian Dates found using NASA's Time Conversion Tool: http://ssd.jpl.nasa.gov/tc.cgi
    it('runs moon', function() {
        var currentDate = JulianDate.fromTotalDays(2436912.5, TimeStandard.TAI);
        var moonPosition = PlanetaryPositions.ComputeMoon(currentDate);
        expect(true).toEqual(true);
    });

    it('runs barycenter', function() {
        var currentDate = JulianDate.fromTotalDays(2436912.5, TimeStandard.TAI);
        var barycenter = PlanetaryPositions.ComputeEarthMoonBarycenter(currentDate);
        expect(true).toEqual(true);
    });
});
