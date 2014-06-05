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
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function TestObject(value) {
        this.value = value;
    }

    TestObject.equals = function(left, right) {
        return left.value === right.value;
    };

    TestObject.merge = function(left, right) {
        return new TestObject(left.value + right.value);
    };

    it('constructing a default interval collection has expected property values.', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.length).toEqual(0);
        expect(intervals.start).toBeUndefined();
        expect(intervals.stop).toBeUndefined();
        expect(intervals.empty).toEqual(true);
        expect(intervals.changedEvent).toBeDefined();
    });

    it('contains works for a simple interval collection.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.contains(JulianDate.fromTotalDays(0.5))).toEqual(false);
        expect(intervals.contains(JulianDate.fromTotalDays(1.5))).toEqual(true);
        expect(intervals.contains(JulianDate.fromTotalDays(2.0))).toEqual(false);
        expect(intervals.contains(JulianDate.fromTotalDays(2.5))).toEqual(true);
        expect(intervals.contains(JulianDate.fromTotalDays(3.0))).toEqual(true);
        expect(intervals.contains(JulianDate.fromTotalDays(3.5))).toEqual(false);
    });

    it('contains works for a endpoints of a closed interval collection.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, true);
        intervals.addInterval(interval1);
        expect(intervals.contains(interval1.start)).toEqual(true);
        expect(intervals.contains(interval1.stop)).toEqual(true);
    });

    it('contains works for a endpoints of an open interval collection.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), false, false);
        intervals.addInterval(interval1);
        expect(intervals.contains(interval1.start)).toEqual(false);
        expect(intervals.contains(interval1.stop)).toEqual(false);
    });

    it('indexOf finds the correct interval for a valid date', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.indexOf(JulianDate.fromTotalDays(2.5))).toEqual(1);
    });

    it('indexOf returns complement of index of the interval that a missing date would come before', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.indexOf(JulianDate.fromTotalDays(2))).toEqual(~1);
    });

    it('indexOf returns complement of collection length if the date is after all intervals.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.indexOf(JulianDate.fromTotalDays(4))).toEqual(~2);
    });

    it('get returns the interval at the correct index', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), false, false);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, false);
        var interval3 = new TimeInterval(JulianDate.fromTotalDays(4), JulianDate.fromTotalDays(5), false, false);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        intervals.addInterval(interval3);
        expect(intervals.get(1)).toEqual(interval2);
    });

    it('get is undefined for a out of range index', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.get(1)).toBeUndefined();
    });

    it('findInterval works when looking for an exact interval', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(0), JulianDate.fromTotalDays(1), false, false, 1);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false, 2);
        var interval3 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, false, 3);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        intervals.addInterval(interval3);
        expect(intervals.findInterval(interval2.start, interval2.stop, true, false)).toEqual(interval2);
    });

    it('findInterval works when you do not care about end points', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(0), JulianDate.fromTotalDays(1), false, false, 1);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false, 2);
        var interval3 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, false, 3);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        intervals.addInterval(interval3);
        expect(intervals.findInterval(interval2.start, interval2.stop)).toEqual(interval2);
    });

    it('getStart & getStop return expected values.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, false);
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval2.stop);
    });

    it('isEmpty and clear return expected values', function() {
        var intervals = new TimeIntervalCollection();
        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false));
        expect(intervals.empty).toEqual(false);
        intervals.removeAll();
        expect(intervals.empty).toEqual(true);
    });

    it('length returns the correct interval length when adding intervals with different data', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.length).toEqual(0);

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true, 1));
        expect(intervals.length).toEqual(1);

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, true, 2));
        expect(intervals.length).toEqual(3);

        intervals.removeAll();
        expect(intervals.length).toEqual(0);
    });

    it('length returns the correct length after two intervals with the same data are merged.', function() {
        var intervals = new TimeIntervalCollection();

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true, 1));
        expect(intervals.length).toEqual(1);

        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, true, 1));
        expect(intervals.length).toEqual(1);

        intervals.removeAll();
        expect(intervals.length).toEqual(0);
    });

    it('addInterval and findIntervalContainingDate work when using non-overlapping intervals', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, true, 1);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true, 2);
        var interval3 = new TimeInterval(JulianDate.fromTotalDays(4), JulianDate.fromTotalDays(5), true, true, 3);

        var intervals = new TimeIntervalCollection();

        intervals.addInterval(interval1);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval1.stop);
        expect(intervals.empty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(interval1);

        intervals.addInterval(interval2);

        expect(intervals.length).toEqual(2);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval2.stop);
        expect(intervals.empty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval2.stop)).toEqual(interval2);

        intervals.addInterval(interval3);
        expect(intervals.length).toEqual(3);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval3.stop);
        expect(intervals.empty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval2.stop)).toEqual(interval2);
        expect(intervals.findIntervalContainingDate(interval3.start)).toEqual(interval3);
        expect(intervals.findIntervalContainingDate(interval3.stop)).toEqual(interval3);
    });

    it('addInterval and findIntervalContainingDate work when using overlapping intervals', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2.5), true, true, 1);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true, 2);
        var interval3 = new TimeInterval(interval1.start, interval2.stop, true, true, 3);

        var intervals = new TimeIntervalCollection();

        intervals.addInterval(interval1);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval1.stop);
        expect(intervals.empty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(1);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(1);

        intervals.addInterval(interval2);

        expect(intervals.length).toEqual(2);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval2.stop);
        expect(intervals.empty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(1);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(2);
        expect(intervals.findIntervalContainingDate(interval2.stop).data).toEqual(2);

        intervals.addInterval(interval3);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval3.start);
        expect(intervals.stop).toEqual(interval3.stop);
        expect(intervals.empty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval2.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval2.stop).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval3.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval3.stop).data).toEqual(3);
    });

    it('findDataForIntervalContainingDate works', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2.5), true, true, 1);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true, 2);

        var intervals = new TimeIntervalCollection();
        intervals.addInterval(interval1);
        expect(intervals.findDataForIntervalContainingDate(interval1.start)).toEqual(1);
        expect(intervals.findDataForIntervalContainingDate(interval1.stop)).toEqual(1);

        intervals.addInterval(interval2);
        expect(intervals.findDataForIntervalContainingDate(interval1.start)).toEqual(1);
        expect(intervals.findDataForIntervalContainingDate(interval1.stop)).toEqual(2);
        expect(intervals.findDataForIntervalContainingDate(interval2.stop)).toEqual(2);

        expect(intervals.findDataForIntervalContainingDate(JulianDate.fromTotalDays(5))).toBeUndefined();
    });

    it('addInterval correctly intervals that have the same data when using equalsCallback', function() {
        var intervals = new TimeIntervalCollection();

        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true, new TestObject(2));
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(3), true, false, new TestObject(2));
        var interval3 = new TimeInterval(JulianDate.fromTotalDays(3), JulianDate.fromTotalDays(4), false, true, new TestObject(2));
        var interval4 = new TimeInterval(JulianDate.fromTotalDays(3), JulianDate.fromTotalDays(4), true, true, new TestObject(3));

        intervals.addInterval(interval1, TestObject.equals);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval1.stop);
        expect(intervals.get(0).data.value).toEqual(2);

        intervals.addInterval(interval2, TestObject.equals);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval1.stop);
        expect(intervals.get(0).data.value).toEqual(2);

        intervals.addInterval(interval3, TestObject.equals);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval1.stop);
        expect(intervals.get(0).data.value).toEqual(2);

        intervals.addInterval(interval4, TestObject.equals);
        expect(intervals.length).toEqual(2);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval1.stop);
        expect(intervals.get(0).start).toEqual(interval1.start);
        expect(intervals.get(0).stop).toEqual(interval4.start);
        expect(intervals.get(0).isStartIncluded).toEqual(true);
        expect(intervals.get(0).isStopIncluded).toEqual(false);
        expect(intervals.get(0).data.value).toEqual(2);

        expect(intervals.get(1).start).toEqual(interval4.start);
        expect(intervals.get(1).stop).toEqual(interval4.stop);
        expect(intervals.get(1).isStartIncluded).toEqual(true);
        expect(intervals.get(1).isStopIncluded).toEqual(true);
        expect(intervals.get(1).data.value).toEqual(3);
    });

    it('removeInterval leaves a hole', function() {
        var intervals = new TimeIntervalCollection();
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true);
        var removedInterval = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, false);
        intervals.addInterval(interval);
        expect(intervals.removeInterval(removedInterval)).toEqual(true);

        expect(intervals.length).toEqual(2);
        expect(intervals.get(0).start).toEqual(interval.start);
        expect(intervals.get(0).stop).toEqual(removedInterval.start);
        expect(intervals.get(0).isStartIncluded).toEqual(true);
        expect(intervals.get(0).isStopIncluded).toEqual(false);

        expect(intervals.get(1).start).toEqual(removedInterval.stop);
        expect(intervals.get(1).stop).toEqual(interval.stop);
        expect(intervals.get(1).isStartIncluded).toEqual(true);
        expect(intervals.get(1).isStopIncluded).toEqual(true);
    });

    it('removeInterval with an interval of the exact same size works..', function() {
        var intervals = new TimeIntervalCollection();
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, false);

        intervals.addInterval(interval);
        expect(intervals.length).toEqual(1);
        expect(intervals.get(0).start).toEqual(interval.start);
        expect(intervals.get(0).stop).toEqual(interval.stop);
        expect(intervals.get(0).isStartIncluded).toEqual(true);
        expect(intervals.get(0).isStopIncluded).toEqual(false);

        intervals.removeInterval(interval);
        expect(intervals.length).toEqual(0);
    });

    it('removeInterval with an empty interval has no affect.', function() {
        var intervals = new TimeIntervalCollection();
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true);
        intervals.addInterval(interval);

        expect(intervals.length).toEqual(1);
        expect(intervals.get(0).start).toEqual(interval.start);
        expect(intervals.get(0).stop).toEqual(interval.stop);
        expect(intervals.get(0).isStartIncluded).toEqual(true);
        expect(intervals.get(0).isStopIncluded).toEqual(true);

        expect(intervals.removeInterval(TimeInterval.EMPTY)).toEqual(false);

        expect(intervals.length).toEqual(1);
        expect(intervals.get(0).start).toEqual(interval.start);
        expect(intervals.get(0).stop).toEqual(interval.stop);
        expect(intervals.get(0).isStartIncluded).toEqual(true);
        expect(intervals.get(0).isStopIncluded).toEqual(true);
    });

    it('removeInterval takes isStartIncluded and isStopIncluded into account', function() {
        var intervals = new TimeIntervalCollection();

        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true);
        var removedInterval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), false, false);
        intervals.addInterval(interval);
        expect(intervals.removeInterval(removedInterval)).toEqual(true);

        expect(intervals.length).toEqual(2);
        expect(intervals.get(0).start).toEqual(interval.start);
        expect(intervals.get(0).stop).toEqual(interval.start);
        expect(intervals.get(0).isStartIncluded).toEqual(true);
        expect(intervals.get(0).isStopIncluded).toEqual(true);

        expect(intervals.get(1).start).toEqual(interval.stop);
        expect(intervals.get(1).stop).toEqual(interval.stop);
        expect(intervals.get(1).isStartIncluded).toEqual(true);
        expect(intervals.get(1).isStopIncluded).toEqual(true);
    });

    it('intersectInterval works with an empty interval', function() {
        var intervals = new TimeIntervalCollection();
        intervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true));
        intervals = intervals.intersectInterval(TimeInterval.EMPTY);
        expect(intervals.length).toEqual(0);
    });

    it('intersectInterval works non-overlapping intervals', function() {
        var leftIntervals = new TimeIntervalCollection();
        leftIntervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, false));
        var rightIntervals = new TimeIntervalCollection();
        rightIntervals.addInterval(new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), true, true));
        expect(leftIntervals.intersectInterval(rightIntervals).length).toEqual(0);
    });

    it('intersectInterval works with intersecting intervals an no merge callback', function() {
        var intervals = new TimeIntervalCollection();

        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true);
        var intersectInterval = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, false);
        intervals.addInterval(interval);

        var intersectedIntervals = intervals.intersectInterval(intersectInterval);

        expect(intersectedIntervals.length).toEqual(1);
        expect(intersectedIntervals.get(0).start).toEqual(intersectInterval.start);
        expect(intersectedIntervals.get(0).stop).toEqual(intersectInterval.stop);
        expect(intersectedIntervals.get(0).isStartIncluded).toEqual(false);
        expect(intersectedIntervals.get(0).isStopIncluded).toEqual(false);
    });

    it('intersectInterval works with intersecting intervals an a merge callback', function() {
        var intervals = new TimeIntervalCollection();

        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true, new TestObject(1));
        var intersectInterval = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, false, new TestObject(2));
        intervals.addInterval(interval);

        var intersectedIntervals = intervals.intersectInterval(intersectInterval, TestObject.equals, TestObject.merge);

        expect(intersectedIntervals.length).toEqual(1);
        expect(intersectedIntervals.get(0).start).toEqual(intersectInterval.start);
        expect(intersectedIntervals.get(0).stop).toEqual(intersectInterval.stop);
        expect(intersectedIntervals.get(0).isStartIncluded).toEqual(false);
        expect(intersectedIntervals.get(0).isStopIncluded).toEqual(false);
        expect(intersectedIntervals.get(0).data.value).toEqual(3);
    });

    it('intersect works with intersecting intervals an a merge callback', function() {
        var intervals = new TimeIntervalCollection();
        var interval = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(4), true, true, new TestObject(1));
        intervals.addInterval(interval);

        var intervals2 = new TimeIntervalCollection();
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, false, new TestObject(2));
        intervals2.addInterval(interval2);

        var intersectedIntervals = intervals.intersect(intervals2, TestObject.equals, TestObject.merge);

        expect(intersectedIntervals.length).toEqual(1);
        expect(intersectedIntervals.get(0).start).toEqual(intervals2.start);
        expect(intersectedIntervals.get(0).stop).toEqual(intervals2.stop);
        expect(intersectedIntervals.get(0).isStartIncluded).toEqual(false);
        expect(intersectedIntervals.get(0).isStopIncluded).toEqual(false);
        expect(intersectedIntervals.get(0).data.value).toEqual(3);
    });

    it('equals works without data', function() {
        var interval1 = new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, true);
        var interval2 = new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true);
        var interval3 = new TimeInterval(JulianDate.fromTotalDays(4), JulianDate.fromTotalDays(5), true, true);

        var left = new TimeIntervalCollection();
        left.addInterval(interval1);
        left.addInterval(interval2);
        left.addInterval(interval3);

        var right = new TimeIntervalCollection();
        right.addInterval(interval1);
        right.addInterval(interval2);
        right.addInterval(interval3);
        expect(left.equals(right)).toEqual(true);
    });

    it('equals works with data', function() {
        var left = new TimeIntervalCollection();
        left.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, true, {}));
        left.addInterval(new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true, {}));
        left.addInterval(new TimeInterval(JulianDate.fromTotalDays(4), JulianDate.fromTotalDays(5), true, true, {}));

        var right = new TimeIntervalCollection();
        right.addInterval(new TimeInterval(JulianDate.fromTotalDays(1), JulianDate.fromTotalDays(2), true, true, {}));
        right.addInterval(new TimeInterval(JulianDate.fromTotalDays(2), JulianDate.fromTotalDays(3), false, true, {}));
        right.addInterval(new TimeInterval(JulianDate.fromTotalDays(4), JulianDate.fromTotalDays(5), true, true, {}));

        expect(left.equals(right)).toEqual(false);

        expect(left.equals(right, function() {
            return true;
        })).toEqual(true);

        expect(left.equals(right, function() {
            return false;
        })).toEqual(false);
    });

    it('get throws with undefined', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.get(undefined);
        }).toThrowDeveloperError();
    });

    it('get throws with NaN', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.get(NaN);
        }).toThrowDeveloperError();
    });

    it('get throws with non-number', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.get({});
        }).toThrowDeveloperError();
    });

    it('findIntervalContainingDate throws with undefined date', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.findIntervalContainingDate(undefined);
        }).toThrowDeveloperError();
    });

    it('findDataForIntervalContainingDate throws with undefined date', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.findDataForIntervalContainingDate(undefined);
        }).toThrowDeveloperError();
    });

    it('contains throws with undefined date', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.contains(undefined);
        }).toThrowDeveloperError();
    });

    it('indexOf throws with undefined date', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.indexOf(undefined);
        }).toThrowDeveloperError();
    });

    it('addInterval throws with undefined interval', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.addInterval(undefined, TestObject.equals);
        }).toThrowDeveloperError();
    });

    it('removeInterval throws with undefined', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.removeInterval(undefined);
        }).toThrowDeveloperError();
    });

    it('intersect throws with undefined interval', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.intersect(undefined);
        }).toThrowDeveloperError();
    });

    it('intersectInterval throws with undefined interval', function() {
        var intervals = new TimeIntervalCollection();
        expect(function() {
            intervals.intersectInterval(undefined);
        }).toThrowDeveloperError();
    });

    it('changed event is raised as expected', function() {
        var interval = new TimeInterval(new JulianDate(10, 0), new JulianDate(12, 0), true, true);

        var intervals = new TimeIntervalCollection();

        var listener = jasmine.createSpy('listener');
        intervals.changedEvent.addEventListener(listener);

        intervals.addInterval(interval);
        expect(listener).toHaveBeenCalledWith(intervals);
        listener.reset();

        intervals.removeInterval(interval);
        expect(listener).toHaveBeenCalledWith(intervals);

        intervals.addInterval(interval);
        listener.reset();
        intervals.removeAll();
        expect(listener).toHaveBeenCalledWith(intervals);
    });
});
