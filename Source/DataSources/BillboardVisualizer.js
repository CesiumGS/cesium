/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/TextureAtlas',
        '../Scene/TextureAtlasBuilder',
        '../Scene/VerticalOrigin'
    ], function(
        Cartesian2,
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        BillboardCollection,
        HorizontalOrigin,
        TextureAtlas,
        TextureAtlasBuilder,
        VerticalOrigin) {
    "use strict";

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
                    cbBillboard.imageIndex = imageIndex;
                }
            }
        };
    }

    /**
     * A {@link Visualizer} which maps {@link DynamicObject#billboard} to a {@link Billboard}.
     * @alias DynamicBillboardVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamicObjectCollection to visualize.
     */
    var DynamicBillboardVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        //>>includeEnd('debug');

        var billboardCollection = new BillboardCollection();
        var atlas = new TextureAtlas({
            scene : scene
        });
        billboardCollection.textureAtlas = atlas;
        scene.primitives.add(billboardCollection);
        dynamicObjectCollection.collectionChanged.addEventListener(DynamicBillboardVisualizer.prototype._onObjectsRemoved, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._textureAtlas = atlas;
        this._billboardCollection = billboardCollection;
        this._textureAtlasBuilder = new TextureAtlasBuilder(atlas);
        this._dynamicObjectCollection = dynamicObjectCollection;
    };

    /**
     * Updates the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    DynamicBillboardVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (var i = 0, len = dynamicObjects.length; i < len; i++) {
            updateObject(this, time, dynamicObjects[i]);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    DynamicBillboardVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    DynamicBillboardVisualizer.prototype.destroy = function() {
        var dynamicObjectCollection = this._dynamicObjectCollection;
        dynamicObjectCollection.collectionChanged.removeEventListener(DynamicBillboardVisualizer.prototype._onObjectsRemoved, this);

        var dynamicObjects = dynamicObjectCollection.getObjects();
        var length = dynamicObjects.length;
        for (var i = 0; i < length; i++) {
            dynamicObjects[i]._billboardVisualizerIndex = undefined;
        }
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
                billboard.show = false;
                billboard.imageIndex = -1;
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

            billboard.color = Color.WHITE;
            billboard.eyeOffset = Cartesian3.ZERO;
            billboard.pixelOffset = Cartesian2.ZERO;
            billboard.scale = 1.0;
            billboard.horizontalOrigin = HorizontalOrigin.CENTER;
            billboard.verticalOrigin = VerticalOrigin.CENTER;
        } else {
            billboard = dynamicBillboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
        }

        var textureValue = textureProperty.getValue(time);
        if (textureValue !== billboard._visualizerUrl) {
            billboard._visualizerUrl = textureValue;
            billboard._visualizerTextureAvailable = false;
            dynamicBillboardVisualizer._textureAtlasBuilder.addTextureFromUrl(textureValue, textureReady(dynamicObject, dynamicBillboardVisualizer._billboardCollection, textureValue));
        }

        billboard.show = billboard._visualizerTextureAvailable;
        if (!billboard._visualizerTextureAvailable) {
            return;
        }

        position = positionProperty.getValue(time, position);
        if (defined(position)) {
            billboard.position = position;
        }

        var property = dynamicBillboard._color;

        if (defined(property)) {
            color = property.getValue(time, color);
            if (defined(color)) {
                billboard.color = color;
            }
        }

        property = dynamicBillboard._eyeOffset;
        if (defined(property)) {
            eyeOffset = property.getValue(time, eyeOffset);
            if (defined(eyeOffset)) {
                billboard.eyeOffset = eyeOffset;
            }
        }

        property = dynamicBillboard._pixelOffset;
        if (defined(property)) {
            pixelOffset = property.getValue(time, pixelOffset);
            if (defined(pixelOffset)) {
                billboard.pixelOffset = pixelOffset;
            }
        }

        property = dynamicBillboard._scale;
        if (defined(property)) {
            var scale = property.getValue(time);
            if (defined(scale)) {
                billboard.scale = scale;
            }
        }

        property = dynamicBillboard._rotation;
        if (defined(property)) {
            var rotation = property.getValue(time);
            if (defined(rotation)) {
                billboard.rotation = rotation;
            }
        }

        property = dynamicBillboard._alignedAxis;
        if (defined(property)) {
            var alignedAxis = property.getValue(time);
            if (defined(alignedAxis)) {
                billboard.alignedAxis = alignedAxis;
            }
        }

        property = dynamicBillboard._horizontalOrigin;
        if (defined(property)) {
            var horizontalOrigin = property.getValue(time);
            if (defined(horizontalOrigin)) {
                billboard.horizontalOrigin = horizontalOrigin;
            }
        }

        property = dynamicBillboard._verticalOrigin;
        if (defined(property)) {
            var verticalOrigin = property.getValue(time);
            if (defined(verticalOrigin)) {
                billboard.verticalOrigin = verticalOrigin;
            }
        }

        property = dynamicBillboard._width;
        if (defined(property)) {
            billboard.width = property.getValue(time);
        }

        property = dynamicBillboard._height;
        if (defined(property)) {
            billboard.height = property.getValue(time);
        }

        property = dynamicBillboard._scaleByDistance;
        if (defined(property)) {
            billboard.scaleByDistance = property.getValue(time);
        }

        property = dynamicBillboard._translucencyByDistance;
        if (defined(property)) {
            billboard.translucencyByDistance = property.getValue(time);
        }

        property = dynamicBillboard._pixelOffsetScaleByDistance;
        if (defined(property)) {
            billboard.pixelOffsetScaleByDistance = property.getValue(time);
        }
    }

    DynamicBillboardVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var billboardVisualizerIndex = dynamicObject._billboardVisualizerIndex;
            if (defined(billboardVisualizerIndex)) {
                var billboard = thisBillboardCollection.get(billboardVisualizerIndex);
                billboard.show = false;
                billboard.imageIndex = -1;
                billboard._visualizerUrl = undefined;
                billboard._visualizerTextureAvailable = false;
                dynamicObject._billboardVisualizerIndex = undefined;
                thisUnusedIndexes.push(billboardVisualizerIndex);
            }
        }
    };

    return DynamicBillboardVisualizer;
});
