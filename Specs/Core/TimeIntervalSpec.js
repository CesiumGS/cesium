/*global defineSuite*/
defineSuite([
         'Core/TimeInterval',
         'Core/JulianDate'
     ], function(
         TimeInterval,
         JulianDate) {
    "use strict";
    /*global it,expect*/

    it('Construction', function() {
        var start = new JulianDate(), stop = start.addDays(1), isStartIncluded = false, isStopIncluded = true, data = {};

        var interval = new TimeInterval(start, stop, isStartIncluded, isStopIncluded, data);
        expect(interval.start === start).toEqual(true);
        expect(interval.stop === stop).toEqual(true);
        expect(interval.isStartIncluded === isStartIncluded).toEqual(true);
        expect(interval.isStopIncluded === isStopIncluded).toEqual(true);
        expect(interval.data === data).toEqual(true);

        interval = new TimeInterval(start, stop);
        expect(interval.start === start).toEqual(true);
        expect(interval.stop === stop).toEqual(true);
        expect(interval.isStartIncluded).toEqual(true);
        expect(interval.isStopIncluded).toEqual(true);
        expect(interval.data === undefined).toEqual(true);
    });

    it('throws with undefined start', function() {
        expect(function() {
            return new TimeInterval(undefined, new JulianDate());
        }).toThrow();
    });

    it('throws with undefined stop', function() {
        expect(function() {
            return new TimeInterval(new JulianDate());
        }).toThrow();
    });

    it('IsEmpty', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1));
        expect(interval.isEmpty).toEqual(false);

        interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1), false, false);
        expect(interval.isEmpty).toEqual(true);

        interval = new TimeInterval(JulianDate.fromTotalDays(5), JulianDate.fromTotalDays(4));
        expect(interval.isEmpty).toEqual(true);
        expect(interval.contains(JulianDate.fromTotalDays(4.5))).toEqual(false);

        interval = new TimeInterval(JulianDate.fromTotalDays(5), JulianDate.fromTotalDays(5), false, true);
        expect(interval.isEmpty).toEqual(true);
        expect(interval.contains(interval.start)).toEqual(false);

        interval = new TimeInterval(JulianDate.fromTotalDays(5), JulianDate.fromTotalDays(5), true, false);
        expect(interval.isEmpty).toEqual(true);
        expect(interval.contains(interval.start)).toEqual(false);

        interval = new TimeInterval(JulianDate.fromTotalDays(5), JulianDate.fromTotalDays(5), true, true);
        expect(interval.isEmpty).toEqual(false);
        expect(interval.contains(interval.start)).toEqual(true);
    });

    it('Contains', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(2451545), JulianDate.fromTotalDays(2451546));
        expect(interval1.contains(JulianDate.fromTotalDays(2451545))).toEqual(true);
        expect(interval1.contains(JulianDate.fromTotalDays(2451545.5))).toEqual(true);
        expect(interval1.contains(JulianDate.fromTotalDays(2451546))).toEqual(true);
        expect(interval1.contains(JulianDate.fromTotalDays(2451546.5))).toEqual(false);

        var interval2 = new TimeInterval(interval1.start, interval1.stop, false, false);
        expect(interval2.contains(JulianDate.fromTotalDays(2451545))).toEqual(false);
        expect(interval2.contains(JulianDate.fromTotalDays(2451545.5))).toEqual(true);
        expect(interval2.contains(JulianDate.fromTotalDays(2451546))).toEqual(false);
        expect(interval2.contains(JulianDate.fromTotalDays(2451546.5))).toEqual(false);
    });

    it('Equality', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        expect(interval1.equals(interval2)).toEqual(true);
        expect(interval2.equals(interval1)).toEqual(true);
        expect(interval1.equalsEpsilon(interval2, 0)).toEqual(true);
        expect(interval2.equalsEpsilon(interval1, 0)).toEqual(true);

        interval2 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(3));
        expect(interval1.equals(interval2)).toEqual(false);
        expect(interval2.equals(interval1)).toEqual(false);
        expect(interval1.equalsEpsilon(interval2, 0)).toEqual(false);
        expect(interval2.equalsEpsilon(interval1, 0)).toEqual(false);
        expect(interval1.equalsEpsilon(interval2, 86400)).toEqual(true);
        expect(interval2.equalsEpsilon(interval1, 86400)).toEqual(true);

        interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1), true, true);
        interval2 = new TimeInterval(JulianDate.fromTotalDays(1), new JulianDate(1, 1), true, false);
        expect(interval1.equals(interval2)).toEqual(false);
        expect(interval2.equals(interval1)).toEqual(false);
        expect(interval1.equalsEpsilon(interval2, 1.1)).toEqual(false);
        expect(interval2.equalsEpsilon(interval1, 1.1)).toEqual(false);

        expect(interval1.equals(undefined)).toEqual(false);
        expect(interval1.equalsEpsilon(undefined, 1.0)).toEqual(false);
    });

    it('Intersect', function() {
        var testParameters = [new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2.5), true, true),
                new TimeInterval(JulianDate.fromTotalDays(1.5), JulianDate.fromTotalDays(2), true, true),
                new TimeInterval(JulianDate.fromTotalDays(1.5), JulianDate.fromTotalDays(2), true, true),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2.5), true, true),
                new TimeInterval(JulianDate.fromTotalDays(3), JulianDate.fromTotalDays(4), true, true),
                new TimeInterval(JulianDate.fromTotalDays(0), JulianDate.fromTotalDays(0), false, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2.5), true, true),
                new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, true),
                new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(2.5), true, true),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, true),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), false, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), false, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), false, true),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), false, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(3), false, false),
                new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(4), false, false),
                new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(3), false, false),
                new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(4), true, true),
                new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1), false, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, true),
                new TimeInterval(JulianDate.fromTotalDays(0), JulianDate.fromTotalDays(0), false, false),
                new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(3), true, true),
                new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, true),
                new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, true),
                new TimeInterval(JulianDate.fromTotalDays(3), JulianDate.fromTotalDays(2), true, true),
                new TimeInterval(JulianDate.fromTotalDays(3), JulianDate.fromTotalDays(3), true, true),
                new TimeInterval(JulianDate.fromTotalDays(0), JulianDate.fromTotalDays(0), false, false)];

        for ( var i = 0; i < testParameters.length - 2; i = i + 3) {
            var first = testParameters[i];
            var second = testParameters[i + 1];
            var expectedResult = testParameters[i + 2];
            var intersect1 = first.intersect(second);
            var intersect2 = second.intersect(first);
            expect(intersect1.equals(intersect2)).toEqual(true);
            expect(intersect2.equals(intersect1)).toEqual(true);
            expect(expectedResult.equals(intersect1)).toEqual(true);
        }

        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        expect(interval.intersect(undefined)).toEqual(TimeInterval.EMPTY);
    });

    it('Intersect Merging', function() {
        var oneToThree = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(3), true, true, 2);
        var twoToFour = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(4), true, true, 3);
        var twoToThree = oneToThree.intersect(twoToFour, function(lhs, rhs) {
            return lhs + rhs;
        });
        expect(twoToThree.start).toEqual(twoToFour.start);
        expect(twoToThree.stop).toEqual(oneToThree.stop);
        expect(twoToThree.isStartIncluded).toEqual(true);
        expect(twoToThree.isStopIncluded).toEqual(true);
        expect(twoToThree.data).toEqual(5);
    });
});