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
        this._textures = {};
    }

    DynamicImageMaterial.isMaterial = function(czmlInterval) {
        return typeof czmlInterval.image !== 'undefined';
    };

    DynamicImageMaterial.processCzmlPacket = function(czmlInterval, existingMaterial, constrainedInterval) {
        var materialData = czmlInterval.image;
        if (typeof materialData !== 'undefined') {
            if (typeof existingMaterial === 'undefined') {
                existingMaterial = new DynamicImageMaterial();
            }
            DynamicProperty.processCzmlPacket(existingMaterial, 'image', CzmlString, materialData.image);
        }
        return existingMaterial;
    };

    //CZML_TODO There is a race condition here if an image loads after it is no longer needed.
    DynamicImageMaterial.prototype.applyToMaterial = function(time, scene, existingMaterial) {
        if (typeof existingMaterial === 'undefined' || !(existingMaterial instanceof DiffuseMapMaterial)) {
            existingMaterial = new DiffuseMapMaterial();
        }
        var url = this.image.getValue(time);
        var textures = this._textures;
        var texture = textures[url];
        if (!texture) {
            var image = new Image();
            image.onload = function() {
                var innerTexture = textures[url];
                if (typeof innerTexture === 'undefined') {
                    textures[url] = innerTexture = scene.getContext().createTexture2D({
                        source : image,
                        pixelFormat : PixelFormat.RGB
                    });
                }
                existingMaterial.texture = innerTexture;
            };
            image.src = url;
        } else if (existingMaterial.texture !== texture) {
            existingMaterial.texture = texture;
        }

        return existingMaterial;
    };

    return DynamicImageMaterial;
});