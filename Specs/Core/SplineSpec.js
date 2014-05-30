/*global defineSuite*/
defineSuite([
        'Core/Spline',
        'Core/Cartesian3',
        'Core/HermiteSpline'
    ], function(
        Spline,
        Cartesian3,
        HermiteSpline) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('contructor throws', function() {
        expect(function() {
            return new Spline();
        }).toThrowDeveloperError();
    });

    it('findTimeInterval throws without a time', function() {
        var spline = HermiteSpline.createNaturalCubic({
            points : [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
            times : [0.0, 1.0, 2.0]
        });

        expect(function() {
            spline.findTimeInterval();
        }).toThrowDeveloperError();
    });

    it('findTimeInterval throws when time is out of range', function() {
        var spline = HermiteSpline.createNaturalCubic({
            points : [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y],
            times : [0.0, 1.0, 2.0]
        });

        expect(function() {
            spline.findTimeInterval(4.0);
        }).toThrowDeveloperError();
    });

    it('findTimeInterval', function() {
        var spline = HermiteSpline.createNaturalCubic({
            points : [Cartesian3.ZERO, Cartesian3.UNIT_X, Cartesian3.UNIT_Y, Cartesian3.UNIT_Z],
            times : [0.0, 1.0, 2.0, 4.0]
        });
        var times = spline.times;

        expect(spline.findTimeInterval(times[0])).toEqual(0);

        // jump forward
        expect(spline.findTimeInterval(times[1])).toEqual(1);

        // jump backward
        expect(spline.findTimeInterval(times[0], 1)).toEqual(0);

        // jump far forward
        expect(spline.findTimeInterval(times[times.length - 2], 0)).toEqual(times.length - 2);

        // jump far back
        expect(spline.findTimeInterval(times[0], times.length - 1)).toEqual(0);
    });
});
