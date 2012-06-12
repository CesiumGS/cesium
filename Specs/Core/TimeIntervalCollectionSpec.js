/*global defineSuite*/
defineSuite([
         'Core/TimeIntervalCollection',
         'Core/JulianDate',
         'Core/TimeInterval'
     ], function(
         TimeIntervalCollection,
         JulianDate,
         TimeInterval) {
    "use strict";
    /*global it,expect*/

    it('construction', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.getLength()).toEqual(0);
        expect(intervals.getStart()).toBeUndefined();
        expect(intervals.getStop()).toBeUndefined();
        expect(intervals.isEmpty()).toEqual(true);
    });

    it('contains', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        intervals.addInterval(interval1);
        expect(intervals.contains(interval1.start)).toEqual(true);
        expect(intervals.contains(interval1.stop)).toEqual(false);
    });

    it('indexOf', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        intervals.addInterval(interval1);
        expect(intervals.indexOf(interval1.start)).toEqual(0);
        expect(intervals.indexOf(interval1.stop) < 0).toEqual(true);
    });

    it('get', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        intervals.addInterval(interval1);
        expect(intervals.get(0)).toEqual(interval1);
        expect(intervals.get(1)).toBeUndefined();
    });

    it('findInterval', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        intervals.addInterval(interval1);
        expect(intervals.findInterval(interval1.start, interval1.stop)).toEqual(interval1);
        expect(intervals.findInterval(interval1.start, interval1.stop, true, false)).toEqual(interval1);
        expect(intervals.findInterval(interval1.start, interval1.stop, false, true)).toBeUndefined();
    });

    it('getStart & getStop', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, false);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.getStart()).toEqual(interval1.start);
        expect(intervals.getStop()).toEqual(interval2.stop);
    });

    it('isEmpty and clear', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.isEmpty()).toEqual(true);

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false));
        expect(intervals.isEmpty()).toEqual(false);

        intervals.clear();
        expect(intervals.isEmpty()).toEqual(true);
    });

    it('getLength', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.getLength()).toEqual(0);

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true, 1));
        expect(intervals.getLength()).toEqual(1);

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, true, 2));
        expect(intervals.getLength()).toEqual(3);

        intervals.clear();
        expect(intervals.getLength()).toEqual(0);
    });

    it('getLength same data', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.getLength()).toEqual(0);

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true, 1));
        expect(intervals.getLength()).toEqual(1);

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, true, 1));
        expect(intervals.getLength()).toEqual(1);

        intervals.clear();
        expect(intervals.getLength()).toEqual(0);
    });

    it('addInterval/findIntervalContainingDate non-overlapping', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, true, 1);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true, 2);
        var interval3 = new TimeInterval(JulianDate.fromTotalDays(4), JulianDate.fromTotalDays(5), true, true, 3);

        var intervals = new TimeIntervalCollection();

        intervals.addInterval(interval1);
        expect(intervals.getLength()).toEqual(1);
        expect(intervals.getStart().equals(interval1.start)).toEqual(true);
        expect(intervals.getStop().equals(interval1.stop)).toEqual(true);
        expect(intervals.isEmpty()).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).equals(interval1)).toEqual(true);
        expect(intervals.findIntervalContainingDate(interval1.stop).equals(interval1)).toEqual(true);

        intervals.addInterval(interval2);

        expect(intervals.getLength()).toEqual(2);
        expect(intervals.getStart().equals(interval1.start)).toEqual(true);
        expect(intervals.getStop().equals(interval2.stop)).toEqual(true);
        expect(intervals.isEmpty()).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).equals(interval1)).toEqual(true);
        expect(intervals.findIntervalContainingDate(interval1.stop).equals(interval1)).toEqual(true);
        expect(intervals.findIntervalContainingDate(interval2.stop).equals(interval2)).toEqual(true);

        intervals.addInterval(interval3);
        expect(intervals.getLength()).toEqual(3);
        expect(intervals.getStart().equals(interval1.start)).toEqual(true);
        expect(intervals.getStop().equals(interval3.stop)).toEqual(true);
        expect(intervals.isEmpty()).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).equals(interval1)).toEqual(true);
        expect(intervals.findIntervalContainingDate(interval1.stop).equals(interval1)).toEqual(true);
        expect(intervals.findIntervalContainingDate(interval2.stop).equals(interval2)).toEqual(true);
        expect(intervals.findIntervalContainingDate(interval3.start).equals(interval3)).toEqual(true);
        expect(intervals.findIntervalContainingDate(interval3.stop).equals(interval3)).toEqual(true);
    });

    it('addInterval/findIntervalContainingDate overlapping', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2.5), true, true, 1);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true, 2);
        var interval3 = new TimeInterval(interval1.start, interval2.stop, true, true, 3);

        var intervals = new TimeIntervalCollection();

        intervals.addInterval(interval1);
        expect(intervals.getLength()).toEqual(1);
        expect(intervals.getStart().equals(interval1.start)).toEqual(true);
        expect(intervals.getStop().equals(interval1.stop)).toEqual(true);
        expect(intervals.isEmpty()).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(1);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(1);

        intervals.addInterval(interval2);

        expect(intervals.getLength()).toEqual(2);
        expect(intervals.getStart().equals(interval1.start)).toEqual(true);
        expect(intervals.getStop().equals(interval2.stop)).toEqual(true);
        expect(intervals.isEmpty()).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(1);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(2);
        expect(intervals.findIntervalContainingDate(interval2.stop).data).toEqual(2);

        intervals.addInterval(interval3);
        expect(intervals.getLength()).toEqual(1);
        expect(intervals.getStart().equals(interval3.start)).toEqual(true);
        expect(intervals.getStop().equals(interval3.stop)).toEqual(true);
        expect(intervals.isEmpty()).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval2.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval2.stop).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval3.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval3.stop).data).toEqual(3);
    });

    function testCompare(lhs, rhs) {
        return lhs.value === rhs.value;
    }

    it('addInterval dataComparer', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.getLength()).toEqual(0);

        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true, {value : 2});
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, false, {value : 2});
        var interval3 = new TimeInterval(JulianDate.fromTotalDays(3), JulianDate.fromTotalDays(4), true, true, {value : 3});

        intervals.addInterval(interval1, testCompare);
        expect(intervals.getLength()).toEqual(1);
        expect(intervals.getStart()).toEqual(interval1.start);
        expect(intervals.getStop()).toEqual(interval1.stop);

        intervals.addInterval(interval2, testCompare);
        expect(intervals.getLength()).toEqual(1);
        expect(intervals.getStart()).toEqual(interval1.start);
        expect(intervals.getStop()).toEqual(interval1.stop);

        intervals.addInterval(interval3, testCompare);
        expect(intervals.getLength()).toEqual(2);
        expect(intervals.getStart()).toEqual(interval1.start);
        expect(intervals.getStop()).toEqual(interval1.stop);
        expect(intervals.get(0).start).toEqual(interval1.start);
        expect(intervals.get(0).stop).toEqual(interval3.start);
        expect(intervals.get(0).isStartIncluded).toEqual(true);
        expect(intervals.get(0).isStopIncluded).toEqual(false);

        expect(intervals.get(1).start).toEqual(interval3.start);
        expect(intervals.get(1).stop).toEqual(interval3.stop);
        expect(intervals.get(1).isStartIncluded).toEqual(true);
        expect(intervals.get(1).isStopIncluded).toEqual(true);
    });

    it('removeInterval', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.getLength()).toEqual(0);

        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true);
        var removedInterval = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, false);
        intervals.addInterval(interval);
        expect(intervals.removeInterval(removedInterval)).toEqual(true);

        expect(intervals.getLength()).toEqual(2);
        expect(intervals.get(0).start).toEqual(interval.start);
        expect(intervals.get(0).stop).toEqual(removedInterval.start);
        expect(intervals.get(0).isStartIncluded).toEqual(true);
        expect(intervals.get(0).isStopIncluded).toEqual(false);

        expect(intervals.get(1).start).toEqual(removedInterval.stop);
        expect(intervals.get(1).stop).toEqual(interval.stop);
        expect(intervals.get(1).isStartIncluded).toEqual(true);
        expect(intervals.get(1).isStopIncluded).toEqual(true);

        expect(intervals.removeInterval(removedInterval)).toEqual(false);
        expect(intervals.removeInterval(TimeInterval.EMPTY)).toEqual(false);
    });
});
