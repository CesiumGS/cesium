/*global defineSuite*/
defineSuite([
             'DynamicScene/ColorMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/TimeIntervalCollectionProperty',
             'Core/Color',
             'Core/JulianDate',
             'Core/TimeInterval',
             'Specs/UndefinedProperty'
     ], function(
             ColorMaterialProperty,
             ConstantProperty,
             TimeIntervalCollectionProperty,
             Color,
             JulianDate,
             TimeInterval,
             UndefinedProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('works with basic types', function() {
        var property = new ColorMaterialProperty();
        expect(property.color).toBeDefined();
        expect(property.getType()).toEqual('Color');

        var result = property.getValue();
        expect(result.color).toEqual(Color.WHITE);
    });

    it('works with constant values', function() {
        var property = new ColorMaterialProperty();
        property.color = new ConstantProperty(Color.RED);

        var result = property.getValue(new JulianDate());
        expect(result.color).toEqual(Color.RED);
    });

    it('works with undefined values', function() {
        var property = new ColorMaterialProperty();
        property.color = new UndefinedProperty();

        var result = property.getValue();
        expect(result.hasOwnProperty('color')).toEqual(true);
        expect(result.color).toBeUndefined();
    });

    it('works with dynamic values', function() {
        var property = new ColorMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval(start, stop, true, true, Color.BLUE));

        var result = property.getValue(start);
        expect(result.color).toEqual(Color.BLUE);
    });

    it('works with a result parameter', function() {
        var property = new ColorMaterialProperty();
        property.color = new ConstantProperty(Color.RED);

        var result = {
            color : Color.BLUE.clone()
        };
        var returnedResult = property.getValue(new JulianDate(), result);
        expect(returnedResult).toBe(result);
        expect(result.color).toEqual(Color.RED);
    });

    it('equals works', function() {
        var left = new ColorMaterialProperty();
        left.color = new ConstantProperty(Color.WHITE);

        var right = new ColorMaterialProperty();
        right.color = new ConstantProperty(Color.WHITE);
        expect(left.equals(right)).toEqual(true);

        right.color = new ConstantProperty(Color.BLACK);
        expect(left.equals(right)).toEqual(false);
    });
});