/*global define*/
define([
        './CzmlColor',
        '../Core/defined',
        './processPacketData',
        '../Scene/Material'
    ], function(
         CzmlColor,
         defined,
         processPacketData,
         Material) {
    "use strict";

    /**
     * A utility class for processing CZML color materials.
     * @alias DynamicColorMaterial
     * @constructor
     */
    var DynamicColorMaterial = function() {
        /**
         * A DynamicProperty of type CzmlColor which determines the material's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
    };

    /**
     * Returns true if the provided CZML interval contains color material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML color material data, false otherwise.
     */
    DynamicColorMaterial.isMaterial = function(czmlInterval) {
        return defined(czmlInterval) && defined(czmlInterval.solidColor);
    };

    /**
     * Returns true if the provided CZML interval contains color material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML color material data, false otherwise.
     */
    DynamicColorMaterial.prototype.isMaterial = DynamicColorMaterial.isMaterial;

    /**
     * Provided a CZML interval containing color material data, processes the
     * interval into a new or existing instance of this class.
     *
     * @param {Object} czmlInterval The interval to process.
     * @param {DynamicColorMaterial} [existingMaterial] The DynamicColorMaterial to modify.
     */
    DynamicColorMaterial.prototype.processCzmlIntervals = function(czmlInterval) {
        var materialData = czmlInterval.solidColor;
        if (defined(materialData)) {
            processPacketData(CzmlColor, this, 'color', materialData.color);
        }
    };

    /**
     * Gets a Color Material that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Context} context The context in which this material exists.
     * @param {Material} [existingMaterial] An existing material to be modified.  If the material is undefined or not a Color Material, a new instance is created.
     * @returns The modified existingMaterial parameter or a new Color Material instance if existingMaterial was undefined or not a Color Material.
     */
    DynamicColorMaterial.prototype.getValue = function(time, context, existingMaterial) {
        if (!defined(existingMaterial) || (existingMaterial.type !== Material.ColorType)) {
            existingMaterial = Material.fromType(context, Material.ColorType);
        }
        existingMaterial.uniforms.color = this.color.getValue(time, existingMaterial.uniforms.color);
        return existingMaterial;
    };

    return DynamicColorMaterial;
});
