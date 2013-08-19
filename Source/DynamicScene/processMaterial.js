/*global define*/
define([
        '../Core/defined',
        '../Core/RuntimeError',
        '../Scene/Material',
        './DynamicColorMaterial',
        './DynamicImageMaterial',
        './DynamicGridMaterial'
    ], function(
        defined,
        RuntimeError,
        Material,
        DynamicColorMaterial,
        DynamicImageMaterial,
        DynamicGridMaterial) {
    "use strict";

    function processColorMaterial(time, context, dynamicMaterial, result) {
        if (!defined(result) || (result.type !== Material.ColorType)) {
            result = Material.fromType(context, Material.ColorType);
        }
        result.uniforms.color = dynamicMaterial.color.getValue(time, result.uniforms.color);
        return result;
    }

    function processImageMaterial(time, context, dynamicMaterial, result) {
        if (!defined(result) || (result.type !== Material.ImageType)) {
            result = Material.fromType(context, Material.ImageType);
        }

        var xRepeat;
        var property = dynamicMaterial.verticalRepeat;
        if (defined(property)) {
            xRepeat = property.getValue(time);
            if (defined(xRepeat)) {
                result.uniforms.repeat.x = xRepeat;
            }
        }

        var yRepeat;
        property = dynamicMaterial.horizontalRepeat;
        if (defined(property)) {
            yRepeat = property.getValue(time);
            if (defined(yRepeat)) {
                result.uniforms.repeat.y = yRepeat;
            }
        }

        property = dynamicMaterial.image;
        if (defined(property)) {
            var url = dynamicMaterial.image.getValue(time);
            if (defined(url) && result.currentUrl !== url) {
                result.currentUrl = url;
                result.uniforms.image = url;
            }
        }
        return result;
    }

    function processGridMaterial(time, context, dynamicMaterial, result) {
        if (!defined(result) || (result.type !== Material.GridType)) {
            result = Material.fromType(context, Material.GridType);
        }

        var property = dynamicMaterial.color;
        if (defined(property)) {
            property.getValue(time, result.uniforms.color);
        }

        property = dynamicMaterial.cellAlpha;
        if (defined(property)) {
            var cellAlpha = property.getValue(time);
            if (defined(cellAlpha)) {
                result.uniforms.cellAlpha = cellAlpha;
            }
        }

        var lineCount = result.uniforms.lineCount;

        property = dynamicMaterial.rowCount;
        if (defined(property)) {
            var rowCount = property.getValue(time);
            if (defined(rowCount)) {
                lineCount.x = rowCount;
            }
        }

        property = dynamicMaterial.columnCount;
        if (defined(property)) {
            var columnCount = property.getValue(time);
            if (defined(columnCount)) {
                lineCount.y = columnCount;
            }
        }

        var lineThickness = result.uniforms.lineThickness;

        property = dynamicMaterial.rowThickness;
        if (defined(property)) {
            var rowThickness = property.getValue(time);
            if (defined(rowThickness)) {
                lineThickness.x = rowThickness;
            }
        }

        property = dynamicMaterial.columnThickness;
        if (defined(property)) {
            var columnThickness = property.getValue(time);
            if (defined(columnThickness)) {
                lineThickness.y = columnThickness;
            }
        }

        return result;
    }

    var processMaterial = function(time, property, context, result) {
        var dynamicMaterial = property;
        if (defined(property.getValue)) {
            dynamicMaterial = property.getValue(time);
        }

        if (defined(dynamicMaterial)) {
            if (dynamicMaterial instanceof DynamicColorMaterial) {
                return processColorMaterial(time, context, dynamicMaterial, result);
            } else if (dynamicMaterial instanceof DynamicImageMaterial) {
                return processImageMaterial(time, context, dynamicMaterial, result);
            } else if (dynamicMaterial instanceof DynamicGridMaterial) {
                return processGridMaterial(time, context, dynamicMaterial, result);
            }
            throw new RuntimeError('unknown material');
        }

        return result;
    };

    return processMaterial;
});