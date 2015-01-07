/*global define*/
define([
        '../Core/Color',
        '../Core/DeveloperError',
        './ColorMaterialProperty',
        './createPropertyDescriptor',
        './ImageMaterialProperty'
    ], function(
        Color,
        DeveloperError,
        ColorMaterialProperty,
        createPropertyDescriptor,
        ImageMaterialProperty) {
    "use strict";

    function createMaterialProperty(value) {
        if (value instanceof Color) {
            return new ColorMaterialProperty(value);
        }

        if (typeof value === 'string') {
            var result = new ImageMaterialProperty();
            result.image = value;
            return result;
        }

        throw new DeveloperError('Unknown material type.');
    }

    /**
     * @private
     */
    function createMaterialPropertyDescriptor(name, configurable) {
        return createPropertyDescriptor(name, configurable, createMaterialProperty);
    }

    return createMaterialPropertyDescriptor;
});