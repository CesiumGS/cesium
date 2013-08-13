/*global define*/
define([
        './processPacketData',
        './CzmlImage',
        './CzmlNumber',
        '../Core/defined',
        '../Scene/Material'
    ], function(
         processPacketData,
         CzmlImage,
         CzmlNumber,
         defined,
         Material) {
    "use strict";

    /**
     * A utility class for processing CZML image materials.
     * @alias DynamicImageMaterial
     * @constructor
     */
    var DynamicImageMaterial = function() {
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's image.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.image = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's vertical repeat.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.verticalRepeat = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the material's horizontal repeat.
         *
         * @type {DynamicProperty}
         * @default undefined
         */
        this.horizontalRepeat = undefined;
    };

    /**
     * Returns true if the provided CZML interval contains image material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML image material data, false otherwise.
     */
    DynamicImageMaterial.isMaterial = function(czmlInterval) {
        return defined(czmlInterval.image);
    };

    /**
     * Returns true if the provided CZML interval contains image material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML image material data, false otherwise.
     */
    DynamicImageMaterial.prototype.isMaterial = DynamicImageMaterial.isMaterial;

    /**
     * Provided a CZML interval containing image material data, processes the
     * interval into a new or existing instance of this class.
     *
     * @param {Object} czmlInterval The interval to process.
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     * @returns The modified existingMaterial parameter or a new DynamicImageMaterial instance if existingMaterial was undefined or not a DynamicImageMaterial.
     */
    DynamicImageMaterial.prototype.processCzmlIntervals = function(czmlInterval, sourceUri) {
        var materialData = czmlInterval.image;
        if (!defined(materialData)) {
            return;
        }

        processPacketData(CzmlImage, this, 'image', materialData.image, undefined, sourceUri);
        processPacketData(CzmlNumber, this, 'verticalRepeat', materialData.verticalRepeat, undefined, sourceUri);
        processPacketData(CzmlNumber, this, 'horizontalRepeat', materialData.horizontalRepeat, undefined, sourceUri);
    };

    /**
     * Gets an Image Material that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Context} context The context in which this material exists.
     * @param {Material} [existingMaterial] An existing material to be modified.  If the material is undefined or not an Image Material, a new instance is created.
     * @returns The modified existingMaterial parameter or a new Image Material instance if existingMaterial was undefined or not a Image Material.
     */
    DynamicImageMaterial.prototype.getValue = function(time, context, existingMaterial) {
        if (!defined(existingMaterial) || (existingMaterial.type !== Material.ImageType)) {
            existingMaterial = Material.fromType(context, Material.ImageType);
        }

        var xRepeat;
        var property = this.verticalRepeat;
        if (defined(property)) {
            xRepeat = property.getValue(time);
            if (defined(xRepeat)) {
                existingMaterial.uniforms.repeat.x = xRepeat;
            }
        }

        var yRepeat;
        property = this.horizontalRepeat;
        if (defined(property)) {
            yRepeat = property.getValue(time);
            if (defined(yRepeat)) {
                existingMaterial.uniforms.repeat.y = yRepeat;
            }
        }

        property = this.image;
        if (defined(property)) {
            var url = this.image.getValue(time);
            if (defined(url) && existingMaterial.currentUrl !== url) {
                existingMaterial.currentUrl = url;
                existingMaterial.uniforms.image = url;
            }
        }
        return existingMaterial;
    };

    return DynamicImageMaterial;
});
