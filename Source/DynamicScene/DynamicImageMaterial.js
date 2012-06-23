/*global define*/
define([
        './DynamicProperty',
        './CzmlString',
        './CzmlNumber',
        '../Scene/DiffuseMapMaterial',
        '../Renderer/PixelFormat',
    ], function(
         DynamicProperty,
         CzmlString,
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
    function createDefaultImage() {
        var canvas = document.createElement('canvas');
        canvas.height = "64";
        canvas.width = "64";

        var context = canvas.getContext('2d');
        context.fillStyle = '#FFFFFF';
        context.font = '64px sans-serif';
        context.textBaseline = 'top';
        context.fillText('?', 16, 0);
        context.font = '64px sans-serif';
        context.strokeStyle = '#000000';
        context.strokeText('?', 16, 0);
        return canvas.toDataURL("image/png");
    }

    var defaultImage = new Image();
    defaultImage.src = createDefaultImage();

    /**
     * A utility class for processing CZML image materials.
     */
    function DynamicImageMaterial() {
        this.image = undefined;
        this.verticalRepeat = undefined;
        this.horizontalRepeat = undefined;
    }

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
    DynamicImageMaterial.processCzmlPacket = function(czmlInterval, existingMaterial) {
        var materialData = czmlInterval.image;
        if (typeof materialData !== 'undefined') {
            if (typeof existingMaterial === 'undefined' || !(existingMaterial instanceof DynamicImageMaterial)) {
                existingMaterial = new DynamicImageMaterial();
            }
            DynamicProperty.processCzmlPacket(existingMaterial, 'image', CzmlString, materialData.image);
            DynamicProperty.processCzmlPacket(existingMaterial, 'verticalRepeat', CzmlNumber, materialData.verticalRepeat);
            DynamicProperty.processCzmlPacket(existingMaterial, 'horizontalRepeat', CzmlNumber, materialData.horizontalRepeat);
        }
        return existingMaterial;
    };

    /**
     * Get's a DiffuseMapMaterial that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Scene} scene The scene in which this material exists.
     * @param {DiffuseMapMaterial} [existingMaterial] An existing material to be modified.  If the material is undefined or not a DiffuseMapMaterial, a new instance is created.
     * @returns The modified existingMaterial parameter or a new DiffuseMapMaterial instance if existingMaterial was undefined or not a DiffuseMapMaterial.
     */
    DynamicImageMaterial.prototype.getValue = function(time, scene, existingMaterial) {
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
                        existingMaterial.texture = scene.getContext().createTexture2D({
                            source : image
                        });
                    }
                };
                image.src = url;
            }
        }
        if (!existingMaterial.texture) {
            existingMaterial.texture = scene.getContext().createTexture2D({
                source : defaultImage
            });
        }
        return existingMaterial;
    };

    return DynamicImageMaterial;
});