defineSuite([
        'DataSources/CompositePositionProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/ReferenceFrame',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/ConstantPositionProperty',
        'DataSources/PositionProperty'
    ], function(
        CompositePositionProperty,
        Cartesian3,
        JulianDate,
        ReferenceFrame,
        TimeInterval,
        TimeIntervalCollection,
        ConstantPositionProperty,
        PositionProperty) {
    'use strict';

    it('default constructor has expected values', function() {
        var property = new CompositePositionProperty();
        expect(property.intervals).toBeInstanceOf(TimeIntervalCollection);
        expect(property.getValue(JulianDate.now())).toBeUndefined();
        expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);
        expect(property.isConstant).toBe(true);
    });

    it('constructor sets expected values', function() {
        var property = new CompositePositionProperty(ReferenceFrame.INERTIAL);
        expect(property.referenceFrame).toBe(ReferenceFrame.INERTIAL);
    });

    it('can modify reference frame', function() {
        var property = new CompositePositionProperty();
        expect(property.referenceFrame).toBe(ReferenceFrame.FIXED);
        property.referenceFrame = ReferenceFrame.INERTIAL;
        expect(property.referenceFrame).toBe(ReferenceFrame.INERTIAL);
    });

    it('works without a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3))
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6))
        });

        var property = new CompositePositionProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);
        expect(property.isConstant).toBe(false);

        var result1 = property.getValue(interval1.start);
        expect(result1).not.toBe(interval1.data.getValue(interval1.start));
        expect(result1).toEqual(interval1.data.getValue(interval1.start));

        var result2 = property.getValue(interval2.stop);
        expect(result2).not.toBe(interval2.data.getValue(interval2.stop));
        expect(result2).toEqual(interval2.data.getValue(interval2.stop));
    });

    it('getValue works with a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3))
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6))
        });

        var property = new CompositePositionProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);
        expect(property.isConstant).toBe(false);

        var expected = new Cartesian3();
        var result1 = property.getValue(interval1.start, expected);
        expect(result1).toBe(expected);
        expect(result1).toEqual(interval1.data.getValue(interval1.start));

        var result2 = property.getValue(interval2.stop, expected);
        expect(result2).toBe(expected);
        expect(result2).toEqual(interval2.data.getValue(interval2.stop));
    });

    it('getValue works without a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3))
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6))
        });

        var property = new CompositePositionProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);

        var result1 = property.getValue(interval1.start);
        expect(result1).toEqual(interval1.data.getValue(interval1.start));

        var result2 = property.getValue(interval2.stop);
        expect(result2).toEqual(interval2.data.getValue(interval2.stop));
    });

    it('getValue returns in fixed frame', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.INERTIAL)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6), ReferenceFrame.FIXED)
        });

        var property = new CompositePositionProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);

        var valueInertial = new Cartesian3(1, 2, 3);
        var valueFixed = PositionProperty.convertToReferenceFrame(interval1.start, valueInertial, ReferenceFrame.INERTIAL, ReferenceFrame.FIXED);

        var result1 = property.getValue(interval1.start);
        expect(result1).toEqual(valueFixed);

        var result2 = property.getValue(interval2.stop);
        expect(result2).toEqual(interval2.data.getValue(interval2.stop));
    });

    it('getValueInReferenceFrame works with a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.INERTIAL)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6), ReferenceFrame.FIXED)
        });

        var property = new CompositePositionProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);

        var expected = new Cartesian3();
        var result1 = property.getValueInReferenceFrame(interval1.start, ReferenceFrame.INERTIAL, expected);
        expect(result1).toBe(expected);
        expect(result1).toEqual(interval1.data.getValueInReferenceFrame(interval1.start, ReferenceFrame.INERTIAL));

        var result2 = property.getValueInReferenceFrame(interval2.stop, ReferenceFrame.FIXED, expected);
        expect(result2).toBe(expected);
        expect(result2).toEqual(interval2.data.getValueInReferenceFrame(interval2.stop, ReferenceFrame.FIXED));
    });

    it('getValueInReferenceFrame works without a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3), ReferenceFrame.INERTIAL)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6), ReferenceFrame.FIXED)
        });

        var property = new CompositePositionProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);

        var result1 = property.getValueInReferenceFrame(interval1.start, ReferenceFrame.INERTIAL);
        expect(result1).toEqual(interval1.data.getValueInReferenceFrame(interval1.start, ReferenceFrame.INERTIAL));

        var result2 = property.getValueInReferenceFrame(interval2.stop, ReferenceFrame.FIXED);
        expect(result2).toEqual(interval2.data.getValueInReferenceFrame(interval2.stop, ReferenceFrame.FIXED));
    });

    it('equals works', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3))
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6))
        });

        var left = new CompositePositionProperty();
        left.intervals.addInterval(interval1);
        left.intervals.addInterval(interval2);

        var right = new CompositePositionProperty();
        right.intervals.addInterval(interval1);
        expect(left.equals(right)).toEqual(false);

        right.intervals.addInterval(interval2);
        expect(left.equals(right)).toEqual(true);

        right.referenceFrame = ReferenceFrame.INTERTIAL;
        expect(left.equals(right)).toEqual(false);
    });

    it('getValue throws with no time parameter', function() {
        var property = new CompositePositionProperty();
        expect(function() {
            property.getValue(undefined);
        }).toThrowDeveloperError();
    });

    it('getValueInReferenceFrame throws with no referenceFrame parameter', function() {
        var property = new CompositePositionProperty();
        var time = JulianDate.now();
        expect(function() {
            property.getValueInReferenceFrame(time, undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged event in all cases', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3))
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6))
        });

        var property = new CompositePositionProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.intervals.addInterval(interval1);
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();

        property.intervals.addInterval(interval2);
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();

        property.intervals.removeInterval(interval2);
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();

        interval1.data.setValue(new Cartesian3());
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();

        property.intervals.removeAll();
        expect(listener).toHaveBeenCalledWith(property);
        listener.calls.reset();
    });

    it('does not raise definitionChanged for an overwritten interval', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(11, 0),
            stop : new JulianDate(13, 0),
            data : new ConstantPositionProperty(new Cartesian3(1, 2, 3))
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new ConstantPositionProperty(new Cartesian3(4, 5, 6))
        });

        var property = new CompositePositionProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);
        expect(listener.calls.count()).toBe(2);

        //interval2 overwrites interval1, so calls.count() should not increase.
        interval1.data.setValue(new Cartesian3());
        expect(listener.calls.count()).toBe(2);
    });
});
