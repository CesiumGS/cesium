(function() {
    "use strict";
    /*global Cesium, Math, describe, it, expect*/

    describe('TimeIntervalCollectionSpec', function() {
        it('TODO', function() {
            var start = new Cesium.JulianDate(1);
            var mid = new Cesium.JulianDate(2);
            var stop = new Cesium.JulianDate(3);

            var intervals = new Cesium.TimeIntervalCollection();

            var interval1 = new Cesium.TimeInterval(start, mid, true, true, 1);
            var interval2 = new Cesium.TimeInterval(mid, stop, false, true, 2);
            intervals.addInterval(interval1);
            intervals.addInterval(interval2);

            expect(intervals.getStart().equals(interval1.start)).toBeTruthy();
            expect(intervals.getStop().equals(interval2.stop)).toBeTruthy();

            expect(intervals.findIntervalContainingDate(start).equals(interval1)).toBeTruthy();
            expect(intervals.findIntervalContainingDate(mid).equals(interval1)).toBeTruthy();
            expect(intervals.findIntervalContainingDate(stop).equals(interval2)).toBeTruthy();
        });
    });
})();