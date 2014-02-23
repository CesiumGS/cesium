/*global defineSuite*/
defineSuite(['DynamicScene/PolylineGlowMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/TimeIntervalCollectionProperty',
             'Core/Color',
             'Core/JulianDate',
             'Core/TimeInterval'
     ], function(
             PolylineGlowMaterialProperty,
             ConstantProperty,
             TimeIntervalCollectionProperty,
             Color,
             JulianDate,
             TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor provides the expected defaults', function() {
        var property = new PolylineGlowMaterialProperty();
        expect(property.getType()).toEqual('PolylineGlow');
        expect(property.isConstant).toBe(true);
        expect(property.color).toEqual(new ConstantProperty(Color.WHITE));
        expect(property.glowPower).toEqual(new ConstantProperty(0.25));
    });

    it('works with constant values', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.glowPower = new ConstantProperty(0.75);

        var result = property.getValue(new JulianDate());
        expect(result.color).toEqual(Color.RED);
        expect(result.glowPower).toEqual(0.75);
    });

    it('works with undefined values', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new ConstantProperty();
        property.glowPower = new ConstantProperty();

        var result = property.getValue();
        expect(result.hasOwnProperty('color')).toEqual(true);
        expect(result.hasOwnProperty('glowPower')).toEqual(true);
        expect(result.color).toBeUndefined();
        expect(result.glowPower).toBeUndefined();
    });

    it('works with dynamic values', function() {
        var property = new PolylineGlowMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();
        property.glowPower = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval(start, stop, true, true, Color.BLUE));
        property.glowPower.intervals.addInterval(new TimeInterval(start, stop, true, true, 0.65));

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
            glowPower: 0.12
        };
        var returnedResult = property.getValue(new JulianDate(), result);
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

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var oldValue = property.glowPower;
        property.glowPower = new ConstantProperty(0.83);
        expect(listener).toHaveBeenCalledWith(property, 'glowPower', property.glowPower, oldValue);
        listener.reset();

        property.glowPower.setValue(0.12);
        expect(listener).toHaveBeenCalledWith(property, 'glowPower', property.glowPower, property.glowPower);
        listener.reset();

        property.glowPower = property.glowPower;
        expect(listener.callCount).toEqual(0);
    });
});