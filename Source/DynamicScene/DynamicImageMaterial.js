/*global define*/
define([
        './DynamicProperty',
        './CzmlString',
        './CzmlNumber',
        '../Scene/Material'
    ], function(
         DynamicProperty,
         CzmlString,
         CzmlNumber,
         Material) {
    "use strict";

    /**
     * A utility class for processing CZML image materials.
     * @alias DynamicImageMaterial
     * @constructor
     */
    var DynamicImageMaterial = function() {
        this.image = undefined;
        this.verticalRepeat = undefined;
        this.horizontalRepeat = undefined;
    };

    /**
     * Returns true if the provided CZML interval contains image material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML image material data, false otherwise.
     */
    DynamicImageMaterial.isMaterial = function(czmlInterval) {
        return typeof czmlInterval.image !== 'undefined';
    };

    /**
     * Provided a CZML interval containing image material data, processes the
     * interval into a new or existing instance of this class.
     *
     * @param {Object} czmlInterval The interval to process.
     * @param {DynamicImageMaterial} [existingMaterial] The DynamicImageMaterial to modify.
     * @returns The modified existingMaterial parameter or a new DynamicImageMaterial instance if existingMaterial was undefined or not a DynamicImageMaterial.
     */
    DynamicImageMaterial.prototype.processCzmlIntervals = function(czmlInterval) {
        var materialData = czmlInterval.image;
        if (typeof materialData === 'undefined') {
            return;
        }

        if (typeof materialData.image !== 'undefined') {
            var image = this.image;
            if (typeof image === 'undefined') {
                this.image = image = new DynamicProperty(CzmlString);
            }
            image.processCzmlIntervals(materialData.image);
        }

        if (typeof materialData.verticalRepeat !== 'undefined') {
            var verticalRepeat = this.verticalRepeat;
            if (typeof verticalRepeat === 'undefined') {
                this.verticalRepeat = verticalRepeat = new DynamicProperty(CzmlNumber);
            }
            verticalRepeat.processCzmlIntervals(materialData.verticalRepeat);
        }

        if (typeof materialData.horizontalRepeat !== 'undefined') {
            var horizontalRepeat = this.horizontalRepeat;
            if (typeof horizontalRepeat === 'undefined') {
                this.horizontalRepeat = horizontalRepeat = new DynamicProperty(CzmlNumber);
            }
            horizontalRepeat.processCzmlIntervals(materialData.horizontalRepeat);
        }
    };

    /**
     * Get's an Image Material that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Context} context The context in which this material exists.
     * @param {Material} [existingMaterial] An existing material to be modified.  If the material is undefined or not an Image Material, a new instance is created.
     * @returns The modified existingMaterial parameter or a new Image Material instance if existingMaterial was undefined or not a Image Material.
     */
    DynamicImageMaterial.prototype.getValue = function(time, context, existingMaterial) {
        if (typeof existingMaterial === 'undefined' || (existingMaterial.getID() !== 'Image')) {
            existingMaterial = Material.fromID(context, 'Image');
        }

        var tRepeat;
        var property = this.verticalRepeat;
        if (typeof property !== 'undefined') {
            tRepeat = property.getValue(time);
            if (typeof tRepeat !== 'undefined') {
                existingMaterial.uniforms.repeat.x = tRepeat;
            }
        }

        var sRepeat;
        property = this.horizontalRepeat;
        if (typeof property !== 'undefined') {
            sRepeat = property.getValue(time);
            if (typeof value !== 'undefined') {
                existingMaterial.uniforms.repeat.y = sRepeat;
            }
        }

        property = this.image;
        if (typeof property !== 'undefined') {
            var url = this.image.getValue(time);
            if (typeof url !== 'undefined' && existingMaterial.currentUrl !== url) {
                existingMaterial.currentUrl = url;
                existingMaterial.uniforms.texture = url;
            }
        }
        return existingMaterial;
    };

    return DynamicImageMaterial;
});