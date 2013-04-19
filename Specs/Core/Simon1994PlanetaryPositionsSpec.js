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

    it('computes correct sun position', function() {
        var date = JulianDate.fromTotalDays(2451545.0, TimeStandard.TAI);
        var sun = PlanetaryPositions.ComputeSun(date);
        var X = 26500268539.790234; //Values from Component
        var Y = -132756447253.27325;
        var Z = -57556483362.533806;
        expect(X).toEqual(sun.x);
        expect(Y).toEqual(sun.y);
        expect(Z).toEqual(sun.z);

        date = JulianDate.fromTotalDays(2456401.5, TimeStandard.TAI);
        sun = PlanetaryPositions.ComputeSun(date);
        X = 131512388940.33589; //Values from Component
        Y = 66661342667.949928;
        Z = 28897975607.905258;
        expect(X).toEqual(sun.x);
        expect(Y).toEqual(sun.y);
        expect(Z).toEqual(sun.z);

        date = JulianDate.fromTotalDays(2455998.591667, TimeStandard.TAI);
        sun = PlanetaryPositions.ComputeSun(date);
        X = 147109989956.19534; //Values from Component
        Y = -19599996881.217579;
        Z = -8497578102.7696457;
        expect(X).toEqual(sun.x);
        expect(Y).toEqual(sun.y);
        expect(Z).toEqual(sun.z);
    });

    it('computes correct moon position', function() {
        var date = JulianDate.fromTotalDays(2451545.0, TimeStandard.TAI);
        var moon = PlanetaryPositions.ComputeMoon(date);
        var X = -291632410.61232185; //Values from Component
        var Y = -266522146.36821631;
        var Z = -75994518.081043154;
        expect(X).toEqual(moon.x);
        expect(Y).toEqual(moon.y);
        expect(Z).toEqual(moon.z);

        date = JulianDate.fromTotalDays(2456401.5, TimeStandard.TAI);
        moon = PlanetaryPositions.ComputeMoon(date);
        X = -223792974.4736526; //Values from Component
        Y = 315772435.34490639;
        Z = 97913011.236112773;
        expect(X).toEqual(moon.x);
        expect(Y).toEqual(moon.y);
        expect(Z).toEqual(moon.z);


        date = JulianDate.fromTotalDays(2455998.591667, TimeStandard.TAI);
        moon = PlanetaryPositions.ComputeMoon(date);
        X = -268426117.00202647; //Values from Component
        Y = -220468861.73998192;
        Z = -110670164.58446842;
        expect(X).toEqual(moon.x);
        expect(Y).toEqual(moon.y);
        expect(Z).toEqual(moon.z);
    });

});
