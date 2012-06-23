/*global define*/
define([
        './DynamicProperty',
        './CzmlColor',
        '../Scene/ColorMaterial'
    ], function(
         DynamicProperty,
         CzmlColor,
         ColorMaterial) {
    "use strict";

    /**
     * A utility class for processing CZML color materials.
     */
    function DynamicColorMaterial() {
        this.color = undefined;
    }

    /**
     * Returns true if the provided CZML interval contains color material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML color material data, false otherwise.
     */
    DynamicColorMaterial.isMaterial = function(czmlInterval) {
        return typeof czmlInterval !== 'undefined' && typeof czmlInterval.solidColor !== 'undefined';
    };

    /**
     * Provided a CZML interval containing color material data, processes the
     * interval into a new or existing instance of this class.
     *
     * @param {Object} czmlInterval The interval to process.
     * @param {DynamicColorMaterial} [existingMaterial] The DynamicColorMaterial to modify.
     * @returns The modified existingMaterial parameter or a new DynamicColorMaterial instance if existingMaterial was undefined or not a DynamicColorMaterial.
     */
    DynamicColorMaterial.processCzmlPacket = function(czmlInterval, existingMaterial) {
        var materialData = czmlInterval.solidColor;
        if (typeof materialData !== 'undefined') {
            if (typeof existingMaterial === 'undefined' || !(existingMaterial instanceof DynamicColorMaterial)) {
                existingMaterial = new DynamicColorMaterial();
            }
            DynamicProperty.processCzmlPacket(existingMaterial, 'color', CzmlColor, materialData.color);
        }
        return existingMaterial;
    };

    /**
     * Get's a ColorMaterial that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Scene} scene The scene in which this material exists.
     * @param {ColorMaterial} [existingMaterial] An existing material to be modified.  If the material is undefined or not a ColorMaterial, a new instance is created.
     * @returns The modified existingMaterial parameter or a new ColorMaterial instance if existingMaterial was undefined or not a ColorMaterial.
     */
    DynamicColorMaterial.prototype.getValue = function(time, scene, existingMaterial) {
        if (typeof existingMaterial === 'undefined' || !(existingMaterial instanceof ColorMaterial)) {
            existingMaterial = new ColorMaterial();
        }
        existingMaterial.color = this.color.getValue(time, existingMaterial.color);
        return existingMaterial;
    };

    return DynamicColorMaterial;
});