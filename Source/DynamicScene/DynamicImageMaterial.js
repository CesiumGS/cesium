/*global define*/
define([
        './DynamicProperty',
        './CzmlImage',
        './CzmlNumber',
        '../Scene/DiffuseMapMaterial',
        '../Renderer/PixelFormat'
    ], function(
         DynamicProperty,
         CzmlImage,
         CzmlNumber,
         DiffuseMapMaterial,
         PixelFormat) {
    "use strict";

    //CZML_TODO Cesium doesn't currently provide any sort of 'default' texture or image
    //when you default construct something with a texture.  This means that as soon as we create
    //our image material, we have to assign a texture to it or else we will crash
    //on the next draw.  Once we change Cesium to have built in texture defaults,
    //this code can be removed.  If we decide Cesium shouldn't have built in defaults,
    //this code should be changes so at least all CZML visualization has defaults.
    function createDefaultTexture() {
        var canvas = document.createElement('canvas');
        canvas.height = '64';
        canvas.width = '64';

        var context = canvas.getContext('2d');
        context.fillStyle = '#FFFFFF';
        context.font = '64px sans-serif';
        context.textBaseline = 'top';
        context.fillText('?', 16, 0);
        context.font = '64px sans-serif';
        context.strokeStyle = '#000000';
        context.strokeText('?', 16, 0);
        return canvas.toDataURL('image/png');
    }

    var defaultTexture = createDefaultTexture();

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
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     * @returns The modified existingMaterial parameter or a new DynamicImageMaterial instance if existingMaterial was undefined or not a DynamicImageMaterial.
     */
    DynamicImageMaterial.prototype.processCzmlIntervals = function(czmlInterval, sourceUri) {
        var materialData = czmlInterval.image;
        if (typeof materialData === 'undefined') {
            return;
        }

        if (typeof materialData.image !== 'undefined') {
            var image = this.image;
            if (typeof image === 'undefined') {
                this.image = image = new DynamicProperty(CzmlImage);
            }
            image.processCzmlIntervals(materialData.image, undefined, sourceUri);
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
     * Get's a DiffuseMapMaterial that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Context} context The context in which this material exists.
     * @param {DiffuseMapMaterial} [existingMaterial] An existing material to be modified.  If the material is undefined or not a DiffuseMapMaterial, a new instance is created.
     * @returns The modified existingMaterial parameter or a new DiffuseMapMaterial instance if existingMaterial was undefined or not a DiffuseMapMaterial.
     */
    DynamicImageMaterial.prototype.getValue = function(time, context, existingMaterial) {
        if (typeof existingMaterial === 'undefined' || !(existingMaterial instanceof DiffuseMapMaterial)) {
            existingMaterial = new DiffuseMapMaterial();
        }

        var tRepeat;
        var property = this.verticalRepeat;
        if (typeof property !== 'undefined') {
            tRepeat = property.getValue(time);
            if (typeof tRepeat !== 'undefined') {
                existingMaterial.tRepeat = tRepeat;
            }
        }

        var sRepeat;
        property = this.horizontalRepeat;
        if (typeof property !== 'undefined') {
            sRepeat = property.getValue(time);
            if (typeof value !== 'undefined') {
                existingMaterial.sRepeat = sRepeat;
            }
        }

        property = this.image;
        if (typeof property !== 'undefined') {
            var url = this.image.getValue(time);
            if (typeof url !== 'undefined' && existingMaterial.currentUrl !== url) {
                existingMaterial.currentUrl = url;
                var image = new Image();
                image.onload = function() {
                    if (existingMaterial.currentUrl === url) {
                        existingMaterial.texture = context.createTexture2D({
                            source : image
                        });
                    }
                };
                image.src = url;
            }
        }
        if (!existingMaterial.texture) {
            existingMaterial.texture = context.createTexture2D({
                source : defaultTexture
            });
        }
        return existingMaterial;
    };

    return DynamicImageMaterial;
});