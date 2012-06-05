/*global define*/
define([
        '../Renderer/TextureAtlas',
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin'
    ], function(
        TextureAtlas,
        BillboardCollection,
        HorizontalOrigin,
        VerticalOrigin) {
    "use strict";

    function DynamicBillboardVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];

        var billboardCollection = this._billboardCollection = new BillboardCollection();
        scene.getPrimitives().add(billboardCollection);

        var atlas = new TextureAtlas(scene.getContext());
        this._textureAtlas = atlas;
        billboardCollection.setTextureAtlas(atlas);
    }

    DynamicBillboardVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    DynamicBillboardVisualizer.prototype.updateObject = function(time, czmlObject) {
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
        var show = czmlObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

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
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                billboardVisualizerIndex = unusedIndexes.pop();
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

        billboard.setShow(billboard.vizTextureAvailable);
        if (!billboard.vizTextureAvailable) {
            return;
        }

        var value = positionProperty.getValueCartesian(time);
        if (value !== 'undefined') {
            billboard.setPosition(value);
        }

        var property = dynamicBillboard.color;

        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                billboard.setColor(value);
            }
        }

        property = dynamicBillboard.eyeOffset;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                billboard.setEyeOffset(value);
            }
        }

        property = dynamicBillboard.pixelOffset;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                billboard.setPixelOffset(value);
            }
        }

        property = dynamicBillboard.scale;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                billboard.setScale(value);
            }
        }

        property = dynamicBillboard.horizontalOrigin;
        if (typeof property !== 'undefined') {
            value = HorizontalOrigin[property.getValue(time)];
            if (typeof value !== 'undefined') {
                billboard.setHorizontalOrigin(value);
            }
        }

        property = dynamicBillboard.verticalOrigin;
        if (typeof property !== 'undefined') {
            value = VerticalOrigin[property.getValue(time)];
            if (typeof value !== 'undefined') {
                billboard.setVerticalOrigin(value);
            }
        }
    };

    DynamicBillboardVisualizer.prototype.removeAll = function(czmlObjects) {
        this._unusedIndexes = [];
        this._billboardCollection.removeAll();

        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.billboardVisualizerIndex = undefined;
        }
    };

    return DynamicBillboardVisualizer;
});