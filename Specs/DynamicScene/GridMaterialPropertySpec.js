/*global defineSuite*/
defineSuite([
             'DynamicScene/GridMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/TimeIntervalCollectionProperty',
             'Core/Cartesian2',
             'Core/Color',
             'Core/JulianDate',
             'Core/TimeInterval',
             'Specs/UndefinedProperty'
     ], function(
             GridMaterialProperty,
             ConstantProperty,
             TimeIntervalCollectionProperty,
             Cartesian2,
             Color,
             JulianDate,
             TimeInterval,
             UndefinedProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('works with basic types', function() {
        var property = new GridMaterialProperty();
        expect(property.color).toBeDefined();
        expect(property.cellAlpha).toBeDefined();
        expect(property.lineCount).toBeDefined();
        expect(property.lineThickness).toBeDefined();

        expect(property.getType()).toEqual('Grid');

        var result = property.getValue();
        expect(result.color).toEqual(Color.WHITE);
        expect(result.cellAlpha).toEqual(0.1);
        expect(result.lineCount).toEqual(new Cartesian2(8, 8));
        expect(result.lineThickness).toEqual(new Cartesian2(1.0, 1.0));
    });

    it('works with constant values', function() {
        var property = new GridMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.cellAlpha = new ConstantProperty(1.0);
        property.lineCount = new ConstantProperty(new Cartesian2(3.4, 5.0));
        property.lineThickness = new ConstantProperty(new Cartesian2(2, 3));

        var result = property.getValue(new JulianDate());
        expect(result.color).toEqual(Color.RED);
        expect(result.cellAlpha).toEqual(1);
        expect(result.lineCount).toEqual(new Cartesian2(3.4, 5.0));
        expect(result.lineThickness).toEqual(new Cartesian2(2, 3));
    });

    it('works with undefined values', function() {
        var property = new GridMaterialProperty();
        property.color = new UndefinedProperty();
        property.cellAlpha = new UndefinedProperty();
        property.lineCount = new UndefinedProperty();
        property.lineThickness = new UndefinedProperty();

        var result = property.getValue();
        expect(result.hasOwnProperty('color')).toEqual(true);
        expect(result.hasOwnProperty('cellAlpha')).toEqual(true);
        expect(result.hasOwnProperty('lineCount')).toEqual(true);
        expect(result.hasOwnProperty('lineThickness')).toEqual(true);
        expect(result.color).toBeUndefined();
        expect(result.cellAlpha).toBeUndefined();
        expect(result.lineCount).toBeUndefined();
        expect(result.lineThickness).toBeUndefined();
    });

    it('works with dynamic values', function() {
        var property = new GridMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();
        property.cellAlpha = new TimeIntervalCollectionProperty();
        property.lineCount = new TimeIntervalCollectionProperty();
        property.lineThickness = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval(start, stop, true, true, Color.BLUE));
        property.cellAlpha.intervals.addInterval(new TimeInterval(start, stop, true, true, 1.0));
        property.lineCount.intervals.addInterval(new TimeInterval(start, stop, true, true, new Cartesian2(3.4, 5.0)));
        property.lineThickness.intervals.addInterval(new TimeInterval(start, stop, true, true, new Cartesian2(2, 3)));

        var result = property.getValue(start);
        expect(result.color).toEqual(Color.BLUE);
        expect(result.cellAlpha).toEqual(1);
        expect(result.lineCount).toEqual(new Cartesian2(3.4, 5.0));
        expect(result.lineThickness).toEqual(new Cartesian2(2, 3));
    });

    it('works with a result parameter', function() {
        var property = new GridMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        property.cellAlpha = new ConstantProperty(1.0);
        property.lineCount = new ConstantProperty(new Cartesian2(3.4, 5.0));
        property.lineThickness = new ConstantProperty(new Cartesian2(2, 3));

        var result = {};
        var returnedResult = property.getValue(new JulianDate(), result);
        expect(result).toBe(returnedResult);
        expect(result.color).toEqual(Color.RED);
        expect(result.cellAlpha).toEqual(1.0);
        expect(result.lineCount).toEqual(new Cartesian2(3.4, 5.0));
        expect(result.lineThickness).toEqual(new Cartesian2(2, 3));
    });

    it('equals works', function() {
        var left = new GridMaterialProperty();
        left.color = new ConstantProperty(Color.RED);
        left.cellAlpha = new ConstantProperty(1.0);
        left.lineCount = new ConstantProperty(new Cartesian2(3.4, 5.0));
        left.lineThickness = new ConstantProperty(new Cartesian2(2, 3));

        var right = new GridMaterialProperty();
        right.color = new ConstantProperty(Color.RED);
        right.cellAlpha = new ConstantProperty(1.0);
        right.lineCount = new ConstantProperty(new Cartesian2(3.4, 5.0));
        right.lineThickness = new ConstantProperty(new Cartesian2(2, 3));

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
        expect(left.equals(right)).toEqual(true);
    });
});