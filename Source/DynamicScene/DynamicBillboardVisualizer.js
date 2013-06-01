/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin',
        '../Renderer/TextureAtlasBuilder'
    ], function(
        DeveloperError,
        destroyObject,
        Color,
        Cartesian2,
        Cartesian3,
        BillboardCollection,
        HorizontalOrigin,
        VerticalOrigin,
        TextureAtlasBuilder) {
    "use strict";

    //Callback to create a callback so that we close over all of the proper values.
    function textureReady(dynamicObject, billboardCollection, textureValue) {
        return function(imageIndex) {
            //By the time the texture was loaded, the billboard might already be
            //gone or have been assigned a different texture.  Look it up again
            //and check.
            var currentIndex = dynamicObject._billboardVisualizerIndex;
            if (typeof currentIndex !== 'undefined') {
                var cbBillboard = billboardCollection.get(currentIndex);
                if (cbBillboard._visualizerUrl === textureValue) {
                    cbBillboard._visualizerTextureAvailable = true;
                    cbBillboard.setImageIndex(imageIndex);
                }
            }
        };
    }

    /**
     * A DynamicObject visualizer which maps the DynamicBillboard instance
     * in DynamicObject.billboard to a Billboard primitive.
     * @alias DynamicBillboardVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicBillboard
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensor
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolygonVisualizer
     * @see DynamicPolylineVisualizer
     * @see DynamicPyramidVisualizer
     *
     */
    var DynamicBillboardVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }

        this._scene = scene;
        this._unusedIndexes = [];
        this._dynamicObjectCollection = undefined;

        var billboardCollection = this._billboardCollection = new BillboardCollection();
        var atlas = this._textureAtlas = scene.getContext().createTextureAtlas();
        this._textureAtlasBuilder = new TextureAtlasBuilder(atlas);
        billboardCollection.setTextureAtlas(atlas);
        scene.getPrimitives().add(billboardCollection);
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicBillboardVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicBillboardVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicBillboardVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicBillboardVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicBillboardVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    DynamicBillboardVisualizer.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is requied.');
        }
        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                updateObject(this, time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicBillboardVisualizer.prototype.removeAllPrimitives = function() {
        if (typeof this._dynamicObjectCollection !== 'undefined') {
            this._unusedIndexes = [];
            this._billboardCollection.removeAll();
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._billboardVisualizerIndex = undefined;
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
        this.removeAllPrimitives();
        this._scene.getPrimitives().remove(this._billboardCollection);
        return destroyObject(this);
    };

    var position;
    var color;
    var eyeOffset;
    var pixelOffset;
    function updateObject(dynamicBillboardVisualizer, time, dynamicObject) {
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
        var showProperty = dynamicBillboard.show;
        var billboardVisualizerIndex = dynamicObject._billboardVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof billboardVisualizerIndex !== 'undefined') {
                billboard = dynamicBillboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
                billboard.setShow(false);
                billboard.setImageIndex(-1);
                billboard._visualizerUrl = undefined;
                billboard._visualizerTextureAvailable = false;
                dynamicObject._billboardVisualizerIndex = undefined;
                dynamicBillboardVisualizer._unusedIndexes.push(billboardVisualizerIndex);
            }
            return;
        }

        if (typeof billboardVisualizerIndex === 'undefined') {
            var unusedIndexes = dynamicBillboardVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                billboardVisualizerIndex = unusedIndexes.pop();
                billboard = dynamicBillboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
            } else {
                billboardVisualizerIndex = dynamicBillboardVisualizer._billboardCollection.getLength();
                billboard = dynamicBillboardVisualizer._billboardCollection.add();
            }
            dynamicObject._billboardVisualizerIndex = billboardVisualizerIndex;
            billboard.dynamicObject = dynamicObject;
            billboard._visualizerUrl = undefined;
            billboard._visualizerTextureAvailable = false;

            // CZML_TODO Determine official defaults
            billboard.setColor(Color.WHITE);
            billboard.setEyeOffset(Cartesian3.ZERO);
            billboard.setPixelOffset(Cartesian2.ZERO);
            billboard.setScale(1.0);
            billboard.setHorizontalOrigin(HorizontalOrigin.CENTER);
            billboard.setVerticalOrigin(VerticalOrigin.CENTER);
        } else {
            billboard = dynamicBillboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
        }

        var textureValue = textureProperty.getValue(time);
        if (textureValue !== billboard._visualizerUrl) {
            billboard._visualizerUrl = textureValue;
            billboard._visualizerTextureAvailable = false;
            dynamicBillboardVisualizer._textureAtlasBuilder.addTextureFromUrl(textureValue, textureReady(dynamicObject, dynamicBillboardVisualizer._billboardCollection, textureValue));
        }

        billboard.setShow(billboard._visualizerTextureAvailable);
        if (!billboard._visualizerTextureAvailable) {
            return;
        }

        position = positionProperty.getValueCartesian(time, position);
        if (typeof position !== 'undefined') {
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
            var scale = property.getValue(time);
            if (typeof scale !== 'undefined') {
                billboard.setScale(scale);
            }
        }

        property = dynamicBillboard.horizontalOrigin;
        if (typeof property !== 'undefined') {
            var horizontalOrigin = property.getValue(time);
            if (typeof horizontalOrigin !== 'undefined') {
                billboard.setHorizontalOrigin(horizontalOrigin);
            }
        }

        property = dynamicBillboard.verticalOrigin;
        if (typeof property !== 'undefined') {
            var verticalOrigin = property.getValue(time);
            if (typeof verticalOrigin !== 'undefined') {
                billboard.setVerticalOrigin(verticalOrigin);
            }
        }
    }

    DynamicBillboardVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var billboardVisualizerIndex = dynamicObject._billboardVisualizerIndex;
            if (typeof billboardVisualizerIndex !== 'undefined') {
                var billboard = thisBillboardCollection.get(billboardVisualizerIndex);
                billboard.setShow(false);
                billboard.setImageIndex(-1);
                billboard._visualizerUrl = undefined;
                billboard._visualizerTextureAvailable = false;
                dynamicObject._billboardVisualizerIndex = undefined;
                thisUnusedIndexes.push(billboardVisualizerIndex);
            }
        }
    };

    return DynamicBillboardVisualizer;
});