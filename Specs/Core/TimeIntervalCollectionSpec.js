defineSuite(['Core/TimeIntervalCollection', 'Core/JulianDate', 'Core/TimeInterval'], function(TimeIntervalCollection, JulianDate, TimeInterval) {
    "use strict";
    /*global it,expect*/
    it('TODO', function() {
        var start = JulianDate.fromTotalDays(1);
        var mid = JulianDate.fromTotalDays(2);
        var stop = JulianDate.fromTotalDays(3);

        var intervals = new TimeIntervalCollection();

        var interval1 = new TimeInterval(start, mid, true, true, 1);
        var interval2 = new TimeInterval(mid, stop, false, true, 2);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);

        expect(intervals.getStart().equals(interval1.start)).toBeTruthy();
        expect(intervals.getStop().equals(interval2.stop)).toBeTruthy();

        expect(intervals.findIntervalContainingDate(start).equals(interval1)).toBeTruthy();
        expect(intervals.findIntervalContainingDate(mid).equals(interval1)).toBeTruthy();
        expect(intervals.findIntervalContainingDate(stop).equals(interval2)).toBeTruthy();
    });
});
