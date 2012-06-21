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

    //This is a black on white ? to be used as a "default" texture.
    var dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAAXNSR0I";
    dataUri += "Ars4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAAadEVYdFNvZnR3YXJl";
    dataUri += "AFBhaW50Lk5FVCB2My41LjEwMPRyoQAAATVJREFUOE/Nk78OREAQxnWeQFRehE4jarUX0Kg0PIJK7";
    dataUri += "QW8gUQhOolCL5FIVBqFWnE3uUkmd7vWuj/FTcXu57efb2aV249KEXHatvU8T9M05VHwAK9N04j0B6";
    dataUri += "B1XR3Hwe/5Mk0TBDyOBe37btu2iILrhmHwLBaUZRlR4jie5xkPn6YpiiLaCsOQMfUCAju6rqO6LEv";
    dataUri += "ef57nxFqW5VnwAuq6DnWu64pChS3U1HUtBNGBRVGIQKQ5A10ZqSRJ0BHYFzqSgoZhUFUVKBAlBPoh";
    dataUri += "CCjQeLTD/7twshl3fd+jFyi+9yC+BKqqiigwTYcJyEHQHZqdNE3fuGvP0m3bKBdo/Ek3JI4gVLTj+";
    dataUri += "/55TyWgIAgO51h++xmFZVkIGsfxK0cEgrC+AklnnQTy9l9knYEgF5ogKe7/QHfMiZTut7WfQwAAAABJRU5ErkJggg==";

    var defaultImage = new Image();
    defaultImage.src = dataUri;

    function DynamicImageMaterial(id) {
        this.image = undefined;
        this.verticalRepeat = undefined;
        this.horizontalRepeat = undefined;
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
            DynamicProperty.processCzmlPacket(existingMaterial, 'verticalRepeat', CzmlNumber, materialData.verticalRepeat);
            DynamicProperty.processCzmlPacket(existingMaterial, 'horizontalRepeat', CzmlNumber, materialData.horizontalRepeat);
        }
        return existingMaterial;
    };

    DynamicImageMaterial.prototype.applyToMaterial = function(time, scene, existingMaterial) {
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