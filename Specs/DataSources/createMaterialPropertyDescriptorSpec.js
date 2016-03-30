/*global defineSuite*/
defineSuite([
        'DataSources/createMaterialPropertyDescriptor',
        'Core/Color',
        'Core/Event',
        'DataSources/ColorMaterialProperty',
        'DataSources/ImageMaterialProperty'
    ], function(
        createMaterialPropertyDescriptor,
        Color,
        Event,
        ColorMaterialProperty,
        ImageMaterialProperty) {
    'use strict';

    function MockGraphics() {
        this._definitionChanged = new Event();
    }
    Object.defineProperties(MockGraphics.prototype, {
        materialProperty : createMaterialPropertyDescriptor('materialProperty')
    });

    it('defaults to undefined', function() {
        var instance = new MockGraphics();
        expect(instance.materialProperty).toBeUndefined();
    });

    it('creates ImageMaterialProperty from string ', function() {
        var instance = new MockGraphics();
        expect(instance.materialProperty).toBeUndefined();

        var value = 'test.invalid';
        instance.materialProperty = value;
        expect(instance.materialProperty).toBeInstanceOf(ImageMaterialProperty);
        expect(instance.materialProperty.image.getValue()).toEqual(value);
    });

    it('creates ColorMaterialProperty from Color', function() {
        var instance = new MockGraphics();
        expect(instance.materialProperty).toBeUndefined();

        var value = Color.RED;
        instance.materialProperty = value;
        expect(instance.materialProperty).toBeInstanceOf(ColorMaterialProperty);
        expect(instance.materialProperty.color.getValue()).toEqual(value);
    });

    it('throws if type can not be infered', function() {
        var instance = new MockGraphics();
        expect(function() {
            instance.materialProperty = {};
        }).toThrowDeveloperError();
    });
});
