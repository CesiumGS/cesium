/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Renderer/TextureAtlas',
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin'
    ], function(
        destroyObject,
        Color,
        Cartesian2,
        Cartesian3,
        TextureAtlas,
        BillboardCollection,
        HorizontalOrigin,
        VerticalOrigin) {
    "use strict";

    //Callback to create a callback so that we close over all of the proper values.
    function textureReady(dynamicObject, billboardCollection, textureValue) {
        return function(imageIndex) {
            //By the time the texture was loaded, the billboard might already be
            //gone or have been assigned a different texture.  Look it up again
            //and check.
            var currentIndex = dynamicObject.billboardVisualizerIndex;
            if (typeof currentIndex !== 'undefined') {
                var cbBillboard = billboardCollection.get(currentIndex);
                if (cbBillboard.vizTexture === textureValue) {
                    cbBillboard.vizTextureAvailable = true;
                    cbBillboard.setImageIndex(imageIndex);
                }
            }
        };
    }

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

    var show;
    var textureValue;
    var position;
    var color;
    var eyeOffset;
    var pixelOffset;
    var scale;
    var verticalOrigin;
    var horizontalOrigin;
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
        show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time, show));

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

        textureValue = textureProperty.getValue(time, textureValue);
        if (textureValue !== billboard.vizTexture) {
            billboard.vizTexture = textureValue;
            billboard.vizTextureAvailable = false;
            this._textureAtlas.addTextureFromUrl(textureValue, textureReady(dynamicObject, this._billboardCollection, textureValue));
        }

        billboard.setShow(billboard.vizTextureAvailable);
        if (!billboard.vizTextureAvailable) {
            return;
        }

        position = positionProperty.getValueCartesian(time, position);
        if (position !== 'undefined') {
            billboard.setPosition(position);
        }

        var property = dynamicBillboard.color;

        if (typeof property !== 'undefined') {
            color = property.getValue(time, color);
            if (typeof color !== 'undefined') {
                billboard.setColor(color);
            }
        }

        property = dynamicBillboard.eyeOffset;
        if (typeof property !== 'undefined') {
            eyeOffset = property.getValue(time, eyeOffset);
            if (typeof eyeOffset !== 'undefined') {
                billboard.setEyeOffset(eyeOffset);
            }
        }

        property = dynamicBillboard.pixelOffset;
        if (typeof property !== 'undefined') {
            pixelOffset = property.getValue(time, pixelOffset);
            if (typeof pixelOffset !== 'undefined') {
                billboard.setPixelOffset(pixelOffset);
            }
        }

        property = dynamicBillboard.scale;
        if (typeof property !== 'undefined') {
            scale = property.getValue(time, scale);
            if (typeof scale !== 'undefined') {
                billboard.setScale(scale);
            }
        }

        property = dynamicBillboard.horizontalOrigin;
        if (typeof property !== 'undefined') {
            horizontalOrigin = property.getValue(time, horizontalOrigin);
            if (typeof horizontalOrigin !== 'undefined') {
                billboard.setHorizontalOrigin(horizontalOrigin);
            }
        }

        property = dynamicBillboard.verticalOrigin;
        if (typeof property !== 'undefined') {
            verticalOrigin = property.getValue(time, verticalOrigin);
            if (typeof verticalOrigin !== 'undefined') {
                billboard.setVerticalOrigin(verticalOrigin);
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

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicBillboardVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicBillboardVisualizer#destroy
     */
    DynamicBillboardVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof DynamicBillboardVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicBillboardVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicBillboardVisualizer.prototype.destroy = function() {
        this.removeAll();
        this._scene.getPrimitives().remove(this._billboardCollection);
        this._billboardCollection.destroy();
        this._textureAtlas.destroy();
        return destroyObject(this);
    };

    return DynamicBillboardVisualizer;
});