/*global defineSuite*/
defineSuite([
        'DataSources/PolylineArrowMaterialProperty',
        'Core/Color',
        'Core/JulianDate',
        'Core/TimeInterval',
        'DataSources/ConstantProperty',
        'DataSources/TimeIntervalCollectionProperty'
    ], function(
        PolylineArrowMaterialProperty,
        Color,
        JulianDate,
        TimeInterval,
        ConstantProperty,
        TimeIntervalCollectionProperty) {
    'use strict';

    it('constructor provides the expected defaults', function() {
        var property = new PolylineArrowMaterialProperty();
        expect(property.color).toBeUndefined();
        expect(property.getType()).toEqual('PolylineArrow');
        expect(property.isConstant).toBe(true);

        var result = property.getValue();
        expect(result.color).toEqual(Color.WHITE);

        var colorProperty = new ConstantProperty(Color.BLUE);
        property = new PolylineArrowMaterialProperty(colorProperty);
        expect(property.color).toBe(colorProperty);

        property = new PolylineArrowMaterialProperty(Color.BLUE);
        expect(property.color).toBeInstanceOf(ConstantProperty);
        expect(property.color.getValue()).toEqual(Color.BLUE);
    });

    it('works with constant values', function() {
        var property = new PolylineArrowMaterialProperty();
        property.color = new ConstantProperty(Color.RED);

        var result = property.getValue(JulianDate.now());
        expect(result.color).toEqual(Color.RED);
    });

    it('works with dynamic values', function() {
        var property = new PolylineArrowMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.BLUE
        }));

        expect(property.isConstant).toBe(false);

        var result = property.getValue(start);
        expect(result.color).toEqual(Color.BLUE);
    });

    it('works with a result parameter', function() {
        var property = new PolylineArrowMaterialProperty();
        property.color = new ConstantProperty(Color.RED);

        var result = {
            color : Color.BLUE.clone()
        };
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(returnedResult).toBe(result);
        expect(result.color).toEqual(Color.RED);
    });

    it('equals works', function() {
        var left = new PolylineArrowMaterialProperty();
        left.color = new ConstantProperty(Color.WHITE);

        var right = new PolylineArrowMaterialProperty();
        right.color = new ConstantProperty(Color.WHITE);
        expect(left.equals(right)).toEqual(true);

        right.color = new ConstantProperty(Color.BLACK);
        expect(left.equals(right)).toEqual(false);
    });

    it('raises definitionChanged when a color property is assigned or modified', function() {
        var property = new PolylineArrowMaterialProperty();

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
});
