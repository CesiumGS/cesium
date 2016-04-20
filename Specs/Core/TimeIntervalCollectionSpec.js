/*global defineSuite*/
defineSuite([
        'Core/TimeIntervalCollection',
        'Core/JulianDate',
        'Core/TimeInterval'
    ], function(
        TimeIntervalCollection,
        JulianDate,
        TimeInterval) {
    'use strict';

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
        expect(intervals.isStartIncluded).toEqual(false);
        expect(intervals.isStopIncluded).toEqual(false);
        expect(intervals.isEmpty).toEqual(true);
        expect(intervals.changedEvent).toBeDefined();
    });

    it('constructing an interval collection from array.', function() {
        var arg = [new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        }), new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true
        })];
        var intervals = new TimeIntervalCollection(arg);
        expect(intervals.length).toEqual(2);
        expect(intervals.start).toEqual(arg[0].start);
        expect(intervals.stop).toEqual(arg[1].stop);
        expect(intervals.isStartIncluded).toEqual(true);
        expect(intervals.isStopIncluded).toEqual(true);
        expect(intervals.isEmpty).toEqual(false);
        expect(intervals.changedEvent).toBeDefined();
    });

    it('isStartIncluded/isStopIncluded works.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true
        });

        expect(intervals.isStartIncluded).toBe(false);
        expect(intervals.isStopIncluded).toBe(false);

        intervals.addInterval(interval1);

        expect(intervals.isStartIncluded).toBe(true);
        expect(intervals.isStopIncluded).toBe(false);

        intervals.addInterval(interval2);

        expect(intervals.isStartIncluded).toBe(true);
        expect(intervals.isStopIncluded).toBe(true);
    });


    it('contains works for a simple interval collection.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true
        });
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.contains(new JulianDate(0.5))).toEqual(false);
        expect(intervals.contains(new JulianDate(1.5))).toEqual(true);
        expect(intervals.contains(new JulianDate(2.0))).toEqual(false);
        expect(intervals.contains(new JulianDate(2.5))).toEqual(true);
        expect(intervals.contains(new JulianDate(3.0))).toEqual(true);
        expect(intervals.contains(new JulianDate(3.5))).toEqual(false);
    });

    it('contains works for a endpoints of a closed interval collection.', function() {
        var intervals = new TimeIntervalCollection();
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : true
        });
        intervals.addInterval(interval);
        expect(intervals.contains(interval.start)).toEqual(true);
        expect(intervals.contains(interval.stop)).toEqual(true);
    });

    it('contains works for a endpoints of an open interval collection.', function() {
        var intervals = new TimeIntervalCollection();
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : false,
            isStopIncluded : false
        });
        intervals.addInterval(interval);
        expect(intervals.contains(interval.start)).toEqual(false);
        expect(intervals.contains(interval.stop)).toEqual(false);
    });

    it('indexOf finds the correct interval for a valid date', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true
        });

        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.indexOf(new JulianDate(2.5))).toEqual(1);
    });

    it('indexOf returns complement of index of the interval that a missing date would come before', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true
        });
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.indexOf(new JulianDate(2))).toEqual(~1);
    });

    it('indexOf returns complement of collection length if the date is after all intervals.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true
        });        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.indexOf(new JulianDate(4))).toEqual(~2);
    });

    it('get returns the interval at the correct index', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : false,
            isStopIncluded : false
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : false
        });
        var interval3 = new TimeInterval({
            start : new JulianDate(4),
            stop : new JulianDate(5),
            isStartIncluded : false,
            isStopIncluded : false
        });
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
        var interval1 = new TimeInterval({
            start : new JulianDate(0),
            stop : new JulianDate(1),
            isStartIncluded : false,
            isStopIncluded : false,
            data : 1
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false,
            data : 2
        });
        var interval3 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : false,
            data : 3
        });
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        intervals.addInterval(interval3);
        expect(intervals.findInterval({
            start : interval2.start,
            stop : interval2.stop,
            isStartIncluded : true,
            isStopIncluded : false
        })).toEqual(interval2);
    });

    it('findInterval works when you do not care about end points', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval({
            start : new JulianDate(0),
            stop : new JulianDate(1),
            isStartIncluded : false,
            isStopIncluded : false,
            data : 1
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false,
            data : 2
        });
        var interval3 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : false,
            data : 3
        });
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        intervals.addInterval(interval3);
        expect(intervals.findInterval({
            start : interval2.start,
            stop : interval2.stop
        })).toEqual(interval2);
    });

    it('getStart & getStop return expected values.', function() {
        var intervals = new TimeIntervalCollection();
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : true,
            isStopIncluded : false
        });
        intervals.addInterval(interval1);
        intervals.addInterval(interval2);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval2.stop);
    });

    it('isEmpty and clear return expected values', function() {
        var intervals = new TimeIntervalCollection();
        intervals.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : false,
            isStopIncluded : true
        }));
        expect(intervals.isEmpty).toEqual(false);
        intervals.removeAll();
        expect(intervals.isEmpty).toEqual(true);
    });

    it('length returns the correct interval length when adding intervals with different data', function() {
        var intervals = new TimeIntervalCollection();
        expect(intervals.length).toEqual(0);

        intervals.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true,
            data : 1
        }));
        expect(intervals.length).toEqual(1);

        intervals.addInterval(new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : true,
            isStopIncluded : true,
            data : 2
        }));
        expect(intervals.length).toEqual(3);

        intervals.removeAll();
        expect(intervals.length).toEqual(0);
    });

    it('length returns the correct length after two intervals with the same data are merged.', function() {
        var intervals = new TimeIntervalCollection();

        intervals.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true,
            data : 1
        }));
        expect(intervals.length).toEqual(1);

        intervals.addInterval(new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : true,
            isStopIncluded : true,
            data : 1
        }));
        expect(intervals.length).toEqual(1);

        intervals.removeAll();
        expect(intervals.length).toEqual(0);
    });

    it('addInterval and findIntervalContainingDate work when using non-overlapping intervals', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : true,
            data : 1
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true,
            data : 2
        });
        var interval3 = new TimeInterval({
            start : new JulianDate(4),
            stop : new JulianDate(5),
            isStartIncluded : true,
            isStopIncluded : true,
            data : 3
        });

        var intervals = new TimeIntervalCollection();

        intervals.addInterval(interval1);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval1.stop);
        expect(intervals.isEmpty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(interval1);

        intervals.addInterval(interval2);

        expect(intervals.length).toEqual(2);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval2.stop);
        expect(intervals.isEmpty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval2.stop)).toEqual(interval2);

        intervals.addInterval(interval3);
        expect(intervals.length).toEqual(3);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval3.stop);
        expect(intervals.isEmpty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval1.stop)).toEqual(interval1);
        expect(intervals.findIntervalContainingDate(interval2.stop)).toEqual(interval2);
        expect(intervals.findIntervalContainingDate(interval3.start)).toEqual(interval3);
        expect(intervals.findIntervalContainingDate(interval3.stop)).toEqual(interval3);
    });

    it('addInterval and findIntervalContainingDate work when using overlapping intervals', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2.5),
            isStartIncluded : true,
            isStopIncluded : true,
            data : 1
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true,
            data : 2
        });
        var interval3 = new TimeInterval({
            start : interval1.start,
            stop : interval2.stop,
            isStartIncluded : true,
            isStopIncluded : true,
            data : 3
        });

        var intervals = new TimeIntervalCollection();

        intervals.addInterval(interval1);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval1.stop);
        expect(intervals.isEmpty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(1);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(1);

        intervals.addInterval(interval2);

        expect(intervals.length).toEqual(2);
        expect(intervals.start).toEqual(interval1.start);
        expect(intervals.stop).toEqual(interval2.stop);
        expect(intervals.isEmpty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(1);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(2);
        expect(intervals.findIntervalContainingDate(interval2.stop).data).toEqual(2);

        intervals.addInterval(interval3);
        expect(intervals.length).toEqual(1);
        expect(intervals.start).toEqual(interval3.start);
        expect(intervals.stop).toEqual(interval3.stop);
        expect(intervals.isEmpty).toEqual(false);

        expect(intervals.findIntervalContainingDate(interval1.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval1.stop).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval2.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval2.stop).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval3.start).data).toEqual(3);
        expect(intervals.findIntervalContainingDate(interval3.stop).data).toEqual(3);
    });

    it('findDataForIntervalContainingDate works', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2.5),
            isStartIncluded : true,
            isStopIncluded : true,
            data : 1
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true,
            data : 2
        });

        var intervals = new TimeIntervalCollection();
        intervals.addInterval(interval1);
        expect(intervals.findDataForIntervalContainingDate(interval1.start)).toEqual(1);
        expect(intervals.findDataForIntervalContainingDate(interval1.stop)).toEqual(1);

        intervals.addInterval(interval2);
        expect(intervals.findDataForIntervalContainingDate(interval1.start)).toEqual(1);
        expect(intervals.findDataForIntervalContainingDate(interval1.stop)).toEqual(2);
        expect(intervals.findDataForIntervalContainingDate(interval2.stop)).toEqual(2);

        expect(intervals.findDataForIntervalContainingDate(new JulianDate(5))).toBeUndefined();
    });

    it('addInterval correctly intervals that have the same data when using equalsCallback', function() {
        var intervals = new TimeIntervalCollection();

        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true,
            data : new TestObject(2)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(3),
            isStartIncluded : true,
            isStopIncluded : false,
            data : new TestObject(2)
        });
        var interval3 = new TimeInterval({
            start : new JulianDate(3),
            stop : new JulianDate(4),
            isStartIncluded : false,
            isStopIncluded : true,
            data : new TestObject(2)
        });
        var interval4 = new TimeInterval({
            start : new JulianDate(3),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true,
            data : new TestObject(3)
        });

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
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true
        });
        var removedInterval = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : true,
            isStopIncluded : false
        });
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
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : false
        });

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
        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true
        });
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

        var interval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true
        });
        var removedInterval = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : false,
            isStopIncluded : false
        });
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

    it('removeInterval removes overlapped intervals', function() {
        var intervals = new TimeIntervalCollection();

        intervals.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        }));
        intervals.addInterval(new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : false
        }));
        intervals.addInterval(new TimeInterval({
            start : new JulianDate(3),
            stop : new JulianDate(4),
            isStartIncluded : false,
            isStopIncluded : false
        }));
        intervals.addInterval(new TimeInterval({
            start : new JulianDate(4),
            stop : new JulianDate(5),
            isStartIncluded : false,
            isStopIncluded : true
        }));

        var removedInterval = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(4),
            isStartIncluded : false,
            isStopIncluded : false
        });

        expect(intervals.length).toEqual(4);
        expect(intervals.removeInterval(removedInterval)).toEqual(true);

        expect(intervals.length).toEqual(2);
    });

    it('intersect works with an empty collection', function() {
        var left = new TimeIntervalCollection();
        left.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true
        }));
        expect(left.intersect(new TimeIntervalCollection()).length).toEqual(0);
    });

    it('intersect works non-overlapping intervals', function() {
        var left = new TimeIntervalCollection();
        left.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : false
        }));

        var right = new TimeIntervalCollection();
        right.addInterval(new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : true,
            isStopIncluded : true
        }));
        expect(left.intersect(right).length).toEqual(0);
    });

    it('intersect works with intersecting intervals and no merge callback', function() {
        var left = new TimeIntervalCollection();
        left.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true
        }));

        var right = new TimeIntervalCollection();
        right.addInterval(new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : false
        }));

        var intersectedIntervals = left.intersect(right);

        expect(intersectedIntervals.length).toEqual(1);
        expect(intersectedIntervals.get(0).start).toEqual(right.get(0).start);
        expect(intersectedIntervals.get(0).stop).toEqual(right.get(0).stop);
        expect(intersectedIntervals.get(0).isStartIncluded).toEqual(false);
        expect(intersectedIntervals.get(0).isStopIncluded).toEqual(false);
    });

    it('intersect works with intersecting intervals an a merge callback', function() {
        var left = new TimeIntervalCollection();
        left.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(4),
            isStartIncluded : true,
            isStopIncluded : true,
            data : new TestObject(1)
        }));

        var right = new TimeIntervalCollection();
        right.addInterval(new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : false,
            data : new TestObject(2)
        }));

        var intersectedIntervals = left.intersect(right, TestObject.equals, TestObject.merge);

        expect(intersectedIntervals.length).toEqual(1);
        expect(intersectedIntervals.get(0).start).toEqual(right.start);
        expect(intersectedIntervals.get(0).stop).toEqual(right.stop);
        expect(intersectedIntervals.get(0).isStartIncluded).toEqual(false);
        expect(intersectedIntervals.get(0).isStopIncluded).toEqual(false);
        expect(intersectedIntervals.get(0).data.value).toEqual(3);
    });

    it('equals works without data', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : true
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true
        });
        var interval3 = new TimeInterval({
            start : new JulianDate(4),
            stop : new JulianDate(5),
            isStartIncluded : true,
            isStopIncluded : true
        });

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
        left.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : true,
            data : {}
        }));
        left.addInterval(new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true,
            data : {}
        }));
        left.addInterval(new TimeInterval({
            start : new JulianDate(4),
            stop : new JulianDate(5),
            isStartIncluded : true,
            isStopIncluded : true,
            data : {}
        }));

        var right = new TimeIntervalCollection();
        right.addInterval(new TimeInterval({
            start : new JulianDate(1),
            stop : new JulianDate(2),
            isStartIncluded : true,
            isStopIncluded : true,
            data : {}
        }));
        right.addInterval(new TimeInterval({
            start : new JulianDate(2),
            stop : new JulianDate(3),
            isStartIncluded : false,
            isStopIncluded : true,
            data : {}
        }));
        right.addInterval(new TimeInterval({
            start : new JulianDate(4),
            stop : new JulianDate(5),
            isStartIncluded : true,
            isStopIncluded : true,
            data : {}
        }));

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

    it('changed event is raised as expected', function() {
        var interval = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0)
        });

        var intervals = new TimeIntervalCollection();

        var listener = jasmine.createSpy('listener');
        intervals.changedEvent.addEventListener(listener);

        intervals.addInterval(interval);
        expect(listener).toHaveBeenCalledWith(intervals);
        listener.calls.reset();

        intervals.removeInterval(interval);
        expect(listener).toHaveBeenCalledWith(intervals);

        intervals.addInterval(interval);
        listener.calls.reset();
        intervals.removeAll();
        expect(listener).toHaveBeenCalledWith(intervals);
    });
});
