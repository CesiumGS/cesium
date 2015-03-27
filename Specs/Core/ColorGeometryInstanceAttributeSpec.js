/*global defineSuite*/
defineSuite([
        'Core/ColorGeometryInstanceAttribute',
        'Core/Color',
        'Core/ComponentDatatype'
    ], function(
        ColorGeometryInstanceAttribute,
        Color,
        ComponentDatatype) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('constructor', function() {
        var attribute = new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 0.5);
        expect(attribute.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(attribute.componentsPerAttribute).toEqual(4);
        expect(attribute.normalize).toEqual(true);

        var value = new Uint8Array(new Color(1.0, 1.0, 0.0, 0.5).toBytes());
        expect(attribute.value).toEqual(value);
    });

    it('fromColor', function() {
        var color = Color.AQUA;
        var attribute = ColorGeometryInstanceAttribute.fromColor(color);
        expect(attribute.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(attribute.componentsPerAttribute).toEqual(4);
        expect(attribute.normalize).toEqual(true);

        var value = new Uint8Array(color.toBytes());
        expect(attribute.value).toEqual(value);
    });

    it('fromColor throws without color', function() {
        expect(function() {
            ColorGeometryInstanceAttribute.fromColor();
        }).toThrowDeveloperError();
    });

    it('toValue', function() {
        var color = Color.AQUA;
        var expectedResult = new Uint8Array(color.toBytes());
        expect(ColorGeometryInstanceAttribute.toValue(color)).toEqual(expectedResult);
    });

    it('toValue works with result parameter', function() {
        var color = Color.AQUA;
        var expectedResult = new Uint8Array(color.toBytes());
        var result = new Uint8Array(4);
        var returnedResult = ColorGeometryInstanceAttribute.toValue(color, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expectedResult);
    });

    it('toValue throws without a color', function() {
        expect(function() {
            ColorGeometryInstanceAttribute.toValue();
        }).toThrowDeveloperError();
    });

});
