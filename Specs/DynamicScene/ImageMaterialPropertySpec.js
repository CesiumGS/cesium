/*global defineSuite*/
defineSuite([
             'DynamicScene/ImageMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/TimeIntervalCollectionProperty',
             'Core/Cartesian2',
             'Core/JulianDate',
             'Core/TimeInterval',
             'Specs/UndefinedProperty'
     ], function(
             ImageMaterialProperty,
             ConstantProperty,
             TimeIntervalCollectionProperty,
             Cartesian2,
             JulianDate,
             TimeInterval,
             UndefinedProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('works with basic types', function() {
        var property = new ImageMaterialProperty();
        expect(property.image).toBeUndefined();
        expect(property.repeat).toBeDefined();

        expect(property.getType()).toEqual('Image');

        var result = property.getValue();
        expect(result.image).toBeUndefined();
        expect(result.repeat).toEqual(new Cartesian2(1.0, 1.0));
    });

    it('works with constant values', function() {
        var property = new ImageMaterialProperty();
        property.image = new ConstantProperty('http://test.invalid/image.png');
        property.repeat = new ConstantProperty(new Cartesian2(2, 3));

        var result = property.getValue(new JulianDate());
        expect(result.image).toEqual('http://test.invalid/image.png');
        expect(result.repeat).toEqual(new Cartesian2(2, 3));
    });

    it('works with undefined values', function() {
        var property = new ImageMaterialProperty();
        property.image = new UndefinedProperty();
        property.repeat = new UndefinedProperty();

        var result = property.getValue();
        expect(result.hasOwnProperty('image')).toEqual(true);
        expect(result.hasOwnProperty('repeat')).toEqual(true);
        expect(result.image).toBeUndefined();
        expect(result.repeat).toBeUndefined();
    });

    it('works with dynamic values', function() {
        var property = new ImageMaterialProperty();
        property.image = new TimeIntervalCollectionProperty();
        property.repeat = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.image.intervals.addInterval(new TimeInterval(start, stop, true, true, 'http://test.invalid/image.png'));
        property.repeat.intervals.addInterval(new TimeInterval(start, stop, true, true, new Cartesian2(2, 3)));

        var result = property.getValue(start);
        expect(result.image).toEqual('http://test.invalid/image.png');
        expect(result.repeat).toEqual(new Cartesian2(2, 3));
    });

    it('works with a result parameter', function() {
        var property = new ImageMaterialProperty();
        property.image = new ConstantProperty('http://test.invalid/image.png');
        property.repeat = new ConstantProperty(new Cartesian2(2, 3));

        var result = {};
        var returnedResult = property.getValue(new JulianDate(), result);
        expect(result).toBe(returnedResult);
        expect(result.image).toEqual('http://test.invalid/image.png');
        expect(result.repeat).toEqual(new Cartesian2(2, 3));
    });

    it('equals works', function() {
        var left = new ImageMaterialProperty();
        left.image = new ConstantProperty('http://test.invalid/image.png');
        left.repeat = new ConstantProperty(new Cartesian2(2, 3));

        var right = new ImageMaterialProperty();
        right.image = new ConstantProperty('http://test.invalid/image.png');
        right.repeat = new ConstantProperty(new Cartesian2(2, 3));

        expect(left.equals(right)).toEqual(true);

        right.image = new ConstantProperty('http://test.invalid/image2.png');
        expect(left.equals(right)).toEqual(false);

        right.image = left.image;
        right.repeat = new ConstantProperty(new Cartesian2(3, 2));
        expect(left.equals(right)).toEqual(false);

        right.repeat = left.repeat;
        expect(left.equals(right)).toEqual(true);
    });
});