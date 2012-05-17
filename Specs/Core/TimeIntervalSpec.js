/*global defineSuite*/
defineSuite([
         'Core/TimeInterval',
         'Core/JulianDate'
     ], function(
         TimeInterval,
         JulianDate) {
    "use strict";
    /*global it,expect*/

    it("Construction", function() {
        var start = new JulianDate(), stop = start.addDays(1), isStartIncluded = false, isStopIncluded = true, data = {};

        var interval = new TimeInterval(start, stop, isStartIncluded, isStopIncluded, data);
        expect(interval.start === start).toBeTruthy();
        expect(interval.stop === stop).toBeTruthy();
        expect(interval.isStartIncluded === isStartIncluded).toBeTruthy();
        expect(interval.isStopIncluded === isStopIncluded).toBeTruthy();
        expect(interval.data === data).toBeTruthy();

        interval = new TimeInterval(start, stop);
        expect(interval.start === start).toBeTruthy();
        expect(interval.stop === stop).toBeTruthy();
        expect(interval.isStartIncluded).toBeTruthy();
        expect(interval.isStopIncluded).toBeTruthy();
        expect(interval.data === undefined).toBeTruthy();
    });

    it("Fail with undefined start", function() {
        expect(function() {
            return new TimeInterval(undefined, new JulianDate());
        }).toThrow();
    });

    it("Fail with undefined stop", function() {
        expect(function() {
            return new TimeInterval(new JulianDate());
        }).toThrow();
    });

    it("IsEmpty", function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1));
        expect(interval.isEmpty).toBeFalsy();

        interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1), false, false);
        expect(interval.isEmpty).toBeTruthy();

        interval = new TimeInterval(JulianDate.fromTotalDays(5), JulianDate.fromTotalDays(4));
        expect(interval.isEmpty).toBeTruthy();
    });

    it("Contains", function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(2451545), JulianDate.fromTotalDays(2451546));
        expect(interval1.contains(JulianDate.fromTotalDays(2451545))).toBeTruthy();
        expect(interval1.contains(JulianDate.fromTotalDays(2451545.5))).toBeTruthy();
        expect(interval1.contains(JulianDate.fromTotalDays(2451546))).toBeTruthy();
        expect(interval1.contains(JulianDate.fromTotalDays(2451546.5))).toBeFalsy();

        var interval2 = new TimeInterval(interval1.start, interval1.stop, false, false);
        expect(interval2.contains(JulianDate.fromTotalDays(2451545))).toBeFalsy();
        expect(interval2.contains(JulianDate.fromTotalDays(2451545.5))).toBeTruthy();
        expect(interval2.contains(JulianDate.fromTotalDays(2451546))).toBeFalsy();
        expect(interval2.contains(JulianDate.fromTotalDays(2451546.5))).toBeFalsy();
    });

    it("Equality", function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        expect(interval1.equals(interval2)).toBeTruthy();
        expect(interval2.equals(interval1)).toBeTruthy();
        expect(interval1.equalsEpsilon(interval2, 0)).toBeTruthy();
        expect(interval2.equalsEpsilon(interval1, 0)).toBeTruthy();

        interval2 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(3));
        expect(interval1.equals(interval2)).toBeFalsy();
        expect(interval2.equals(interval1)).toBeFalsy();
        expect(interval1.equalsEpsilon(interval2, 0)).toBeFalsy();
        expect(interval2.equalsEpsilon(interval1, 0)).toBeFalsy();
        expect(interval1.equalsEpsilon(interval2, 86400)).toBeTruthy();
        expect(interval2.equalsEpsilon(interval1, 86400)).toBeTruthy();

        interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1), true, true);
        interval2 = new TimeInterval(JulianDate.fromTotalDays(1), new JulianDate(1, 1), true, false);
        expect(interval1.equals(interval2)).toBeFalsy();
        expect(interval2.equals(interval1)).toBeFalsy();
        expect(interval1.equalsEpsilon(interval2, 1.1)).toBeFalsy();
        expect(interval2.equalsEpsilon(interval1, 1.1)).toBeFalsy();

        expect(interval1.equals(undefined)).toBeFalsy();
        expect(interval1.equalsEpsilon(undefined, 1.0)).toBeFalsy();
    });

    it("Intersect", function() {
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
            expect(intersect1.equals(intersect2)).toBeTruthy();
            expect(intersect2.equals(intersect1)).toBeTruthy();
            expect(expectedResult.equals(intersect1)).toBeTruthy();
        }

        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        expect(interval.intersect(undefined)).toEqual(TimeInterval.EMPTY);
    });
});