import { Color } from '../../Source/Cesium.js';
import { JulianDate } from '../../Source/Cesium.js';
import { TimeInterval } from '../../Source/Cesium.js';
import { ConstantProperty } from '../../Source/Cesium.js';
import { PolylineDashMaterialProperty } from '../../Source/Cesium.js';
import { TimeIntervalCollectionProperty } from '../../Source/Cesium.js';

describe('DataSources/PolylineDashMaterialProperty', function() {

    it('constructor provides the expected defaults', function() {
        var property = new PolylineDashMaterialProperty();
        expect(property.getType()).toEqual('PolylineDash');

        var result = property.getValue();
        expect(result.color).toEqual(Color.WHITE);
        expect(result.gapColor).toEqual(Color.TRANSPARENT);
        expect(result.dashLength).toEqual(16.0);
        expect(result.dashPattern).toEqual(255.0);
    });

    it('constructor sets options and allows raw assignment', function() {
        var options = {
            color : Color.RED,
            gapColor : Color.YELLOW,
            dashLength: 10.0,
            dashPattern: 7.0
        };

        var property = new PolylineDashMaterialProperty(options);
        expect(property.color).toBeInstanceOf(ConstantProperty);
        expect(property.gapColor).toBeInstanceOf(ConstantProperty);
        expect(property.dashLength).toBeInstanceOf(ConstantProperty);
        expect(property.dashPattern).toBeInstanceOf(ConstantProperty);

        expect(property.color.getValue()).toEqual(options.color);
        expect(property.gapColor.getValue()).toEqual(options.gapColor);
        expect(property.dashLength.getValue()).toEqual(options.dashLength);
        expect(property.dashPattern.getValue()).toEqual(options.dashPattern);
    });

    it('works with constant values', function() {
        var property = new PolylineDashMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.gapColor = new ConstantProperty(Color.YELLOW);
        property.dashLength = new ConstantProperty(10.0);
        property.dashPattern = new ConstantProperty(7.0);

        var result = property.getValue(JulianDate.now());
        expect(result.color).toEqual(Color.RED);
        expect(result.gapColor).toEqual(Color.YELLOW);
        expect(result.dashLength).toEqual(10.0);
        expect(result.dashPattern).toEqual(7.0);

    });

    it('works with dynamic values', function() {
        var property = new PolylineDashMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();
        property.gapColor = new TimeIntervalCollectionProperty();
        property.dashLength = new TimeIntervalCollectionProperty();
        property.dashPattern = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.BLUE
        }));
        property.gapColor.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.YELLOW
        }));
        property.dashLength.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 10.0
        }));
        property.dashPattern.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 11.0
        }));

        var result = property.getValue(start);
        expect(result.color).toEqual(Color.BLUE);
        expect(result.gapColor).toEqual(Color.YELLOW);
        expect(result.dashLength).toEqual(10.0);
        expect(result.dashPattern).toEqual(11.0);
    });

    it('works with a result parameter', function() {
        var property = new PolylineDashMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.gapColor = new ConstantProperty(Color.YELLOW);
        property.dashLength = new ConstantProperty(10.0);
        property.dashPattern = new ConstantProperty(11.0);

        var result = {
            color : Color.YELLOW.clone(),
            gapColor : Color.RED.clone(),
            dashLength : 1.0,
            dashPattern: 2.0
        };
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(returnedResult).toBe(result);
        expect(result.color).toEqual(Color.RED);
        expect(result.gapColor).toEqual(Color.YELLOW);
        expect(result.dashLength).toEqual(10.0);
        expect(result.dashPattern).toEqual(11.0);
    });

    it('equals works', function() {
        var left = new PolylineDashMaterialProperty();
        left.color = new ConstantProperty(Color.WHITE);
        left.gapColor = new ConstantProperty(Color.YELLOW);
        left.dashLength = new ConstantProperty(5.0);
        left.dashPattern = new ConstantProperty(7.0);

        var right = new PolylineDashMaterialProperty();
        right.color = new ConstantProperty(Color.WHITE);
        right.gapColor = new ConstantProperty(Color.YELLOW);
        right.dashLength = new ConstantProperty(5.0);
        right.dashPattern = new ConstantProperty(7.0);
        expect(left.equals(right)).toEqual(true);

        right.color = new ConstantProperty(Color.RED);
        expect(left.equals(right)).toEqual(false);

        right.color = left.color;
        right.dashLength = new ConstantProperty(3.0);
        expect(left.equals(right)).toEqual(false);
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new PolylineDashMaterialProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var oldValue = property.color;
        property.color = new ConstantProperty(Color.RED);
        expect(listener).toHaveBeenCalledWith(property, 'color', property.color, oldValue);
        listener.calls.reset();

        property.color.setValue(Color.YELLOW);
        expect(listener).toHaveBeenCalledWith(property, 'color', property.color, property.color);
        listener.calls.reset();

        property.color = property.color;
        expect(listener.calls.count()).toEqual(0);
        listener.calls.reset();

        oldValue = property.gapColor;
        property.gapColor = new ConstantProperty(Color.RED);
        expect(listener).toHaveBeenCalledWith(property, 'gapColor', property.gapColor, oldValue);
        listener.calls.reset();

        property.gapColor.setValue(Color.YELLOW);
        expect(listener).toHaveBeenCalledWith(property, 'gapColor', property.gapColor, property.gapColor);
        listener.calls.reset();

        property.gapColor = property.gapColor;
        expect(listener.calls.count()).toEqual(0);
        listener.calls.reset();

        oldValue = property.dashLength;
        property.dashLength = new ConstantProperty(3.0);
        expect(listener).toHaveBeenCalledWith(property, 'dashLength', property.dashLength, oldValue);
        listener.calls.reset();

        property.dashLength.setValue(2.0);
        expect(listener).toHaveBeenCalledWith(property, 'dashLength', property.dashLength, property.dashLength);
        listener.calls.reset();

        property.dashLength = property.dashLength;
        expect(listener.calls.count()).toEqual(0);

        oldValue = property.dashPattern;
        property.dashPattern = new ConstantProperty(3.0);
        expect(listener).toHaveBeenCalledWith(property, 'dashPattern', property.dashPattern, oldValue);
        listener.calls.reset();

        property.dashPattern.setValue(2.0);
        expect(listener).toHaveBeenCalledWith(property, 'dashPattern', property.dashPattern, property.dashPattern);
        listener.calls.reset();

        property.dashPattern = property.dashPattern;
        expect(listener.calls.count()).toEqual(0);
    });

    it('isConstant is only true when all properties are constant or undefined', function() {
        var property = new PolylineDashMaterialProperty();
        expect(property.isConstant).toBe(true);

        property.color = undefined;
        property.gapColor = undefined;
        property.dashLength = undefined;
        property.dashPattern = undefined;
        expect(property.isConstant).toBe(true);

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color = new TimeIntervalCollectionProperty();
        property.color.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.RED
        }));
        expect(property.isConstant).toBe(false);

        property.color = undefined;
        expect(property.isConstant).toBe(true);

        property.gapColor = new TimeIntervalCollectionProperty();
        property.gapColor.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.RED
        }));
        expect(property.isConstant).toBe(false);
        property.gapColor = undefined;
        expect(property.isConstant).toBe(true);

        property.dashLength = new TimeIntervalCollectionProperty();
        property.dashLength.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 3.0
        }));
        expect(property.isConstant).toBe(false);

        property.dashLength = undefined;
        expect(property.isConstant).toBe(true);
        property.dashPattern = new TimeIntervalCollectionProperty();
        property.dashPattern.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 3.0
        }));
        expect(property.isConstant).toBe(false);
    });
});
