/*global defineSuite*/
defineSuite([
        'DataSources/CompositeMaterialProperty',
        'Core/Color',
        'Core/JulianDate',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/ColorMaterialProperty',
        'DataSources/GridMaterialProperty'
    ], function(
        CompositeMaterialProperty,
        Color,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        GridMaterialProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('default constructor has expected values', function() {
        var property = new CompositeMaterialProperty();
        expect(property.intervals).toBeInstanceOf(TimeIntervalCollection);
        expect(property.isConstant).toBe(true);
        expect(property.getType(JulianDate.now())).toBeUndefined();
        expect(property.getValue(JulianDate.now())).toBeUndefined();
    });

    it('works without a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ColorMaterialProperty()
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new GridMaterialProperty()
        });

        var property = new CompositeMaterialProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);
        expect(property.isConstant).toBe(false);

        var result1 = property.getValue(interval1.start);
        expect(property.getType(interval1.start)).toEqual('Color');
        expect(result1).not.toBe(interval1.data.getValue(interval1.start));
        expect(result1).toEqual(interval1.data.getValue(interval1.start));

        var result2 = property.getValue(interval2.stop);
        expect(property.getType(interval2.stop)).toEqual('Grid');
        expect(result2).not.toBe(interval2.data.getValue(interval2.stop));
        expect(result2).toEqual(interval2.data.getValue(interval2.stop));
    });

    it('works with a result parameter', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ColorMaterialProperty()
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new GridMaterialProperty()
        });

        var property = new CompositeMaterialProperty();
        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);
        expect(property.isConstant).toBe(false);

        var expected = {};
        var result1 = property.getValue(interval1.start, expected);
        expect(result1).toBe(expected);
        expect(result1).toEqual(interval1.data.getValue(interval1.start));

        var result2 = property.getValue(interval2.stop, expected);
        expect(result2).toBe(expected);
        expect(result2).toEqual(interval2.data.getValue(interval2.stop));
    });

    it('equals works', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : new ColorMaterialProperty()
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : new GridMaterialProperty()
        });

        var left = new CompositeMaterialProperty();
        left.intervals.addInterval(interval1);
        left.intervals.addInterval(interval2);

        var right = new CompositeMaterialProperty();
        right.intervals.addInterval(interval1);

        expect(left.equals(right)).toEqual(false);

        right.intervals.addInterval(interval2);
        expect(left.equals(right)).toEqual(true);
    });

    it('raises definitionChanged event in all cases', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(12, 0),
            data : ColorMaterialProperty.fromColor(Color.RED)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(12, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : ColorMaterialProperty.fromColor(Color.YELLOW)
        });

        var property = new CompositeMaterialProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.intervals.addInterval(interval1);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.intervals.addInterval(interval2);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.intervals.removeInterval(interval2);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        interval1.data.color.setValue(Color.BLUE);
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();

        property.intervals.removeAll();
        expect(listener).toHaveBeenCalledWith(property);
        listener.reset();
    });

    it('does not raise definitionChanged for an overwritten interval', function() {
        var interval1 = new TimeInterval({
            start : new JulianDate(11, 0),
            stop : new JulianDate(13, 0),
            data : ColorMaterialProperty.fromColor(Color.RED)
        });
        var interval2 = new TimeInterval({
            start : new JulianDate(10, 0),
            stop : new JulianDate(14, 0),
            isStartIncluded : false,
            data : ColorMaterialProperty.fromColor(Color.YELLOW)
        });

        var property = new CompositeMaterialProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.intervals.addInterval(interval1);
        property.intervals.addInterval(interval2);
        expect(listener.callCount).toBe(2);

        //interval2 overwrites interval1, so callCount should not increase.
        interval1.data.color.setValue(Color.BLUE);
        expect(listener.callCount).toBe(2);
    });

    it('getValue throws with no time parameter', function() {
        var property = new CompositeMaterialProperty();
        expect(function() {
            property.getValue(undefined);
        }).toThrowDeveloperError();
    });

    it('getType throws with no time parameter', function() {
        var property = new CompositeMaterialProperty();
        expect(function() {
            property.getType(undefined);
        }).toThrowDeveloperError();
    });
});