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
    it('computes correct moon position', function() {
        var currentDate = JulianDate.fromTotalDays(2436912.5, TimeStandard.TAI);
        var moonPosition = PlanetaryPositions.ComputeMoon(currentDate);
        var X = 372647535.2552585;  //Values from Components
        var Y = 143215503.84613365;
        var Z = -11853563.95522036;
        expect(X).toEqual(moonPosition.x);
        expect(Y).toEqual(moonPosition.y);
        expect(Z).toEqual(moonPosition.z);
    });

    it('computes correct barycenter position', function() {
        var currentDate = JulianDate.fromTotalDays(2436912.5, TimeStandard.TAI);
        var barycenter = PlanetaryPositions.ComputeEarthMoonBarycenter(currentDate);
        var X = 31288710237.377586;  //Values from Components
        var Y = 143958327190.45502;
        var Z = 13340338.298154578;
        expect(X).toEqual(barycenter.x);
        expect(Y).toEqual(barycenter.y);
        expect(Z).toEqual(barycenter.z);
    });

    it('computes correct earth position', function() {
        var currentDate = JulianDate.fromTotalDays(2436912.5, TimeStandard.TAI);
        var earth = PlanetaryPositions.ComputeEarth(currentDate);
        var X = -4527884.22375562;  //Values from Components
        var Y = -1740151.642269504;
        var Z = 144027.69413557573;
        expect(X).toEqual(earth.x);
        expect(Y).toEqual(earth.y);
        expect(Z).toEqual(earth.z);
    });

});
