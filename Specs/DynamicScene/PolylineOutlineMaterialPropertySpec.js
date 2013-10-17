/*global defineSuite*/
defineSuite([
             'DynamicScene/PolylineOutlineMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/TimeIntervalCollectionProperty',
             'Core/Color',
             'Core/JulianDate',
             'Core/TimeInterval',
             'Specs/UndefinedProperty'
     ], function(
             PolylineOutlineMaterialProperty,
             ConstantProperty,
             TimeIntervalCollectionProperty,
             Color,
             JulianDate,
             TimeInterval,
             UndefinedProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('works with basic types', function() {
        var property = new PolylineOutlineMaterialProperty();
        expect(property.color).toBeDefined();
        expect(property.outlineColor).toBeDefined();
        expect(property.getType()).toEqual('PolylineOutline');

        var result = property.getValue();
        expect(result.color).toEqual(Color.WHITE);
        expect(result.outlineColor).toEqual(Color.BLACK);
    });

    it('works with constant values', function() {
        var property = new PolylineOutlineMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.outlineColor = new ConstantProperty(Color.BLUE);

        var result = property.getValue(new JulianDate());
        expect(result.color).toEqual(Color.RED);
        expect(result.outlineColor).toEqual(Color.BLUE);
    });

    it('works with undefined values', function() {
        var property = new PolylineOutlineMaterialProperty();
        property.color = new UndefinedProperty();
        property.outlineColor = new UndefinedProperty();

        var result = property.getValue();
        expect(result.hasOwnProperty('color')).toEqual(true);
        expect(result.hasOwnProperty('outlineColor')).toEqual(true);
        expect(result.color).toBeUndefined();
        expect(result.outlineColor).toBeUndefined();
    });

    it('works with dynamic values', function() {
        var property = new PolylineOutlineMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();
        property.outlineColor = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval(start, stop, true, true, Color.BLUE));
        property.outlineColor.intervals.addInterval(new TimeInterval(start, stop, true, true, Color.RED));

        var result = property.getValue(start);
        expect(result.color).toEqual(Color.BLUE);
        expect(result.outlineColor).toEqual(Color.RED);
    });

    it('works with a result parameter', function() {
        var property = new PolylineOutlineMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.outlineColor = new ConstantProperty(Color.BLUE);

        var result = {
            color : Color.YELLOW.clone(),
            outlineColor : Color.BROWN.clone()
        };
        var returnedResult = property.getValue(new JulianDate(), result);
        expect(returnedResult).toBe(result);
        expect(result.color).toEqual(Color.RED);
        expect(result.outlineColor).toEqual(Color.BLUE);
    });

    it('equals works', function() {
        var left = new PolylineOutlineMaterialProperty();
        left.color = new ConstantProperty(Color.WHITE);
        left.outlineColor = new ConstantProperty(Color.BLACK);
        left.outlineWidth = new ConstantProperty(5);

        var right = new PolylineOutlineMaterialProperty();
        right.color = new ConstantProperty(Color.WHITE);
        right.outlineColor = new ConstantProperty(Color.BLACK);
        right.outlineWidth = new ConstantProperty(5);
        expect(left.equals(right)).toEqual(true);

        right.color = new ConstantProperty(Color.RED);
        expect(left.equals(right)).toEqual(false);

        right.color = left.color;
        right.outlineColor = new ConstantProperty(Color.BLUE);
        expect(left.equals(right)).toEqual(false);

        right.outlineColor = left.outlineColor;
        right.outlineWidth = new ConstantProperty(6);
        expect(left.equals(right)).toEqual(false);
    });
});