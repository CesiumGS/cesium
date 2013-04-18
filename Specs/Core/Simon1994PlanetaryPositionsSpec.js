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
        var X = -310555583.43170923;  //Values from Components
        var Y = 251142594.25981933;
        var Z = 0.0;
        expect(X).toEqual(moonPosition.x);
        expect(Y).toEqual(moonPosition.y);
        expect(Z).toEqual(moonPosition.z);
    });

    it('runs barycenter', function() {
        var currentDate = JulianDate.fromTotalDays(2436912.5, TimeStandard.TAI);
        var barycenter = PlanetaryPositions.ComputeEarthMoonBarycenter(currentDate);
        var X = 133440054709.63293;  //Values from Components
        var Y = -62423836255.45192;
        var Z = 0.0;
        expect(X).toEqual(barycenter.x);
        expect(Y).toEqual(barycenter.y);
        expect(Z).toEqual(barycenter.z);
    });
});
