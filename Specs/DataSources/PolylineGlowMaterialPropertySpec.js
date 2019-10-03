import { Color } from '../../Source/Cesium.js';
import { JulianDate } from '../../Source/Cesium.js';
import { TimeInterval } from '../../Source/Cesium.js';
import { ConstantProperty } from '../../Source/Cesium.js';
import { PolylineGlowMaterialProperty } from '../../Source/Cesium.js';
import { TimeIntervalCollectionProperty } from '../../Source/Cesium.js';
import testDefinitionChanged from '../testDefinitionChanged.js';

describe('DataSources/PolylineGlowMaterialProperty', function() {

    it('constructor provides the expected defaults', function() {
        var property = new PolylineGlowMaterialProperty();
        expect(property.getType()).toEqual('PolylineGlow');
        expect(property.isConstant).toBe(true);
        expect(property.color).toBeUndefined();
        expect(property.glowPower).toBeUndefined();
        expect(property.taperPower).toBeUndefined();

        var result = property.getValue();
        expect(result.color).toEqual(Color.WHITE);
        expect(result.glowPower).toEqual(0.25);
        expect(result.taperPower).toEqual(1.0);
    });

    it('constructor sets options and allows raw assignment', function() {
        var options = {
            color : Color.RED,
            glowPower : 1,
            taperPower : 0.5
        };

        var property = new PolylineGlowMaterialProperty(options);
        expect(property.color).toBeInstanceOf(ConstantProperty);
        expect(property.glowPower).toBeInstanceOf(ConstantProperty);
        expect(property.taperPower).toBeInstanceOf(ConstantProperty);

        expect(property.color.getValue()).toEqual(options.color);
        expect(property.glowPower.getValue()).toEqual(options.glowPower);
        expect(property.taperPower.getValue()).toEqual(options.taperPower);
    });

    it('works with constant values', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.glowPower = new ConstantProperty(0.75);
        property.taperPower = new ConstantProperty(0.85);

        var result = property.getValue(JulianDate.now());
        expect(result.color).toEqual(Color.RED);
        expect(result.glowPower).toEqual(0.75);
        expect(result.taperPower).toEqual(0.85);
    });

    it('works with dynamic values', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();
        property.glowPower = new TimeIntervalCollectionProperty();
        property.taperPower = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.BLUE
        }));
        property.glowPower.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 0.65
        }));
        property.taperPower.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 0.55
        }));

        expect(property.isConstant).toBe(false);

        var result = property.getValue(start);
        expect(result.color).toEqual(Color.BLUE);
        expect(result.glowPower).toEqual(0.65);
        expect(result.taperPower).toEqual(0.55);
    });

    it('works with a result parameter', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.glowPower = new ConstantProperty(0.43);
        property.taperPower = new ConstantProperty(0.33);

        var result = {
            color : Color.BLUE.clone(),
            glowPower : 0.12,
            taperPower : 0.13
        };
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(returnedResult).toBe(result);
        expect(result.color).toEqual(Color.RED);
        expect(result.glowPower).toEqual(0.43);
        expect(result.taperPower).toEqual(0.33);
    });

    it('equals works', function() {
        var left = new PolylineGlowMaterialProperty();
        left.color = new ConstantProperty(Color.WHITE);
        left.glowPower = new ConstantProperty(0.15);
        left.taperPower = new ConstantProperty(0.18);

        var right = new PolylineGlowMaterialProperty();
        right.color = new ConstantProperty(Color.WHITE);
        right.glowPower = new ConstantProperty(0.15);
        right.taperPower = new ConstantProperty(0.18);
        expect(left.equals(right)).toEqual(true);

        right.color = new ConstantProperty(Color.BLACK);
        expect(left.equals(right)).toEqual(false);

        right.color = new ConstantProperty(Color.WHITE);
        right.glowPower = new ConstantProperty(0.25);
        expect(left.equals(right)).toEqual(false);

        right.glowPower = new ConstantProperty(0.15);
        right.taperPower = new ConstantProperty(0.19);
        expect(left.equals(right)).toEqual(false);
    });

    it('raises definitionChanged when a color property is assigned or modified', function() {
        var property = new PolylineGlowMaterialProperty();

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var oldValue = property.color;
        property.color = new ConstantProperty(Color.WHITE);
        expect(listener).toHaveBeenCalledWith(property, 'color', property.color, oldValue);
        listener.calls.reset();

        property.color.setValue(Color.BLACK);
        expect(listener).toHaveBeenCalledWith(property, 'color', property.color, property.color);
        listener.calls.reset();

        property.color = property.color;
        expect(listener.calls.count()).toEqual(0);
    });

    it('raises definitionChanged when glow property is assigned or modified', function() {
        var property = new PolylineGlowMaterialProperty();
        testDefinitionChanged(property, 'color', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'glowPower', 0.25, 0.54);
        testDefinitionChanged(property, 'taperPower', 1.0, 0.44);
    });
});
