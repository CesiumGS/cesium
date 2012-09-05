/*global defineSuite*/
defineSuite([
         'Core/computeSunPosition',
         'Core/Cartesian3',
         'Core/JulianDate',
         'Core/Math'
     ], function(
         computeSunPosition,
         Cartesian3,
         JulianDate,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('has the sun rising in the east and setting in the west', function() {
        //Julian dates for 24 hours, starting from July 6th 2011 @ 01:00 UTC
        var timesOfDay = [];
        for ( var i = 1; i < 25; i++) {
            var date = new Date('July 6, 2011');
            date.setUTCHours(i, 0, 0, 0);
            timesOfDay.push(JulianDate.fromDate(date));
        }
        var angles = [];
        for (i = 0; i < 24; i++) {
            var position = computeSunPosition(timesOfDay[i]);
            angles.push(CesiumMath.convertLongitudeRange(Math.atan2(position.y, position.x)));
        }
        //Expect a clockwise motion.
        for (i = 1; i < 24; i++) {
            expect(angles[i]).toBeLessThan(angles[i - 1]);
        }
    });

    it('works with a result parameter', function() {
        var result = new Cartesian3();
        var returnedResult = computeSunPosition(new JulianDate(), result);
        expect(result).toBe(returnedResult);
    });

    it('works without a time', function() {
        computeSunPosition(undefined);
    });
});