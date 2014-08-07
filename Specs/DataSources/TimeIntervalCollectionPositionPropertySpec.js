/*global defineSuite*/
defineSuite([
        'DataSources/TimeIntervalCollectionPositionProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/ReferenceFrame',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/PositionProperty'
    ], function(
        TimeIntervalCollectionPositionProperty,
        Cartesian3,
        JulianDate,
        ReferenceFrame,
        TimeInterval,
        TimeIntervalCollection,
        PositionProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('default constructor has expected values', function() {
        var property = new TimeIntervalCollectionPositionProperty();
        expect(property.intervals).toBeInstanceOf(TimeIntervalCollection);
        expect(property.getValue(JulianDate.now())).toBeUndefined();
        expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);
    });

    it('getValue works without a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new Cartesian3(1, 2, 3)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new Cartesian3(4, 5, 6)
        });

        var property = new TimeIntervalCollectionPositionProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);

        var result1 = property.getValue(interval1.start);
        expect(result1).not.toBe(interval1.data);
        expect(result1).toEqual(interval1.data);

        var result2 = property.getValue(interval2.stop);
        expect(result2).not.toBe(interval2.data);
        expect(result2).toEqual(interval2.data);
    });

    it('getValue works with a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new Cartesian3(1, 2, 3)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new Cartesian3(4, 5, 6)
        });

        var property = new TimeIntervalCollectionPositionProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);

        var expected = new Cartesian3();
        var result1 = property.getValue(interval1.start, expected);
        expect(result1).toBe(expected);
        expect(result1).toEqual(interval1.data);

        var result2 = property.getValue(interval2.stop, expected);
        expect(result2).toBe(expected);
        expect(result2).toEqual(interval2.data);
    });

    it('getValue returns in fixed frame', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new Cartesian3(1, 2, 3)
        });

        var property = new TimeIntervalCollectionPositionProperty(ReferenceFrame.INERTIAL);
        property.intervals.addInterval(interval1);

        var valueInertial = new Cartesian3(1, 2, 3);
        var valueFixed = PositionProperty.convertToReferenceFrame(interval1.start, valueInertial, ReferenceFrame.INERTIAL, ReferenceFrame.FIXED);

        var result = property.getValue(interval1.start);
        expect(result).toEqual(valueFixed);
    });

    it('getValueInReferenceFrame works with a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new Cartesian3(1, 2, 3)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new Cartesian3(4, 5, 6)
        });

        var property = new TimeIntervalCollectionPositionProperty(ReferenceFrame.FIXED);
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);

        var valueInertial = PositionProperty.convertToReferenceFrame(interval1.start, interval1.data, ReferenceFrame.FIXED, ReferenceFrame.INERTIAL);

        var expected = new Cartesian3();
        var result1 = property.getValueInReferenceFrame(interval1.start, ReferenceFrame.INERTIAL, expected);
        expect(result1).toBe(expected);
        expect(result1).toEqual(valueInertial);

        var result2 = property.getValueInReferenceFrame(interval2.stop, ReferenceFrame.FIXED, expected);
        expect(result2).toBe(expected);
        expect(result2).toEqual(interval2.data);
    });

    it('getValueInReferenceFrame works without a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new Cartesian3(1, 2, 3)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new Cartesian3(4, 5, 6)
        });

        var property = new TimeIntervalCollectionPositionProperty(ReferenceFrame.FIXED);
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);

        var valueInertial = PositionProperty.convertToReferenceFrame(interval1.start, interval1.data, ReferenceFrame.FIXED, ReferenceFrame.INERTIAL);

        var result1 = property.getValueInReferenceFrame(interval1.start, ReferenceFrame.INERTIAL);
        expect(result1).toEqual(valueInertial);

        var result2 = property.getValueInReferenceFrame(interval2.stop, ReferenceFrame.FIXED);
        expect(result2).toEqual(interval2.data);
    });

    it('returns undefined for valid interval without data', function() {
        var property = new TimeIntervalCollectionPositionProperty();

        var interval = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0)
        });
        property.intervals.addInterval(interval);

        var result = property.getValue(interval.start);
        expect(result).toBeUndefined();
    });

    it('throws with no time parameter', function() {
        var property = new TimeIntervalCollectionPositionProperty();
        expect(function() {
            property.getValue(undefined);
        }).toThrowDeveloperError();
    });

    it('throws with no reference frame parameter', function() {
        var property = new TimeIntervalCollectionPositionProperty();
        var time = JulianDate.now();
        expect(function() {
            property.getValueInReferenceFrame(time, undefined);
        }).toThrowDeveloperError();
    });

    it('equals works for differing referenceFrames', function() {
        var left = new TimeIntervalCollectionPositionProperty(ReferenceFrame.FIXED);
        var right = new TimeIntervalCollectionPositionProperty(ReferenceFrame.INERTIAL);
        expect(left.equals(right)).toEqual(false);

        right = new TimeIntervalCollectionPositionProperty(ReferenceFrame.FIXED);
        expect(left.equals(right)).toEqual(true);
    });

    it('equals works for differing intervals', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new Cartesian3(1, 2, 3)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new Cartesian3(4, 5, 6)
        });

        var left = new TimeIntervalCollectionPositionProperty(ReferenceFrame.FIXED);
        left.intervals.addInterval(interval1);
        left.intervals.addInterval(interval2);

        var right = new TimeIntervalCollectionPositionProperty(ReferenceFrame.FIXED);
        right.intervals.addInterval(interval1);

        expect(left.equals(right)).toEqual(false);
        right.intervals.addInterval(interval2);
        expect(left.equals(right)).toEqual(true);
    });

    it('raises definitionChanged event', function() {
        var interval = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new Cartesian3(1, 2, 3)
        });

        var property = new TimeIntervalCollectionPositionProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.intervals.addInterval(interval);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.intervals.removeInterval(interval);
        expect(listener).toHaveBeenCalledWith(property);

        property.intervals.addInterval(interval);
        listener.reset();
        property.intervals.removeAll();
        expect(listener).toHaveBeenCalledWith(property);
    });
});