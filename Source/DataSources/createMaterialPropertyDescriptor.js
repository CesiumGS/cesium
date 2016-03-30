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
    'use strict';

    function createMaterialProperty(value) {
        if (value instanceof Color) {
            return new ColorMaterialProperty(value);
        }

        if (typeof value === 'string' || value instanceof HTMLCanvasElement || value instanceof HTMLVideoElement) {
            var result = new ImageMaterialProperty();
            result.image = value;
            return result;
        }

        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('Unable to infer material type: ' + value);
        //>>includeEnd('debug');
    }

    /**
     * @private
     */
    function createMaterialPropertyDescriptor(name, configurable) {
        return createPropertyDescriptor(name, configurable, createMaterialProperty);
    }

    return createMaterialPropertyDescriptor;
});
