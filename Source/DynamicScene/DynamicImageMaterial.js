/*global define*/
define([
        './DynamicProperty',
        './CzmlString',
        '../Scene/DiffuseMapMaterial',
        '../Renderer/PixelFormat'
    ], function(
         DynamicProperty,
         CzmlString,
         DiffuseMapMaterial,
         PixelFormat) {
    "use strict";

    function DynamicImageMaterial(id) {
        this.image = undefined;
        this._sources = {};
    }

    DynamicImageMaterial.isMaterial = function(czmlInterval) {
        return typeof czmlInterval.image !== 'undefined';
    };

    DynamicImageMaterial.processCzmlPacket = function(czmlInterval, dynamicObjectCollection, existingMaterial) {
        var materialData = czmlInterval.image;
        if (typeof materialData !== 'undefined') {
            if (typeof existingMaterial === 'undefined') {
                existingMaterial = new DynamicImageMaterial();
            }
            DynamicProperty.processCzmlPacket(existingMaterial, 'image', CzmlString, materialData.image, undefined, dynamicObjectCollection);
        }
        return existingMaterial;
    };

    //CZML_TODO image.src race condition.
    DynamicImageMaterial.prototype.applyToMaterial = function(time, existingMaterial, scene) {
        if(typeof existingMaterial === 'undefined' || !(existingMaterial instanceof DiffuseMapMaterial)) {
            existingMaterial = new DiffuseMapMaterial();
        }
        var source = this.image.getValue(time);
        var sourceHolder = this._sources[source];
        if(!sourceHolder){
            var image = new Image();
            var sources = this._sources;
            image.src = source;
            existingMaterial.texture = scene.getContext().createTexture2D({
                source : image,
                pixelFormat : PixelFormat.RGB
            });
            sources[source] = existingMaterial.texture;
        }else if(existingMaterial.texture !== sourceHolder){
            existingMaterial.texture = sourceHolder;
        }

        return existingMaterial;
    };

    return DynamicImageMaterial;
});