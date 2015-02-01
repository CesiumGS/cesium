/*global defineSuite*/
defineSuite([
        'DataSources/PolylineGlowMaterialProperty',
        'Core/Color',
        'Core/JulianDate',
        'Core/TimeInterval',
        'DataSources/ConstantProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Specs/testDefinitionChanged'
    ], function(
        PolylineGlowMaterialProperty,
        Color,
        JulianDate,
        TimeInterval,
        ConstantProperty,
        TimeIntervalCollectionProperty,
        testDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor provides the expected defaults', function() {
        var property = new PolylineGlowMaterialProperty();
        expect(property.getType()).toEqual('PolylineGlow');
        expect(property.isConstant).toBe(true);
        expect(property.color).toBeUndefined();
        expect(property.glowPower).toBeUndefined();

        var result = property.getValue();
        expect(result.color).toEqual(Color.WHITE);
        expect(result.glowPower).toEqual(0.25);
    });

    it('constructor sets options and allows raw assignment', function() {
        var options = {
            color : Color.RED,
            glowPower : 1
        };

        var property = new PolylineGlowMaterialProperty(options);
        expect(property.color).toBeInstanceOf(ConstantProperty);
        expect(property.glowPower).toBeInstanceOf(ConstantProperty);

        expect(property.color.getValue()).toEqual(options.color);
        expect(property.glowPower.getValue()).toEqual(options.glowPower);
    });

    it('works with constant values', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.glowPower = new ConstantProperty(0.75);

        var result = property.getValue(JulianDate.now());
        expect(result.color).toEqual(Color.RED);
        expect(result.glowPower).toEqual(0.75);
    });

    it('works with dynamic values', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();
        property.glowPower = new TimeIntervalCollectionProperty();

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

        expect(property.isConstant).toBe(false);

        var result = property.getValue(start);
        expect(result.color).toEqual(Color.BLUE);
        expect(result.glowPower).toEqual(0.65);
    });

    it('works with a result parameter', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.glowPower = new ConstantProperty(0.43);

        var result = {
            color : Color.BLUE.clone(),
            glowPower : 0.12
        };
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(returnedResult).toBe(result);
        expect(result.color).toEqual(Color.RED);
        expect(result.glowPower).toEqual(0.43);
    });

    it('equals works', function() {
        var left = new PolylineGlowMaterialProperty();
        left.color = new ConstantProperty(Color.WHITE);
        left.glowPower = new ConstantProperty(0.15);

        var right = new PolylineGlowMaterialProperty();
        right.color = new ConstantProperty(Color.WHITE);
        right.glowPower = new ConstantProperty(0.15);
        expect(left.equals(right)).toEqual(true);

        right.color = new ConstantProperty(Color.BLACK);
        expect(left.equals(right)).toEqual(false);

        right.color = new ConstantProperty(Color.WHITE);
        right.glowPower = new ConstantProperty(0.25);
        expect(left.equals(right)).toEqual(false);
    });

    it('raises definitionChanged when a color property is assigned or modified', function() {
        var property = new PolylineGlowMaterialProperty();

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
    });

    it('raises definitionChanged when glow property is assigned or modified', function() {
        var property = new PolylineGlowMaterialProperty();
        testDefinitionChanged(property, 'color', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'glowPower', 0.25, 0.54);
    });
});