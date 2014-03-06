/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defined',
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
        defined,
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
            if (defined(currentIndex)) {
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
     * @see DynamicBillboard
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensor
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPyramidVisualizer
     */
    var DynamicBillboardVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._unusedIndexes = [];
        this._dynamicObjectCollection = undefined;

        var billboardCollection = this._billboardCollection = new BillboardCollection();
        var atlas = this._textureAtlas = scene.context.createTextureAtlas();
        this._textureAtlasBuilder = new TextureAtlasBuilder(atlas);
        billboardCollection.textureAtlas = atlas;
        scene.primitives.add(billboardCollection);
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
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicBillboardVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicBillboardVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     */
    DynamicBillboardVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        if (defined(this._dynamicObjectCollection)) {
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
        if (defined(this._dynamicObjectCollection)) {
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
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicBillboardVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicBillboardVisualizer.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
        this._scene.primitives.remove(this._billboardCollection);
        return destroyObject(this);
    };

    var position;
    var color;
    var eyeOffset;
    var pixelOffset;
    function updateObject(dynamicBillboardVisualizer, time, dynamicObject) {
        var dynamicBillboard = dynamicObject._billboard;
        if (!defined(dynamicBillboard)) {
            return;
        }

        var positionProperty = dynamicObject._position;
        if (!defined(positionProperty)) {
            return;
        }

        var textureProperty = dynamicBillboard._image;
        if (!defined(textureProperty)) {
            return;
        }

        var billboard;
        var showProperty = dynamicBillboard._show;
        var billboardVisualizerIndex = dynamicObject._billboardVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(billboardVisualizerIndex)) {
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

        if (!defined(billboardVisualizerIndex)) {
            var unusedIndexes = dynamicBillboardVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                billboardVisualizerIndex = unusedIndexes.pop();
                billboard = dynamicBillboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
            } else {
                billboardVisualizerIndex = dynamicBillboardVisualizer._billboardCollection.length;
                billboard = dynamicBillboardVisualizer._billboardCollection.add();
            }
            dynamicObject._billboardVisualizerIndex = billboardVisualizerIndex;
            billboard.id = dynamicObject;
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

        position = positionProperty.getValue(time, position);
        if (defined(position)) {
            billboard.setPosition(position);
        }

        var property = dynamicBillboard._color;

        if (defined(property)) {
            color = property.getValue(time, color);
            if (defined(color)) {
                billboard.setColor(color);
            }
        }

        property = dynamicBillboard._eyeOffset;
        if (defined(property)) {
            eyeOffset = property.getValue(time, eyeOffset);
            if (defined(eyeOffset)) {
                billboard.setEyeOffset(eyeOffset);
            }
        }

        property = dynamicBillboard._pixelOffset;
        if (defined(property)) {
            pixelOffset = property.getValue(time, pixelOffset);
            if (defined(pixelOffset)) {
                billboard.setPixelOffset(pixelOffset);
            }
        }

        property = dynamicBillboard._scale;
        if (defined(property)) {
            var scale = property.getValue(time);
            if (defined(scale)) {
                billboard.setScale(scale);
            }
        }

        property = dynamicBillboard._rotation;
        if (defined(property)) {
            var rotation = property.getValue(time);
            if (defined(rotation)) {
                billboard.setRotation(rotation);
            }
        }

        property = dynamicBillboard._alignedAxis;
        if (defined(property)) {
            var alignedAxis = property.getValue(time);
            if (defined(alignedAxis)) {
                billboard.setAlignedAxis(alignedAxis);
            }
        }

        property = dynamicBillboard._horizontalOrigin;
        if (defined(property)) {
            var horizontalOrigin = property.getValue(time);
            if (defined(horizontalOrigin)) {
                billboard.setHorizontalOrigin(horizontalOrigin);
            }
        }

        property = dynamicBillboard._verticalOrigin;
        if (defined(property)) {
            var verticalOrigin = property.getValue(time);
            if (defined(verticalOrigin)) {
                billboard.setVerticalOrigin(verticalOrigin);
            }
        }

        property = dynamicBillboard._width;
        if (defined(property)) {
            billboard.setWidth(property.getValue(time));
        }

        property = dynamicBillboard._height;
        if (defined(property)) {
            billboard.setHeight(property.getValue(time));
        }

        property = dynamicBillboard._scaleByDistance;
        if (defined(property)) {
            billboard.setScaleByDistance(property.getValue(time));
        }

        property = dynamicBillboard._translucencyByDistance;
        if (defined(property)) {
            billboard.setTranslucencyByDistance(property.getValue(time));
        }

        property = dynamicBillboard._pixelOffsetScaleByDistance;
        if (defined(property)) {
            billboard.setPixelOffsetScaleByDistance(property.getValue(time));
        }
    }

    DynamicBillboardVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var billboardVisualizerIndex = dynamicObject._billboardVisualizerIndex;
            if (defined(billboardVisualizerIndex)) {
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
