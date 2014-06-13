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
        var start = JulianDate.now();
        var stop = JulianDate.addDays(start, 1, new JulianDate());
        var isStartIncluded = false;
        var isStopIncluded = true;
        var data = {};

        var interval = new TimeInterval({
            start : start,
            stop : stop,
            isStartIncluded : isStartIncluded,
            isStopIncluded : isStopIncluded,
            data : data
        });
        expect(interval.start).toEqual(start);
        expect(interval.stop).toEqual(stop);
        expect(interval.isStartIncluded).toEqual(isStartIncluded);
        expect(interval.isStopIncluded).toEqual(isStopIncluded);
        expect(interval.data).toEqual(data);
    });

    it('Optional constructor parameters initialize properties to expected defaults.', function() {
        var start = JulianDate.now();
        var stop = JulianDate.addDays(start, 1, new JulianDate());
        var interval = new TimeInterval({
            start : start,
            stop : stop
        });
        expect(interval.start).toEqual(start);
        expect(interval.stop).toEqual(stop);
        expect(interval.isStartIncluded).toEqual(true);
        expect(interval.isStopIncluded).toEqual(true);
        expect(interval.data).toEqual(undefined);
    });

    it('IsEmpty is false for a typical interval', function() {
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2)
        });
        expect(interval.isEmpty).toEqual(false);
    });

    it('IsEmpty is false for an instantaneous interval closed on both ends', function() {
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(1)
        });
        expect(interval.isEmpty).toEqual(false);
    });

    it('IsEmpty is true for an instantaneous interval open on both ends', function() {
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(1),
            isStartIncluded : false,
            isStopIncluded : false
        });
        expect(interval.isEmpty).toEqual(true);
    });

    it('IsEmpty is true for an interval with stop before start', function() {
        var interval = new TimeInterval({
            start : new JulianDate(5),
            stop : new JulianDate(4)
        });
        expect(interval.isEmpty).toEqual(true);
    });

    it('IsEmpty is true for an instantaneous interval only closed on stop end', function() {
        var interval = new TimeInterval({
            start : new JulianDate(5),
            stop : new JulianDate(5),
            isStartIncluded : false,
            isStopIncluded : true
        });
        expect(interval.isEmpty).toEqual(true);
    });

    it('IsEmpty is true for an instantaneous interval only closed on start end', function() {
        var interval = new TimeInterval({
            start : new JulianDate(5),
            stop : new JulianDate(5),
            isStartIncluded : true,
            isStopIncluded : false
        });
        expect(interval.isEmpty).toEqual(true);
    });

    it('Contains works for a typical interval.', function() {
        var interval = new TimeInterval({
            start : new JulianDate(2451545),
            stop : new JulianDate(2451546)
        });
        expect(TimeInterval.contains(interval, new JulianDate(2451545.5))).toEqual(true);
        expect(TimeInterval.contains(interval, new JulianDate(2451546.5))).toEqual(false);
    });

    it('Contains works for an empty interval.', function() {
        var interval = new TimeInterval({
            start : new JulianDate(2451545),
            stop : new JulianDate(2451545),
            isStartIncluded : false,
            isStopIncluded : false
        });
        expect(TimeInterval.contains(interval, new JulianDate(2451545))).toEqual(false);
    });

    it('Contains returns true at start and stop times of a closed interval', function() {
        var interval = new TimeInterval({
            start : new JulianDate(2451545),
            stop : new JulianDate(2451546),
            isStartIncluded : true,
            isStopIncluded : true
        });
        expect(TimeInterval.contains(interval, new JulianDate(2451545))).toEqual(true);
        expect(TimeInterval.contains(interval, new JulianDate(2451546))).toEqual(true);
    });

    it('Contains returns false at start and stop times of an open interval', function() {
        var interval = new TimeInterval({
            start : new JulianDate(2451545),
            stop : new JulianDate(2451546),
            isStartIncluded : false,
            isStopIncluded : false
        });
        expect(TimeInterval.contains(interval, new JulianDate(2451545))).toEqual(false);
        expect(TimeInterval.contains(interval, new JulianDate(2451546))).toEqual(false);
    });

    it('equals and equalsEpsilon return true for identical time intervals', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2)
        });
        var interval2 = interval1.clone();
        expect(interval1.equals(interval2)).toEqual(true);
        expect(interval1.equalsEpsilon(interval2, 0)).toEqual(true);
    });

    it('equals and equalsEpsilon return true for identical time intervals with data', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2)
        });
        interval1.data = {};
        var interval2 = interval1.clone();
        interval2.data = {};

        expect(interval1.equals(interval2)).toEqual(false);
        expect(interval1.equalsEpsilon(interval2, 0)).toEqual(false);

        function returnTrue() {
            return true;
        }

        expect(interval1.equals(interval2, returnTrue)).toEqual(true);
        expect(interval1.equalsEpsilon(interval2, 0, returnTrue)).toEqual(true);
    });


    it('equals and equalsEpsilon return false for non-identical time intervals', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(1.5),
            stop : new JulianDate(2)
        });
        expect(interval1.equals(interval2)).toEqual(false);
        expect(interval1.equalsEpsilon(interval2, 0)).toEqual(false);
    });

    it('equalsEpsilon true for non-identical time intervals within threshold', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(1.5),
            stop : new JulianDate(2)
        });
        expect(interval1.equalsEpsilon(interval2, 86400)).toEqual(true);
    });

    it('equals and equalsEpsilon return false for undefined', function() {
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(1)
        });
        expect(interval.equals(undefined)).toEqual(false);
        expect(interval.equalsEpsilon(undefined, 1.0)).toEqual(false);
    });

    it('static equals and equalsEpsilon return false for undefined', function() {
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(1)
        });
        expect(TimeInterval.equals(interval, undefined)).toEqual(false);
        expect(TimeInterval.equalsEpsilon(interval, undefined, 1.0)).toEqual(false);
    });

    it('clone returns an identical interval', function() {
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2.5),
            isStartIncluded : true,
            isStopIncluded : false,
            data : 12
        });
        expect(interval.clone()).toEqual(interval);
    });

    it('intersect properly intersects with an exhaustive set of cases', function() {
        var testParameters = [
               new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2.5), isStartIncluded: true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(1.5), stop:new JulianDate(2), isStartIncluded:true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(1.5), stop:new JulianDate(2), isStartIncluded: true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2.5), isStartIncluded:true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(3), stop:new JulianDate(4), isStartIncluded:true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(0), stop:new JulianDate(0), isStartIncluded:false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2.5), isStartIncluded:true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(2), stop:new JulianDate(3), isStartIncluded:true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(2), stop:new JulianDate(2.5), isStartIncluded: true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded: true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded:false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded: false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded: true, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded: false, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded: false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded: true, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded: true, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(2), isStartIncluded: true, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(3), isStartIncluded: false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(2), stop:new JulianDate(4), isStartIncluded: false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(2), stop:new JulianDate(3), isStartIncluded: false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop:new JulianDate(3), isStartIncluded: false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(2), stop:new JulianDate(4), isStartIncluded: true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(2), stop:new JulianDate(3), isStartIncluded: true, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop: new JulianDate(1), isStartIncluded: false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop: new JulianDate(2), isStartIncluded: true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(0), stop: new JulianDate(0), isStartIncluded: false, isStopIncluded: false}),
                new TimeInterval({start:new JulianDate(1), stop: new JulianDate(3), isStartIncluded: true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(2), stop: new JulianDate(3), isStartIncluded:true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(2), stop: new JulianDate(3), isStartIncluded:true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(3), stop: new JulianDate(2), isStartIncluded: true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(3), stop: new JulianDate(3), isStartIncluded:true, isStopIncluded: true}),
                new TimeInterval({start:new JulianDate(0), stop: new JulianDate(0), isStartIncluded: false, isStopIncluded: false})];

        for ( var i = 0; i < testParameters.length - 2; i = i + 3) {
            var first = testParameters[i];
            var second = testParameters[i + 1];
            var expectedResult = testParameters[i + 2];
            var intersect1 = TimeInterval.intersect(first, second, new TimeInterval());
            var intersect2 = TimeInterval.intersect(second, first, new TimeInterval());
            expect(intersect1).toEqual(intersect2);
            expect(intersect2).toEqual(intersect1);
            expect(expectedResult).toEqual(intersect1);
        }
    });

    it('intersect with undefined results in an empty interval.', function() {
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2)
        });
        expect(TimeInterval.intersect(interval, undefined, new TimeInterval())).toEqual(TimeInterval.EMPTY);
    });

    it('intersect with a merge callback properly merges data.', function() {
        var oneToThree = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(3),
            data : 2
        });
        var twoToFour = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(4),
            data : 3
        });
        var twoToThree = TimeInterval.intersect(oneToThree, twoToFour, new TimeInterval(), mergeByAdd);
        expect(twoToThree.start).toEqual(twoToFour.start);
        expect(twoToThree.stop).toEqual(oneToThree.stop);
        expect(twoToThree.isStartIncluded).toEqual(true);
        expect(twoToThree.isStopIncluded).toEqual(true);
        expect(twoToThree.data).toEqual(5);
    });
});
