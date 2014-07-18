/*global defineSuite*/
defineSuite([
        'DataSources/GridMaterialProperty',
        'Core/Cartesian2',
        'Core/Color',
        'Core/JulianDate',
        'Core/TimeInterval',
        'DataSources/ConstantProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty'
    ], function(
        GridMaterialProperty,
        Cartesian2,
        Color,
        JulianDate,
        TimeInterval,
        ConstantProperty,
        SampledProperty,
        TimeIntervalCollectionProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor provides the expected defaults', function() {
        var property = new GridMaterialProperty();
        expect(property.color).toBeUndefined();
        expect(property.cellAlpha).toBeUndefined();
        expect(property.lineCount).toBeUndefined();
        expect(property.lineThickness).toBeUndefined();
        expect(property.lineOffset).toBeUndefined();

        expect(property.getType()).toEqual('Grid');

        var result = property.getValue();
        expect(result.color).toEqual(Color.WHITE);
        expect(result.cellAlpha).toEqual(0.1);
        expect(result.lineCount).toEqual(new Cartesian2(8, 8));
        expect(result.lineThickness).toEqual(new Cartesian2(1.0, 1.0));
        expect(result.lineOffset).toEqual(new Cartesian2(0.0, 0.0));
    });

    it('works with constant values', function() {
        var property = new GridMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.cellAlpha = new ConstantProperty(1.0);
        property.lineCount = new ConstantProperty(new Cartesian2(3.4, 5.0));
        property.lineThickness = new ConstantProperty(new Cartesian2(2, 3));
        property.lineOffset = new ConstantProperty(new Cartesian2(0.7, 0.8));

        var result = property.getValue(JulianDate.now());
        expect(result.color).toEqual(Color.RED);
        expect(result.cellAlpha).toEqual(1);
        expect(result.lineCount).toEqual(new Cartesian2(3.4, 5.0));
        expect(result.lineThickness).toEqual(new Cartesian2(2, 3));
        expect(result.lineOffset).toEqual(new Cartesian2(0.7, 0.8));
    });

    it('works with dynamic values', function() {
        var property = new GridMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();
        property.cellAlpha = new TimeIntervalCollectionProperty();
        property.lineCount = new TimeIntervalCollectionProperty();
        property.lineThickness = new TimeIntervalCollectionProperty();
        property.lineOffset = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.BLUE
        }));
        property.cellAlpha.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 1.0
        }));
        property.lineCount.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : new Cartesian2(3.4, 5.0)
        }));
        property.lineThickness.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : new Cartesian2(2, 3)
        }));
        property.lineOffset.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : new Cartesian2(0.7, 0.8)
        }));

        var result = property.getValue(start);
        expect(result.color).toEqual(Color.BLUE);
        expect(result.cellAlpha).toEqual(1);
        expect(result.lineCount).toEqual(new Cartesian2(3.4, 5.0));
        expect(result.lineThickness).toEqual(new Cartesian2(2, 3));
        expect(result.lineOffset).toEqual(new Cartesian2(0.7, 0.8));
    });

    it('works with a result parameter', function() {
        var property = new GridMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.cellAlpha = new ConstantProperty(1.0);
        property.lineCount = new ConstantProperty(new Cartesian2(3.4, 5.0));
        property.lineThickness = new ConstantProperty(new Cartesian2(2, 3));
        property.lineOffset = new ConstantProperty(new Cartesian2(0.7, 0.8));

        var result = {};
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(result).toBe(returnedResult);
        expect(result.color).toEqual(Color.RED);
        expect(result.cellAlpha).toEqual(1.0);
        expect(result.lineCount).toEqual(new Cartesian2(3.4, 5.0));
        expect(result.lineThickness).toEqual(new Cartesian2(2, 3));
        expect(result.lineOffset).toEqual(new Cartesian2(0.7, 0.8));
    });

    it('equals works', function() {
        var left = new GridMaterialProperty();
        left.color = new ConstantProperty(Color.RED);
        left.cellAlpha = new ConstantProperty(1.0);
        left.lineCount = new ConstantProperty(new Cartesian2(3.4, 5.0));
        left.lineThickness = new ConstantProperty(new Cartesian2(2, 3));
        left.lineOffset = new ConstantProperty(new Cartesian2(0.7, 0.8));

        var right = new GridMaterialProperty();
        right.color = new ConstantProperty(Color.RED);
        right.cellAlpha = new ConstantProperty(1.0);
        right.lineCount = new ConstantProperty(new Cartesian2(3.4, 5.0));
        right.lineThickness = new ConstantProperty(new Cartesian2(2, 3));
        right.lineOffset = new ConstantProperty(new Cartesian2(0.7, 0.8));

        expect(left.equals(right)).toEqual(true);

        right.color = new ConstantProperty(Color.BLUE);
        expect(left.equals(right)).toEqual(false);

        right.color = left.color;
        right.cellAlpha = new ConstantProperty(0.5);
        expect(left.equals(right)).toEqual(false);

        right.cellAlpha = left.cellAlpha;
        right.lineCount = new ConstantProperty(new Cartesian2(4, 5.0));
        expect(left.equals(right)).toEqual(false);

        right.lineCount = left.lineCount;
        right.lineThickness = new ConstantProperty(new Cartesian2(3, 2));
        expect(left.equals(right)).toEqual(false);

        right.lineThickness = left.lineThickness;
        right.lineOffset = new ConstantProperty(new Cartesian2(0.8, 0.7));
        expect(left.equals(right)).toEqual(false);

        right.lineOffset = left.lineOffset;
        expect(left.equals(right)).toEqual(true);
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new GridMaterialProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var oldValue = property.color;
        property.color = new ConstantProperty(Color.WHITE);
        expect(listener).toHaveBeenCalledWith(property, 'color', property.color, oldValue);
        listener.reset();

        property.color.setValue(Color.BLACK);
        expect(listener).toHaveBeenCalledWith(property, 'color', property.color, property.color);
        listener.reset();

        property.color = property.color;
        expect(listener.callCount).toEqual(0);
        listener.reset();

        oldValue = property.cellAlpha;
        property.cellAlpha = new ConstantProperty(0.0);
        expect(listener).toHaveBeenCalledWith(property, 'cellAlpha', property.cellAlpha, oldValue);
        listener.reset();

        property.cellAlpha.setValue(1.0);
        expect(listener).toHaveBeenCalledWith(property, 'cellAlpha', property.cellAlpha, property.cellAlpha);
        listener.reset();

        property.cellAlpha = property.cellAlpha;
        expect(listener.callCount).toEqual(0);
        listener.reset();

        oldValue = property.lineCount;
        property.lineCount = new ConstantProperty(5.0);
        expect(listener).toHaveBeenCalledWith(property, 'lineCount', property.lineCount, oldValue);
        listener.reset();

        property.lineCount.setValue(10.0);
        expect(listener).toHaveBeenCalledWith(property, 'lineCount', property.lineCount, property.lineCount);
        listener.reset();

        property.lineCount = property.lineCount;
        expect(listener.callCount).toEqual(0);
        listener.reset();

        oldValue = property.lineThickness;
        property.lineThickness = new ConstantProperty(5.0);
        expect(listener).toHaveBeenCalledWith(property, 'lineThickness', property.lineThickness, oldValue);
        listener.reset();

        property.lineThickness.setValue(10.0);
        expect(listener).toHaveBeenCalledWith(property, 'lineThickness', property.lineThickness, property.lineThickness);
        listener.reset();

        oldValue = property.lineOffset;
        property.lineOffset = new ConstantProperty(5.0);
        expect(listener).toHaveBeenCalledWith(property, 'lineOffset', property.lineOffset, oldValue);
        listener.reset();

        property.lineOffset.setValue(10.0);
        expect(listener).toHaveBeenCalledWith(property, 'lineOffset', property.lineOffset, property.lineOffset);
        listener.reset();

        property.lineOffset = property.lineOffset;
        expect(listener.callCount).toEqual(0);
    });

    it('isConstant is only true when all properties are constant or undefined', function() {
        var property = new GridMaterialProperty();
        expect(property.isConstant).toBe(true);

        property.color = undefined;
        property.cellAlpha = undefined;
        property.lineCount = undefined;
        property.lineThickness = undefined;
        property.lineOffset = undefined;
        expect(property.isConstant).toBe(true);

        property.color = new SampledProperty(Color);
        property.color.addSample(JulianDate.now(), Color.WHITE);
        expect(property.isConstant).toBe(false);

        property.color = undefined;
        expect(property.isConstant).toBe(true);
        property.cellAlpha = new SampledProperty(Number);
        property.cellAlpha.addSample(JulianDate.now(), 0);
        expect(property.isConstant).toBe(false);

        property.cellAlpha = undefined;
        expect(property.isConstant).toBe(true);
        property.lineCount = new SampledProperty(Number);
        property.lineCount.addSample(JulianDate.now(), 1);
        expect(property.isConstant).toBe(false);

        property.lineCount = undefined;
        expect(property.isConstant).toBe(true);
        property.lineThickness = new SampledProperty(Number);
        property.lineThickness.addSample(JulianDate.now(), 1);
        expect(property.isConstant).toBe(false);

        property.lineThickness = undefined;
        expect(property.isConstant).toBe(true);
        property.lineOffset = new SampledProperty(Number);
        property.lineOffset.addSample(JulianDate.now(), 1);
        expect(property.isConstant).toBe(false);
    });
});