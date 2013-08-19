/*global define*/
define([
        './processPacketData',
        '../Core/defined',
        '../Scene/Material'
    ], function(
         processPacketData,
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
         * A DynamicProperty of type Number which determines the material's image.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.image = undefined;
        /**
         * A DynamicProperty of type Number which determines the material's vertical repeat.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.verticalRepeat = undefined;
        /**
         * A DynamicProperty of type Number which determines the material's horizontal repeat.
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

        processPacketData(Image, this, 'image', materialData.image, undefined, sourceUri);
        processPacketData(Number, this, 'verticalRepeat', materialData.verticalRepeat, undefined, sourceUri);
        processPacketData(Number, this, 'horizontalRepeat', materialData.horizontalRepeat, undefined, sourceUri);
    };

    return DynamicImageMaterial;
});
