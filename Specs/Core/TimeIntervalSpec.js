/*global defineSuite*/
defineSuite([
         'Core/TimeInterval',
         'Core/JulianDate'
     ], function(
         TimeInterval,
         JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function mergeByAdd(left, right) {
        return left + right;
    }

    it('Construction correctly sets all properties.', function() {
        var start = new JulianDate();
        var stop = start.addDays(1);
        var isStartIncluded = false;
        var isStopIncluded = true;
        var data = {};

        var interval = new TimeInterval(start, stop, isStartIncluded, isStopIncluded, data);
        expect(interval.start === start).toEqual(true);
        expect(interval.stop === stop).toEqual(true);
        expect(interval.isStartIncluded === isStartIncluded).toEqual(true);
        expect(interval.isStopIncluded === isStopIncluded).toEqual(true);
        expect(interval.data === data).toEqual(true);
    });

    it('Optional constructor parameters initialize properties to expected defaults.', function() {
        var start = new JulianDate();
        var stop = start.addDays(1);
        var interval = new TimeInterval(start, stop);
        expect(interval.start === start).toEqual(true);
        expect(interval.stop === stop).toEqual(true);
        expect(interval.isStartIncluded).toEqual(true);
        expect(interval.isStopIncluded).toEqual(true);
        expect(interval.data === undefined).toEqual(true);
    });

    it('throws when constructing with an undefined start', function() {
        expect(function() {
            return new TimeInterval(undefined, new JulianDate());
        }).toThrow();
    });

    it('throws when constructing with an undefined stop', function() {
        expect(function() {
            return new TimeInterval(new JulianDate());
        }).toThrow();
    });

    it('IsEmpty is false for a typical interval', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        expect(interval.isEmpty).toEqual(false);
    });

    it('IsEmpty is false for an instantaneous interval closed on both ends', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1));
        expect(interval.isEmpty).toEqual(false);
    });

    it('IsEmpty is true for an instantaneous interval open on both ends', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1), false, false);
        expect(interval.isEmpty).toEqual(true);
    });

    it('IsEmpty is true for an interval with stop before start', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(5), JulianDate.fromTotalDays(4));
        expect(interval.isEmpty).toEqual(true);
    });

    it('IsEmpty is true for an instantaneous interval only closed on stop end', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(5), JulianDate.fromTotalDays(5), false, true);
        expect(interval.isEmpty).toEqual(true);
    });

    it('IsEmpty is true for an instantaneous interval only closed on start end', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(5), JulianDate.fromTotalDays(5), true, false);
        expect(interval.isEmpty).toEqual(true);
    });

    it('Contains works for a typical interval.', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(2451545), JulianDate.fromTotalDays(2451546), true, true);
        expect(interval1.contains(JulianDate.fromTotalDays(2451545.5))).toEqual(true);
        expect(interval1.contains(JulianDate.fromTotalDays(2451546.5))).toEqual(false);
    });

    it('Contains works for an empty interval.', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(2451545), JulianDate.fromTotalDays(2451545), false, false);
        expect(interval1.contains(JulianDate.fromTotalDays(2451545))).toEqual(false);
    });

    it('Contains returns true at start and stop times of a closed interval', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(2451545), JulianDate.fromTotalDays(2451546), true, true);
        expect(interval1.contains(JulianDate.fromTotalDays(2451545))).toEqual(true);
        expect(interval1.contains(JulianDate.fromTotalDays(2451546))).toEqual(true);
    });

    it('Contains returns false at start and stop times of an open interval', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(2451545), JulianDate.fromTotalDays(2451546), false, false);
        expect(interval.contains(JulianDate.fromTotalDays(2451545))).toEqual(false);
        expect(interval.contains(JulianDate.fromTotalDays(2451546))).toEqual(false);
    });

    it('equals and equalsEpsilon return true for identical time intervals', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        var interval2 = interval1.clone();
        expect(interval1.equals(interval2)).toEqual(true);
        expect(interval1.equalsEpsilon(interval2, 0)).toEqual(true);
    });

    it('equals and equalsEpsilon return false for non-identical time intervals', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(1.5), JulianDate.fromTotalDays(2));
        expect(interval1.equals(interval2)).toEqual(false);
        expect(interval1.equalsEpsilon(interval2, 0)).toEqual(false);
    });

    it('equalsEpsilon true false for non-identical time intervals within threshold', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(1.5), JulianDate.fromTotalDays(2));
        expect(interval1.equalsEpsilon(interval2, 86400)).toEqual(true);
    });

    it('equals and equalsEpsilon return false for undefined', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1), true, true);
        expect(interval.equals(undefined)).toEqual(false);
        expect(interval.equalsEpsilon(undefined, 1.0)).toEqual(false);
    });

    it('static equals and equalsEpsilon return false for undefined', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(1), true, true);
        expect(TimeInterval.equals(undefined, interval)).toEqual(false);
        expect(TimeInterval.equalsEpsilon(undefined, interval, 1.0)).toEqual(false);
        expect(TimeInterval.equals(interval, undefined)).toEqual(false);
        expect(TimeInterval.equalsEpsilon(interval, undefined, 1.0)).toEqual(false);
    });

    it('clone returns an identical interval', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false, 12);
        expect(interval.equals(interval.clone())).toEqual(true);
    });

    it('intersect properly intersects with an exhaustive set of cases', function() {
        var testParameters = [new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2.5), true, true, 1),
                new TimeInterval(JulianDate.fromTotalDays(1.5), JulianDate.fromTotalDays(2), true, true, 2),
                new TimeInterval(JulianDate.fromTotalDays(1.5), JulianDate.fromTotalDays(2), true, true, 3),
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
    });

    it('intersect with undefined results in an empty interval.', function() {
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2));
        expect(interval.intersect(undefined)).toEqual(TimeInterval.EMPTY);
    });

    it('intersect with a merge callback properly merges data.', function() {
        var oneToThree = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(3), true, true, 2);
        var twoToFour = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(4), true, true, 3);
        var twoToThree = oneToThree.intersect(twoToFour, mergeByAdd);
        expect(twoToThree.start).toEqual(twoToFour.start);
        expect(twoToThree.stop).toEqual(oneToThree.stop);
        expect(twoToThree.isStartIncluded).toEqual(true);
        expect(twoToThree.isStopIncluded).toEqual(true);
        expect(twoToThree.data).toEqual(5);
    });
});
