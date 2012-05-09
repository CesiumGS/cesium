/*global define*/
define(['./DynamicTextureAtlas',
        'Scene/BillboardCollection',
        'Scene/HorizontalOrigin',
        'Scene/VerticalOrigin'],
function(DynamicTextureAtlas,
         BillboardCollection,
         HorizontalOrigin,
         VerticalOrigin) {
    "use strict";

    //FIXME This class currently relies on storing data onto each CZML object
    //These objects may be transient and therefore storing data on them is bad.
    //We may need a slower "fallback" layer of storage in case the data doesn't exist.

    function BillboardVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];

        var billboardCollection = this._billboardCollection = new BillboardCollection();
        scene.getPrimitives().add(billboardCollection);

        this._textureAtlas = new DynamicTextureAtlas(scene.getContext(), function(atlas) {
            billboardCollection.setTextureAtlas(atlas);
        });
    }

    BillboardVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    BillboardVisualizer.prototype.updateObject = function(time, czmlObject) {
        var dynamicBillboard = czmlObject.billboard;
        if (typeof dynamicBillboard === 'undefined') {
            return;
        }

        var positionProperty = czmlObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var textureProperty = dynamicBillboard.image;
        if (typeof textureProperty === 'undefined') {
            return;
        }

        var billboard;
        var objectId = czmlObject.id;
        var showProperty = dynamicBillboard.show;
        var billboardVisualizerIndex = czmlObject.billboardVisualizerIndex;
        var show = typeof showProperty === 'undefined' || showProperty.getValue(time);

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof billboardVisualizerIndex !== 'undefined') {
                billboard = this._billboardCollection.get(billboardVisualizerIndex);
                billboard.setShow(false);
                billboard.vizTexture = undefined;
                billboard.vizTextureAvailable = false;
                czmlObject.billboardVisualizerIndex = undefined;
                this._unusedIndexes.push(billboardVisualizerIndex);
            }
            return;
        }

        if (typeof billboardVisualizerIndex === 'undefined') {
            var objectPool = this._unusedIndexes;
            var length = objectPool.length;
            if (length > 0) {
                billboardVisualizerIndex = objectPool.pop();
                billboard = this._billboardCollection.get(billboardVisualizerIndex);
            } else {
                billboardVisualizerIndex = this._billboardCollection.getLength();
                billboard = this._billboardCollection.add();
            }
            czmlObject.billboardVisualizerIndex = billboardVisualizerIndex;
            billboard.id = objectId;
            billboard.vizTexture = undefined;
            billboard.vizTextureAvailable = false;
        } else {
            billboard = this._billboardCollection.get(billboardVisualizerIndex);
        }

        var textureValue = textureProperty.getValue(time);
        if (textureValue !== billboard.vizTexture) {
            billboard.vizTexture = textureValue;
            billboard.vizTextureAvailable = false;
            var that = this;
            this._textureAtlas.addTextureFromUrl(textureValue, function(imageIndex) {
                //By the time the texture was loaded, the billboard might already be gone.
                var currentIndex = czmlObject.billboardVisualizerIndex;
                if (typeof currentIndex !== 'undefined') {
                    var cbBillboard = that._billboardCollection.get(currentIndex);
                    cbBillboard.vizTextureAvailable = true;
                    cbBillboard.setImageIndex(imageIndex);
                }
            });
        }

        billboard.setShow(show && billboard.vizTextureAvailable);
        if (!billboard.vizTextureAvailable) {
            return;
        }

        billboard.setPosition(positionProperty.getValue(time));

        var property = dynamicBillboard.color;
        if (typeof property !== 'undefined') {
            billboard.setColor(property.getValue(time));
        }

        property = dynamicBillboard.eyeOffset;
        if (typeof property !== 'undefined') {
            billboard.setEyeOffset(property.getValue(time));
        }

        property = dynamicBillboard.pixelOffset;
        if (typeof property !== 'undefined') {
            billboard.setPixelOffset(property.getValue(time));
        }

        property = dynamicBillboard.scale;
        if (typeof property !== 'undefined') {
            billboard.setScale(property.getValue(time));
        }

        property = dynamicBillboard.horizontalOrigin;
        if (typeof property !== 'undefined') {
            billboard.setHorizontalOrigin(HorizontalOrigin[property.getValue(time)]);
        }

        property = dynamicBillboard.verticalOrigin;
        if (typeof property !== 'undefined') {
            billboard.setVerticalOrigin(VerticalOrigin[property.getValue(time)]);
        }
    };

    BillboardVisualizer.prototype.removeAll = function(czmlObjects) {
        this._unusedIndexes = [];
        this._billboardCollection.removeAll();

        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.billboardVisualizerIndex = undefined;
        }
    };

    return BillboardVisualizer;
});