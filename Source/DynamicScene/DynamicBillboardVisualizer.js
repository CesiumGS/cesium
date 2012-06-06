/*global define*/
define([
        '../Core/Color',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Renderer/TextureAtlas',
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin'
    ], function(
        Color,
        Cartesian2,
        Cartesian3,
        TextureAtlas,
        BillboardCollection,
        HorizontalOrigin,
        VerticalOrigin) {
    "use strict";

    function DynamicBillboardVisualizer(scene, dynamicObjectCollection) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._dynamicObjectCollection = undefined;

        var billboardCollection = this._billboardCollection = new BillboardCollection();
        var atlas = this._textureAtlas = new TextureAtlas(scene.getContext());
        billboardCollection.setTextureAtlas(atlas);
        scene.getPrimitives().add(billboardCollection);
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

    DynamicBillboardVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    DynamicBillboardVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    DynamicBillboardVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicBillboardVisualizer.prototype._onObjectsRemoved);
                this.removeAll();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicBillboardVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    DynamicBillboardVisualizer.prototype.update = function(time) {
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
            this.updateObject(time, dynamicObjects[i]);
        }
    };

    DynamicBillboardVisualizer.prototype.updateObject = function(time, dynamicObject) {
        var dynamicBillboard = dynamicObject.billboard;
        if (typeof dynamicBillboard === 'undefined') {
            return;
        }

        var positionProperty = dynamicObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var textureProperty = dynamicBillboard.image;
        if (typeof textureProperty === 'undefined') {
            return;
        }

        var billboard;
        var objectId = dynamicObject.id;
        var showProperty = dynamicBillboard.show;
        var billboardVisualizerIndex = dynamicObject.billboardVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof billboardVisualizerIndex !== 'undefined') {
                billboard = this._billboardCollection.get(billboardVisualizerIndex);
                billboard.setShow(false);
                billboard.vizTexture = undefined;
                billboard.vizTextureAvailable = false;
                dynamicObject.billboardVisualizerIndex = undefined;
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
            dynamicObject.billboardVisualizerIndex = billboardVisualizerIndex;
            billboard.id = objectId;
            billboard.vizTexture = undefined;
            billboard.vizTextureAvailable = false;

            // CZML_TODO Determine official defaults
            billboard.setColor(Color.WHITE);
            billboard.setEyeOffset(Cartesian3.ZERO);
            billboard.setPixelOffset(Cartesian2.ZERO);
            billboard.setScale(1.0);
            billboard.setHorizontalOrigin(HorizontalOrigin.CENTER);
            billboard.setVerticalOrigin(VerticalOrigin.CENTER);
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
                var currentIndex = dynamicObject.billboardVisualizerIndex;
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

    DynamicBillboardVisualizer.prototype.removeAll = function() {
        this._unusedIndexes = [];
        this._billboardCollection.removeAll();
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            dynamicObjects[i].billboardVisualizerIndex = undefined;
        }
    };

    DynamicBillboardVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var billboardVisualizerIndex = dynamicObject.billboardVisualizerIndex;
            if (typeof billboardVisualizerIndex !== 'undefined') {
                var billboard = thisBillboardCollection.get(billboardVisualizerIndex);
                billboard.setShow(false);
                billboard.vizTexture = undefined;
                billboard.vizTextureAvailable = false;
                dynamicObject.billboardVisualizerIndex = undefined;
                thisUnusedIndexes.push(billboardVisualizerIndex);
            }
        }
    };

    return DynamicBillboardVisualizer;
});