/*global defineSuite*/
defineSuite([
             'DynamicScene/ColorMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/TimeIntervalCollectionProperty',
             'Core/Color',
             'Core/JulianDate',
             'Core/TimeInterval'
     ], function(
             ColorMaterialProperty,
             ConstantProperty,
             TimeIntervalCollectionProperty,
             Color,
             JulianDate,
             TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('works with basic types', function() {
        var property = new ColorMaterialProperty();
        expect(property.type).toEqual('Color');
        expect(property.isTimeVarying).toEqual(false);
        expect(property.color).toBeUndefined();

        var result = property.getValue();
        expect(result.color).toBeUndefined();
    });

    it('works with constant values', function() {
        var property = new ColorMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        expect(property.isTimeVarying).toEqual(false);

        var result = property.getValue(new JulianDate());
        expect(result.color).toEqual(Color.RED);
    });

    it('works with dynamic values', function() {
        var property = new ColorMaterialProperty();
        property.color = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.color.intervals.addInterval(new TimeInterval(start, stop, true, true, Color.BLUE));
        expect(property.isTimeVarying).toEqual(true);

        var result = {};
        var returnedResult = property.getValue(start, result);
        expect(returnedResult).toBe(result);
        expect(result.color).toEqual(Color.BLUE);
    });

    it('works with a result parameter', function() {
        var property = new ColorMaterialProperty();
        property.color = new ConstantProperty(Color.RED);
        expect(property.isTimeVarying).toEqual(false);

        var result = property.getValue(new JulianDate());
        expect(result.color).toEqual(Color.RED);
    });
});