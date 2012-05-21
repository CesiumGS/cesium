/*global define*/
define([
        './DynamicProperty',
        './ColorDataHandler',
        '../Scene/ColorMaterial'
    ], function(
         DynamicProperty,
         ColorDataHandler,
         ColorMaterial) {
    "use strict";

    function DynamicColorMaterial(id) {
        this.color = undefined;
    }

    DynamicColorMaterial.isMaterial = function(czmlInterval) {
        return typeof czmlInterval.solidColor !== 'undefined';
    };

    DynamicColorMaterial.createOrUpdate = function(czmlInterval, czmlObjectCollection, existingMaterial) {
        var materialData = czmlInterval.solidColor;
        if (typeof materialData !== 'undefined') {
            if (typeof existingMaterial === 'undefined') {
                existingMaterial = new DynamicColorMaterial();
            }
            DynamicProperty.createOrUpdate(existingMaterial, "color", ColorDataHandler, materialData.color, undefined, czmlObjectCollection);
        }
        return existingMaterial;
    };

    DynamicColorMaterial.prototype.applyToMaterial = function(time, existingMaterial) {
        if(typeof existingMaterial === 'undefined' || !(existingMaterial instanceof ColorMaterial)) {
            existingMaterial = new ColorMaterial();
        }
        existingMaterial.color = this.color.getValue(time);
        return existingMaterial;
    };

    return DynamicColorMaterial;
});